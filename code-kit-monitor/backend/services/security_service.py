"""安全策略服务 — 默认值填充 + token 软硬限制."""
import logging

logger = logging.getLogger(__name__)

DEFAULT_SECURITY = {
    "gate_pre_check": None,
    "gate_post_check": None,
    "io_filter": "none",
    "token_soft_limit": 80000,
    "token_hard_limit": 100000,
    "token_total_soft_limit": 800000,
    "token_total_hard_limit": 1000000,
    "permission_mode": "owner_only",
    "audit_enabled": True,
}


def apply_defaults(entity: dict) -> dict:
    """为新实体填充安全策略默认值（不覆盖已有值）。"""
    for key, value in DEFAULT_SECURITY.items():
        if key not in entity:
            entity[key] = value
    return entity


def check_token_hard_limit(current_total: int, hard_limit: int) -> bool:
    """执行前检查：累计 token >= 硬限制 → 返回 False（阻断）。"""
    return current_total < hard_limit


def check_token_soft_limit(current_total: int, soft_limit: int) -> bool:
    """执行中检查：累计 token >= 软限制 → 返回 True（警告但不阻断）。"""
    return current_total >= soft_limit


def check_token_post_execution(total_after: int, hard_limit: int) -> bool:
    """执行后检查：累计 >= 硬限制 → 返回 True（标记 exhausted）。"""
    return total_after >= hard_limit
