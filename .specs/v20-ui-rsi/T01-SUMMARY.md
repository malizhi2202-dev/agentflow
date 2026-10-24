# SUMMARY: T01 — rsi store

- **Change ID**: v20-ui-rsi · **Task ID**: T01 · **完成时间**: 2026-10-24

## 做了什么

新建 `stores/rsi.ts`：记忆 / 评审账 / 开关 / 熔断 / 衰减 / 提案 / 可改面 七块状态 + 16 个动作。
读写分工沿用 `collab.ts`/`teams.ts`（GET `safeFetch`，写 `dedupedFetch` + `detail` + `invalidateCache()`）。
类型按 `routes/rsi_api.py` 与 `models/rsi.py` 的实际形状定义（含 `source_seq/cites_seq/pollution_flagged`）。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `frontend/src/stores/rsi.ts` | 新增 | 状态 + 动作 + 类型 |

## verify

```text
$ npx tsc --noEmit → exit 0
```
