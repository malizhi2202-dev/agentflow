# REVIEW · v20-wave7（压缩路径 · 功能轮 + 回归登记）

| 维度 | 结论 | 依据 |
|---|---|---|
| 白名单而非整行序列化 | ✅ 卡片字段逐个挑：`agent.to_dict()` 会带出遮蔽 key，所以不用它 | `services/agent_card.py` · `test_no_credentials_or_prompts_in_card` |
| 不冒充标准 | ✅ capabilities 三项 **false** + `maturity=M0` + note 明写 M2 冻结 | 同文件 · `test_m0_shape_and_frozen_capabilities` |
| 越权=不存在 | ✅ 非 owner 与不存在同 404，不给探测面 | `test_other_users_agent_is_404` |
| 状态转换层而非提示词 | ✅ 开关判定在 `assert_category_running`，被 `propose_memory` / `create_proposal` / `publish` 三处独立调用 | 服务层三处调用点 |
| 双入口校验 | ✅ 开关类目：服务层判一次 + 路由层再按 `RSI_CATEGORIES` 判一次 | `rsi_api.set_switch` |
| 「没有开关」= 禁改面 | ✅ 四类之外直接 GateError；代码层没有开关可开 | `test_non_whitelisted_category_has_no_switch` |
| 因果前缀方向 | ✅ 只拦 `cites_seq >= source_seq`（引用未来）；双方为 0 表示无任务上下文，不误伤 | `test_reference_to_future_task_is_rejected` |
| 防污染不是绊线崇拜 | ✅ 命中标记**强制 confounded**（不直接拒绝入库），并留 `pollution_flagged` + `post_ingest_scan` 双记录 | `test_golden_marker_forces_confounded_and_flags` |
| 评审账不丢失败样本 | ✅ `no_entry` 也落行（记统计不记失败），`fields_complete=false` + note 写缺哪几个字段 | `test_no_entry_still_writes_review` |
| 归因 fail-closed | ✅ 读不出人类 → 拒绝建任务/拒绝解析，不猜、不回退 admin、不拿 agent 顶人类 | `services/attribution.py` · 4 条拒绝用例 |
| 两列不混语义 | ✅ `creator_id` 保留原义，`originator_id` 只鉴权、`accountable_id` 只审计成本；代记账需管理员 | `test_member_cannot_record_accountability_for_others` |
| 存量零回填 | ✅ 老行两列空串，不拿 creator 顶替（历史未归因就是未归因） | `test_legacy_row_has_empty_attribution` |
| 破坏面 | ⚠ `create_item` 现在拒绝空 creator（原先不校验）：生产调用方只有 `routes/tasks_api.py:90`（传登录用户），其余调用点都在测试里 | `grep -rn "create_item(" backend` 实测 |
| 测试隔离 | ✅ 顺带修掉 `test_auth_sessions` 对「环境里恰好有已迁移库」的隐式依赖 | TEST.md §6 |
| 越界 | 无（未改 `frontend/`；`frontend/dist` 构建产物未提交） | `git status` |

## 遗留（如实记账，不假装完成）

1. **A2A M1/M2**：任务协商、流式、推通知仍冻结（R4-2 明写），本波只做发现面。
2. **影子重放执行器 / 金标本体 / judge 调用**：波 6 起就记为「治理契约已落地、执行器未做」，本波未改变该边界。
3. **域策略表**：归因的「域策略 fail-closed」目前实现为「显式传入或 =originator + 读不出即拒」；域策略**存储与读取**待域能力落地。
4. **L0 自动抽取器**：记忆四层里 L0（对话原文）仍由既有会话表承载，未做自动抽取原子记忆的作业。
