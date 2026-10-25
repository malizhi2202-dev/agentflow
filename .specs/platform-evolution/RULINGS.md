# RULINGS — 现行有效口径总表（单一事实源）

> **用途**：回答「这句话现在还作数吗」。任何文档与本文冲突，**以本文为准**；本文没有的条目，按「所属轮次包的最新页首注 → ROADMAP 轮次节 → PRODUCT-DESIGN 对应节」的顺序回退查找。
> **维护**：新裁定/新收口只改本文一行 + 在来源包加一行注，**不改写历史正文**（历史保留纪律，见 §五）。
> **最近更新**：2026-10-25（**v25-r25-clearance 清账批结案后三修**：§五点五·二 挂账指针 + §五点五·三 R25 结案表 + §五点五·三之一 structure_rules 词表）· 上一修（**v24 代码批结案后二修**）对应产品档 v23，本修对应 **PRODUCT-DESIGN.html v24**（v21/v22 回填 → v23 结案 → v24 清账）· 代码已实施波 0–7（`ac839aa0` `943b7e5e` `64e44de6` + 波 7 提交）**＋ v21（测试基建/真运行时/用户审计表化）＋ v22（导航 6 组/运行时发现/创建 Agent 去凭据/前端壳层）＋ v23（multica 内容迁入）＋ ui-parity（127 页原型逐族对齐，P0–P5）＋ v24/v25 两批迁移 026–037（D1–D11 + R25 清账）**。〔2026-10-25 起新增纪律：**本表的「状态」列必须以实测为准，引用前先查代码；设计与代码的口径差异不进本表（那是挂账），见 §六〕
> **归并范围**：`.specs/` 全部 **320** 个 md〔2026-10-23 记 152 → 10-25 实测 309 → v25 批工件目录 `.specs/v25-r25-clearance/` 5 件后 320〕+ 根 4 本（README / README.en / CLAUDE / STATE）+ `prototype/` **127 页**（v20 删 8 张无入口旧页）。

---

## 一、现行有效口径六列总账（**主表** · 判定顺序见 §五）

> **列义**：`#` 编号 · `现行结论` 一句话（这就是唯一口径）· `推翻了谁` 被本条作废的旧口径（无则 —）· `生效版本` 首次生效的产品档版本 · `写入点` 具体章节/文件 · `状态` 现行/已实施/未实施。

| # | 现行结论 | 推翻了谁 | 生效版本 | 写入点 | 状态 |
|---|---|---|---|---|---|
| **裁⑦** | 可计量追踪数据一律 **MySQL 权威库**（users / sessions / PAT / 口令哈希 / 告警 / audit / change_log / metrics_raw / trace_spans）；SQLite = 本地体验档 | 「文件态 users.json / audit.jsonl 即权威」 | v9 | 主档 §3.1 §5.4 P0-1/2 §6.23 | 现行 · **部分实施**（表已按 MySQL 档落库；权威库切换=`DATABASE_URL` 部署项）〔2026-10-25 回填：`users.json` 表化已做——迁移 018 + `user_store` 导入器；文件态降为兜底，尚未物理退役〕〔**同日 D5×028 无涉**〕 |
| **裁⑧** | ⛔ 原「**开发冻结**：只改 `.specs/` 文档 + `prototype/` + 主档；`backend/` `frontend/` 零改动」→ **2026-10-24 用户令「把开发冻结那个去掉」= 已解除**：`backend/` `frontend/` 恢复可改，实施按 §1.6.0 升级波次推进**〔2026-10-25 回填：波 0–7 全部收口**（10-24~10-25），另有 v21 / v22 / v23 / ui-parity 四轮〕 | 「可以直接进入开发阶段」（解除自身） | v9（解除：10-24） | `CLAUDE.md` · `STATE.md` · §1.6.0 | **已解除** |
| **R0-1** | 自定义阶段模型 **允许**：目录表 + 4 语义锚（锚归类建后不可改） | 「阶段模型必须硬编码」 | v8 | P0-6 · §6.19 | 现行 · **部分实施**（波 0：`stage_config` 目录表 + 校验 + 热更新；4 语义锚未做） |
| **R0-2** | 自动流转**保持现状**、硬门不拦；done 需证据留**建议层**（解读项，可纠正重账） | — | v8 | §6.0 C2 | 现行（解读） |
| **R0-3** | 任务 = **独立新表 `work_items` + `work_item_runs` 连接表**，不并入 projects | 「任务并入 projects」 | v8 | P1-4 · §3.3 | 现行 · **已实施**（波 3 `67420190`） |
| **R0-4** | **未知身份一律拒绝**（缺凭证 = 401；debug header 三重 opt-in / PAT 过渡） | 「缺身份回退 admin（fail-open）」 | v8 | P0-1 | 现行 · **已实施**（波 1 `129c33ec`） |
| **R3-1** | 12 条全局交互纪律（统一详情骨架 · 视图即链接 · 失败三件套…） | — | v3 | §6.0 | 现行 |
| **R4-1** | 执行隔离 = **契约先行**：tier(inproc…remote) + ttl/Retain + egress 默认拒；fail-closed | 「先上容器再说」 | v8 | P1-14 · P2-3 | 现行 · **已实施**（波 5 `943b7e5e`：契约+探测+fail-closed；容器/微虚拟机执行体未开） |
| **R4-2** | A2A 只做 **M0 静态 AgentCard**（M2 冻结）；契约化 API 四件组（ETag→412 等） | 「A2A 全面接入」 | v8 | P1-15 · P2-5 | 现行 · **已实施**（波 5 四件组 + 波 7 M0 静态卡；M2 仍冻结） |
| **R4-3** | 告警**落 MySQL 表**；`scheduling_queue` 与 `scheduler_queue` **并表** | 「告警留进程内环形 500 条」 | v8 | P1-16 | 现行 · **已实施**（波 3 `57945f50`） |
| **R5-1** | 创建 = **三入口一草稿**，必填集收至 2 项（name + 模型档位） | 「创建表单字段多多益善」 | v13 | §6.4 · §5.4 | 现行 |
| **R5-2** | 《Agent 资源关联字典》**四型档位**（owned / mounted / shared / quota-gate）+ 三存储裁定 + 验收五问 = 关联表规则源 | 「关联表各写各的」 | v20（补挂） | §3.3 · `DICT-*.md` | 现行 |
| **R5-3** | **Team** = 组织层资源容器（成员四档 + 五类资产 + 配额 + 审计），**不可指派** | 「Domain 兼归属」 | v14 | §2.11 · §6.29 | 现行 · **已实施**（波 4 `ac839aa0`） |
| **R5-4** | **Squad** = 执行层可指派一等实体（1 leader Agent + 混编 + 自由指令 + leader 协议委派）；画布**不新增动态模式** | 「执行层落为编排实例 `pattern` 预设字段」（S16 R1） | v14 | §2.11 · §6.29 | 现行 · **已实施**（波 4 `ac839aa0`） |
| **R5-5** | 首批五类 = **域进首批、编排实例与模板次批**（专家团 3/3）；次批不得无限顺延 | 「编排进首批、域次批」（S16 R2） | v14（10-23 收口） | §3.3 · §6.29 · ROADMAP 次批承诺 | 现行，模板次批 **未实施** |
| **R5-6** | Team ⟂ Squad **两词两实体、无外键**；**不合并** | 「Team 与小队是一回事」（10-23 询问后确认） | v14 | §2.11 · §7 | 现行 |
| **R6-1** | **记忆四层唯一管道**（L0 原文→L1 原子→L2 场景→L3 核心）；知识库 = 资产域；**层级≠权限** | 「知识库总结写入另设一套 L0-L3」 | v15 | §2.8 · §6.9 | 现行 · **部分实施**（波 6 表/晋升门/检疫/衰减；`v20-residual` 补 L0 抽取入口，默认 dry_run）**〔2026-10-25 回填：**定时作业已做**——`backend/services/l0_job.py` + `main.py` 接线，`L0_EXTRACT_INTERVAL_SECONDS=0` 默认关闭〕**〔v24 代码批 10-25 · D1/D2 已实施〕**迁移 026 补 `domain`（五值内容域，与层级正交）+ `life_status`（生命周期三态）两正交列与 content/confidence/quarantine_until/来源链真外键；`status` 保晋升状态（设计口径反转，见 §五点五·一 D1）；前端接线残项 R25-1〕 |
| **R6-2** | 数据出域分级改号 **D0–D3**（裸写 L0–L3 只指记忆） | 「出域也用 L0-L3」 | v15 | §6.25 | 现行 |
| **R6-3** | 编排提案制**三权分离**：生成（限步限钱）/ 评估（探针+影子重放）/ 发布（人走既有 Apply） | 「自动生成即自动发布」 | v15 | §6.30 | 现行 · **已实施**（波 6：三权分离门禁）**〔2026-10-25 回填：**影子重放执行器已做**——`backend/services/shadow_runner.py` 的 `score_cases`（确定性精确比对）+ `run_shadow`（调既有 `record_shadow`，门禁不复制）〕** |
| **R6-4** | 治理白名单 = **四类产物**；**代码层 RSI 禁止**（线上稳定优先） | 「harness 自改代码」 | v15 | §6.30 | 现行 · **已实施**（波 6 可改面 + 波 7 四类开关；代码层无开关） |
| **R7-1** | **两拍评估链**：探针快筛（弱证据不定优劣）→ 影子重放终身门（冻结金标 + 异厂系 judge）；**Probe 永不作发布依据** | 「单跑一次即判优劣」 | v17 | §6.30 C · §4 时序七 | 现行 · **部分实施**（波 6 门禁 + `v20-residual` runner + `v20-rsi-adapters` 真实 judge 适配器；启用需显式配置厂商与预算）〔2026-10-25 回填时曾标「平台不校验、金标本体无表」；**同日 v24 代码批 D10 已实施**：迁移 030 `golden_sets`（frozen/produced_by/eval_mark）+ `validate_shadow_gate` 平台查账，`gate_evidence=platform_validated`；旧自报路径保留但如实标 `self_declared`〕** |
| **R7-2** | INV⟂DOM **双维提案**（换主题不成立=领域类；换行业仍有帮助=不变量类）；领域类需域成员会签 | 「提案只有一维」 | v17 | §6.30 C · §3.3 | 现行 · **已实施**（波 6：`dimension` 落库 + 领域类会签） |
| **R7-3** | 禁改面 = **可改面声明对象** `surface_manifest`（**不是 prompt 措辞**）；scripts/plugins/hooks 永久禁改 | 「靠提示词说不要改代码」 | v17 | §6.30 E · §3.3 | 现行 · **已实施**（波 6 `surface_manifests` + 永久禁改前缀 + 代码层拒绝） |
| **R7-4** | 晋升准入 **三字段缺一不入库**（cue/lesson/evidence）；`confounded` 为拿不准默认；`NO_ENTRY` 合法 | 「采纳即经验成立」 | v17 | §6.30 A · §3.3 | 现行 · **已实施**（波 6 三字段 + 波 7 `source_seq` 因果前缀 + `promotion_reviews`） |
| **R7-5** | 防腐 **四件**（金标防污染闸为第四件） | 「三件够」 | v17 | §6.30 B | 现行 · **已实施**（波 7 防污染双扫：晋升前标记 + 入库后复核） |
| **R7-6** | **四熔断** + NOISE FLOOR（提案塌缩熔断为第四） | 「三熔断够」 | v17 | §6.30 C/E | 现行 · **已实施**（波 6 四熔断 + NOISE FLOOR） |
| **R8-1** | `triage_state` 与 `rule_versions` **代码已实装**（旧「无」清单翻转）→ 引用前查代码，不引旧句 | 「multica 无 triage/规则版本账本」 | v19 | §6.31 · `RECON-MULTICA-DOCS.md` 附录 A | 现行（**事实翻转**） |
| **R8-2** | 归因 **originator（只鉴权）⟂ accountable（只审计/成本）** 双列 + 归属瀑布 + 域策略 fail-closed | 「一个 owner 既鉴权又记账」 | v19 | §7 | 现行 · **已实施**（波 7 双列+瀑布；`v20-residual` 补域级 accountable 策略表，不可解析即 fail-closed） |
| **R9-1** | **侧栏信息架构 = 6 个父级分组**（构建 / 运行 / 协作 / 知识 / 观测 / 治理，顺序即业务链「造 → 跑 → 一起干 → 沉淀 → 看 → 管」）；原型 `nav-grp` 的「工作区 / 管理」两组口径**被本条取代**；治理组仍按 `user:manage` / `audit:view` 过滤，「文档资料 · 原型」入口仅平台管理员渲染 | 原型 127 页 `nav-grp`「工作区 + 管理」两组 | v22（10-24 用户令：保留 6 组并写回主档） | 主档 §2.10a · `v22-nav-groups/CHANGE.md` · `frontend/src/App.tsx` `NAV_GROUPS` | 现行 · **已实施**（`v22-nav-groups`，**已提交** `cd290f37`） |
| **R8-3** | 外部扩展同意契约**七原则**（授予∩本可做 · 推送不多给 · 空批准集=撤回…）——**预留，非现状** | — | v19 | §7 | 现行（设计态） |
| **R8-4** | 归档**不停在跑 run**（Team / Squad 同）：要停走显式「停止运行」；只停未来指派 | 「Squad 归档=取消在跑 run」（v14 误记） | v16 | §2.11 · §6.29 | 现行 |
| **10-23-e** | 改进标的 = **现有这版代码**（基线 `4ac819bf`·10-12）；P0=它的缺陷，P1/P2=升级路径 | 「设计已有一半」的错觉 | v20 | §1.6 标的声明 · §1.6.0 | 现行 |

## 二、轮次结论台账（R3–R8，全部已过审）

| 轮 | 主题 | 现行结论（一句） | 详表 |
|---|---|---|---|
| R3 | S6 协作四件套 · S7 阶段模型 | 12 条全局交互纪律；阶段模型成型解六件 | `ROADMAP.md` §第 3 轮 |
| R4 | S8–S13 五差距 + 身份三连 | 隔离契约/沙箱阶梯 · A2A M0 静态卡 · OTel 三档（先修产生端）· 协作层止血两件 · 身份三连参数化 | `ROADMAP.md` §第 4 轮 |
| R5 | S14–S16 创建 / 资源字典 / 团队 | 三入口一草稿（必填 2 项）· 四型资源档位 · Team 组织实体 + Squad 可指派实体 · 首批五类收口 | `ROADMAP.md` §第 5 轮 |
| R6 | S17–S20 RSI | **记忆四层唯一管道**（知识库=资产域；出域改号 **D0–D3**）· 编排提案制三权分离 · 决策微模型两步制 · 治理四类产物白名单 | `ROADMAP.md` §第 6 轮 |
| R7 | S21 Harness² | 两拍评估链（探针快筛→影子重放终身门）· INV⟂DOM 双维 · 可改面声明对象 · 晋升三字段（cue/lesson/evidence）· 四熔断 | `ROADMAP.md` §第 7 轮 |
| R8 | S22/S23 双源代码层 | `triage_state` 与 `rule_versions` **已实装**（旧「无」清单翻转）· 归因瀑布 originator⟂accountable · 外部扩展同意契约（非现状）· `kept` 态 · 13 键身份 · 投递硬三句 | `ROADMAP.md` §第 8 轮 |

---

## 三、现行术语表（一词一义，禁止混用）

| 词 | 现行所指 | 不再指 / 易混 |
|---|---|---|
| **团队 Team** | 组织层**资源容器**：成员四档角色 + 五类资产 + 配额 + 审计边界；**不可被指派** | 不指小队；不指编排实例 |
| **小队 Squad** | 执行层**可指派编组**：1 leader Agent + 人/Agent 混编 + 自由指令；**不拥有资产、不是成本主体** | 不指团队；与团队**无外键** |
| **任务** | work item（原「工作项」一词**全站退役**） | 不指 run；不指变更 |
| **自动化** | `automations`（v16 起改名；`autopilot` 仅作历史名） | 旧名 `autopilot*` 仅出现在历史/竞品语境 |
| **记忆四层** | L0 对话原文 → L1 原子 → L2 场景 → L3 核心（腾讯口径；层级≠权限） 〔2026-10-25：**代码 `memories.layer` ∈ {L1,L2,L3}，L0 不入库**（L0 = 对话原文，由抽取器读会话产出 L1）；内容域维度（semantic/procedural/…）代码未实现——**挂账待裁定**，见 §六〕 | 不指知识库总结分层（已并入本管道） |
| **数据出域分级** | **D0–D3**（v15 改号；裸写 L0–L3 指记忆） | 不指记忆四层 |
| **CustomRole** | Agent **人设**（temperament/responsibilities/gates） | **不是权限**；权限三词分家：`user.role` 平台级 / `team_members.role` 团队级 |
| **Domain 隔离域** | 运行时逻辑分组：在哪跑、怎么路由/扩容/自愈 | **不是安全边界**（4 字段壳） |
| **Project 项目** | 一次工作的容器（装配快照） | 不兼租户/可见性闸门（该职责归 Team） |

---

## 四、已推翻 / 已收口清单（**正文保留，此处为准**）

| 旧口径（含出处） | 状态 | 现行口径 | 推翻依据 |
|---|---|---|---|
| 「执行层落为编排实例 `pattern ∈ {single…swarm}` 预设字段」（`D-S16/CONCLUSION.md` §0 R1） | **已推翻** | Squad 升为可指派**一等实体**（leader 协议委派） | 10-23 裁定 · PRODUCT v14 |
| 「首批五类 = agents + orchestration_instances/templates + workflows + tools + knowledge_sources（域次批）」（`D-S16` §1 L34） | **已收口** | **域进首批、编排次批** | 10-23 专家团 3/3 · ROADMAP 次批承诺 |
| 「没有 team 的概念」（09-23 开题原话） | **已推翻（用户追认）** | 现有 team/小队概念，按 R5 落档 | 10-23 追认 |
| 「Squad 归档 = 取消在跑 run」（`teams__agentflow.html` 两处） | **已推翻（v16 纠偏②）** | 归档只停未来指派，**在跑 run 不连带取消**（要停=显式「停止运行」） | multica 代码事实 |
| 「multica 无 triage_state / 无 rule_versions 账本」（09-23 口径） | **已翻转** | 两者**代码已实装**，其 docs 滞后 | R8 代码实证 |
| 「v10 呈审中」（09-23 状态） | **已过期** | 主档已至 **v20**；v10 仅作 v10-frozen 快照 | 版本链 |
| 「会话=1:1 私密 · 无 issue 起点」（09-23 口径） | **仍有效** | 未变 | — |
| 「工作项」（09-23 术语） | **已改名** | 任务（10-15 全站改） | 10-15 裁定 |
| 「Provider / Base URL / Agent 级 API Key」（旧宇宙） | **已裁撤** | 模型档位=运行时绑定；凭据在运行时 CLI 机器 | 10-15 裁定 |
| 「内存三态可撑多副本」 | **已解决（部分）** | 四类状态已落库 + 租约选主（波 2）；多副本仍是**单副本承诺**（cluster API 如实呈现） | 波 2 `09950db4` |

---

## 五点五、代码 ↔ 设计口径差异挂账（**2026-10-25 新增 → 同日结案，见本节末结案表**）

> **为什么单列一节**：§一 的「状态」列只答「做没做」；本节答「做了但与设计口径不符」。
> **两者不同**：前者是进度，后者是**待人工裁定的分歧**——单方面把设计改成代码的样子叫裁撤设计，
> 需要裁定（CLAUDE.md 纪律：一条口径只活在一个地方 + 推翻要留 ⛔ 指针）。
> 完整证据（文件:行）见 `.specs/v24-doc-refresh/`。

| # | 分歧 | 设计口径（主档） | 代码实态 | 影响 |
|---|---|---|---|---|
| D1 | **记忆表三处枚举** | §3.3 `memories`：`layer` ∈ {L0,L1,L2,L3} + `domain` 内容域（与层级正交）+ `status` ∈ {active,revoked,stale-flagged}（**生命周期**） | `layer` ∈ {L1,L2,L3}；内容域维度缺失（用 `kind` ∈ {positive,negative} 代）；`status` ∈ {promoted,confounded,quarantined,no_entry}（**晋升状态**） | **两个正交维度被压进一列**，生命周期态无处落；衰减只有 `decay_score` |
| D2 | **记忆表列缺** | §3.3：`content` / `confidence` / `quarantine_until`（静置期时间列）/ 来源链**真外键** | 三列缺；静置期靠 `status=quarantined` 表达；来源链是裸串 `source_ref` | 静置期与「沿链成批撤回」不可表达 |
| D3 | **可改面声明对象形态** | §3.3 / §6.30 E：`surface_manifest` **不是新表**，含 `path_pattern`/`cap_bytes`/`structure_rules`/`exclusions` 四字段 | 实建表 `surface_manifests`，**只有** `name`/`allow_edit_json`/`owner_id` | 「真源」不含结构规则，门禁判不了描述结构 |
| D4 | **提案表名与维度取值** | §3.3：`improvement_proposals`，`dimension` ∈ {INV,DOM}，列 `proposal_diff`/`probe_pack`/`seed`/`blind_rank`/`fell_back` | 表名 `orchestration_proposals`；维度 {invariant,domain}；五列缺（证据落 `probe_json` 单串） | 命名漂移 + 证据结构不可查询 |
| D5 | **治理账三表缺** | §3.3：`probe_evidence` / `exec_ledgers` / `rule_versions` | 均无表（`rule_versions` 只有一个整数字段 `automations.spec_version`） | 两拍评估的证据、塌缩熔断预算账、版本 diff 只读界面**全无落点** |
| D6 | **自动化触发型与投递账** | §3.3：`automation_triggers.kind` ∈ {schedule,webhook,**api**}；`webhook_deliveries` 两键分开记账 | `kind` 只有两型（第三型被显式拒绝）；表名 `automation_deliveries` + 单一 `dedup_key`（两键用 `or` 合成） | api 型自扩展通道未开；幂等键语义弱于设计 |
| D7 | **小队/自动化级联** | §3.3：指向归档小队的自动化自动转 `disabled`（不静默删行） | `archive_squad` 只改 `squad.status`；`automations` 无 squad 外键可级联 | 归档后自动化仍在跑 |
| D8 | **运行时旧宇宙残留** | §6.28：LangGraph/LangChain/AutoGen/CrewAI **不再作为运行时表述** | `SUPPORTED_RUNTIMES` 仍列四者；`POST /api/agents` 的 runtime 默认值仍是 `"langgraph"` | 与 §6.28 直接冲突；创建表单已不收凭据但运行时白名单未清 |
| D9 | **迁移回滚** | §1.6.0 波 0 判据：「迁移有版本表**可回滚**」 | `backend/migrations.py` 只有正向列表（幂等），**无 down/rollback** | 判据超前，已在主档降级 |
| D10 | **金标/异厂系** | §7 / R7-1：「冻结金标 + 异厂系 judge」 | 调用方传入布尔，平台不校验、无金标表 | 门禁链路成立，金标真实性不成立 |

**处理方式**：以上 10 条**一律不改设计、不改代码**，等人工裁定后逐条落「设计改」或「代码补」。
本节每条在裁定后须回填结论（**状态标只升不降**）。
### 五点五·一 结案（2026-10-25 · change `v24-doc-refresh` 代码批 · 用户「都做」授权）

> 方向按 `.specs/v24-doc-refresh/RULINGS.md`（裁定记录）：**默认改代码对齐设计**，两处例外反转设计口径（D1 的 `status` 列名契约、D4 的维度取值字面）。
> 迁移 026–031 · 门禁：后端全量 OK / tsc 0 / vitest·build 见 `.specs/v24-doc-refresh/TEST.md`。

| # | 结案状态 | 代码落点 | 残项（如实挂账） |
|---|---|---|---|
| D1 | **已实施** | 迁移 026：`memories` 补 `domain`（五值内容域，与层级正交）+ `life_status`（active/revoked/stale-flagged 生命周期）；`status` 保晋升状态（**设计口径反转：两列并存取代单列改写**——API/UI 已发布契约不断） | 前端筛选/表单未接 `domain`/`life_status`（挂 R25-1）；存量行 domain 默认 semantic、life_status 默认 active |
| D2 | **已实施** | 迁移 026：`content`（缺省取 cue）· `confidence`（0–1 校验）· `quarantine_until`（检疫落时间列）· 来源链真外键 `source_run_id`/`source_conversation_id`（FK 实装；SQLite 已开 `PRAGMA foreign_keys=ON` 对齐 MySQL） | 旧行 `source_ref` 裸串不回填（双轨兼容）；「沿链成批撤回」查询仍走 source_ref |
| D3 | **已实施** | 迁移 026：`surface_manifests` 补四结构列 + API 收发；**设计口径修订：表保留**（「不是新表」的原意=不另起独立子结构） | `structure_rules` 存而不判——门禁尚未消费结构规则（挂 R25-2） |
| D4 | **已实施** | 迁移 027：表名统一 `improvement_proposals` + 五列（proposal_diff/probe_pack/seed/blind_rank/fell_back）；维度取值 {invariant,domain} 保留，**设计注记 = INV/DOM 的等价可读写法** | 旧行 probe_json 不迁 probe_pack（双轨读） |
| D5 | **部分实施** | 迁移 028：三表齐（probe_evidence / exec_ledgers / rule_versions）。写路径：`rule_versions` **已接线**（create/add_trigger/update_sections 逐版落不可变行）；`probe_evidence` **已接线**（record_probe 可选 evidences，不传不造数） | `exec_ledgers.expected_*` 无预算帽生成器作上游——**宁挂账不伪造恒等式**，写路径待接线（挂 R25-3）；E2E/界面「v1…vN diff 只读」未做（挂 R25-4） |
| D6 | **已实施** | 迁移 029 + 代码：`kind` 三型（api 型 + `POST …/triggers/{id}/invoke` 入口，token 即凭据）；投递**两键分开**（idem_key/delivery_key 两列分记分查，dedup_key 留兼容）；`STATUSES` 补 disabled | webhook HMAC 签名校验仍未实装（token=sha256 凭据制，挂 R25-5） |
| D7 | **已实施** | `disable_for_squad`：archive_squad 级联把 `owner_track=squad` 指向它的自动化转 disabled（服务层=状态转换层，不靠提示词）；`run_gate` 独立 disabled 分支；恢复必须人点 resume（沉默≠同意） | 已归档规则不受级联（设计原文「不静默删行」语义）✓ |
| D8 | **已实施** | `SUPPORTED_RUNTIMES` 清四旧项（剩 hermes/dsh/codex/custom）；`POST /api/agents` runtime **必填**（缺 400）；snapshot 迁移产物去 langgraph/gpt-4o；前端类型/fallback 同步 | 存量库旧 runtime 行不清洗（读侧不校验，写侧必填）；OrchestrationCanvas 色板保留旧值=在途图兼容显示 |
| D9 | **已实施（按主纪律修订）** | `rollback_to()` + `DOWN` 登记（026–031）；未登记版本**显式拒绝且一版不动**。主纪律维持 **fix-forward**（v21 T-06 成文决策），down=逃生门非常规 | 001–025 无 down（历史迁移含整表重建，按需补登，不假装全量可 undo）；波 0 判据口径同步改写 |
| D10 | **已实施** | 迁移 030 `golden_sets`（frozen/frozen_at/by · produced_by · eval_mark 内容指纹）+ `validate_shadow_gate`：**冻结由平台查账、异厂按厂牌判定（识别不了=fail-closed 拒）**；shadow 响应带 `gate_evidence`（platform_validated / self_declared） | 不传 golden_set_id 的旧调用保留自报门但**如实标 self_declared**；前端金标集管理页未做（挂 R25-6） |
| **D11**（本轮并账新增·原数据模型对账项） | **已实施** | 迁移 031 `rsi_switches.last_reason/last_actor`；**停用必填原因**（服务 + 路由双入口校验，CLAUDE.md 纪律）；审计 detail 带原因；前端两处入口接线（管控面确认层输入框 + 记忆中心 prompt 收因，空=取消） | 「四类目 + **全局一行**」仍挂账：前端总闸=逐类目聚合已如实呈现，全局行改动面涉及聚合语义（挂 R25-7） |

### 五点五·二 新增挂账（两路对账发现 · 待裁/待做）

> **〔2026-10-25 · change `v25-r25-clearance` 结案〕**本表 R25-1…11 已经四条人工裁定并逐行清账——**结案与残项继承见 §五点五·三**；本表原文保留作发现时的证据快照。

| # | 分歧/缺口 | 证据 | 性质 |
|---|---|---|---|
| R25-1 | 记忆前端筛选/写入未接 `domain`/`life_status`/`content`/`confidence` 新列 | `frontend/src/stores/rsi.ts:16`（LAYERS/STATUSES 旧集合）· `pages/Memory.tsx` 表单 | 前端残项（后端 API 已透传） |
| R25-2 | `structure_rules` 存而不判（门禁未消费结构规则） | `backend/services/rsi_service.py` assert_editable 未读 structure_rules | 治理残项 |
| R25-3 | `exec_ledgers` 写路径缺 expected 上游（预算帽生成器） | 设计 §6.30 C「参数由预算帽生成器定」无实现 | 需设计小裁定：生成器入批 or 表挂起 |
| R25-4 | 规则版本界面「v1…vN + diff 只读」未做 | `GET /api/automations/{id}/rule-versions` 已有，前端未消费 | 前端残项 |
| R25-5 | webhook HMAC 签名校验未实装（设计 §3.3 v14「HMAC 签名校验」；现状 token=sha256 凭据制） | `automation_service.py` 全文无 hmac | 口径差·待裁 |
| R25-6 | 金标集管理界面未做 | `GET/POST /api/rsi/golden-sets` 已有，前端 0 消费 | 前端残项 |
| R25-7 | rsi_switches「全局一行」总闸未落表（前端聚合呈现已如实） | 设计 §3.3「四类目 + 全局」 | 口径差·待裁 |
| R25-8 | 看板**指派确认层**（原型硬口径「选 Agent/小队一律先弹两决定」）前端缺且未标「未接入」 | 前端对账报告 · `AssigneePicker.tsx:76-85` 直接提交 | 前端缺实现且缺诚实标 |
| R25-9 | 迁移号 **019 双行**（`019_decision_and_finetune` 与 `019_runtime_registry`）——账本按全名幂等不炸，但编号语义撞车 | `migrations.py:961-962` | 记录在案；**不改号**（改号=已部署库重放） |
| R25-11 | **列形态差异族**（§3.3 已逐行标注但不在 D1–D10 编号内）：squads 复数名/leader 无 FK/成员 member_kind+member_id 单列/无 created_by · 任务队列 trigger_comment_id/coalesced_comment_ids/handoff_note/fire_at 四列缺 · automations concurrency_policy/issue_title_template 缺 · subscriptions/mention_targets 名差与缺表 · im_bindings/integrations 未拆表 | 主档 §3.3 各行 v21/v23 注 | 实现增量（P1/P2 面），非设计分歧；按主档判据逐项补，无需逐条裁定 |
| R25-10 | 主档端点名失实三处（`/api/finetune/*`→实际 `/api/decision-models/finetune/batches`；`/api/artifact`→`/api/changes/{id}/artifact`；`/api/channel`→`/api/channels/*`） | API 对账报告 | 文档失实（本轮主档已改，见 v23 版链） |



### 五点五·三 R25 结案（2026-10-25 · change `v25-r25-clearance` · 四条人工裁定）

> **裁定原文**（AskUserQuestion 四裁）：批次范围=**全做 A+B+C**；R25-5=**实装 HMAC-SHA256，token 双通道过渡**；R25-7=**落表：全局一行总闸**；R25-3=**表挂起，exec_ledgers 继续只建不写**。
> 五笔入库：`bb54ea48`（迁移 032–037）· `92e62cc7`（治理）· `66913ab1`（指派开跑）· `9531ed8b`（前端四件）· 本 docs 批。**真 MySQL 重放收口**：`pending=[]`，squads 表级 FK `fk_squads_leader_agent`、队列 7 列、automations 3 列 + triggers `signing_secret`、`mention_targets`/`im_bindings` 两表、订阅泛化列、global 行 `enabled=1` 逐项验收通过（L-014 纪律：动 schema 在权威方言实跑）。

| # | 结案状态 | 落点 | 残项（如实继承） |
|---|---|---|---|
| R25-1 | **已结案** | `stores/rsi.ts` 补 `MEMORY_DOMAINS`（五值）/`MEMORY_LIFE_STATUSES`（三态）词表与 `Memory.domain/life_status/content/confidence` 四字段；`Memory.tsx` 写入表单三输入（内容域/内容摘要/置信 0–1 校验）+ 筛选器两 select 透传 query + 行内三 chip（**有值才渲，不渲染假默认**） | 存量行 domain=semantic/life_status=active 的物化默认仍在库层，界面只读不回填 |
| R25-2 | **已结案** | `rsi_service.assert_editable` 消费四结构列，判定链 `path_pattern`→`exclusions`→`structure_rules`（逐条合取）→`cap_bytes`（**仅当调用点传 content 才判**）；词表成文（见下 §五点五·三之一）；写侧 `create_surface/update_surface` 同词表校验，畸形规则 **fail-closed** | `cap_bytes` 依赖调用点能给正文；给不出的入口如实不判（不是绕过，是判据不足） |
| R25-3 | **维持挂起（用户裁定）** | 无代码改动——预算帽生成器不入批 | `exec_ledgers` 继续**只建表不写**；宁挂账不伪造恒等式（写 expected=actual 违背本表纪律） |
| R25-4 | **已结案** | `stores/automations.ts` 加 `ruleVersions/ruleVersionsError`（读取失败**独立提示、不污染主 error**）；`Automations.tsx` 节②末「规则版本」子节：v1…vN 升序 + 任选两版 key 级 diff **只读** + 双 select 对比 | 后端无回滚端点 ⇒ 界面显式标 `只读 diff · 回滚未接入`（原型「回滚」toast **非本批口径**，差异登记于此） |
| R25-5 | **已结案（HMAC + 双通道）** | `add_trigger/rotate` 生成并存 `signing_secret`（明文**回显一次**、密文经 `encryption_service` 落库、api 型不设）；`ingest_webhook` 认证闸：**带 `X-Webhook-Signature: sha256=<hex>` ⇒ HMAC-SHA256(raw body) + `hmac.compare_digest`；不带 ⇒ 回落旧 token 通道**；投递账 `auth` 字段记因（`hmac`/`legacy_token`），拒因分记 `signature_invalid`/`signature_unconfigured`（未配签名却带签名头=401） | **token 退役不在本批**（双通道并存，退役另批裁定） |
| R25-6 | **已结案** | `stores/rsi.ts` 补 `goldenSets` 状态与 fetch/create/freeze；新组件 `control/GoldenSetsCard`（列表 cases_count/produced_by/冻结态/eval_mark + 管理员新建与冻结）挂管控面；`Memory.tsx` 影子重放改**选已冻结集**传 `golden_set_id` | 不选集时保自报路径并如实标 `self_declared`（D10 双口径不变） |
| R25-7 | **已结案（落表）** | 迁移 032 幂等插 `rsi_switches.category='global'` 行；`assert_category_running` **先查总闸**（off ⇒ 短路一切类目，在任何类目判定之前）；`switches()` global 领衔（缺行合成开）；`set_switch` 与路由放行 global（停用必填原因双入口不破） | 前端**无 global 真行时如实回退**逐类目聚合并加「派生 · 」前缀（不假装是新后端） |
| R25-8 | **已结案（含后端接线）** | 服务层 `run_from_assignment`：人轨拒（无 run）· 小队走 leader 任务如实注 · **停车闸（backlog/未开始）内禁开跑** · 终态不豁免 · 成功后 `record_run(status="queued", 触发源=指派)`；`POST /api/tasks/{id}/assign` 收 `start`（服务+路由双入口）；前端 `AssigneePicker` 拆出 `AssignConfirm` 三按钮确认层（开始/先不开工/取消，**只做一份**，`NewTaskForm`/`TaskCard` 复用），人轨不弹、parked 置灰「开始」并给 title 说明 | 「先不开工」=只登记指派不建 run（与原型口径一致）；`trigger_agent_run` 的 WorkItem 关联仅在此路径落账，其它触发源未回溯补 |
| R25-9 | **维持不改号（已裁定）** | — | 019 双行按全名幂等不炸；改号=已部署库重放，**不做** |
| R25-10 | **已结案（文档失实类）** | 主档端点名 v23 已订正三处；本批无代码动作 | — |
| R25-11 | **部分结案（列形态族 · 迁移 033–037）** | 033 `squads.avatar_url` + `squad_member.created_by` + `leader_agent_id` **表级 FK `ON DELETE RESTRICT`**（MySQL 走 `add_fk_if_missing`，inline `REFERENCES` 会被静默忽略——L-014）；034 队列补 7 列（四设计列 + `is_leader_task` + `squad_id`/`workflow_id`）+ 两索引 + `to_dict` 透传；035 automations 补 `concurrency_policy DEFAULT 'queue'`/`issue_title_template`/`created_by`，triggers 补 `signing_secret`；036 建 `mention_targets` + 订阅泛化列 `subject_type`/`subscriber_type`（默认 task/member 保现状；source 词表**名差保留在案**，服务侧同义放行不 rename）；037 建 `im_bindings` + `CHANNEL_TYPES` 扩至 8 值（lark 作 feishu 同义） | **表先行、写侧未造数**（同 exec_ledgers 模式，不伪造）：队列 coalesce 投喂点未接、`concurrency_policy` 的 `replace` 语义无引擎抢占位点、`mention_targets` 收据与 `im_bindings` 入站身份解析无真实写入位点；订阅**旧 UNIQUE 不删**（expand-only），多行形态待表重建；无评论实体表 ⇒ `mention_targets.comment_id` 为普通可空列，**不造引用目标** |

### 五点五·三之一 structure_rules 词表（R25-2 裁定成文 · 唯一口径处）

- **字符串形态** = fnmatch 通配（`*` **含 `/`**，即不做路径分段）；空串 = 命中一切。
- **对象形态** = `{type ∈ prefix | suffix | regex, value}`；`regex` 用 Python `re`（`search` 语义）。
- `exclusions` **命中即拒**，优先于 path_pattern 与 structure_rules。
- `structure_rules` **逐条合取**（全部命中才放行）；畸形规则（缺 type / 未知 type / 坏正则）**写侧拒绝、读侧 fail-closed 拒判**——坏配置不许静默变成「全部放行」。
- `cap_bytes` 是**内容体积上限**，仅当调用点能取到正文时判定；取不到正文即不判，不以此绕过其它三条。
- 词表在代码的唯一定义处：`backend/services/rsi_service.py`（`_pattern_matches` / `_rule_matches` / `_validate_structure_rules`）。改词表先改本节，再改码。

## 五、历史保留纪律（这次归并的执行规则）

1. **不删、不改写**已过审的正文；冲突处**加行内标记 + 上位指针**（写法见 `D-S16/CONCLUSION.md` 页首与 §0/§1 的 ⛔ 标记）。
2. 每个历史包（`D-*/` 的 RECON/BRAINSTORM/PANEL/REVIEW）顶部的〔口径注〕**指向本文**，不再各自维护「现行」副本。
3. 状态标只升不降：`待审⑤ → 通过`、`呈审中 → 已过审 / 已被取代`。
4. **文档是设计态**：任何「实现/代码」判断以 `STATE.md` 的代码基线为准，不从文档反推代码已具备。
5. 归并索引见 `.specs/product-design/INDEX.md`（产品档 + 原型 + 各轮包的一张总表）。
