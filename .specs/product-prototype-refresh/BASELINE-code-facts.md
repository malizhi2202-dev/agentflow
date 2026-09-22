# BASELINE — W1 产品能力现状事实底稿（代码重测为唯一基准）

- **Change ID**: product-prototype-refresh ｜ **工作包**: W1（现状审核）
- **复测时间**: 2026-09-22 ｜ **复测分支/tip**: `agent/agent/67941818a068` @ `6341f8cf`
- **口径规则（G1 🟩）**：`CHANGE.md` 内所有数字仅为引用时点参考数；本文件是 W1 唯一基准，下游（REQUIREMENT / 2a / 原型 / 6-review）一律引本文件，不引 CHANGE 数字。
- **复现方式**：下表「命令」列逐条可跑（工作目录 = 仓库根）。

## 1. 规模计数（实测命令 + 口径）

| 指标 | 实测值 | 命令（工作目录=仓库根） | 2026-07-06 快照 | 差异原因 |
|---|---|---|---|---|
| 前端页面文件 | **34** | `ls frontend/src/pages/*.tsx \| wc -l` | 32 | 快照把「文件数」当「页面数」 |
| **挂载路由页（页面口径唯一基准）** | **32** | `grep -cE "^import .*from '\./pages/" frontend/src/App.tsx` | 32 | 数值巧合相同，口径不同（快照按文件数） |
| 孤儿页面（有文件、无挂载） | **2** | 见 §3 | 0（未盘点） | 新纳入盘点 |
| 侧边栏一级入口 | **11 + 管理员 2 = 13** | `grep -oE "\{ id: '[^']+', label: '[^']+'" frontend/src/App.tsx` | 未记录 | 新增（IA 骨架基准） |
| 后端路由模块 | **28**（29 文件含 `__init__.py`） | `ls backend/routes/*.py \| grep -v __init__ \| wc -l` | 27 | 新增 `human_approval_api.py` |
| API 端点 | **168** | `grep -rEn '^@router\.(get\|post\|put\|patch\|delete)' backend/routes \| wc -l` | 153 | 行锚定 + 新增端点；**口径唯一**：行首 `@router.` 装饰器 |
| ORM 模型模块 | **19** | `ls backend/models/*.py \| grep -v __init__ \| wc -l` | 15 | +`agent_probe_latest`/`human_approval`/`knowledge_tag`/`scheduled_task` |
| 数据表（代码侧） | **26** | `grep -rhoE "__tablename__ *= *['\"][a-z_]+['\"]" backend/models \| sort -u \| wc -l` | 21（sqlite3 实测） | 本次仓库无 `platform.db`，改用 ORM 声明计数（口径已标注） |
| 业务服务模块 | **24** + 渠道适配器 **5** | `ls backend/services/*.py \| grep -v __init__ \| wc -l` | 25 | 快照含 `__init__` 或后续合并（差异 1，不影响能力域） |
| 引擎模块 | **4** | `ls backend/engine/*.py \| grep -v __init__ \| wc -l` | 4 | 一致 |
| 前端组件（`components/*.tsx` 顶层） | **28**（其中孤儿 **9**，见 §3） | `ls frontend/src/components/*.tsx \| wc -l` | 28 | 一致 |
| Zustand store | **12** | `ls frontend/src/stores/*.ts \| wc -l` | 11 | +`knowledge.ts` |
| 后端 .py 文件 | **117** | `find backend -name '*.py' -not -path '*/.venv/*' -not -path '*/__pycache__/*' \| wc -l` | 112 | 增长 |
| LLM Provider | **7** | `sed -n '310,318p' backend/services/llm_providers.py` | 未记录 | openai / ollama / anthropic / hermes / deepseek / gemini / codex |
| 连线策略 | **13** | `grep -n '"enum": \[' backend/engine/yaml_schema.py`（:82） | 13 | 前后端一致（README 少数准确数字之一） |
| 测试文件 | **12**（后端 7 + 前端 5） | `ls backend/tests/*.py \| grep -v __init__ \| wc -l` | 12 | 一致 |

## 2. 能力域 ← 挂载页归属表（32 页全覆盖；域清单 = CHANGE 验收线 1 的 11 域）

映射依据：`frontend/src/App.tsx` 的 `NAV`/`ADMIN_NAV`（:56-67）与 `renderContent()` case（:214-256）。

| # | 能力域 | 挂载页 | 页 | README 是否记载 |
|---|---|---|---|---|
| 1 | 工作流监控 | Home、Detail（含 6 个 tab 组件）、Runtime、MonitoringDashboard | 4 | ✅ |
| 2 | Agent 编排 | OrchestrationPage、OrchestrationListPage、AgentBuilder、AgentDetail、WorkflowEditor、WorkflowList、WorkflowDetail、WorkflowCreate | 8 | ✅ |
| 3 | 控制面与域管理 | AgentControlPlane | 1 | ❌ 未记载 |
| 4 | 对话中心 | ConversationCenter | 1 | ✅ |
| 5 | 工具库与模板市场 | ToolMarket、ToolDetail、TemplateMarket | 3 | ✅ |
| 6 | 项目管理 | ProjectManager、ProjectDetail | 2 | ✅ |
| 7 | 角色系统（含用户/权限分配） | Roles、RoleMarket、RoleDetail、UserManagement | 4 | ✅（用户管理未拆出） |
| 8 | 安全与审计 | AuditLog | 1 | ✅（边界见 §4-S1） |
| 9 | 知识产物与文档 | DocEditor、SpecsEditor、OrchDocPage、KnowledgeBase | 4 | ❌ 未记载 |
| 10 | 告警 | AlertsPage | 1 | ❌ 未记载 |
| 11 | 人工审批 | ApprovalPage | 1 | ❌ 未记载 |
| — | 平台外壳（不计入能力域） | LoginPage、UserCenter | 2 | 部分 |

合计 4+8+1+1+3+2+4+1+4+1+1+2 = **32** ✓（与 §1 挂载数自洽）

## 3. 孤儿盘点（文件存在但全仓零引用；定性【待确认】，本 change 不删）

- **孤儿页面（2）**：`frontend/src/pages/SecurityPage.tsx`、`frontend/src/pages/AssemblyView.tsx` —— `App.tsx` 未 import；全仓 `grep` 零引用。
- **孤儿组件（9）**：`TopBar`、`TabNav`、`SearchBar`、`ProjectSwitcher`、`TraceViewer`、`EntityMonitor`、`AgentProbePanel`、`ReconcileConsole`、`SchedulerConfig` —— 各自文件外零引用（命令：对每个组件名 `grep -rn "<Name>" frontend/src -l` 去掉自身后为空）。
- **重点**：`TraceViewer` 被 `README.md` 「拓扑监控：跨 Agent 调用链追踪（TraceViewer）」当作已交付能力宣传，但它没有任何挂载点 → 文档宣称 vs 实际可达面不符（进 §4 差异清单 D3）。
- 定性（死代码 / 待接入 / 被重构遗落）**待人工或后续 change 判定**；本 change 只在原型里把它们标为「未接入」，不作为能力呈现。

## 4. 既有能力的真实边界（原型措辞必须带限定词；全部本次实测）

| # | 能力陈述 | 代码事实 | 允许写入原型的措辞 |
|---|---|---|---|
| S1 | 认证与访问控制 | `backend/main.py:194-212`：仅放行 localhost；`X-User-Id` header 生效，**未传即回落 `get_user("admin")`** | "本地开发默认口令（未强制改密）+ localhost 限定 + header 身份"，禁写成网络隔离/强认证 |
| S2 | 密钥加密 | `services/encryption_service.py` AES-256-GCM（`cryptography` AESGCM）；`_get_key()`：`ENCRYPTION_KEY` 未设 → `RuntimeError`（无静默默认值）；短密钥 `ljust(32,"0")` 零填充、**无 KDF**；`models/agent.py:21` `api_key_encrypted`、`_mask_key()` :56-59 | "密钥加密存储 + 响应掩码（强度取决于 `ENCRYPTION_KEY`，短密钥零填充、无 KDF）" |
| S3 | Token/成本统计 | `backend/routes/token_usage.py:9-35`：对 `.specs/*-SUMMARY.md` **正则扫文本**，非按运行/Agent 记账 | 不得写成"成本台账"；应写成"当前为文档侧估算汇总，无逐运行计量"（缺口 G1 见 RESEARCH） |
| S4 | MCP 工具 | `models/tool.py:13` 类型枚举 `plugin\|skill\|mcp`；`routes/tools_api.py:89-91` 仅生成 MCP 骨架 zip 供下载 | "MCP 作为工具类型已建模 + 骨架导出"，不得写成"可挂载 MCP server" |
| S5 | 知识库/检索 | `models/knowledge_source.py` 存在存储与 `mask_secrets`；全仓 `grep -i embedding\|vector` **0 命中**；`services/chat_service.py` 无 knowledge 引用 | "知识产物为文档型一等数据（存储/编辑/查看）"，不得写成 RAG/向量检索 |
| S6 | K8s 式管控 | `services/k8s_routing_service.py:50,102`（含 `simulate_queue_monitor`）、`engine/reconcile_loop.py` 漂移检测/退避/拓扑安全暂停；无 kube client、无容器编排 | "平台内**仿真**的声明式调度与自愈语义"，不得写成对接真实集群 |
| S7 | 执行隔离 | 全仓 `grep -i "sandbox\|docker"` 在 `backend/**.py` **0 命中**；`subprocess` 仅 `routes/git_safety.py` | 不得呈现任何"沙箱/隔离执行"能力（缺口 G3） |
| S8 | 定时任务 | `models/scheduled_task.py:8-14`（`cron_expr`）+ `services/scheduler_service.py` | 可写"Agent 定时任务（cron）"——README 功能模块层未记载，属 W1 新发现 |
| S9 | 渠道/触发 | 5 适配器（飞书/钉钉/Slack/Telegram/SMTP）+ `channel_api.py` 8 端点 + OAuth（含 Mock）+ `webhook` 签名（README 安全节） | 可写"多渠道消息中继 + OAuth 接入"；"mention 即开会话"无实现 → 不写 |
| S10 | 知识产物的**读取面** | `GET /api/changes/{change_id}/{artifact}`（`routes/artifact.py:10-26`）只校验文件名白名单，**无任何鉴权**；同文件 PUT（`:28-34`）才要 `project:write`。配合 S1（localhost + 缺 `X-User-Id` 回落 admin）＝凡能访问本服务者可读 `.specs/**` 全部 markdown | 可写"知识产物是平台一等数据、经 API 可读"；**但 S1-S9 攻击面清单不得整表搬进原型稿**——原型（`product-design.html`）是天生外发件（US-5），只带"边界限定句"，完整清单留在本文件与 REQUIREMENT 内部 |

## 5. 与既有文档的漂移差异清单（供 2a/原型/议题 `docs-drift-resync` 消费）

| # | 文档陈述 | 实测 | 判定 |
|---|---|---|---|
| D1 | `CONTEXT.md` §3「页面 32」 | 文件 34 / 挂载 32 | 口径缺陷（不是数量错）→ 本文件定口径=挂载集 |
| D2 | `README.md` 功能模块 7 节 | 实际 11 能力域 | README 缺 4 域：控制面与域管理、知识产物与文档、告警、人工审批（§2 ❌ 行） |
| D3 | `README.md` 「跨 Agent 调用链追踪（TraceViewer）」 | `TraceViewer.tsx` 零挂载 | 宣传面 > 可达面 |
| D4 | `CONTEXT.md` 端点 153 / 路由 27 | 168 / 28 | 快照过期 |
| D5 | `CONTEXT.md` 表 21（sqlite3） | ORM 声明 26 | 口径不同 + 无 `platform.db`；本文件已标口径 |
| D6 | `CONTEXT.md` 服务 25 / 模型 15 | 24（+5 适配器）/ 19 | 快照过期 |
| D7 | `.specs/README-CONSISTENCY-REPORT.md:5`「10 项 8 不准」 | 本次 7 条差异（D1-D6 与 S3/S4 类）方向一致 | 既有结论成立，不需重做该报告 |
