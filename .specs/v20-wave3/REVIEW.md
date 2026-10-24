# REVIEW · v20-wave3（P1-16 部分）

| 维度 | 结论 | 依据 |
|---|---|---|
| 告警不再丢 | ✅ 写 `alerts` 表；`acknowledged_by/at` 记录确认人与时间；不做环形裁剪 | `test_add_and_list` / `test_ack_single_and_all` |
| 去重口径 | ✅ 查库去重（type+entity 未确认），多副本同一份数据 | `test_detection_dedupes_against_db` |
| 并表正确 | ✅ 六种旧状态全部有映射且落在新状态词内；`instance_id/priority` 保留；链接任务与实例 | `TestQueueMergeMigration` |
| 只剩一张队列表 | ✅ 编排队列/深度端点改读 `scheduler_queue` + `kind` 过滤；`SchedulingQueue` 模型删除（`grep` 0 命中） | `orchestration_api` / `metrics_api` |
| 迁移安全 | ✅ 先判存在再搬再删；`create_table_if_missing` 兜裸库；幂等重跑 `[]` | 迁移 008 |
| 兼容性 | ⚠ `/api/orchestration/queue/list` 的状态词由 `scheduled/executing` 变为 `queued/leased`（前端 OrchestrationPage 未消费该字段）；`/api/metrics/.../queue/depth` 口径=仅 queued | `git diff` |
| 越界 | 无（`frontend/dist` 未提交） | `git status` |
