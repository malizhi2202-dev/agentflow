# P3-1 · 自动化中心 9 节（原型 6.31 / `automations.html`）

- **状态**：✅ 已实现（前端 18 例 + 后端 26 例 + E2E 入口）
- **实现**：`backend/models/automation.py`、`backend/services/automation_service.py`、`backend/routes/automations_api.py`、迁移 **020**（四表）、`frontend/src/pages/Automations.tsx`、`stores/automations.ts`

## 9 节逐条落点

| 原型节 | 实现 | 关键口径 |
|---|---|---|
| ① 清单 | 表列：名称 / 负责人轨 chip / 触发器摘要 / 执行模式 / 状态 / 近 7d 失败率 / 操作；页首四卡（总/启用/暂停/熔断） | 失败率**分母只算完结**（skipped 不计） |
| ② 三段构成 | Runbook（目标/背景/约束/步骤）、负责人（agent ⟂ squad 二轨不可混指）、触发器三块各存各的账，分别保存 | 保存一段不覆盖别段 |
| ③ schedule | 多 schedule 并存；cron 5 段校验（422 明确「无秒位」）；IANA 时区 + 非默认时区标注；Next runs 服务端算；**不预览不给保存** | `GET /{id}/triggers/preview` 服务端算 |
| ④ webhook | token 只显 `secret_preview`；Rotate 后旧 URL 立即失效；`idempotency-key`/`x-github-delivery` 去重；载荷上限 64KB（超限 413 并落投递记录）；事件过滤；**六步推断**返回 `inferred_at_step`；响应语义 200 ignored / 202 accepted / 4xx rejected | 每次投递都落账（跑没跑都记） |
| ⑤ 执行模式 | `create_issue ⟂ run_only`，取舍句写在下拉旁 | 见 `exec_mode` 两值 |
| ⑥ 两级账本 | 运行史（跑了什么）/ 投递记录（外面投了什么）两表 + 选中运行的**只读**回放（执行器未接入如实标注） | 空态写清「空」，不放 0 条假数据 |
| ⑦ 失败治理 | 三种后果各一句：自动熔断（止损非自愈）/ 手动暂停 / 归档（停未来触发、历史保留只读）；归档二次确认 | 三态均落审计 |
| ⑧ 权限两本账 | 「谁能管」（owner/admin）与「能不能真跑」（enabled + breaker）分开显示与判定 | 他人资源 404，不用 403 探测 |
| ⑨ 基线对照 | multica 口径（只有 schedule/webhook 两类触发器、多 schedule 并存）⟂ agentflow 自扩展，分行写 | 不混为一谈 |

## 实测

```text
$ backend: unittest tests.test_automations_v2
Ran 26 tests · OK            （三段落独立保存 / cron 校验+next_runs / webhook 幂等+超限+rotate+六步 / 门禁 / 两级账本 / 治理+审计 / 权限 / 404）

$ frontend: vitest run src/__tests__/automations-nine-sections.test.tsx
Tests 18 passed

$ 迁移 020（真 MySQL）：automations / automation_triggers / automation_runs / automation_deliveries 四表已建，pending=0

$ E2E（hermes 通道）：SUMMARY 39/39 —— 自动化页断言 9 节可见 + 新建自动化真落库（v1 快照）
```

## 顺带修掉的真缺陷

- `previewCron` 原用 `safeFetch`，把后端 **422 的 detail（「只能是 5 段/无秒位」）压成 `Server error: 422`**；改为裸 fetch 并原样透传。
- 旧 `test_automations_api.py` 打的是已被取代的 `toggle/delete` 端点 → 删除；覆盖面由 v2 用例承接（pause/resume/archive + triggers）。
- 并行会话留下的 2 条自测断言与实现语义冲突（运行史排序、step5 用带过滤器的触发器测正文推断）→ 已按实现口径修正并加注释说明。
