# code-kit-monitor — AI 开发平台

> 为 code-kit 工作流提供可视化监控面板 + Agent 编排 + 对话中心

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

---

## 功能模块

### 🎛 code-kit 工作流监控
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
- code-kit 风格角色定义（性情/职责/边界/触发场景）
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
| 数据库 | SQLite（默认）/ MySQL（可选） |
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
  ←→ codekit_importer（导入 code-kit 工件）
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
code-kit-monitor/
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
│   │   ├── codekit_importer.py      # code-kit 导入
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
│   ├── parsers/                     # code-kit 工件解析
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
| `DATABASE_URL` | (空=SQLite) | MySQL 连接串 |
| `REDIS_URL` | (空=跳过) | Redis 缓存 |
| `SPECS_DIR` | `../.specs` | code-kit 产物目录 |
| `SCAN_INTERVAL` | `5` | 文件扫描间隔（秒） |
| `ENCRYPTION_KEY` | (必填) | 加密密钥（32 字节） |
| `CHANNEL_OAUTH_MOCK` | `false` | OAuth Mock 模式 |

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
