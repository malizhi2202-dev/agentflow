# TOPICS: platform-evolution — AgentFlow 改进方向

> 议题申报（D-discovery 前置阶段工件，议题即 change）。第 1 轮 5 个子议题已全部过 ⑤ 人审门（状态见下表）。
> 迁移记录：2026-09-21 由旧 `discovery/` 布局（27 文件）归并为统一命名（TOPICS + 5×D-* + ROADMAP）；原文按改造前 R16.3 旧语义"过审后落盘"，现语义为随步落盘 + 状态标（R16.3 新）。

## 子议题状态表（清窗恢复先读这里 · R16.6）

| slug | 子议题 | 轮次 | 审核状态 |
|---|---|---|---|
| `collaboration-layer` | 协作层缺失：没有「任务 / 负责人 / 收件箱」 | 1 | 通过 |
| `execution-isolation` | 执行隔离缺失：Agent 在平台进程内执行，无沙箱 | 1 | 通过 |
| `identity-and-security` | 身份与安全模型：身份是客户端自述的 | 1 | 通过 |
| `single-process-state` | 单进程状态与工程化交付 | 1 | 通过 |
| `stage-model-coupling` | 阶段模型硬编码：通用平台定位下残留的流程绑定 | 1 | 通过 |
| `harness-landscape-2026` |多 team 协作 harness 品类 2026-08/09 新动态与空白再校准<br>**依据**：用户原话（2026-09-22 重申"参考同类产品，不要 LangChain/LangGraph/Dify"）+ 67 仓库调研保鲜期| 3 | 通过 |
| `multica-borrow-wave2` |multica 第二波借鉴：数据模型 / 协作机制 / 运行时 harness / UI 层深读（定稿 12 条）<br>**依据**：用户原话点名"参考 ~/project/multica" + 第 1 轮仅采纳 9 个点（D-collaboration-layer 等），UI 与模型层未穷尽| 3 | 通过 |
| `execution-isolation-2` | 沙箱补深：可行隔离阶梯与界面（差距①） | 4 | 通过（第 4 轮） |
| `declarative-api` | 声明式契约与 watch 语义的非 K8s 实现（差距②） | 4 | 通过（第 4 轮） |
| `otel-observability` | OTel/Prometheus 可观测标准化路径（差距③） | 4 | 通过（第 4 轮） |
| `a2a-protocol-surface` | A2A v1.0.1 协议面最小实现与 AgentCard（差距④） | 4 | 通过（第 4 轮） |
| `collaboration-layer-2` | 协作层落地形态：schema 与底账（差距⑤） | 4 | 通过（第 4 轮） |
| `identity-and-security-2` | 身份三连修复方案对照（X-User-Id/反代/弱口令） | 4 | 通过（第 4 轮） |
> 拆题依据逐条见各 `D-<slug>/` 包头部与 `BRAINSTORM.md`「问题定义」；未过审禁止进 ROADMAP，此处全部已过审。

## 轮次记录

| 轮 | 扫描了什么新事实 | 拆出/消化 | 结束判定 |
|---|---|---|---|
| 1 | .specs/ 全量工件 + 代码直接扫描 + 67 仓库竞品调研 | S1-S5 五子议题，全部走完五步并过审 | 用户批准落盘后本轮收束；第 2 轮触发条件：出现新事实底座（如 stage-model 决策落地后的代码变化） |
| 2 | 2026-09-22 复扫：code-kit 统一改造落盘 / 文档 v2 已产出 / 用户重申竞品口径（排除 LangChain·LangGraph·Dify——经核实调研文档方法 §6 本已如此，仅提及 2/4/1 次） | **未拆出新产品子议题**：产品代码零改动、竞品无新事实（R16.4 停止不硬凑）。直接执行 3 条体系合规项：F1 R16.1「执行走新 CHANGE」与 R16.5 矛盾（kit 已修 + 5 包 REVIEW 加口径注）；F2 ROADMAP 标题残留旧编号「99 ·」（已修）；F3 HTML 缺状态标且顶栏 chip 停 v1（已补「状态: 起草中」+ 改 v2） | 循环停止，不开第 3 轮；重启触发 = 6 项待裁定任一落地，或用户点名文档重做（附录第 30 行等历史句口径以本行 F1 为准，不溯改） |
| 4 | 用户点名 8 条（五差距原话①-⑤+身份三连「再补充这些」，2026-09-22/23）；六路 agent（web×5+本地审计×1，双路互证） | S8-S13 六包：轮1 三包的 HOW 增量（-2 后缀）+三个新面包；轮1 包不动 | ①-⑤ 全链闭合：GD 均 3/3；用户原话「通过」（09-23）→ROADMAP 第 4 轮节回写+v8 晋级；三条 ⚠ 口径修正入账；循环停止（R16.4，无第 5 轮触发） |
| 3 | 2026-09-22 用户原话「都通过」：S6 协作四件套 + S7 阶段模型成型解 | S6（7 条）/ S7（12 条）过审 → ROADMAP 第 3 轮节 + 主档 v3 执行 | 闭合；自动流转解读留待裁定②（09-23 已裁） |
| 5 | 2026-09-23 用户点名开轮：「agent 要能被创建」「agent 要有 team 的概念」 | S14 创建链路 / S15 资源关联模型 / S16 Team 组织实体 三包五步走完 | **10-23 全关账**：用户「d14和d15同意」→ S14/S15 过审 + 《Agent 资源关联字典》成文；S16 追认过审且首批五类按专家团 3/3 收口（域进首批、编排次批） |
| 6 | 2026-10-23 用户点名开轮：RSI 递归自我改进（含「不断改进代码这个不要了」前置裁定） | S17 记忆与产物 RSI / S18 编排提案制 / S19 决策微模型 / S20 总治理 四包 | 四议题全过审（用户「我同意」+ S17「这俩可以合并吧」→ 合并案：记忆四层唯一管道 + 知识库=资产域 + 出域改号 D0-D3）；ROADMAP 第 6 轮节 |
| 7 | 2026-10-23 用户点名：Google Harness²（arXiv 2610.14224）+ 本机 39 个 py 全读 | S21 单包：R7-1..6 糅合进 S17-S20 既有件 +「不该抄 12 条」 | 过审（用户「同意」）；R7 实施波完成 → 主档 v17；零新页零代码 |
| 8 | 2026-10-23 用户指示二源代码层补扫：multica server/packages（1888+1673 文件）+ harness2 internals | S22 multica 代码增量 / S23 harness2 internals 二遍 → R8-1…14 | 过审（「同意」·GD 8/6/0）；实施波收官 → 主档 **v19 · 4190 行** + 原型九页 + 观察登记≈20 条挂账 |

## 附录 · 第 1 轮拆解全文（原 00-subtopics.md，无损保留）

> 〔口径注 2026-10-23 · v20 归并〕以下为 **2026-09-21 第 1 轮拆解原文**，其中的文件计数（如 35,847 / 13 个文件）与部分判断已过时：**现行口径见 `RULINGS.md`，实数复测见 `PRODUCT-DESIGN.html` §1.6（10-23 复测：36,134 跟踪文件 / 阶段表硬编码 12 文件）**。原文不改写。

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

#### S1 · 协作层缺失：没有「任务 / 负责人 / 收件箱」

| 项 | 内容 |
|---|---|
| **议题** | AgentFlow 有 Agent 与编排，但没有让「人与 Agent 共同推进一件事」的那一层 |
| **事实依据** | ① 26 张表（`grep -rho '__tablename__.*' backend/models/*.py \| wc -l` = 26）中**无任何任务类实体（work_items 表型）**；`scheduled_tasks`/`scheduler_queue` 是内部执行队列，非团队可见任务<br>② 全仓**无 `assignee` 字段**——`owner_id` 出现在 agent/memory/channel/conversation/domain 上，语义是归属/租户，不是「负责人」<br>③ `models/conversation.py`、`models/message.py` **不引用 `change_id` / `specs`** → 运行时会话与知识产物**无关联字段**<br>④ 全仓模型层**无 `blocker` / `blocked_reason`** 概念<br>⑤ 34 个页面（`ls frontend/src/pages/*.tsx \| wc -l`）**无团队/成员视图**；`UserManagement.tsx` 是管理员 CRUD，不是团队名册 |
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

## 第 5 轮申报（2026-09-23 · 用户点名开轮，非擅自扩轮）

> 用户原话：「1 我的agent要能被创建的啊 2 agent要有team的概念的 参考一个类别的其他产品 agent里边应关联那些资源 team 可以管理由哪些资源 或者哪些实体」

| slug | 一句话 | 依据 | 轮次 | 状态 |
|---|---|---|---|---|
| S14-agent-creation | Agent 创建链路：入口×形态×生命周期×权限——补上原型缺失的创建向导 | 用户原话① + backend/routes/agents_api.py:42 已有 POST 创建口但原型无任何创建页（roles「实例化为 Agent」只是 toast） | 5 | **通过·追认（10-23，原话「现在有team/小队的概念了」）** |
| S15-agent-resource-model | Agent 资源关联模型：一个 Agent 应挂哪些资源（模型/工具/知识/记忆/工作流/配额/闸门/渠道…） | 用户原话「agent里边应关联那些资源」+ backend/models/agent.py 24 字段实态 + agent_knowledge/agent_memory/agent_probe/scheduled/human_approval/channel_config 六张关联表已在代码 | 5 | **通过（10-23）** |
| S16-team-entity | Team 组织实体：team 管哪些资源哪些实体；语义辨析（组织团队 vs 多 Agent 协作组）与 Domain 3 字段壳的关系 | 用户原话②「team 可以管理由哪些资源 或者哪些实体」+ backend/models/domain.py 仅 name/owner_id/created_at + 全仓 grep 无 team + CLAUDE.md「Domain 不是安全边界」 | 5 | **通过·追认（10-23 收口）** |

## 第 6 轮申报（2026-10-23 · 用户点名开轮：RSI 递归自我改进）

> 用户原话：「一个是harnes框架自己的rsi **就是不断改进代码这个不要了 线上就要维持代码稳定**」「还有记忆和产物的rsi 比如总结的skill和沉淀的执行/调用失败反思 比如记忆分l0-l3的沉淀的不断改进」「还有就是模型自身的rsi 比如我把对话和能力为微调进入决策模型」「结合现有的大量论文和rsi架构设计给出方案」
> **前置裁定（本轮第 0 步内即生效）**：代码层自改（平台自 patch / 自动重构 / 运行时改写 harness）**禁止**，线上稳定性优先，与裁定⑧同向；RSI 只作用于「产物」：技能库 / 知识空间记忆 / 编排配置模板 / 决策微模型权重。web_search 401 不可用，各子议题 ② 竞品节按 R11.1 降级为「未联网验证」。

| slug | 一句话 | 依据 | 轮次 | 状态 |
|---|---|---|---|---|
| S17-artifact-memory-rsi | 记忆与产物自进化：失败反思→候选技能/知识条→晋升门禁（L0-L3 接现有设计），运行时数据如何变成资产 | 用户原话「skill和沉淀的执行/调用失败反思」「记忆分l0-l3的沉淀」（〔2026-10-23 用户澄清〕此 L0-L3=腾讯记忆口径 L0对话原文/L1原子/L2场景/L3核心，非知识库总结写入分层）+ PRODUCT-DESIGN §6.9 既有两套 L0-L3 与 §6.25 数据出域第三套——三名冲突为本议题核心风险 + prototype/agent-detail.html 技能子栏（托管三层 workspace/agent/runtime） + backend/runtime/scanner.py 已在解析 JSONL 失败事件 | 6 | **通过（10-23「我同意」）** |
| S18-orchestration-rsi | 编排与模板的自优化（配置层非代码层）：画布/路由/备援权重/阈值由执行数据驱动生成改进提案，人批后发布新版本 | 用户 RSI 需求范围裁定后余项 + 画布「Apply 必附原因·版本 v3→v4」既有纪律 + control-plane 备援权重可调 + wf-8 mock 真实迭代链 | 6 | **通过（10-23「我同意」）** |
| S19-model-rsi | 决策微模型自进化：对话与能力数据→微调→自测门→两步制上线（衔接已过审的 small-model-decisions，不重炒只接线） | 用户原话「把对话和能力为微调进入决策模型」+ .specs/small-model-decisions/（REQUIREMENT 4/4·P-product v7 过审·铁律两步制）+ prototype/decision-models.html | 6 | **通过（10-23「我同意」）** |
| S20-rsi-governance | RSI 总治理：四类产物各自的门禁/回滚/防投毒/防失控循环；代码禁改边界成文；评估集防过拟合（Goodhart） | 用户原话「不要了 线上就要维持代码稳定」+ 项目纪律「必须人批在状态转换层」「两入口独立校验」「越权 404」+ squad「无轮次上限靠队列合并」既有事实 | 6 | **通过（10-23「我同意」）** |

> **第 6 轮 ⑤ 完成（2026-10-23）**：四子议题全部过审（用户「我同意」；S17 附「这俩可以合并吧」→ 合并方案定稿：记忆四层唯一管道+知识库=资产域+出域改号 D0-D3）。约束四条随结论进 ROADMAP。

---

## 第 7 轮申报 · 2026-10-23 · harness2 糅合（单议题，用户点名开启）

| 子议题 | 一句话 | 依据 | 状态 |
|---|---|---|---|
| S21-harness2-fusion | Google Harness²（arXiv 2610.14224，/home/malizhi/project/harness2 全仓设计+代码精读）的**递归脚手架改进**糅进既有 S17-S20 框架：PPC 探针对比证据→提案制第三证据源；invariant⟂domain 二分→细化「声明式空间禁触代码」；improvement harness+evidence lessons→并入记忆四层与晋升门；递归深度/预算→RSI 开关卡组 | 用户原话+论文摘要一手（web_fetch 核验）+深读包 26dbf892（39 py 全量） | **通过（7 轮）** |

> **前置裁定（用户 2026-10-23 原话，三条硬约束）**：①「糅合进我的 agentflow 的设计 如果有雏形或者相似的地方就在此基础上继续改」=深化既有件、**如无必要不要增加新的**（目标零新页）；②「修改相关对应的 md 文档和产品原型设计的 html 和 mock 界面」=允许动 `.specs` md + 原型 + PRODUCT-DESIGN；③「**不要改代码**」=裁定⑧继续生效，backend/frontend 零触碰。叠加既有边界：代码层禁自改进（第 6 轮前置裁定）与改进 harness 的边界必须在 CONCLUSION 显式对表——harness2 改的是 scaffold（prompt/工具/记忆/技能/编排=四类产物白名单内），不是平台代码；若其代码含「editor 可全量改 substrate」的危险默认，进《不该抄清单》。

> **第 7 轮 ⑤ 完成（2026-10-23）**：S21 过审（用户「同意」）。R7-1..6 入 ROADMAP；不该抄 12 条随结论成文；实施波另 commit。

---

## 第 8 轮申报 · 二源「代码层」补扫（用户指示 2026-10-23）

> 用户原话：「再次全面扫描mutical的各种设计文档和代码 / 扫描herness2的各种设计文档和代码 / 查看还有哪些可以合并融合到agentflow」。multica 此前只扫 46 篇文档（RECON-MULTICA-DOCS 在档），**代码 0 扫**；harness2 已全读但 ⑦映射表外仍有 internals 未映射（substrate/benchmarks/cli/tests）。硬约束沿用：糅合进既有件、无必要不加新页、零代码（裁定⑧）。

| 子议题 | 题 | 事实依据 | 状态 |
|---|---|---|---|
| S22-multica-code | multica 服务器+客户端代码里「文档没写或写得不同」的机制，哪些可并入 agentflow 设计层 | server/ 1888 Go 文件 · packages/ 1673 · apps/ · CLI_AND_DAEMON.md · skills-lock.json · e2e/ | **通过（10-23「同意」·GD 8/6/0）** |
| S23-harness2-internals | harness2 二遍：substrate/benchmarks/cli/tests 未映射件还能喂我们什么 | 前轮 RECON 已覆盖 ①-⑥ 面，本包只挖增量 | **通过（10-23）** |

> 边界：S22/S23 均先出「增量清单+已覆盖不复述」，再由 ①③④ 收敛；⑤ 前禁进 ROADMAP。




---

## 附录 · 代码实施期落下的议题（2026-10-24）

> 来源：S-align 首次对齐（`.specs/ALIGNMENT.md` 漂移 D3-1）· 用户裁决 **V2=②转议题**。
> 纪律：原型是设计基线，改它要走 ⑤ 人审；不与代码波混做。

| 子议题 | 题 | 事实依据 | 状态 |
|---|---|---|---|
| S24-prototype-mount-gaps | 原型三处挂载缺口：① `audit.html` 无 team 筛选器与锚点 ② `control-plane.html` 未显示 `domains.team_id` 归属 ③ `chat.html` 缺「同刻双投递幂等 + coalesced」可见呈现 | ① 审计筛选条新增「全部团队 ▾」弹层（按 `audit.team_id` 聚合，含 NULL 未归属项；锚点 `#team-agentflow` 已在）② 域树三行显示 `team_id=1 / team_id=NULL` + 归属说明句 ③ chat 顶部「投递纪律」句 + 一条消息带「同刻合并 2 条」徽章（`coalesced_comment_ids`） | **通过（2026-10-24 用户「同意你开始吧」）· 已实施** |

> 关联：波 4 已把 `domains.team_id` 落到数据层（迁移 010），故 ② 现在只是「界面没显示」，不是「数据没有」。
