# SUMMARY: v20-ui-collab — 任务看板 + 收件箱界面挂载

- **Change ID**: v20-ui-collab
- **Task ID**: T-01…T-04（按 change 归并，逐任务见 `TASK.md`）
- **完成时间**: 2026-10-24
- **AI 角色**: Dev
- **补记说明**: 4-dev 当时只落 CHANGE/TASK/TEST/REVIEW；本 SUMMARY 在收口前补齐（对应 S-align 增量 D4）

## 做了什么

波 3 的 `work_items` / `inbox_items` 与 `/api/tasks`、`/api/inbox` 早在跑，但前端一个页面都没有（`grep -rln "api/tasks\|api/inbox" frontend/src` = 0）。
本次新增 `stores/collab.ts` + `pages/Tasks.tsx` + `pages/Inbox.tsx`，并在 `App.tsx` 挂「任务」「收件箱」两个一级入口：

- **任务页**：四列看板（未开始/进行中/待验收/已完成）、新建任务（标题 + 三轨负责人 + 优先级）、状态推进按钮（**合法性由后端状态机判定**，400 文案原样透传）、指派面板、triage 徽章、done 缺证据警告。
- **收件箱页**：两组（需我处理 / 其余）、未读计数、单条标读/归档（只动指针）、全部标读 / 归档已读。
- **顺带修根因 bug**：`requestDedup` 缓存键缺 method → `POST /api/tasks` 在 5s 内命中 `GET` 缓存、**写请求根本没发出**；改为 `${method} ${url}` 且只有 GET 入缓存。记 L-005。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `frontend/src/stores/collab.ts` | 新增 | 任务/收件箱状态 + 动作；读写分离（`safeFetch` 读 / `dedupedFetch` 写） |
| `frontend/src/pages/Tasks.tsx` | 新增 | 四列看板 + 新建 + 状态推进 + 指派 |
| `frontend/src/pages/Inbox.tsx` | 新增 | 两组 + 单条/批量动作 |
| `frontend/src/App.tsx` | 修改 | NAV 两入口 + View 两值 + 渲染分支 + 初始路由 |
| `frontend/src/utils/requestDedup.ts` | 修改 | 缓存键带 method、只 GET 入缓存、失效清两种键 |
| `frontend/src/__tests__/collab-pages.test.tsx` | 新增 | 6 条用例 |

## verify 输出（必填 · 真实粘贴）

```text
$ cd frontend && npx tsc --noEmit
exit 0（无输出）

$ npx vitest run
 Test Files  7 passed (7)
      Tests  63 passed (63)          # 57 既有 + 6 新增

$ npx vitest run src/__tests__/collab-pages.test.tsx
 ✓ src/__tests__/collab-pages.test.tsx (6 tests) 792ms

$ npm run build
✓ built in 15.80s
```

## 6 维自查（摘要）

- **正确性**：状态机不复制、写后必刷新（用例断言 GET 次数增加）；缓存键修复有回归用例兜底。
- **边界**：空态/失败态都有文案；写失败显示后端 detail；未登录由既有 401 → reload 处理。
- **安全**：无新增对外输入面；越权仍然后端 404/403 决定，前端只呈现。
- **生命周期**：列表随筛选/挂载拉取，写动作后刷新；无定时器泄漏（Inbox/Tasks 无 interval）。
- **可读性**：与既有页面同构（内联样式 + CSS 变量 + zustand store）。
- **无障碍**：按钮有 `aria-label`/`title`/`aria-expanded`，表单控件有 label，状态用 `role=alert/status`；无拖拽专有路径。

## 已知接受 + 理由

- **无浏览器人工视觉验收**：本轮用 jsdom 断言 + `tsc` + `build`；像素与手感未人工点检（与 `v20-release/UAT` 同类缺口一致记录）。
- **无真实后端联调**：fetch 为路由式 mock，接口契约按 `routes/tasks_api.py`/`inbox_api.py` 字段对齐；401/403 跳转未在浏览器复验。
- **任务评论正文**：后端未落表（波 3 记账），界面不做评论线程。
