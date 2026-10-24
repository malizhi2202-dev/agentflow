# CHANGE · v20-wave2 —— 波 2 单副本事实固化（P0-9 + P1-7）

> 来源：`PRODUCT-DESIGN.html` v20 §1.6.0 波 2「单副本事实固化」+ §1.6.1 P0-9 + §1.6.2 P1-7
> 路由：**压缩路径**（0→3→4→6），AC 与最小设计写在本文件。
> 前置：波 1 已收口（提交 `129c33ec`，身份三连）；波 0 迁移账本可用（`init_db` 失败即抛）。

## 一句话

波 1 之后「谁在请求」是真的了，但「谁在跑、排了多少、退避到哪」还各自躺在某个进程的内存里：
重启清零、多开一个副本就各算各的。**本波把这三处（外加 runtime 监控偏移）搬进库，并给单例循环加数据库租约**，
让「多副本」从口号变成可验证的事实；仍属进程内的部分如实写进文档与界面。

## 本波两件

| # | 内容 | 验收 |
|---|---|---|
| P1-7 | 队列 / 限流 / 退避 / 监控偏移落库 + 任务租约与心跳 + 单例循环租约选主 | 三处内存态清零；多副本只有一个副本跑单例循环 |
| P0-9 | 「单副本」事实边界书面化（文档 + 界面 + 只读接口） | 不在代码里口头承诺，界面能看见租约持有者与剩余进程内状态 |

## 最小需求与验收

| AC | 判据 |
|---|---|
| AC-2.1 | 任务队列**落库**：入队即持久，进程重启后仍在；同一 `task_id` 重复入队幂等 |
| AC-2.2 | 排位由行数直接算出（同 label 内优先级降序 + FIFO），不再维护会漂移的计数器 |
| AC-2.3 | 领取任务打**租约**（`lease_owner / lease_expires_at / heartbeat_at`）；并发领取同一任务只有一个成功 |
| AC-2.4 | 续租只允许持有者；非持有者续租返回 False |
| AC-2.5 | 租约到期未心跳 → 任务可被其他副本重新领取（attempts 递增），或由 `requeue_expired` 退回 queued |
| AC-2.6 | 队列深度/按 label 计数直接查行；`decrement_queue` 语义改为「把最早一条标完成」 |
| AC-2.7 | 控制面写操作（restart / reschedule / pause）限流 10 次/分钟，计数在库、多副本共享，超限 429 |
| AC-2.8 | 登录节流（5 败/15 分钟）同样落库；成功登录清计数 |
| AC-2.9 | 调和退避（1/2/4/8s、连续超 3 次暂停）状态在库；副本切换后读到同一份；成功即清零，可人工恢复 |
| AC-2.10 | `runtime.jsonl` 已读行数在库，副本切换不重放同一批记录 |
| AC-2.11 | 单例循环（cron / runtime watcher / reconcile）只有持租约的副本执行；租约到期后可被接管 |
| AC-2.12 | `GET /api/control-plane/cluster` 只读暴露：实例 id、部署模式、租约持有者、队列深度、仍属进程内的状态 |
| AC-2.13 | 前端「Agent 管控」页顶部呈现上述事实（不是只写进 README） |

## 最小设计与触碰模块

- **删死代码**：`engine/scheduler.py`（进程内 `PriorityQueue`，生产路径从未入队）+ `SchedulerService` 的队列方法 + `orchestration_api` 里未使用的 `scheduler` 导入。队列由 `cluster_store` 落库持有。
- 新 `backend/models/cluster.py`：`RateLimitWindow` / `ReconcileState` / `ClusterLease` / `WatcherOffset`。
- 重写 `backend/models/scheduler_queue.py`：加 `label / domain_id / lease_* / heartbeat_at / attempts / finished_at`，`agent_id` 改可空（入队时只知能力标签）。
- 新 `backend/services/cluster_store.py`：队列（enqueue/position/count/claim/heartbeat/finish/complete_oldest/requeue_expired/stats）、限流（consume/hits/reset）、退避（should_backoff/record_*/resume）、租约（acquire/release/list）、监控偏移（get/set）。时间参数可注入，便于确定性测试。
- `backend/migrations.py`：迁移 007 —— 老库整表重建 `scheduler_queue`（SQLite/MySQL 各自 DDL 与占位符）+ 四张新表；幂等（迁移账本只跑一次，`create_all` 建出的新库跳过重建）。
- `k8s_routing_service`：计数器 → 队列行（排队返回 `task_id` 与真实排位）；`decrement_queue` → `complete_oldest`。
- `control_plane_api`：限流改库表并接到三个写操作；`/queue` 读活跃队列（含租约）；新增 `/cluster`。
- `session_service`：登录节流改库表（去掉进程内 dict 与锁）。
- `runtime_watcher`：`_watched` → `runtime_watcher_offsets`，循环受租约保护（待命有日志）。
- `main._cron_scheduler_loop` / `engine/reconcile_loop`：每轮先 `acquire_lease`，拿不到即待命；reconcile 退避改 `cluster_store`。
- `config.py`：`INSTANCE_ID` / `CLUSTER_LEASE_TTL_SECONDS` / `QUEUE_LEASE_SECONDS`；`README.md` 补「副本与单例循环」一节与三项 env。
- 前端：`stores/controlPlane.ts` 新增 `ClusterStatus` + `fetchCluster`；`AgentControlPlane.tsx` 顶部集群条 + 队列表改新字段；`SchedulerConfig.tsx` 适配新队列形状。

## 明确不做（记账）

- `scheduling_queue`（编排实例队列）与 `scheduler_queue` 并表 = **P1-16**，随波 3 协作层一起做（本波先把 agent 任务队列做对）。
- OAuth 授权 state / 非重放缓存仍属进程内：多副本下回调需落同一副本，已写入 `/cluster` 的 `process_local` 与 README。
- `users.json` → MySQL 表化（裁定⑦）不在本波。
