# T-05 · 前端页面补齐（automations / runtimes / replay / board）—— 完成

- **Change**: v21-completion · 2026-10-24
- **结论**：新增 **自动化中心 / 运行时 / 回放** 三页（此前 0 个），并把「任务看板」口径核实为**已存在**
  （`pages/Tasks.tsx` 就是四列看板，非缺页）；三页各有用例，E2E 真点真落库。

## 逐项结果

| 原型页 | 现状 | 本次做了什么 | 证据 |
|---|---|---|---|
| `automations.html` | **缺** | 新页 `pages/Automations.tsx` + `stores/automations.ts` + 新后端聚合口 `GET /api/automations`（附 Agent 名，避免界面 N+1）；启停 `POST /{id}/toggle`（幂等取反）、删除 `DELETE /{id}`、创建仍走 `POST /api/agents/{id}/scheduled-tasks` | 后端 6 例（owner 隔离 / admin 全见 / 他人任务 404 不是 403 / toggle 落库 / 删除 / 未登录 401）+ 前端 5 例 |
| `runtimes.html` | **缺** | 新页 `pages/Runtimes.tsx` + `stores/runtimes.ts`：`/api/runtime/summary`、`/stats`、`/sessions` 三读 + 失败会话重试（唯一写操作） | 前端 3 例（指标+会话渲染 / 失败重试打对端点 / 空态文案） |
| `replay*.html` | **缺** | 新页 `pages/Replay.tsx` + `stores/replay.ts`：左任务列表（复用协作层 tasks）+ 右运行时间线（`/api/tasks/{id}/runs`）；只读，不回滚不重跑 | 前端 3 例（空任务 / 时间线渲染 / 无记录空态） |
| `board*.html` | **已有** | 未重复造页：`pages/Tasks.tsx` 已是 4 列看板（`COLUMNS` = 未开始/进行中/待验收/已完成），含建单、状态推进、分诊、指派 | 既有 E2E「任务：建单 → 推进到待做」+ 本轮 3.0 复跑仍绿 |

页面可达性（导航 + 权限）：三页都进 `NAV`（自动化 / 运行时 / 回放），走 `perm('project:read')`，无权限落 `EmptyPerm`。

## 实测证据

```text
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests
Ran 488 tests in 123.862s            （T-04 基线 482 → +6 自动化 API）
OK (skipped=6)

$ cd frontend && npx tsc --noEmit && npx vitest run
Test Files 11 passed (11)            （T-04 基线 10 文件 93 例 → +1 文件 11 例）
Tests 104 passed (104)

$ E2E_CLI=dsh bash scripts/e2e/run_e2e.sh
SUMMARY 16/16 passed                 （T-04 基线 13 条 → +3 条新页）
PASS 自动化：新建定时任务（真落库）
PASS 运行时：页面可达（summary/sessions）
PASS 回放：选任务看运行时间线
```

新页截图：`/tmp/e2e-mysql/shots/{automations,runtimes,replay}.png`（E2E 自动截）。

## 过程中修的问题

- **E2E 选择器过宽**：`getByLabel('Agent')` 命中导航「Agent」等 3 个元素（strict mode 直接报错）。
  改成按 id 定位 `#auto-agent`——测试选择器要和实现的稳定标识对齐，别依赖可能重名的可达名。
- **假绿风险**：新建任务的用例原本 mock 的 `GET /api/agents` 返回空数组，下拉无选项 →
  `selectOption('7')` 静默不生效，断言落在「请选择 Agent」上。修 mock 给真实选项，才真正测到 cron 校验。

## 口径说明（避免夸大）

- runtimes 页只覆盖**运行时发现/会话**这一维；「执行隔离档位」「进程内 provider」是另两词，
  仍分别在 Agent 详情与管控页呈现（三词分立口径见 RULINGS）。
- 回放页是**任务回放时间线**，不含「重新执行」；重跑入口在任务卡与运行时页。
