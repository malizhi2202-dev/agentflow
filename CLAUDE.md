# CLAUDE.md — 项目级 AI 指令

> 本文件每次会话自动加载。

## 项目定位

**AgentFlow** —— 通用 Agent 编排与管控平台，不绑定任何特定的开发流程或框架。
核心能力：Agent 编排（YAML ↔ 画布）、K8s 式管控（隔离域 / 自动路由 / 渐进扩容 / Reconcile 自愈）、
工作流知识产物监控、对话中心、工具库与模板市场、RBAC + 审计。

## 代码布局

| 路径 | 说明 |
|---|---|
| `backend/` | FastAPI 服务：`routes/` 路由、`models/` ORM、`services/` 业务、`engine/` 编排引擎、`runtime/` 运行时适配器、`storage/` 存储抽象 |
| `frontend/` | React 18 + TS + Vite：`pages/` 页面、`components/` 组件、`stores/` Zustand |
| `.specs/` | 工作流知识产物（按 change-id 分目录：CHANGE / REQUIREMENT / DESIGN / TASK / TEST / REVIEW 等 + `runtime.jsonl`） |
| `backup/` | 产物文件保存前的自动备份 |
| `STATE.md` | **跨会话状态**：当前阶段、进行中、待人工裁定项、下一步建议。会话开始先读，结束前更新 |

## 本地运行

```bash
# 后端（首次启动自动建库）
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 前端
cd frontend && npm install && npm run dev
# 默认管理员 admin / 123456
```

## 现状与已知缺陷（动手前必读）

以下为已核实的事实，改动相关区域时不要误判：

| 事实 | 影响 |
|---|---|
| **`npm run build` 必然失败**（`tsc` 报 32 个 TS 错误） | 当前**没有可用的生产构建**；`npx vite build` 可绕过类型检查但不是项目构建契约 |
| **`node_modules` 被 git 跟踪**（35,847 个跟踪文件中 35,517 个是它） | `.gitignore` 已含规则但历史已纳入跟踪，规则不生效；跑 dev server 会污染 `git status` |
| **认证身份来自 `X-User-Id` 请求头且默认 admin**，`get_current_user` 缺身份时回退 admin | fail-open 后门；唯一缓解（localhost 限制）在反向代理后失效 |
| **口令为无盐 `hashlib.sha256`**，默认口令硬编码 `123456` | 待修为自适应哈希 |
| **三处关键状态在进程内存**：调度队列、控制面限流、调和退避 | 「路由/扩容/自愈」**仅在单副本下成立**，多副本会各自为政 |
| **`Domain` 不是安全边界** | 它只是逻辑分组（4 字段）；Agent 在平台进程内执行，无沙箱 |
| **9 阶段模型硬编码在 13 个文件** | 与「不绑定任何开发流程」的定位存在张力；`/api/admin/workflow` + `workflow.json` 是已存在但未接上的配置落点 |
| **无 CI / Dockerfile / Makefile / LICENSE / pyproject.toml** | 无自动化质量门 |
| **迁移是 `database.py` 里 3 条内联 `ALTER TABLE`** | 无版本账本、无回滚 |

完整改进路线图：`.specs/platform-evolution/ROADMAP.md`
竞品调研（67 个开源仓库）：`.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md`
产品文档与原型：`.specs/product-design/PRODUCT-DESIGN.html`

## 约定

- 后端：路由只做参数校验与鉴权，业务逻辑放 `services/`；数据库访问统一走 `database.SessionLocal` / `get_db`。
- 前端：状态放 `stores/`，页面组件不直接散落 fetch 逻辑；样式复用 `src/styles/tokens.css` 的 CSS 变量。
- 注释与界面文案使用中文。
- 知识产物是产品的一等数据：读写 `.specs/` 的路径一律经 `config.get_specs_dir()`，不要硬编码目录。
- 环境变量与默认值集中定义在 `backend/config.py`，新增配置项同步更新 `README.md` 的配置表。
- **新增「必须人批」的动作时，规则要加在状态转换层（动作者类型 × 目标状态），不要只写进给 Agent 的提示词**——
  提示词契约不等于门禁。
- **同一不变量应在两处独立校验**（入口 + 中间件），不要假设前一处覆盖了所有入口；
  越权与「资源不存在」统一返回 404，避免用状态码探测他人资源。
- 涉及 `.specs/` 的发现类产物（调研/议题讨论）按 code-kit R16 执行：**议题即 change**（R16.5），工件 `TOPICS.md` / `D-<子议题>.md`（超 250 行拆 `D-<子议题>/` 文件包 · R16.8）/ `ROADMAP.md`
  落 change 目录本层（不设 `discovery/` 子树），**随步落盘 + 审核状态标**（R16.3）——未过 ⑤ 人审门的结论禁止进 ROADMAP、禁止立项引用。
