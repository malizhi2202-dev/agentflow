# ③ 结论与建议 · S15

推荐 3 方向（按优先级），均为**文档/模型层结论**，解冻后才有表结构与代码动作（裁定⑧）。

## 方向一（最高优先）：《Agent 资源关联字典》+ 四类关联语义分级

把「Agent 该挂什么」从清单升级为规则：每类资源定义五列——**语义档位**（拥有 owned / 挂载 mounted / 共享引用 shared-ref / 引用快照 ref-snapshot）、**生命周期**（随 Agent 级联删除 / 独立存续）、**配额归属**（谁扣减）、**FK-or-JSON**、**审计要求**。据此裁定缺失项的引入顺序：凭证资源（A6）、触发器归一（A2）、知识/记忆升共享（B1）优先；装备（A3）、评估集暂缓。
一句话落地路径：本包过 ⑤ 后，把字典写成 `.specs/platform-evolution/` 下独立裁定文档并挂 ROADMAP 一条「Agent 资源模型字典」建议项。
事实依据：六表六样（knowledge_source.py:15 / human_approval.py:13 无 FK / scheduled_task.py:13 唯一 CASCADE / agent.py:23-24 双范式并存）；RECON 矩阵显示竞品全部走「独立资源+挂载」而非内联。

## 方向二：FK 与 JSON 引用使用规则（对齐裁定⑦）

成文三条：**拥有型**（生命周期与 Agent 绑定：探针、定时任务、审批）→ DB 外键 + 显式 ondelete 策略（删除级联 or SET NULL 逐类写明，修 human_approval 裸 Integer）；**共享挂载型**（知识库、记忆库、凭证、渠道）→ 中间表双 FK（precedent：knowledge_tag.py:36-37）；**弱引用/形状型**（编排拓扑 agent_ids、多工作流绑定、指标多态 entity_type:entity_id）→ 留 JSON，应用层校验存在性，MySQL 权威库+外键只兜一致性。
一句话落地路径：作为字典文档的「存储裁定」章，附「新关联表验收清单」五问（档位/级联/配额/审计/FK-or-JSON）。
依据：B3 反转 + metrics.py:13、orchestration.py:22 既成范式不该强扭。

## 方向三：Agent 版本快照与发布态（复用 WorkflowSnapshot 模式）

Agent「配置+关联清单」序列化存档（引用 Dify DSL/Coze 版本存档先例），与 publish/draft 状态机绑定：快照未发布不生效（吸收 Zapier「publish 才激活 trigger」语义）；快照消费场景=回滚+审计 diff 两个读端。
一句话落地路径：设计稿入字典附录（表形态 agent_config_snapshots + API 面），实现等解冻。
依据：workflow.py:48-55 与 snapshot_service.py:10-29 机制已在，Agent 侧为零（agent.py 全字段无任何版本痕迹）；用户原话「参考同类产品」中五/六家均有版本或发布态。

## 否决记录

- **A1 统一 agent_resources EAV 宽表**：否决——六家竞品无一采用；丢类型安全与约束，跨类查询代价大（RECON 横向小结）。
- **A3 Agent 装备/执行环境资源**：本轮否决、转长期——依赖执行隔离域（D-execution-isolation 两包议题未决），现无沙箱可挂（CLAUDE.md 事实）。
- **A7 子 Agent 关联**：本包只登记「应有一等关联」裁定，协议与委派机制移交 D-a2a-protocol-surface / D-collaboration-layer-2 议题，避免重复建语义。
- **评估集资源**：竞品种里最薄（RECON 矩阵仅 Agentforce/CrewAI 有迹），且属度量议题（D-otel）——暂缓。
- **画布内变量作 Agent 资源**：否决——Coze 变量节点「已停用」实证（RECON §1），语义漂移前车之鉴。

## 批判打磨（预演失败 Pre-mortem，任选技法之一）

假想 12 个月后三个方向全失败，最死因：
1. **字典写了没人执行**（新表照旧漏 FK）→ 缓解：字典附「验收清单五问」并要求每张新关联表 PRD 引用档位裁定——把字典变成门禁文书而非参考文。
2. **触发器归一撞上单副本内存调度**（CLAUDE.md 已知缺陷：调度队列在进程内存）→ 缓解：方向一内明确 Trigger 只做数据模型与语义定义，运行时激活以 D-single-process-state 议题解冻为前提，写死依赖顺序。
3. **快照存了没人读**（写路径有、读路径无 = 纯成本）→ 缓解：快照表立表前提 = 「回滚 API + 配置 diff 视图」两个消费端同批设计（即便先只做只读 diff）；不满足则降级为「导出 JSON 清单」一档（学 Dify DSL 的导出而非存档）。
三缓解均已折入上文建议，结论维持不变。

---

## ⑤ 用户意见补记（2026-09-23 · 原话：「结合我现有代码 我现在代码已经可以创建agent了 并且关联了一些实体 在此基础上扩充 但是没有team的概念」）

**定位按用户意见钉死：四型语义字典 = 给已存在的六类关联立规矩，不是加新表。**
既有关联全部承认为底座：知识源挂载（agent_knowledge_api.py:33-134 全套 CRUD+test 真实存在）· 记忆（agent_memory.py）· 探针（agent_probe + probe_latest）· 定时任务（agents_api.py:200-213）· 审批（human_approval.py——唯一硬缺陷：:13 无外键，属**修既有**）· 渠道（channel_config.py）· 工作流（workflow_id + workflow_ids JSON）· 配额双限/闸门/visibility 均在 agent 行上。
扩充清单收敛为三件小事：① 立《关联字典》纯文档裁定每类属哪型；② human_approval 补 FK + knowledge 类沿用 knowledge_tag.py:36-37 中间表先例；③ 版本快照复用 workflow.py:48-55 WorkflowSnapshot 模式。**零新资源类别引入**（子 Agent/评估集/装备均已被否决或移交）。
