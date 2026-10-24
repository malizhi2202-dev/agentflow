# STATE — 跨会话状态

> 本文件记录当前进行中的工作与上次断点。**每次会话结束前更新**。
> 最近更新：2026-10-23（v20 口径回填会话）

## 会话状态（GO.md 第一步四字段 · 2026-10-24 起必填）

- **活跃 Change**：`v20-rsi-adapters`（已收口）· `v20-ui-polish`· `v20-residual` · `v20-ui-rsi` · `v20-ui-teams` · `v20-squad-authz`
- **当前阶段**：7-integration（四 change 收口；真实浏览器 E2E 已留证）
- **当前 Task**：T01–T04 全部 done
- **中断任务**：（空）
- **ai_context_doc**：`CLAUDE.md`（2026-10-24 用户选定；`.specs/CONTEXT.md` 已作废不用）
- **last_intel_scan**：（未跑；按用户选择跳过）

## 当前阶段

**实施阶段：波 0–7 全部落地 + 7-integration 收口完成 + 前端界面开始挂载（2026-10-24）**——PRODUCT-DESIGN v20 §1.6.0 的六个升级波次 + 设计遗留项收口（波 7）按顺序实现并提交；裁定⑦（MySQL 权威档）仍为设计口径（SQLite 为本地体验档），裁定⑧ 开发冻结已解除。

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
| 2026-09-22 | discovery 第 3 轮闭合：S6(7)+S7(12) 过审（原话「都通过」） | ROADMAP 回写 + **PRODUCT-DESIGN.html v3 执行**（定位句/P1-12·13/盯防重写/§6 全局交互纪律/规划原型注记/FAQ） — |
| 2026-09-22 | code-kit 统一改造（D-discovery/P-product 收编为主干前置阶段）+ 本项目产物两轮迁移 + discovery 第 2 轮合规复审 | kit 侧 16 文件；`.specs/platform-evolution/` 5 包 30 文件；HTML 状态标 + 口径更正 3 项 |
| 2026-09-21 | discovery 第 1 轮 5 个子议题落盘 | 旧布局 27 文件 → 同日迁 code-kit 统一命名 → 再按体量红线 R16.8 二次归并：`.specs/platform-evolution/` = `TOPICS.md` + 5 × `D-<子议题>/` 文件包（TOPIC/BRAINSTORM/RECON/CONCLUSION/PANEL/REVIEW）+ `ROADMAP.md`，内容无损 |
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
| 2026-10-23 | D-S14/S15 过审收口 | 用户「d14和d15同意」；《Agent 资源关联字典》成文 DICT-agent-resource-model.md（四型/三裁定/五问/快照稿/S14 对账）；ROADMAP 补挂；第 5 轮三包至此全关账 |
| 2026-10-23 | 第 8 轮收官（R8 实施波） | 二源代码层补扫→GD 8/6/0→用户「同意」→三线实施完成：PRODUCT **v19 · 4190 行**（归因瀑布/扩展同意契约·非现状/换内容保身份/kept 态/内容指纹重算/13 键身份/四层帽表/验收断言八条/VISION 题记+诚实条款/§8×3 术语/Q30）；RECON-MULTICA-DOCS「无」清单①③翻转（triage_state+rule_versions 代码实证）；**queued 可重放**三处翻正（PRODUCT+automations）；原型九页（board×2/automations/control-plane/runtimes/replay__run/tools×2/integration）；终检 135 页 0/0/0、PRODUCT dup-id 0、缺锚 0；ROADMAP 观察登记≈20 条挂账 |
| 2026-10-23 | **v20 口径回填与三维对齐**（用户「都要保持最新的」） | 主档 v20：§6.29 尾「两处待人工收口」→ 已收口含结论（首批五类=域进首批/编排次批 3/3 · 导出导入=整包失败）；§3.3 补挂《Agent 资源关联字典》=四型档位 owned/mounted/shared/quota·gate + 三存储裁定 + 验收五问（此前主档零引用）；`prototype/chat.html`「工作项→任务」漏网修正；账本：TOPICS 第 6 轮四占位补名 + S16「通过·追认」+ 轮次记录补 3/5/6/7/8 轮、ROADMAP 补「第 5 轮新增过审结论」正节、STATE 头部/阶段/进行中/下一步重写 + 12 条错位记录归位表内。；原型扫尾 5 页 7 处（chat「工作项→任务」· teams__agentflow 归档连带 run 口径两处+v16 返修注 · squad_autopilots→automations · 两词一义→两词两义 · board 负责人双轨→三轨 · autopilot: 审计前缀与 {{autopilot}} → automation:）。；§1.5/§1.6 刷新（kagent v1alpha3→v1alpha2 两处 · 保鲜期 09-22→10-23 · P0-10 转已过审 · P0-5 数字复测 36,134/35,517/代码 235 · P0-6 13→12 文件 · §1.6.5 补齐 ⑨-⑬ 丢失的 5 条纪律 · 新增 §1.6.7 八轮净增量 R3-R8）。；§1.6 加「标的声明+现状基线表」（代码基线 4ac819bf·10-12，此后 28 提交零代码；26 表/协作实体 0/4 适配器/32 TS 错误）。；§1.6.0 新增「升级波次」表（波0 止血→波1 身份三连→波2 单副本→波3 协作层→波4 团队小队→波5 差距→波6 RSI，带验收判据）。；**新增 `platform-evolution/RULINGS.md`（现行口径单一事实源）与 `product-design/INDEX.md`（文档归并索引）；23 个 `D-*/TOPIC.md` 加统一口径注；CONTEXT.md/README-CONSISTENCY-REPORT.md 打作废标；两版 README 补文档地图并改裁撤口径；CLAUDE.md 加文档地图 + 数字复测（36,134 / 12 文件）**。**零代码（裁定⑧）**；备份 `/tmp/agentflow-sync-1023/` |
| 2026-10-24 | **文档归整 change `doc-align-v20`（用户 10-24 点名）** | ① 新增 `.specs/platform-evolution/RULINGS.md`（现行口径六列总账 40 条 + 已推翻清单 10 条）② 新增 `.specs/product-design/INDEX.md`（版本谱系 v1→v20 / 章节地图 / 34 个原型入口 / 单一事实源判定顺序 / 每份旧件处置台账）③ 门面改齐：README ×2 加「文档地图」并修裁撤口径、CLAUDE 加文档地图 + 数字复测（36,134 / 12 文件）、CONTEXT 与 README 一致性报告打作废标 ④ 23 个 `D-*/TOPIC.md` 加统一页首口径注；ROADMAP 标题改「第 1–8 轮」、TOPICS 附录加计数过时注 **并修复其表格结构缺陷**（第 3 轮两行多列 + 被空行截断成两表）⑤ **删 8 张无入口旧原型页 135→127**（零引用、零断链；备份 `/tmp/agentflow-orphans/`），127 回填至主档/INDEX/README/CLAUDE。⑥ **删除仓根 `agentflow-product-design-html.zip`**（用户 10-24「需要删除 没事」；691 KB 重复打包件、全库零引用、git 历史可取回）。**零代码（裁定⑧）** |

## 进行中

- 🧹 **文档归整 change `doc-align-v20`（10-24 用户点名 · Multica issue MALI-3）**：现行口径 = 主档 **v20**（2026-10-23）+ `prototype/` **127 页**（v20 删 8 张无入口旧页）。目标：把产品设计类文档统一收敛到 `.specs/product-design/` 一处并按 v20 改齐——① 新增 `.specs/product-design/INDEX.md`（版本谱系 + 产物清单 + 改动规范 + 单一事实源判定顺序）② 每份旧件给明确处置（更新／加页首历史注／归档／不动）③ 门面文档改齐（`README.md` `README.en.md` `CLAUDE.md` `.specs/CONTEXT.md`）④ 新增 `.specs/platform-evolution/RULINGS.md`（现行有效口径六列账，落地本文件「下一步 0b」的挂账）。**零代码（裁定⑧ 持续）· 不重写历史五步包正文**。状态：0-change 进行中。
  - ⚠ **台账归属**：`STATE.md` / `TOPICS.md` / `ROADMAP.md` 由 leader（交付总调度）独占写，子 agent 一律禁写这三个文件（09-23 曾发生 STATE 被回滚成旧快照）。
  - ⚠ **工作树基线**：10-23 遗留的 11 文件未提交改动已固化为 safety commit `5a21e597`（已推 origin/main），**禁止 reset/clean 覆盖**。
- ✅ **波 0 已收口（change `v20-wave0`）**：P0-4 构建（32→0，build 绿）· P0-8 迁移账本（6 单测）· P0-6/P0-7 阶段表单点（后端 10 单测 + 前端 5 单测、57 用例、build 绿）；P0-5 按用户定「只记账不做」。
- ✅ **change `v20-wave1`（波 1 身份三连）已收口（10-24）**：P0-2 口令（argon2id + 废出厂口令 + 渐进升级）/ P0-1 服务端会话（`sessions`+`pat_tokens` 迁移 006、`__Host-session` HttpOnly、cookie>PAT>401、三处 fail-open 清零、节流 5 败/15min→429、must_change 服务端 403、PAT 90 天不可永不过期、cron 改直调 service）/ P0-3 部署闸门（DEPLOY_MODE 三值 + 可信代理 XFF 纪律 + 非法配置启动即失败 + CORS 最外层 + `/api/auth/deploy-info`）。验证：24+14+9 新用例全绿，全仓 241 用例 29F/12E（0 新增红），build 绿、vitest 57/57。提交 `129c33ec`；工件 `.specs/v20-wave1/`。**遗留（已记账）**：登录节流为进程内存（波 2 P1-7 外置）；`users.json`→MySQL 表化（裁定⑦，波 2 一并）。
- ✅ **change `v20-wave4`（波 4 团队与小队）已收口（10-24）**：`teams`/`team_members`（四档角色，owner 只能转让且需 confirm）+ `squads`/`squad_members`（leader 必须未归档 Agent）+ 五类资产 `team_id/owner_kind`（存量零回填）+ 迁 010；非成员 404、成员非 owner/admin 403；指派小队 = 给 leader 入队 leader 任务（去重）；Team⟂Squad 无外键。验证：test_teams 19 绿。提交 `ac839aa0`。
- ✅ **change `v20-wave5`（波 5 差距能力）已收口（10-24）**：**P2-4** trace_spans 产生端（根/子 span + 合成 trace_id）+ `/metrics`（Prometheus 文本、直读现表、env 门 + 身份）· **P2-5** ETag/If-Match→412 + apiVersion/kind + generation/conditions + change_log 单账本同事务 + `/api/watch` SSE（游标过期 resync） · **P2-3** 执行隔离契约（tier 阶梯、ttl/retain、egress 默认拒、fail-closed，未实现档位选即拒绝）。迁移 011/012；测试 24 条。提交 `943b7e5e`。
- ✅ **change `v20-wave6`（波 6 RSI 治理）已收口（10-24）**：记忆四层 + 晋升三字段缺一即 `no_entry` + confounded 默认 + 检疫/衰减 · 提案三权分离（生成限额 → 探针不作发布依据 → 影子重放冻结金标+异厂 judge → 人批发布，领域类需会签）· 可改面声明对象（scripts/plugins/hooks 永久禁改、代码层 RSI 禁止、路径穿越拒绝）· 四熔断 + NOISE FLOOR。迁移 013；test_rsi 18 绿。提交 `64e44de6`。
- ✅ **v21 T-02（Agent 真实运行时执行）已完成（10-24）**：`runtime/adapters` 此前只解析日志；新 `services/runtime_exec.py` 提供执行通道（hermes/dsh/codex，`shlex` 不经 shell、`{prompt}` 单参数、超时/非零退出/缺命令一律 `RuntimeExecError`**不降级**）；`chat_service._generate` 成为唯一模型入口（启用→运行时，否则 provider，报错上抛）；`SUPPORTED_RUNTIMES` 增 hermes/dsh；`RUNTIME_EXEC_ENABLED` 默认 false（fail-closed）。验证：12 条用例绿；真 CLI 冒烟 hermes 7.4s / dsh 3.7s 均回 `1`。
- ✅ **v21 T-01（T-05 人设三件落库）已完成（10-24）**：`agents` 补 `system_prompt/role_def/sop`（迁移 017）· 创建/更新/读取全接上 · `chat_service._system_prompt_for` 抽成可测函数；验证：`test_agent_prompt_persist` 4 绿、SQLite 全新库 + **MySQL 真库**各跑一次迁移 017、全量 465 用例 29F/12E（与基线同红）。程序范围与「明确不做（废弃/冻结）」清单见 `.specs/v21-completion/CHANGE.md`。
- ✅ **change `v20-e2e-mysql`（MySQL + 真实运行时界面 E2E）已收口（10-24）**：私有 MySQL 8.0（3307）→ `init_db()` **16 迁移 / 50 表 / 二次幂等**；后端 MySQL + `RSI_*_PROVIDER=cli`（dsh）启动；dsh CLI 真跑 L0 抽取（2 条入库）；Playwright **13/13** 界面 E2E（登录/任务建单+推进/收件箱/团队建团+成员+暂停/记忆列表(含 CLI 抽取)+写入+评审/治理开关+手动熔断/**熔断期建房 409**/复位/提案 探针→影子→人批发布/**UI 内 judge=llm 真调 dsh** `pass_rate 0.5 · llm_judge`）；修 `judge_kind` 归一 + 用例；脚本入仓 `scripts/e2e/`。MySQL 复核：tasks 18 · teams 8 · memories 9 · proposals 5 · trace_spans 6。
- ✅ **RSI 本地 CLI 通道打通（10-24，用户「用本地 hermes 和 dsh 的 CLI」）**：`services/cli_provider.py` + `get_provider("cli")`；`RSI_CLI_PROVIDER=dsh|hermes`（免 key，prompt 不进 shell，超时/非零退出响亮）。真实试跑：**dsh** L0 2 条入库 + judge 2 例 1/0 → `pass_rate 0.5`（4.8s/7.8s）；**hermes** L0 1 条 + 同样 0.5（7.3s/14.0s）；两条通道的提案都进 `awaiting_approval`（仍待人批）。证据 `.specs/v20-rsi-adapters/LOCAL-TRIAL.md` 追加节；单测 9 条（argv/白名单/最后一行/超时/免 key）。
- ✅ **change `v20-rsi-adapters` 本地试运行通过（10-24）**：用本机 **Ollama qwen2.5:3b**（`hermes proxy` 上游未登录）真实跑通——L0 抽取 1 条 `confounded` 入库；judge 2 例判 1/0 → `pass_rate=0.5` → 提案 `awaiting_approval`（未发布，仍待人批）。试运行中修两处：judge prompt 加 few-shot（3B 原来全判 0）、抽取器输出形状容错（数组三元组）+ 记 L-006。证据 `.specs/v20-rsi-adapters/LOCAL-TRIAL.md`。**ollama 免 key**；未配置仍 fail-closed。
- ✅ **change `v20-rsi-adapters`（真实 judge + L0 定时作业）已收口（10-24）**：`judge_adapter`（四件配置才启用、预算帽硬停、provider 可注入）· `/shadow/run` 支持 `judge=exact_match|llm`（未知/未配置 400，响应 `judge_kind` 如实）· `l0_job` + `_l0_extract_loop`（`L0_EXTRACT_INTERVAL_SECONDS=0` 默认关闭；单例租约；每轮会话上限）· `_map` 把 Runner/Judge/Extractor 错从 500 改成 400。验证：19 条新用例绿；全量 **445 用例 29F/12E/6S**，失败清单与基线 diff 为空。**真实厂商仍未定** → 保持未配置（fail-closed）。
- ✅ **S24 原型三处挂载缺口已实施（10-24，用户「同意你开始吧」）**：`audit.html` 团队筛选弹层（`audit.team_id` 聚合 + 锚点 `#team-agentflow`）· `control-plane.html` 域树三行显示 `team_id=1/NULL` 与归属说明 · `chat.html` 顶部「投递纪律」句 + 「同刻合并 2 条」徽章（`coalesced_comment_ids`）。校验：三页 id 无重复、新增锚点存在、弹层走 proto.js 通用 `data-pop`。
- ✅ **change `v20-ui-polish`（遗留小项）已收口（10-24）**：熔断**手动 trip**（必填原因）· 记忆中心 Tabs **←/→ + roving tabindex** · 管理员**新建可改面**表单（含禁改前缀说明）· `scripts/backfill_squad_creator.py`（默认 dry-run，`--apply` 必须 `--owner`，幂等）。验证：vitest 89/89（86+3）· tsc 0 · build 27.18s · 后端 436 用例 29F/12E（失败清单与基线 diff 为空）。
- ✅ **change `v20-residual`（后端遗留三项）已收口（10-24）**：**① 域策略**（迁移 016 `domain_attribution_policies` + `resolve_accountable`：无策略=originator / member / team_owner，不可解析即 fail-closed；API GET/PUT 管理员或域 owner）· **② 影子重放 runner**（`score_cases` 确定性精确比对 + `run_shadow` 调既有 `record_shadow`，门禁不复制；响应自证 `judge_kind=exact_match`/`dry_run`）· **③ L0 抽取器**（`l0_extractor.extract` 可注入，默认 dry_run 不写库；注入且三字段齐 → `propose_memory`，机器抽取默认 confounded；端点强制 dry_run）。验证：新 29 条用例全绿（11+10+8）；全量 **434 用例 29F/12E/6S**，失败清单与基线 diff 为空。
- ✅ **change `v20-ui-rsi`（记忆中心 + 提案抽屉）已收口（10-24）**：完整链（0→1→2→2a→3→4→5→6）。侧栏新增「记忆中心」双 tab：**记忆**（四层列表+layer/status 筛选、写入表单三字段+confounded+因果前缀、晋升评审账按需拉、按 source_ref 检疫、衰减队列只列不删、治理折叠区四开关+四熔断+噪声地板）· **提案**（列表+预算/已用、按状态裁剪动作：generated→探针、probed→影子（金标/异厂/NOISE FLOOR 文案透传）、awaiting→会签+人批发布（非管理员置灰+二次确认））。**实现中修 2 个自造 bug**：`surfaces` 只在提案卡拉取导致空列表时新建表单永远不可提交、写入表单末尾 `setResult(旧值)` 覆盖 `no_entry` 结论。验证：`tsc 0` · `vitest 86/86`（74+12）· `build ✓ 16.07s`。工件 `.specs/v20-ui-rsi/`（含 4 份 SUMMARY 与六道门票）。
- ✅ **change `v20-squad-authz`（小队写操作授权）已收口（10-24）**：完整链（0→1→2→3→4→5→6，非 UI 跳 2a）。服务层新增 `assert_can_manage_squad`（creator 或平台管理员）+ `SquadForbidden`（不继承 TeamError，避免被 400 吃掉）；4 个写端点（加人/移人/归档/指派）接门；**实现中发现更深一层缺口**：`create_squad` 从未写 `created_by` → 已补参数并落库（否则 creator 路径不可能成立）。读保持公开（组织信息），拒绝用 403 带明确文案。验证：test_squad_authz 11 绿（服务层 6 + 路由 5，路由用普通成员建队验证 creator 路径）；全量 405 用例 29F/12E/6S，**失败清单与基线 diff 为空**。
- ✅ **change `v20-ui-teams`（团队与小隊页 · 首个走完整 code-kit 流程的 change）已收口（10-24）**：**按 GO.md 从 0 走完整链**（0-change → 1-requirement → 2-design → 2a-ui-design → 3-task → 4-dev → 5-test → 6-review），四道门 G1/需求门/G2/G2a/Task 门 + G3/G4 全部留票（自评轮，非独立 agent）。产物：CHANGE / REQUIREMENT（AC-1…AC-11）/ DESIGN（含 0.5 架构对齐 + D1–D7 决策）/ UI-DESIGN（token 只用既有、无障碍检查表）/ TASK（4 task + `<auto>` 投票）/ T01–T04-SUMMARY / TEST（功能·安全·兼容·性能·可观测）/ REVIEW（三轮 + G4）/ UAT。能力：团队列表+抽屉（建团/状态/成员四档/转让 owner/五类资产挂载释放/配额）、小隊列表+建队+混编成员+归档（只停未来指派）。**实现中修掉 2 个自造 bug**：资产释放统一传 `kind='agents'`（工作流被按 Agent 释放）、`archive_squad` 多传后端不接收的 body。验证：`tsc 0` · `vitest 74/74`（既有 63 + 11）· `build ✓ 18.30s`。遗留：真实后端联调/浏览器视觉未做、Tabs 方向键未实现；**squads 无权限校验已在 `v20-squad-authz` 修掉**。
- ✅ **change `v20-ui-collab`（任务 + 收件箱界面挂载）已收口（10-24）**：侧栏新增「任务」「收件箱」两入口；任务页四列看板（未开始/进行中/待验收/已完成）+ 新建任务 + 状态推进按钮（合法性由后端状态机判定，400 文案原样透传）+ 三轨指派 + triage 徽章 + done 缺证据警告；收件箱页两组（需我处理 / 其余）+ 单条标读/归档 + 全部标读/归档已读。**顺带修根因 bug**：`requestDedup` 缓存键只含 URL → `POST /api/tasks` 命中 `GET` 缓存、写请求根本没发出（缓存键改 `${method} ${url}`，只 GET 入缓存）→ 记 L-005。验证：`tsc --noEmit` 0 错、`vitest 63/63`（57 既有 + 6 新增）、`npm run build ✓ 15.80s`。未做：浏览器人工视觉验收、真实后端联调、任务评论正文（后端未落表）。
- ✅ **change `v20-release`（7-integration 集成收口）已收口（10-24）**：S-align 首次对齐（`.specs/ALIGNMENT.md`，基线 `4ac819bf..13faefbe` 45 提交，6 项漂移：4 自动合并 + 4 裁决）+ 8 个 change 补 `SUMMARY.md` + **程序级 UAT 8 条全绿**（health/登录改密/ETag-412/metrics 门/任务双列/RSI 开关/A2A 卡/watch SSE，用户「全部通过（已看证据）」）+ `LESSONS.md` L-001…L-004 + `CHANGELOG.md` + README 端点/能力同步（A1/A2）。**UAT 抓到 2 个已上线 bug 并修复**：`scanner._phase_order` 裸 `STAGES` → `/api/health` 500（T-FIX-01，3 条回归用例）· `metrics_api._owner_filter` 死代码引用未导入 `SessionMetric`（T-FIX-02，删除）。修复后全量 `Ran 394 tests … 29F/12E/6S`，失败清单与基线 diff 为空。裁决：V1 裁⑦ 维持「部分实施」挂账 · V2 原型三缺口转 `TOPICS.md` S24 · V3 `git rm --cached frontend/{node_modules,dist}`（P0-5 清卫生）· V4 不归档目录。
- ✅ **change `v20-wave7`（波 7 设计遗留项收口）已收口（10-24）**：**P1-15/R4-2** A2A **M0 静态 AgentCard**（`GET /api/a2a/agents/{id}/card`；白名单字段、capabilities 三项 false=M2 冻结、越权=404）· **R7-4** `memories` 补 `source_seq/cites_seq` 因果前缀（引用未来即拒）+ `promotion_reviews` 晋升评审账（`no_entry` 也记）· **R7-5** 防污染双扫（晋升前命中金标/评测标记 → 强制 confounded + `pollution_flagged`，入库后 `post_ingest_scan`）· **R6-4** `rsi_switches` 四类类目开关（关闭=「自动体已暂停」，三处状态转换层独立判定 + 审计；四类之外没有开关）· **R8-2** 归因双列 `originator⟂accountable`（任务/运行各两列 + 归属瀑布沿任务链找链顶人类，读不出即 fail-closed；代记账需管理员）。迁移 014/015；新增 37 用例全绿（a2a 6 / rsi 治理 16 / 归因 15），全仓 391 用例 **29F/12E/6S 与基线逐条同名（0 新增红）**；顺带修掉 `test_auth_sessions` 对「环境里恰好有已迁移库」的隐式依赖（该用例 DB 也覆盖到内存库）。工件 `.specs/v20-wave7/`。
- ✅ **change `v20-wave3`（波 3 协作层最小集）已收口（10-24）**：**P1-16** 告警落 `alerts` 表（去重查库、确认记人、不再环形裁剪）+ 双队列并表（`scheduling_queue` 六状态映射搬入 `scheduler_queue`，`kind='orchestration_instance'`，旧表删除）；**P1-4** `work_items`（status 四类+blocked × triage 正交 / assignee 三轨 / done 证据建议层）+ `work_item_runs` + 订阅（只增不减、@ 穿透）+ 收件箱三规则（action_required 分组 / 读失败上抛 / 交还给人自愈归档，blocked 例外，合并键=任务）。API：`/api/tasks` 8 个端点 + `/api/inbox` 6 个端点，越权统一 404。验证：test_alerts_and_queue 6 绿 + test_collab 23 绿，全仓 293 用例 29F/12E（0 新增红）。提交 `57945f50` + `67420190`。**未做**：任务评论正文落表、看板/收件箱前端页面（按「先表与校验，再上界面」）。
- ✅ **change `v20-wave2`（波 2 单副本事实固化）已收口（10-24）**：P1-7 队列/限流/退避/监控偏移四类状态落库（迁移 007）· 任务租约+心跳（claim/heartbeat/requeue_expired）· 单例循环（cron/watcher/reconcile）数据库租约选主 · 删死代码 `engine/scheduler.py` 与进程内队列 · P0-9 事实写进 README + `/api/control-plane/cluster` + 管控页集群条。验证：test_cluster_store 23 绿、全仓 264 用例 29F/12E（0 新增红）、build 绿、vitest 57/57。**下一步 波 4（团队与小队）。**
- 🧾 **change `v20-wave0`（历史段 · 波 0 首项）**：用户 10-24「按照最新的设计文档实现代码」→ 裁定⑧ 解除（`backend/` `frontend/` 恢复可改）。**已交付 P0-4**：32 个 TS 错误清零，`npm run build` 首次通过（18.46s）、`vitest` 52/52 绿。**已完成 P0-4 + P0-8 + P0-6/7**（P0-6/7：`backend/stage_config.py` 单一事实源 + 两份 scanner 合一 + admin PUT 校验/热更新 + 前端 `stores/stageConfig.ts` 接 6 个消费者；后端 10 用例 / 前端 57 用例 / build 全绿）（P0-8：`backend/migrations.py` 版本化迁移账本 + 6 个单测全绿，替换 init_db 里 5 段内联静默迁移）。**遗留**：T-05 `system_prompt/role_def/sop` 后端不落库（数据丢失，登记待修）；P0-5 仓库卫生（用户 10-24 定「暂不做只记账」）、P0-6/7 阶段表单点仍待做。工件：`.specs/v20-wave0/{CHANGE,TASK,TEST,REVIEW}.md`
- ✅ **裁定⑧ 开发冻结已解除（10-24 用户令「把开发冻结那个去掉」）**：`backend/` `frontend/` 可改；实施按主档 §1.6.0 波次推进（波 0–7 已收口）。原文口径已从本文件与 `RULINGS.md` 现行表移除（历史保留在 `RULINGS.md` 该行的 ⛔ 标记里）。
- ✅ **八轮 discovery 全部闭合**：第 1 轮 S1-S5 · 第 3 轮 S6/S7 · 第 4 轮 S8-S13 · 第 5 轮 S14/S15/S16（10-23 追认 + 首批五类收口）· 第 6 轮 S17-S20 · 第 7 轮 S21 · 第 8 轮 S22/S23。议题状态账本：`.specs/platform-evolution/TOPICS.md`；结论账本：同目录 `ROADMAP.md`（第 3/4/5/6/7/8 轮正节已齐）。
- 🧾 **口径治理（本轮动因）**：主档与 `.specs` 的「已被推翻 / 已收口 / 已落后」残留已回填为 v20（详见上表 2026-10-23 行）。**遗留风险**：现行有效口径仍无单一事实源——需读「包页首注 + 尾注 + ROADMAP + TOPICS + STATE」五处拼合。建议建 `.specs/platform-evolution/RULINGS.md`（见下一步 0b）。
- 🩹 **原型三处挂载缺口（如实挂账，非已具备能力）**：① `audit.html` 无 team 筛选器与锚点；② `control-plane.html` 未显示 `domains.team_id` 归属（与 teams__agentflow 的「域入五组」须同批补）；③ `chat.html` 缺「同刻双投递幂等」与 `coalesced` 的可见呈现。

**当前无未完成的写入任务。**

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

> 〔2026-10-23 追加裁定 · 不在上表〕①**裁定⑧ 开发冻结持续**（只改文档与原型）②**Squad 升为可指派一等实体**（推翻 S16 R1「编排实例 `pattern` 预设字段」形态；Team ⟂ Squad 两个词两个实体不变）③**首批五类收口**：域进首批、编排实例与模板次批 ④**Team 与小队不合并**（用户当面确认「不需要」——保持两件东西；`ROADMAP.md:116` W-2 把两者并在一行是 09 月老登记，不影响设计）。细则见「最近完成」对应行与 ROADMAP 第 5 轮节。

## 下一步建议（按 discovery 的硬约束顺序）

0. 🧾 **本轮 v20 呈审**（用户原话「product-design.html 和 mock 的 html 以及原型啥的都要保持最新的」）：主档 v20 = 口径回填——§6.29 尾「两处待人工收口」→ **已收口并回填结论**（首批五类=域进首批/编排次批 · 导出导入=整包失败）· §3.3 **补挂《Agent 资源关联字典》四型档位**（此前零引用、规则源悬空）· `prototype/chat.html` 遗留「工作项」→「任务」；账本同步 TOPICS（第 6 轮 4 个 `{slug}` 占位补齐 + S16 状态「通过·追认」+ 轮次记录补 3/5/6/7/8）· ROADMAP 补第 5 轮正节 · STATE 头部与错位表格归位。
0b. 📌 **建议建 `.specs/platform-evolution/RULINGS.md`（现行有效口径单一事实源）**：每条六列 = 裁定编号 / 现行结论 / 推翻了谁 / 生效版本 / 写入点 / 状态。治「9-23 被推翻或已落后的结论仍留在正文、读者拼不出真相」——现状须读五处（包页首注 + 尾注 + ROADMAP + TOPICS + STATE）才能判定哪句还活。
0c. 🩹 **原型三处挂载缺口待补**（同「进行中」）：`audit.html` team 筛选与锚点 · `control-plane.html` 显示 `domains.team_id` · `chat.html`「同刻双投递幂等 + coalesced」可见呈现。
0d. 🧪 **交互原型 127 页形态基线已完成**（v20 删 8 张无入口旧页 135→127；孤儿 0 / 断链 0）（跨页深链 + 三级分层 + `frontend/public/prototype` 软链直服 `/prototype/index.html`）；后续只做增量挂载，不新开页面。
0e. 🧩 **change `small-model-decisions`**：P-product v7 已过审（用户「通过」2026-09-22）、**2-design 未动**——等指令。
0f. ⚠ **两条硬纪律（沿用）**：① 已被推翻的正文**不删**，一律「原文保留 + 行内 ⛔ 标记 + 指向上位裁定」（写法见 `D-S16/CONCLUSION.md` 页首）；② **并行 agent 一律禁写共享台账文件**（09-23 曾发生 STATE 被 agent 回滚成旧快照，丢 0b/0c 段）。

1. ~~修复 32 个 TS 错误~~（波 0 已完成，`npm run build` 绿）
2. **`git rm --cached node_modules`**（P0-5：用户 10-24 定「只记账不做」，未做）
3. ~~消除 fail-open 身份回退~~（波 1 已完成：cookie > PAT > 401）
4. ~~写明单副本边界~~（波 2 已完成：README + `/api/control-plane/cluster` + 管控页集群条）
5. ~~波 4（团队与小队）~~（`ac839aa0` 已收口）：`teams` / `team_members`（四档角色）+ 五类资产 `team_id/owner_kind`（域进首批、编排次批）+ `squad`（1 leader + 混编，可指派）；口径：非成员一律 404、归档只停未来指派、Team⟂Squad 无外键
6. ~~波 5（差距能力）~~（`943b7e5e` 已收口；OTLP/语义版本化与真实容器执行面按设计延后）：P2-3 执行隔离 tier 阶梯（契约先行、fail-closed）· P2-4 可观测（先修产生端：trace_spans/metrics_raw 零写入）· P2-5 声明式 API 四件组（ETag→412 / conditions / change_log 同事务 / `/api/watch` SSE）
7. ~~波 6（RSI）~~（`64e44de6` 治理契约与门禁已落地；影子重放执行器/金标本体/前端页面未做）：记忆四层唯一管道 L0→L1→L2→L3 · 编排提案制三权分离 · 四熔断 + NOISE FLOOR · 晋升三字段缺一不入库 · 代码层禁自改

8. ~~波 7（设计遗留项收口）~~（已收口）：A2A M0 静态卡（M2 冻结）· 因果前缀 `source_seq` + 晋升评审账 + 防污染双扫 · `rsi_switches` 四类开关 · 归因双列 originator⟂accountable + 瀑布 fail-closed
9. **下一步（按设计剩余面，不假装已具备）**：① 前端界面挂载（**任务+收件箱 / 团队与小隊 / 记忆中心+提案抽屉** 均已挂；真实后端+浏览器 E2E 见 `.specs/v20-release/E2E.md`）② ~~RSI 执行器~~（`v20-residual` 确定性 runner + `v20-rsi-adapters` 真实 judge 适配器；**启用**：本地 CLI 可零配置用 `RSI_JUDGE_PROVIDER=cli RSI_CLI_PROVIDER=dsh`；远端厂商需 `API_KEY`/`MAX_CALLS`）③ ~~域策略表~~（`v20-residual` 已做，迁移 016）④ ~~L0 抽取器~~（`v20-residual` 已做，默认 dry_run；定时作业未做）⑤ ~~P0-5 仓库卫生~~（`v20-release` 已做：`git rm --cached` node_modules/dist + `.gitignore` 补 `dist`）⑥ ~~`TOPICS.md` S24 原型三缺口~~（10-24 用户「同意你开始吧」→ **已实施**：audit 团队筛选弹层 / control-plane `team_id` 归属 / chat 同刻合并徽章）

完整路线图见 `.specs/platform-evolution/ROADMAP.md`（议题状态账本：同目录 `TOPICS.md`）。

## 环境事实

- 后端：`backend/`，FastAPI + SQLAlchemy 2.0 + SQLite（默认）/ MySQL（可选）
- 前端：`frontend/`，React 18 + TS 5.5 + Vite 5.4 + Zustand
- 虚拟环境：`/home/malizhi/.venv`（Python 3.14.4）
- 启动：后端 `uvicorn main:app --port 8000`；前端 `npm run dev`（5173，代理 `/api` → 8000）
- 后端依赖环境：`/tmp/afvenv2`（venv + requirements，含 argon2-cffi）；测试命令 `cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests`
- 多副本：`INSTANCE_ID` + 共享 `DATABASE_URL`；单例循环租约 90s（见 README「副本与单例循环」）
- 默认管理员：`admin` / `123456`（**硬编码，属待修项**）
- 已知缺陷：`node_modules` 被 git 跟踪（P0-5 按用户决定只记账）；全仓后端回归 354 用例 29F/12E/6S 为**基线既有债**（mock 断言/文案漂移），改动时以「0 新增红」为判据

## 已知约束

- `.specs/` 是**产品一等数据**（知识产物），**不得删除**
- 读写 `.specs/` 路径一律经 `config.get_specs_dir()`，不要硬编码目录
- 9 阶段模型已收口为单一事实源（波 0：`backend/stage_config.py` + `/api/admin/workflow` + `stores/stageConfig.ts`）














