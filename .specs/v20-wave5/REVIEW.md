# REVIEW · v20-wave5（压缩路径）

| 维度 | 结论 | 依据 |
|---|---|---|
| 产生端优先 | ✅ 先修「表零写入」再谈导出：根/子 span 都真写，测试断言父子链与 trace_id | `test_tracer_writes_root_and_child_span` |
| 不冒充标准 | ✅ `trace_id` 明确注释为合成 ID，非 W3C traceparent；B/C 档不做并写原因 | 代码注释 + CHANGE「不做」 |
| 直读现表 | ✅ `/metrics` 无缓存、无第二套存储；聚合走 SQL group by | `routes/prom_metrics.py` |
| 端点门 | ✅ env 关 → 404（中间件层，连 401 都不给）；开 → 仍需身份 | `TestMetricsEndpointGate` |
| 412 语义 | ✅ RFC 7232：强 ETag、`*` 放行、未带头不拦（兼容旧客户端）；哈希用规范化 JSON | `TestEtag` |
| 账本同事务 | ✅ `append_change` 只 flush 不 commit，由业务与资源变更一起提交；generation = MAX+1 | `services/declarative.py` |
| 游标纪律 | ✅ 应用层 cursor；早于最早一行 → `event: resync`（410 等价）；不跟 Last-Event-ID | `test_expired_cursor_emits_resync` |
| conditions 语义 | ✅ 一资源一 `Ready`（唯一约束 + 覆盖更新），状态变化才改 `lastTransitionTime`；`observedGeneration` 区分「没处理」 | `test_conditions_observed_generation` |
| fail-closed | ✅ 未实现 tier 在启动与执行两处独立拒绝（不降级）；egress `*` 拒绝 | `TestStartupAndGate` |
| 诚实声明 | ✅ `egress_enforced` 对 inproc 返回 false——契约写明「没有围栏」，不假装 | `test_inproc_is_available_and_honest_about_egress` |
| 向后兼容 | ⚠ `/api/admin/workflow` PUT 现在若不匹配 `If-Match` 会 412：前端当前未带该头，故不拦；带错头才会被拒（预期行为） | 代码 + 前端未改 |
| 越界 | 无（`frontend/dist` 未提交） | `git status` |
