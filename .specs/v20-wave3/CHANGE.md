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

## P1-4（下一轮）

- `work_items` 单表：status（unstarted/started/done/closed 四类 + blocked）× triage_state 正交；assignee 三轨（member/agent/squad）；done 附证据。
- `work_item_runs` 连接表：任务 ↔ 运行（一次运行一条），失败可见。
- 收件箱三规则：① 值得打扰才 ping；② 读失败宁多发不漏发（不静默空列表）；③ 旧失败随任务推进自愈归档（判据=交还给人，blocked 例外）。
- 订阅只增不减：创建者 / 新负责人 / 评论者 / 被 @ / 自动化；退订只挡普通动静，@ 穿透。

## 明确不做（记账）

- 前端看板/收件箱页面：先落后端契约与状态机，界面按 §1.6.5 ⑨「先表与校验，再上界面」后续接。
- `work_items` 与 Team/Squad 的外键：波 4 建 Team/Squad 时再挂（本波 assignee 用 kind+id 字符串，不强绑）。
