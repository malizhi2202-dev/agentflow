# SUMMARY: T02 — 团队 tab（列表 / 建团 / 状态 / 成员 / 转让 / 资产配额）

- **Change ID**: v20-ui-teams · **Task ID**: T02 · **完成时间**: 2026-10-24
- **AI 角色**: Dev

## 做了什么

`pages/Teams.tsx` 的团队 tab：左列表卡片（名称 / slug / 状态 chip / 成员数）+ 右侧抽屉（摘要 / 成员 / 资产与配额 / 危险区）。
关键实现口径：

- **非成员不可见**：只渲染后端返回项，不出现"存在但无权"提示（D5）。
- **我的角色**：`GET /api/teams` 不返回角色 → 从详情 `members` 里取 `user_id == 当前用户` 那条，只在抽屉摘要显示（已回写 REQUIREMENT AC-2）。
- **archived 的禁用要给原因**：加成员 / 挂资产 `disabled` + `title="团队已归档：只停未来指派与变更"`。
- **不可逆动作二次确认**：归档按钮第一次点击变"确认归档（不可恢复）"，转让 owner 必须勾选确认。
- **资产挂载用 kind 下拉 + id 手填**，并写 `shortcut:` 注释说明候选选择器待后端 unclaimed 列表。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `frontend/src/pages/Teams.tsx` | 新增 | 团队 tab（本任务只落团队部分） |

## verify 输出

```text
$ cd frontend && npx vitest run src/__tests__/teams-page.test.tsx
 Test Files  1 passed (1)
      Tests  10 passed (10)      # 与 T03/T04 合批
```

## 已知接受 + 理由

- 抽屉里成员列表用 `<table>` 而非卡片墙（密度优先，成员是等长行）。
- **实现中发现并修掉的 bug**：资产释放曾对 `agents`/`workflows` 混排统一传 `kind='agents'`（工作流会被按 Agent 释放）；已改为五类平铺、各自带 `kind`，并补回归用例锁死（accepted: 五类都有释放入口，不再只做两类）。
