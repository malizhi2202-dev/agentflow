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
| 代码现状 / 待办 / 冻结状态 | `STATE.md`（裁定⑧：开发冻结中，只改文档与原型） |
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
> ⚠ **安全现状（开发冻结未修，部署前必读）**：当前身份取自 `X-User-Id` 请求头且缺省为 admin、默认口令 `123456`、口令为无盐 SHA-256——**请勿把未修复形态暴露公网或置于未配置可信代理的反代之后**。修复方案 P0-1/2/3 已过审（v8），解冻指令后实施。git 历史已通过凭据扫描：**无凭据泄露**（56 rev 全量，报告 `.specs/credential-scan/SCAN-REPORT.md`）；建议顺手开启 GitHub Secret Scanning。

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

### 🤖 Agent 编排
- **YAML ↔ 画布双向同步**：编辑 YAML → 画布自动更新，拖拽画布 → YAML 自动更新
- **13 种连线策略**：sequential / pipeline / parallel / fan-out / fan-in / map-reduce / fork / condition / master-slave / event-trigger / human-approval / retry-fallback / dead-letter
- **每条连线独立配置**：重试策略、Token 限制、安全栅栏、数据脱敏、超时、IO Schema
- **Reconcile Loop**：声明式调度，期望状态 vs 实际状态 → 漂移检测 → 自动修复
- **拓扑画布**（React Flow）：拖拽 Agent 节点 + 连线 + MiniMap
- **拓扑监控**：实时节点状态颜色 + 跨 Agent 调用链追踪（TraceViewer）

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

### 📊 项目管理
- 项目 CRUD + 需求输入
- 绑定 Agent + 工作流 → 执行 → 监控

### 👤 角色系统
- 结构化角色定义（性情/职责/边界/触发场景）
- 角色市场 + 角色详情
- 可绑定到工作流节点

### 🔒 安全
- 密码登录 + localStorage 持久化
- RBAC 权限（admin / user）
- Agent API Key 加密存储
- 全操作审计日志
- Webhook 签名校验

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

### 数据库切换

```bash
# 默认 SQLite（零配置）
uvicorn main:app

# 切换到 MySQL
DATABASE_URL="mysql+aiomysql://root:***@localhost:3306/platform" uvicorn main:app
```

---

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
