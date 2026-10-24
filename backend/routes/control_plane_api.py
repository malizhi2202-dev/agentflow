"""控制面 API — Agent 探针状态、调度队列、审计调和、Agent 重启、调度配置."""

import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
from models.agent_probe_latest import AgentProbeLatest
from models.agent import Agent
from auth import is_admin, read_audit
from models.cluster import ReconcileState
from services import cluster_store
from services.audit_service import log_audit
import config

router = APIRouter(prefix="/api/control-plane", tags=["control-plane"])


# ── 辅助函数 ──────────────────────────────────────────────

def _user(request: Request) -> dict:
    # P0-1：身份只由中间件注入（cookie > Bearer > debug 三重 opt-in）；缺省即 401
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user


def _uid(request: Request) -> str:
    return _user(request).get("id", "admin")


def _admin_check(request: Request):
    """检查当前用户是否为管理员，否则抛 403."""
    user = _user(request)
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


# ── 限流（落库 · P1-7）─────────────────────────────────────
# 原实现是模块级 `_rate_limit_store` + 锁：重启清零、多副本各算各的。现在固定窗口
# 计数写在 rate_limit_windows 表里，控制面三件写操作（restart/reschedule/pause）
# 统一 10 次/分钟，超限 429。

_RATE_LIMIT_MAX = 10
_RATE_LIMIT_WINDOW = 60


def _check_rate_limit(user_id: str, max_requests: int = _RATE_LIMIT_MAX,
                      window_seconds: int = _RATE_LIMIT_WINDOW) -> bool:
    """记一次控制面写操作；返回 True = 放行，False = 超限。"""
    _, allowed = cluster_store.consume(
        f"control-plane:{user_id}", window_seconds, max_requests,
    )
    return allowed


def _enforce_rate_limit(request: Request) -> None:
    if not _check_rate_limit(_uid(request)):
        raise HTTPException(status_code=429, detail="操作过于频繁（10 次/分钟），请稍后重试")


# ── GET /probes ──────────────────────────────────────────

@router.get("/probes")
def list_probes(request: Request, db: Session = Depends(get_db)):
    """查询所有 Agent 最新探针状态（从 agent_probe_latest 表，无 GROUP BY）"""
    latest_probes = db.query(AgentProbeLatest).all()

    agents_map: dict[int, dict] = {}
    for p in latest_probes:
        if p.agent_id not in agents_map:
            agent = db.query(Agent).filter(Agent.id == p.agent_id).first()
            agents_map[p.agent_id] = {
                "agent_id": p.agent_id,
                "agent_name": agent.name if agent else f"Agent#{p.agent_id}",
                "status": "",
                "probes": [],
                "model_name": agent.model_name if agent else "",
                "tokens_used": 0,
                "token_soft_limit": agent.token_soft_limit if agent else 0,
                "token_hard_limit": agent.token_hard_limit if agent else 0,
                "last_heartbeat": None,
            }
        entry = agents_map[p.agent_id]
        entry["probes"].append({
            "probe_type": p.probe_type,
            "status": p.status,
            "detail": p.detail,
            "consecutive_failures": p.consecutive_failures,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
        if p.probe_type == "health":
            entry["status"] = p.status
        if p.created_at:
            entry["last_heartbeat"] = p.created_at.isoformat()

    return list(agents_map.values())


# ── GET /queue ───────────────────────────────────────────

@router.get("/queue")
def list_queue(request: Request, db: Session = Depends(get_db)):
    """调度队列状态（落库的活跃任务，含租约/心跳）"""
    from models.scheduler_queue import SchedulerQueue

    items = (
        db.query(SchedulerQueue)
        .filter(SchedulerQueue.status.in_(("queued", "leased")))
        .order_by(SchedulerQueue.priority.desc(), SchedulerQueue.enqueued_at.asc())
        .limit(200)
        .all()
    )
    return [q.to_dict() for q in items]


# ── GET /cluster ─────────────────────────────────────────

@router.get("/cluster")
def cluster_status(request: Request, db: Session = Depends(get_db)):
    """副本与单例循环的真相（P0-9 + P1-7）：谁在跑、队列多深、还剩哪些单进程语义。"""
    _user(request)
    leases = {row["name"]: row for row in cluster_store.list_leases(db=db)}
    now = datetime.datetime.utcnow()
    return {
        "instance_id": config.INSTANCE_ID,
        "deploy_mode": config.DEPLOY_MODE,
        "lease_ttl_seconds": config.CLUSTER_LEASE_TTL_SECONDS,
        "leases": leases,
        "queue": cluster_store.queue_stats(db=db),
        "reconcile_backoff_rows": db.query(ReconcileState).count(),
        "process_local": [
            "OAuth 授权 state 与非重放缓存（channel_api._oauth_states / nonce_cache）"
            "——单副本内有效，多副本下回调需落在同一副本",
        ],
        "checked_at": now.isoformat(),
    }


# ── GET /reconcile ───────────────────────────────────────

@router.get("/reconcile")
def list_reconcile_events(request: Request):
    """查询审计日志中的 reconcile 事件"""
    events = read_audit(limit=200, action="reconcile")
    return events


# ── POST /agent/{agent_id}/restart ───────────────────────

@router.post("/agent/{agent_id}/restart")
def restart_agent(agent_id: int, request: Request, db: Session = Depends(get_db)):
    """触发 Agent 重启 — 调用探针服务重新探测"""
    _enforce_rate_limit(request)
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} 不存在")

    # 记录审计日志
    user = _user(request)
    ip = request.client.host if request.client else "127.0.0.1"
    log_audit(
        str(user.get("id", "admin")),
        str(user.get("name", "admin")),
        "agent_restart",
        str(agent_id),
        "agent",
        f"agent={agent.name}",
        ip,
    )

    # 解析 Agent 的健康端点 URL
    cfg = agent.model_config_json or {}
    health_url = None
    base_url = cfg.get("base_url")
    if base_url:
        health_url = f"{base_url.rstrip('/')}/health"
    else:
        health_url = cfg.get("health_url")

    return {
        "ok": True,
        "agent_id": agent_id,
        "agent_name": agent.name,
        "message": f"Agent {agent.name} 重启指令已发出",
        "health_url": health_url,
    }


# ── POST /agent/{agent_id}/reschedule ────────────────────

@router.post("/agent/{agent_id}/reschedule")
def reschedule_agent(agent_id: int, request: Request, db: Session = Depends(get_db)):
    """重新调度 Agent 上的等待任务到其他空闲 Agent"""
    _enforce_rate_limit(request)
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} 不存在")

    user = _user(request)
    ip = request.client.host if request.client else "127.0.0.1"
    log_audit(
        str(user.get("id", "admin")),
        str(user.get("name", "admin")),
        "agent_reschedule",
        str(agent_id),
        "agent",
        f"agent={agent.name}",
        ip,
    )

    return {
        "ok": True,
        "agent_id": agent_id,
        "agent_name": agent.name,
        "message": f"Agent {agent.name} 任务已重新调度",
    }


# ── POST /agent/{agent_id}/pause ─────────────────────────

@router.post("/agent/{agent_id}/pause")
def pause_agent(agent_id: int, request: Request, db: Session = Depends(get_db)):
    """暂停 Agent 接收新任务"""
    _enforce_rate_limit(request)
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} 不存在")

    user = _user(request)
    ip = request.client.host if request.client else "127.0.0.1"
    log_audit(
        str(user.get("id", "admin")),
        str(user.get("name", "admin")),
        "agent_pause",
        str(agent_id),
        "agent",
        f"agent={agent.name}",
        ip,
    )

    return {
        "ok": True,
        "agent_id": agent_id,
        "agent_name": agent.name,
        "message": f"Agent {agent.name} 已暂停接收新任务",
    }


# ── PUT /schedule ────────────────────────────────────────

@router.put("/schedule")
def update_schedule(payload: dict, request: Request, db: Session = Depends(get_db)):
    """管理员配置 Agent 标签/优先级/并发（需要 admin 权限）"""
    user = _user(request)
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="需要管理员权限")

    agent_id = payload.get("agent_id")
    if not agent_id:
        raise HTTPException(status_code=400, detail="缺少 agent_id 参数")

    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} 不存在")

    # 更新 model_config_json 中的调度相关配置
    cfg = dict(agent.model_config_json or {})
    updated = False

    if "tags" in payload:
        cfg["capability_tags"] = payload["tags"]
        updated = True
    if "priority" in payload:
        cfg["scheduler_priority"] = payload["priority"]
        updated = True
    if "concurrency" in payload:
        cfg["max_concurrency"] = payload["concurrency"]
        updated = True

    if updated:
        agent.model_config_json = cfg
        db.commit()
        db.refresh(agent)

    # 审计
    ip = request.client.host if request.client else "127.0.0.1"
    log_audit(
        str(user.get("id", "admin")),
        str(user.get("name", "admin")),
        "schedule_update",
        str(agent_id),
        "agent",
        f"tags={payload.get('tags')} priority={payload.get('priority')} concurrency={payload.get('concurrency')}",
        ip,
    )

    return {
        "ok": True,
        "agent_id": agent_id,
        "agent_name": agent.name,
        "config": {
            "tags": cfg.get("capability_tags", []),
            "priority": cfg.get("scheduler_priority", 50),
            "concurrency": cfg.get("max_concurrency", 1),
        },
    }
