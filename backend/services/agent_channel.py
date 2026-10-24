"""Agent 的模型通道推导 —— **单一事实源**。

RULINGS 2026-10-15：Provider / Base URL / Agent 级 API Key（旧宇宙）已裁撤。
创建表单只选「运行时 + 模型（目录来自运行时）」，provider 由运行时推导：

- CLI 运行时（hermes / dsh / codex）→ `cli`：凭据留在运行时机器，平台不落厂商 Key；
- 其余运行时 → `openai`（历史默认，保持存量行为不变）。

放在 services 而不是 routes：批量导入脚本（`scripts/import_multica.py`）与 API 必须
用**同一份**推导，否则「导入进来的 Agent」和「界面创建的 Agent」通道会不一样。
"""
from __future__ import annotations

from services.llm_providers import CLI_PROVIDER, SUPPORTED_PROVIDERS

# 可委托执行的 CLI 运行时：这些 Agent 的模型调用落到 CLI 上，平台不再收厂商凭据
CLI_RUNTIMES = frozenset({"hermes", "dsh", "codex"})
# 允许落库的 provider：既有进程内通道 + CLI 通道
ALLOWED_PROVIDERS = SUPPORTED_PROVIDERS | {CLI_PROVIDER}


def provider_for_runtime(runtime: str) -> str:
    """未显式给 provider 时，按运行时推导（CLI 运行时 → cli，其余 → openai）。"""
    return CLI_PROVIDER if runtime in CLI_RUNTIMES else "openai"


def checked_provider(runtime: str, explicit) -> str:
    """显式 provider 校验；未传（None / 空串）则按运行时推导。

    Raises:
        ValueError: 显式 provider 不在允许集合里。
    """
    if explicit in (None, ""):
        return provider_for_runtime(runtime)
    if explicit not in ALLOWED_PROVIDERS:
        raise ValueError(
            f"不支持的 model_provider: '{explicit}'。支持: {sorted(ALLOWED_PROVIDERS)}"
        )
    return explicit
