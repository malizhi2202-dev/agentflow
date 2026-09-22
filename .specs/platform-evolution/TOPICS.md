# TOPICS: platform-evolution — AgentFlow 改进方向

> 议题申报（D-discovery 前置阶段工件，议题即 change）。第 1 轮 5 个子议题已全部过 ⑤ 人审门（状态见下表）。
> 迁移记录：2026-09-21 由旧 `discovery/` 布局（27 文件）归并为统一命名（TOPICS + 5×D-* + ROADMAP）；原文按改造前 R16.3 旧语义"过审后落盘"，现语义为随步落盘 + 状态标（R16.3 新）。

## 子议题状态表（清窗恢复先读这里 · R16.6）

| slug | 子议题 | 轮次 | 审核状态 |
|---|---|---|---|
| `collaboration-layer` | 协作层缺失：没有「工作项 / 负责人 / 收件箱」 | 1 | 通过 |
| `execution-isolation` | 执行隔离缺失：Agent 在平台进程内执行，无沙箱 | 1 | 通过 |
| `identity-and-security` | 身份与安全模型：身份是客户端自述的 | 1 | 通过 |
| `single-process-state` | 单进程状态与工程化交付 | 1 | 通过 |
| `stage-model-coupling` | 阶段模型硬编码：通用平台定位下残留的流程绑定 | 1 | 通过 |
| `harness-landscape-2026` | 多 team 协作 harness 品类 2026-08/09 新动态与空白再校准 | 用户原话（2026-09-22 重申"参考同类产品，不要 LangChain/LangGraph/Dify"）+ 67 仓库调研保鲜期 | 3 | 通过 |
| `multica-borrow-wave2` | multica 第二波借鉴：数据模型 / 协作机制 / 运行时 harness / UI 层深读（定稿 12 条） | 用户原话点名"参考 ~/project/multica" + 第 1 轮仅采纳 9 个点（D-collaboration-layer 等），UI 与模型层未穷尽 | 3 | 通过 |

> 拆题依据逐条见各 `D-<slug>/` 包头部与 `BRAINSTORM.md`「问题定义」；未过审禁止进 ROADMAP，此处全部已过审。

## 轮次记录

| 轮 | 扫描了什么新事实 | 拆出/消化 | 结束判定 |
|---|---|---|---|
| 1 | .specs/ 全量工件 + 代码直接扫描 + 67 仓库竞品调研 | S1-S5 五子议题，全部走完五步并过审 | 用户批准落盘后本轮收束；第 2 轮触发条件：出现新事实底座（如 stage-model 决策落地后的代码变化） |
| 2 | 2026-09-22 复扫：code-kit 统一改造落盘 / 文档 v2 已产出 / 用户重申竞品口径（排除 LangChain·LangGraph·Dify——经核实调研文档方法 §6 本已如此，仅提及 2/4/1 次） | **未拆出新产品子议题**：产品代码零改动、竞品无新事实（R16.4 停止不硬凑）。直接执行 3 条体系合规项：F1 R16.1「执行走新 CHANGE」与 R16.5 矛盾（kit 已修 + 5 包 REVIEW 加口径注）；F2 ROADMAP 标题残留旧编号「99 ·」（已修）；F3 HTML 缺状态标且顶栏 chip 停 v1（已补「状态: 起草中」+ 改 v2） | 循环停止，不开第 3 轮；重启触发 = 6 项待裁定任一落地，或用户点名文档重做（附录第 30 行等历史句口径以本行 F1 为准，不溯改） |

## 附录 · 第 1 轮拆解全文（原 00-subtopics.md，无损保留）

> **change-id**：`platform-evolution`
> **议题**：参考 `~/project/multica` 与网络同类开源多 Team 协作 harness，找出 AgentFlow 的改进方向
> **事实底座**：`.specs/CONTEXT.md`、`.specs/README-CONSISTENCY-REPORT.md`、`.specs/agent-*/`、`.specs/capability-groups/`、`.specs/knowledge-plus/`、`.specs/multi-provider/`，以及对当前代码库的直接扫描（2026-09-21）
> **竞品底座**：`.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md`（67 个开源仓库一手实测）
> **零代码改动**：本轮全程只读；涉代码结论只出建议清单，执行须走新 CHANGE

---

### 拆解原则

R16.2 要求：**每条子议题必须有事实依据**（文件 / 代码行 / 配置 / 数据 / 用户原话），无依据不列。
下列 5 条全部满足——每条都附可复现的扫描命令或代码位置。**暂缓项不另立 backlog**，统一登记为议题（R18.4）。

---

### 子议题清单（5 条，本轮上限）

#### S1 · 协作层缺失：没有「工作项 / 负责人 / 收件箱」

| 项 | 内容 |
|---|---|
| **议题** | AgentFlow 有 Agent 与编排，但没有让「人与 Agent 共同推进一件事」的那一层 |
| **事实依据** | ① 26 张表（`grep -rho '__tablename__.*' backend/models/*.py \| wc -l` = 26）中**无任何工作项/工单实体**；`scheduled_tasks`/`scheduler_queue` 是内部执行队列，非团队可见工作项<br>② 全仓**无 `assignee` 字段**——`owner_id` 出现在 agent/memory/channel/conversation/domain 上，语义是归属/租户，不是「负责人」<br>③ `models/conversation.py`、`models/message.py` **不引用 `change_id` / `specs`** → 运行时会话与知识产物**无关联字段**<br>④ 全仓模型层**无 `blocker` / `blocked_reason`** 概念<br>⑤ 34 个页面（`ls frontend/src/pages/*.tsx \| wc -l`）**无团队/成员视图**；`UserManagement.tsx` 是管理员 CRUD，不是团队名册 |
| **参照** | Multica：issue 有负责人（人**或** Agent）、四类状态生命周期、动态时间线、Inbox（只在需拍板时通知）、Squad（人机混编 + leader 派活） |
| **slug** | `collaboration-layer` |

#### S2 · 执行隔离缺失：Agent 在平台进程内执行，无沙箱

| 项 | 内容 |
|---|---|
| **议题** | 无沙箱意味着无法安全地多租户、无法跑不可信代码 |
| **事实依据** | ① 全后端**仅 `routes/git_safety.py` 使用 `subprocess`**（2 处，`:11` 与 `:18`）<br>② 全后端**无 `docker` / `container` / `nsjail` / `firejail` / `sandbox` 引用**<br>③ 运行时适配器只有 4 个（`ls backend/runtime/adapters/` = claude_code / codex / hermes / xiaolongxia），且为**进程内调用**<br>④ 无守护进程模型、无 CLI 目录（`ls -d cli bin scripts` 均不存在） |
| **参照** | Multica：26 种 Agent CLI 由**跑在用户机器上的守护进程**拉起，代码不出门；kagent/Google AX/agent-sandbox：gVisor / microVM；agent-sandbox：「**只编排不放隔离**」，委托 RuntimeClass |
| **slug** | `execution-isolation` |

#### S3 · 身份与安全模型：身份是客户端自述的

| 项 | 内容 |
|---|---|
| **议题** | 认证中间件的身份来自请求头且默认 admin；唯一缓解在反向代理后失效 |
| **事实依据** | ① `backend/main.py` 认证中间件：从 `X-User-Id` 请求头取身份，**未传则 `user = get_user("admin")`**<br>② `backend/auth.py:181-186` `get_current_user` 在 `request.state.user` 缺失时**回退 admin**<br>③ 唯一缓解是「来源 IP ∈ {127.0.0.1, localhost, ::1}」，且全仓**无 `X-Forwarded-For` / 可信代理处理**（grep 无命中）→ 同机反代后闸门对外部请求全部放行<br>④ `backend/auth.py:19-21` `hash_password` = **无盐 `hashlib.sha256`**<br>⑤ `backend/auth.py:108` 硬编码默认口令 `123456`；`:126-130` 存在「缺失 password_hash 即重置为 123456」的自愈分支<br>⑥ 前端 109 处引用 `X-User-Id` |
| **参照** | Multica：`X-Actor-Source` 由中间件 `Del` 后再由可信分支重写；token 与 URL 的 workspace 双点校验；成员查询失败返 **404 而非 403**（不泄露私有资源存在性）；「成员移除的**主防线是状态收敛**，令牌吊销只是纵深防御」 |
| **slug** | `identity-and-security` |

#### S4 · 单进程状态与工程化交付

| 项 | 内容 |
|---|---|
| **议题** | 三处关键状态在进程内存中，使「路由/扩容/自愈」在多副本下各自为政；且没有可用的生产构建与质量门 |
| **事实依据** | ① `services/scheduler_service.py:12,14` `self._queue = PriorityQueue()` / `self._task_labels: dict` = **实例内存**<br>② `routes/control_plane_api.py:38` `_rate_limit_store: dict[...] = {}` = **模块级**<br>③ `engine/reconcile_loop.py:288` `_backoff_state: dict[int, dict] = {}` = **模块级**<br>④ `npm run build`（`tsc && vite build`）因 **32 个 TS 错误**必然失败（`npx tsc --noEmit \| grep -c "error TS"` = 32）→ **无可用生产构建**<br>⑤ `git ls-files \| wc -l` = 35,847，其中 **`node_modules` 占 35,517**；真实代码仅 273 个 → `frontend/node_modules/.vite/deps/_metadata.json` 会因跑 dev server 而污染 `git status`<br>⑥ 仓库根**无** `.github/workflows`、`Dockerfile`、`Makefile`、`LICENSE`、`pyproject.toml`<br>⑦ 迁移是 `database.py` 内 **3 条内联 `ALTER TABLE`**，无版本账本/回滚/并发索引 |
| **参照** | KEDA 官方承认「缩容时无法控制终止哪个副本」；Agno `lock_grace_seconds` + 心跳；DBOS「无独立编排服务」；Multica `schema_migrations` + `NOT VALID` 约束 + fix-forward |
| **slug** | `single-process-state` |

#### S5 · 阶段模型硬编码：通用平台定位下残留的流程绑定

| 项 | 内容 |
|---|---|
| **议题** | 「不绑定任何开发流程」是 §1.4 写明的产品边界，但 9 阶段与产物文件名硬编码在 13 个文件里 |
| **事实依据** | ① `grep -rl "0-change" --include=*.py --include=*.ts --include=*.tsx backend frontend/src` = **13 个文件**<br>　后端 6：`scanner.py`、`runtime/scanner.py`、`runtime/adapter.py`、`routes/admin_api.py`、`routes/search.py`、`routes/change_detail.py`<br>　前端 7：`components/ArtifactTab.tsx`、`SearchBar.tsx`、`WorkflowTab.tsx`、`pages/Home.tsx`、`Runtime.tsx`、`SpecsEditor.tsx`（+ 1 处由扫描口径计入）<br>② `backend/scanner.py:12-21` 硬编码 `STAGES`（9 个）、`STAGE_FILES`、`ARTIFACTS`、`STAGE_NAMES`（中文名）<br>③ `backend/config.py` **无任何阶段/产物配置项**<br>④ `backend/scanner.py`(300 行) 与 `backend/runtime/scanner.py`(274 行) **各自维护一套阶段表**，是近似副本<br>⑤ 已有落点未被用起来：`GET/PUT /api/admin/workflow` + `workflow.json`（`routes/admin_api.py:31-53` 的 `DEFAULT_WORKFLOW` 已含 stages/gates） |
| **参照** | R15 五层对齐（代码/原型/活文档/决策/执行五层各自漂移）；Multica 用 `issue_status` 表 + Go 常量做扩展点权威，前端 `rules.ts` **显式声明自己是后端 gate 的镜像** |
| **slug** | `stage-model-coupling` |

---

### 为什么只有 5 条（R16.4）

- 已合并同类项：「安全」与「身份」合为 S3（同一中间件）；「构建坏了」与「仓库卫生」「迁移」合为 S4（同属工程可交付性）；「scanner 双份」并入 S5（同一根因）。
- **不硬凑**：其余发现（无语义路由、无多集群联邦、无计费结算）**在 §1.4 已明确列为「不做」**，属产品边界而非缺陷，不进本轮子议题。
- 本轮达到 5 条上限，**不开第 2 轮**。

---

### 不属于本轮的登记项（R18.4，暂缓即议题）

| 项 | 为何暂缓 |
|---|---|
| 语义（NLP）路由 | §1.4 明确列为远景、未实现 |
| 多集群联邦 | §1.4 明确列为保留项 |
| 多租户计费与配额结算 | §1.4 明确列为不做；但配额原语（Kueue/Volcano）已进 W-4 |
| 32 个 TS 错误的逐个修法 | 归属 S4 的 P0-4，具体修法属实现细节，走新 CHANGE |