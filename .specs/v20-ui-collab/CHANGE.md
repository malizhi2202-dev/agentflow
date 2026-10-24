# CHANGE · v20-ui-collab —— 任务与收件箱界面挂载（波 3 的表，第一次上界面）

> 来源：`STATE.md` 下一步 9①「前端界面挂载」；主档 §6.20（任务域 / 通知域）· §6.0 ⑫（统一详情骨架）；
> 路由：**压缩路径**（0→3→4→6）。
> 前置：波 3 已落地 `work_items` / `work_item_runs` / `inbox_items` 与 `/api/tasks`、`/api/inbox`（`67420190`）；
> `STATE.md` 与 `v20-release/UAT.md` 均如实记着「界面未挂载」。

## 一句话

三条协作 API 已经在跑，但前端**一个页面都没有**（`grep -rln "api/tasks\|api/inbox" frontend/src` = 0 命中）。
本 change 只做两件事：把**任务**与**收件箱**接上界面，别的入口（团队/小队/记忆/提案）留给后续 change。

## 验收

| AC | 判据 |
|---|---|
| AC-8.1 | 侧栏新增「任务」「收件箱」两个一级入口；未登录/无权限时不显示页面内容（走既有 `EmptyPerm` 口径） |
| AC-8.2 | 任务页按 **四列状态类别**（未开始 / 进行中 / 待验收 / 已完成）分组展示；卡片显示标题、负责人、triage 徽章、优先级、`done 缺证据` 警告 |
| AC-8.3 | 任务页可**新建任务**（标题 + 负责人三轨 + 优先级）；创建成功后列表刷新 |
| AC-8.4 | 状态推进只给**后端状态机的合法目标**（镜像 `collab_service.TRANSITIONS`）；非法转移以后端 400 文案为准（前端不静默吞错） |
| AC-8.5 | 收件箱分**两组**：需我处理（`action_required` 且未读）/ 其余；显示未读数与总数 |
| AC-8.6 | 收件箱可单条**标读**、**归档**，以及 `read-all` / `archive-read` 批量动作；动作后列表与计数刷新 |
| AC-8.7 | 所有请求走 `safeFetch`（去重 + 5s 缓存）；写操作后必须让缓存失效，避免「改了看不到」 |
| AC-8.8 | 空态/失败态有明确文案（不显示空白页，不吞错误） |
| AC-8.9 | 不引入新依赖；样式复用 `tokens.css` CSS 变量；新增用例 `vitest` 全绿、`tsc --noEmit` 0 错、`npm run build` 绿 |

## 最小设计

- 新 `src/stores/collab.ts`：任务/收件箱状态 + 动作（`fetchTasks` / `createTask` / `moveStatus` / `assign` / `triage` / `fetchInbox` / `readItem` / `archiveItem` / `readAll` / `archiveRead`），统一 `safeFetch` + `invalidateCache`。
- 新 `src/pages/Tasks.tsx`：四列看板 + 新建面板 + 卡片动作。**状态机权威在后端**，前端只镜像按钮文案（`shortcut:` 注释写明上限）。
- 新 `src/pages/Inbox.tsx`：两组列表 + 单条/批量动作。
- `src/App.tsx`：NAV 两项 + `View` 两值 + 渲染分支（`project:read` 权限）。
- 测试：`src/__tests__/collab-pages.test.tsx`（mock fetch：分组、新建、状态推进、坏状态错误提示、收件箱两组与批量动作）。

## 明确不做（记账）

- **团队 / 小队 / 记忆中心 / 提案抽屉**页面：本 change 不碰，留给后续 change（避免一次改五个面、每个都半成品）。
- 任务详情抽屉里的**评论线程**：后端评论正文未落表（波 3 已记账），界面只做任务字段与状态。
- 拖拽改状态：先按钮（可键盘操作），不引第三方 DnD 依赖。
