# ③ 结论与建议 · S16 Team 组织实体
> 状态：待审⑤（第 5 轮 · 2026-09-23）· 依据 ①BRAINSTORM + ②RECON（E1-E8 一手原文）+ 本地代码事实（file:line）
> **〔2026-10-23 用户裁定〕执行层落法修订：采纳 multica squad 方案——协作小队升格为可指派一等实体（leader 协议委派），不再采用『仅编排实例预设字段』形态；组织层 Team 裁定(R2/R3)与本包其余结论不受影响。产品口径以 PRODUCT-DESIGN v14 §6.29 为准，本包维持待审⑤流转。**
> 本包零代码改动；以下 schema/字段仅为 DESIGN 输入，禁止写成「已具备」措辞（承第 4 轮同口径约束）。

---

## 0. 语义辨析裁定（前置，必须先看这条）

「Team」在用户原话与竞品里是**两个正交的东西**，本议题裁定为**一个词只指一个**：

| | (a) 组织团队 Team | (b) 执行协作组 |
|---|---|---|
| 回答的问题 | **谁拥有这些资源、谁能对它们动手** | **这一次运行由哪些 Agent、按什么策略协作** |
| 主语 | 人（principal） | 一次部署/运行 |
| 生命周期 | 持久，跨项目 | 与编排实例同生死，可重复跑 |
| 我们代码里的落点 | **不存在**（`grep team` 后端 0 命中；`domain.py:8-14` 只是 4 字段壳） | **已存在** = `OrchestrationInstance`（`orchestration.py:13-28`：`owner_id` + `agent_ids` 成员清单 + `yaml_raw`/`edges_json` 拓扑 + token 软/硬限 + `on_failure`）〔已被 2026-10-23 裁定修订，见页首〕 |
| 竞品证据 | Dify workspace（E1）/ Langfuse org→project（E2）/ n8n projects（E3）/ K8s namespace（E4） | AutoGen team 预设（E5）/ CrewAI Crew+Process（E6）/ MAF 不用 team 一词（E7） |
| 关键判读 | 四家全都**建了成员表**，无一家用视图代替（反 K11） | 没有一家把执行期协作组当**资产实体**：它是预设/策略，有状态、可 reset（E5） |

**裁定 R1（一词一义）** ⛔**〔已被 2026-10-23 用户裁定推翻：执行层不再落为 `pattern` 预设字段，Squad 升为可指派一等实体；「一词一义」本身仍成立——Team 与 Squad 仍是两个词两个实体，见页首修订行〕**：组织层叫 **Team（团队）**；执行层的「谁和谁协作」落为**编排实例上的协作预设字段**，词表钉死为 `pattern ∈ {single, sequential, concurrent, supervisor, group-chat, swarm}`（E5/E6/E7 三家的并集，且 MAF 明确不用 team 命名）。
→ 编排实例、画布、YAML、模板**不改名、不新建实体、不复用 Team 词**；文档与 UI 里凡「多 Agent 团队」一律改写为「协作预设 / Crew 拓扑」并在术语表加注。**这条是零成本裁定，可直接进文档层（解冻无关）。**

以下 R2/R3 只谈 (a)。

---

## 1. Team 管哪些资源、哪些实体（正面回答用户原话②）

**准入判据（自定，可被 ④⑤ 攻击）**：Team 只拥有**「运行装配态资源」**——即"建出来就能被用、换个团队用就是越权"的东西；**观测与派生数据按 Team 汇聚但不归属**；**内部队列与瞬态执行态绝不挂 Team**。

| 归类 | 实体 | 依据（file:line） | 团队化理由 / 不团队化理由 |
|---|---|---|---|
| ✅ 核心必进（R2 首批 5 类）⛔**〔清单已于 2026-10-23 专家团 3/3 收口：域进首批、编排实例与模板列次批；本行为历史清单，现行口径见页末尾注〕** | `agents` / `orchestration_instances` + `orchestration_templates` / `workflows`(+snapshots) / `tools` / `knowledge_sources`(+tags) | `agent.py:14`、`orchestration.py:14,54`、`workflow.py:12`、`tool.py:12`、`knowledge_source.py:16` | 全是 `owner_id` 单值 + `visibility='private'` 默认（`agent.py:33` 等 5 处）——用户「用哪些资源」的字面对象 |
| ✅ 次批 | `domains` / `projects` / `custom_roles` / `scheduled_tasks` / `channel_configs` | `domain.py:13`、`project.py:12`、`role_custom.py:12`、`scheduled_task.py:18`、`channel_config.py:17` | Domain 需先重述语义（§2）；`custom_roles` 是 Agent 人设不是权限（§2 术语冲突）；渠道=对外出口，归属不清=冒名发言风险 |
| ✅ 团队级配置（新建） | 模型凭据池（Provider Key）〔2026-10-15 裁撤：由运行时发现（外部 CLI）取代〕、`team_quota` + 用量账本、审批人解析规则 | 现状 Key 逐 Agent 存密文（`agent.py:21`）、token 限在 Agent 与实例两级（`agent.py:25-26`、`orchestration.py:24-25`）、审批人=单值 `owner_id`（`human_approval.py:14`） | Dify「App 继承 workspace 模型配置」+ n8n「凭据建在项目里」+ K8s「聚合配额 + 对象计数」（E1/E3/E4） |
| ⛔ 归属不动、按 Team 汇聚 | `conversations` / `messages` / `agent_memories` / `agent_probes(_latest)` / `trace_spans` / `metrics_raw` | `conversation.py:14`、`metrics.py:15,41`、`orchestration.py:88-100` | 派生/观测数据：随父资源作用域自动可见，**加 team_id 只会造成双写不一致**；成本汇总走查询侧 |
| ⛔ 绝不挂 Team | `scheduling_queue` / `scheduler_queue` / `topology_snapshots` | `orchestration.py:65-80`、`scheduler_queue.py`；双 queue 语义重叠已由第 4 轮判定需先并表（`D-collaboration-layer-2/RECON.md` §①） | 内部执行态，团队层看不见也不该管；「第三张 queue 不许进来」同批纪律 |
| ⛔ 明确不做 | 部门树 / 汇报线 / 嵌套 Team / 计费结算 | `CLAUDE.md` §1.4「多租户计费与配额结算=不做」；K8s「namespace 不可嵌套，每资源只在一个 namespace」（E4） | 嵌套一旦引入，4 字段壳问题升级为图问题；GitHub 嵌套 team 正文未联网验证（⚠），不据以设计 |

---

## 2. Team 与 Domain / Project / User 的正交与重合关系（裁定 R2 的语义地基）

- **Team ⟂ Domain**：Team 回答「**谁的**」（人册+角色+配额+审计边界）；Domain 回答「**在哪跑、怎么路由/扩容/自愈**」（K8s namespace 类比，`CLAUDE.md` 核心能力条）。关系 = 一个 Team 拥有 0..N 个 Domain（`domains.team_id` 新列），**不是合并、不是改名**（否 K4）。
  - 必须同时澄清：`Domain` 至今不是安全边界（4 字段壳，`domain.py:8-14` + `CLAUDE.md` 既有事实），而 `.specs/CONTEXT.md:374` 已把「域内隔离 + 域 owner 显式开关」当数据边界引用。**Team 落地时这句口径要重述为「团队内隔离」**，否则文档里出现两个"边界"。
- **Project 回归「一次工作」**：今天 `Project` 同时兼职数据装配（`project.py:17-19` 三 FK）与可见性范围（`user.project_ids`：`auth.py:243-245`、`config.py:40,64`、`admin_api.py:198`）——这是**重合而非正交的历史债**。裁定：可见性职责移交 Team，`user.project_ids` 标记为「过渡字段，Team 建成后退役」（否 K6：不让 Project 兼租户）。
  - ⚠ 同 Dify 一样，`Project.visibility='private'` 保留，但语义收窄为「项目内共享范围」，不再充当跨用户闸门。
- **User 是全局 principal，Team 成员表才承载团队角色**：现状 `users.json` 一条记录同时装 `role`（平台级 admin/user，`agents_api.py:19` 直读）与 `custom_permissions`（`auth.py:111`）。裁定：**三词分家**——`user.role`＝平台级；`team_members.role`＝团队内角色（Owner/Admin/Editor/Viewer 四档，取 Dify 四分 E1 并集 Langfuse 的「继承+项目级覆盖」E2）；`CustomRole`（`role_custom.py:8-27` temperament/responsibilities/gates）**是 Agent 人设，与权限无关，必须改名或加注**（否则"role"三义混用是文档与界面的必然漂移源）。
- **RBAC 判定单点**：新增一个 `可见性判定` 函数（service 层）+ 查询中间件各校验一次——`CLAUDE.md` 约定「同一不变量应在两处独立校验（入口 + 中间件）」；越权与不存在统一 404（同约定），配额拒绝用 403 并**说明违反哪一条**（K8s E4 语义）。

---

## 3. 单值 `owner_id` → 多成员的迁移（裁定⑦ MySQL 档）

**原则：不重命名、不清空 `owner_id`。** 它在 16 张表 + 10 个路由文件的 `_filter_owner` 里语义单一=「创建人/归属」（第 4 轮已审结论：`D-collaboration-layer-2/RECON.md` §①），改名等于 gratuitous 全仓 blast；多成员用**加法**表达。

1. **两表先行**（MySQL，**day-1 真外键**，不再重演 `human_approvals.task_id` 无约束 String 的债）：
 `teams(id, name, slug, owner_user_id →users.id, status, token_soft/hard, created_at)`；`team_members(team_id→teams.id, user_id→users.id, role, created_at, created_by, UNIQUE(team_id,user_id))`。
 `teams.owner_user_id` 满足 Dify「每容器一个 Owner」+ 转让需验证（E1）。成员表依赖**裁定⑦ 的用户表化**（`users.json` → MySQL）才能建 FK → **与身份三连同批解冻，不得先建表后补外键**。
2. **资产表加两列**：`team_id INT NULL →teams.id`、`owner_kind ENUM('personal','team','platform') DEFAULT 'personal'`，只动首批 5 类表。存量行默认 `personal` + 现值 `owner_id` 不变 → **零回填、可回滚、无停机**（expand/contract）。
3. **判定改写**：`owner_kind='team'` 时按 `team_id ∈ 我的团队(含角色)` 放行；`personal` 时仍 `owner_id==me`；`platform`（如已 `published` 的模板市场，`orchestration.py:59`）全员可读。现有 `_filter_owner` 收敛到该判定，10 个路由文件逐个替换属 DESIGN 工作量，须与配额、审批同批审。
4. **迁移与离场规则（照抄 Dify 三条 E1）**：成员移除→**鉴权立即失效但资产留在团队**（不级联删）；Owner 转让→验证码/双人确认，原 Owner 降为普通成员；`created_by`(=`owner_id` 原值)永久保留，用于审计与「谁建的」显示。
5. **凭据与配额（R3）**：Team 层持模型 Provider Key 池（Agent 继承、可覆盖，E1）〔2026-10-15 裁撤：由运行时发现（外部 CLI）取代，凭据留运行时 CLI 机器〕；`team_quota` 采 K8s 双形态——**聚合用量**（token/成本）+ **对象计数**（Agent 数、成员数、编排实例数，E4）；用量**落 MySQL 账本，不用进程内存**（`CLAUDE.md` S4：限流/队列/退避三处内存态是多副本翻车根因）；配额对象本身需**非团队成员不可删改**（E4「保护 enforcement 本身」）。
6. **硬前置门**：身份仍客户端自述（`main.py:196-199` 仅 localhost 闸门 + `auth.py:181-186` 缺身份回退 admin）时，Team 只是账面权限——任何客户端自称 `X-User-Id: 任意人` 即可读该人全部团队资产。**E8 的同类自证**：Coze Studio 已有完整资源分类与 PAT，官方仍直陈"部分 API 存在水平越权"。→ **排程：S3/身份三连（P0-1，已过审未解冻）必须先于 R2 的第 3 步（判定改写）落地**；两表与只读页可在其前做，但不得宣称隔离生效。

---

## 4. 推荐方向（3 条）+ 一句话落地路径

| # | 方向 | 一句话落地路径 | 成本/风险 |
|---|---|---|---|
| **R1** | **一词一义裁定**：Team 只指组织团队；执行协作组落为编排实例的 `pattern` 协作预设枚举〔已被 2026-10-23 裁定修订，见页首〕 | 在 `.specs/CONTEXT.md` 术语表 + 产品文档 §1.6 与编排 YAML schema 文档态加 `pattern` 字段说明，画布文案「团队」→「协作预设」 | 零代码、零解冻依赖，**立即可做** |
| **R2** | **最小团队实体（主方向）**：`teams` + `team_members` 两表 + 首批 5 类资产 `team_id`/`owner_kind` + 可见性判定单点（两处校验）+ 团队只读页 | 解冻后垂直切片：「建 Team → 邀成员 → 把**一个 Agent 与一个 Workflow** 归属到 Team → 非成员 404」一条链跑通，其余资产同型复制 | 迁移需与迁移账本议题同批（现状 `database.py` 仅 3 条内联 ALTER）；判定改写涉 10 个路由 |
| **R3** | **团队级凭据池 + 配额账本 + 审批人解析**（Team 才真正"管资源"的两块硬骨头） | R2 之后：Provider Key 上移到 `team_credentials`（Agent 继承可覆盖）〔2026-10-15 裁撤：由运行时发现（外部 CLI）取代〕+ `team_quota`/`quota_usage`（聚合+计数双形态、403 带条目、MySQL 账本）+ 审批人按团队角色解析 | **强依赖身份三连**；配额 enforcement 需先解决多副本内存态（S4） |

**推荐次序**：R1（现在）→ R2（解冻后，且判定改写等在三连之后）→ R3。三者可分属不同 change。

---

## 5. 否决记录（含理由，防后续复议时重跑）

| 候选 | 裁决 | 理由 |
|---|---|---|
| K4 Team 吞掉 Domain（改名/合并） | ❌ 否决 | Domain 承担路由/扩容/自愈语义（`CLAUDE.md` 核心能力），Team 承担归属；合并=把两副担子压进一个 4 字段壳；且 K8s 明确「别为细微差异新建隔离层」（E4） |
| K11 Team 只做视图不建表 | ❌ 否决（仅允许作 R2 的第 0 步 UI 试点） | 竞品无一例外建成员表（E1-E3）；视图承载不了配额/审批/成员，等于把议题推回原点 |
| K10 席位/人数硬闸 | ❌ 否决（降级为可选套餐字段） | 自托管开源平台引入计费式席位=伪需求；§1.4 已列"多租户计费"为不做 |
| K6 Project 兼作租户容器 / 保留 `user.project_ids` 双职 | ❌ 否决 | 双职正是今天唯一跨用户闸门挂在文件态用户记录上的根因；Project 保持「一次工作」 |
| K7 纯多态 ACL 不建 Team 实体 | ❌ 否决 | 答不上用户原话「team 可以管哪些资源/实体」——界面上没有可点开的团队 |
| K8 组织与执行复用同一词「Team」 | ❌ 否决 | 见 §0 裁定；竞品三层分词（E5-E7），混词已在本仓文档发生（`COMPETITIVE-RESEARCH` 标题「多 Agent / 多 Team 协作 Harness」指执行期） |
| 「Team+部门+角色+权限包+配额+结算」七表一次上 | ❌ 否决 | 与第 4 轮「C12 七表大爆炸」同罪（`D-collaboration-layer-2/BRAINSTORM.md`）；multica/Dify 皆渐进长出 |
| K12/K14 现在就做团队审批人与真 tenant 边界 | ⏸ 延后（非否决） | 身份三连未解冻（`CLAUDE.md` 裁定⑧ + P0-1 状态）；提前做=假闸门（E8） |

---

## 6. 批判打磨（一轮 · 预演失败 Pre-mortem）

> 技法：假设 18 个月后「S16 团队功能」被用户判定失败/被弃用，反推死因，并把可防的死因**回写进上文结论**（§ 内已改之处见「打磨结果」列）。

| 死因预演 | 最可能的真实版本 | 打磨结果（已写入结论） |
|---|---|---|
| **D1 假闸门**：Team 上线了，但任何人换 `X-User-Id` 就能进别人团队 | 现状 fail-open（`main.py:196-199`）+ Coze 同类自陈水平越权（E8） | §3-6 加**硬前置门**：判定改写必须在身份三连之后；解冻前只出两表与只读页，且文档禁用「隔离」措辞 |
| **D2 判点漏改**：16 表 × 10 路由逐个补 `team_id`，漏一处即越权 | `_filter_owner` 每份路由各写一遍（`domain_api.py:19-22` 等） | §2/§3-3 定**判定单点 + 两处独立校验**；R2 垂直切片只做 5 类资产，其余明列未覆盖清单 |
| **D3 配额超发**：团队配额写在进程内存，多副本各放一遍 | 限流/队列/退避三处内存态（`CLAUDE.md`） | §3-5 规定用量**落 MySQL 账本**，enforcement 依赖 S4 结论，不做内存计数器 |
| **D4 术语漂移**：「role」三义（平台角色 / 团队角色 / Agent 人设 `CustomRole`）导致文档与 UI 各说各话 | `agents_api.py:19` vs `role_custom.py:8-27` vs 新增 `team_members.role` | §2 强制**三词分家**并要求 `CustomRole` 改名或加注 |
| **D5 孤儿与误删**：成员离职时把团队资产连带删掉，或资产跟人走 | 第 4 轮反面案例「有界面没表」（`D-collaboration-layer-2/RECON.md`） | §3-4 三条离场规则照抄 Dify（E1）：鉴权立即失效、资产留团队、`created_by` 永久保留 |
| **D6 概念膨胀**：Team 长出嵌套/部门树，权限解析变图问题、性能与可解释性双崩 | K8s「namespace 不可嵌套、每资源只属一个 namespace」（E4） | §1 表末行 + §5 明确「不做嵌套/部门树」；跨团队共享走 `owner_kind='platform'` 与模板市场既有 `published` 位 |

**打磨净结论**：原推荐 R1/R2/R3 方向不变，但三处被收紧——① R2 首批资产从"全部 owner_id 表"砍到 **5 类**（防 D2）；② 配额与凭据（R3）明确**前置依赖 S4 与身份三连**（防 D1/D3）；③ `CustomRole` 术语冲突成为 R1 的**必办项**（防 D4）。

---

## 7. 文档与原型落点建议（⑤ 过审后才写，本轮不动）

- 1.5.x「Domain 不是安全边界」段 → 补一句「Team（组织层）与 Domain（运行时层）正交，团队化后隔离口径改称『团队内隔离』」。
- §1.6 建议条（编号待 ⑤ 分配，候选新条「Team 组织实体」）：R1 立即可做；R2/R3 标解冻依赖。
- W-2（`ROADMAP.md:116`「Team/Squad 一等对象 + 团队级配额与审计 | S1-C5 | 需先有 work_items」）→ 建议改注：本包把「需先有 work_items」放宽为**可与协作层并行**（Team 依赖的是身份，不是任务），并把 Squad 语义正式并入 R1 的 `pattern` 枚举。
- 原型页：新增「团队」页（成员/角色/资源清单/配额）+ 资产详情卡「归属：个人 / 团队 / 平台」选择器（n8n「创建时选个人空间 or 项目」E3 的界面直译）。
- 依赖序（防跑偏）：R1 →（身份三连 + 迁移账本）→ R2 → R3。


---

## 5. 用户追问补记（2026-09-23 原话「项目和他们之间的关系也没有提现」）

### 5.1 现状事实：Project 是一座「单向孤岛」

| 关系 | 现状 | 证据 |
|---|---|---|
| Project → Agent/Workflow/编排实例 | ✅ 三个单值外键（**项目选一个 agent**） | `backend/models/project.py:16-18` |
| 任何实体 → Project（反向） | ❌ **零外键、零 project_id 列**（grep `ForeignKey("projects`=0） | 全 models/ |
| Agent.project_count | ❌ 死字段：定义+序列化，**无任何写入处** | `agent.py:34` 仅 :50 读 |
| 会话↔项目 | ❌ 无关联列（对话中心与项目两不相认） | `conversation.py` 无 project_id |
| 产物↔项目 | ❌ artifact_service 零 project 引用；产物按 `.specs/<change-id>` 文件态存在，账面无项目维度 | grep=0 |
| work_items↔projects | 计划中=S7 裁定#3「独立表+连接表不并入」，尚未落地 | ROADMAP §五·裁定 |
| trace/metrics↔项目 | ⚠ 假的：`project_id=random.randint(1,3)` 演示拼装 | `metrics_scheduler.py:83` |
| 知识源↔项目 | ❌ 只有 tag/agent 维度，无项目挂载 | `knowledge_source.py` |

**结论**：用户观感成立——原型每页都有"项目"字样，但**没有一张图说得清谁属于谁**。Domain 是 3 字段壳，Project 是 3 外键单向孤岛，Team 是零。三者叠在一起恰是平台组织层的空窗。

### 5.2 建议关系模型（R2 增补 · DESIGN 输入 · 待⑤过审，冻结不实施）

```
Team（新增 · 组织单元 · MySQL teams/team_members）
 ├─ 1:N 持有 → agents / workflows / orchestration / tools / knowledge_sources（team_id + owner_kind，R2 首批五类）
 ├─ 1:N 持有 → projects          ★项目挂在团队下，团队是项目的容器不是竞争者
 │      └─ Project 1:N → work_items（S7 已过审的连接表）/ conversations（补关联列）/ artifact 台账（project_id 列，文件仍在 .specs/）
 │      └─ Project × Agent 参与关系：project_agents 连接表（谁为这个项目干过活，含角色+时段）
 │              ← 取代 project.agent_id 单值外键（多 Agent 参与一项目是常态，K8s 的 ownerRef 也不能单值塞）
 ├─ 配额/审批人解析 → team_quota（R3）
 └─ 正交保留：Domain=运行时隔离（非归属）、User=principal、Project=一次工作的容器
```

**判定句**：`owner_kind=team` 的资源在 Team 页可见可管；Project 页 = 该次工作的**装配快照**（用了哪些 Agent/工作流/产物/任务）；Agent 页反查「服务于哪些项目」（补 S15 拥有/引用两型）。关系收敛单点 `services/visibility.py`+中间件两处独立校验（项目纪律②）。

**原型体现**：`prototype/relations.html`（实体关系全景页）已上线——现状表+建议图+每实体抽屉；Team/Project 详情页待⑤过审后作为 R2 垂直切片一部分。

---

## ⑤ 用户意见补记（2026-09-23 · 原话：「结合我现有代码 我现在代码已经可以创建agent了 并且关联了一些实体 在此基础上扩充 但是没有team的概念」）

**用户原话确认 S16 是本轮唯一真缺概念：「我现在代码已经可以创建 agent 了…但是没有 team 的概念」——**Agent 创建/关联侧走 S14/S15 增量路线即可，Team 无既有代码包袱，按 R2 直接建：`teams` + `team_members`（MySQL day-1 真外键）+ 首批五类资产（agents/workflows/orchestration/tools/knowledge_sources）各加 `team_id + owner_kind`，**存量行 owner_kind 默认 personal 零回填**。执行协作组语义仍按 R1 一词一义（pattern 枚举，不建实体）。Project 归 Team 之下 + `project_agents` 连接表（§5）继续作为关系收口项。

> **〔口径收口注 · 2026-10-23〕** 本结论 R2 首批五类（含 orchestration_instances/templates、域次批）与小队轮原型形态存在差项。经专家团投票（架构师/研发负责人/产品负责人 3/3 全票，R13.2 全票自动执行）**按原型口径收口：首批=agents/workflows/tools/knowledge_sources/域，编排实例与模板列次批**。本段上方 R2 原文保留为历史注，不再是并行口径；编排次批为 ROADMAP 承诺项不得无限顺延。理由：域=4 字段壳零回填且为导航骨架刚需；编排=草稿/发布/模板/市场多态所有权模型，首批纳入使实施波风险翻倍（R19 阶梯律·最少实现）。
