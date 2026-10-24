"""把本地已部署的 **hermes / dsh CLI** 当成模型 provider（试运行/无 key 场景）。

安全与边界（CLAUDE.md 约定）：
- **不经过 shell**：`argv` 列表直接 exec，prompt 作为**单个参数**传入，不做字符串拼接；
- 超时可配（`RSI_CLI_TIMEOUT_SECONDS`），超时即失败、不重试；
- 只允许白名单的两种 CLI（`dsh` / `hermes`），二进制路径由 env 指定，不接受调用方传任意命令；
- 输出是不可信外部输入：只做去 ANSI / 取最后一条非空行（judge）或整段（抽取，靠 JSON 括号扫描）。
"""
from __future__ import annotations

import re
import subprocess

import config
from services.llm_providers import BaseProvider

ANSI_RE = re.compile(r"\x1b\[[0-9;]*[mK]")

# 本机可委托执行的 CLI 运行时。`get_provider('cli', runtime)` 用这个集合判定
# 「这个 Agent 的运行时能否真落到某条 CLI 上」，判不了就报错——不静默换另一个 CLI 代跑。
CLI_KINDS = ("dsh", "hermes")


def build_argv(prompt: str, kind: str | None = None) -> list[str]:
    """构造 argv。白名单两种 CLI；prompt 永远作为最后一个独立参数。"""
    kind = (kind or config.RSI_CLI_PROVIDER or "dsh").strip().lower()
    if kind == "dsh":
        return [config.RSI_CLI_NODE, config.RSI_CLI_DSH_BIN,
                "--profile", config.RSI_CLI_DSH_PROFILE, prompt]
    if kind == "hermes":
        return [config.RSI_CLI_HERMES_BIN, "-z", prompt]
    raise ValueError(f"不支持的 CLI provider: {kind!r}（只允许 {' / '.join(CLI_KINDS)}）")


def normalize_reply(stdout: str) -> str:
    """去掉 ANSI 与首尾空白；保留全文（抽取要 JSON 片段）。"""
    return ANSI_RE.sub("", stdout or "").strip()


def last_line(reply: str) -> str:
    """judge 用：取最后一条非空行（CLI 可能先打印加载日志）。"""
    lines = [ln.strip() for ln in (reply or "").splitlines() if ln.strip()]
    return lines[-1] if lines else ""


class CliProvider(BaseProvider):
    """`chat()` 兼容既有 provider；模型名忽略（CLI 用自己的模型配置）。"""

    def __init__(self, kind: str | None = None, runner=None):
        self.kind = (kind or config.RSI_CLI_PROVIDER or "dsh").strip().lower()
        # runner 可注入（测试用，避免真的起 agent）；签名 (argv, timeout) -> (rc, out, err)
        self._runner = runner

    def chat(self, messages: list[dict[str, str]], api_key: str,
             model_name: str) -> tuple[str, dict]:
        prompt = "\n\n".join(
            f"[{m.get('role', 'user')}] {m.get('content', '')}" for m in messages
        )
        argv = build_argv(prompt, self.kind)
        if self._runner is not None:
            rc, out, err = self._runner(argv, config.RSI_CLI_TIMEOUT_SECONDS)
        else:
            try:
                proc = subprocess.run(
                    argv, capture_output=True, text=True,
                    timeout=int(config.RSI_CLI_TIMEOUT_SECONDS), check=False,
                )
            except subprocess.TimeoutExpired as e:
                raise RuntimeError(
                    f"CLI({self.kind}) 超时（>{config.RSI_CLI_TIMEOUT_SECONDS}s）") from e
            rc, out, err = proc.returncode, proc.stdout, proc.stderr
        if rc != 0:
            tail = normalize_reply(err)[-300:]
            raise RuntimeError(f"CLI({self.kind}) 退出码 {rc}: {tail}")
        return normalize_reply(out), {"total_tokens": 0, "cli": self.kind}
