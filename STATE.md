# STATE — 跨会话状态

> 本文件记录当前进行中的工作与上次断点。**每次会话结束前更新**。
> 最近更新：2026-10-23（v20 口径回填会话）

## 当前阶段

**设计层迭代（discovery 第 1-8 轮全部闭合）+ 开发冻结中**——裁定⑦（可计量数据 MySQL 权威档）与裁定⑧（只改文档与用户原型，零代码）持续有效；主档 `PRODUCT-DESIGN.html` 已至 **v20**。

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
- ✅ **change `v20-wave2`（波 2 单副本事实固化）已收口（10-24）**：P1-7 队列/限流/退避/监控偏移四类状态落库（迁移 007）· 任务租约+心跳（claim/heartbeat/requeue_expired）· 单例循环（cron/watcher/reconcile）数据库租约选主 · 删死代码 `engine/scheduler.py` 与进程内队列 · P0-9 事实写进 README + `/api/control-plane/cluster` + 管控页集群条。验证：test_cluster_store 23 绿、全仓 264 用例 29F/12E（0 新增红）、build 绿、vitest 57/57。**下一步 波 3（协作层最小集 P1-4 + P1-16）。**
- 🧾 **change `v20-wave0`（历史段 · 波 0 首项）**：用户 10-24「按照最新的设计文档实现代码」→ 裁定⑧ 解除（`backend/` `frontend/` 恢复可改）。**已交付 P0-4**：32 个 TS 错误清零，`npm run build` 首次通过（18.46s）、`vitest` 52/52 绿。**已完成 P0-4 + P0-8 + P0-6/7**（P0-6/7：`backend/stage_config.py` 单一事实源 + 两份 scanner 合一 + admin PUT 校验/热更新 + 前端 `stores/stageConfig.ts` 接 6 个消费者；后端 10 用例 / 前端 57 用例 / build 全绿）（P0-8：`backend/migrations.py` 版本化迁移账本 + 6 个单测全绿，替换 init_db 里 5 段内联静默迁移）。**遗留**：T-05 `system_prompt/role_def/sop` 后端不落库（数据丢失，登记待修）；P0-5 仓库卫生（用户 10-24 定「暂不做只记账」）、P0-6/7 阶段表单点仍待做。工件：`.specs/v20-wave0/{CHANGE,TASK,TEST,REVIEW}.md`
- 🔒 **裁定⑧ 开发冻结中**（**已于 2026-10-24 由用户「实现代码吧」解除**，保留原文作历史）：`backend/` `frontend/` 零代码改动；一切动作限于 `.specs/` 文档、`PRODUCT-DESIGN.html` 与 `prototype/`。
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














