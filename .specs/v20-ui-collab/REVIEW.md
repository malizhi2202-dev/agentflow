# REVIEW · v20-ui-collab（压缩路径 · 功能轮 + 回归登记）

| 维度 | 结论 | 依据 |
|---|---|---|
| 状态机不复制判定 | ✅ 前端只镜像 `NEXT_STATUS` 生成按钮；合法性由后端 `collab_service.TRANSITIONS` 判定，400 文案原样透传 | `stores/collab.ts` 头注 + `非法状态转移` 用例 |
| 写后读一致 | ✅ 每个写动作成功即 `fetchTasks()` / `fetchInbox()`；`writeJson` 内 `invalidateCache()` 兜底 | 两条用例断言 GET 次数 > 1 |
| 与 AC 对齐 | ✅ AC-8.1…8.9 逐条有落点（见 CHANGE 验收表） | 工件 + 用例名 |
| 错误不吞 | ✅ 读失败 → `tasksError/inboxError` 横幅；写失败 → 卡片内 `role="alert"`；`safeFetch` 与 `writeJson` 分工写明 | 代码 + 用例 |
| 收件箱语义 | ✅ 两组按后端 `action_required && !read` 口径呈现；标读/归档只动指针，标题与 body 明示「只动指针」 | 组件 title 文案 |
| 无障碍（基础） | ✅ 交互按钮有 `aria-label`/`title`/`aria-expanded`；表单控件有 label；状态变化用 `role="alert"`/`role="status"`；纯按钮可键盘操作（无拖拽专有路径） | 组件源码 |
| 依赖 | ✅ 零新增依赖（图标沿用 `lucide-react`，状态沿用 `zustand`） | `package.json` 未改 |
| 样式 | ✅ 只用既有 CSS 变量（`--bg-panel/--border/--r-sm/--red/--orange/--blue`），无新 token | 内联样式 |
| 顺带修的根因 bug | ✅ `requestDedup` 缓存键缺 method → 写命中读缓存（见 TEST §3）；一处修好，所有走 `dedupedFetch` 的写路径同受益 | `utils/requestDedup.ts` diff |
| 越界 | 无：只碰 `frontend/src/{App.tsx, pages/Tasks.tsx, pages/Inbox.tsx, stores/collab.ts, utils/requestDedup.ts, __tests__/collab-pages.test.tsx}` | `git diff --name-only` |

## 遗留（不假装完成）

1. **人工视觉验收未做**（无头浏览器/截图未接），只做了 jsdom 断言 + `tsc` + `build`。
2. **真实后端联调未做**：mock 契约与后端逐字段对齐，但 401/403 跳转、分页在真实链路上未复验。
3. **任务详情/评论**：后端评论正文未落表（波 3 已记账），界面只做字段与状态。
4. **团队/小队/记忆中心/提案抽屉**：留给后续 change（一次一个面，避免五个半成品）。
