# D-S15-agent-resource-model — S15 · Agent 资源关联模型

> 审核: 待审⑤（第5轮 2026-09-23）

**一句话**：把「一个 Agent 实体应关联哪些资源、每种关联是拥有/挂载/共享/引用哪种语义、生命周期与配额怎么归属、关系图上哪些进 DB 外键哪些留 JSON」定成一份有据可查的《Agent 资源关联字典》，补齐缺失关联并修复现有关联的图谱碎片化。

**拆解依据**
- 用户原话：「参考一个类别的其他产品 agent里边应关联那些资源」（TOPICS.md:124 收录）。
- 代码事实底座（本包只读扫描核实）：
  - Agent 本体自带型资源：模型与凭证内联 `backend/models/agent.py:17-21`（`api_key_encrypted` :21）、token 双限 :25-26、安全闸门 :30-32、`visibility` :33；
  - 六张 agent_id 关联表：`knowledge_source.py:15`、`agent_memory.py:16`、`agent_probe.py:13`/`agent_probe_latest.py:13`、`scheduled_task.py:13`（唯一带 `ondelete="CASCADE"`）、`channel_config.py:16`（自带 `webhook_uuid` :21）、`conversation.py:13`；
  - 图谱不一致实证：`human_approval.py:13` 的 agent_id 是裸 Integer+index、无 ForeignKey；`orchestration.py:22` 对 agent 用 JSON `agent_ids` 引用；`metrics.py:13` 用 entity_type+entity_id 多态引用；`workflow_ids` JSON（agent.py:24）与 `workflow_id` FK（:23）同一实体两种引用并存；
  - 工具与 Agent 无直接关联：`tool.py` 无 agent_id，工具只能经 Workflow spec 节点 `tool_id` 进入（`services/snapshot_service.py:12-14`）；
  - 快照机制只覆盖工作流：`workflow.py:48-55` WorkflowSnapshot，Agent 无版本快照；
  - 触发语义仅两处且都不可复用：`scheduled_task.py:14` cron-only、`role_custom.py:17` triggers JSON 未接运行时。

**范围界定**：本包是发现类议题（R16），只产出模型语义与归属裁定建议；零代码改动（R16.1 冻结，裁定⑧）。⑤ 人审门前不进 ROADMAP、不立项引用。

**成员清单**（R16.8）
| 文件 | 步骤 | 状态 |
|---|---|---|
| TOPIC.md | 立题 | 本文件 |
| BRAINSTORM.md | ① 头脑风暴 | 已落盘 |
| RECON.md | ② 竞品查证 | 已落盘（联网成功，web_search 故障→web_fetch 直连+DDG 延伸） |
| CONCLUSION.md | ③ 结论与建议 | 已落盘（预演失败打磨） |
| PANEL.md | ④ GD 议题门 | 已落盘（3 票型见文） |
| REVIEW.md | ⑤ 人审门 | 待主会话呈审 |
