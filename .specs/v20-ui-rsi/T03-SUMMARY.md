# SUMMARY: T03 — 提案 tab

- **Change ID**: v20-ui-rsi · **Task ID**: T03

## 做了什么

提案 tab：列表（状态/维度/预算/已用）、新建表单（surface 下拉 + 限额）、按状态裁剪的动作
（generated→探针、probed→影子、awaiting_approval→会签/发布）、终态说明（collapsed/blocked/published）。
发布：非管理员置灰 + title 原因 + 二次确认（DESIGN D3 的例外，与"前端零授权判断"不同，已写明理由）。

**实现中修掉 1 个自造 bug**：`surfaces` 只在提案卡的动作区拉取 → 列表为空时新建表单的可改面下拉是空的、
创建按钮永远禁用；已提到 tab 级拉取（用例抓到）。

## verify

```text
$ npx vitest run src/__tests__/memory-page.test.tsx → 12 passed
```
