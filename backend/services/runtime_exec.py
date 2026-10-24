"""把 Agent 的模型调用委托给**本机 CLI 运行时**（v21 T-02）。

背景：`runtime/adapters/*` 只负责**解析**外部 CLI 的会话日志（detect/log_paths/parse），
从不执行。这里补的是执行通道：`agent.runtime ∈ {hermes, dsh, codex}` 且平台显式启用时，
用该运行时的命令模板真跑一次，把 stdout 当回复。

口径（与 P2-3 隔离契约一致）：
- **默认关闭**（`RUNTIME_EXEC_ENABLED=false`）：不配置就仍走进程内 provider，绝不静默换执行体；
- **fail-closed**：运行时不支持 / 模板为空 / 命令不存在 / 超时 / 非零退出 → 报错，不降级；
- **不经 shell**：模板 shlex 切词，`{prompt}` 替换为**单个** argv 参数；
- 输出是不可信外部输入：去 ANSI、取全文由调用方决定怎么用。
"""
from __future__ import annotations

import re
import shlex
import subprocess

import config

ANSI_RE = re.compile(r"\x1b\[[0-9;]*[mK]")
EXECUTABLE_RUNTIMES = ("hermes", "dsh", "codex")


class RuntimeExecError(RuntimeError):
    """运行时执行不可用/失败（调用方应 502/400，绝不静默回退 provider）。"""


def normalize_runtime(runtime: str | None) -> str:
    return (runtime or "").strip().lower().replace("-", "_")


def command_for(runtime: str) -> list[str]:
    """返回 argv（未替换 prompt）。不可执行 → RuntimeExecError。"""
    kind = normalize_runtime(runtime)
    if kind not in EXECUTABLE_RUNTIMES:
        raise RuntimeExecError(f"运行时 {runtime!r} 不支持委托执行（只支持 {EXECUTABLE_RUNTIMES}）")
    template = (config.RUNTIME_CMD_TEMPLATES.get(kind) or "").strip()
    if not template:
        raise RuntimeExecError(
            f"运行时 {kind} 未配置命令模板（设 RUNTIME_CMD_{kind.upper()}，含 {{prompt}} 占位）")
    argv = shlex.split(template)
    if not any("{prompt}" in a for a in argv):
        raise RuntimeExecError(f"运行时 {kind} 的命令模板缺少 {{prompt}} 占位: {template!r}")
    return argv


def enabled(runtime: str | None) -> bool:
    """该运行时当下能否委托执行（开关 + 模板 + 占位齐备）。"""
    if not config.RUNTIME_EXEC_ENABLED:
        return False
    try:
        command_for(runtime)
        return True
    except RuntimeExecError:
        return False


def execute(runtime: str, prompt: str, *, runner=None) -> dict:
    """真跑一次 CLI 运行时。runner 可注入 `(argv, timeout) -> (rc, out, err)`（测试用）。"""
    if not config.RUNTIME_EXEC_ENABLED:
        raise RuntimeExecError("运行时执行未启用（RUNTIME_EXEC_ENABLED=false，仍走进程内 provider）")
    argv = [prompt if a == "{prompt}" else a.replace("{prompt}", prompt) for a in command_for(runtime)]
    timeout = int(config.RUNTIME_EXEC_TIMEOUT_SECONDS)
    if runner is not None:
        rc, out, err = runner(argv, timeout)
    else:
        try:
            proc = subprocess.run(argv, capture_output=True, text=True,
                                  timeout=timeout, check=False)
        except FileNotFoundError as e:
            raise RuntimeExecError(f"运行时 {runtime} 命令不存在: {argv[0]}") from e
        except subprocess.TimeoutExpired as e:
            raise RuntimeExecError(f"运行时 {runtime} 超时（>{timeout}s）") from e
        rc, out, err = proc.returncode, proc.stdout, proc.stderr
    if rc != 0:
        tail = ANSI_RE.sub("", (err or ""))[-300:]
        raise RuntimeExecError(f"运行时 {runtime} 退出码 {rc}: {tail}")
    reply = ANSI_RE.sub("", out or "").strip()
    return {"reply": reply, "runtime": normalize_runtime(runtime), "usage": {}}
