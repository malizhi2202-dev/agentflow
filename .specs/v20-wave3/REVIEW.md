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

## P1-4 协作层 · 复核

| 维度 | 结论 | 依据 |
|---|---|---|
| 门禁位置 | ✅ 状态白名单在 `collab_service.TRANSITIONS`（服务层），路由只是调用方；不是「提示词里写一句」 | `test_status_machine_rejects_illegal` |
| 状态 × triage 正交 | ✅ 改状态不动 triage_state | `test_triage_is_orthogonal` |
| done 证据 | ✅ 建议层：不拦、但留 `warnings` + `evidence_warned`，界面/报表可见（符合裁定 R0-2） | `test_done_without_evidence_is_advisory` |
| 越权口径 | ✅ 非本人一律 404；收件箱条目越权同样 404（不给探测空间） | `test_foreign_task_is_404` / `test_ownership_and_batch_ops` |
| 三轨负责人 | ✅ member/agent/squad；agent 指派不产生成员收件箱污染 | `test_assign_agent_does_not_target_member_inbox` |
| 订阅语义 | ✅ 只增不减（不覆盖首次来源）；退订只挡普通动静，@ 穿透 | `test_mention_penetrates_unsubscribe` |
| 收件箱规则①②③ | ✅ 规则① action_required 分组计数；规则② 读库异常上抛（测试用坏 session 证明不被吞）；规则③ 交还给人时归档 `has_failure` 条目、blocked 例外 | `TestInboxRules` 五条 |
| 合并键副作用 | ⚠ 一任务一条 → 失败被后续事件覆盖后无法再被查到，因此新增 `has_failure` 列承载「这条曾是失败」；这是实现细节，但决定了规则③是否真的成立 | 测试先红后绿（`has_failure` 引入前 2 条失败） |
| 状态≠行为 | ✅ 进入 in_progress 不启动任何 Agent；指派不产生运行（只有 `record_run` 才记运行） | `collab_service` 注释与实现 |
| 未做 | ⚠ 任务评论正文暂不落表（只落订阅/通知），看板与收件箱前端页面未做——按 §1.6.5 ⑨「先表与校验，再上界面」 | 本文件「明确不做」 |
