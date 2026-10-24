# SUMMARY: T02 — 影子重放 runner

- **Change ID**: v20-residual · T02 · 2026-10-24

## 做了什么

`services/shadow_runner.py`：`score_cases`（确定性精确比对）+ `run_shadow`（调既有 `rsi_service.record_shadow`）。
**不复制门禁**：金标冻结 / 异厂 judge / NOISE FLOOR / collapsed / awaiting_approval 全沿用。
响应自证：`judge_kind='exact_match'`、`dry_run=true`（本版不调外部模型，不冒充异厂评审）。

## verify

```text
$ unittest tests.test_shadow_runner
Ran 10 tests — OK   # 打分 3 + 服务 5 + 路由 2
```
