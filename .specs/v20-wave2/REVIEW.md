# REVIEW · v20-wave2（压缩路径）

| 维度 | 结论 | 依据 |
|---|---|---|
| 三处内存态清零 | ✅ 队列：进程内 `PriorityQueue` 与其 `_task_labels` 已删（连同 `engine/scheduler.py`）；限流：`_rate_limit_store` 与 `_login_failures` 已改库表；退避：`_backoff_state` 已改表 | `grep` 三个符号：只剩文档说明；`test_cluster_store` 覆盖 |
| 死代码处置 | ✅ 删掉的是**从未被写入**的队列（`route_to_agent` 只加计数器）；不做「保温」，因为保留假实现等于继续骗人 | `git show` diff：`engine/scheduler.py` 删除、`SchedulerService` 只剩 match/pick |
| 租约正确性 | ✅ 领取用条件更新（`WHERE status=queued OR lease_expired`），并发下只有一个成功；续租校验 owner；`requeue_expired` 兜底 | `test_claim_leases_once_only` / `test_heartbeat_only_by_owner` / `test_requeue_expired` |
| 至少一次语义 | ⚠ 任务可能被重复执行（租约到期后他人领取），这是设计选择（K8s Job 同款）；不改语义，靠 `attempts` 可见 | `models/scheduler_queue.py` 注释；`/queue` 暴露 attempts |
| 限流原子性 | ✅ 单条 `UPDATE ... CASE` 完成「同窗口 +1 / 换窗口重置」，并发首击走 `IntegrityError` 回滚后重试 | `cluster_store.consume` |
| 单例循环 | ✅ cron / watcher / reconcile 每轮先 `acquire_lease`，失败即待命并只打一次日志；租约 90s，到期自动接管 | 三处代码 + `test_single_holder_and_takeover_by_expiry` |
| 监控不重放 | ✅ 偏移落库；副本切换后从库里的行数继续，不会把旧记录再导一遍 | `test_offset_roundtrip_and_persistence` |
| 诚实边界 | ✅ `/cluster` 的 `process_local` 明写 OAuth state 与 nonce 缓存仍属进程内；README 同样写明 + 提示多机共享用 MySQL | `control_plane_api.cluster_status` / README |
| 迁移安全 | ✅ 只 expand；老表整表重建保数据；迁移账本保证只跑一次；`create_all` 建的新库跳过重建 | 迁移 007 实测（旧库/幂等） |
| 兼容性 | ⚠ `/api/control-plane/queue` 响应字段变了（`created_at → enqueued_at`，新增租约字段）——仓内消费者已同步（`SchedulerConfig` / `QueueTab` 已改）；外部消费者需知会 | `git diff frontend` |
| 越界 | 无：改动全在 T-01/T-02 清单内（`frontend/dist` 未提交） | `git status` |
