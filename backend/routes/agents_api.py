"""Agent API 路由 — CRUD + 执行."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.agent import Agent
from services.encryption_service import encrypt
from services.audit_service import log_audit
from services.llm_providers import SUPPORTED_PROVIDERS
from services.agent_trigger import AgentRunError, trigger_agent_run
from models.agent import SUPPORTED_RUNTIMES

router = APIRouter(prefix="/api/agents", tags=["agents"])


def _user(request: Request) -> dict:
    # P0-1：身份只由中间件注入（cookie > Bearer > debug 三重 opt-in）；缺省即 401
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user


def _filter_owner(q, user: dict):
    if user.get("role") != "admin":
        q = q.filter(Agent.owner_id == user["id"])
    return q


@router.get("")
def api_list_agents(status: str | None = None, domain_id: int | None = None, capability: str | None = None, request: Request = None, db: Session = Depends(get_db)):
    q = _filter_owner(db.query(Agent), _user(request))
    if status:
        q = q.filter(Agent.status == status)
    if domain_id is not None:
        if domain_id == 0:
            # domain_id=0 表示查询无域 Agent（domain_id IS NULL）
            q = q.filter(Agent.domain_id.is_(None))
        else:
            q = q.filter(Agent.domain_id == domain_id)
    if capability:
        # 过滤 capability: 匹配 model_config_json 中的 capabilities 数组
        q = q.filter(Agent.model_config_json.contains(f'"{capability}"'))
    agents = q.order_by(Agent.updated_at.desc()).all()
    return {"agents": [a.to_dict() for a in agents], "total": len(agents)}


@router.post("")
def api_create_agent(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    api_key = payload.get("api_key", "") or "not_set"
    # 验证 model_provider
    model_provider = payload.get("model_provider", "openai")
    if model_provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"不支持的 model_provider: '{model_provider}'。支持: {sorted(SUPPORTED_PROVIDERS)}")
    # 验证 runtime
    runtime = payload.get("runtime", "langgraph")
    if runtime not in SUPPORTED_RUNTIMES:
        raise HTTPException(status_code=400, detail=f"不支持的 runtime: '{runtime}'。支持: {sorted(SUPPORTED_RUNTIMES)}")
    agent = Agent(owner_id=user["id"], name=payload["name"], description=payload.get("description", ""), runtime=runtime, model_provider=model_provider, model_name=payload.get("model_name", ""), model_config_json=payload.get("model_config_json", {}), api_key_encrypted=encrypt(api_key), workflow_id=payload.get("workflow_id"), token_soft_limit=payload.get("token_soft_limit", 800000), token_hard_limit=payload.get("token_hard_limit", 1000000), domain_id=payload.get("domain_id"),
                  # T-05：人设三件落库（此前只收不存）
                  system_prompt=payload.get("system_prompt"), role_def=payload.get("role_def"), sop=payload.get("sop"))
    db.add(agent)
    db.commit()
    db.refresh(agent)
    log_audit(user["id"], user.get("name", user["id"]), "agent.create", agent.name, "agent", "created", request.client.host if request.client else "127.0.0.1")
    return agent.to_dict()


@router.get("/{agent_id}")
def api_get_agent(agent_id: int, request: Request = None, db: Session = Depends(get_db)):
    q = _filter_owner(db.query(Agent).filter(Agent.id == agent_id), _user(request))
    a = q.first()
    if not a:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    d = a.to_dict()
    if a.workflow_id:
        from models.workflow import Workflow
        wf = db.query(Workflow).filter(Workflow.id == a.workflow_id).first()
        if wf:
            d["workflow_summary"] = {"name": wf.name, "node_count": len((wf.spec_json or {}).get("nodes", [])), "status": wf.status}
    return d


@router.put("/{agent_id}")
def api_update_agent(agent_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Agent).filter(Agent.id == agent_id), user)
    a = q.first()
    if not a:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    # T-05：人设三件也是可编辑字段（以前漏在这里 → 编辑后不落库）
    for f in ("name", "description", "model_provider", "model_name", "model_config_json",
              "system_prompt", "role_def", "sop",
              "workflow_id", "token_soft_limit", "token_hard_limit", "domain_id"):
        if f in payload:
            if f == "model_provider" and payload[f] not in SUPPORTED_PROVIDERS:
                raise HTTPException(status_code=400, detail=f"不支持的 model_provider: '{payload[f]}'。支持: {sorted(SUPPORTED_PROVIDERS)}")
            setattr(a, f, payload[f])
    if "runtime" in payload:
        if payload["runtime"] not in SUPPORTED_RUNTIMES:
            raise HTTPException(status_code=400, detail=f"不支持的 runtime: '{payload['runtime']}'。支持: {sorted(SUPPORTED_RUNTIMES)}")
        a.runtime = payload["runtime"]
    if "api_key" in payload and payload["api_key"]:
        a.api_key_encrypted = encrypt(payload["api_key"])
    db.commit()
    db.refresh(a)
    log_audit(user["id"], user.get("name", user["id"]), "agent.update", a.name, "agent", "updated", request.client.host if request.client else "127.0.0.1")
    return a.to_dict()


@router.delete("/{agent_id}")
def api_delete_agent(agent_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Agent).filter(Agent.id == agent_id), user)
    a = q.first()
    if not a:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    if a.status == "running":
        raise HTTPException(status_code=400, detail="运行中 Agent 不可删除")
    db.delete(a)
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "agent.delete", a.name, "agent", "deleted", request.client.host if request.client else "127.0.0.1")
    return {"status": "deleted"}


@router.post("/{agent_id}/run")
def api_run_agent(agent_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        result = trigger_agent_run(
            agent_id, user["id"], is_admin=(user.get("role") == "admin"), db=db,
        )
    except AgentRunError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if result is None:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    log_audit(user["id"], user.get("name", user["id"]), "agent.run", result["agent_name"], "agent", "started",
              request.client.host if request.client else "127.0.0.1")
    return result


@router.post("/{agent_id}/stop")
def api_stop_agent(agent_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Agent).filter(Agent.id == agent_id), user)
    a = q.first()
    if not a:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    a.status = "standby"
    db.commit()

    # ── A3: 自动写入决策记忆 ──
    import json as _json
    from datetime import datetime
    from models.agent_memory import AgentMemory
    memory = AgentMemory(
        agent_id=a.id,
        owner_id=user["id"],
        domain_id=a.domain_id,
        channel="web",
        key=f"decision_{a.id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        value=_json.dumps({
            "action": "agent_stopped",
            "agent_name": a.name,
            "tokens_used": a.total_tokens_used,
            "timestamp": datetime.utcnow().isoformat(),
        }),
        memory_type="decision",
        priority=7,
    )
    db.add(memory)
    db.commit()

    log_audit(user["id"], user.get("name", user["id"]), "agent.stop", a.name, "agent", "stopped", request.client.host if request.client else "127.0.0.1")
    return {"status": "stopped"}


# ═══════════════════════════════════════════
# 定时任务 CRUD
# ═══════════════════════════════════════════

@router.get("/{agent_id}/scheduled-tasks")
def api_list_scheduled_tasks(agent_id: int, request: Request = None, db: Session = Depends(get_db)):
    """获取 Agent 的所有定时任务."""
    from models.scheduled_task import ScheduledTask
    user = _user(request)
    tasks = db.query(ScheduledTask).filter(
        ScheduledTask.agent_id == agent_id,
        ScheduledTask.owner_id == user["id"],
    ).order_by(ScheduledTask.created_at.desc()).all()
    return [t.to_dict() for t in tasks]


@router.post("/{agent_id}/scheduled-tasks")
def api_create_scheduled_task(agent_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    """为 Agent 创建定时任务."""
    from models.scheduled_task import ScheduledTask
    import datetime as dt
    user = _user(request)
    task = ScheduledTask(
        agent_id=agent_id,
        name=payload.get("name", ""),
        cron_expr=payload.get("cron_expr", ""),
        capability=payload.get("capability", ""),
        enabled=payload.get("enabled", True),
        owner_id=user["id"],
        last_run=None,
        created_at=dt.datetime.utcnow(),
        updated_at=dt.datetime.utcnow(),
    )
    if not task.cron_expr:
        raise HTTPException(status_code=400, detail="cron_expr 不能为空")
    if not task.capability:
        raise HTTPException(status_code=400, detail="capability 不能为空")
    db.add(task)
    db.commit()
    db.refresh(task)
    log_audit(user["id"], user.get("name", user["id"]), "scheduled_task.create", task.name or task.capability, "scheduled_task", "created", request.client.host if request.client else "127.0.0.1")
    return {"ok": True, "task": task.to_dict()}


@router.put("/{agent_id}/scheduled-tasks/{task_id}")
def api_update_scheduled_task(agent_id: int, task_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    """更新定时任务."""
    from models.scheduled_task import ScheduledTask
    import datetime as dt
    user = _user(request)
    task = db.query(ScheduledTask).filter(
        ScheduledTask.id == task_id,
        ScheduledTask.agent_id == agent_id,
        ScheduledTask.owner_id == user["id"],
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    for field in ["name", "cron_expr", "capability"]:
        if field in payload:
            setattr(task, field, payload[field])
    if "enabled" in payload:
        task.enabled = bool(payload["enabled"])
    task.updated_at = dt.datetime.utcnow()
    db.commit()
    db.refresh(task)
    return {"ok": True, "task": task.to_dict()}


@router.delete("/{agent_id}/scheduled-tasks/{task_id}")
def api_delete_scheduled_task(agent_id: int, task_id: int, request: Request = None, db: Session = Depends(get_db)):
    """删除定时任务."""
    from models.scheduled_task import ScheduledTask
    user = _user(request)
    task = db.query(ScheduledTask).filter(
        ScheduledTask.id == task_id,
        ScheduledTask.agent_id == agent_id,
        ScheduledTask.owner_id == user["id"],
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    db.delete(task)
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "scheduled_task.delete", task.name or task.capability, "scheduled_task", "deleted", request.client.host if request.client else "127.0.0.1")
    return {"ok": True}
