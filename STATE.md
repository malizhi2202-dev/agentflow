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
