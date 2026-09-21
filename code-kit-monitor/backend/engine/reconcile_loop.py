"""Reconcile Loop 引擎 — 后台持续监控编排实例状态，自愈/重试/漂移检测."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


async def reconcile_loop(sleep_seconds: int = 5):
    """后台 reconcile 循环（asyncio 任务）.

    FastAPI startup 事件中注册:
        asyncio.create_task(reconcile_loop())
    """
    logger.info("reconcile loop started (interval=%ds)", sleep_seconds)
    while True:
        try:
            await _reconcile_all()
        except Exception:
            logger.exception("reconcile loop iteration failed — continuing")
        await asyncio.sleep(sleep_seconds)


async def _reconcile_all():
    """遍历所有活跃编排实例，逐实例 reconcile."""
    from database import SessionLocal
    from models.orchestration import OrchestrationInstance

    db = SessionLocal()
    try:
        instances = (
            db.query(OrchestrationInstance)
            .filter(OrchestrationInstance.status.in_(["running", "degraded", "converging"]))
            .all()
        )
        for inst in instances:
            try:
                await _reconcile_instance(db, inst)
            except Exception:
                logger.exception("reconcile failed for instance %d", inst.id)
        db.commit()
    finally:
        db.close()


async def _reconcile_instance(db, inst) -> None:
    """对单个编排实例执行 observe → diff → reconcile（含漂移检测 + 退避 + 拓扑感知）."""
    # ── 退避检查 ──
    if _should_backoff(inst.id):
        logger.debug("实例 %d 处于退避/暂停状态，跳过本轮 reconcile", inst.id)
        return

    from models.orchestration import TopologySnapshot
    from services.agent_probe_service import probe_service

    snapshot = (
        db.query(TopologySnapshot)
        .filter(TopologySnapshot.instance_id == inst.id)
        .order_by(TopologySnapshot.created_at.desc())
        .first()
    )
    if not snapshot:
        return

    desired = _parse_desired_state(snapshot.yaml_raw)
    actual = await _observe_actual_state(db, inst)

    # ── 漂移检测 ──
    drift = _detect_drift(desired, actual, probe_service)
    if drift["severity"] in ("caution", "dangerous"):
        logger.warning(
            "漂移检测 [%s] 实例 %d: 期望=%d 健康=%d 异常=%d 漂移=%d, 详情=%s",
            drift["severity"], inst.id,
            drift["expected_count"], drift["healthy_count"],
            drift["unhealthy_count"], drift["drift_count"],
            drift["details"],
        )
        if drift["severity"] == "dangerous":
            _write_audit(
                db, inst, "reconcile.drift_dangerous",
                f"严重漂移：期望 {drift['expected_count']} 个 agent，"
                f"仅 {drift['healthy_count']} 个健康，{drift['unhealthy_count']} 个异常",
            )

    diffs = compare_states(desired, actual)

    if not diffs:
        _record_reconcile_success(inst.id)
        return

    # ── 记录 reconcile 尝试 ──
    reconcile_ok = True
    for diff in diffs:
        try:
            await _reconcile_action(db, inst, diff)
        except Exception:
            reconcile_ok = False
            logger.exception("reconcile action failed for instance %d, agent %s", inst.id, diff.get("agent"))
            _record_reconcile_failure(inst.id)

    if reconcile_ok and diffs:
        _record_reconcile_success(inst.id)


def _parse_desired_state(yaml_raw: str) -> dict:
    """解析拓扑快照中的期望状态."""
    import yaml
    try:
        doc = yaml.safe_load(yaml_raw)
        agents = doc.get("spec", {}).get("agents", [])
        return {"agents": [{"name": a["name"], "status": "running"} for a in agents]}
    except Exception:
        return {"agents": []}


async def _observe_actual_state(db, inst) -> dict:
    """查询 Agent 实际运行状态."""
    from models.agent import Agent
    agent_ids = inst.agent_ids or []
    agents = db.query(Agent).filter(Agent.id.in_(agent_ids)).all() if agent_ids else []
    return {
        "agents": [
            {"name": a.name, "status": a.status or "unknown", "id": a.id}
            for a in agents
        ]
    }


def compare_states(desired: dict, actual: dict) -> list[dict]:
    """对比期望 vs 实际状态，返回差异列表.

    Returns:
        [{"agent": str, "type": "crashed"|"status_mismatch"|"missing"|"drift", "expected": str, "actual": str}]
    """
    diffs: list[dict] = []
    desired_agents = {a["name"]: a for a in desired.get("agents", [])}
    actual_agents = {a["name"]: a for a in actual.get("agents", [])}

    for name, d in desired_agents.items():
        a = actual_agents.get(name)
        if a is None:
            diffs.append({"agent": name, "type": "missing", "expected": "running", "actual": "not_found"})
        elif a["status"] == "crashed" or a["status"] == "error":
            diffs.append({"agent": name, "type": "crashed", "expected": "running", "actual": a["status"]})
        elif a["status"] != "running" and a["status"] != "standby":
            diffs.append({"agent": name, "type": "status_mismatch", "expected": "running", "actual": a["status"]})

    # 反向检查：实际有多余的 agent（可能手动添加 → 漂移）
    for name, a in actual_agents.items():
        if name not in desired_agents:
            diffs.append({"agent": name, "type": "drift", "expected": "absent", "actual": a["status"]})

    return diffs


# ── 漂移检测 ────────────────────────────────────────────────────


def _detect_drift(desired_state: dict, actual_state: dict, probe_service=None) -> dict:
    """检测期望 agent 数量（YAML 拓扑）与实际健康 agent 数量（agent_probes 表）的漂移。

    比较 YAML spec.agents 与 probe_service 中的健康 agent 数量，
    返回结构化的漂移报告。

    Args:
        desired_state: _parse_desired_state() 的输出，含 {"agents": [{"name": ..., "status": ...}]}
        actual_state: _observe_actual_state() 的输出，含 {"agents": [{"name": ..., "status": ..., "id": ...}]}
        probe_service: 可选的 ProbeService 实例，用于获取连续失败计数

    Returns:
        {
            "expected_count": int,      # YAML 拓扑中期望的 agent 数量
            "actual_count": int,        # 实际注册的 agent 数量
            "healthy_count": int,       # 实际 healthy 的 agent 数量
            "unhealthy_count": int,     # 实际 unhealthy/crashed/error 的 agent 数量
            "drift_count": int,         # 期望健康数 - 实际健康数（正数=有缺口）
            "severity": "safe"|"caution"|"dangerous",
            "details": [{"agent": str, "status": str, "issue": str}, ...]
        }
    """
    expected_agents = {a["name"] for a in desired_state.get("agents", [])}
    actual_agents = {a["name"]: a for a in actual_state.get("agents", [])}

    expected_count = len(expected_agents)
    actual_count = len(actual_agents)

    healthy_statuses = {"running", "standby", "healthy"}
    unhealthy_statuses = {"crashed", "error", "unhealthy"}

    healthy_count = sum(1 for a in actual_agents.values() if a["status"] in healthy_statuses)
    unhealthy_count = sum(1 for a in actual_agents.values() if a["status"] in unhealthy_statuses)

    # 如果 probe_service 可用，用其连续失败计数进一步细化 unhealthy 判定
    if probe_service is not None:
        for agent_name, agent_info in actual_agents.items():
            agent_id = agent_info.get("id")
            if agent_id is not None:
                consecutive = probe_service._consecutive_failures.get(agent_id, 0)
                threshold = probe_service.failure_threshold
                if agent_info["status"] not in healthy_statuses and consecutive < threshold:
                    # 尚未达到 unhealthy 阈值，不计入 unhealthy_count
                    pass

    drift_count = expected_count - healthy_count
    if drift_count < 0:
        drift_count = 0  # 实际健康数多于期望不算漂移
    # 漂移中扣除已计入 unhealthy 的部分，避免与 unhealthy_count 重复计算
    net_drift = max(0, drift_count - unhealthy_count)

    severity = _classify_action({
        "expected_count": expected_count,
        "healthy_count": healthy_count,
        "unhealthy_count": unhealthy_count,
        "drift_count": net_drift,
    })

    # 构建详细问题列表
    details: list[dict] = []
    for name in expected_agents:
        if name not in actual_agents:
            details.append({"agent": name, "status": "missing", "issue": "期望的 agent 未在运行时中找到"})
        else:
            a = actual_agents[name]
            if a["status"] not in healthy_statuses:
                details.append({
                    "agent": name,
                    "status": a["status"],
                    "issue": f"期望 running，实际 {a['status']}",
                })

    # 检查多余 agent（漂移）
    for name in actual_agents:
        if name not in expected_agents:
            details.append({"agent": name, "status": actual_agents[name]["status"], "issue": "非期望拓扑中的 agent"})

    return {
        "expected_count": expected_count,
        "actual_count": actual_count,
        "healthy_count": healthy_count,
        "unhealthy_count": unhealthy_count,
        "drift_count": net_drift,
        "severity": severity,
        "details": details,
    }


def _classify_action(drift: dict) -> str:
    """根据漂移严重程度分类操作安全级别。

    Args:
        drift: _detect_drift() 返回的漂移字典（或其子集，至少含 unhealthy_count/drift_count/expected_count）

    Returns:
        "safe" —— 无需操作，状态正常
        "caution" —— 有少量异常，可以自动修复
        "dangerous" —— 严重异常，需要人工介入或降级处理
    """
    unhealthy = drift.get("unhealthy_count", 0)
    drift_count = drift.get("drift_count", 0)
    expected = drift.get("expected_count", 0)

    if unhealthy == 0 and drift_count == 0:
        return "safe"

    total_issue = unhealthy + drift_count

    # 超过一半 agent 出问题 → dangerous
    if expected > 0 and total_issue > expected / 2:
        return "dangerous"

    # 3 个或以上 agent 出问题 → dangerous
    if total_issue >= 3:
        return "dangerous"

    # 1-2 个 agent 出问题但占比不大 → caution
    if total_issue >= 1:
        return "caution"

    return "safe"


# ── 退避机制 ────────────────────────────────────────────────────

# 模块级退避状态：{instance_id: {"failures": int, "next_retry_at": datetime, "paused": bool}}
_backoff_state: dict[int, dict] = {}
_BACKOFF_SECONDS = [1, 2, 4, 8]
_MAX_CONSECUTIVE_FAILURES = 3


def _should_backoff(instance_id: int) -> bool:
    """检查实例是否应跳过本轮 reconcile（退避或暂停中）。"""
    state = _backoff_state.get(instance_id)
    if state is None:
        return False
    if state.get("paused"):
        return True
    next_retry = state.get("next_retry_at")
    if next_retry is not None and datetime.utcnow() < next_retry:
        return True
    return False


def _record_reconcile_failure(instance_id: int) -> None:
    """记录一次 reconcile 失败，执行指数退避。

    退避策略：1s → 2s → 4s → 8s，超过 _MAX_CONSECUTIVE_FAILURES 次后暂停。
    """
    state = _backoff_state.setdefault(instance_id, {"failures": 0, "next_retry_at": None, "paused": False})
    state["failures"] += 1

    failures = state["failures"]
    if failures > _MAX_CONSECUTIVE_FAILURES:
        state["paused"] = True
        logger.warning("实例 %d 连续失败 %d 次（超过阈值 %d）→ 暂停 reconcile，需手动恢复",
                       instance_id, failures, _MAX_CONSECUTIVE_FAILURES)
    elif failures <= len(_BACKOFF_SECONDS):
        delay = _BACKOFF_SECONDS[failures - 1]
        state["next_retry_at"] = datetime.utcnow() + timedelta(seconds=delay)
        logger.info("实例 %d reconcile 失败，指数退避 %ds（第 %d/%d 次）",
                    instance_id, delay, failures, _MAX_CONSECUTIVE_FAILURES)
    else:
        delay = _BACKOFF_SECONDS[-1]
        state["next_retry_at"] = datetime.utcnow() + timedelta(seconds=delay)
        logger.info("实例 %d reconcile 失败，退避 %ds（第 %d 次）", instance_id, delay, failures)


def _record_reconcile_success(instance_id: int) -> None:
    """reconcile 成功时重置退避状态。"""
    if instance_id in _backoff_state:
        _backoff_state.pop(instance_id, None)
        logger.debug("实例 %d reconcile 成功，退避状态已重置", instance_id)


def _resume_paused(instance_id: int) -> None:
    """手动恢复暂停的实例 reconcile。"""
    state = _backoff_state.get(instance_id)
    if state:
        state["failures"] = 0
        state["next_retry_at"] = None
        state["paused"] = False
        logger.info("实例 %d 已手动恢复 reconcile", instance_id)


# ── 拓扑感知 ────────────────────────────────────────────────────


def _get_agent_dependencies(inst) -> dict[str, set[str]]:
    """解析拓扑中的 agent 依赖关系。

    从 OrchestrationInstance.edges_json 和 yaml_raw 中提取边连接，
    构建反向依赖图：agent_name → {依赖它的上游 agent 名称集合}。

    edges 格式: [{"from": "A", "to": "B"}, ...] 表示 A → B（A 依赖 B 的输出）

    Returns:
        {agent_name: {依赖该 agent 的上游 agent 集合}}
        即：修复 agent B 前，A 和 C 需要暂停（如果它们依赖 B）。
    """
    edges = list(inst.edges_json or [])

    # 如果 edges_json 为空，尝试从 yaml_raw 解析
    if not edges and getattr(inst, "yaml_raw", None):
        try:
            import yaml
            doc = yaml.safe_load(inst.yaml_raw)
            spec = doc.get("spec", {})
            edges = spec.get("edges") or spec.get("connections") or spec.get("dependencies") or []
        except Exception:
            pass

    if not edges:
        return {}

    # 构建反向依赖图
    dependents: dict[str, set[str]] = {}
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        from_agent = edge.get("from") or edge.get("source")
        to_agent = edge.get("to") or edge.get("target")
        if from_agent and to_agent:
            dependents.setdefault(to_agent, set()).add(from_agent)

    return dependents


def _topology_safe_pause(agent_name: str, inst, db) -> list[str]:
    """在修复 agent 前，暂停所有依赖该 agent 的上游 agent。

    拓扑感知修复：修复 agent B 之前，先暂停 A（如果 A → B），
    避免 A 发出请求到正在修复中的 B。

    Args:
        agent_name: 待修复的 agent 名称
        inst: OrchestrationInstance 实例
        db: 数据库会话

    Returns:
        已暂停的 agent 名称列表
    """
    dependencies = _get_agent_dependencies(inst)
    upstream = dependencies.get(agent_name, set())

    if not upstream:
        return []

    from models.agent import Agent

    paused: list[str] = []
    for dep_name in upstream:
        dep_agent = db.query(Agent).filter(
            Agent.id.in_(inst.agent_ids or []),
            Agent.name == dep_name,
        ).first()
        if dep_agent and dep_agent.status in ("running",):
            dep_agent.status = "paused"
            paused.append(dep_name)
            logger.warning("拓扑感知：暂停上游 agent '%s'（依赖待修复的 '%s'）", dep_name, agent_name)
            _write_audit(
                db, inst, "reconcile.topology_pause",
                f"Paused upstream agent '{dep_name}' before repairing '{agent_name}'",
            )

    return paused


async def _reconcile_action(db, inst, diff: dict) -> None:
    """执行 reconcile 动作（含拓扑感知暂停 + 退避记录）."""
    agent_name = diff["agent"]
    diff_type = diff["type"]

    if diff_type == "crashed":
        # 拓扑感知：修复前暂停依赖此 agent 的上游 agents
        _topology_safe_pause(agent_name, inst, db)
        logger.warning("reconcile: agent '%s' crashed → marking degraded, auto-restart needed", agent_name)
        inst.status = "degraded"
        inst.transition_status = f"agent:{agent_name}:restarting"
        _write_audit(db, inst, "reconcile.auto_restart", f"Agent '{agent_name}' crashed, auto-restart triggered")

    elif diff_type == "missing":
        _topology_safe_pause(agent_name, inst, db)
        logger.warning("reconcile: agent '%s' missing from runtime → marking degraded", agent_name)
        inst.status = "degraded"
        inst.transition_status = f"agent:{agent_name}:missing"
        _write_audit(db, inst, "reconcile.auto_restart", f"Agent '{agent_name}' not found, attempting restart")

    elif diff_type == "status_mismatch":
        logger.info("reconcile: agent '%s' status mismatch (%s vs %s) — monitoring", agent_name, diff["expected"], diff["actual"])
        # 不立即修复，等待下一轮确认

    elif diff_type == "drift":
        logger.warning("reconcile: drift detected — agent '%s' not in desired topology", agent_name)
        inst.status = "degraded"
        inst.transition_status = f"drift:{agent_name}"
        _write_audit(db, inst, "reconcile.drift_detected", f"Unexpected agent '{agent_name}' found, possible manual modification")


def _write_audit(db, inst, action: str, detail: str) -> None:
    """写入审计日志."""
    try:
        from services.audit_service import log_audit
        log_audit(
            user_id=inst.owner_id,
            user_name="system",
            action=action,
            target=str(inst.id),
            target_type="orchestration_instance",
            detail=detail,
            ip="127.0.0.1",
            result="success",
        )
    except Exception:
        logger.exception("audit write failed for reconcile action")
