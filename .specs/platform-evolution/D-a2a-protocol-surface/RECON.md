# D-a2a-protocol-surface · RECON（S11 · A2A 协议面 · 差距④）

> **状态**：调研原始事实 · **未过 ⑤ 人审门**（禁进 ROADMAP / 禁立项引用）
> 生成：子 agent 协议调研 · 核实日期 **2026-09-23** · 工具：web_fetch/curl 直连（a2a-protocol.org、github raw、api.github.com、kagent.dev），web_search 禁用
> 引用缩写：`SPEC` = https://a2a-protocol.org/latest/specification/ ｜`PDEF` = https://raw.githubusercontent.com/a2aproject/A2A/main/specification/a2a.proto

## 事实

### 一、版本与治理
1. **规范最新发布版 = v1.0.1（published 2026-05-28）**，仅 3 条 bugfix：HTTP binding 优先 `application/a2a+json`(#1753)、transcoding 错误(#1627)、TaskStatus 取值(#1801)。v1.0.0 = 2026-03-12，v0.3.0 = 2025-07-30。→ 无 v1.1 发布版。https://api.github.com/repos/a2aproject/A2A/releases/latest
2. **规范正文里的协议版本串是 `1.0`**（不是 1.0.1）：`AgentInterface.protocolVersion` 示例 "1.0"；SDK 常量 `PROTOCOL_VERSION_CURRENT='1.0'`。https://raw.githubusercontent.com/a2aproject/a2a-python/main/src/a2a/utils/constants.py
3. `a2a.proto` 被提升为**唯一规范性来源**（v1.0 主题之一）。`SPEC` §1 / https://a2a-protocol.org/latest/whats-new-v1/
4. 官方明确**不规定 curated registry API**（"The current A2A specification does not prescribe a standard API for curated registries"）→ 目录治理仍是留白。https://a2a-protocol.org/latest/topics/agent-discovery/

### 二、AgentCard 与发现
5. **路径 = `https://{domain}/.well-known/agent-card.json`**（RFC 8615；§14.3 IANA 注册 Status: Permanent；资源 MUST 返回 AgentCard）。`SPEC` §8.2/§14.3 + SDK 常量 `AGENT_CARD_WELL_KNOWN_PATH`
6. **必填 8 项**：`name` `description` `supportedInterfaces[]` `version` `capabilities` `defaultInputModes` `defaultOutputModes` `skills`；选填 `provider{url,organization}` `documentationUrl` `iconUrl` `securitySchemes` `securityRequirements` `signatures`。`PDEF`（`[(google.api.field_behavior)=REQUIRED]`）
7. `AgentInterface = {url*, protocolBinding*(JSONRPC|GRPC|HTTP+JSON), protocolVersion*, tenant?}`；**首个条目=优先**；设了 tenant 则客户端 **MUST** 在每个请求体回显该值。`SPEC` §8.3.1/§8.3.2
8. `AgentCapabilities = {streaming?, pushNotifications?, extendedAgentCard?, extensions[]}`；`AgentExtension={uri,description,required,params}`；运行时协商用 **`A2A-Extensions` 头**，版本用 **`A2A-Version` 头**；扩展挂载点=Message/TaskStatus message/Artifact 的 `extensions[]` + `metadata{<URI>: payload}`。`SPEC` §4.6.1/§4.6.2/§14.2
9. `AgentSkill` 必填 `id/name/description/tags`，选填 `examples/inputModes/outputModes/securityRequirements`（**纯描述性**，规范称其为 "largely a descriptive concept"）。`PDEF`
10. 卡片签名 = **JWS(RFC 7515) + JCS 规范化(RFC 8785)**，`AgentCardSignature{protected*,signature*,header}`。`SPEC` §8.4
11. 缓存：`Cache-Control: max-age` + `ETag`（取 card `version` 或内容哈希），支持条件请求。`SPEC` §8.6 / agent-discovery 页

### 三、Task 生命周期与数据模型
12. **`TaskState` 共 9 值**（含 `TASK_STATE_UNSPECIFIED`）：`SUBMITTED` `WORKING` `COMPLETED` `FAILED` `CANCELED` `INPUT_REQUIRED` `REJECTED` `AUTH_REQUIRED`；**终态 4**（COMPLETED/FAILED/CANCELED/REJECTED）+ **中断态 2**（INPUT_REQUIRED/AUTH_REQUIRED）。JSON 值 = proto 枚举原名（ProtoJSON / SCREAMING_SNAKE_CASE，ADR-001）。`PDEF` + `SPEC` §4.1.3/§5.5
13. **执行模式**：`SendMessageConfiguration.returnImmediately` 默认 `false` = MUST 阻塞至终态**或中断态**才返回；`true` = 立即返回（可返回 WORKING/INPUT_REQUIRED），由调用方 poll/subscribe/push 取更新；对直接返回 Message 与 streaming 无效。`SPEC` §3.3.3
14. **Task Immutability**：终态后不可重启，追问/细化=同 `contextId` 的**新 Task** + `Message.referenceTaskIds`；产物版本变更链接由**客户端**维护（明确不属协议）。https://a2a-protocol.org/latest/topics/life-of-a-task/
15. 结构（`PDEF`）：`Task{id*, contextId, status*, artifacts[], history[], metadata}`；`TaskStatus{state*, message, timestamp}`；`Message{messageId*, role*(ROLE_USER|ROLE_AGENT), parts*, contextId?, taskId?, metadata, extensions[], referenceTaskIds[]}`；`Part` oneof `text|raw(base64)|url|data(JSON)` + `filename/mediaType/metadata`；`Artifact{artifactId*, name, description, parts*(≥1), metadata, extensions[]}`；`StreamResponse` oneof `task|message|statusUpdate|artifactUpdate`
16. **ListTasks 为 v1.0 新增**（v0.3 无）：cursor 分页、`pageSize` 默认 50 上限 100、可按 `contextId/status/statusTimestampAfter` 过滤、`includeArtifacts` 默认 false。`PDEF` + whats-new 页
17. 错误码表（`SPEC` §5.4）：`TaskNotFound` -32001/404、`TaskNotCancelable` -32002、`PushNotificationNotSupported` -32003、`UnsupportedOperation` -32004/400、`ContentTypeNotSupported` -32005、`InvalidAgentResponse` -32006、`ExtendedAgentCardNotConfigured` -32007、`ExtensionSupportRequired` -32008、`VersionNotSupported` -32009

### 四、transport bindings
18. **§5.3 方法映射表**（`SPEC`）：核心 11 个操作，**v1.0 JSON-RPC method 字面名与 gRPC 同名**：`SendMessage` `SendStreamingMessage` `GetTask` `ListTasks` `CancelTask` `SubscribeToTask` `Create/Get/List/DeleteTaskPushNotificationConfig` `GetExtendedAgentCard`；REST：`POST /message:send`、`POST /message:stream`、`GET /tasks/{id}`、`GET /tasks`、`POST /tasks/{id}:cancel`、`/tasks/{id}:subscribe`、`/tasks/{id}/pushNotificationConfigs[/{configId}]`、`GET /extendedAgentCard`；三种 binding **功能等价 MUST**。`PDEF` 另给每种路径的 `/{tenant}/…` 变体
19. ⚠️ **规范内部不一致**：§5.3 表写 SubscribeToTask 的 REST 为 **POST**，而 `a2a.proto` 注解是 **`get: "/tasks/{id=*}:subscribe"`** —— 以 proto 为准还是表为准，落地前需定。
20. **v0.3→v1.0 破坏性改名（移动靶实据）**：`message/send`→`SendMessage`；流事件 `kind` 判别字段**删除**（改用 JSON 成员名）；`TaskStatusUpdateEvent.final` **删除**；`supportsAuthenticatedExtendedCard`→`capabilities.extendedAgentCard`；`preferredTransport`+`additionalInterfaces`→`supportedInterfaces[]`；`protocolVersion` 从 AgentCard 下沉到每个 AgentInterface。https://a2a-protocol.org/latest/whats-new-v1/
21. 多租户/多 Agent 路由：官方给**三种可组合方式**（URL 子路径 / 认证头 / body `tenant`），且声明"不规定具体实现"。https://a2a-protocol.org/latest/topics/multi-tenancy/

### 五、streaming 与 push
22. **SSE**：卡片 `capabilities.streaming=true`；`SendStreamingMessage` → `200` + `Content-Type: text/event-stream`，每帧 `data` 是完整 JSON-RPC 响应（含 `StreamResponse`）；**到终态或中断态（含 INPUT_REQUIRED）服务器关流**；断线用 `SubscribeToTask` 重订阅；允许多条并发流。`SPEC` §9.4.2 + https://a2a-protocol.org/latest/topics/streaming-and-async/
23. **Push**：`capabilities.pushNotifications=true`；`TaskPushNotificationConfig{url*(HTTPS),id,taskId,token?,authentication{scheme*,credentials?}}`，可在 SendMessage 内联或 `CreateTaskPushNotificationConfig`；**触发时机由服务器决定**（典型：终态 / input-required / auth-required）；**payload 即 StreamResponse**；客户端一般收到后再 `GetTask`。安全：服务器 MUST NOT 盲信 webhook URL（SSRF/DDoS → 域名白名单/挑战应答/egress 控制）、MUST 按声明 scheme 向 webhook 认证；webhook 侧 MUST 验证来源（JWT+JWKS、`jti`/时间戳防重放）
24. 无 `final` 后，"流结束"改由 **binding 自身的连接关闭机制**表达（见 #20/#22）。

### 六、SDK：a2a-python
25. **最新 release v1.1.5（2026-09-21）**，3 个 bugfix（protobuf 7 兼容 #1260、`FieldDescriptor.label` 弃用 #1158、ListTasks datetime 越界 #1220）。https://api.github.com/repos/a2aproject/a2a-python/releases/latest
26. **版本对应**：README 明示"实现 spec **1.0**，对 **0.3** 提供兼容模式"，且 **1.0/0.3 × JSON-RPC/HTTP+JSON/gRPC 的 client 与 server 全 ✅**；Python ≥3.10。extras：`http-server`(starlette+sse-starlette)、`fastapi`、`grpc`、`telemetry`(OTel)、`sqlite/postgresql/mysql/sql`、`encryption`、`signing`(PyJWT)、`db-cli`(alembic)。https://raw.githubusercontent.com/a2aproject/a2a-python/main/README.md + `pyproject.toml`
27. **服务端最小面（存在，且是 Starlette Route 级）**：`FastAPI()` + `add_a2a_routes_to_fastapi(...)`，由 `create_agent_card_routes(agent_card)` + `create_jsonrpc_routes(handler, rpc_url)` + `create_rest_routes(handler)` 组成；`DefaultRequestHandler_v2(agent_executor, task_store, agent_card[, push_config_store, push_sender, extended_agent_card])`；`InMemoryTaskStore` 可直接用。https://raw.githubusercontent.com/a2aproject/a2a-python/main/src/a2a/server/routes/__init__.py 、`.../routes/agent_card_routes.py` 、`.../request_handlers/default_request_handler_v2.py`
28. 官方样例体量：`samples/hello_world_agent.py` **279 行**（含 gRPC 与 v0.3 兼容装配），其中 `AgentExecutor` 业务逻辑约 60 行（`TaskUpdater.start_work/add_artifact/complete`）。https://raw.githubusercontent.com/a2aproject/a2a-python/main/samples/hello_world_agent.py
29. **HITL 语义在 SDK 契约里已写实（P1-12 的直接支撑）**：`AgentExecutor` docstring 规定——executor 发布 `TASK_STATE_INPUT_REQUIRED` 的 `TaskStatusUpdateEvent` 后 **`return` 让出控制权，"The request will resume once user input is provided"**；`AUTH_REQUIRED` 分 in-bound（return 后框架重调 `execute`）与 out-of-bound（不 return，等外部认证）；取消时框架 `CancelledError` + 显式调 `cancel()`。⚠️ 同文件 docstring 出现 `TaskState.TASK_STATE_ERROR`，而 proto **无该枚举值** → 官方 SDK 文档已漂移。https://raw.githubusercontent.com/a2aproject/a2a-python/main/src/a2a/server/agent_execution/agent_executor.py

### 七、实装证据（谁真做了）
30. **微软 agent-framework：库级 + 托管级**。`dotnet/src/Microsoft.Agents.AI.A2A`（`A2AAgent.cs`/`A2AAgentOptions`/`A2AContinuationToken.cs`/`A2ACardResolverExtensions`…）+ `dotnet/src/Microsoft.Agents.AI.Hosting.A2A.AspNetCore/A2AEndpointRouteBuilderExtensions.cs`（对外暴露 server）+ `python/packages/a2a/agent_framework_a2a`（`_a2a_executor.py`/`_agent.py` + 单测）；.NET 样本覆盖 AsFunctionTool / PollingForTaskCompletion / ProtocolSelection / Skills / StreamReconnection；README 托管章列 A2A。核 09-23（tree via api.github.com，共 6,662 路径）
31. **Google ADK Python：库级**。`src/google/adk/a2a/`（40 路径，含 `agent/_remote_a2a_agent.py`、`converters`、`interceptors`）+ 样本 `contributing/samples/a2a/{a2a_basic,a2a_auth,**a2a_human_in_loop**}`；⚠️ 其 README 无 "A2A" 字样（grep 0 命中）→ 能力在代码层。核 09-23
32. **kagent：A2A 是主干**。`go/adk/pkg/a2a/{executor,agentcard,server,hitl}.go`、`python/packages/kagent-core/src/kagent/core/a2a/_hitl.py`、`docs/architecture/{a2a-gateway,a2a-subagents}.md`；**HITL 扩展 URI 常量** `HITLExtensionURI="https://kagent.dev/extensions/hitl/v1"`（`required=false`）。核 09-23
33. **kagent HITL 语义一页（规范正文=仓库 `docs/architecture/human-in-the-loop.md`，95 行）**：①Agent Card 广播该 URI，客户端用标准 `A2A-Extensions` 头激活；②agent 发 **`input-required` 状态，其 status message 的 `metadata[<URI>]` 承载请求**，message 的 `extensions[]` 也带上该 URI；③网关在**该边界持久化并静默 Actor**；④客户端向 **同一 task + context** 发结构化决定，运行时适配器**恢复已存储的 continuation**——原文 "**No HITL RPC, session, or second task model exists … it is not a prompt asking the model to reconstruct the pending operation**"；⑤两形态：`tool_approval_request/response`（逐 call 批准+拒绝原因）、`ask_user_request/response`（id + answers 数组），并支持 `nested`（子 agent 的 `task_id/context_id` 关联）；⑥服务器拒绝：错 task/context、漏决定、重复 id、答已失效操作。https://raw.githubusercontent.com/kagent-dev/kagent/main/docs/architecture/human-in-the-loop.md ｜⚠️ **`https://kagent.dev/extensions/hitl/v1` 作页面当前 HTTP 404**（核 09-23）——它只是标识符，不可当文档链接引用
34. **ACP 已归档（一手出处）**：`i-am-bee/acp` **`archived: true`**、最后 push **2025-08-25**、1,015★；README 顶部横幅原文 "**ACP is now part of A2A under the Linux Foundation**"。https://api.github.com/repos/i-am-bee/acp + https://raw.githubusercontent.com/i-am-bee/acp/main/README.md
35. **生态与验证工具**：官方 6 语言 SDK（Python/Go/JS/Java/.NET/Rust）+ `a2a-inspector` + `a2a-tck`；partners 页 ~150 条含 AWS/Cisco/IBM Research/Microsoft/Salesforce/SAP/ServiceNow/Solo.io/LangChain/LlamaIndex/UiPath/Zoom。https://a2a-protocol.org/latest/roadmap/ · /latest/partners/
36. **在途移动靶（roadmap 页标注 Last updated: Sep 15, 2026 + GitHub API 实查 09-23）**：`#1991` [Epic] Coherent Task History（timeline 细化/事件过滤/working 态收到 agent 消息的规则）**open**（2026-06-25 建）；`#1995` [Epic] Bidirectional streaming **open**；`#2149` "feat: add elicitations for additive input-required (ADR-002)" = **draft PR，2026-08-18 开、2026-09-22 关闭且 `merged_at=null`（未合并）**；`#2143` [Extension Proposal] A202 delegated authority/negotiation **open**（2026-08-15）。⚠️ **修正我们文档口径**：Elicitation 不是"在途 PR"，而是"草稿 PR 已未合并关闭、议题仍挂 roadmap"；`#2149` 正文的关键设计=**不改 `TaskState`**（"The protocol does not mandate a mapping onto TaskState"，默认约定「至少一个 elicitation 为 BLOCKED 时置 INPUT_REQUIRED」）→ **core 的 INPUT_REQUIRED 语义不受其影响，受影响的只是扩展载荷形态**

### 八、AgentFlow 侧事实（映射依据，代码核实 09-23）
37. 后端 FastAPI `main:app`（uvicorn :8000）；`routes/` 31 个 router；模型：`Agent(name,description,runtime,model_*,domain_id,workflow_id/workflow_ids,visibility,status='standby',gate_pre/post_check)`、`Workflow(spec_json,status draft|published|running|completed|failed|stopped)`、`Project(agent_id,workflow_id,status pending|running|completed|error|stopped|cancelled)`、`HumanApproval(agent_id,owner_id,task_id,status pending|approved|rejected,form_data,response_data,created_at,resolved_at)`、`Domain(id,name,owner_id — **仅 4 字段、非安全边界**)`、`Tool(type plugin|skill|mcp, permissions, gate_*)`
38. **全仓无 `/.well-known`、无任何 A2A 代码**（grep `well-known` 0 命中）；`routes/gateway_api.py` 自述"统一路由入口（K8s-inspired），用户只声明 capability，网关跨域选最优 Agent"——与 A2A 的多 Agent 路由问题同形；三处关键状态在进程内存（调度队列/限流/退避）→ **多副本下 task 续跑不成立**；`get_current_user` 缺身份回退 admin（fail-open）→ **任何对外 A2A 端点会直接落到 admin 身份**
39. 原型页现状：`PRODUCT-DESIGN.html` §6 有 **p0–p25**（p7 工具市场 · p4 Agent 详情 · p3 三层域树 · p17 审批中心 · p21 收件箱）；**p26/p27 尚不存在**（STATE.md 记为第 4 轮目标产物）

## 映射表（AgentFlow 概念 → A2A 概念）

| AgentFlow | A2A | 依据/口径 | 备注 |
|---|---|---|---|
| 一个 `Agent`（或对外发布的 workflow） | **Remote Agent = AgentCard + A2A Server**（HTTP 端点、内部对客户端**不透明**） | key-concepts 页；`SPEC` §4.4.1 | 一个 Agent 一张卡；一个域内多 Agent 可共用端点（#21） |
| `Agent.name/description`、平台 `version` | `AgentCard.name/description/version(+provider,iconUrl,documentationUrl)` | #6 | 必填直映射 |
| 能力分组 / `Workflow` 或角色市场条目 | **`AgentSkill`**（`id/name/description/tags/examples/inputModes/outputModes`） | #9 | **描述性**概念，协议不校验真伪；`tags` 即我们的能力标签 |
| 编排的一次运行 = `Project` 行 | **`Task`**（`id`=taskId，`contextId`=会话） | #15 | 建议 `taskId` 直接用/映射 `HumanApproval.task_id` 与 run 主键 |
| `Project.status` 六态 | `TaskState`：pending→`SUBMITTED`、running→`WORKING`、completed→`COMPLETED`、**error→`FAILED`**、**stopped/cancelled→`CANCELED`** | #12/#13 | ⚠️ 需新增映射层：A2A 无 `error/stopped`；`REJECTED` 留给"开局拒接"；`TASK_STATE_UNSPECIFIED` 不外发 |
| 审批挂起（`HumanApproval.status=pending`） | **`TASK_STATE_INPUT_REQUIRED`** + `TaskStatus.message` 携带结构化请求（`Part.data` / 或扩展 `metadata[URI]`） | #12/#13/#29/#33 | 与 P1-12 完全同构；回复=同 task 的 `SendMessage(taskId)` → 续跑（**非重建**） |
| 审批通过/拒绝（approved/rejected） | 同 task 的 `Message{parts:[{data:{…decision}}]}` | #33 两形态 | **拒绝≠`TASK_STATE_REJECTED`**（后者是 agent 不接单）；拒绝后仍跑→`WORKING`，拒绝导致终止→`FAILED`/`CANCELED` |
| 门禁"人批后才走" | `returnImmediately=false` 阻塞至 INPUT_REQUIRED；或 `true` + push 通知 | #13/#23 | 两形态=同步等 vs 挂起+回调 |
| `.specs/` 知识产物（CHANGE/DESIGN/TASK/TEST/REVIEW） | **`Artifact`**（`artifactId/name/parts`，`parts[].url` 或 `text`） | #15 | 产物"最新版可接受"判定**归客户端**，协议不存版本链（#14） |
| 对话中心 / 会话延续 | **`contextId`** + `Message.referenceTaskIds` 做追问与细化 | #14/#15 | 我们无 `contextId` 实体，需新建或用 `conversation_id` |
| `Domain`（隔离域） | **无对应**；最近似 = `AgentInterface.tenant` / URL 子路径 / 认证头（协议不规定实现） | #7/#21/#4 | A2A 无 namespace/RBAC/配额 → **我们的差异化仍在域**，A2A 只提供路由键 |
| `visibility=private/public` + RBAC | `securitySchemes` + `securityRequirements` + **`GetExtendedAgentCard`**（敏感卡片走鉴权扩展卡） | #6/#8/#17 | 官方 MUST：含敏感数据的卡片必须鉴权保护（agent-discovery 页） |
| `gateway_api` 自动路由（capability→agent） | "单端点 + `tenant` 多 Agent" 或 "每 Agent 一卡 + 子路径"，两者皆合规 | #7/#21 | 我们已有跨域选优语义，**A2A 层不抢我们这层** |
| `Tool(type=mcp/plugin/skill)` 工具市场 | **不映射到 AgentCard**——工具是 MCP 的纵向层；A2A `skills` 是 agent 能力自述 | a2a-and-mcp 页/#9 | ⚠️ 叙事红线：别把工具市场条目直接渲染成 A2A skill |
| 审计日志 | 协议无事件模型（`#1991` 正在补 timeline/事件过滤） | #36 | 我们的审计是**超额能力**，不依赖 A2A |

## M0–M2 分档建议

| 档 | 内容 | 成本 | 风险（含移动靶暴露面） | 对"不追协议"纪律的稳定性 |
|---|---|---|---|---|
| **M0 只发静态 AgentCard** | 一个 `GET /.well-known/agent-card.json`（FastAPI 路由 + 由 `Agent/Workflow` 行生成的 dict）；`capabilities` 全 false/省略；`supportedInterfaces[].protocolVersion="1.0"` | **≈1 人日**，零依赖（不引 a2a-sdk）、零协议承诺 | 低。但**卡片即自我宣称**：URL 指向不存在的端点=信誉成本；含内部地址/敏感 skill 的卡片 MUST 鉴权（agent-discovery 页）；版本串 "1.0" vs 发布 tag v1.0.1 的口径要写死，避免被追问 | **最稳**：卡片字段自 v1.0 已冻结，v1.1 在途项不触碰 AgentCard 必填集 |
| **M1 Task 端点最小集** | `SendMessage` + `GetTask` + `INPUT_REQUIRED 挂起→同 task 续跑`（可再含 `CancelTask`）；把 `engine/`+`scheduler` 包成 `AgentExecutor`，`Project/HumanApproval` 适配 `TaskStore` | **≈4–7 人日**（可复用 SDK #27 省 transport 层） | **中高**：① 必须先修 **fail-open 身份回退**（#38）否则外部调用者=admin；② 进程内存态（#38）使**多副本下续跑不成立**（M1 隐含"单副本"承诺）；③ 状态语义需自建映射层（#12 vs #37 六态）；④ Task Immutability 与我们"可重跑"习惯冲突；⑤ 依赖 `a2a-sdk` = 新供应链（v1.1.5 周更级） | **core 层稳定**：INPUT_REQUIRED 是 v1.0 已发布语义，#2149 明确不改 `TaskState` → **不追协议也能对齐**；受其影响的只是扩展载荷形态 |
| **M2 streaming + push** | `SendStreamingMessage`/`SubscribeToTask`（SSE）+ `TaskPushNotificationConfig` + webhook 收发 | **高（≈5–10 人日）**：SSE 长连接与单副本/内存态冲突；push 需**出站 webhook + SSRF 白名单/egress 控制 + JWT+JWKS 签名与防重放**（#23），与"出网 deny"诉求正面冲突 | **最高**：`#1995` BiDi streaming 与 `#1991` timeline/事件过滤均为 **open epic**，`final` 字段已删（#20）→ 流语义正是 v1.1 在改的地方；`proto vs §5.3` 连 subscribe 的 HTTP 方法都不一致（#19） | **不建议做**：现在实现=把 v1.1 的 diff 全吃下来 |

**推荐停档（"不追协议"纪律下）**：
1. **默认 M0**——本轮（第 4 轮）**只做 M0 + 界面标注**：静态卡片是"零协议承诺"的最高杠杆（立刻消除差距④的"无法被发现"，且不与任何在途提案耦合）。
2. **有真实"被外部 Agent 委派"需求时才升 M1-lite**（`message/send` + `tasks/get` + INPUT_REQUIRED 续跑；**不做** ListTasks/SubscribeToTask/push），且以**映射层自证**方式实现——把 P1-12 的状态机接口按 #12/#13/#29/#33 的口径命名与落库（`pending→INPUT_REQUIRED`、审批回复=同 taskId 续跑），**不引 SDK、不承诺 transport**。
3. **M2 明确不做**（写进盯防：等 `#1991/#1995` 出 v1.1 发布版再评估）；`#2149` 已"未合并关闭"，只需盯**是否重开**，因为它只改扩展载荷不改 core → 对 M0/M1-lite 无阻塞。

## 界面落点候选（AgentCard 预览页？p27 集成面）

- **A（首推 · 零新页）p4 §6.4 Agent 详情 增「A2A 卡片」页签**：卡片=同一 Agent 对象的**对外视图**，与探针时间线并列；只读 JSON + 复制按钮 + **灰态标注**（如 `capabilities.streaming` 显示"未启用"），避免卡片宣称超过实现。
- **B p7 §6.7 工具市场 / p14 §6.14 角色市场**：**不**渲染成 A2A skill（叙事红线见映射表末行）；市场详情可加"该 Agent 的 A2A 卡片"跳转，复用为**目录治理留白**的展示面（官方不规定 registry → 我们自定，卡片只读、目录权限走我们 RBAC）。
- **C p3 §6.3 三层域树**：在域节点标注其**卡片端点/tenant 键**（把"隔离域"翻译成"A2A 可见的路由单元"），但须显式写"tenant 仅是路由键，不等于隔离边界"（#7/#21 + `Domain` 非安全边界事实）。
- **D 新页候选 p27**：若第 4 轮确定新增，建议 **p27 = 对外集成面**（AgentCard 预览 + 端点/版本/鉴权声明 + "协议实现=未启用"开关位），**p26 留给身份/门禁三连**；形态遵守 §6.0 全局交互纪律与"规划原型 · 未实现"chip 约定（现有 p20–p25 均用该 chip）。⚠️ p26/p27 归属需与主议题 S8–S13 分配对齐，**不由本议题单方占用**。
- **E p17 审批中心 / p21 收件箱**：审批条目的**状态标签旁并列显示 A2A 语义映射**（`pending ⇄ input-required`、"回复=续跑同一 task"），正是 P1-12 的可见落点，零代码改动。

## 未达清单
1. `https://kagent.dev/extensions/hitl/v1` **页面 404**（核 09-23）→ 改引 kagent 仓库 `docs/architecture/human-in-the-loop.md`；**我们文档中把它当"可访问文档 URL"的引用需全部更正**。
2. LF AI & Data 的 ACP→A2A 合并公告原文**未直连**（`lfaidata.foundation` 不在本次允许域名清单内）→ 归档结论改以 GitHub API `archived:true` + ACP README 横幅为据。
3. `api.github.com` **未带 token，已出现限流/响应截断**（一次 `/tags` 返回非 list、一次 issue 正文截断）→ 未核：**A2A 仓库 tag 全集**（v1.1.0-rc 之类是否存在），仅确证"最新 release=v1.0.1"。
4. `SPEC` §3.6 版本协商全文、§13 安全考量全文**未逐字读**（长页截断）；`A2A-Version`/`VersionNotSupportedError` 有事实，但服务端 MUST 的完整清单未核。
5. **a2a-go / a2a-js / a2a-java / a2a-dotnet / a2a-rust 的 release 与 spec 版本对应**未查（只查了 Python）。
6. `application/a2a+json` 的 IANA 注册**状态字段**未逐字核（仅读到 v1.0.1 修复条目与示例用法）。
7. §5.3 与 proto 的 `SubscribeToTask` HTTP 方法冲突（#19）**未在任何 issue/ADR 中找到裁定**→ 落地前需实测定或选 binding 规避。
8. `#2143`（A202 delegated authority 扩展提案）**正文细节未读全**，仅确证 open + 标题。
9. **除 kagent 外的第二家"HITL over A2A 扩展"实装**（微软 agent-framework 是否有等价 continuation-token 语义、UiPath/ServiceNow 是否用该扩展）**未核实**。
10. A2A 官方是否存在**已批准的第三方扩展目录页**（登记 `kagent.dev/extensions/hitl/v1` 之类的清单）未达 → 影响我们"扩展 URI 能否直接引用为外部承诺"的判断。
