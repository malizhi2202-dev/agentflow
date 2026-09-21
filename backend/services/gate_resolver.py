"""安全闸门解析器 — 实体自有 > 全局默认."""

GLOBAL_DEFAULTS = {
    "gate_pre_check": None,
    "gate_post_check": None,
    "io_filter": "none",
    "token_soft_limit": 80000,
    "token_hard_limit": 100000,
    "audit_enabled": True,
}


def resolve_gate(entity: dict | None, field: str) -> any:
    """解析安全闸门值：实体自己的值优先，null/None 则用全局默认."""
    if entity and entity.get(field) is not None:
        return entity[field]
    return GLOBAL_DEFAULTS.get(field)


def resolve_token_limits(entity: dict | None) -> tuple[int, int]:
    """解析 token 软硬限制."""
    soft = resolve_gate(entity, "token_soft_limit")
    hard = resolve_gate(entity, "token_hard_limit")
    return int(soft), int(hard)


def resolve_chain_limits(project: dict | None, agent: dict | None, workflow: dict | None, tool_limits: list[int] | None = None) -> int:
    """链式解析：取最严限制 min(项目, Agent, 工作流, 工具们)."""
    limits = []
    if project:
        limits.append(project.get("token_hard_limit") or 1000000)
    if agent:
        limits.append(agent.get("token_hard_limit") or 1000000)
    if workflow:
        limits.append(workflow.get("token_hard_limit") or 1000000)
    if tool_limits:
        limits.extend(tool_limits)
    return min(limits) if limits else 1000000
