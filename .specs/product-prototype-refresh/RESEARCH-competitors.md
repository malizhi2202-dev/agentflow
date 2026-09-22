# RESEARCH — W2 竞品逐项深挖与能力缺口去向表

- **Change ID**: product-prototype-refresh ｜ **工作包**: W2（竞品调研）｜ **深挖执行**: 1-requirement（按 CHANGE W2 与验收线 2 的约定，判定发生在本阶段出口）
- **日期**: 2026-09-22 ｜ **现状锚点基准**: `@.specs/product-prototype-refresh/BASELINE-code-facts.md`
- **取证通道与局限（必须先读）**：本运行时的 `web_search` 工具不可用（endpoint 未配置，返回空），全部事实改为**直连一手来源**：产品官网 HTML + 官方仓库 `README.md`（raw.githubusercontent）+ GitHub Search API。未做全站爬取、未读第三方评测 → 能力面以「官方自述」为限；这正是 §归属字段要防的失真来源，**竞品自述一律不得当作本项目已有能力**。
- **可行性粗判基线（CHANGE 风险条）**：FastAPI 单体（`backend/config.py:5-6`：HOST 默认回环地址、PORT 8000）+ SQLite 默认（`backend/database.py`）+ 单机部署、无容器编排、无执行沙箱（BASELINE §4-S6/S7）。凡需常驻多进程/隔离执行/向量存储者，粗判为「需架构决策」。

## 1. 点名产品消歧结果（R6.2：查不到即标待确认）

| 点名 | 消歧结论 | 一手来源 |
|---|---|---|
| **Multica** | ✅ 唯一确定：开源「人 + Agent 同队」的项目平台（本项目即运行于其上，属同源参照） | 官网 https://multica.ai （title: "Multica — Project Management for Human + Agent Teams"）；仓库 https://github.com/multica-ai/multica （GitHub Search API 2026-09-22：51,053 stars，desc "Make humans and AI agents work as one team — open-source and self-hostable"） |
| **OpenWorker** | ✅ 唯一确定：本地优先的通用 AI 打工人桌面端（Andrew Ng 名下仓库） | 官网 https://openworker.com （desc: "AI agent that runs on your own computer… checking in before anything important"）；仓库 https://github.com/andrewyng/openworker （18,120 stars，homepage 字段即 openworker.com，故归属确定） |
| **AgentOS** | ⚠️ **无法唯一确定**，三个互斥候选：① https://agentos.com = 英国房产经纪 CRM（与 AI 编排无关，**已排除**）；② https://rivet.dev/agentos / https://agentos-sdk.dev = "Give agents an operating system as a library"（仓库 https://github.com/rivet-dev/agentos，4,650 stars）；③ https://ag2.ai 自称 "The Open-Source AgentOS"（https://github.com/ag2ai/ag2，4,949 stars）。**人工未指明 → 待确认**；本轮取候选 ②（与本项目「Agent 运行时/隔离/编排」语义最接近）做能力参照，结论只进 §2 的 G3/G11 两行 | 见左 |
| **Buzzz** | ❌ **未定位到同类产品**（待人工提供官网或材料）：`buzzz.ai` / `buzzz.dev` / `buzzz.app` / `usebuzzz.com` DNS 均不可解析；https://buzzz.io 可解析但内容为 "a faster way to turn leads into customers"（营销线索工具，非 Agent 平台）；GitHub 搜索 `buzzz` 299 个仓库无同领域命中（最高 18★，韩文位置推荐服务） | 见左 |
| 「等」的扩展候选 | 见 §3，交人工一次拍板（G1 🟫 建议） | — |

## 2. 能力缺口清单（逐条带来源 / 归属 / 适配初判 / 可行性粗判 / 去向）

去向三选一强制（CHANGE 验收线 2）：**融入原型** ｜ **登记议题（需代码）** ｜ **否决（带理由）**。

| # | 竞品能力（谁） | 一手出处 | 本项目现状（锚点，BASELINE §4） | 归属 | 适配初判 + 理由 | 可行性粗判（单体+SQLite） | **去向** |
|---|---|---|---|---|---|---|---|
| G1 | 逐运行 Token/成本台账，可按 Agent 与 issue 汇总（Multica "Token usage"） | multica.ai/docs/tasks · README「Stay in the loop」 | `routes/token_usage.py:9-35` 正则扫 `.specs/*-SUMMARY.md` 文本 = 伪账（S3）；`llm_providers.py` 各 provider 已返回 `prompt/completion/total_tokens` | 缺失-竞品建议新增 | **值得引入**：原料已在手（provider 返回 token + `runtime_tracer.trace_model_call`），只缺落库与聚合 | 轻：新增 1 张表 + 在既有 trace 点写库，SQLite 足够 | 融入原型（作为规划视图）+ 登记议题（需代码）`token-cost-ledger` |
| G2 | 任何 MCP 工具即插即用 + 逐工具授权（OpenWorker "Any tool reachable over MCP plugs in too, with per-tool control"） | openworker.com/README「What it can do」 | `models/tool.py:13` 有 `mcp` 类型枚举，但 `routes/tools_api.py:89-91` 只生成骨架 zip 下载（S4） | 缺失-竞品建议新增 | **值得引入**：平台定位即「工具库 + 编排」，无真实 MCP 运行面则工具域是三张标签 | 中：Python `mcp` 客户端可在单体进程内跑；需新增依赖与超时/失败治理 → 不触架构决策，但需 DESIGN | 登记议题（需代码）`mcp-tool-runtime`（原型只画「已建模 / 待接入」状态，不写成已具备） |
| G3 | Agent 自带沙箱：跑命令、装软件、动文件；权限逐项 deny-by-default（Dify "sandbox of their own" · agentOS "granular permissions / VM isolation"） | https://github.com/langgenius/dify README Key features 5 · https://github.com/rivet-dev/agentos README Features-Security | 全仓 backend 无 `docker/sandbox/subprocess` 执行路径（S7） | 缺失-竞品建议新增 | **观望（本次不引入）**：与「单机 FastAPI + SQLite、无容器」容量边界正面冲突，且触公共契约与部署形态 | 重：需隔离运行时（VM/WASM/容器）+ 新架构 → 必走 G2 门与 ADR | 否决（本 change 内）+ 登记议题（需代码）**架构级** `agent-execution-sandbox` |
| G4 | 审批阶梯「挣得的自主权」：硬地板（不可逆操作永远人工）→ 一次性批准 → standing rules → allowlist；auto-approve 由评审模型放行、连续否决触发熔断（OpenWorker "Governed by design"） | openworker.com/README「Governed by design」 | 零件齐：`engine/gate_registry.py`（SQL 注入/PII 脱敏/输出 schema/参数类型）、`routes/human_approval_api.py:19,37,59`、连线策略含 `human-approval`（`engine/yaml_schema.py:82`） | 部分已有 | **值得引入（高）**：把"点状审批"升级为"分级授权 + 不可逆地板 + 熔断"，正对管控平台定位，且**是安全叙事而非炫技** | 中：策略表 + 引擎判定，SQLite 可承载；评审模型走既有 provider 通道 | 融入原型（在门禁/审批视图呈现三档）+ 登记议题（需代码）`approval-ladder-autonomy` |
| G5 | 统一收件箱：无人值守运行的请求停在 inbox，"该找人时找人，而不是每一步都 ping"（Multica Inbox · OpenWorker "asks park in an inbox"） | multica.ai/docs/inbox · README「Stay in the loop」 | 分散三处：`AlertsPage`（告警）、`ApprovalPage`（审批）、`routes/changes.py`（需人工的门禁），无跨域聚合、无"需要你处理"单一入口 | 缺失-竞品建议新增 | **值得引入（高性价比）**：纯聚合视图，直接降低管控台学习成本 | 轻：一个只读聚合端点 + 一页（前端 `pages/` 新增，属新 change） | 融入原型（新增 IA 一级入口）+ 登记议题（需代码）`unified-inbox` |
| G6 | 可复放执行日志：每个 tool call / command / error 带时间戳可回放；统一 transcript 格式（Multica Execution log · agentOS "Automatic persistence… replayable"） | multica.ai/docs/tasks · github.com/rivet-dev/agentos README Features-Agents | `services/runtime_tracer.py:15,54,65,92` 已在写 trace（`trace_spans` 表），查看组件 `TraceViewer.tsx` **零挂载**（BASELINE §3、D3） | 部分已有（半成品） | **值得引入（最低成本）**：埋点与表都在，缺的只是把已有查看器接回界面 | 轻：接线工作，不改数据模型 | 融入原型 + 登记议题（需代码）`trace-viewer-reattach` |
| G7 | Skills 沉淀闭环："解决过一次 → 全团队可复用的 playbook"（Multica Skills） | multica.ai/docs/skills · README「Build the team」 | `tool.type` 含 `skill` 但为元数据 CRUD（`routes/tools_api.py:34`）；三张市场（工具/模板/角色）无"从一次成功运行生成"路径 | 部分已有 | **值得引入（中）**：与"知识产物是一等数据"的既有约定同构，闭环缺的是运行→资产这一步 | 轻→中：从 trace/产物生成草稿，复用既有 `.specs/` 读写路径（`config.get_specs_dir()`） | 融入原型 + 登记议题（需代码）`skill-capture-from-run` |
| G8 | 定时/无人值守自动化的完整语义：cron 报表、频道常watch，**运行留全量 transcript**（Multica Autopilots · OpenWorker "Standing automations" · agentOS cron+webhooks） | multica.ai/docs/autopilots · README「Hand off the work」 | `models/scheduled_task.py:8-14` 有 `cron_expr` + `services/scheduler_service.py`（S8，README 功能模块层未记载） | 本项目已有 | **值得写准（不是新能力）**：W1 新发现，README/原型此前未呈现；缺的只是"运行记录可回看"这一点与 G6 同题 | 已有，零改动 | 融入原型（归属=已有，锚点已指） |
| G9 | 双向渠道触发：在 Slack 里 @ 一下就开会话干活，结果回到线程（OpenWorker Slack mention · Multica channels 5 家） | openworker.com/README「What it can do」 · multica.ai/docs/channels | 5 适配器（飞书/钉钉/Slack/Telegram/SMTP）+ `channel_api.py` 8 端点 + OAuth（含 Mock）+ Webhook 签名（S9）；但无"入站 mention → 建会话"闭环 | 部分已有 | **值得引入（中）**：入站方向补齐即成闭环，符合"团队已在哪里说话"的落地逻辑 | 中：入站解析 + 会话映射，单体可承载 | 融入原型 + 登记议题（需代码）`inbound-channel-session` |
| G10 | 模型准入分级：BYOM 随便贴 key，但"已验证可用于工具调用"的清单单独打标（OpenWorker "curated model list… at your own risk"） | openworker.com/README「Bring your model」 | 固定 7 provider（`llm_providers.py:310-318`），无"验证态/风险态"标记，无 model 级能力位（BASELINE §1） | 缺失-竞品建议新增 | **值得引入（低成本高信任）**：把"能连"与"跑通过工具调用"分开，直接减少 Agent 上线踩坑 | 轻：provider/model 元数据字段 + 界面徽标 | 融入原型 + 登记议题（需代码）`model-verification-tier` |
| G11 | 人 + Agent 同板派工：issue 指派给 agent 如同指派给同事，leader 在 squad 内路由（Multica Assign/Squads） | multica.ai/docs/assigning-issues · /docs/squads | 有编排（13 连线策略）与域隔离（`domain_api.py` 9 端点），但**无人工任务/派工实体**，人是登录账号不是"看板上的 assignee" | 缺失-竞品建议新增 | **观望**：价值真实但与本平台"编排 Agent 而非管理人"的定位有张力，需先定产品边界（偏好问题，非技术） | 中→重：新实体 + 新页 + 通知，需 DESIGN | 登记议题（需代码）`human-agent-assignment-board`（原型不画成既有能力，仅入"边界待定"注记） |
| G12 | 多端客户端（Electron 桌面 + Expo iOS）与"同一 workspace 四端"（Multica desktop/mobile） | multica.ai/docs/desktop-app · README「Make it yours」 | 纯 Web 前端（Vite），无桌面/移动壳 | 缺失 | **不适配**：管控台价值在信息与门禁，端壳不改变能力；维护四端与单机定位不匹配 | — | 否决。理由：与「单机 FastAPI + Web 管控台」边界冲突，端壳不新增任何管控能力 |
| G13 | 生成者不得自证：修复方不能是唯一检查方（OpenWorker security review "re-scanned and diff-reviewed before you approve"） | openworker.com/README「Use cases · Security review」 | 门禁已有 schema/参数校验（`gate_registry.py`），但**无"同一 Agent 产出即由它自己过闸"的禁止规则** | 部分已有 | **值得引入（理念级）**：与人工审批天然配套，属规则而非基建 | 轻：闸口判定加一条"产出者 ≠ 评审者"约束 | 融入原型（门禁视图加这条规则）+ 登记议题（需代码）`separation-of-duty-gate` |
| G14 | RAG / 向量检索：文档入库→切分→检索→注入对话（Dify "RAG Pipeline"） | https://github.com/langgenius/dify README Key features 4 | 知识库为文档型存储；全仓 grep `embedding` 与 `vector` 均 0 命中，`chat_service.py` 不引用 knowledge（S5） | 缺失-竞品建议新增 | **观望→需代码**：产品价值明确，但 SQLite 无向量能力，选型（sqlite-vec / LanceDB / 外部库）即架构决策 | 重：破「零新依赖 + 单机 SQLite」默认 | 登记议题（需代码）**架构级** `knowledge-rag-retrieval`；原型只写"文档型知识产物"现状 |
| G15 | 集成生态规模（n8n "1500+ integrations"）与"可视化画布 + 代码兜底"（Code When You Need It） | https://github.com/n8n-io/n8n README Key Capabilities | 画布已有（React Flow + 13 策略），工具库为自维护 CRUD，无社区分发面 | 部分已有 | **不适配（规模路线）**：铺集成数量会把它从"管控平台"变成"iPaaS"，与 CLAUDE.md 定位冲突 | — | 否决。理由：生态规模不是本平台的差异化路径；`tools`/`templates`/`roles` 三市场已覆盖"可分发"这一真实需求 |

**去向合计（验收线 2 抽查用）**：融入原型 9（G4 G5 G6 G7 G8 G9 G10 G13 及 G1 双标部分）、登记议题（需代码）11 个 slug（含 2 个架构级 G3/G14）、否决 3（G12 G15，另 G3 在本 change 内亦判否决）；0 条空白、0 条"写了没落"。

## 3. 扩展候选清单（交人工**一次**拍板，不再单开一轮 · G1 🟫 建议）

| 候选 | 一句话入选理由 | 一手来源（本次已核可达） |
|---|---|---|
| **Dify**（langgenius/dify） | 与本项目能力面重叠最大（画布编排 + Agent + 工具市场 + LLMOps），最能照出"我们声称有、实际差在哪"，尤其 RAG 与沙箱两项短板 | https://github.com/langgenius/dify README（Key features 1-7，已读） |
| **AgentOps**（AgentOps-AI/agentops） | 专治本项目最假的短板（G1 成本台账 / G6 可回放 trace）：session→agent→operation→workflow 分层 span 的观测模型可直接借语义，不必借它的服务 | https://github.com/AgentOps-AI/agentops README（Quick Start / Self-Hosting / span 分层，已读）· https://agentops.ai |
| **n8n**（n8n-io/n8n） | 「Fair-code、self-host 或云、RBAC + 审计 + 敏感数据」是同类产品里把**管控与部署形态**讲得最完整的参照，可校准我们的单机体量叙事 | https://github.com/n8n-io/n8n README（Key Capabilities 全段，已读） |

> 备注：候选名已核可达、能力已读 README，但**未做逐项深挖**——是否纳入由人工拍板；任一入选即在本表追加行（同口径：来源/归属/初判/可行性/去向）。

## 4. 调研期新发现的产品事实（供 REQUIREMENT 的 AC 与 2a 消费）

1. **README 功能模块层缺 4 个域**（控制面与域管理 / 知识产物与文档 / 告警 / 人工审批）——与 CHANGE 验收线 1 的 G1 🟫 修正一致，且现给出逐页归属（BASELINE §2）。
2. **两个"看着像能力、实际是壳"**：`token_usage`（正则扫 markdown）与 MCP（只发骨架 zip）。原型若不标注，会把它们画成已交付防护/已交付账本——正是 G1 🔴 与本项目"文档漂移"共同要防的失真。
3. **`TraceViewer` 零挂载**：README 已把它写进"拓扑监控"能力句 → 唯一一条「宣传面 > 可达面」的实证，适合做原型校准的样例。
4. **竞品共同结构**：Multica / OpenWorker / Dify / n8n 全部把「**人工闸口 + 审计留痕 + 自带模型/自带机器**」当主卖点，而不是把模型能力当卖点 → 与 AgentFlow「管控平台」定位同向，支持 W1 把管控面画厚。
