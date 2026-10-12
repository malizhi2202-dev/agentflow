# ③ 结论与建议 · S12 协作层落地形态
> 状态：已过审（第 4 轮 · 2026-09-23 用户原话「通过」）· 依据 RECON ①② + R4-CODEAUDIT 议题5

- **C12-0（止血·独立先行）告警落表**：alert_events 表——告警中心界面当前消费进程内环形 500 条、**重启即丢**。「有界面没表」与 multica「有表没界面」同罪；建议列为新血口条目（编号待 ⑤，档位=紧邻 P0 的补洞，不等工作项层）。
- **C12-1 work_item 最小单表**：status（目录表+4 语义锚，承 S7#6 已审裁决）× triage 双正交轴；`assignee_kind(human|agent)+assignee_ref` 双轨——**owner_id 不动**（归属≠负责人，术语已在 CONTEXT.md）；done 证据列；creator/时间戳。
- **C12-2 关联面**：work_item_runs 连接表（一次运行挂多上下文；coalesced/delivered 双数组列预留，承 multica 已审模式）；human_approvals.task_id（现为无约束 String）过渡双写→FK。
- **C12-3 收件箱三规则**（只 ping 拍板人/自愈归档=状态非删除/deferred 行 UI 隐藏保留）+ **前置清障：scheduling_queue 与 scheduler_queue 双表先并**，第三张 queue 不许进来。
- 文档落点：1.5.2 差距⑤升级句（「Multica 整个产品建在这层」具体化到 schema 差距表）；P1-4 充实 C12-1..3；p20/21/22 proto-note 各补「目标表与键」一行（规划态）；告警中心页补「当前内存态·落表待批」诚实注记。
- 依赖序（写进结论防跑偏）：C12-0 → 双 queue 并表 → C12-1/2 → C12-3。


> **追加（2026-09-23 · 裁定⑦）**：work_item/inbox/alerts 全部落 **MySQL**（可计量追踪数据权威库）；「告警落表」即建 MySQL 告警表，进程内环形 500 条退役。schema 结论本身不变。
