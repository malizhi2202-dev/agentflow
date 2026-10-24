# CHANGE · v20-wave3 —— 波 3 协作层最小集（P1-16 + P1-4）

> 来源：`PRODUCT-DESIGN.html` v20 §1.6.0 波 3 + §1.5.2 差距⑤ / §1.6.1 P1-16 / §1.6.2 P1-4
> 路由：**压缩路径**（0→3→4→6），逐 P1 提交：**先 P1-16（告警落表 + 并表），再 P1-4（任务 + 收件箱）**。
> 前置：波 1 身份（提交 `129c33ec`）、波 2 状态外置与租约（`09950db4`）。

## 一句话

代码里没有协作层：26 张表没有 `work_items` / `inbox`，`owner_id` 无双轨语义，告警只是进程内环形 500 条，
两张队列表各活各的。**本波先把「账」修对（告警落表、队列并表），再长出任务与收件箱**——
否则任务表建在假地基上。

## 施工序（设计档钉死）

1. **告警落表**（P1-16 前半）→ 2. **双队列并表**（P1-16 后半）→ 3. **任务单表 + 运行连接表**（P1-4）→ 4. **收件箱三规则**（P1-4 收尾）。

## P1-16（本轮完成）

| AC | 判据 |
|---|---|
| AC-3.1 | 告警写 `alerts` 表：重启不丢；`timestamp / acknowledged / acknowledged_at / acknowledged_by` 可查 |
| AC-3.2 | 去重查库（同 type + entity 的未确认告警不重复写），副本之间同一口径；确认后允许再记同一问题 |
| AC-3.3 | 确认记录操作人（`acknowledged_by`）；越界/不存在返回 false → API `error` 分支不变 |
| AC-3.4 | 双队列并表：`scheduling_queue` 存量行按状态映射搬进 `scheduler_queue`（`kind='orchestration_instance'`），旧表删除 |
| AC-3.5 | 状态映射：`queued/scheduled→queued`、`executing→leased`、`completed→done`、`evicted/failed→failed` |
| AC-3.6 | 并表后编排实例队列与 agent 任务队列只有一张表、一套状态词；`/api/orchestration/queue/list`、`/api/metrics/orchestration/queue/depth` 读同一张表 |
| AC-3.7 | 迁移幂等：老库搬完即删表；新库/裸库自动建出 `scheduler_queue` 与 `alerts` |

## P1-4（本轮完成）

| AC | 判据 |
|---|---|
| AC-3.8 | `work_items` 单表：`status` 四类（unstarted/started/done/closed）+ `blocked`；`triage_state` 与 status **正交**（改状态不动 triage） |
| AC-3.9 | 状态机在**状态转换层**校验：白名单外一律 400；终态（cancelled）不可复活；同状态重复提交是 no-op |
| AC-3.10 | 老板 / 负责人 / 管理员以外的人看任务一律 **404**（不泄露存在性，不用 403 探测） |
| AC-3.11 | `done` 需证据是**建议层**（R0-2）：无证据也能 done，但返回 `warnings=["done_without_evidence"]` 且 `evidence_warned=1` |
| AC-3.12 | 负责人三轨 `member/agent/squad`：给了 id 必须给 kind；`agent`/`squad` 不产生成员收件箱 |
| AC-3.13 | `work_item_runs` 连接表：一次运行一条（queued/running/succeeded/failed），失败升格为需决策收件箱条目 |
| AC-3.14 | 订阅只增不减（创建者/负责人/评论者/被 @）；**退订只挡普通动静，@ 永远穿透** |
| AC-3.15 | 收件箱规则①：只有 `action_required` 的事件进「需我处理」并计数；普通状态变化进折叠组 |
| AC-3.16 | 规则②：读库异常向外抛（不 catch 成空列表）——漏发比多发更糟 |
| AC-3.17 | 规则③：任务进 in_review / done / cancelled 时批量归档该任务的历史失败通知；**blocked 显式例外** |
| AC-3.18 | 合并键 = 任务：同一任务的多次动静合并为一条（`merged_count`），新的需决策事件会清已读/归档重新浮出 |
| AC-3.19 | 自己的动作不进自己的收件箱；越权操作他人条目统一 404 |
| AC-3.20 | API：`/api/tasks`（CRUD/status/assign/triage/comment/runs/subscribe）+ `/api/inbox`（list/count/read/read-all/archive/archive-read） |

### 最小设计与触碰模块（P1-4）

- 新 `backend/models/collab.py`：`WorkItem` / `WorkItemRun` / `WorkItemSubscription` / `InboxItem`，含 `STATUS_CATEGORY` 与 `HANDED_BACK_TO_HUMAN` 两个常量事实源。
- 新 `backend/services/collab_service.py`：`TRANSITIONS` 白名单、`change_status`、`assign`、`add_comment`、`record_run`、`subscribe/unsubscribe`、`notify`（关系优先级 mentioned > responsible > subscribed）、`archive_failures`（规则③）、`inbox_for/mark_read/...`。
- 新 `backend/routes/tasks_api.py` / `backend/routes/inbox_api.py`；`main.py` 注册。
- 迁移 009：四张表 + 索引 + `UNIQUE(user_id, work_item_id)`（合并键）。
- 合并键的坑：同一任务一条记录会被后续普通事件覆盖 `event_type`，因此失败单独记 `has_failure` 列——否则规则③永远归档不到（测试先红后绿）。

## 明确不做（记账）

- 前端看板/收件箱页面：先落后端契约与状态机，界面按 §1.6.5 ⑨「先表与校验，再上界面」后续接。
- `work_items` 与 Team/Squad 的外键：波 4 建 Team/Squad 时再挂（本波 assignee 用 kind+id 字符串，不强绑）。
