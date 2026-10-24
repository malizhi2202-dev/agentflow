# AgentFlow — 通用 Agent 编排与监控平台

> 通用 Agent 编排 + K8s 式管控 + 可视化监控 + 对话中心

---

## 文档地图（最新版在哪）

> **本仓现在有两层**：**设计档**（持续更新，最新到 2026-10-23 v20）与**代码**（基线 `4ac819bf`·2026-10-12，**落后设计 6 轮**）。**判断「产品应该是什么样」看设计档，判断「代码现在有什么」看 STATE.md。**

| 想知道什么 | 打开哪一份 |
|---|---|
| **产品应该是什么样**（唯一权威设计文本） | `.specs/product-design/PRODUCT-DESIGN.html` · **v20** |
| **界面长什么样**（**127** 页可点原型） | `.specs/product-design/prototype/index.html` |
| **这句话现在还作数吗**（现行口径总表） | `.specs/platform-evolution/RULINGS.md` |
| **文档总索引 / 审核台账** | `.specs/product-design/INDEX.md` |
| 过审结论台账 / 议题状态 | `.specs/platform-evolution/ROADMAP.md` · `TOPICS.md` |
| 代码现状 / 待办 / 实施进度 | `STATE.md`（开发冻结已解除：波 0–5 已收口，波 6 在途） |
| 竞品证据 | `.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md` · `.specs/product-design/RECON-MULTICA-DOCS.md` |

> ⚠ 下文「功能模块」描述的是**代码现状**（老版本），不是设计目标；两者差异与升级波次见 `PRODUCT-DESIGN.html` §1.6.0。

---

## 启动

```bash
# 1. 后端（首次启动自动创建 SQLite，零配置）
cd backend
pip install -r requirements.txt
python main.py
# → http://127.0.0.1:8000
# → Swagger: http://127.0.0.1:8000/docs

# 2. 前端
cd frontend
npm install
npm run dev
# → http://127.0.0.1:5173
```

> 默认使用 SQLite，无需额外配置。可选环境变量见下方「配置」段。
>
> **存储定位（2026-09-23 裁定⑦）**：SQLite = 本地体验档（保住「零外部依赖可跑」门票）；**真实部署档中，可计量追踪数据（用户/会话/错误告警/审计/变更账本/指标）一律以 MySQL 为权威库**（设 `DATABASE_URL`）。知识产物（`.specs/`）仍是文件一等公民。账号现存 `users.json`——将随裁定表化进 MySQL `users` 表。
>
> ⚠ **身份与部署闸门（波 1 已实施，部署前必读）**：身份来自**服务端会话**（`__Host-session` HttpOnly cookie）或 Bearer PAT，缺凭证一律 401（不再回退 admin）；口令为 **argon2id**（scrypt 兜底），出厂口令已废除（首启强制改密）；`DEPLOY_MODE` 三值 + 可信代理 XFF 纪律，非法配置启动即失败。git 历史已通过凭据扫描：**无凭据泄露**（56 rev 全量，报告 `.specs/credential-scan/SCAN-REPORT.md`）；建议顺手开启 GitHub Secret Scanning。

---

## 功能模块

### 🎛 工作流监控
- Change 列表 + 进度追踪
- Task 状态 + 波次视图
- 专家团门禁投票可视化（Gate 页）
- 产物文档查看与批注（Artifact 页）
- Token 消耗统计（Stats 页）
- 运行时 Session 监控（Runtime 页）
- 健康检查报告（Health 页）

> 〔波 4/5/7 已落地 + 界面已挂载（`v20-ui-teams`）〕团队与小队（Team ⟂ Squad）侧栏「团队与小队」可管理：建团/状态/成员四档/转让/五类资产挂载释放/配额；小队建队/混编成员/归档 · 执行隔离契约（未实现档位即拒绝）· A2A M0 静态卡。

### 🤖 Agent 编排
- **YAML ↔ 画布双向同步**：编辑 YAML → 画布自动更新，拖拽画布 → YAML 自动更新
- **13 种连线策略**：sequential / pipeline / parallel / fan-out / fan-in / map-reduce / fork / condition / master-slave / event-trigger / human-approval / retry-fallback / dead-letter
- **每条连线独立配置**：重试策略、Token 限制、安全栅栏、数据脱敏、超时、IO Schema
- **Reconcile Loop**：声明式调度，期望状态 vs 实际状态 → 漂移检测 → 自动修复
- **拓扑画布**（React Flow）：拖拽 Agent 节点 + 连线 + MiniMap
- **拓扑监控**：实时节点状态颜色 + 跨 Agent 调用链追踪（TraceViewer）

> 〔波 3 已落地〕任务（`work_items`）与收件箱（指针非副本、合并键=任务本身）已落表落 API；界面未挂载。

### 💬 对话中心
- 独立页面（`ConversationCenter`），侧边栏一级入口
- Agent 列表 + 聊天窗口，类 ChatGPT 交互
- 渠道消息中继：飞书 / 钉钉
- OAuth 扫码接入（Device Code 流程）+ Mock 开发模式
- 对话历史分页加载

### 🧩 工具库
- Plugin / Skill / MCP 三种工具类型
- CRUD + demo 下载 + admin 禁用
- 工作流：文本声明 + 可视化 DAG（React Flow）
- 模板市场

> 〔波 3 已落地〕任务=独立 `work_items` 表 + `work_item_runs` 连接表，不并入 projects。

### 📊 项目管理
- 项目 CRUD + 需求输入
- 绑定 Agent + 工作流 → 执行 → 监控

### 👤 角色系统
- 结构化角色定义（性情/职责/边界/触发场景）
- 角色市场 + 角色详情
- 可绑定到工作流节点

### 🔒 安全
- **服务端会话**：`__Host-session` HttpOnly cookie > Bearer PAT > 401（不再回退 admin）· 口令 argon2id
- 部署闸门：`DEPLOY_MODE` 三值 + 可信代理 XFF 纪律，非法配置启动即失败
- RBAC 权限（admin / user）
- Agent API Key 加密存储
- 全操作审计日志
- Webhook 签名校验
- 〔波 7 已落地〕归因双列 `originator`（只鉴权）⟂ `accountable`（只审计/成本）+ 瀑布 fail-closed；`rsi_switches` 四类开关（关闭=自动体已暂停）

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript 5.5 + Vite 5.4 |
| UI | Tailwind CSS 3.4 + Tremor 3.18 |
| 状态管理 | Zustand 4.5（9 stores） |
| 可视化画布 | React Flow (@xyflow/react) 12.x |
| 代码编辑器 | CodeMirror 6 |
| 图表 | Recharts 2.15 |
| 后端 | FastAPI 0.110+ (Python 3.10+) |
| ORM | SQLAlchemy 2.0 |
| 数据库 | SQLite（本地档）/ MySQL（**真实部署权威库 · 裁定⑦**） |
| 缓存 | Redis 5.0（可选） |

**代码规模**：后端 97 .py + 前端 89 ts/tsx + 12 个测试文件

---

## 架构

```
Frontend (React + TypeScript + Tailwind + React Flow + Recharts + Zustand)
  ↕ REST API (fetch + X-User-Id header 自动注入)
Backend (FastAPI + SQLAlchemy + SQLite/MySQL + Redis)
  ├── /api/tools/*            工具库 CRUD
  ├── /api/workflows/*        工作流 CRUD + 发布 + 执行
  ├── /api/agents/*           Agent CRUD + 运行 + 知识库
  ├── /api/orchestration/*    编排 YAML 校验 + 执行
  ├── /api/chat/*             对话中心
  ├── /api/channel/*          渠道管理 + OAuth
  ├── /api/projects/*         项目管理
  ├── /api/metrics/*          指标聚合（实体级 + 全局）
  ├── /api/artifact/*         产物文档查看
  ├── /api/changes/*          Change 列表 + 详情
  ├── /api/auth/*             认证 + 用户管理
  ├── /api/audit/*            审计日志
  ├── /api/roles/*            角色 CRUD
  ├── /api/runtime/*          运行时状态
  ├── /api/health/*           健康检查
  └── /api/admin/*            管理功能

文件系统
  ←→ runtime_watcher（扫描 .specs/ + runtime.jsonl）
```

---

## API 端点速查

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/auth/login` | POST | 密码登录 |
| `/api/tools` | GET/POST | 工具列表/创建 |
| `/api/tools/:id/demo` | GET | 下载 demo zip |
| `/api/workflows` | GET/POST | 工作流列表/创建 |
| `/api/workflows/:id/publish` | POST | 发布（创建快照） |
| `/api/workflows/:id/execute` | POST | 执行工作流 |
| `/api/agents` | GET/POST | Agent 列表/创建 |
| `/api/agents/:id/run` | POST | 运行 Agent |
| `/api/orchestration/validate` | POST | 校验 YAML 编排 |
| `/api/orchestration/execute` | POST | 执行编排 |
| `/api/orchestration/apply` | POST | 部署到调度队列 |
| `/api/chat/sessions` | GET/POST | 对话会话管理 |
| `/api/chat/send` | POST | 发送消息 |
| `/api/channel/config` | GET/POST | 渠道配置 |
| `/api/channel/oauth/feishu` | POST | 飞书 OAuth 扫码 |
| `/api/channel/oauth/dingtalk` | POST | 钉钉 OAuth 扫码 |
| `/api/projects` | GET/POST | 项目列表/创建 |
| `/api/projects/:id/execute` | POST | 执行项目 |
| `/api/metrics/:type/:id` | GET | 实体监控 |
| `/api/metrics/global` | GET | 全局监控 |
| `/api/changes` | GET | Change 列表 |
| `/api/changes/:id/artifacts` | GET | 产物文件列表 |
| `/api/artifact/:change_id/:filename` | GET | 产物内容 |
| `/api/roles` | GET/POST | 角色列表/创建 |
| `/api/runtime/sessions` | GET | 运行时 Session |
| `/api/health` | GET | 健康检查 |
| `/api/audit` | GET | 审计日志 |
| `/api/admin/users` | GET | 用户管理（admin） |
| `/api/tasks` | GET/POST | 任务（`work_items`）列表/创建；`/:id/status` 状态机、`/:id/assign` 三轨指派、`/:id/runs` 运行连接 |
| `/api/inbox` | GET | 收件箱（指针不是副本）；`/:id/read` · `/:id/archive` |
| `/api/teams` | GET/POST | 团队（资源容器）；`/:id/members` 四档角色 · `/:id/transfer` 转让 · `/:id/assets` 五类资产挂载/释放 |
| `/api/squads` | GET/POST | 小队（可指派编组）；`/:id/members` 混编 · `/:id/assign` 指派=给 leader 入队 leader 任务；**写操作限 creator 或平台管理员（403）** |
| `/api/a2a/agents/:id/card` | GET | **A2A M0 静态 AgentCard**（M2 冻结；白名单字段，无凭据） |
| `/api/runtime/execution-contract` | GET | 执行隔离契约只读呈现；`/validate` 预检 |
| `/api/watch?since=<id>` | GET | 声明式变更 SSE（应用层游标；过期先发 `event: resync`） |
| `/api/rsi/{memories,proposals,surfaces,switches,breakers,reviews}` | GET/POST | 记忆四层晋升门 · 提案三权分离 · 可改面 · 四类开关 · 熔断 · 晋升评审账 |
| `/metrics` | GET | Prometheus 文本（需 `METRICS_ENDPOINT_ENABLED=1`，且仍需身份；未开启一律 404） |
| `/api/domains/:id/attribution-policy` | GET/PUT | 域级 accountable 策略（无策略=originator；不可解析即 fail-closed；PUT 限管理员/域 owner） |
| `/api/rsi/proposals/:id/shadow/run` | POST | 影子重放 runner（确定性 exact_match 打分 → 走既有影子门；响应自证 dry_run） |
| `/api/rsi/l0/extract` | POST | L0→L1 抽取（端点强制 dry_run；真实抽取需服务层注入适配器） |
| `/api/control-plane/cluster` | GET | 副本/租约/单例循环现状（单副本承诺如实呈现） |

---

## 项目结构

```
agentflow/
├── backend/
│   ├── main.py                      # FastAPI 入口 + 认证中间件
│   ├── config.py                    # 配置
│   ├── database.py                  # SQLAlchemy 引擎 + SQLite/MySQL 切换
│   ├── auth.py                      # 用户认证 + 密码管理
│   ├── routes/                      # 24 个 API 路由
│   │   ├── orchestration_api.py     # 编排 CRUD + apply/validate
│   │   ├── agents_api.py            # Agent CRUD
│   │   ├── agent_knowledge_api.py   # Agent 知识库
│   │   ├── workflows_api.py         # 工作流管理
│   │   ├── tools_api.py             # 工具库
│   │   ├── metrics_api.py           # 指标 + 链追踪
│   │   ├── projects_api.py          # 项目管理
│   │   ├── chat_api.py              # 对话中心
│   │   ├── channel_api.py           # 渠道管理 + OAuth
│   │   ├── artifact.py              # 产物查看
│   │   ├── changes.py               # Change 列表
│   │   ├── change_detail.py         # Change 详情
│   │   ├── auth_api.py              # 认证
│   │   ├── audit_api.py             # 审计日志
│   │   ├── roles_api.py             # 角色 CRUD
│   │   ├── roles_custom_api.py      # 自定义角色
│   │   ├── runtime_api.py           # 运行时
│   │   ├── health.py                # 健康检查
│   │   ├── admin_api.py             # 管理功能
│   │   ├── git_safety.py            # Git 安全
│   │   ├── search.py                # 搜索
│   │   ├── assembly_api.py          # 工作流组装
│   │   └── token_usage.py           # Token 统计
│   ├── models/                      # 13 个 ORM 模型
│   │   ├── agent.py                 # Agent
│   │   ├── agent_memory.py          # Agent 记忆
│   │   ├── channel_config.py        # 渠道配置
│   │   ├── conversation.py          # 对话
│   │   ├── knowledge_source.py      # 知识源
│   │   ├── message.py               # 消息
│   │   ├── metrics.py               # 指标
│   │   ├── orchestration.py         # 编排
│   │   ├── project.py               # 项目
│   │   ├── role_custom.py           # 自定义角色
│   │   ├── tool.py                  # 工具
│   │   └── workflow.py              # 工作流
│   ├── services/                    # 20 个业务服务
│   │   ├── chat_service.py          # 对话服务
│   │   ├── channel_adapter.py       # 渠道适配器
│   │   ├── oauth_provider.py        # OAuth 抽象
│   │   ├── oauth_feishu.py          # 飞书 OAuth
│   │   ├── oauth_dingtalk.py        # 钉钉 OAuth
│   │   ├── oauth_mock.py            # OAuth Mock
│   │   ├── gate_resolver.py         # 门禁解析
│   │   ├── metrics_service.py       # 指标服务
│   │   ├── metrics_scheduler.py     # 指标调度
│   │   ├── orchestration_parser.py  # 编排解析
│   │   ├── runtime_tracer.py        # 运行时追踪
│   │   ├── runtime_watcher.py       # 文件系统监控
│   │   ├── template_service.py      # 模板服务
│   │   ├── encryption_service.py    # 加密服务
│   │   ├── security_service.py      # 安全服务
│   │   ├── snapshot_service.py      # 快照服务
│   │   ├── audit_service.py         # 审计服务
│   │   └── tool_service.py          # 工具服务
│   ├── engine/                      # 编排引擎
│   │   ├── reconcile_loop.py        # 控制循环
│   │   ├── scheduler.py             # 优先级调度
│   │   ├── yaml_schema.py           # YAML Schema 校验
│   │   └── gate_registry.py         # 安全闸门注册
│   ├── storage/                     # 存储抽象
│   │   ├── sqlite_backend.py
│   │   ├── mysql_backend.py
│   │   └── memory_backend.py
│   ├── runtime/adapters/            # 运行时适配器
│   │   ├── claude_code.py
│   │   ├── codex.py
│   │   ├── hermes.py
│   │   └── xiaolongxia.py
│   ├── parsers/                     # 工作流工件解析
│   └── tests/                       # 7 个测试文件
├── frontend/
│   ├── src/
│   │   ├── pages/                   # 20 个页面
│   │   │   ├── Home.tsx             # 仪表盘
│   │   │   ├── Detail.tsx           # Change 详情
│   │   │   ├── OrchestrationPage.tsx    # 编排画布
│   │   │   ├── OrchestrationListPage.tsx # 编排列表
│   │   │   ├── OrchDocPage.tsx      # 编排 YAML 文档
│   │   │   ├── ConversationCenter.tsx # 对话中心
│   │   │   ├── AgentBuilder.tsx     # Agent 创建
│   │   │   ├── AgentDetail.tsx      # Agent 详情
│   │   │   ├── ProjectManager.tsx   # 项目管理
│   │   │   ├── ProjectDetail.tsx    # 项目详情
│   │   │   ├── Roles.tsx            # 角色列表
│   │   │   ├── RoleDetail.tsx       # 角色详情
│   │   │   ├── RoleMarket.tsx       # 角色市场
│   │   │   ├── MonitoringDashboard.tsx # 监控仪表盘
│   │   │   ├── Runtime.tsx          # 运行时
│   │   │   ├── AuditLog.tsx         # 审计日志
│   │   │   ├── SecurityPage.tsx     # 安全
│   │   │   ├── DocEditor.tsx        # 文档编辑
│   │   │   ├── AssemblyView.tsx     # 工作流组装
│   │   │   └── LoginPage.tsx        # 登录
│   │   ├── components/              # 25 个组件
│   │   │   ├── OrchestrationCanvas.tsx  # 拓扑画布 (React Flow)
│   │   │   ├── EdgeEditor.tsx       # 连线配置面板
│   │   │   ├── TopologyMonitor.tsx  # 拓扑监控
│   │   │   ├── TraceViewer.tsx      # 调用链追踪
│   │   │   ├── ChatWindow.tsx       # 聊天窗口
│   │   │   ├── ChannelConfig.tsx    # 渠道配置
│   │   │   ├── QrScanModal.tsx      # 扫码弹窗
│   │   │   ├── YamlEditor.tsx       # YAML 编辑器
│   │   │   ├── AgentNodePool.tsx    # Agent 节点池
│   │   │   ├── EntityMonitor.tsx    # 实体监控
│   │   │   ├── EntityBreakdownPanel.tsx # 实体拆解面板
│   │   │   ├── ArtifactTab.tsx      # 产物页
│   │   │   ├── GateTab.tsx          # 门禁页
│   │   │   ├── TaskTab.tsx          # 任务页
│   │   │   ├── StatsTab.tsx         # 统计页
│   │   │   ├── HealthTab.tsx        # 健康页
│   │   │   ├── WorkflowTab.tsx      # 工作流页
│   │   │   ├── ChangeCard.tsx       # Change 卡片
│   │   │   ├── ConfirmDialog.tsx    # 确认弹窗
│   │   │   ├── UserSelect.tsx       # 用户选择
│   │   │   ├── ErrorBoundary.tsx    # 错误边界
│   │   │   ├── ProjectSwitcher.tsx  # 项目切换
│   │   │   ├── SearchBar.tsx        # 搜索栏
│   │   │   ├── TabNav.tsx           # Tab 导航
│   │   │   └── TopBar.tsx           # 顶栏
│   │   ├── stores/                  # 9 个 Zustand Store
│   │   │   ├── auth.ts
│   │   │   ├── changes.ts
│   │   │   ├── agents.ts
│   │   │   ├── metrics.ts
│   │   │   ├── projects.ts
│   │   │   ├── tools.ts
│   │   │   ├── workflows.ts
│   │   │   ├── chat.ts
│   │   │   └── orchestration.ts
│   │   ├── hooks/
│   │   │   ├── useFileNames.ts
│   │   │   └── useTheme.ts
│   │   ├── lib/
│   │   │   └── orchestration-sync.ts    # YAML ↔ 画布双向转换
│   │   ├── styles/
│   │   │   └── tokens.css               # Design tokens
│   │   └── __tests__/                   # 5 个测试文件
│   └── vite.config.ts
└── platform.db                          # SQLite 数据库
```

---

## 配置

### 环境变量（可选）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `HOST` | `127.0.0.1` | 后端监听地址 |
| `PORT` | `8000` | 后端端口 |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的前端源 |
| `DATABASE_URL` | (空=SQLite 本地档) | MySQL 连接串（真实部署权威库 · 裁定⑦） |
| `REDIS_URL` | (空=跳过) | Redis 缓存 |
| `PROMPTS_DIR_NAME` | `prompts` | 提示词/模板目录名（相对项目根） |
| `SCAN_INTERVAL` | `5` | 文件扫描间隔（秒） |
| `ENCRYPTION_KEY` | (必填) | 加密密钥（32 字节）。⚠ 短键当前被零填充且无 KDF，属已知缺陷（P0-10①）——请使用全长随机密钥 |
| `CHANNEL_OAUTH_MOCK` | `false` | OAuth Mock 模式 |
| `DEPLOY_MODE` | `localhost` | 部署模式：`localhost`（仅回环）/ `lan`（+`ALLOW_CIDRS` 网段）/ `behind-proxy`（只收 `TRUSTED_PROXY_IPS` 反代）。非法值**启动即失败** |
| `ALLOW_CIDRS` | (空) | `DEPLOY_MODE=lan` 必填，逗号分隔网段（如 `192.168.0.0/16`） |
| `TRUSTED_PROXY_IPS` | (空) | `behind-proxy` 必填，可信反代地址；`*` 一律拒绝。仅在 peer 可信时解析 `X-Forwarded-For` |
| `TLS_TERMINATED` | `false` | 反代已终结 TLS：会话 cookie 用 `__Host-session` + `Secure`（否则退化 `af_session`） |
| `AGENTFLOW_ADMIN_PASSWORD` | (空=随机并只打一次启动日志) | 首启管理员口令；不设则强制首登改密 |
| `SESSION_IDLE_MINUTES` | `30` | 会话空闲到期（随活动前移） |
| `SESSION_ABSOLUTE_HOURS` | `8` | 会话绝对到期（不随活动延长） |
| `PAT_DEFAULT_EXPIRES_DAYS` | `90` | 个人访问令牌默认有效期（禁止永不过期） |
| `LOGIN_MAX_FAILURES` / `LOGIN_FAILURE_WINDOW_MINUTES` | `5` / `15` | 登录节流（超限 429）；当前为进程内存，多副本各自计数（P1-7） |
| `AGENTFLOW_AUTH_DEBUG_HEADER` | `false` | `X-User-Id` 调试通道开关；需同时满足 localhost 与 `AGENTFLOW_AUTH_DEBUG_ADMIT` 白名单，开启即启动红条 + 逐请求审计 |
| `AGENTFLOW_AUTH_DEBUG_ADMIT` | (空) | 调试通道允许自述的用户 id 列表（逗号分隔） |
| `INSTANCE_ID` | `host:pid:随机` | 副本标识（租约持有者/队列租约都用它） |
| `CLUSTER_LEASE_TTL_SECONDS` | `90` | 单例循环租约 TTL；到期未续即被其他副本接管 |
| `QUEUE_LEASE_SECONDS` | `60` | 队列任务租约；心跳停止超时后任务回队 |
| `EXECUTION_TIER` | `inproc` | 执行隔离档位；本版只实现 `inproc`，其它档位（process/container/microvm/remote）选即**启动失败**（fail-closed） |
| `EXECUTION_TTL_SECONDS` | `300` | 单次执行时限（秒），上限 3600 |
| `EXECUTION_RETAIN` | `false` | 保留执行工作区（必须配 ttl） |
| `EXECUTION_EGRESS_ALLOW` | (空=默认拒绝) | 出网白名单（逗号分隔域名/CIDR）；`*` 一律拒绝 |
| `RSI_JUDGE_PROVIDER` / `RSI_JUDGE_MODEL` / `RSI_JUDGE_API_KEY` / `RSI_JUDGE_MAX_CALLS` | (空/0=禁用) | 影子重放的**真实** judge（异厂系）。四件缺一即拒绝（不默认回退、不偷偷花钱）；`MAX_CALLS` 为每次作业预算帽 |
| `RSI_CLI_PROVIDER` | `dsh` | CLI 模型通道：`dsh`（`node <dsh bin> --profile headless "<prompt>"`）或 `hermes`（`<hermes bin> -z "<prompt>"`）；`RSI_JUDGE_PROVIDER=cli` / `RSI_EXTRACTOR_PROVIDER=cli` 时生效，**免 key** |
| `RSI_CLI_TIMEOUT_SECONDS` | `180` | CLI 调用超时；超时即失败（不重试、不降级） |
| `AF_DAEMON_TOKEN` | （空=拒绝上报） | 运行时发现的 daemon 机器级 token；与 `scripts/runtime-daemon.py --token` 必须同值。**未配置时 `POST /api/daemon/report` 返回 503**（fail-closed） |
| `AF_DAEMON_OWNER` | `admin` | daemon 上报的运行时归属哪个平台用户（机器级凭据只能映射到一个 owner，上报体里的 owner 被忽略） |
| `RUNTIME_OFFLINE_AFTER_SECONDS` | `180` | 运行时离线判定阈值：`last_seen` 超过该秒数 = `offline`（记录不删） |
| `RUNTIME_EXEC_ENABLED` | `false` | 把 Agent 的 LLM 调用**委托给本机 CLI 运行时**（hermes/dsh/codex）；关闭时走进程内 provider，**不静默降级** |
| `RUNTIME_EXEC_TIMEOUT_SECONDS` | `180` | 运行时执行超时；超时/非零退出/命令缺失一律**响亮失败** |
| `RUNTIME_CMD_HERMES` / `RUNTIME_CMD_DSH` / `RUNTIME_CMD_CODEX` | hermes/dsh 有默认，codex 空 | 每个运行时的命令模板，`{prompt}` 由平台替换成**单个 argv 参数**（不经 shell）；空模板 = 该运行时不可用（fail-closed） |
| `L0_EXTRACT_INTERVAL_SECONDS` | `0`（关闭） | L0→L1 定时抽取间隔；>0 启单例循环（租约保护） |
| `L0_EXTRACT_MAX_CONVERSATIONS` | `5` | 每轮最多处理的会话数（预算帽） |
| `METRICS_ENDPOINT_ENABLED` | `false` | 开启 `GET /metrics`（Prometheus 文本格式，直读现表；仍需身份鉴权） |

### 用户与审计已表化（v21 T-07 / 裁定⑦）

`users.json` / `audit.jsonl` 不再是权威源：

- **用户**：`app_users` 表非空即由表提供档案（登录、权限、用户管理都走它）；表空时退回 `users.json`（迁移期）。
  切换用导入脚本（默认 dry-run）：
  ```bash
  cd backend
  DATABASE_URL=... python scripts/import_users_to_db.py --file /path/users.json          # 先看会导多少
  DATABASE_URL=... python scripts/import_users_to_db.py --file /path/users.json --apply  # 真正导入
  ```
- **审计**：写 `audit_log` 表（同时保留本地 `audit.jsonl` 一份，便于离线排查/导出）；
  `GET /api/audit` 以表为准，表化之前的历史行从文件补进来并去重。
- 迁移号 `018_users_and_audit_tables`；口令只存哈希，导入原样搬运、不重算。

### 质量门 / CI（v21 T-04）

一条命令跑完四道门（每步打印真实命令与输出，失败非 0 退出）：

```bash
bash scripts/ci.sh                  # pyflakes 未定义名 → 后端全量单测 → 前端 tsc+vitest → 生产构建
bash scripts/ci.sh --with-coverage  # 同上 + 前后端覆盖率
```

- 远端同源步骤在 `.github/workflows/ci.yml`（E2E 需 MySQL，不进默认 job）。
- 覆盖率：前端 v8 只统计 `src/**`（排除测试/入口，`npm run coverage`）；后端 `coverage --source=.`。
- 界面 E2E（**真实 MySQL + 真实 CLI + 真实浏览器**）：

```bash
E2E_CLI=dsh bash scripts/e2e/run_e2e.sh      # 13 条；前置见 scripts/e2e/README.md
E2E_CLI=hermes bash scripts/e2e/run_e2e.sh   # 同一脚本切通道，后端 provider/judge 同换
```

### 副本与单例循环（P0-9 / P1-7）

**以前**：调度队列、控制面限流、调和退避、runtime 监控已读行数全在进程内存里——
重启即清零，多开一个副本就各算各的（「自动路由 / 渐进扩容 / 自愈」只在单副本下成立）。
**现在**：这四类状态落库（`scheduler_queue` / `rate_limit_windows` /
`reconcile_states` / `runtime_watcher_offsets`），单例后台循环（cron 调度、
runtime 监控、reconcile）靠 `cluster_leases` 里的**数据库租约**选主。

| 事实 | 现在的口径 |
|---|---|
| 任务队列 | 一行一条，带 `lease_owner / lease_expires_at / heartbeat_at`；租约到期未心跳 = 持有者失联，任务自动可被其他副本领取（至少一次） |
| 控制面限流 | 10 次/分钟（restart / reschedule / pause），固定窗口计数在库里，多副本共享 |
| 登录节流 | 5 败/15 分钟，同上（不再各进程各算） |
| 调和退避 | 1s→2s→4s→8s，连续失败超过 3 次置暂停，需人工恢复；状态在库，副本切换不丢 |
| runtime 增量导入 | 已读行数在库，副本切换不重放同一批记录 |
| 后台循环 | 每类只有一个副本在跑（租约 TTL 默认 90s，过期自动接管）；`GET /api/control-plane/cluster` 可看当前持有者 |
| 仍是进程内的 | OAuth 授权 state 与非重放缓存——多副本下回调请求需落在同一副本（已在 `/api/control-plane/cluster` 的 `process_local` 字段如实列出） |

```bash
# 多副本部署：每个副本给一个稳定标识（默认 host:pid:随机），并共用同一个 DATABASE_URL
INSTANCE_ID=node-1 uvicorn main:app --port 8000
INSTANCE_ID=node-2 uvicorn main:app --port 8001
```

> 注意：SQLite 单文件在 NFS/多机共享上不可靠；要真正多副本请用 MySQL（裁定⑦ 权威库）。
> 前端「Agent 管控」页顶部的集群条读 `GET /api/control-plane/cluster`：当前副本、部署模式、租约持有者、队列深度一并呈现。

### 可观测（P2-4）

- `trace_spans` 此前**零写入**，现在由 `services/runtime_tracer.py` 每次模型调用写一条根 span
  （`trace_id` 为**合成 ID，不是 W3C traceparent**）并在有工具调用时写子 span（父子链）。
- `GET /metrics`（需 `METRICS_ENDPOINT_ENABLED=1` + 身份）：Prometheus 文本，直读
  `session_metrics` / `trace_spans` / `alerts` / `work_items` / 队列，不做第二套存储。
- OTLP 导出（B 档）与语义版本化（C 档）**未做**：gen_ai 语义仍在 Development，不提前冻契约。

### 声明式 API（P2-5）

- `GET /api/admin/workflow` 返回 `ETag`；`PUT` 带 `If-Match` 不匹配 → **412**（治 PUT 盲覆盖）。
- 文档体可带 `apiVersion` / `kind`（`agentflow/v1`）；未知 `kind` 400，弃用版本只告警。
- 每次变更加 `change_log`（全局单账本，同事务）与 `generation`；
  `status.observedGeneration` 区分「没处理」与「处理了结果未变」。
- `GET /api/watch?since=<id>`：SSE 推 `change_log` 事件；游标被裁剪 → 先发 `event: resync`（410 等价）。

### RSI 产物治理（波 6 · R6/R7 · 界面已挂载 `v20-ui-rsi`）

治理对象是**四类产物**（技能 / 记忆 / 编排配置 / 模型权重），**代码层 RSI 禁止**（线上稳定优先）：

- **记忆四层唯一管道** `L0 原文 → L1 原子 → L2 场景 → L3 核心`（层级≠权限）。
  晋升门在状态转换层：`cue / lesson / evidence` **三字段缺一 → `no_entry`**（合法结论），
  拿不准默认 `confounded`；负知识合法；来源链可撤回（检疫）；长期不用进衰减队列。
- **提案制三权分离**：生成（限步限钱，超限即熔断并 `blocked`）→ 评估（探针快筛，**永不作发布依据**；
  影子重放要求**冻结金标 + 异厂系 judge**，提升低于 `NOISE_FLOOR=0.01` 判 `collapsed`）→ 发布（**人类管理员批准**）。
  领域类提案（`dimension=domain`）还需域成员会签（INV⟂DOM 双维）。
- **禁改面**是声明对象 `surface_manifests`：`scripts/` `plugins/` `hooks/` **永久禁改**，
  代码路径（`backend/`、`frontend/src/`）禁止由提案修改；其余必须落在白名单内。
- **四熔断**：budget / steps / collapse / error_rate；任一 `open` 即拒绝新建提案；
  人工复位进 `half_open`（不直接 closed）。

接口：`/api/rsi/memories`、`/api/rsi/proposals`、`/api/rsi/surfaces`、`/api/rsi/breakers`。

### 用 systemd（user 级）管理整套栈——推荐

不需要 root，unit 装在 `~/.config/systemd/user/`，开机自启（linger 已开）：

```bash
bash scripts/systemd_user_install.sh          # 首次：建持久 venv + 初始化 MySQL + 装 unit + enable --now

systemctl --user status agentflow.target      # 三个服务一起看
systemctl --user restart agentflow-backend    # 单独重启
journalctl --user -u agentflow-backend -f     # 跟随日志
systemctl --user stop agentflow.target        # 全停
```

| unit | 作用 | 监听 |
|---|---|---|
| `agentflow-mysql` | 私有 MySQL（数据 `/var/tmp/agentflow-mysql`） | `127.0.0.1:3307` |
| `agentflow-backend` | FastAPI（`EnvironmentFile=~/ai/agentflow-data/agentflow.env`） | `0.0.0.0:8000` |
| `agentflow-frontend` | Vite（`/api` 代理到 8000） | `0.0.0.0:5173` |
| `agentflow.target` | 上面三个的集合（enable 的就是它） | — |

- unit 模板在 `deploy/systemd/user/*.in`（`@REPO@/@DATA@/@NODE_BIN@` 安装时渲染）；
- 持久 venv：`~/ai/agentflow-data/venv`；配置：`~/ai/agentflow-data/agentflow.env`（600，含随机 `ENCRYPTION_KEY`）；
- 数据目录为什么在 `/var/tmp`：Ubuntu AppArmor 把 mysqld 限制在 `/var/lib/mysql`、`/tmp`、`/var/tmp`，home 会 `Permission denied`。

### 内网一键起栈（备用：不用 systemd 时）

```bash
bash scripts/serve_lan.sh start     # 起 MySQL(3307) + 后端(0.0.0.0:8000) + 前端(0.0.0.0:5173)
bash scripts/serve_lan.sh status    # 端口/健康/局域网 URL
bash scripts/serve_lan.sh dump      # mysqldump → ~/ai/agentflow-data/backups（留最近 10 份）
bash scripts/serve_lan.sh stop
```

- 数据：MySQL 数据目录 `/var/tmp/agentflow-mysql`（**不是 /tmp**：Ubuntu AppArmor 把 mysqld
  限制在 `/var/lib/mysql`、`/tmp`、`/var/tmp` 下，home 会 `Permission denied`；本机 tmpfiles
  未开启 `/var/tmp` 清理，重启不丢）；运行根/日志/备份在 `~/ai/agentflow-data`。
- 用户：首次启动自动把种子导入 `app_users` 表（`admin` / `bob`，口令 `e2e-pass-123`，
  之后改密走界面），表非空后由表提供档案（裁定⑦）。
- 内网访问：`http://<本机IP>:5173`（浏览器）+ `http://<本机IP>:8000/api/health`；
  后端按 `DEPLOY_MODE=lan` + `ALLOW_CIDRS=192.168.36.0/24` 放行（可用 env 覆盖）。
- 想改用系统 MySQL(3306)：把 `DATABASE_URL` 指过去并设 `MYSQL_PORT=3306`
  （当前系统实例 root 口令未知，脚本默认不碰它）。

### 数据库切换

```bash
# 默认 SQLite（零配置）
uvicorn main:app

# 切换到 MySQL
DATABASE_URL="mysql+aiomysql://root:***@localhost:3306/platform" uvicorn main:app
```

---

### 运行时发现（daemon）

```bash
# 平台侧（agentflow.env）：先配 token 并重启后端
AF_DAEMON_TOKEN=<随机串>
systemctl --user restart agentflow-backend

# 机器侧：探测一次看结果（不上报）
python3 scripts/runtime-daemon.py --once --dry-run

# 上报一次 / 常驻 15s 心跳（装成 systemd 用户服务见 deploy/systemd/user/af-runtime-daemon.service.in）
AF_DAEMON_TOKEN=<同一随机串> python3 scripts/runtime-daemon.py --once
AF_DAEMON_TOKEN=<同一随机串> python3 scripts/runtime-daemon.py
```

探测三处来源：`AF_RUNTIME_CLI_<CLI>_BIN` 覆盖 → `PATH` → 已知安装位置（**本机 dsh/hermes 不在 PATH，靠第三处命中**）。
只读 `--version` / `--list-models` 的 stdout，**不上报任何登录凭据**；解析不出模型时界面显示「不可读」而不是「0 个模型」。

## 演示流程

```
登录 → 创建 Plugin/Skill/MCP → 下载 demo
→ 创建工作流（文本/可视化）→ 发布
→ 创建 Agent（选模型 + 绑定工作流）→ 运行
→ 编排多 Agent（YAML / 画布拖拽）
→ 创建项目（输入需求 + 绑定 Agent）→ 执行
→ 监控面板查看进度 / Token 图表
→ 对话中心测试 Agent
```
