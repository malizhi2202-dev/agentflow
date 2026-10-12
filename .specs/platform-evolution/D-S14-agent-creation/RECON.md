# ② 竞品调研 + 本地真值 · S14 Agent 创建链路（第5轮 2026-09-23）

> **联网方式**：`web_search` 工具本次报错（DeepSeek 未返回搜索结果块）→ 按协议改 `web_fetch` 直连种子 URL 与自然延伸页，抓取日期 2026-09-23。Salesforce Agentforce、OpenAI GPTs 帮助页、Coze 国际站三处未取到正文（404/403/内容类型不支持），已标「未联网验证」。

---

## 零 · 事实校正（任务书底座 vs 本包实测）

| 任务书底座 | 实测结论 | 证据 |
|---|---|---|
| 「frontend/src/pages/ 有 AgentCreate.tsx」 | **无此文件**，实际是 `AgentBuilder.tsx`（列表页 + 一个「创建 Agent」按钮） | `ls frontend/src/pages/`、`frontend/src/pages/AgentBuilder.tsx:41-43` |
| 「services/assembly_service.py 组装口」 | **不存在**；存在的是 `routes/assembly_api.py`，语义为「角色×工作流节点绑定」，且与 Agent 创建无关 | `ls backend/services/`（无 assembly_service.py）、`backend/routes/assembly_api.py:1`（docstring 原文「角色×工作流组装 API — 绑定关系管理」） |
| 「RoleMarket『实例化为 Agent』」 | **无该按钮**，只有「查看详情 / 基于此创建 / 创建角色 / 编辑 / 删除」，「基于此创建」造的是自定义角色不是 Agent | `frontend/src/pages/RoleMarket.tsx:105-106`、`backend/routes/roles_custom_api.py:26-40` |
| 「api_key 现模型必填」 | 列确实 `nullable=False`，但**路由用字面量占位绕过**，等于创建期不校验 | `backend/models/agent.py:21` + `backend/routes/agents_api.py:45` |

---

## 一 · 本地真值（全部只读扫描，file:line 为据）

- **F-1 一个入口、一种形态、同一表单既建既改**：`frontend/src/pages/AgentBuilder.tsx:41-43` 按钮 `onSelect({runtime:'langgraph', model_provider:'ollama', model_name:'qwen2:0.5b', api_key:'', workflow_id:0, ..., system_prompt:'', role_def:'', sop:''})` → `frontend/src/App.tsx:161-177` `handleSaveAgent` 以 `data.id ? '/api/agents/'+id (PUT) : '/api/agents' (POST)` 分流。无分步、无形态分支、无模板选择、无试跑门。
- **F-2 24 字段模型**：`backend/models/agent.py:13-36` —— `owner_id:14`、`name:15`、`runtime:17`（六选 `models/agent.py:7`）、`model_provider:18`/`model_name:19` `nullable=False`、`model_config_json:20`、`api_key_encrypted:21` `nullable=False`、`domain_id:22` 可空、`workflow_id:23`、`workflow_ids:24`、`token_soft_limit:25`=800k / `token_hard_limit:26`=1M、`status:28`=`standby`、`gate_pre_check:30`/`gate_post_check:31`/`io_filter:32`（注释「null=使用全局默认值」，全局默认见 `backend/services/gate_resolver.py:4`）、`visibility:33`=`private`、`project_count:34`。
- **F-3 唯一硬必填是 name，且缺名返 500 不返 400**：`backend/routes/agents_api.py:43` 收 `payload: dict`（无 Pydantic），`:54` `name=payload["name"]` → 缺键抛 KeyError；`:47-53` 只枚举校验 `model_provider`/`runtime`，其余全有默认（含 `model_name` 默认空串，与 `nullable=False` 并存 → 空串入库）。
- **F-4 api_key 是「假必填」**：`:45` `api_key = payload.get("api_key","") or "not_set"` → 空值以字面量加密入库，创建期零反馈；PUT 侧 `:93-94`（`if "api_key" in payload and payload["api_key"]`）同样允许永不为真，失败点后移到运行期。
- **F-5 人格三字段整条链路丢失**：前端 `frontend/src/pages/AgentDetail.tsx:262`（系统 Prompt）、`:266`（角色定义）、`:270`（SOP）采集并提交；`backend/models/agent.py` **无这三列**；PUT 白名单 `backend/routes/agents_api.py:84` 也不含；运行期回落 `backend/services/chat_service.py:94` `getattr(agent,"system_prompt",None) or agent.description` → 永远用描述当 system prompt。结论：向导化之前，填了也不生效。
- **F-6 闸门 / 可见性 / 多工作流「无写入路径」**：PUT 白名单 `agents_api.py:84` 为 name/description/model_provider/model_name/model_config_json/workflow_id/token_*/domain_id（+ `:89-92` runtime、`:93-94` api_key），**不含** `gate_pre_check`/`gate_post_check`/`io_filter`/`visibility`/`workflow_ids`；且前端字段名 `gate_pre`/`gate_post`（`AgentDetail.tsx:299-300`）与列名 `gate_pre_check`/`gate_post_check` 不同名；工作流多选写 `data.workflow_ids`（`AgentDetail.tsx:283`）而后端只读 `workflow_id`。
- **F-7 生命周期：实产 2 态、显示 5 态、隐藏 1 态**：`status` 默认 `standby`（`models/agent.py:28`），写入点仅 `agents_api.py:125`=`running`、`:167`=`standby`，另有 `backend/engine/reconcile_loop.py:419`=`paused`；前端 `AgentBuilder.tsx:35` 标签表含 `completed`/`error`/`disabled`（无生产路径）却无 `paused`。删除为物理删 `agents_api.py:101-113`（`db.delete` 在 `:110`），仅 running 拒删（`:108-109`）。**无 draft / testing / published / archived 概念**。
- **F-8 权限**：`agents_api.py:18-21` `_filter_owner`（非 admin 只见/只改自己，admin 全权）+ `:54` `owner_id=user["id"]`（建完归创建者，无转让口）；身份取自 `request.state.user`，而 `CLAUDE.md` 现状表记「认证身份来自 `X-User-Id` 请求头且默认 admin、缺身份回退 admin」→ 「谁能建」实际等于「谁能发请求」；`visibility` 列无任何读写路径（见 F-6）→ 共享语义纯装饰。
- **F-9 平台已有「从既有 Agent 派生」的雏形，但只给自动扩容用**：`backend/routes/domain_api.py:231-249` 以匹配 capability 的 Agent 为模板造副本，命名 `{template.name}-replica-{i+1}`；复制清单含 `api_key_encrypted=template.api_key_encrypted`（`:243` **共用同一密文**，副本无法独立轮换密钥）、不含 `workflow_ids`/`gate_*`/`io_filter`。无用户可见的「复制 Agent」入口。
- **F-10 角色↔Agent 装配断裂**：`backend/models/role_custom.py:24-27` 自定义角色自带 gate 三字段 + visibility（与 Agent 同构），但 `grep CustomRole backend --include=*.py` 只命中 `routes/roles_custom_api.py` 与 `routes/assembly_api.py`（后者把角色绑到**工作流节点**，绑定存进程内存 `_bindings: list` —— `backend/routes/assembly_api.py:10-11` 原文注释「内存存储（后续迁移到 ORM）」）；`backend/models/agent.py` 无 `role_id`/血缘字段。
- **F-11 模板与导入是半成品**：编排侧模板链路完整存在（`backend/routes/orchestration_api.py:230-262` list/create template、`:265-283` `deploy` → `services/template_service.render_template` → apply），但 deploy 产出工作流、不产 Agent；YAML 解析已校验 `agents[i].spec.sop.trigger`（`backend/services/orchestration_parser.py:90-93`）却只把 agent 变成画布节点（`:130`）—— 全仓 `grep "Agent(" orchestration_api.py orchestration_parser.py` 为空，即 **YAML→Agent 表零物化路径**，双向都不通。
- **F-12 内置模板不是服务端数据**：12 个角色模板硬编码在 `frontend/src/pages/RoleMarket.tsx:20-33`；`backend/routes/roles_custom_api.py:12-13` 直接返空并附 note「内置角色模板在前端 RoleMarket 中硬编码」→ 模板不可审计、不可版本化、不可被 API 实例化。

---

## 二 · 竞品做法（每候选记 产品 / 做法 / 可借鉴 / 不可取）

来源（均 2026-09-23 web_fetch 取到正文，除非标注）：
- [D] Dify 30-Minute Quick Start — https://docs.dify.ai/en/quick-start
- [D2] Dify Key Concepts — https://docs.dify.ai/en/learn/key-concepts
- [C] 扣子 Coze 低代码智能体功能概述 — https://docs.coze.cn/guides_agent_overview
- [O] OpenAI Agents API 文档导航（含 Agents SDK / ChatKit / Vaults / Legacy Agent Builder 分区）— https://developers.openai.com/api/docs/guides/agents
- [O2] OpenAI Agent Builder 配置页 — https://developers.openai.com/api/docs/guides/agents-api/configuration
- [L] LangSmith Studio（原 LangGraph Studio）— https://docs.langchain.com/langsmith/studio
- [N] n8n AI Agent 节点 — https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent
- [CR] CrewAI 文档导航 — https://docs.crewai.com/v1.15.22/en/quickstart 、/concepts/cli（⚠ 仅取到导航，正文被截断）
- [SF] Salesforce Agentforce — ⚠ **未联网验证**（404/403/内容类型不支持三连）
- [GPTs] OpenAI 创建 GPTs 帮助页 — ⚠ **未联网验证**（403）

| 候选 | 产品 | 做法 | 可借鉴 | 不可取 |
|---|---|---|---|---|
| C1 分步向导 | [GPTs]（未联网验证，按既有知识） | 左侧 Builder 面板 + 右侧即时对话预览，配置即时生效，无「下一步」 | 向导与**试跑同屏**（边配边聊），而非配完 5 步才见效果 | 一次性把所有字段铺在一屏（正是 F-2/F-5 的前端镜像） |
| C1 | [C] Coze | 编排页分区：人设与回复逻辑 / 技能（插件·工作流·触发器）/ 知识 / 记忆 / 对话体验 / 角色，各分区可独立增删，配完走「预览与调试」再「发布」 | 分区即渐进：新建时只要求最小分区，其余分区留空也能存 | 把「开场白/背景图/语音音色」这类渠道呈现项塞进创建必填（我们平台无 C 端呈现层） |
| C2 三入口 | [D2] Dify | Studio「Create from Blank」+ 5 种 app type（Workflow/Chatflow 推荐，Chatbot/Agent/Text Generator 为 legacy 简版接口），**创建时先定类型**，类型跑同一 workflow 引擎 | 「先定形态再进画布」，且明确标 legacy（旧形态不再演进）→ 我们 6 个 runtime 枚举也该标推荐/legacy 档 | 让「类型」变成不可迁移的硬分叉（我们 runtime 与 workflow 都是可改字段，别造迁移墙） |
| C2 | [D2] | 「All Dify apps can be exported into a YAML file in Dify's own DSL and you may create Dify apps from these DSL files directly」 | **导入 DSL = 一等创建入口**，跨实例搬运 + 共享，与 S9 声明式面天然拼合 | DSL 只支持单一导出格式且不校验版本（我们若做，需吃 S9 的 apiVersion 规则） |
| C2/C4 模板 | [C] | 发布渠道含「商店或模板库」，原文：「你的智能体也可以作为模板发布到模板库中，其他开发者可以复制感兴趣的智能体，并将其改造为更适合自己的应用」 | **模板 = 已发布智能体的复制体**，实例化后必改（不是一键即用），血缘隐含在「改造」动作里 | 官方商店的变现/审核链（我们内网平台无市场交易面） |
| C3 从对话蒸馏 | [C]、[L] | Coze 有「AI 功能帮你优化提示词」；LangSmith Studio 支持从 trace 迭代 prompt、跑数据集实验 | 蒸馏的正确形态是**从 trace/对话反向提案配置**，人在确认页上改 | 全自动把一次对话固化成正式 Agent（绕过发布门与归属） |
| C4 角色即模板 | [SF]（未联网验证） | Agentforce 以「agent = 主题(Topic) + 动作(Action) + 指令」配置对象装配，管理员在 Builder 里拼装 | 角色/岗位作为**可复用装配单元**（对应我们 CustomRole 的 responsibilities/boundaries/triggers 结构已具雏形） | 「Agent 动作必须挂在业务对象 + Flow」的强 CRM 语义（我们没有对象模型） |
| C5 最小必填集 | [D] | 新建只填名字 + 选类型即进画布；模型与凭据不在创建步 | 「创建即拥有对象」——先落一个可命名的空壳，能力后配 | 我们后端 6 选 runtime + provider 枚举的即时校验仍值得保留（防脏枚举入库） |
| C6 凭据位置 | [D] | 创建前在 **Integrations → Model Provider** 装 provider；「No API key is required for the models covered by your AI credits」，另有 **Default Models**（System Reasoning Model）作为工作区级默认 | 凭据与默认模型**属于工作区/域，不属于单个 Agent**；Agent 引用档位即可轮换 | 平台代付额度的商业模式（与我们无关，只借「凭据外置」这一层） |
| C6 | [O] | Agents 文档把 **Vaults** 列为「Tools and integrations」独立子项（与 MCP connections、Functions 并列），配置类文档单列 Configuring Agents | **工具凭据走独立 Vault/引用**，Agent 定义体只存引用名——正好治 F-4/F-9 的密文共用 | 把密钥写进可视化 builder 的节点参数（OpenAI 自己已把 Agent Builder 归入 **Legacy APIs** 并要求 migration，见 [O] 导航） |
| C7 草稿落点 | [O2]、[D] | 均无「草稿」显式态；Dify/Coze 是「对象即建即存、发布才对外」 | 草稿不需要独立表：**用 status=draft + 不进列表 + 不占配额**即可 | 前端 localStorage 存草稿（换设备丢、无审计、与裁定⑦ 表化方向背道） |
| C8 生命周期 | [C] | 显式两段：搭建/预览调试 → **发布**（多渠道路由），发布后才有数据分析与运维视图 | 「发布」是权限与计量的分水岭：发布前不计费不占配额、发布后进入管控与指标面 | 多渠道发布矩阵（商店/社交/API/SDK/硬件入驻），我们只需「平台内运行 + API 暴露」两档 |
| C8 | [L] | Studio 本身**不是创建入口**：graph 在代码里定义，Studio 负责可视化/运行/管理 assistants 与 threads/迭代 prompt/跑实验/**1 Click deploy** | 「定义在代码或配置、调试与部署在同一 IDE」的分工——我们向导应止于「试运行通过」，发布走另一动作 | 依赖 LangSmith 云托管与 Agent Server 协议（我们单进程 + 无沙箱，见 CLAUDE.md） |
| C10 定义可导出 | [D2]、[N] | Dify DSL 全量导出/导入；n8n 把 AI Agent 做成**工作流里的一个 root node**（节点即 agent，随工作流 JSON 一起搬运） | 「Agent 定义随编排产物一起导出」是低成本路径，复用 S9 契约面即可 | 像 n8n 那样取消独立 Agent 实体（我们 Agent 承载 owner/配额/闸门，必须是独立一等对象） |
| C12 复制脱敏 | [C] | 「复制感兴趣智能体并改造」隐含复制体不带原凭据（凭据在工作区级） | 复制只复制**配置**，不复制**密文与运行累计量**（直治 F-9:243） | 无（此条竞品做法与我们的修正方向一致） |

---

## 三 · 未达 / 待补清单

1. **Salesforce Agentforce 正文未取到**（3 次尝试：ebooks PDF 404、docs/category 404、产品页内容类型不支持）→ C4 行标注「未联网验证」，其结论仅作类比启发，不得进 ③ 结论的事实依据。
2. **OpenAI GPTs「创建 GPT」帮助页 403** → C1 行标注「未联网验证」；AgentKit 独立页 `/docs/guides/agent-kit` 已 404，其内容在 [O] 导航中以 Agents API/Agents SDK/ChatKit 三块呈现（含 Agent Builder 落入 Legacy 分区这一硬事实）。
3. **Coze 国际站正文未取到**（coze.com 返站点壳），已用中文站 docs.coze.cn 替代。
4. **CrewAI**：`quickstart` 与 `concepts/cli` 两页正文均被截断到导航层，`crewai create crew` 脚手架细节**未联网验证**（既有知识）→ ③ 不以 CrewAI 为唯一依据。
5. Dify 的「模板/Explore 页」与「发布/访问端点」两页本轮未取，模板实例化的 Dify 侧证据缺失（现以 Coze 模板库为据）。
