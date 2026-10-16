# ② 竞品做法 · S16 Team 组织实体（第 5 轮 · 联网查证）

> 〔口径注 2026-10-15〕本文档为历史评审/证据记录：其中「Provider/Base URL 配置」口径已被外部 CLI 运行时取代（凭据留运行时 CLI 机器；竞品凭据归属为对比事实）；以 PRODUCT-DESIGN.html v12 为准


> 取证方式：**`web_search` 失败**（后端返回「DeepSeek returned no web_search_tool_result blocks」，端点 `api.360.cn` 未启用原生搜索）→ 按协议改用 **`web_fetch` 直连种子 URL 与自然延伸页**。抓取日期：2026-09-23。
>
> **联网验证状态声明（逐条诚实标注）**
> - ✅ **已联网验证（取到正文，本包引用其原文）**：Dify workspace/成员角色（2 页）、Langfuse Access Control (RBAC)、n8n 凭据与项目归属、Kubernetes Namespaces + Resource Quotas、AutoGen AgentChat Teams、Microsoft Agent Framework README、CrewAI 文档索引（Crews/Flows/Processes/Collaboration 分章）、Coze Studio 开源版 README。
> - ⚠ **未联网验证（正文没拿到，以下判断基于既有知识，不得作为设计依据，需在 ⑤ 前补验）**：① GitHub org→team→repo 权限模型（docs 页只取到导航树，raw markdown 路径 404）；② Salesforce Permission Set（`help.salesforce.com` 为 JS 应用，返回空壳「Salesforce Help」）；③ Coze 商业版「团队空间/企业版席位」（SPA 只返回标题行）；④ n8n `projects` 专页（`docs.n8n.io/user-management/projects` 404，仅从凭据页脚注取得项目语义）。
> - 未联网的四处在下表中标 ⚠，其结论只作方向参考；引用处已注明「未联网验证」。

---

## 1. 证据卡（已联网验证的一手原文）

### E1 · Dify —— workspace = 资源归属 + 默认值继承 + 席位上限（a 类，组织团队）
来源：<https://docs.dify.ai/en/cloud/use-dify/workspace/readme.md> · <https://docs.dify.ai/en/cloud/use-dify/workspace/team-members-management.md>

- **原文（归属与继承）**："Workspaces are the foundational organizational unit in Dify — everything your team builds, configures, and manages exists within a workspace… **Every resource in Dify belongs to a workspace. When you create an app, it inherits the workspace's model configurations.**"；容器清单：Apps / Knowledge Bases / Team Members / Model Providers / Integrations / **Billing**。
- **原文（角色四分，职责按资源类别切）**：Owners 管 billing、model providers、workspace settings；Admins 管成员+模型+集成；Editors 建应用与知识库；Members 只用已发布应用。**Owner 每个 workspace 只有一个。**
- **原文（席位=订阅档）**：Sandbox 1 人 / Professional 3 人 / Team 50 人。
- **原文（生命周期三个细节）**：邀请链接 72 小时过期；改角色「在成员**下一次动作**时生效，即使其已登录」；移除成员**立即**失去访问权，但**其创建的应用与知识库留在 workspace**；转让 Owner 需邮箱验证码，原 Owner 降级为 Normal。
- **原文（一处硬约束）**："Each account can create only one workspace."（个人账号可属于多个 workspace，用左上角切换器）

### E2 · Langfuse —— 组织→项目两级 + 角色可下沉到项目级（a 类，正交关系样板）
来源：<https://langfuse.com/docs/administration/rbac>

- 模型四要素："**Users** … **Organizations** are the top-level entities that contain projects. **Projects** group all Langfuse data to allow for fine-grained role-based access control. **Roles** define the permissions of users within an organization and project."
- **默认继承 + 例外覆盖**："By default, users get assigned a role on the organizational level. For more fine-grained control, users can be assigned project-roles… If a project-level role is assigned, **it will override the organization-level role** for that project."
- **`None` 角色（专治「只给一个项目」）**："`None`: no default access to the organization, to be used when user should have access to a single project only."
- **权限点式而非角色式**（可跨层复用的表述）："Any user with the `members:CUD` permission can change the role…"; "Any user with the `projects:create` permission…"; **"Users can only assign roles that are lower or equal to their own role."**
- **凭据/密钥归属**："API Keys … are associated with a **project** and can be used to access the project's data programmatically. **API keys are not tied to a user.**"
- **资产可迁移**：`projects:transfer_organization`——迁移后"settings、data、API keys 全部不变，仅访问管理随新组织变化"。
- **付费档差异（坑）**：project-level roles 在 Hobby/Core **不可用**，Pro 需 Teams Add-on，Enterprise/自托管 EE 才有。

### E3 · n8n —— 资源创建时**必须选归属**（个人空间 or 项目），凭据与配额分治（a 类）
来源：<https://docs.n8n.io/build/understand-workflows/create-and-edit-credentials.md>

- 原文（创建即定归属）："If your n8n instance supports projects, you'll also need to **choose whether to create the credential inside your personal space or a specific project** you have access to. **If you're using the community version, you'll create the credential inside your personal space.**"
- 原文（脚注定义边界）："n8n projects allow you to separate **workflows, variables, and credentials** into separate groups… Projects make it easier for teams to collaborate by **sharing and compartmentalizing** related resources."
- 原文（凭据两种作用域——我们最需要的一条）："**Fixed credential**: the same credential is used regardless of who runs the workflow（默认）。**End-user credential**: each user's credential is used at runtime, and **can only be seen and used by that user**… only on Enterprise."
- 原文（凭据自带的配额式闸门）：凭据上有 "Allowed HTTP Request Domains: All / Specific / None"，"prevents credential misuse"。

### E4 · Kubernetes —— namespace（=我们的 Domain 类比）+ ResourceQuota 的真实语义与失效条件
来源：<https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/> · <https://kubernetes.io/docs/concepts/policy/resource-quotas/>

- namespace 定位原文："Namespaces are intended for use in environments with **many users spread across multiple teams, or projects**… Namespaces **cannot be nested** inside one another and **each Kubernetes resource can only be in one namespace**… a way to **divide cluster resources between multiple users (via resource quota)**."
- 反过度分层原文："It is **not necessary to use multiple namespaces** to separate slightly different resources… **use labels** to distinguish resources within the same namespace."（→ 直接质疑我们的 Project/Domain 双壳叠加）
- 配额语义原文（四条，条条可搬）：① "provides constraints that limit **aggregate resource consumption per namespace**"，且可限**对象数量**（`count/<resource>`、`pods`、`secrets`）；② 违反约束时**控制面直接拒绝并返 `403 Forbidden` + 说明是哪条约束**；③ "**Neither contention nor changes to quota will affect already created resources**"（配额改动不影响已建资源）；④ "配额启用后，**该 namespace 里每个新 Pod 都必须显式设 requests/limits，否则可能被拒**"（→ 用 LimitRange 兜默认值）。
- 配额**不是**分配比例原文："ResourceQuotas are **independent of the cluster capacity**… expressed in absolute units… **if you add nodes, this does not automatically give each namespace the ability to consume more**"；总容量小于配额之和时 "there may be contention… handled on a **first-come-first-served** basis"，想要比例/弹性需**另写 controller**。
- 保护 enforcement 本身原文："To make sure the enforcement stays enforced, the cluster administrator should also **restrict access to delete or update that ResourceQuota**."
- 隔离边界诚实声明："quota… **creates no restrictions around nodes**: pods from several namespaces may run on the same node."（→ 类比我们：Domain 配额挡不住同进程争抢）

### E5 · AutoGen —— team = 运行期协作预设（b 类），且带状态机与"别急着用 team"警告
来源：<https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/teams.html>

- 四种 team 预设：`RoundRobinGroupChat` / `SelectorGroupChat`（模型选下一发言）/ `MagenticOneGroupChat` / `Swarm`（`HandoffMessage` 转移）。
- **官方劝退原文**："Teams are for complex tasks… **start with a single agent for simpler tasks, and transition to a multi-agent team when a single agent proves inadequate.** Ensure that you have optimized your single agent… before moving to a team-based approach."
- **状态坑（与我们 reconcile 模型直接冲突）**："Teams are **stateful** and maintains the conversation history and context after each run, **unless you reset** the team"；`reset()` 会连带清每个 agent 的 `on_reset()`；停止用 `ExternalTermination`，中止用 `CancellationToken` → **抛 `CancelledError`**；单 agent 也可以包成 team（只为跑「循环直到终止条件」）。
- 判读：AutoGen 的 team 是**执行策略对象**（进程内、无所有权、无配额、无成员人册），与 Dify/Langfuse 的 org/team 完全不是一个层。

### E6 · CrewAI —— 明确分词：Crew（协作体）≠ Flow（编排），且组织治理另在平台层
来源：<https://docs.crewai.com/llms.txt>（文档索引，逐页摘要）

- 索引条目：`concepts/crews`（"Understanding and utilizing **crews**… comprehensive attributes and functionalities"）、`concepts/flows`（"**structured, event-driven workflows** with precise control"）、`concepts/processes`（"workflow management through **processes**… sequential / hierarchical"）、`concepts/collaboration`（"How to enable agents to **work together, delegate tasks**, and communicate within CrewAI **teams**"）、`learn/hierarchical-process` + `learn/custom-manager-agent`（supervisor=**manager agent**，是 process 的一种而非组织）、`guides/crews/first-crew`（"**JSON-first crew configuration**"）。
- 索引里的分诊原文："Evaluating Use Cases… **choose the right approach between Crews and Flows** based on complexity and precision requirements."
- 判读：CrewAI 用 **Crew** 承担「执行协作组」，用 **Flow** 承担「编排画布」，企业治理（AMP 平台）另立文档站——三层不共用一个词。

### E7 · Microsoft Agent Framework —— 组织层与执行层都不叫 team（命名证据）
来源：<https://raw.githubusercontent.com/microsoft/agent-framework/main/README.md>

- 执行层措辞："build **multi-agent workflows**"、"graph-based workflows supporting **sequential, concurrent, handoff, and group collaboration** patterns"——**没有把团队固化为实体词**。
- 治理/交付侧才出现 team："Microsoft Agent Framework is built **for teams** taking agents from prototype to production"（指人类团队，非产品对象）。
- 值得抄的工程项：checkpointing / streaming / **human-in-the-loop** / **time-travel**、**Declarative Agents（YAML）**、内置 OpenTelemetry、A2A 与 Foundry 托管；**资源作用域用 `Azure.AI.Projects` 的 project endpoint**（示例直接读 `AZURE_AI_PROJECT_ENDPOINT`）——即「组织归属单位」在 Azure 侧叫 **Project**，不是 Team。

### E8 · Coze Studio（开源版）—— 「资源」四/五分类 + PAT 鉴权 + 一条官方自陈的越权警告
来源：<https://raw.githubusercontent.com/coze-dev/coze-studio/main/README.md>

- 资源清单原文："In Coze Studio, **workflows, plugins, databases, knowledge bases, and variables are collectively referred to as resources**."；功能表 "Develop resources — Support creating and managing the following resources: **Plugins / Knowledge bases / Databases / Prompts**"。
- Agent 侧原文："Build agent — Build, publish, and manage agent · **Support configuring workflows, knowledge bases, and other resources**"（→ 「agent 里应关联哪些资源」的直接同类答案，与 S15 同题）。
- 架构原文：后端 Go、前端 React+TS、"**microservices** … **domain-driven design (DDD)**"。
- API 鉴权原文："The Coze Studio Community Edition API and Chat SDK are authenticated using **Personal Access Token**."
- **⚠ 最有价值的一条反面证据（原文直陈）**："If you want to deploy Coze Studio in a **public network environment** … security risks include account registration functions, Python execution environments in workflow code nodes, Coze Server listening address configurations, SSRF, and **some horizontal privilege escalations in APIs**."
  → 同类栈（自托管 + 弱身份）在**有了资源分类与 PAT 之后仍然水平越权**，佐证「Team 建在不可信身份上=假闸门」。
- ⚠ 未联网验证：Coze 商业版「团队空间/企业版席位」正文未取到（SPA）；本条不作为设计依据。

---

## 2. 逐候选对照（① 的 14 个候选 × 竞品）

| 候选 | 产品 · 做法（可核对 E#） | 可借鉴 | 不可取 / 坑 |
|---|---|---|---|
| K1 Team=顶层容器 | Dify workspace（E1）：一切资源属 workspace，App **继承** workspace 的模型配置；容器内含 Billing | 「一个容器 + 默认值继承」把 Agent 装配成本一次配置处处可用，正对用户原话「team 管哪些资源」 | Dify 硬编码"每账号只能建 1 个 workspace"→ 顶层唯一不等于唯一层；K8s 明说**别为细微差异新建隔离层，用 labels**（E4） |
| K2 Team=配额边界 | K8s ResourceQuota（E4）：按 namespace 限**聚合用量** + 限**对象数量**（`count/xxx`），超限**控制面 403 + 说明哪条约束**；Langfuse Spend Alerts（导航可见） | 「聚合 + 对象计数 + 拒绝时说明原因」三件套；配额改动**不追溯已建资源**（我们 token 硬限当前是执行中判定，需同语义） | 配额是**绝对值**不随容量自动扩、超卖时**先到先得**、且要**另写 controller** 才有比例/弹性——我们限流还在进程内存（`CLAUDE.md` S4 事实），照抄必翻车 |
| K3 Team=授权对象（不拥有资源） | Langfuse（E2）：org 级角色默认 + **project 级角色覆盖** + `None` 角色 + 权限点（`members:CUD`/`projects:create`） | 「继承 + 例外覆盖」两层，比在我们 16 张表上逐表加 ACL 便宜得多；"只能授予 ≤ 自己角色" 一行堵住权限抬升 | Langfuse 项目级细粒度是**企业付费档**（E2）：把能力做成档位却缺 enforcement = 有界面没表的老毛病 |
| K4 Team 吞掉 Domain | K8s：namespace **就是**租户边界，因为 apiserver+RBAC+admission 强制它（E4） | — | **不可取**：我们的 `Domain` 是 4 字段壳、无强制层（`domain.py:8-14` + `CLAUDE.md`），改名不产生隔离；且 namespace 在 K8s 里承担的语义已被 `Agent.domain_id` 的路由用途占用（`agent.py:22`） |
| K5 Team=运行期分组 | AutoGen teams（E5）、CrewAI Crew/Process（E6）、MAF group collaboration（E7） | 执行协作组是**预设/策略**，不是资产：预设枚举（round-robin/selector/swarm/supervisor）正好挂在我们编排实例上（`orchestration.py:16-28` 已有 yaml+edges+agent_ids） | AutoGen 的 team **有状态**（history 除非 `reset`）、`run` 中止抛 `CancelledError`——与我们「期望状态+reconcile」模型语义冲突，不能把 team 当持久业务实体存 |
| K6 Project 升格为 Team 容器 | Langfuse（E2）：org 与 project **分层**，project 只"分组数据 + 承载角色粒度"；Dify（E1）：workspace 与 app 分层 | project 保持「工作/数据分组」语义，团队另层——**与 `project.py` 现状（requirement/agent/workflow/visibility）吻合** | 用 Project 兼作租户：Dify/K8s 都不这么干；且我们 `user.project_ids` 已经在这么混（`auth.py:243-245`）——是待清除的技术债而非可扩方向 |
| K7 只建成员表+多态 ACL | Langfuse 权限点、n8n "创建时选个人空间 or 项目"（E3） | 归属用 `(owner_kind, owner_id)` 二元组表达，个人/团队同构，迁移最省 SQL | 用户原话要的是「team 可以管理哪些资源/实体」——纯 ACL 表在界面上**没有"团队"这个可点开的东西**，答不了产品诉求 |
| K8 两义分词 | CrewAI 分得最干净（Crew/Flow/企业平台三层，E6）；MAF 干脆不叫 team（E7）；AutoGen 的 team 只指运行期（E5） | 组织层 **Team/空间**、执行层 **Crew 或「编排实例 + 协作预设」**，两词两表两页，画布不改名只加字段 | 一个词两义（我们的现状风险：编排文档与产品文档里「多 Team 协作 harness」已混用，见 `COMPETITIVE-RESEARCH-*.md` 标题） |
| K9 Team=Agent 装配根（继承） | Dify（E1）："create an app → **inherits** the workspace's model configurations"；n8n 凭据建在项目里（E3） | 模型 Key/工具/知识源在团队层配置一次，Agent 继承 → 直击 `agent.py:18-21` 每 Agent 自带 provider+key+`api_key_encrypted` 的密钥扩散 | 继承必须可**回溯**：Dify 是"配置一次全空间可用"，但没有个人覆盖层——我们要保留 Agent 级覆盖，否则团队换 Key 全站炸 |
| K10 Team=席位/商业单位 | Dify 1/3/50 席位档（E1）；Coze 企业版席位 ⚠**未联网验证** | 席位=**可选**的套餐字段，别当设计内核 | 我们是可自托管的开源平台：把席位做成硬闸=伪需求（`CLAUDE.md` §1.4 已列"多租户计费"为不做） |
| K11 Team=虚拟视图（不建表） | 无竞品先例：Dify/Langfuse/n8n/GitHub 全部是**实体成员表** | 只借其"低成本试点"思路做**只读页**（先聚合 `owner_id` 反查） | 视图无法承载配额/审批/成员，等于把议题重新挂回去；作为**第 0 步 UI 试点**可，作为终态不可 |
| K12 Team=审批与闸门主体 | Langfuse `members:CUD` 权限点 + 权限变更审计（E2）；n8n End-user credential（E3） | 审批人按「团队角色」解析（谁能批 dangerous 级），而不是写死 `human_approvals.owner_id` 单值（`human_approval.py:14`） | End-user 凭据模式**要求可信身份**（n8n 只在 Enterprise 开）；我们 `X-User-Id` 自述未修（`main.py:196-199`）→ 现在做审批人=可伪造审批 |
| K13 Team=知识产物 `.specs/` 读写边界 | 无直接竞品（我们的特有一等数据） | 可借 n8n「创建即定归属」——change 目录建时就带团队归属，而不是事后补 | 与 R16 人审门重复；先不做，登记为待议 |
| K14 Team=真多租户边界 | Coze Studio 官方自陈**水平越权风险**（E8）；K8s 连"保护 enforcement 对象本身"都要单独配（E4） | 若要做 tenant，必须进 SQL 谓词 + 进凭据作用域 + 保护配额对象自身；「同一不变量两处独立校验」（`CLAUDE.md` 约定）与之同构 | 在 P0-1 身份三连解冻前，Team 只是**账面权限**：任何客户端自称 `X-User-Id: 任意人` 即可读该人全部团队资产——这是硬依赖，不是可选项 |
| —（GitHub ⚠） | org→**team**→repo permission；**未联网验证**（docs.github.com 仅取到导航：可见"组织团队/父团队/子团队/团队维护者/团队可见性/删除团队"等节点存在） | 方向参考：team 是**批量授权单位**（给仓库授权一次而非逐人），层级 team 可嵌套 | 我们 `CLAUDE.md` 已声明 namespace 类比只到"隔离域"层；**嵌套 team** 会立刻把 4 字段壳问题放大成图问题 |
| —（Salesforce ⚠） | Permission Set（在 Profile 之上叠加权限包，不改角色即可加权限）；**未联网验证**（JS 应用抓不到正文） | 方向参考：**权限可叠加、与职务解耦**——对应我们已有 `custom_permissions` 列表（`auth.py:111`） | 不引第二套权限体系：我们已有 `role` + `custom_permissions` 双轨，再加 Team 角色 = 三轨 |

---

## 3. 竞品共性结论（供 ③ 用）

1. **组织团队（a）在同类产品里是「资源归属容器 + 默认值继承 + 席位/计费 + 角色」四合一**（Dify 最典型 E1、n8n 归属时机最干净 E3、Langfuse 分层与覆盖最完整 E2）。四家都**建了成员表**，无一家用视图代替（反 K11）。
2. **执行协作组（b）没有一家把它当资产实体**：AutoGen 是预设、CrewAI 是 Crew/Process、MAF 干脆不用 team 一词（E5-E7）→ 我们已有 `OrchestrationInstance`，b 类应落为**实例上的协作预设字段**，不该新建实体、更不该复用 Team 词。
3. **配额（K2）与凭据（K9/K12）是团队层最被低估的两块**：K8s 把「拒绝时说明哪条约束」和「保护配额对象自身」都写进规范（E4）；n8n 把凭据分成 fixed/end-user 两态并要求可信身份（E3）。
4. **最强反面教训（K14）**：身份不可信时，团队/租户模型只是账面。Coze 开源版**自己写下**"部分 API 存在水平越权"，尽管它已经有完整的资源分类与 PAT（E8）。这条直接决定 S16 的**排程依赖：S3/P0-1 身份三连 → S16 Team**。
