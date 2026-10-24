# SUMMARY: T03 — 小隊 tab（列表 / 建队 / 成员混编 / 归档）

- **Change ID**: v20-ui-teams · **Task ID**: T03 · **完成时间**: 2026-10-24
- **AI 角色**: Dev

## 做了什么

`pages/Teams.tsx` 的第二个 tab：小隊列表（名称 / slug / 状态 / leader / 成员数）+ 每队一张卡内联操作（成员池增删、归档）。
口径落实：

- **成员池入池不授予调用权**：卡片内明写「入池不授予调用权」（主档 §2.11）。
- **归档语义如实**：按钮文案是「归档小队 / 确认归档（只停未来指派）」，界面**不出现**「将会取消在跑运行」（R8-4 纠偏）。
- **`leader_bound` 透传**：后端 409「leader Agent 已归档…」原样显示。
- **归档不传 reason**：后端 `archive_squad` 不收原因，store 已对齐（见 T01）。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `frontend/src/pages/Teams.tsx` | 修改 | 追加小隊 tab（与团队 tab 同文件） |

## verify 输出

```text
$ cd frontend && npx vitest run src/__tests__/teams-page.test.tsx
 Tests  11 passed (11)          # 含小隊两条：列表+归档 409、建队+刷新
```

## 已知接受 + 理由

- 小隊详情没有独立抽屉（卡片内联）——成员量级小（leader + 几个混编），抽屉反而增加点击数。
- 归档二次确认只做"按钮二次点击"（无原因输入框，因为后端不接收原因）。
