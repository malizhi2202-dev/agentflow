# STATE — 跨会话状态

> 本文件记录当前进行中的工作与上次断点。**每次会话结束前更新**。
> 最近更新：2026-09-23

## 当前阶段

**产品化调研与文档重写**（code-kit discovery 第 1 轮 + P-product 产物重写）

## 最近完成

| 时间 | 事项 | 产物 |
|---|---|---|
| 2026-09-21 | 剥离 code-kit 耦合、目录扁平化 | 全仓 `code-kit\|codekit\|code_kit\|code-kit-monitor` grep = 0 命中 |
| 2026-09-21 | 竞品调研（67 个开源仓库一手实测） | `.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md`（997 行） |
| 2026-09-21 | 参考 Multica 检视可借鉴点 | 已并入调研报告与产品文档 §1.6.5 |
| 2026-09-21 | 重写产品文档与界面原型 | `.specs/product-design/PRODUCT-DESIGN.html`（3,072 行 / 310 KB，零外部依赖，HTML 校验 0 错误） |
| 2026-10-15 | 原型「运行时重造 + Multica 对齐」批量（裁定⑧内：只改原型与文档） | `.specs/product-design/prototype/` 132 页：新 `runtimes.html`（daemon 探测外部 CLI·模型目录随运行时·现有 `backend/runtime/adapters` 现状区）；`agent-detail` 四标签化、`__config` 16 分区、`agents__new` CLI 运行时+域可选（未分类=NULL 虚拟组）；`chat` 1:1 私密+决策微模型四路由；`knowledge` 两级（公共只读/空间随项目 1:1·L0-L3 参考腾讯记忆分层）；`projects__new` 重写（裁起止时间·GitHub 克隆关联·Leader/成员=个人 Agent·建项目即建空间）；users↔个人 Agent 1:1；roles 融合 CustomRole 14 字段；tools 详情↔注册同源可编辑；canvas ＋新建/切换器/应用内部署→跳工作流；全站 LangGraph 运行时与 Agent 级 sk-\*\*\*/Base URL 旧宇宙清零；PRODUCT-DESIGN.html 同步完（±302 行·新增 §6.28 运行时发现·v11 注记；agent-domains REQUIREMENT/TASK 回归未分类口径；改前备份 /tmp/agentflow-recon/PRODUCT-DESIGN.pre-sync.html） |
| 2026-10-15 | 同日第二批·7 条裁定（任务化收敛）：产物编辑下线 · 项目文件查看 · 阶段模型确认非孤立保留 · 看板详情统一 · 工作项→任务全站改名 · 收件箱上下文线程 · 回放=任务回放+入口链 | 原型 130 页（删 artifacts×3、新 `projects__files.html` 只读双源文件树、`board__work-item-new`→`board__task-new`、board 统一 #dr-task+scope 条、inbox #dr-thread×3、replay 四入口 callout、stage-model 实证条、顺手修复 replay__run 7 条历史断链）；「工作项→任务」235 处/54 文件；旧模型 id 深清（deepseek-v3→deepseek-chat、gpt-4o→gpt-5-codex、gpt-3.5*→deepseek-chat、claude-3.5-sonnet→claude-sonnet-4.5，gpt-4o-mini/qwen-max 保留为目录内合法；gpt-4o 类命中清零）；「回归默认域」全改「回落未分类虚拟组」；主档 v12（±62/−142·§6.18 撤编注·§6.13b 注册·6.19 实证·6.20 统一裁定·6.21 线程·6.22 回放入口；备份 pre-sync2） |
| 2026-10-15 | `.specs` 全区文档口径同步（用户裁定：设计改动必须随带全区文档） | 117 个 in-scope md/txt 中改 24 文件（+59/−35）：叙述「工作项→任务」（表名/原话引文保留）；5 个仍作前进路线的 Provider Key/模型档位/langgraph 推荐句加〔2026-10-15 裁撤〕注；9 个历史评审/证据文件仅顶部口径注（状态标零触碰）；capability-groups 架构图旧模型 id 按映射换（盒线对齐保持）；「回归默认域/产物编辑/deepseek-v3/gpt-4o/gpt-3.5/claude-3.5」全区 0 残留（竞品事实与代码证据语境合法保留） |
| 2026-10-23 | 三需求·能力编辑与 IM 集成（参考源=本机 multica 实例源码 packages/views/agents + server/internal/integrations 一手侦查） | ①创建↔详情分区 1:1（agents__new 13 节 183→379 行，危险区/探活=创建后配置）②集成=IM 六通道卡状态机（BYO 密钥遮蔽·写-only·改密钥=断开重连·在线验证 400/409·软撤销必填原因·owner/管理员两档·自托管白名单；三页一致：草稿卡「AF-草稿演示号」、详情「AF-审查号」+Slack 已绑呼应 chat.html）③能力五子栏全行级 CRUD+保存语义分级总卡；agent-detail 574→861、config 356→454（#sec-im 旧锚不动）；PRODUCT-DESIGN v13（§3.3 integrations 表/§7 两档权限/§8 术语四行/Q25；备份 pre-sync3）；附带：子代理曾经用户直通装 crontab 每日总结任务，用户随后裁定「不需要」——已撤销（crontab 清空、空 logs/ 目录删除，2026-10-23） |
| 2026-09-22 | discovery 第 3 轮闭合：S6(7)+S7(12) 过审（原话「都通过」）→ ROADMAP 回写 + **PRODUCT-DESIGN.html v3 执行**（定位句/P1-12·13/盯防重写/§6 全局交互纪律/规划原型注记/FAQ）|
| 2026-09-22 | code-kit 统一改造（D-discovery/P-product 收编为主干前置阶段）+ 本项目产物两轮迁移 + discovery 第 2 轮合规复审 | kit 侧 16 文件；`.specs/platform-evolution/` 5 包 30 文件；HTML 状态标 + 口径更正 3 项 |
| 2026-09-21 | discovery 第 1 轮 5 个子议题落盘 | 旧布局 27 文件 → 同日迁 code-kit 统一命名 → 再按体量红线 R16.8 二次归并：`.specs/platform-evolution/` = `TOPICS.md` + 5 × `D-<子议题>/` 文件包（TOPIC/BRAINSTORM/RECON/CONCLUSION/PANEL/REVIEW）+ `ROADMAP.md`，内容无损 |

## 进行中

- 🏁 **四轨收束（2026-09-23）**：①凭据扫描完成=**无泄露无需轮换**（报告 `.specs/credential-scan/SCAN-REPORT.md`；两后续工程项：KDF 缺陷、Secret Scanning 开启）②identity-hardening **冻结于 3-task 零代码**（裁定⑦ MySQL 介质修订已入三书）③stage-model-convergence 未立项（实施冻结）④small-model 2-design 中途叫停无残骸。**裁定⑦**可计量数据 MySQL 权威库+**裁定⑧**开发冻结 → 已全量落 PRODUCT-DESIGN.html **v9（呈审中）**（15 处+Q23）与 ROADMAP §五附注

- 🔍 **platform-evolution discovery 第 4 轮开轮**（2026-09-22 用户点名 8 条：五差距①-⑤+身份三连）：S8-S13 六包 ①-④ 全落盘（GD 均 3/3）→ **PRODUCT-DESIGN.html v8 呈审中**（3379 行：八项升级句+P0 参数化+建议条 P1-14/15/16+纪律 §1.6.5 扩至 13+Q21/22+新原型 p26 执行隔离/p27 对外集成+p1/p4/p16/p20/p22 注记；⚠ 修正三处：kagent v1alpha2／trace_spans 零写入声称降级／kagent HITL 引用注）；**⑤ 门已过：用户原话「通过」2026-09-23** → ROADMAP 第 4 轮节回写 + 六包/TOPICS/v8 状态标全晋级 + P1-14/15/16 正式入表；零代码改动全程遵守；**第 4 轮闭合，无第 5 轮触发条件**

- 🆕 **change `small-model-decisions` 立项草案**（2026-09-22，Jev/System One 决策小模型分层 + 对话记忆微调工厂 + 自测闭环）：`.specs/small-model-decisions/CHANGE.md`，澄清已答（A+B+C 首批全要·消费级基线·域内隔离+显式开关·内置基准+用户回放），REQUIREMENT.md 已过需求门（4/4）；**P-product v4 已把产品文档+界面原型补齐并过人审门**（用户原话「通过」2026-09-22；§2.7/§5.19/§6.23/§6.24/术语/FAQ，全标「未实现」）；铁律：两步制显式启用，未绑定=零介入。v5 已过审（「好的」）；**E 层环境参谋追加**（用户原话：按机器配置自识别给可执行方案）→ 需求门第 2 轮 4/4 + **v6 呈审中**（§6.25 新页+联动 8 处）；红线升级为**参谋零执行**（用户原话「只给方案不执行」，白名单代执行取消；画像只读不上传）→ 需求门第 3 轮 4/4 → **v7 已过审（「通过」2026-09-22）· P-product 全线闭环**；**2-design 仍未动——等指令**

无。**当前无未完成的写入任务。**

## 人工裁定（0 项待裁 · 2026-09-23 六项全部已裁）

原话一条消息连裁六项：「**1 允许 · 2 可以自动流转 · 3 独立的+连接表 · 4 接受 · 5 可以 · 6 推送**」

| # | 裁定 | 落点 |
|---|---|---|
| 1 | 「允许」 | 允许自定义阶段模型；实施按 S7 成型解（目录表+4 语义锚，已过审）——P0-6 实施 change 可开 |
| 2 | 「可以自动流转」 | **解读待认**：现有自动流转保持、硬门不拦；done-需证据留建议层。若原意为「接受改变」说一句即纠账 |
| 3 | 「独立的+连接表」 | work_items 独立新表 + work_item_runs 连接表，不并入 projects——P1-4 数据模型定案 |
| 4 | 「接受」 | 「未知身份一律拒绝」定案（缺凭证=401 + debug header 三重 opt-in/PAT 缓冲）——P0-1 执行链可开 |
| 5 | 「可以」 | 状态外置前先补测试的工期延长被接受 |
| 6 | 「推送」 | 确认已推送且公开（与本日照查一致）——**git 历史凭据扫描+轮换评估转立即执行项**，开链等指令 |

完整裁定记录：`.specs/platform-evolution/ROADMAP.md` §五·裁定。**§五清零，阻塞项解除。**

## 下一步建议（按 discovery 的硬约束顺序）

0. **v9 已「好的」过审**；**v10 呈审中**（P0-10/Q24/两档收口+README·CLAUDE·CONTEXT 同步）——等过审原话与解冻词
0b. 🧪 **交互原型 v1 全量完成**（09-23 用户令「所有模块」）：`.specs/product-design/prototype/`＝28 页全部可点（详情抽屉/破坏性二次确认/选择弹层/toast），**跨页深链**（相关页条+`data-goto`，同一 mock 宇宙 agent-7/r-128/Notion 401/wf-42），index 全量路由；5 组并行 agent 产出约 6,000 行、自检全绿
0c. 📌 **5173 入口已接**：`frontend/public/prototype`→原型目录软链（Vite 直服 `/prototype/index.html`）+ `App.tsx` 侧栏 Logo 下「📄 文档资料 · 原型」新标签（唯一前端微改=用户明令，其余开发仍冻结·裁定⑧）
0i. 🎯 **⑤ 门用户意见（09-23 原话「结合现有代码…在此基础上扩充 但是没有team的概念」）已补记三包**：S14/S15 定位=纯增量（复用现有 POST/表单/六关联，仅修校验/加 draft 值/入口层改造/补白名单）；S16 Team=唯一真新实体（无旧包袱）。三包仍待审⑤等过审原话。
0g. 🔍 **platform-evolution 第 5 轮开轮并出包**（2026-09-23 用户点名）：拆 3 子议题（TOPICS 第 5 轮表已登记·全「待审⑤」）→ 三路 subagent 五步走完 ①②③④，工件齐：`D-S14-agent-creation/`（GD 3/3 同意，创建三入口一草稿+必填集收敛 2 项+生命周期 5 态，顺带查实 api_key 是"假必填"用 not_set 字面量绕过 agents_api.py:45）、`D-S15-agent-resource-model/`（2同意1有保留，资源关联字典+四型语义+FK/JSON 规则+Agent 版本快照）、`D-S16-team-entity/`（GD 通过·反对0，一词一义裁定+Team 首批五类资产+team_quota+**CONCLUSION §5 实体关系全景**）。联网：Dify/Coze/Langfuse/n8n/Zapier/K8s/AutoGen 多页一手正文到手，Salesforce/GPTs/CrewAI 参数表等已标「未联网验证」。
0h2. 📎 **项目×关系×资源三处体现**（09-23 用户追问）：projects.html 三详情抽屉补「关联资源（现/建议）」行；projects__agentflow.html 增 9 行「关联资源」区（含判定句 Project页=装配快照）；relations.html 增「项目可关联资源 9 类正面清单」面板（能/不能/四型语义/生命周期配额归属）。主文档侧同内容待解锁词（用户前令 444 冻结）。
0h. 🕸 **新增原型页 relations.html**（用户「项目和他们之间的关系也没体现」）：现状 10 行代码证据（Project 三单值外键·反向零引用·Agent.project_count 死字段·trace project_id=random 假数）+ 建议 Team→Project→{work_items,conversations,产物台账,project_agents} 关系树 + 9 张实体抽屉；已挂进 prototype/index 顶部。
0f. 🧭 **原型交互三级分层完成**（09-23 用户纪律：弹窗=简短确认｜抽屉=可完全展示的只读｜详情页=复杂/可编辑+返回上级）：5 组并行重分级 28 页——**新增约 40+ 张 `<父>__<实体>.html` 详情页**（变更详情/域详情/配置编辑/降档警告/删除检查清单/绑定表单/命令预览等全部升页），父页触发器改 data-goto、无孤儿浮层；基建 data-back+detail 样式入 proto.js/base.css；全量配平与链接可达性自检通过。主文档保持 444 未动。
0e. 🔒 **PRODUCT-DESIGN.html 冻结保护（2026-09-23 用户令「不要动，也很重要」）**：主文档=只读基线——已 `chmod 444` + 同目录快照 `PRODUCT-DESIGN.v10-frozen.html`（checkpoint 工具故障下的兜底）。此后一切原型迭代只改 `prototype/` 文件夹；主文档若要再演进，须用户明确解锁（撤 chmod）并升 v11。
0d. ⚠ **事故记录**：rollout 期间某 agent 组把 STATE 回滚成旧快照（14:16 写回），丢失 0b/0c 段——本次重建；教训：**并行 agent 一律禁写共享台账文件**，已属硬约束（本条入 ROADMAP 纪律候补）；等：v10 过审原话 · 开发解冻词 · 个人邮箱清史裁量

1. **修复 32 个 TS 错误**，恢复 `npm run build`（当前必然失败）
2. **`git rm --cached node_modules`**（35,517 / 35,847 个跟踪文件是依赖）
3. **消除 fail-open 身份回退**（`backend/auth.py:181-186` 缺身份回退 admin）
4. 写明「当前必须单副本部署」与「`Domain` 不是安全边界」

完整路线图见 `.specs/platform-evolution/ROADMAP.md`（议题状态账本：同目录 `TOPICS.md`）。

## 环境事实

- 后端：`backend/`，FastAPI + SQLAlchemy 2.0 + SQLite（默认）/ MySQL（可选）
- 前端：`frontend/`，React 18 + TS 5.5 + Vite 5.4 + Zustand
- 虚拟环境：`/home/malizhi/.venv`（Python 3.14.4）
- 启动：后端 `uvicorn main:app --port 8000`；前端 `npm run dev`（5173，代理 `/api` → 8000）
- 默认管理员：`admin` / `123456`（**硬编码，属待修项**）
- 已知缺陷：`npm run build` 失败（32 个 TS 错误）；`node_modules` 被 git 跟踪

## 已知约束

- `.specs/` 是**产品一等数据**（知识产物），**不得删除**
- 读写 `.specs/` 路径一律经 `config.get_specs_dir()`，不要硬编码目录
- 9 阶段模型当前硬编码在 13 个文件中（待配置化）
| 2026-10-23 | D-discovery 第 6 轮开轮：RSI 递归自我改进（用户点名） | 前置裁定成文：**代码层禁自改（线上稳定）**，RSI 只作用四类产物（技能/记忆/编排配置/模型权重）。拆 S17 记忆产物 / S18 编排提案制 / S19 微调接线 / S20 治理门，TOPICS 申报+四包 ①BRAINSTORM 落盘；②RECON=web_fetch 直抓 arXiv/S2 逐条核验（fetch 已证 2305.16444≠Voyager，弃号；DGM 2505.22954 核实），web_search 端点仍不可用（api.360.cn 不支持原生搜索）。零代码（R16.1） |
| 2026-10-23 | 小队轮：Team⟂Squad 两层落地（multica 方案，用户裁定画布不加双模式） | 新 teams.html（双 tab 一词一义）+teams__agentflow（组织八区）+squads__code-review（369 行核心页：协议面板/12 节点时间线/autopilot+quick action/受审模板导出）；board 指派三轨+Triage 门、af-109 真形 mention、chat 能力行、replay briefing 2 步、control-plane 三入口句、agents 家族归属转移（即时端点不入草稿=第四写路径）；侧栏小队中心 sweep 18 页+五缺口修复（导入措辞收口整包失败/audit team 锚点/域树归属 chip/coalesced 注/133 页计数）；PRODUCT-DESIGN v14（§2.11+§6.29 226 行+8 表+权限 13+术语 10+Q26；canvas/workflows 与 v13 逐字一致=裁定已证）；D-S16 CONCLUSION 页首落 2026-10-23 修订行（原文未改写，待审⑤不动）；133 页终检 0 断链 0 浮层断 0 闭合错。留人工：首批五类含域 vs D-S16 R2 口径差（文档已双标） |
| 2026-10-23 | RSI 第 6 轮 ⑤ 过审 | S17-S20 四议题全过（用户「我同意」+S17「这俩可以合并吧」→合并案定稿：记忆四层唯一管道+知识库=资产域+出域改号 D0-D3）；ROADMAP R6-1..4+改动清单落档；GD 约束四条并入；下一步=v15 文档包+memory.html 新页+六页挂载（RK1-RK4） |
| 2026-10-23 | RSI 实施波（S17-S20 过审落地·设计层） | 新 memory.html 记忆中心（四层唯一管道+晋升门+检疫/来源链撤回/负知识/衰减队列）191 行；canvas 提案抽屉（画布本体零改动逐 hunk 为证）+metrics 22 入口+control-plane 四类目开关卡组（白名单禁改区+用户原话入档）；decision-models 回流区（Agent 互纠置灰实证/批次账/双门）+D 改号；knowledge 并入合并案口径、chat「不对→反思」、projects 家族限定词；**三词分立全站 0 裸记号**（记忆 L0-L3/出域 D0-D3/方案 L1-L3 第四义不改正加消歧注）；主档 v15（§6.9 合并重写+§6.30 六节全量+6 表+权限 6+术语 14+Q27）；侧栏小队+记忆中心各 18 页 sweep；134 页终检 0/0/0 |
| 2026-10-23 | multica 文档轮·全收官 | 主档 v16 尾批 28+3+㉙㉜+五句主线全落（+340/−17→4102 行）；**骨架陈年缺陷修复**（s2-7 重复锚→决策模型正名 2.12/#s2-12 并移回第 2 章、§6.23-6.31 归位 s6、真 s7 从权限章起）；四入口矩阵（board #four-entry+md-assign-confirm 两决定/af-109 界分表/chat 消息即运行/squads 合并≠终止/automations 互链）；五句主线（relations #five-lines 宿主卡+runtimes 三词解耦与边界表+inbox 总句+projects 上下文供给器+config 技能快照与晋升同路）；**proto.js 全站缺陷修复**（data-toast×data-close 顺序，201 钮×80 页 toast 曾静默）；135 页终检 0/0/0 |
| 2026-10-23 | D-S21 harness2 糅合 · 已呈审⑤ | Harness²（46 文件 13,367 行+docs 全读，行号可溯）：RECON/BRAINSTORM/CONCLUSION/PANEL 四件落盘，GD 3/3 带两前置（SurfaceSpec 单真源、4k 常数不抄承诺值）；裁定 R7-1..6（两拍评估链/INV⟂DOM 分栏/禁改区声明式化/晋升三字段+confounded 默认+NO_ENTRY/防污染闸/塌缩熔断+NOISE FLOOR）；不该抄 12 条成文；零新页零代码；待用户 ⑤ 后实施 v17 |
| 2026-10-23 | harness2 糅合实施波（D-S21 ⑤后） | R7-1..6+算法细节层全落：canvas（两拍/盲评/恒等式/校验集/塌缩/P-3/P-4）·memory（四防腐/三字段/EXPERIENCE 版式/注入纪律）·control-plane（SurfaceSpec/第四熔断/幂等两行/噪声地板）+主档 **v17**（§6.30 深化·§4 时序七·§3.3 列级 probe_evidence/exec_ledgers·§8×16·Q29）+CONCLUSION 附页算法规约 10 条；页脚不实句已正；135 页终检 0/0/0、主档机检全绿 |
| 2026-10-23 | D-S16 追认过审 | 用户「现在有 team/小队的概念了」=对第 5 轮 team 议题的 ⑤ 收口（对照 09-23 开题原话「没有 team 的概念」）；TOPIC/TOPICS 状态标落。**仍悬两项小裁定**：②Team 首批五类口径二选一（原型现状=域进首批/编排次批，D-S16 R2=编排进首批/域次批）；③users.html 顶栏要不要邀请钮（倾向不放=multica 实际） |
| 2026-10-23 | 悬项②收口 | Team 首批五类口径=专家团 3/3 全票按原型基线（域进首批、编排次批），R13.2 自动执行；D-S16 转历史注、主档双标句收口、ROADMAP 落次批承诺（不得无限顺延）。**仅剩悬项**：无（③已并入 v18 三入口裁定落地中）。同步在途：项目工作流绑定原型包 |
| 2026-10-23 | 项目工作流绑定+邀请三入口（v18 收口） | 原型五页：projects__new 新「4·工作流（可多选·决定列与交接）」块（wf-12/wf-42/Default+展开表+四段口径 callout+8 分区重编号+第 8 区界分双向挂指）；projects 详情抽屉×2 工作流行+切换深链+wf×2 chip；agentflow 详情 #meta 绑定行+#mem 邀请钮；users/workflows 同文 md-invite（1938B 字节比对）与「项目怎么用起来」3 行区；主档 v18 已先行落（§6.13 引用块+五语义/§3.3 workflow_bindings/§7 三入口/§8×2）；135 页终检 0/0/0。**本轮全部悬项清零** |

