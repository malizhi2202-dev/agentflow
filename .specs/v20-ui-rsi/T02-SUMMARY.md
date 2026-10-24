# SUMMARY: T02 — 记忆 tab

- **Change ID**: v20-ui-rsi · **Task ID**: T02

## 做了什么

`pages/Memory.tsx` 记忆 tab：治理折叠区（四开关 + 四熔断 + 噪声地板）、写入表单（三字段 + confounded +
因果前缀 seq）、记忆列表（layer/status 筛选 + 状态/污染/confounded chip）、晋升评审台（按需拉）、
检疫（source_ref）、衰减队列（只列不删）。

**实现中修掉 2 个自造 bug**：
1. `WriteForm` 提交后用旧 `result` 覆盖刚算出的结论 →「no_entry」提示永远不显示（用例抓到）。
2. evidence 解析只支持 `{ref}`（`shortcut` 注释写明上限）。

## verify

```text
$ npx vitest run src/__tests__/memory-page.test.tsx → 12 passed
```
