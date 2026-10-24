"""K8s-inspired routing & scaling service — domain auto-routing, gateway, elastic scaling.

P1-7：排队不再用进程内计数器（`_queued_by_capability`，重启清零、多副本各算各的），
改为 `cluster_store` 里的真实队列行——排位=行数，队列深度=行数，谁都算得一样。
"""

from __future__ import annotations

import uuid

from services import cluster_store
from services.scheduler_service import SchedulerService

# ── 全局单例 ──
_scheduler = SchedulerService()


def _extract_capabilities(agent_row) -> list[str]:
    """从 Agent 行/字典中提取 capabilities 列表."""
    if isinstance(agent_row, dict):
        cfg = agent_row.get("model_config_json") or {}
    else:
        cfg = agent_row.model_config_json or {}
    caps = cfg.get("capabilities", [])
    if isinstance(caps, list):
        return [c for c in caps if isinstance(c, str) and c.strip()]
    return []


def _agent_to_scheduler_dict(agent_row) -> dict:
    """将 Agent 转换为 scheduler_service 需要的字典格式."""
    if isinstance(agent_row, dict):
        d = agent_row
    else:
        d = agent_row.to_dict()
    cfg = d.get("model_config_json") or {}
    caps = cfg.get("capabilities", []) if isinstance(cfg, dict) and isinstance(cfg.get("capabilities"), list) else []
    return {
        "agent_id": d["id"],
        "agent_name": d["name"],
        "capability_tags": caps,
        "current_load": cfg.get("current_load", 0) if isinstance(cfg, dict) else 0,
        "max_concurrency": cfg.get("max_concurrency", 5) if isinstance(cfg, dict) else 5,
        "status": d.get("status", "standby"),
    }


def route_to_agent(agents: list, capability: str) -> dict:
    """在 Agent 列表中按 capability 过滤，选负载最低的；满载则入队（落库）。

    Returns:
        {"agent_id": N, "agent_name": "..", "load": "2/5", "status": "routed"}  或
        {"status": "queued", "position": N, "task_id": "..."}
    """
    if not agents:
        return {"status": "queued", "position": 0, "detail": "没有可路由的 Agent"}

    # 转换为调度器使用的格式
    candidates = [_agent_to_scheduler_dict(a) for a in agents]
    # 匹配 capability
    matched = _scheduler.match(capability, candidates)
    if not matched:
        return {"status": "queued", "position": 0, "detail": f"没有找到具备 '{capability}' 能力的 Agent"}

    # 选负载最低的
    best = _scheduler.pick_least_loaded(matched)
    if best:
        cl = best.get("current_load", 0)
        mc = best.get("max_concurrency", 5)
        return {
            "agent_id": best["agent_id"],
            "agent_name": best["agent_name"],
            "load": f"{cl}/{mc}",
            "status": "routed",
        }

    # 全部繁忙 → 入队（一行一条，重启/多副本都在同一张表里）
    first = agents[0]
    domain_id = first.get("domain_id") if isinstance(first, dict) else first.domain_id
    task_id = f"route-{uuid.uuid4().hex[:12]}"
    row = cluster_store.enqueue_task(
        task_id, label=capability, priority=50, domain_id=domain_id,
    )
    return {
        "status": "queued",
        "position": row["position"],
        "task_id": task_id,
        "detail": "所有匹配 Agent 均满载",
    }


def get_queued_count(domain_id: int, capability: str) -> int:
    """获取指定 capability 组当前的排队任务数（来自队列行，不维护计数器）."""
    return cluster_store.count_queued(label=capability, domain_id=domain_id)


def get_all_queue_counts() -> dict[str, int]:
    """获取所有 capability 的排队计数."""
    return cluster_store.queue_stats()["by_label"]


def decrement_queue(domain_id: int, capability: str) -> int:
    """任务被消费后把最早的一条标完成，返回剩余排队数."""
    return cluster_store.complete_oldest(capability, domain_id=domain_id)


def simulate_queue_monitor(domain_id: int, capability: str, agents: list) -> dict:
    """队列监控：查看是否需要扩容."""
    queued = get_queued_count(domain_id, capability)
    available = 0
    for a in agents:
        cfg = (a.get("model_config_json") or {}) if isinstance(a, dict) else (a.model_config_json or {})
        caps = cfg.get("capabilities", []) if isinstance(cfg, dict) and isinstance(cfg.get("capabilities"), list) else []
        if capability in caps:
            current_load = cfg.get("current_load", 0)
            max_conc = cfg.get("max_concurrency", 5)
            if current_load < max_conc:
                available += 1
    return {
        "domain_id": domain_id,
        "capability": capability,
        "queued": queued,
        "available_agents": available,
        "needs_scale": queued > 0 and available == 0,
    }
