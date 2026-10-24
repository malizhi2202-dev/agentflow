# CLAUDE.md — 项目级 AI 指令

> 本文件每次会话自动加载。

## 项目定位

**AgentFlow** —— 通用 Agent 编排与管控平台，不绑定任何特定的开发流程或框架。
核心能力：Agent 编排（YAML ↔ 画布）、K8s 式管控（隔离域 / 自动路由 / 渐进扩容 / Reconcile 自愈）、
工作流知识产物监控、对话中心、工具库与模板市场、RBAC + 审计。

## 文档地图（先看这里 · 2026-10-23 v20 归并）

**本仓有两层，别混**：**设计档**（`.specs/`，持续更新到 **v20**）与**代码**（基线 `4ac819bf`·2026-10-12，**落后设计约 6 轮**）。**产品应该是什么样 → 看设计档；代码现在有什么 → 看 `STATE.md` 现状表。**

| 想知道什么 | 打开哪一份 |
|---|---|
| 产品应该是什么样（唯一权威设计文本） | `.specs/product-design/PRODUCT-DESIGN.html` **v20** |
| 界面形态（**127** 页可点原型） | `.specs/product-design/prototype/index.html` |
| **这句话现在还作数吗** | `.specs/platform-evolution/RULINGS.md`（现行口径单一事实源） |
| 文档索引 / 审核台账 | `.specs/product-design/INDEX.md` |
| 过审结论 / 议题状态 | `.specs/platform-evolution/ROADMAP.md` / `TOPICS.md` |
| 跨会话状态 / 代码基线 | `STATE.md` |

**归并纪律**：① 一条口径只活在一个地方（现行→`RULINGS.md`；设计→`PRODUCT-DESIGN`；界面→`prototype/`）。② 推翻 = 加 `⛔` 标记 + 指针，**不删原文**。③ 改设计先改 RULINGS 一行 → 再改主档 → 同批同步原型与术语表。④ 文档写「未实现」就是未实现，**不据文档反推代码**。

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
cd backend && uvicorn main:app --port 8000 --reload   # 本机 127.0.0.1；对外暴露前先设 DEPLOY_MODE + TRUSTED_PROXY_IPS

# 前端
cd frontend && npm install && npm run dev
# 首启口令：AGENTFLOW_ADMIN_PASSWORD 或随机生成（只打一次启动日志），首登强制改密
```

## 现状与已知缺陷（动手前必读）

以下为已核实的事实，改动相关区域时不要误判：

| 事实 | 影响 |
|---|---|
| **`npm run build` 已恢复**（波 0 清零 32 个 TS 错误） | 构建与 `vitest` 是现行质量门；新增类型错误会让门变红 |
| **`node_modules` 被 git 跟踪**（10-23 复测：**36,134** 个跟踪文件中 35,517 个是它） | `.gitignore` 已含规则但历史已纳入跟踪，规则不生效；跑 dev server 会污染 `git status` |
| **认证 = 服务端会话**（波 1 已实施）：`__Host-session` HttpOnly cookie > Bearer PAT > 401，**不再回退 admin**；`DEPLOY_MODE` 三值 + 可信代理 XFF 纪律 | fail-open 已清零；改身份相关代码先读 `backend/main.py` 中间件与 `deploy_guard` |
| **口令 = argon2id**（scrypt 兜底），出厂口令 `123456` 已废除，首启强制改密（`must_change_password` 服务端 403） | 不要恢复 `hashlib.sha256` 直存；登录节流已落库（5 败/15min，多副本共享） |
| **关键状态已落库**（波 2 已实施）：调度队列/限流/退避/监控偏移 + 任务租约 + 单例循环选主 | 多副本仍以「单副本承诺」为界（`/api/control-plane/cluster` 如实呈现） |
| **`Domain` 不是安全边界** | 它只是逻辑分组（4 字段）；Agent 在平台进程内执行，**执行隔离只是契约先行**（P2-3：档位未实现就显式拒绝） |
| **9 阶段模型已收口为单一事实源**（波 0） | 后端 `stage_config.py` + `/api/admin/workflow` + 前端 `stores/stageConfig.ts`；改阶段表只改一处 |
| **无 CI / Dockerfile / Makefile / LICENSE / pyproject.toml** | 无自动化质量门 |
| **迁移账本已版式化**（波 0：`backend/migrations.py` 001…013 幂等账本） | 新增 schema 一律加迁移号，不写内联 `ALTER TABLE` |
| **裁定⑦（2026-09-23）**：可计量追踪数据（用户/会话/PAT/错误告警/审计/变更账本/指标 trace）权威库 = MySQL；SQLite 降为本地体验档；`users.json`/`audit.jsonl` 将表化退役 | 一切新数据模型设计按 MySQL 档书写，不再新增文件态权威数据 |
| **裁定⑧**：开发冻结 ⛔ **已于 2026-10-24 解除** | 代码可改；`PRODUCT-DESIGN.html` §1.6.0 的**波 0–6 全部已落地**（提交见 `STATE.md`），后续按 `RULINGS.md` 增量推进 |
| **git 历史已扫描（09-23）**：56 rev 全量无凭据泄露；遗留三件强度项（KDF/Secret Scanning/提交元数据邮箱） | 无需紧急轮换；见 `.specs/credential-scan/SCAN-REPORT.md` 与 v10 P0-10 |

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
