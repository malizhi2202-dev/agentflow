# CHANGE · v26 Agent 详情/创建 tab 化

## 起因（用户原话 · 2026-10-26）

> 「左边的 agent 详情不用了，因为在左侧的 agent 点击也是进入 agent 详情。创建 agent 和点击 agent 进入 agent 的详情页的 UI 需要重新设计下：现在是平铺直序到一个超级大页面上，也没把哪些功能可以聚合在一起，用一个大 tab 点击展示进入，拉了一个超级长页面很乱。」

追加纪律（同日消息）：「修改完毕没重新部署启动吧，目前在 systemctl 管理了」——每批改完必须确认 `systemctl --user` 三件在位并实测 5173，不许只凭单测绿报「部署好了」。

## 三条裁定（AskUserQuestion 2026-10-26）

1. **移除范围 = 仅侧栏「Agent 详情」导航项**（列表卡片保持现状）；`pages/AgentDetailPage.tsx` 随删（其 onSave 本是 no-op）。
2. **详情顶层六标签**：概览 / 工作 / 能力(5 子栏) / 设置(7 子栏) / 记忆 / 对话——监控并入概览；记忆/对话为既有真功能保留，登记为实现-原型差异（RULINGS §五点六 R26-2，带退役条件）。
3. **创建态与详情同骨架 tab 化**：`TOP_TABS_CREATE=[能力,设置]`，默认落含两项必填（名称+运行时）的「设置·通用」；探活/危险区创建态不渲（主档 §6.4 口径）。

## 改动面

| 文件 | 说明 |
|---|---|
| `frontend/src/components/agent-detail/panes.ts` | **新增 · 唯一事实源**：顶层栏/子栏/分区映射（5+7）、创建态裁剪、默认栏常量 |
| `frontend/src/components/agent-config/useAgentDraft.ts` | **新增**：草稿容器提壳层（envRows/cliArgs/mcpText + commit 一次 PUT + dirty 粗记号）——CFG-06 命门 |
| `frontend/src/components/agent-detail/{OverviewPane,WorkPane,MemoryPane,ChatPane}.tsx` | **新增**：概览=只读工作台（sessions 代替口径表 + EntityBreakdownPanel 监控并入 + 只读卡群「去编辑▸」）；工作=tasks?assignee + 定时任务；记忆/对话自旧壳搬家 |
| `frontend/src/components/agent-config/AgentConfigEditor.tsx` | **重写**为草稿渲染面：二级 SubTabBar + sticky 保存条；分区子集按 paneId 渲 |
| `frontend/src/pages/AgentDetail.tsx` | **重写**为六栏壳；`App.tsx` 删侧栏项/View 成员/case/import；**删** `pages/AgentDetailPage.tsx` |
| `frontend/src/components/agent-config/Section.tsx` | AnchorBar（分区直达）**退场**；meta.ts SECTIONS 与 secN 锚点 id 保留 |
| `frontend/src/stores/collab.ts` | `fetchTasks` 补 `assigneeId` 透传；新增 `fetchTasksForAgent`（不写全局 tasks） |
| `frontend/src/styles/tokens.css` | 新增 `.tab-bar.sub` 紧凑档 |
| 测试 | CFG 整篇改造（跨栏草稿存活回归）+ AS/AG 切栏前置 + nav-groups 锁 + ui-parity-pages2 作废段 + **新增 AD-01~06**（`agent-detail-tabs.test.tsx`） |

**后端：零改动**（概览/工作所用端点全部实测存在）。原型 6 个 `agent-detail__*` 页与 parity 脚本本批 0 diff。

## 提交链（四笔 → 现实三笔，如实登记）

- `66aed2d5`（用户自提「修改前端页面」）= 计划**笔1+笔2** 全部代码与随行测试改造（18 files，范围与计划吻合；创建态代码与详情壳同文件交织，实际未能事后拆分——诚实登记于此）。
- `68c54285` = 笔3 `test(v26)`：AD-01~06。
- 本笔 = 笔4 `docs(v26-agent-ui)`：RULINGS §五点六 · 主档两处〔v26 实现注〕· INDEX 三处 · STATE · 本工件目录。

## 验收门（值见 TEST.md）

tsc 0 · vitest 26 文件 265/265 · build ✓ · `proto_parity_check.py --strict` exit 0（agent-detail 落「映射存在但未接路由」提示位，不触红）· systemctl 三件 active + 5173/8000 均 200。**浏览器点击走查未做，留人工**（清单在 TEST.md）。

## 明确不做

不引入 react-router / pushState 深链（「视图即链接」R3-1 在覆盖态仍是欠账）；不动原型与 parity 脚本；不迁记忆/对话进概览；差异清单不造假数据；不改后端。
