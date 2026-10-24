# P3-3 · 任务看板（原型 6.20 `board.html` + 变体）— 变体态与「完成需证据」警告式门

- **状态**：✅ 已实现（后端 10 例 + 前端 8 例；`tsc --noEmit` 0；既有 `test_collab` / `test_t08_items` / `collab-pages` 仍绿）
- **实现**：
  - `frontend/src/pages/Tasks.tsx`（页面：两轴说明 / 受理门未接入标注 / 视图过滤 / 四列）
  - `frontend/src/components/task/`（新建：`axis.ts` / `BoardFilters.tsx` / `AssigneePicker.tsx` / `MarkDoneForm.tsx` / `NewTaskForm.tsx` / `TaskCard.tsx`）
  - `frontend/src/stores/collab.ts`（**仅**扩 `fetchTasks` 的过滤入参，既有导出与签名不动）
  - `backend/services/collab_service.py`（**仅** `change_status` 相关一处 + 小工具 `has_evidence` / 常量 `EVIDENCE_WARNING`）
  - `frontend/src/__tests__/board-variants.test.tsx`、`backend/tests/test_board_evidence.py`

## 口径逐条落点

| 原型口径 | 落点 | 判定方式 |
|---|---|---|
| 状态四类生命周期 ×「待受理」**正交** | 卡片两颗 chip：「状态 · 进行中 `(started)`」+「受理 · 待受理」；页首 page-note 明写两轴各答什么；改状态不动 triage | 后端用例 `test_status_change_does_not_touch_triage`；前端例断言两 chip 同时可见 |
| **状态标签不授予行为** | 页首 page-note 原文一句 + 每列列头注（进行中列：「进入『进行中』≠ 自动启动 Agent」）；卡片按钮 title 逐条写「不会启动任何 Agent」 | 前端例断言页面含「状态标签不授予行为」原句 |
| **受理门只拦自动推导，不拦人点名派发** | 页面 chip「受理门 · **后端未接入**」+ page-note 说明「后端没有派生执行入口」；**不造假门** | 后端用例锁「未受理也允许人显式推状态」这一半（防止将来加门误拦） |
| **完成需证据 = 警告式** | `change_status(new_status='done')`：证据为空 → 仍完成，返回 `evidence_warned=true` + `evidence_warning` 中文文案 + `warnings=["done_without_evidence"]`；证据齐 → 不发警告并清掉旧 `evidence_warned` | 后端 4 例（无证据 / 有证据 / 空壳证据 / 复用已存证据）；**不做硬性 400** |
| 缺证据推收件箱（可选链路） | `event_type=evidence_missing`、`action_required=1`、正文 = 警告文案；发给负责人/订阅人（自己的动作不进自己的箱） | 后端例 `test_done_without_evidence_pushes_inbox_reminder` |
| done 列：有证据 → 证据 chip；无证据 → 「缺证据」警告 chip | `TaskCard` done 分支：`证据 · label · ref` / `缺证据` + 「补证据 + 请同伴复核」 | 前端例 `done 列证据 chip` |
| 变体 `board__task-new` | `NewTaskForm`：标题必填（chip 标「必填」）、其余可空并逐项注明；三轨负责人；「创建 ≠ 派单」+ 停车闸说明 | 前端例（在 `collab-pages` 既有创建流上不回归） |
| 变体 `board__mark-done` | `MarkDoneForm`：证据 3 行（label + ref）、「确认完成」/「无证据提交（记为可疑完成）」；空证据也提交 | 前端 3 例（空证据 → 警告；有证据 → 两字段随请求发出；无证据按钮 → 不带 evidence 键） |
| 变体 `board__assign-*`（原型为 board.html `pp-assignee`） | `AssigneePicker`：人 / Agent / 小队三轨切换 + 每轨一句语义；小队轨写明「给 leader 入队，成员不抢单」；失败 detail 原样显示 | 前端 2 例（小队语义 + 请求体；`runtime offline` 透传） |
| 过滤变体（`board__af-109` / `af-116` 两侧能力） | `BoardFilters`：「需我处理」= `mine=true & triage_state=triaged`；「负责人含 Agent」= `assignee_kind=agent`；生效过滤逐条列出、逐条 ✕、可一键清空 | 前端例逐步核对请求 URL（含逐条清除与清空） |
| 小队指派 = leader 入队 | 后端路由原有分支不动，仅加断言防回归 | `test_squad_assign_is_still_leader_queueing`（leader_task.parent_id = 任务 id、去重不产生第二条） |
| 他人任务 404 | 路由 `_visible` 原有语义不动 | `test_others_task_is_404_for_status_and_read`（读与改都 404，且越权无副作用） |

## 实测（真实输出）

```text
$ cd backend && ENCRYPTION_KEY=test-key-for-ci-32bytes!! /home/malizhi/ai/agentflow-data/venv/bin/python -m unittest tests.test_board_evidence -v
Ran 10 tests in 17.436s
OK

$ cd backend && ... -m unittest tests.test_collab
Ran 23 tests in 35.624s
OK

$ cd backend && ... -m unittest tests.test_t08_items
Ran 11 tests in 43.620s
OK            （小队指派 leader 入队 / 去重 / 归档拒绝口径未变）

$ cd frontend && npx tsc --noEmit
（no output → 0 错）

$ cd frontend && npx vitest run src/__tests__/board-variants.test.tsx
Test Files  1 passed (1)
     Tests  8 passed (8)

$ cd frontend && npx vitest run src/__tests__/collab-pages.test.tsx
Test Files  1 passed (1)
     Tests  6 passed (6)

$ python3 scripts/proto_parity_check.py | grep -E "board|页族"
board                5  tasks           页面  ✓   ✓
（原型 127 页 / 35 页族；缺失页族 0；部分实现 0）
```

> 台账说明：`TASK.md` / `STATUS.md` 与 `automations` / `control-plane` / `knowledge` 等并行会话共用，
> 本轮**不并发写**它们；P3 行与「本轮验证」块留给收口方按上面的原始输出追加。

## 后端缺口（如实标注，未造假入口）

| 缺口 | 证据 | 界面表现 |
|---|---|---|
| **受理门未接入** | 全仓无「自动推导执行者」的派单入口：`grep create_item(` 只有 `routes/tasks_api.py` 一处（人工触发）；`automation_service` 只校验 `exec_mode` 取值（`create_issue` / `run_only`），没有任何执行器真的去建/派 work_item | 页面 chip「受理门 · 后端未接入」+ page-note 说明；不渲染假的拦截提示 |
| **复核人（reviewer）字段未接入** | `work_item` 表无 reviewer 列（`models/collab.py`），done 只有 `evidence_json` + `evidence_warned` | 「标记完成」表单里写「复核人：后端未接入」；过滤「需我处理」按「我建的 / 派给我的」推导，并在 title 里注明 |
| **未解决清单 / 证据条数硬上限未接入** | 同上，无字段 | 未渲染（不造空列表） |
| 详情整页（子任务表 / 评论流 / run 历史 / 指派⟂@提及界分表） | 属 6.20 详情页（`board__af-109` 整页），需要评论表与 run 关联表在列表上可读 | 本 change 不做，`run` 仍只有 `GET /api/tasks/{id}/runs` |

## 偏差（与任务书字面不一致处，按原型实况修正）

1. **原型没有 `board__assign-*.html`**：指派三轨的选择器本体是 `board.html` 的 `pp-assignee` pop + `md-assign-confirm` 确认层（`ls prototype | grep assign` 为空）。实现落在 `AssigneePicker`；**确认层「开始 / 先不开工」两决定没做**——它要建 run，而后端没有「运行请求」端点（`POST /runs` 只登记已发生的 run），做了就是假按钮。
2. **`board__af-109` / `board__af-116` 是任务详情整页，不是过滤变体**：过滤能力在 `board.html` 的「视图 = 筛选快照」卡（需我处理 / 我创建的 / Agent 在跑的 / 可疑完成）。任务书要求的两条过滤按此卡口径落地，未把两个详情页当过滤页做。
3. **`board.html` 里的归档区（`dr-arch`）、列详情抽屉（`dr-col-*`）、`pp-view` 的「我创建的 / Agent 在跑的 / 可疑完成」三条过滤**：未做（列详情抽屉与归档区依赖归档字段与列级统计，属下一轮；三条额外过滤是同一机制的加行，当前两条已证明机制可用）。
4. **列表视图 / 按阶段分组 / 自定义属性作分组维**：未做（原型为「看板 / 列表」切换，属 6.20 布局维，非本 change 口径）。

## 风险

- **收件箱合并键 = 任务本身**：缺证据完成会把该任务的收件箱行**重新浮出**，`event_type` 被覆盖成 `evidence_missing`、正文换成补证据提醒。这是「可疑完成推收件箱」的落地形态，但会盖掉该任务上一轮的 `run_failed` 文案（旧失败条目按规则③已归档，信息不丢，只在收件箱列表上被这一条顶掉）。用例 `test_done_without_evidence_pushes_inbox_reminder` 锁住这条语义。
- **`evidence_warned` 是「最近一次 done」的标记**：带证据完成会清 0；done → 重开 → 再 done 会重判。若将来要「历史缺证据」永久留痕，得加独立列/事件，而不是复用这个 flag。
- **过滤请求走 `safeFetch` 的 5s 缓存**：切回刚请求过的同一 URL 会命中缓存（不产生新请求）。真实场景里写操作会 `invalidateCache`，但「纯切换过滤回到全量」在 5s 内可能不刷新——前端用例为此显式 `invalidateCache()` 才观测到请求；若要求「切视图必定重打端点」，得给过滤请求加 `no-cache` 语义（本 change 未改，避免动 `requestDedup` 全局行为）。
