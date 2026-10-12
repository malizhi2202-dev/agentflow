# ② 竞品查证 · S15

**联网说明**：web_search 工具后端故障（endpoint 未配置，报错原文可查）→ 按协议降级 web_fetch 直连种子页 + DuckDuckGo HTML 延伸检索，**联网查证整体成功**。凡本轮未能直接抓到正文的条目已单独标注。查证日期 2026-09-23。

## 1. Coze / 扣子（字节）

做法（据官方文档索引 https://docs.coze.cn/llms.txt 及各页）：
- Agent 配置面 = 模型（guides_model.md，支持自定义模型接入 model-settings.md）+ 人设/提示词 + 技能/插件（guides_agent_plugin.md；插件含技能/MCP/Panel，plugin.md）+ 工作流（guides_agent_workflow.md，提示词中引用名调用）+ 知识库（guides_knowledge.md，分**文本/表格/图片**三型）+ 数据库（guides_integrate_database.md）+ **变量**（guides_variable.md，Bot 级读写）+ **长期记忆/记忆库**（cozespace_memory.md；工作流侧拆写入/检索/召回三节点 guides_ltm_node.md 等）+ **触发器**（guides_set_trigger_for_app.md：满足条件自动运行工作流）+ **日程**（cozespace_job.md：Heartbeat 检查+定时任务）+ 发布渠道（cozespace_agent_management.md）。
- **工作空间 = 资源组织基础单元**：资源隔离、可跨空间复制/迁移（guides_teams.md、guides_migrate_to_team.md）、资源复制有异步任务 API（developer_guides_copy_resource_task.md）。智能体有草稿/已发布双态+**版本列表 API**（developer_guides_list_bot_versions.md）、应用版本存档/回退（guides_app_archive_versions.md）、协作者管理（add/remove_bot_collaborator）。
- 特色：**「Agent 装备」= 执行环境资源**——云盘/本地工作目录/邮箱/云手机/云电脑/本地设备六类独立页；**「Agent 权限」**= 本地文件夹授权、Shell 命令白名单（agent-permissions.md）；回调管理（订阅回调 dev_how_to_guides_add_callback.md）。
- **配额按资源计费**：记忆库费用、知识库空间费用、插件费用、资源扩容费用各有计费项页（coze_pro_memory_fee.md 等）——资源归属即账单归属。

可借鉴：空间级一等资源+挂载引用（破独占）；触发器/日程独立资源；版本存档+草稿/发布态；**资源级配额与计费归属**；装备类资源清单。
不可取：低代码画布把资源做成节点、变量节点因语义混乱而「已停用」（guides_variable_node.md 原文标注）——资源语义漂移的反面教材；装备类（云电脑/云手机）依赖重资产运行时，我们现阶段无隔离执行域。

## 2. Dify

做法（https://docs.dify.ai/en/learn/key-concepts 全文 + 检索结果页）：
- App 类型五种（Workflow/Chatflow + 遗留 Chatbot/Agent/Text Generator）；工作流开始节点二选一：**User Input（人工/API 触发）或 Trigger（定时或外部事件自动）**——触发是一等入口。
- Agent 应用/Agent 节点 = model + instructions + **Context（挂知识库做检索）** + tools + 功能开关（Maximum Iterations 推理-行动循环上限，docs.dify.ai/en/cloud/use-dify/build/agent）+ Memory 管理（nodes/agent）。
- 变量体系分层：用户输入变量 / sys.* 系统变量 / Chatflow 会话变量；**DSL YAML 导出导入**=应用（含全部资源关联）成为可移植可版本化的文本快照。
- 知识库检索节点两级配置（库级+节点级检索参数，knowledge-retrieval 节点页）。

可借鉴：Context 与 Tools 分层（知识≠工具）；迭代上限/超时作为 Agent 一等属性而非藏在 JSON；DSL=「关联清单可序列化」的成熟范式（对 A5/C3 有力）。
不可取：Agent 被降格为「应用类型之一」与编排强耦合；我们 Agent 独立建模的路线应维持。

## 3. Zapier Agents

做法（https://help.zapier.com/hc/en-us/articles/45394909914381 全文、…/26028298697485、…/24569690575117）：
- Agent = **instructions + trigger + actions + knowledge**；trigger 四类默认（On Demand / Schedule / Zap 工作流与 MCP 调用 / App 事件）且可挂多个 app trigger，trigger 携带的数据可在 instructions 中引用。
- **发布状态机**：未 publish 只能测试，publish 才激活 trigger（生命周期语义成文）；Activity 页查运行历史。
- actions 可「对话时临时增删，独立于 Agent 主配置」（26028298697485）；知识源为独立资源（24569690575117）；连接授权（app connection）与 Agent 解耦复用。

可借鉴：trigger 是 Agent 必配首件（我们缺入口资源，对 A2 有力）；publish=激活 的关联生效语义；「会话级工具临时覆写」档位。
不可取：一 Agent 一主 trigger 的产品约束偏窄（我们需 cron+webhook+事件并存）；instructions 与数据字段耦合方式不可移植。

## 4. Agentforce（Salesforce）

做法（https://developer.salesforce.com/docs/ai/agentforce/guide/ascript-ref-actions.html、https://help.salesforce.com/s/articleView?id=ai.copilot_actions.htm、https://www.salesforce.com/agentforce/guide/、trailhead trusted-agentic-ai 模块；第三方解读 quickbild.com/blog/agentforce-guardrails-trust-layer/、salesforcereader.com 2025/03 building-blocks）：
- Agent = **topics + actions + instructions + guardrails + connected systems**；actions 挂在 topic 下（「actions are how agents get things done…a library of actions」）；Agent Script 中 action 输出可写入变量、控制是否对客户展示；**subagent** 显式建模（先选子 Agent 再启 action）。
- guardrails 三层：topic 边界 / action 权限 / 数据访问（trailhead + 第三方文）；connected systems = 外系统授权凭证独立对象。

可借鉴：guardrails 与凭证作为「可审计的关联资源」而非内联文本（对 A6/C2 有力）；subagent 显式一等建模（A7）。
不可取：topic-action 双层路由深绑 CRM 元数据（Object/Field），平台化改造成本高，短期不引。

## 5. n8n AI Agent

做法（https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent、…/sub-nodes/n8n-nodes-langchain.toolaiagent、https://docs.n8n.io/build/build-and-manage-agents、…/how-memory-works、…/how-tools-work）：
- AI Agent 节点 = 连接 chat model + tools（含 MCP 注册表），memory 为独立子节点类型；定义句：「**agent 的环境 = 它能访问的一切非 agent 自身的东西**」——资源关联即环境边界。
- **AI Agent Tool：根 Agent 把其他 Agent 当工具调**（子 Agent 关联的轻量实现）；Chat Trigger 使工作流可作为 Agent/工具被调。
- 新式托管 Agent：「每个 agent 有语言模型、instructions 与能力（tools、skills、知识库访问），**Agent 与 workflow 并列为 project 的一等资源**」（build-and-manage-agents）。

可借鉴：Agent-as-Tool 与「project 一等资源」表述（A7/B1）；memory 组件可插拔（换后端不换关联）。
不可取：Agent 配置全部内嵌画布节点，难以单独版本化/审计——恰是他们社区痛点，反证 A5 快照必要。

## 6. CrewAI

做法（https://docs.crewai.com/ v1.15.22 /en/concepts/agents 页在线核实其文档结构：Agents / Agent Capabilities / Tasks / Crews / Flows / **Knowledge** / **Skills** / **Memory** / Planning / Reasoning / Training / Collaboration / LLMs / Files 各为独立概念页）：
- Agent 参数 = role/goal/backstory + llm + tools + **knowledge_sources（多源类型枚举）** + memory（短期/长期/实体三型开关）+ max_iter/max_rpm + **allow_delegation（委派=隐式子 Agent）** + planning 开关。【参数明细清单本轮仅核实到页面结构，逐项名以既有知识补齐，标注：部分未联网逐字验证】

可借鉴：memory 三型开关（轻量）；max_rpm 速率限与 token 配额并存（A4 两维度证据）；delegation 显式开关（A7）。
不可取：纯代码/YAML 配置无运行时 CRUD 与库表——我们是管控平台不可照搬；但「配置即文本」思路与 Dify DSL 共同支持 A5。

## 横向小结：六家公共「Agent 应关联资源」矩阵

| 资源 | Coze | Dify | Zapier | Agentforce | n8n | CrewAI | 我们现状 |
|---|---|---|---|---|---|---|---|
| 模型+提示词/人设 | ✓ | ✓ | ✓(模型可选) | ✓ | ✓ | ✓ | ✓ 内联（agent.py:17-21） |
| 工具/动作 | ✓ 插件/MCP | ✓ | ✓ actions | ✓ actions | ✓ | ✓ | △ 仅经 workflow（tool.py 无 agent_id） |
| 知识 | ✓ 库三型 | ✓ Context | ✓ knowledge | ✓ grounding | ✓ KB | ✓ sources | ✓ 独占挂接（knowledge_source.py:15） |
| 记忆 | ✓ 记忆库 | ✓ 会话变量/窗 | △ | △ | ✓ 子节点 | ✓ 三型 | ✓（agent_memory.py） |
| **触发入口** | ✓ 触发器+日程 | ✓ Trigger 节点 | ✓ 一等 | △ Flow 侧 | ✓ Chat Trigger | △ Flows | **✗ 仅 cron**（scheduled_task.py:14） |
| **输出/发布通道** | ✓ 渠道入驻 | ✓ API/WebApp/MCP | ✓ | ✓ | ✓ | △ | △ channel_config 入为主 |
| **子 Agent/委派** | ✓ 多 Agent 协作 | △ Agent 节点 | △ | ✓ subagent | ✓ Agent-as-Tool | ✓ delegation | **✗** |
| **凭证/连接授权** | ✓ OAuth 插件 | ✓ 凭证库 | ✓ app conn | ✓ connected systems | ✓ credentials | △ env | **✗ 内联**（agent.py:21） |
| **版本快照/发布态** | ✓ 存档+回退 | ✓ DSL | ✓ publish | ✓ | △ | △ | ✗（仅 workflow 快照） |
| 环境变量/密钥 | ✓ 两级 | ✓ | △ | △ | ✓ | ✓ .env | ✗ |
| 安全闸门/权限 | ✓ Agent 权限 | ✓ moderation | △ | ✓ guardrails | △ | △ | △ 文本内联（agent.py:30-32） |
| 评估集 | △ | △ | △ | ✓ 测试 | △ | ✓ testing 页 | ✗（竞品种，暂缓） |

## 候选 ↔ 竞品对账（可借鉴/不可取速记）

- A1 统一台账 → 无人这么做（六家全部分表分实体）→ **不可取**为主。
- A2 触发器归一 → Zapier trigger 一等 / Coze 触发器+日程 / Dify Trigger 节点 → 借鉴成文；不可取其单 trigger 约束。
- A3 装备资源 → Coze 独有重资产 → 长期项，非本轮。
- A4 配额矩阵 → Coze 按资源计费项 / CrewAI max_rpm+max_iter 双限 → 借鉴「归属到主成本中心」思想。
- A5 快照 → Dify DSL / Coze 版本存档 / Zapier publish → 强借鉴。
- A6 凭证剥离 → Agentforce connected systems / n8n credentials / Dify 凭证库 → 强借鉴。
- A7 子 Agent → n8n Agent-as-Tool / Agentforce subagent / CrewAI delegation → 借鉴建模语义（关联），具体协议归 D-a2a/D-collaboration 包。
- B1 共享挂载 → Coze 空间级资源+跨空间迁移、各家知识库皆独立资源 → 强借鉴。
- B2/B3/C1-C4 为裁定框架，竞品佐证同上（快照类各家均文本序列化，无 EAV 先例）。
