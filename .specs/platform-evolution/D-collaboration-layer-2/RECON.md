# RECON · S12 协作层落地形态 — 第 4 轮 ②
> 状态：待审 · 2026-09-23 · 证据源：`../R4-CODEAUDIT.md` 议题5（本地真值）+ `D-multica-borrow-wave2/RECON.md`（轮2/3 已审深读，此处只引用不重做）+ `D-harness-landscape-2026/RECON.md`（amux/AgentTeams 行）

## ① 现状底账（本地实测，比轮1记录更具体）
- 26 表全清单已钉（R4-CODEAUDIT 议题5）：**无 work_items / 无 inbox / 无 assignee**——三个词在代码零命中，仅存在于提案文本
- `owner_id` 全平台仅一处语义=归属/租户，与「负责人」是两个概念（multica 用 originator/accountable 二分先证此点）
- `human_approvals`（轮1已建）列：task_id=String128 **无 FK 无约束**——协作层落地时的天然过渡锚点（改 FK 前双写）
- `alerts` 无表：AlertService 进程内环形 500 条**重启即丢**（⚠ 轮1结论"告警中心有界面"背后是易失数据）——「留痕要表+界面两步齐」纪律的自家反面案例（multica 有表无界面，我们有界面没表，两样都占齐了）
- `messages` 唯一 FK=conversation_id；Conversation FK=agent_id——**没有任何外键面能挂工作项**，multica 式「一次运行挂多上下文」需连接表
- ⚠ scheduling_queue 与 scheduler_queue 双表并存语义重叠——工作项层设计前必须先并表，不然第三张 queue 混进来

## ② 竞品已审证据（引用，不重做）
- **multica（D-multica-borrow-wave2 全量 RECON）**：work_items 双正交轴（status=到哪一步 × triage=算不算活）；负责人人/Agent 双轨同列；coalescing 重打身份（MUL-4195）；wait_reason 一等状态；「done 需证据」缺口的提示词契约教训；originator(鉴权)/accountable(成本) 双列+8 级瀑布+fail_closed；sys_cron_execution 留痕表教训
- **amux（landscape RECON）**：CAS 认领 + done 附证据 + verified 需同伴复核 + 逐卡预算——质量门禁最小闭环
- **AgentTeams**：任务状态机 + 干预前快照（v1.2.3）

## ③ 差距表（现状 → 目标，schema 级）
| 目标实体 | 现状差距 | 最小落法（DESIGN 候选，非承诺） |
|---|---|---|
| work_item | 无表 | 单表起步：id/domain_id/**status(目录表+4语义锚,承 S7#6)**/**triage**/title/desc/creator/assignee_kind(human|agent)+assignee_ref/证据字段(done 附物)/时间戳 |
| 运行↔工作项 | messages 无挂载面 | `work_item_runs` 连接表（run 可挂多上下文；coalesced/delivered 双数组列预留） |
| inbox_item | 无表 | 通知分层三规则入 CHECK/枚举（只 ping 拍板人；自愈归档=状态非删除；deferred 行 UI 隐藏但保留） |
| alert_event | **重启丢** | alerts 落表（P0 级补洞，独立于工作项先行） |
| 负责人 vs 归属 | 概念混一 | owner_id 不动，新增 assignee 语义列（人/Agent 双轨） |
| 审批锚 | task_id 无约束 | 过渡期双写，目标 FK→work_item |
