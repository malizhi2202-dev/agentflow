# STATE — 跨会话状态

> 本文件记录当前进行中的工作与上次断点。**每次会话结束前更新**。
> 最近更新：2026-10-25（v24-doc-refresh 代码批 + 挂账结案会话）

## 会话状态（GO.md 第一步四字段 · 2026-10-24 起必填）

- **活跃 Change**：`v24-doc-refresh`（代码 ↔ product-design 一致性——**文档批 + 代码批均完成**：主档 v21→v23 · RULINGS §五点五 挂账 D1–D10 → §五点五·一 结案 + §五点五·二 残项 R25-1…11 · 迁移 026–031 实施 D1–D11）
  - 前序**已全部提交**：`ui-parity`（P0–P5 · `51fd105d`）· `v22-*` 三件 · `v23-multica-import`
- **当前阶段**：v24 **两批收口完成**——文档：主档 **v23** · 4,277 行 · HTML 校验通过 · INDEX/RULINGS/CHANGELOG/STATE 同步；代码：后端 **733 OK（0 失败）** · 前端 **tsc 0 · vitest 250/250 · build ✓ 19.9s** · `proto_parity --strict` exit 0
- **当前 Task**：向用户汇报全批结果 → 确认后提交 → 人工过目 R25 残项清单（R25-1…11，见 RULINGS §五点五·二）
- **中断任务**：（空）
- **ai_context_doc**：`CLAUDE.md`（2026-10-24 用户选定；`.specs/CONTEXT.md` 已作废不用）
- **last_intel_scan**：（未跑；按用户选择跳过）

## 当前阶段

**实施阶段：波 0–7 全部落地 + v21/v22/v23 + ui-parity 全量对齐完成（2026-10-25）**——`PRODUCT-DESIGN` §1.6.0 六个升级波次 + 设计遗留项收口（波 7）按序落地并提交；随后 v21（测试基建 / 真运行时 / 用户审计表化）、v22（导航 6 组 / 运行时发现 / 创建 Agent 去凭据 / 前端壳层对齐）、v23（multica 内容迁入）、ui-parity（127 页原型逐族对齐 P0–P5）四轮落地。裁定⑦（MySQL 权威档）仍为设计口径（SQLite 为本地体验档），裁定⑧ 开发冻结已解除。

**本轮（v24-doc-refresh）起因**：用户指出「项目里边的代码实现和 `./specs` 的文档 product-design 的实现的不一致」。四路只读对账（数据模型 / API 端点 / 前端语义 / 文档自述）+ 质量门实测后的判定是——

> **主因是「文档滞后于代码」，不是「代码写错了」。** 主档 v20 的 §1.6「代码实态」表停在 10-12 基线 `4ac819bf`；其上 **89 个提交**（32 触 `backend/`、18 触 `frontend/`）没回填一个字。
> **次因是「设计与代码口径真有不一致」**——共 10 条（D1–D10），**不改设计也不改代码**，一律挂账等裁定。

## 最近完成

| 时间 | 事项 | 产物 |
|---|---|---|
| 2026-10-25 | **v24-doc-refresh · 代码 ↔ 文档一致性回填（本轮）** | ① **四路只读对账**（数据模型 / API 端点 / 前端语义 / 文档自述）② **主档 v21/v22 回填**：§1.6 标的声明与现状基线表按 `51fd105d` 实测重写八维；§1.6.0 波 0 判据「可回滚」**降级**为「版本账本 + 幂等」（无 down 实现）；§1.6.7 ①「P0/P1/P2/W 全部仍未实施」标 ⛔ 过期；§2.12 / §5.19 / §6.19–6.27 / §6.29–6.31 共 **14 节**「规划原型 · 未实现」→「已实施」+ 各附实测口径注；§3.3 表行逐张标 **已实施 / 部分实施 / 未实现 / 口径差异** 四态；§3.3 导语 26 表 → **59 表**（53 张注册进 `Base.metadata` + 6 张仅迁移建）；页眉 chip v19 → **v21**、页脚版本链补 v21/v22 ② **RULINGS**：头部补记四轮、裁⑦「users.json 表化未做」改已做、裁⑧「波 6 在途」改波 0–7 全收口、R6-1「定时作业未做」改已做、R6-3「影子重放执行器未做」改已做、R7-1 补「金标/异厂系为调用方声明」、R9-1 删「未提交」、术语表记忆四层补代码实况；**新增 §五点五「代码 ↔ 设计口径差异挂账」10 条 D1–D10** ③ **INDEX.md** 版本谱系补 v21/v22、代码基线口径改写 ④ **STATE.md 全量重写**（本文件）⑤ 工件目录 `.specs/v24-doc-refresh/` | `.specs/product-design/PRODUCT-DESIGN.html` · `.specs/platform-evolution/RULINGS.md` · `.specs/product-design/INDEX.md` · `STATE.md` · `.specs/v24-doc-refresh/` |
| 2026-10-25 | **ui-parity P5 + P3-b2**：127 页原型逐族对齐收口（页族缺失 0 / 部分 0，`--strict` exit 0）· 看板证据门（警告式）+ 对话四语义 + 知识库四节 + 管控面三卡组 · 自动化中心 9 节 + Agent 详情十六分区 · 决策模型/微调/环境参谋从规划态切真后端（迁移 019）· 自动化四表（迁移 **025**，非 020——020 已被 multica 占用，重号会静默顶掉） | `.specs/ui-parity/{CHANGE,TASK,GAP,STATUS,P3-*.md}` · `backend/migrations.py` · `frontend/src/{pages,components,stores}/` |
| 2026-10-25 | **multica 内容整体搬入**（`v23-multica-import`）：技能 30（145 文件）· Agent 38 · 小队 2 · 成员 34；新增绑定接口 `GET/POST /api/agents/{id}/tools`；工具库多文件技能包（迁移 020/021）；导入脚本 `scripts/import_multica.py` | `.specs/v23-multica-import/{CHANGE,TASK,TEST,REVIEW}.md` · `scripts/import_multica.py` |
| 2026-10-25 | **创建 Agent 去掉「模型 Provider / API Key」**（`v22-agent-runtime-model`）：模型由运行时发现注册表提供，provider 由运行时推导，凭据不再收 | `.specs/v22-agent-runtime-model/` · `backend/services/{llm_providers,cli_provider,chat_service}.py` |
| 2026-10-24 | **前端壳层对齐原型 W1 + 侧栏 IA 分组**（`v22-ui-align` / `v22-nav-groups`）：新增 `.app-top` 顶栏 + `Chip/Panel/Toolbar`；18 条平铺 → **6 个父级分组**（构建/运行/协作/知识/观测/治理）；R9-1 写回主档 §2.10a | `.specs/v22-{ui-align,nav-groups}/` · `frontend/src/App.tsx` |
| 2026-10-24 | **v21 T-07 用户与审计表化**（裁定⑦收尾）+ 全程序收口：迁移 018 · `app_users`/`audit_log` · 导入脚本（dry-run/`--apply` 幂等）· 审计单一写入器；**删掉 `users.json` 后真实 MySQL + hermes E2E 仍 23/23** | `.specs/v21-completion/{T-07-SUMMARY,CLOSEOUT,TEST}.md` |
| 2026-10-24 | **v21 T-04 测试基建**：本地 CI 四道门 + GH workflow + 覆盖率 + E2E 双通道（dsh/hermes 各 13/13）；顺带修 3 个真缺陷 | `scripts/ci.sh` · `.github/workflows/ci.yml` |
| 2026-10-24 | **波 0–7 全部收口**（v20-wave0..7）· v21 T-01~T-03 · v20-e2e-mysql · v20-rsi-adapters · v20-residual · v20-ui-* · v20-squad-authz · v20-release · S24 原型三缺口 | `.specs/v20-*/` · `.specs/v21-completion/` |
| 2026-10-23 | **v20 口径回填与三维对齐** · 主档 v20 · RULINGS.md 建立 · INDEX.md 建立 · 原型 135→127 页 | `.specs/platform-evolution/RULINGS.md` · `.specs/product-design/INDEX.md` |
| 2026-09-21 | 剥离 code-kit 耦合、目录扁平化 | 全仓 `code-kit\|codekit\|code_kit\|code-kit-monitor` grep = 0 命中 |
| 2026-09-21 | 竞品调研（67 个开源仓库一手实测） | `.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md`（997 行） |
| 2026-09-21 | 重写产品文档与界面原型 | `.specs/product-design/PRODUCT-DESIGN.html` · `prototype/` |

## 进行中

- 🧹 **change `v24-doc-refresh`（本轮 · 用户「代码实现和 product-design 不一致」触发）**：
  - **口径**：**只回填「文档说的代码现状」，不改设计语义、不改代码**。凡设计与代码真有不一致者 → 挂账（`RULINGS.md` §五点五 D1–D10），等人工裁定。
  - **已交付**：主档 v21/v22（4,277 行 · HTML 校验通过 · 标签无失衡）· RULINGS（124 行 · §五点五 挂账节）· INDEX 版本谱系 · STATE 全量重写 · 工件目录。
  - **在途**：两路对账（**API 端点契约** · **前端字段级语义**）返回后并入挂账；`scripts/ci.sh` 与 `test_t07` 两处工程断点待下一批处理（见「下一步」第 3 条）。
  - ⚠ **台账归属**：`STATE.md` / `TOPICS.md` / `ROADMAP.md` 由 leader（交付总调度）独占写，子 agent 一律禁写这三个文件（09-23 曾发生 STATE 被回滚成旧快照）。
- 📋 **并行对账在跑**：API 端点契约（第二次下发，前一次被限流打断）· 前端字段级语义。

### 挂账：代码 ↔ 设计口径差异 10 条（**等人工裁定**，明细见 `RULINGS.md` §五点五）

| # | 一句话 | 影响面 |
|---|---|---|
| D1 | **记忆表三处枚举**：设计要「层级 L0–L3 + 内容域（正交）+ 生命周期 active/revoked/stale-flagged」，代码是「层级 L1–L3 + `kind` 正/负知识 + 晋升状态」——**两个正交维度被压进一列** | RSI 治理整条链 |
| D2 | 记忆表缺 `content` / `confidence` / `quarantine_until`（静置期）/ 来源链真外键 | 静置期、沿链成批撤回不可表达 |
| D3 | `surface_manifest` 设计称「非表」，代码**实建表**且缺四个结构字段 | 可改面「真源」不含结构规则 |
| D4 | `improvement_proposals` → 代码 `orchestration_proposals`；维度 `{INV,DOM}` → `{invariant,domain}`；五列缺 | 命名漂移 + 证据结构不可查询 |
| D5 | **治理账三表全缺**：`probe_evidence` / `exec_ledgers` / `rule_versions` | 两拍评估证据、塌缩熔断预算账、版本 diff 界面**无落点** |
| D6 | `automation_triggers.kind` 缺 `api` 型；`webhook_deliveries` 两键未分开记账 | 幂等语义弱于设计 |
| D7 | 小队归档 → 指向它的自动化转 `disabled` 未实现 | 归档后自动化仍在跑 |
| D8 | **运行时旧宇宙残留**：`SUPPORTED_RUNTIMES` 仍列 langchain/langgraph/autogen/crewai，`POST /api/agents` 默认 runtime 仍是 `"langgraph"` | 与 §6.28 直接冲突 |
| D9 | 波 0 判据「迁移**可回滚**」——`backend/migrations.py` 只有正向列表，无 down | 判据超前（主档已降级说明） |
| D10 | 「冻结金标 + 异厂系 judge」实为调用方传入布尔，平台不校验、无金标表 | 门禁链路成立，金标真实性不成立 |

## 人工裁定

### 已裁（历史）

原话一条消息连裁六项：「**1 允许 · 2 可以自动流转 · 3 独立的+连接表 · 4 接受 · 5 可以 · 6 推送**」

| # | 裁定 | 落点 |
|---|---|---|
| 1 | 「允许」 | 允许自定义阶段模型；实施按 S7 成型解（目录表 + 4 语义锚）——**目录表已做，4 语义锚仍未做** |
| 2 | 「可以自动流转」 | **解读待认**：现有自动流转保持、硬门不拦；done-需证据留建议层。若原意为「接受改变」说一句即纠账 |
| 3 | 「独立的+连接表」 | work_items 独立新表 + work_item_runs 连接表，不并入 projects（P1-4 已实施） |
| 4 | 「接受」 | 「未知身份一律拒绝」定案（缺凭证=401 + debug header 三重 opt-in/PAT 缓冲）——波 1 已实施 |
| 5 | 「可以」 | 状态外置前先补测试的工期延长被接受 |
| 6 | 「推送」 | 确认已推送且公开——git 历史凭据扫描+轮换评估已执行（`.specs/credential-scan/SCAN-REPORT.md`） |

〔2026-10-23 追加裁定〕① 裁定⑧ 开发冻结（10-24 **已解除**）② Squad 升为可指派一等实体 ③ 首批五类收口（域进首批、编排次批）④ Team 与小队不合并。

### 待裁（**10 条 · D1–D10**）

见上表与 `RULINGS.md` §五点五。**每条两个选项**：「改设计对齐代码」或「改代码对齐设计」。**本轮不单方面动任何一边**——单方面把设计改成代码的样子等于裁撤设计，须留裁定记录。

## 下一步建议

1. ~~先修两处工程断点~~ **已修（v24 代码批 C-0）**：ci.sh 解释器探测 · test_t07 格式二分 · 6 表注册（C-0 同项）。
2. **📌 修「6 张表未注册进 `Base.metadata`」**：`agent_tools` / `automations` / `automation_triggers` / `automation_runs` / `automation_deliveries` / `runtime_registry` 三个模块没在 `backend/models/__init__.py` 导入 → `Base.metadata.create_all()` 不建这 6 张（真库靠迁移 024/025 建表所以不炸，但**凡用 create_all 建库的测试碰它们就是 "no such table"**——`test_automations_v2.py` 里那句「必须在 create_all 之前导入」注释就是这个坑的化石）。**修法：加 3 行 import**（幂等、便宜）。
3. ~~裁定 D1–D10~~ **用户「都做」授权，已按 `.specs/v24-doc-refresh/RULINGS.md`（裁定记录）逐条实施 D1–D11**（迁移 026–031）。待办改为：**人工复核结案表 + 过目残项 R25-1…11**（`RULINGS.md` §五点五·一 / §五点五·二）。
4. **📌 补完两路对账**：API 端点契约 + 前端字段级语义，回来后并入 §五点五（当前 §五点五 是 10 条，不含这两路的发现）。
5. **✅ 已完成的不要重复**：波 0–7 · v21 T-01~T-08 · v22 三件 · v23 迁入 · ui-parity P0–P5 —— 均已提交，勿再当待办。

## 环境事实

- 后端：`backend/`，FastAPI + SQLAlchemy 2.0 + SQLite（默认）/ MySQL（可选）
- 前端：`frontend/`，React 18 + TS 5.5 + Vite 5.4 + Zustand
- 后端依赖环境：`/tmp/afvenv2` 已废（临时目录不放持久依赖，教训 L-012 同批）；`scripts/ci.sh` 现按序探测 `$PY → .venv → python3` 并在缺失时给出建 venv 命令。**`test_t07` 已改哈希格式二分**（不再锁 argon2 是否安装）。
- 启动：后端 `uvicorn main:app --port 8000`；前端 `npm run dev`（5173，代理 `/api` → 8000）；`scripts/serve_lan.sh` + systemd user 服务（`af-runtime-daemon.service` 在跑）
- 多副本：`INSTANCE_ID` + 共享 `DATABASE_URL`；单例循环租约 90s（见 README「副本与单例循环」）
- 默认管理员：`admin` / **首启随机生成**（只打一次启动日志）；**出厂口令 `123456` 已废除**（波 1）+ `must_change_password` 强制改密
- `node_modules` **已不再被 git 跟踪**（v20-release 裁决 V3 `git rm --cached`）
- **代码批后质量门（2026-10-25 终值）**：`proto_parity_check --strict` exit 0 · `tsc` 0 错 · `vitest` **250/250** · `build ✓ 19.9s` · 后端 **733 例 OK（0 失败，skipped=6）** · 注册表 **63 张表**（迁移至 031）· 本机装 `argon2-cffi` 后 argon2id 生效（scrypt 兜底路径亦有断言覆盖）
- **真 MySQL（权威档）已重放至 031 · pending=0**（10-25 首跑失败暴露三件 SQLite 掩盖问题，族级修复后幂等重放收敛：027 带 id 搬 12 行、旧表退役、memories 两条表级 FK 落地；验收证据 `.specs/v24-doc-refresh/TEST.md` §五之三，教训 L-014）。`rollback_to` down **未在生产 MySQL 验证过**——生产禁用，先测试库 roundtrip。

## 已知约束

- `.specs/` 是**产品一等数据**（知识产物），**不得删除**
- 读写 `.specs/` 路径一律经 `config.get_specs_dir()`，不要硬编码目录
- 9 阶段模型已收口为单一事实源（波 0：`backend/stage_config.py` + `/api/admin/workflow` + `stores/stageConfig.ts`）；**4 语义锚仍未做**
- **一条口径只活在一个地方**：现行 → `RULINGS.md`；设计 → `PRODUCT-DESIGN.html`；界面 → `prototype/`；**代码实态 → 本文件**。引用前先查代码，不据文档反推代码已具备。
- **设计与代码的口径差异走「挂账」而非「直接改」**（`RULINGS.md` §五点五）；推翻 = 加 `⛔` 标记 + 指针，**不删原文**
- **并行 agent 一律禁写** `STATE.md` / `TOPICS.md` / `ROADMAP.md`（leader 独占）
