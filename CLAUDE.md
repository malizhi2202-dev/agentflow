# CLAUDE.md — 项目级 AI 指令

> 本文件每次会话自动加载。

## 项目定位

**AgentFlow** —— 通用 Agent 编排与管控平台，不绑定任何特定的开发流程或框架。
核心能力：Agent 编排（YAML ↔ 画布）、K8s 式管控（隔离域 / 自动路由 / 渐进扩容 / Reconcile 自愈）、
工作流知识产物监控、对话中心、工具库与模板市场、RBAC + 审计。

## 代码布局

| 路径 | 说明 |
|---|---|
| `agentflow/backend/` | FastAPI 服务：`routes/` 路由、`models/` ORM、`services/` 业务、`engine/` 编排引擎、`storage/` 存储抽象 |
| `agentflow/frontend/` | React 18 + TS + Vite：`pages/` 页面、`components/` 组件、`stores/` Zustand |
| `agentflow/.specs/` | 工作流知识产物（按 change-id 分目录：CHANGE / REQUIREMENT / DESIGN / TASK / TEST / REVIEW 等 + `runtime.jsonl`） |
| `backup/` | 产物文件保存前的自动备份 |

## 本地运行

```bash
# 后端（首次启动自动建库）
cd agentflow/backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 前端
cd agentflow/frontend && npm install && npm run dev
# 默认管理员 admin / 123456
```

## 约定

- 后端：路由只做参数校验与鉴权，业务逻辑放 `services/`；数据库访问统一走 `database.SessionLocal` / `get_db`。
- 前端：状态放 `stores/`，页面组件不直接散落 fetch 逻辑；样式复用 `src/styles/tokens.css` 的 CSS 变量。
- 注释与界面文案使用中文。
- 知识产物是产品的一等数据：读写 `.specs/` 的路径一律经 `config.get_specs_dir()`，不要硬编码目录。
- 环境变量与默认值集中定义在 `agentflow/backend/config.py`，新增配置项同步更新 `agentflow/README.md` 的配置表。
