# REVIEW · v20-wave4（压缩路径）

| 维度 | 结论 | 依据 |
|---|---|---|
| 两词两义 | ✅ Team 有 `team_id`/配额/成员；Squad 无 team_id、无配额、成本归 leader Agent；两者无外键 | `models/teams.py` / `test_squads_own_no_assets` |
| 401/403/404 边界 | ✅ 非成员与非存在团队一律 404（不给探测空间）；成员但非 owner/admin → 403 | `test_non_member_is_404_but_admin_passes` / `test_non_member_404_and_member_200` |
| 归属模型 | ✅ 一个资产只属一个 team（多归属拒绝）；`owner_id` 不动（零回填、可回滚）；转让需是资产主人 | `test_cannot_claim_others_or_cross_team` |
| 配额 | ✅ 成员数、Agent 数、工作流数三处硬上限；token 配额只存值（用量归集属 P1-6） | `test_member_lifecycle_and_quota` / `test_agent_quota` |
| 归档语义 | ✅ 团队归档拒新增但不删资产；小队归档只停未来指派；leader 已归档 → 409 leader_bound | `test_status_gates_writes` / `test_archive_semantics` |
| 指派语义 | ✅ 「指派小队」不派给成员，而是给 leader 建 leader 任务（去重），任务负责人位 = squad | `test_assign_creates_leader_task_and_dedupes` |
| 迁移安全 | ✅ 只 expand；五类资产两列可空/有默认；老库存量零回填；裸库与半截 schema 不再炸索引 | 迁移实测 + `test_migrations` 恢复绿 |
| 兼容性 | ⚠ 资产写接口（agents/tools/...）尚未接受 `team_id` 参数——归属只能走团队资产端点，避免五处路由同时改；列表端点也未加 `team_id` 过滤（前端尚无用例） | 本文件「明确不做」 |
| 越权测试 | ✅ 路由层用真实登录会话（cookie）验证，不是 mock 身份 | `TestTeamRoutes` |
| 越界 | 无（`frontend/dist` 未提交） | `git status` |
