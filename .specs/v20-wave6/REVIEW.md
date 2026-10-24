# REVIEW · v20-wave6（压缩路径）

| 维度 | 结论 | 依据 |
|---|---|---|
| 门禁位置 | ✅ 晋升/发布/可改面/熔断全在 `rsi_service`（服务层），路由只映射 400/403/409 | 代码 + 18 用例 |
| 缺一不入库 | ✅ 三字段任一为空 → `no_entry` 且 `stored=false`；行仍留档（可解释「这次为什么没学」） | `test_three_fields_required_else_no_entry` |
| confounded 默认 | ✅ `confounded=None` → True；弱证据强制 True；只有显式有把握才 promoted | 两条用例 |
| Probe 不作发布依据 | ✅ `publish` 只接受 `awaiting_approval`；`probed` 直接 409 | `test_probe_is_weak_evidence_and_never_publishes` |
| 影子门 | ✅ 金标未冻结 / 非异厂 judge 都拒绝；通过才进 `awaiting_approval` | `test_shadow_requires_frozen_golden_and_cross_vendor` |
| 噪声地板 | ✅ delta < 0.01 判 `collapsed` 并打开塌缩熔断 | `test_below_noise_floor_collapses` |
| 人批 | ✅ 非管理员发布 409（不是 400）；记录 approver 与时间 | `test_human_approval_required_and_flow` |
| INV⟂DOM | ✅ domain 维度需会签；会签人可多个（append） | `test_domain_dimension_needs_signoff` |
| 禁改面 | ✅ 永久前缀先判（先于白名单）；代码层禁止；路径穿越拒绝 | `TestSurfaceGate` |
| 熔断 | ✅ 四类齐；任一 open 拒绝新建；复位到 half_open 而非 closed | `test_probe_budget...` / `test_breakers_reset_to_half_open` |
| 与波 5 的关系 | ✅ 提案不直接 Apply：发布只标 `published` 并留 approver，真正落地走既有 Apply 路径（三权分离的「发布」一格） | 服务注释 |
| 未做 | ⚠ 金标本体/影子执行器/judge 调用/前端页面——本波只做治理契约与门禁（设计允许：先表与校验） | CHANGE「不做」 |
| 越界 | 无（`frontend/dist` 未提交） | `git status` |
