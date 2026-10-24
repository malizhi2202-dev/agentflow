# T-02 · Agent 真实运行时执行（完成）

- **Change**: v21-completion · 2026-10-24
- **事实基础**：`backend/runtime/adapters/*` 只有 `detect/log_paths/parse`（**解析日志**，不执行）；
  设计里「运行时=成员机器上的外部 CLI」此前没有执行通道 → 本任务补执行通道。

## 做了什么

1. `services/runtime_exec.py`（新）：
   - `EXECUTABLE_RUNTIMES = hermes | dsh | codex`；
   - `command_for(runtime)`：从 `config.RUNTIME_CMD_TEMPLATES` 取模板（`shlex` 切词，`{prompt}` 必须存在），**不经 shell**；
   - `enabled(runtime)`：`RUNTIME_EXEC_ENABLED` + 模板 + 占位三者齐备才算可用；
   - `execute(runtime, prompt, runner=None)`：真跑 CLI（超时/非零退出/命令不存在 → `RuntimeExecError`，**不回退 provider**）。
2. `chat_service._generate(agent, messages, api_key)`（新，唯一模型入口）：启用且可用 → 委托运行时；否则走进程内 provider；运行时报错**上抛不降级**。
3. `models/agent.py`：`SUPPORTED_RUNTIMES` 增 `hermes` / `dsh`（本机可真执行的两种）。
4. `config.py`：`RUNTIME_EXEC_ENABLED`（默认 false）· `RUNTIME_EXEC_TIMEOUT_SECONDS` · `RUNTIME_CMD_TEMPLATES`（hermes/dsh 有默认命令；codex 无 CLI → 空模板 fail-closed）。

## verify（真实输出）

```text
$ unittest tests.test_runtime_exec tests.test_chat_runtime
Ran 12 tests — OK        # 默认关闭/模板缺失/无占位/argv 单参数/非零退出/命令不存在/不降级/走 provider/走运行时
```

真实 CLI 冒烟（`RUNTIME_EXEC_ENABLED=1`，脚本 `/tmp/runtime_smoke.py`）：
```text
hermes: reply='1' runtime=hermes (7.4s)
dsh:    reply='1' runtime=dsh    (3.7s)
```

全量回归见 `TEST.md`。

## 已知接受
- `codex` 运行时本机**未安装 CLI** → 默认空模板，配 `RUNTIME_CMD_CODEX` 即启用（fail-closed 而非假执行）。
- 经运行时的调用 `usage={}`（token 不计入 session_metrics），成本记账待运行时回传 usage 后补。
