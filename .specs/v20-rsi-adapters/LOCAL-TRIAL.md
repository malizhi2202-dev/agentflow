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
