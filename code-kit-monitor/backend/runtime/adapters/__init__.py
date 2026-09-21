"""Agent 适配器集合 — 自动探测可用 Agent."""
from .claude_code import ClaudeCodeAdapter
from .codex import CodexAdapter
from .hermes import HermesAdapter
from .xiaolongxia import XiaolongxiaAdapter


def get_adapters() -> list:
    """返回所有已安装 Agent 的适配器."""
    adapters = []
    for cls in [ClaudeCodeAdapter, CodexAdapter, HermesAdapter, XiaolongxiaAdapter]:
        a = cls()
        if a.detect():
            adapters.append(a)
    return adapters if adapters else [ClaudeCodeAdapter()]  # 至少返回 Claude
