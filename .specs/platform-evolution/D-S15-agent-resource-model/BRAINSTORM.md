# ① 头脑风暴 · S15 Agent 资源关联模型

技法：SCAMPER + 假设反转 + 类比迁移。每个候选标注回应的事实（file:line / 用户原话 / 竞品线索，线索详见 RECON.md）。

## SCAMPER

**A1 · S(Substitute) 统一资源台账表**：用一张 `agent_resources(kind, payload JSON)` 宽表替换六张各自挂 agent_id 的表，关联类型加行不改表。→ 回应事实：`human_approval.py:13` 有人漏建 FK、`knowledge_source/agent_memory/agent_probe/scheduled_task/channel_config` 五表五种写法（有无 owner_id/CASCADE 各异）。

**A2 · C(Combine) 触发器资源归一**：把 `scheduled_tasks`（cron）与 `channel_configs.webhook_uuid`（入口）及未来事件源合并为一个 AgentTrigger 资源（cron/webhook/事件/上游完成四类）。→ 回应事实：`scheduled_task.py:14` cron-only；`channel_config.py:21` webhook 入口藏在渠道表；`role_custom.py:17` triggers JSON 未接运行时；用户原话「应关联哪些资源」——竞品几乎人人有 trigger（RECON §横向）。

**A3 · A(Adapt) 执行环境装备资源**：借鉴 Coze「Agent 装备」（云盘/邮箱/云电脑/本地设备），把 Agent 的运行环境（工作目录、存储、出网身份）资源化为「装备/沙箱档」关联。→ 回应事实：CLAUDE.md「Domain 不是安全边界、Agent 在平台进程内执行无沙箱」；本包暂无任何环境类关联表。

**A4 · M(Magnify) 配额升级多层成本中心**：把 token 双限从单点放大为「token/成本/次数/并发 × Agent/工作流/编排/项目/域」矩阵，并规定一个消耗只记账到一个主成本中心。→ 回应事实：`agent.py:25-26`、`workflow.py:18-19`、`tool.py:16-17`、`orchestration.py:24-25` 四层各配一套 soft/hard limit，无归并规则（一次执行到底扣谁的？）。

**A5 · P(Put to other uses) 快照机制复用到 Agent**：把 WorkflowSnapshot 模式搬到 Agent（配置+关联清单版本快照），供回滚与审计 diff。→ 回应事实：`workflow.py:48-55` 与 `snapshot_service.py` 已存在但只覆盖 workflow+tools；Agent 改配置无回退（TOPICS.md:124 缺「版本快照」）。

**A6 · E(Eliminate) 凭证从 Agent 行内剥离**：`api_key_encrypted` 不再是 agents 表列，而为独立 Credential 资源（可共享、可轮换、可吊销留痕），Agent 经挂载引用。→ 回应事实：`agent.py:21` 明文列存加密串；同 Agent 改密钥需动 Agent 行；knowledge_source/channel_config 各自再造凭证字段（`knowledge_source.py:20`、`channel_config.py:19`）三处凭证三套写法。

**A7 · R(Reverse/Rearrange) Agent 本身即资源**：颠倒「Agent 挂资源」方向——在编排/其他 Agent 眼里 Agent 就是可引用资源（Agent-as-Tool / 子 Agent 关联，parent_agent_id 或 junction）。→ 回应事实：`orchestration.py:22` agent_ids JSON 松引用无图谱可查；现无 sub-agent 关联（TOPICS.md:124 缺「子 Agent」）；n8n AI Agent Tool 实证（RECON §5）。

## 假设反转

**B1 · 反转「关联都该挂 Agent」**：知识源/记忆库不该 Agent 独占——应升为空间级一等资源，Agent 只是「引用+授权访问」。→ 回应事实：`knowledge_source.py:15` agent_id NOT NULL 导致同一知识库无法多 Agent 共享（每个 Agent 重新采集一遍）；Coze 工作空间=「资源组织基础单元、资源隔离、可跨空间复制迁移」（RECON §1）。

**B2 · 反转「关联越多越好」**：不是把 8-15 类资源全建表，而是先定四类关联语义（拥有 owned / 挂载 mounted / 共享 shared-ref / 引用快照 ref-snapshot），每类一套生命周期与级联规则，不合类者不建。→ 回应事实：现状六表规则各异（A1 同引）；用户原话要的是「应关联哪些」的答案框架，不是清单堆砌。

**B3 · 反转「外键总是更好」**：并非全上 FK——仅拥有型（生命周期绑定）进 FK+CASCADE；共享挂载用中间表双 FK；拓扑类/展示类留 JSON 引用（对齐裁定⑦ MySQL 权威库：外键管一致性，JSON 管形状）。→ 回应事实：`scheduled_task.py:13` 唯一 CASCADE vs `human_approval.py:13` 无 FK vs `agent.py:24` workflow_ids JSON——现图三种范式并存且无成文规则。

## 类比迁移

**C1 · 类比 K8s**：Agent 资源关联 = OwnerReference（GC 级联删除语义）；共享资源 = namespace 内 PVC（空间级、挂载式）；凭证 = Secret（独立对象、引用挂载）。→ 回应事实：CLAUDE.md 定位「K8s 式管控」但数据模型层没承接 GC/引用语义；`agent_probe*.py` 这类观测记录正是 K8s 里「events 不算资源」的对象——应定删除策略而非级联。

**C2 · 类比手机 App 权限**：资源关联 = 授权授予（scope、可撤回、留审计），而非结构包含；Agent 详情页即「已授权资源清单」。→ 回应事实：Agentforce guardrails=topic 边界/动作权限/数据访问三层（RECON §4）；我们 `agent.py:30-32` 闸门是文本字段不是可审计的关联资源。

**C3 · 类比 CI/CD**：Agent + 关联清单 = 可复现构建环境：评估集/环境变量/webhook 入口都是 pipeline 配置面的一等件。→ 回应事实：TOPICS.md:124 缺「评估集/环境变量」；Coze 有「管理环境变量」与「技能环境变量」两级（RECON §1），我们只有 `model_config_json` 一锅烩（`agent.py:19`）。

**C4 · 类比关系型数据仓库建模**：先建「一致性维度」——资源关联字典（每类资源：语义档位/生命周期/配额归属/FK-or-JSON/审计要求五列），新表按字典验收。→ 回应事实：B2/B3 的落地载体；R16 文档态议题恰适合产字典不产码。

## 候选小结

12 个候选（A1-A7、B1-B3、C1-C4）。其中 A1 属结构性激进方案、A3/C3 依赖其他议题解冻，取舍见 ③ CONCLUSION.md。
