"""执行隔离契约（P2-3 / R4-1）—— **契约先行，能力逐档开放**。

现状：执行面 = 同进程 LLM 调用（没有任意代码执行面）。因此这里的做法是
「先把契约立起来，再把没实现的档位显式拒绝」——**fail-closed，不静默降级**：

- `tier`：`inproc`（本版唯一可用）| `process` | `container` | `microvm` | `remote`
- `ttl`：单次执行时限（秒），到点必须终止；`retain`（保留工作区）必须配 ttl
- `egress`：**默认拒绝**，只允许显式白名单；`*` 一律拒绝（等于没有围栏）
- `egress_enforced`：`inproc` 恒为 False（进程内没有网络边界）——契约把这件事写出来，
  而不是假装有围栏

选择未实现的档位 = 启动即失败（`ExecutionContractError`），不降级到 inproc。
"""
from __future__ import annotations

import ipaddress
import re
from dataclasses import dataclass, field

import config

TIER_ORDER = ("inproc", "process", "container", "microvm", "remote")

# 本版构建实际可用的档位；其余「已声明、未实现」——选它必须失败
AVAILABLE_TIERS: frozenset[str] = frozenset({"inproc"})

DEFAULT_TTL_SECONDS = 300
MAX_TTL_SECONDS = 3600

_EGRESS_HOST_RE = re.compile(r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*"
                             r"[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$")


class ExecutionContractError(RuntimeError):
    """契约不成立（启动/执行前即失败）。"""


@dataclass
class ExecutionSpec:
    tier: str = "inproc"
    ttl_seconds: int = DEFAULT_TTL_SECONDS
    retain: bool = False
    egress_allowlist: list[str] = field(default_factory=list)
    cpu_limit: float | None = None
    memory_mb: int | None = None

    def to_dict(self) -> dict:
        return {
            "tier": self.tier,
            "ttl_seconds": self.ttl_seconds,
            "retain": self.retain,
            "egress_allowlist": list(self.egress_allowlist),
            "cpu_limit": self.cpu_limit,
            "memory_mb": self.memory_mb,
            "egress_enforced": egress_enforced(self.tier),
        }


def egress_enforced(tier: str) -> bool:
    """只有真正有网络边界的档位才算「egress 被强制」。"""
    return tier in ("container", "microvm", "remote")


def _valid_host(entry: str) -> bool:
    if not entry or entry == "*":
        return False
    try:
        ipaddress.ip_network(entry, strict=False)
        return True
    except ValueError:
        pass
    return bool(_EGRESS_HOST_RE.match(entry))


def validate(spec: ExecutionSpec) -> ExecutionSpec:
    """校验并规整；任何不成立都抛错（route 映射 400，启动校验直接崩）。"""
    if spec.tier not in TIER_ORDER:
        raise ExecutionContractError(
            f"未知 tier '{spec.tier}'，合法值：{' | '.join(TIER_ORDER)}"
        )
    if spec.tier not in AVAILABLE_TIERS:
        raise ExecutionContractError(
            f"tier '{spec.tier}' 已声明但本版未实现（当前可用：{sorted(AVAILABLE_TIERS)}）。"
            "拒绝执行而不是静默降级到 inproc"
        )
    if not isinstance(spec.ttl_seconds, int) or spec.ttl_seconds <= 0:
        raise ExecutionContractError("ttl_seconds 必须是正整数")
    if spec.ttl_seconds > MAX_TTL_SECONDS:
        raise ExecutionContractError(f"ttl_seconds 不得超过 {MAX_TTL_SECONDS}")
    if spec.retain and spec.ttl_seconds <= 0:
        raise ExecutionContractError("retain=true 必须配 ttl_seconds")
    if "*" in spec.egress_allowlist:
        raise ExecutionContractError("egress_allowlist 不允许 '*'（等于没有围栏；默认拒）")
    for entry in spec.egress_allowlist:
        if not _valid_host(entry):
            raise ExecutionContractError(f"非法 egress 目标: '{entry}'")
    return spec


def from_config() -> ExecutionSpec:
    """按部署配置构造契约（启动时校验）。"""
    return ExecutionSpec(
        tier=config.EXECUTION_TIER,
        ttl_seconds=config.EXECUTION_TTL_SECONDS,
        retain=config.EXECUTION_RETAIN,
        egress_allowlist=list(config.EXECUTION_EGRESS_ALLOW),
    )


def validate_startup() -> ExecutionSpec:
    """启动校验：档位不可用 / 契约非法 → 直接抛，不启动。"""
    return validate(from_config())


def assert_can_execute(spec: ExecutionSpec | None = None) -> ExecutionSpec:
    """执行前闸门（服务端行为，不靠提示词）。"""
    return validate(spec or from_config())


def describe() -> dict:
    return {
        "tiers": list(TIER_ORDER),
        "available": sorted(AVAILABLE_TIERS),
        "egress_enforced_tiers": [t for t in TIER_ORDER if egress_enforced(t)],
        "defaults": {
            "tier": config.EXECUTION_TIER,
            "ttl_seconds": config.EXECUTION_TTL_SECONDS,
            "retain": config.EXECUTION_RETAIN,
            "egress_allowlist": list(config.EXECUTION_EGRESS_ALLOW),
        },
        "notes": [
            "inproc = 同进程调用，没有网络围栏（egress_enforced=false，如实声明）",
            "process/container/microvm/remote 已声明未实现：选择即启动失败（fail-closed）",
        ],
    }
