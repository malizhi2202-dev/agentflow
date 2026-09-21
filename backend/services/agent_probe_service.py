"""Agent 健康探针服务 — 后台每 3 秒轮询所有 Agent 的 /health 端点，记录探针数据并清理 7 天前旧数据."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime, timedelta

import httpx

from database import SessionLocal
from models.agent import Agent
from models.agent_probe import AgentProbe
from models.agent_probe_latest import AgentProbeLatest

logger = logging.getLogger(__name__)

# ── API Key 脱敏 ──────────────────────────────────────────────
_API_KEY_RE = re.compile(r"sk-[a-zA-Z0-9]+")
_API_KEY_MASK = "sk-***"


def _sanitize_api_keys(text: str) -> str:
    """将文本中的 API Key（sk-xxx 格式）替换为 sk-***."""
    return _API_KEY_RE.sub(_API_KEY_MASK, text)


# ── 健康端点 URL 解析 ──────────────────────────────────────────
def _resolve_health_url(agent: Agent) -> str | None:
    """从 Agent 配置中解析 /health 端点 URL.

    优先级：
    1. agent.model_config_json["base_url"] + /health
    2. agent.model_config_json["health_url"]
    3. 若都无，返回 None（跳过该 agent）
    """
    cfg: dict = agent.model_config_json or {}
    base_url = cfg.get("base_url")
    if base_url:
        return f"{base_url.rstrip('/')}/health"
    health_url = cfg.get("health_url")
    if health_url:
        return health_url
    return None


# ── ProbeService ───────────────────────────────────────────────
class ProbeService:
    """Agent 健康探针服务 — 后台 asyncio 任务持续监控所有 Agent 健康状态."""

    def __init__(self, interval: int = 3, timeout: int = 5, failure_threshold: int = 3, retention_days: int = 1):
        self.interval = interval          # 探针间隔（秒）
        self.timeout = timeout            # HTTP 请求超时（秒）
        self.failure_threshold = failure_threshold  # 连续失败阈值
        self.retention_days = retention_days        # 数据保留天数
        self._task: asyncio.Task | None = None
        self._running = False
        # 内存中跟踪每个 agent 的连续失败次数（agent_id → count）
        self._consecutive_failures: dict[int, int] = {}
        # 上一次探针状态（agent_id → status），用于检测状态变化
        self._last_probe_status: dict[int, str] = {}
        # 状态变化回调列表：callback(agent_id, old_status, new_status)
        self._status_change_callbacks: list = []
        # 状态变化事件 — reconcile_loop 可以 await 它来接收即时通知
        self._status_changed_event: asyncio.Event = asyncio.Event()

    # ── 启动/停止 ──────────────────────────────────────────────

    def start(self):
        """启动后台探针循环（asyncio.create_task）."""
        if self._running:
            logger.warning("ProbeService 已在运行中，跳过重复启动")
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("ProbeService 已启动（interval=%ds, timeout=%ds, threshold=%d）",
                    self.interval, self.timeout, self.failure_threshold)

    async def stop(self):
        """停止后台探针循环."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("ProbeService 已停止")

    # ── 状态变化回调 ────────────────────────────────────────────

    def on_status_change(self, callback):
        """注册探针状态变化回调。

        callback(agent_id: int, old_status: str | None, new_status: str)
        当 agent 探针状态从 healthy→unhealthy 或反之变化时触发。

        用法:
            def handle_change(agent_id, old, new):
                logger.warning("agent %d: %s → %s", agent_id, old, new)
            probe_service.on_status_change(handle_change)
        """
        self._status_change_callbacks.append(callback)
        logger.debug("已注册状态变化回调（当前共 %d 个）", len(self._status_change_callbacks))

    async def wait_for_status_change(self, timeout: float | None = None) -> bool:
        """等待探针状态变化事件。

        用于 reconcile_loop 在空闲时阻塞等待，收到状态变化时立即唤醒执行 reconcile。

        Args:
            timeout: 最大等待秒数，None 则无限等待

        Returns:
            True 如果事件被触发，False 如果超时
        """
        try:
            if timeout is not None:
                await asyncio.wait_for(self._status_changed_event.wait(), timeout=timeout)
            else:
                await self._status_changed_event.wait()
            return True
        except asyncio.TimeoutError:
            return False

    def _notify_status_change(self, agent_id: int, old_status: str | None, new_status: str) -> None:
        """内部方法：触发状态变化通知（事件 + 回调）。"""
        # 设置事件，唤醒正在等待的 reconcile_loop
        self._status_changed_event.set()
        self._status_changed_event.clear()

        # 同步调用所有注册的回调
        for cb in self._status_change_callbacks:
            try:
                cb(agent_id, old_status, new_status)
            except Exception:
                logger.exception("状态变化回调执行失败（agent_id=%d）", agent_id)

    # ── 主循环 ─────────────────────────────────────────────────

    async def _loop(self):
        while self._running:
            try:
                await self._pull_all()
            except Exception:
                logger.exception("ProbeService 本轮探针异常")
            try:
                _flush_events()
            except Exception:
                pass
            await asyncio.sleep(self.interval)

    # ── 全量探针 ───────────────────────────────────────────────

    async def _pull_all(self):
        """拉取所有 Agent 并并发探测其 /health 端点."""
        # 1. 从数据库获取 Agent 列表
        db = SessionLocal()
        try:
            agents: list[Agent] = db.query(Agent).all()
        finally:
            db.close()

        if not agents:
            return

        # 2. 并发探测所有 Agent
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=False) as session:
            tasks = [self._probe_single(session, agent) for agent in agents]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        # 3. 写入数据库（一次事务）
        db2 = SessionLocal()
        try:
            for agent, raw in zip(agents, results):
                if isinstance(raw, BaseException):
                    result: dict = {
                        "status": "error",
                        "detail": str(raw),
                        "error_type": type(raw).__name__,
                    }
                else:
                    result = raw
                self._save_probe(db2, agent.id, result)
            db2.commit()
        finally:
            db2.close()

        # 4. 数据清理（每轮执行，轻量级 DELETE）
        self._cleanup()

    # ── 单 Agent 探针 ───────────────────────────────────────────

    async def _probe_single(self, session: httpx.AsyncClient, agent: Agent) -> dict:
        """探测单个 Agent 的 /health 端点，返回结果字典."""
        health_url = _resolve_health_url(agent)
        if health_url is None:
            return {
                "status": "skipped",
                "detail": f"Agent {agent.id} ({agent.name}) 未配置 health_url/base_url，跳过探针",
            }

        try:
            resp = await session.get(health_url)
            body = resp.text
            if resp.status_code == 200:
                try:
                    data = json.loads(body)
                except json.JSONDecodeError:
                    data = {"raw": body}
                agent_status = data.get("status", "unknown")
                return {
                    "status": agent_status if agent_status in ("healthy", "degraded", "unhealthy") else "unknown",
                    "detail": json.dumps(data, ensure_ascii=False),
                    "http_status": resp.status_code,
                }
            else:
                return {
                    "status": "unhealthy",
                    "detail": f"HTTP {resp.status_code}: {body[:500]}",
                    "http_status": resp.status_code,
                }
        except asyncio.TimeoutError:
            return {
                "status": "unhealthy",
                "detail": f"请求超时（{self.timeout}s）: {health_url}",
                "error_type": "TimeoutError",
            }
        except httpx.HTTPError as e:
            return {
                "status": "unhealthy",
                "detail": f"连接失败: {type(e).__name__}: {e}",
                "error_type": type(e).__name__,
            }
        except Exception as e:
            return {
                "status": "error",
                "detail": f"未知错误: {type(e).__name__}: {e}",
                "error_type": type(e).__name__,
            }

    # ── 保存探针记录 ────────────────────────────────────────────

    def _save_probe(self, db, agent_id: int, result: dict) -> None:
        """将探针结果写入 agent_probes 表（同步，调用者负责 commit）.

        - 统计连续失败次数
        - 对 detail 字段做 API Key 脱敏
        - 超过 failure_threshold 的记录标记为 unhealthy
        - 检测状态变化并触发 reconcile 通知
        """
        detail_raw = result.get("detail", "")
        detail_sanitized = _sanitize_api_keys(detail_raw)

        probe_status = result.get("status", "unknown")

        # 更新连续失败计数
        if probe_status in ("unhealthy", "error"):
            self._consecutive_failures[agent_id] = self._consecutive_failures.get(agent_id, 0) + 1
        else:
            # 成功或跳过时重置
            self._consecutive_failures.pop(agent_id, None)

        consecutive = self._consecutive_failures.get(agent_id, 0)

        # 超过阈值则标记为 unhealthy
        effective_status = probe_status
        if consecutive >= self.failure_threshold and probe_status not in ("healthy", "skipped"):
            effective_status = "unhealthy"

        # 检测状态变化（与上一次记录的状态对比）
        old_status = self._last_probe_status.get(agent_id)
        if old_status is not None and old_status != effective_status:
            logger.info(
                "Agent %d 探针状态变化: %s → %s（连续失败=%d）→ 触发 reconcile 通知",
                agent_id, old_status, effective_status, consecutive,
            )
            self._notify_status_change(agent_id, old_status, effective_status)
        self._last_probe_status[agent_id] = effective_status

        probe = AgentProbe(
            agent_id=agent_id,
            probe_type="health",
            status=effective_status,
            detail=detail_sanitized,
            consecutive_failures=consecutive,
        )
        db.add(probe)  # 历史表：保留完整记录

        # 状态表：upsert 只留最新一条
        latest = db.query(AgentProbeLatest).filter(
            AgentProbeLatest.agent_id == agent_id,
            AgentProbeLatest.probe_type == "health",
        ).first()
        if latest:
            latest.status = effective_status
            latest.detail = detail_sanitized
            latest.consecutive_failures = consecutive
            latest.created_at = datetime.utcnow()
        else:
            db.add(AgentProbeLatest(
                agent_id=agent_id,
                probe_type="health",
                status=effective_status,
                detail=detail_sanitized,
                consecutive_failures=consecutive,
            ))

    # ── 数据清理 ────────────────────────────────────────────────

    def _cleanup(self) -> None:
        """清理 7 天前的旧探针数据."""
        db = SessionLocal()
        try:
            cutoff = datetime.utcnow() - timedelta(days=self.retention_days)
            deleted = (
                db.query(AgentProbe)
                .filter(AgentProbe.created_at < cutoff)
                .delete(synchronize_session="fetch")
            )
            db.commit()
            if deleted > 0:
                logger.info("ProbeService 清理了 %d 条过期探针记录（>%d天）", deleted, self.retention_days)
        except Exception:
            logger.exception("ProbeService 清理旧数据失败")
            db.rollback()
        finally:
            db.close()


# ── 全局单例 ───────────────────────────────────────────────────
probe_service = ProbeService()


# ── 被动收集：从 audit/tracer 事件推断 Agent 健康 ──────────────

import threading
from collections import defaultdict

# 内存队列：异步写入，不阻塞调用方
_event_queue: list[dict] = []
_event_lock = threading.Lock()

# 模块活动跟踪：{entity_type: {entity_id: {last_seen, status, ...}}}
_activity_tracker: dict[str, dict[int, dict]] = defaultdict(dict)
_ACTIVITY_WINDOW = 300  # 5 分钟窗口


def _notify_activity(entity_type: str, entity_id: int, owner_id: str,
                     status: str = "success", duration_ms: int = 0,
                     tokens: int = 0, action: str = ""):
    """被动收集：从 log_audit / trace_model_call 接收事件，写入 agent_probes。
    
    由 audit_service.log_audit() 和 runtime_tracer.trace_model_call() 调用。
    不阻塞调用方——事件放入内存队列，后台 batch 写入。
    """
    if entity_type not in ("agent", "workflow", "tool", "project", "chat"):
        return  # 白名单校验
    
    with _event_lock:
        _event_queue.append({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "owner_id": owner_id,
            "status": status,
            "duration_ms": duration_ms,
            "tokens": tokens,
            "action": action,
            "timestamp": datetime.utcnow().isoformat(),
        })
        # 更新活动跟踪
        tracker_key = f"{entity_type}:{entity_id}"
        _activity_tracker[entity_type][entity_id] = {
            "last_seen": datetime.utcnow(),
            "last_status": status,
        }


def _flush_events(db=None):
    """批量写入事件到 agent_probes 表（线程安全）."""
    events = []
    with _event_lock:
        if not _event_queue:
            return
        events = _event_queue.copy()
        _event_queue.clear()
    
    if not events:
        return
    
    own_db = db is None
    if own_db:
        db = SessionLocal()
    
    try:
        now = datetime.utcnow()
        # 按 entity 聚合：每个 entity 只写一条最新探针
        aggregated: dict[tuple[str, int], dict] = {}
        for e in events:
            key = (e["entity_type"], e["entity_id"])
            aggregated[key] = {
                "entity_type": e["entity_type"],
                "agent_id": e["entity_id"],
                "status": "healthy" if e["status"] == "success" else "degraded",
                "detail": _sanitize_api_keys(
                    f"{e['action']} | {e['duration_ms']}ms | {e['tokens']}tokens"
                ) if e["action"] else f"passive: {e['status']}",
            }
        
        for key, data in aggregated.items():
            probe = AgentProbe(
                agent_id=data["agent_id"],
                probe_type="passive",
                status=data["status"],
                detail=data["detail"],
                consecutive_failures=0 if data["status"] == "healthy" else 1,
            )
            db.add(probe)
        
        if own_db:
            db.commit()
    except Exception:
        if own_db:
            db.rollback()
    finally:
        if own_db:
            db.close()
