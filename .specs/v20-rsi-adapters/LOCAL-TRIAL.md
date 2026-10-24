# 本地试运行记录：Ollama qwen2.5:3b（真实调用，非 mock）

- **时间**：2026-10-24 18:35
- **环境**：`http://127.0.0.1:11434`（本机 Ollama，已装 `qwen2.5:3b`）；`hermes proxy` 两个上游（nous/xai）**均未登录**，故未使用
- **配置**（仅进程级 env，未写死）：
  ```
  RSI_JUDGE_PROVIDER=ollama  RSI_JUDGE_MODEL=qwen2.5:3b  RSI_JUDGE_MAX_CALLS=4
  RSI_EXTRACTOR_PROVIDER=ollama  RSI_EXTRACTOR_MODEL=qwen2.5:3b
  ```
- **脚本**：`/tmp/local_trial.py`（临时库 + 一个会话 + 一个提案）

## 结果（真实输出）

```text
== judge 配置 == True
== L0 抽取 == {"conversations": 1, "dry_run": false, "candidates": 1, "created": 1}
   memory: confounded | cue: 构建失败时 | lesson: 先看第一个类型错误，后面的多为级联 | evidence: 18
== 影子重放 == {"pass_rate": 0.5, "cases": 2, "judge_kind": "llm_judge", "dry_run": false}
   proposal.status = awaiting_approval
```

判读：
- L0 真实抽取 → 1 条候选 → 经三字段门入库（机器抽取默认 `confounded`，符合口径）；
- judge 2 条用例：第 1 条语义等价判 1、第 2 条判 0 → `pass_rate=0.5`，delta 0.5 ≥ NOISE FLOOR → 提案进 `awaiting_approval`（**仍须人批发布**，本次未发布）。

## 试运行中真实修掉的两个问题

1. **judge prompt 太简，小模型答「0」到底**：加 few-shot 两条示例后，同一模型对同一用例给出 `1 / 0` 的正确区分。
2. **抽取器输出形状容错**：qwen2.5:3b 首次返回 `[[cue, lesson, evidence]]`（数组套数组）→ 旧解析器静默丢光候选（`candidates:0`）。
   处理：prompt 加对象示例 **+** 解析器同时接受对象与三元组（LLM 输出属不可信外部输入；其它形状丢弃不猜）→ 复跑得到 1 条候选。

## 启用方式（真实部署）

```bash
# 本地 ollama（免 key）
RSI_JUDGE_PROVIDER=ollama RSI_JUDGE_MODEL=qwen2.5:3b RSI_JUDGE_MAX_CALLS=4 \
RSI_EXTRACTOR_PROVIDER=ollama RSI_EXTRACTOR_MODEL=qwen2.5:3b \
uvicorn main:app --port 8000
```
或用远端异厂（需 `RSI_JUDGE_API_KEY`）。未配置时端点仍 400（fail-closed，不偷偷调用）。

## 未验证

- 3B 模型的判断质量不足以上生产（仅证管道通；生产建议 ≥ 30B 或异厂 API）。
- 未测多轮并发/超时；真厂商限流未覆盖。

---

# 追加：本地 **CLI** 通道（dsh / hermes，用户 10-24 明确「用本地部署的 hermes 和 dsh 的 CLI」）

- 实现：`services/cli_provider.py` → `get_provider("cli")`；**不经过 shell**（argv 列表、prompt 单参数）、超时可配、只允许 `dsh|hermes` 白名单。
- 配置：`RSI_JUDGE_PROVIDER=cli` / `RSI_EXTRACTOR_PROVIDER=cli` + `RSI_CLI_PROVIDER=dsh|hermes`（两通道均免 key）。
- 命令形态：`node <dsh bin> --profile headless "<prompt>"` · `<hermes bin> -z "<prompt>"`。

## 真实跑通（同一套脚本 `/tmp/cli_trial.py`）

```text
$ RSI_CLI_PROVIDER=dsh … python /tmp/cli_trial.py dsh
== provider = dsh · judge configured = True
== L0 抽取 == {"dry_run": false, "candidates": 2, "created": 2} (4.8s)
   memory: confounded | cue: 前端构建失败、tsc 报出一堆类型错误时 | lesson: 按报错顺序先看第一个类型错误…
   memory: confounded | cue: 因类型错误导致构建失败、想动构建配置时 | lesson: 别急着改配置文件…
== 影子重放 == {"pass_rate": 0.5, "cases": 2, "judge_kind": "llm_judge", "dry_run": false} (7.8s)
   proposal.status = awaiting_approval

$ RSI_CLI_PROVIDER=hermes … python /tmp/cli_trial.py hermes
== provider = hermes · judge configured = True
== L0 抽取 == {"dry_run": false, "candidates": 1, "created": 1} (7.3s)
== 影子重放 == {"pass_rate": 0.5, "cases": 2, "judge_kind": "llm_judge", "dry_run": false} (14.0s)
   proposal.status = awaiting_approval
```

判读：两条 CLI 通道都能**真抽取 + 真评审**；dsh headless 更快（4.8/7.8s）且抽取质量更好（2 条 vs 1 条）；
hermes 慢约 2 倍。judge 对「等价 / 不等价」两例给出正确的 1/0。

## 稳定性与安全

- 判分只看**最后一条非空行**（CLI 会先打印加载日志）；抽取仍靠 JSON 括号扫描。
- 非零退出码 → `RuntimeError`（带 stderr 尾 300 字）；超时 → 明确报错，不重试、不降级。
- prompt 永不进 shell；二进制路径由 env 指定且仅两种白名单。
- 单测 9 条（argv/白名单/ANSI/最后一行/非零退出/超时/免 key/最后一行判分）走注入 runner，不真起 agent。
