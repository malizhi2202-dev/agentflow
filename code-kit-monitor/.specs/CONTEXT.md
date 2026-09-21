# CONTEXT.md — code-kit-monitor 项目上下文

> 自动生成：2026-07-06 · I-intel-scan
> 证据来源：grep / find / wc -l / sqlite3

---

## 1. 项目概览

- **项目名**：code-kit-monitor
- **定位**：AI 开发平台 — 为 code-kit 工作流提供可视化监控面板 + Agent 编排 + 对话中心
- **仓库路径**：`/home/malizhi/ai/code-flow/code-kit-monitor`

---

## 2. 技术栈（证据驱动）

| 层 | 技术 | 证据 |
|---|---|---|
| 前端框架 | React 18 + TypeScript 5.5 + Vite 5.4 | `frontend/package.json` |
| UI 库 | Tailwind CSS 3.4 + Tremor 3.18 | `frontend/package.json` |
| 状态管理 | Zustand 4.5 | `frontend/src/stores/*.ts` (11 个 store) |
| 可视化画布 | React Flow (@xyflow/react) 12.x | `frontend/package.json` |
| 代码编辑器 | CodeMirror 6 | `frontend/package.json` |
| 图表 | Recharts 2.15 | `frontend/package.json` |
| 后端框架 | FastAPI 0.110+ (Python 3.10+) | `backend/main.py` |
| ORM | SQLAlchemy 2.0 | `backend/database.py` |
| 数据库 | SQLite（默认）/ MySQL（可选） | `backend/database.py`, `backend/storage/` |
| 缓存 | Redis 5.0（可选） | 环境变量 `REDIS_URL` |

---

## 3. 代码规模（2026-07-06 精确扫描）

| 指标 | 数量 | 扫描命令 |
|---|---|---|
| 后端 .py 文件（排除 .venv, __pycache__） | **112** | `find backend/ -name '*.py' -not -path '*/.venv/*' -not -path '*/__pycache__/*' \| wc -l` |
| 后端 .py 文件（排除 tests） | 97 | `find backend/ -name '*.py' -not -path '*/.venv/*' -not -path '*/tests/*' \| wc -l` |
| API 路由模块 | **27** (28 文件含 __init__.py) | `ls backend/routes/*.py` |
| API 端点总数 | **153** | `grep -c '@router\.\(get\|post\|...\)' routes/*.py \| paste -sd+ \| bc` |
| ORM 模型 | **15** (16 文件含 __init__.py) | `ls backend/models/*.py` |
| 业务服务 | **25** (26 文件含 __init__.py) | `ls backend/services/*.py` |
| 引擎模块 | **4** (5 文件含 __init__.py) | `ls backend/engine/*.py` |
| 数据库表 | **21** | `sqlite3 platform.db ".tables"` |
| 前端 .tsx/.ts（排除 node_modules） | **96** | `find frontend/src/ -name '*.tsx' -o -name '*.ts' -not -path '*/node_modules/*' \| wc -l` |
| 页面 | **32** | `ls frontend/src/pages/*.tsx \| wc -l` |
| Zustand Store | **11** | `ls frontend/src/stores/*.ts \| wc -l` |
| 组件 | **28** | `ls frontend/src/components/*.tsx \| wc -l` |
| 连线策略类型 | **13** | `backend/engine/yaml_schema.py` enum |
| 连线 Edge 组件 | **13** | `frontend/src/components/edges/index.ts` |
| 后端测试文件 | **7** | `ls backend/tests/*.py` (排除 __init__.py) |
| 前端测试文件 | **5** | `ls frontend/src/__tests__/*` |
| 测试文件总计 | **12** | 7 + 5 |

---

## 4. API 路由详情

### 4.1 路由文件 → 端点数量

| 路由文件 | 端点数 | 前缀 | 说明 |
|---|---|---|---|
| `admin_api.py` | 11 | `/api/admin` | 管理功能（用户管理等） |
| `agent_knowledge_api.py` | 11 | `/api/agents` | Agent 知识库 CRUD |
| `agents_api.py` | 7 | `/api/agents` | Agent CRUD + 运行 |
| `alerts_api.py` | 4 | `/api/alerts` | 🆕 告警管理 |
| `artifact.py` | 2 | `/api/artifact` | 产物文档查看 |
| `assembly_api.py` | 3 | `/api/assembly` | 工作流组装 |
| `audit_api.py` | 3 | `/api/audit` | 审计日志 |
| `auth_api.py` | 10 | `/api/auth` | 认证 + 用户管理 |
| `change_detail.py` | 1 | `/api/changes` | Change 详情 |
| `changes.py` | 1 | `/api/changes` | Change 列表 |
| `channel_api.py` | 8 | `/api/channel` | 渠道管理 + OAuth |
| `chat_api.py` | 4 | `/api/chat` | 对话中心 |
| `control_plane_api.py` | 7 | `/api/control-plane` | 🆕 Agent 控制面 |
| `domain_api.py` | 9 | `/api/domains` | 🆕 域管理 |
| `gateway_api.py` | 2 | `/api/gateway` | 🆕 网关管理 |
| `git_safety.py` | 1 | — | Git 安全检查 |
| `health.py` | 1 | `/api/health` | 健康检查 |
| `metrics_api.py` | 15 | `/api/metrics` | 指标聚合 + 链追踪 |
| `orchestration_api.py` | 12 | `/api/orchestration` | 编排 CRUD + validate/apply |
| `projects_api.py` | 9 | `/api/projects` | 项目管理 |
| `roles_api.py` | 4 | `/api/roles` | 角色 CRUD |
| `roles_custom_api.py` | 5 | `/api/roles` | 自定义角色 |
| `runtime_api.py` | 6 | `/api/runtime` | 运行时状态 |
| `search.py` | 1 | — | 搜索 |
| `token_usage.py` | 1 | — | Token 统计 |
| `tools_api.py` | 8 | `/api/tools` | 工具库 CRUD |
| `workflows_api.py` | 7 | `/api/workflows` | 工作流 CRUD + 发布/执行 |
| **合计** | **153** | | |

> 🆕 = README.md 中未列出的路由（4 个：alerts, control_plane, domain, gateway）

---

## 5. 数据模型（ORM）

### 5.1 模型文件清单（15 个，排除 __init__.py）

| 文件 | 对应数据库表 |
|---|---|
| `agent.py` | `agents` |
| `agent_memory.py` | `agent_memories` |
| `agent_probe.py` 🆕 | `agent_probes` |
| `channel_config.py` | `channel_configs` |
| `conversation.py` | `conversations` |
| `domain.py` 🆕 | `domains` |
| `knowledge_source.py` | `knowledge_sources` |
| `message.py` | `messages` |
| `metrics.py` | `metrics_raw`, `session_metrics` |
| `orchestration.py` | `orchestration_instances`, `orchestration_templates`, `topology_snapshots` |
| `project.py` | `projects` |
| `role_custom.py` | `custom_roles` |
| `scheduler_queue.py` 🆕 | `scheduler_queue`, `scheduling_queue` |
| `tool.py` | `tools` |
| `workflow.py` | `workflows`, `workflow_snapshots` |

> 🆕 = 3 个 README 未列出的新模型

### 5.2 数据库表清单（21 个）

```
agent_memories     agent_probes       agents             channel_configs
conversations      custom_roles       domains            knowledge_sources
messages           metrics_raw        orchestration_instances
orchestration_templates  projects    scheduler_queue    scheduling_queue
session_metrics    tools              topology_snapshots trace_spans
workflow_snapshots workflows
```

---

## 6. 业务服务层

### 6.1 服务文件清单（25 个，排除 __init__.py）

| 文件 | 职责 |
|---|---|
| `agent_probe_service.py` 🆕 | Agent 探针服务 |
| `alert_service.py` 🆕 | 告警服务 |
| `audit_service.py` | 审计服务 |
| `channel_adapter.py` | 渠道适配器（抽象层） |
| `chat_service.py` | 对话服务 |
| `codekit_importer.py` | code-kit 工件导入 |
| `encryption_service.py` | 加密服务 |
| `gate_resolver.py` | 门禁解析 |
| `host_metrics.py` 🆕 | 主机指标采集 |
| `k8s_routing_service.py` 🆕 | K8s 路由服务 |
| `llm_providers.py` 🆕 | LLM 提供商抽象 |
| `metrics_scheduler.py` | 指标调度 |
| `metrics_service.py` | 指标服务 |
| `oauth_dingtalk.py` | 钉钉 OAuth |
| `oauth_feishu.py` | 飞书 OAuth |
| `oauth_mock.py` | OAuth Mock 开发模式 |
| `oauth_provider.py` | OAuth 抽象基类 |
| `orchestration_parser.py` | 编排 YAML 解析 |
| `runtime_tracer.py` | 运行时追踪 |
| `runtime_watcher.py` | 文件系统监控 |
| `scheduler_service.py` 🆕 | 调度服务 |
| `security_service.py` | 安全服务 |
| `snapshot_service.py` | 快照服务 |
| `template_service.py` | 模板服务 |
| `tool_service.py` | 工具服务 |

> 🆕 = 6 个 README 未列出的新服务

### 6.2 渠道适配器子模块

`backend/services/adapters/` 包含 5 个适配器：
- `feishu.py` — 飞书
- `dingtalk.py` — 钉钉
- `slack.py` — Slack
- `telegram.py` — Telegram
- `smtp_email.py` — 邮件

---

## 7. 编排引擎

| 文件 | 职责 |
|---|---|
| `reconcile_loop.py` | 声明式调度控制循环 |
| `scheduler.py` | 优先级调度器 |
| `yaml_schema.py` | YAML Schema 校验 + 13 种连线策略 enum |
| `gate_registry.py` | 安全闸门注册 |

---

## 8. 前端页面清单（32 个）

| 页面文件 | 功能 |
|---|---|
| `Home.tsx` | 仪表盘首页 |
| `Detail.tsx` | Change 详情 |
| `LoginPage.tsx` | 登录页 |
| `OrchestrationPage.tsx` | 编排画布 |
| `OrchestrationListPage.tsx` | 编排列表 |
| `OrchDocPage.tsx` | 编排 YAML 文档 |
| `ConversationCenter.tsx` | 对话中心 |
| `AgentBuilder.tsx` | Agent 创建向导 |
| `AgentDetail.tsx` | Agent 详情 |
| `AgentControlPlane.tsx` 🆕 | Agent 控制面 |
| `ProjectManager.tsx` | 项目管理 |
| `ProjectDetail.tsx` | 项目详情 |
| `Roles.tsx` | 角色列表 |
| `RoleDetail.tsx` | 角色详情 |
| `RoleMarket.tsx` | 角色市场 |
| `MonitoringDashboard.tsx` | 监控仪表盘 |
| `Runtime.tsx` | 运行时监控 |
| `AuditLog.tsx` | 审计日志 |
| `SecurityPage.tsx` | 安全设置 |
| `DocEditor.tsx` | 文档编辑器 |
| `AssemblyView.tsx` | 工作流组装视图 |
| `AlertsPage.tsx` 🆕 | 告警页面 |
| `SpecsEditor.tsx` 🆕 | Specs 编辑器 |
| `TemplateMarket.tsx` 🆕 | 模板市场 |
| `ToolDetail.tsx` 🆕 | 工具详情 |
| `ToolMarket.tsx` 🆕 | 工具市场 |
| `UserCenter.tsx` 🆕 | 用户中心 |
| `UserManagement.tsx` 🆕 | 用户管理 |
| `WorkflowCreate.tsx` 🆕 | 工作流创建 |
| `WorkflowDetail.tsx` 🆕 | 工作流详情 |
| `WorkflowEditor.tsx` 🆕 | 工作流编辑器 |
| `WorkflowList.tsx` 🆕 | 工作流列表 |

> 🆕 = 12 个 README 未列出的新页面

---

## 9. 前端组件清单（28 个）

| 组件文件 | 功能 |
|---|---|
| `OrchestrationCanvas.tsx` | 拓扑画布（React Flow） |
| `EdgeEditor.tsx` | 连线配置面板 |
| `TopologyMonitor.tsx` | 拓扑监控 |
| `TraceViewer.tsx` | 调用链追踪 |
| `ChatWindow.tsx` | 聊天窗口 |
| `ChannelConfig.tsx` | 渠道配置 |
| `QrScanModal.tsx` | 扫码弹窗 |
| `YamlEditor.tsx` | YAML 编辑器 |
| `AgentNodePool.tsx` | Agent 节点池 |
| `EntityMonitor.tsx` | 实体监控 |
| `EntityBreakdownPanel.tsx` | 实体拆解面板 |
| `ArtifactTab.tsx` | 产物页 |
| `GateTab.tsx` | 门禁页 |
| `TaskTab.tsx` | 任务页 |
| `StatsTab.tsx` | 统计页 |
| `HealthTab.tsx` | 健康页 |
| `WorkflowTab.tsx` | 工作流页 |
| `ChangeCard.tsx` | Change 卡片 |
| `ConfirmDialog.tsx` | 确认弹窗 |
| `UserSelect.tsx` | 用户选择 |
| `ErrorBoundary.tsx` | 错误边界 |
| `ProjectSwitcher.tsx` | 项目切换 |
| `SearchBar.tsx` | 搜索栏 |
| `TabNav.tsx` | Tab 导航 |
| `TopBar.tsx` | 顶栏 |
| `AgentProbePanel.tsx` 🆕 | Agent 探针面板 |
| `ReconcileConsole.tsx` 🆕 | Reconcile 控制台 |
| `SchedulerConfig.tsx` 🆕 | 调度配置 |

> 🆕 = 3 个 README 未列出的新组件

---

## 10. Zustand Store 清单（11 个）

| Store 文件 | 职责 |
|---|---|
| `auth.ts` | 认证状态 |
| `agents.ts` | Agent 状态 |
| `changes.ts` | Change 状态 |
| `chat.ts` | 对话状态 |
| `metrics.ts` | 指标状态 |
| `orchestration.ts` | 编排状态 |
| `projects.ts` | 项目状态 |
| `tools.ts` | 工具状态 |
| `workflows.ts` | 工作流状态 |
| `controlPlane.ts` 🆕 | 控制面状态 |
| `domains.ts` 🆕 | 域管理状态 |

> 🆕 = 2 个 README 未列出的新 Store

---

## 11. 连线策略（13 种 — 已验证）

**来源**：`backend/engine/yaml_schema.py:82` 和 `frontend/src/components/edges/index.ts`

| # | 策略 | 前端 Edge 组件 | 后端 Schema 支持 |
|---|---|---|---|
| 1 | sequential | `SequentialEdge.tsx` | ✅ |
| 2 | pipeline | `PipelineEdge.tsx` | ✅ |
| 3 | parallel | `ParallelEdge.tsx` | ✅ |
| 4 | fan-out | `FanOutEdge.tsx` | ✅ |
| 5 | fan-in | `FanInEdge.tsx` | ✅ |
| 6 | map-reduce | `MapReduceEdge.tsx` | ✅ |
| 7 | fork | `ForkEdge.tsx` | ✅ |
| 8 | condition | `ConditionEdge.tsx` | ✅ |
| 9 | master-slave | `MasterSlaveEdge.tsx` | ✅ |
| 10 | event-trigger | `EventTriggerEdge.tsx` | ✅ |
| 11 | human-approval | `HumanApprovalEdge.tsx` | ✅ |
| 12 | retry-fallback | `RetryFallbackEdge.tsx` | ✅ |
| 13 | dead-letter | `DeadLetterEdge.tsx` | ✅ |

**验证结论**：README 声称"13 种连线策略"与实际代码一致 ✅

---

## 12. 测试文件

### 后端测试（7 个）
```
backend/tests/test_agent_channel.py
backend/tests/test_agent_channel_supplement.py
backend/tests/test_api_integration.py
backend/tests/test_edge_cases.py
backend/tests/test_llm_providers.py
backend/tests/test_round6_api_edges.py
backend/tests/test_round7_security.py
```

### 前端测试（5 个）
```
frontend/src/__tests__/ChannelConfig.test.tsx
frontend/src/__tests__/ChatWindow.test.tsx
frontend/src/__tests__/ConversationCenter.test.tsx
frontend/src/__tests__/chat-store.test.ts
frontend/src/__tests__/frontend-edge-cases.test.tsx
```

**总计：12 个测试文件** — 与 README 一致 ✅

---

## 13. 关键发现

1. **README 严重过时**：大多数数字低于实际代码规模，代码库在 README 编写后持续增长
2. **新增功能模块**：Agent 控制面（Control Plane）、域管理（Domains）、告警系统（Alerts）、K8s 路由、LLM 提供商抽象、主机指标采集
3. **前端大幅扩展**：页面从 20 → 32，新增工作流编辑器/列表/创建/详情、工具市场/详情、用户中心/管理、模板市场、Specs 编辑器等
4. **13 种连线策略**前后端一致，是 README 中少数准确的数字
5. **12 个测试文件**数量准确
6. **数据库 21 张表**，结构完整

---

## 14. 既有文档

| 文档 | 路径 | 状态 |
|---|---|---|
| `CLAUDE.md` | 仓库根 | 存在 |
| `README.md` | 仓库根 | 存在（部分过时） |
| `CONTEXT.md` | `.specs/` | 本次创建 |
| `AGENTS.md` | — | 不存在 |
| `.cursor/rules/` | — | 不存在 |

---

*扫描日期：2026-07-06 · 工具：grep + find + wc -l + sqlite3*
