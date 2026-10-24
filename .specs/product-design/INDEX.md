# INDEX — 产品档 · 原型 · 证据档 统一索引与审核台账

> **这是什么**：`.specs/` 里所有「产品设计」相关文档与 127 页原型的**一张总表**，回答「要改设计，先看哪一份」「这句话现在归谁管」。
> **最新版**：`PRODUCT-DESIGN.html` **v20**（2026-10-23）· 原型 **127 页**（形态基线；v20 删 8 张无入口旧页）· 现行口径唯一事实源：`.specs/platform-evolution/RULINGS.md`
> **代码基线**：`4ac819bf`（2026-10-12）——**设计领先代码**，本目录全部为设计态；判断「代码有没有」看 `STATE.md`，不看本目录。
> **纪律**：本目录文档只增不改历史（历史保留纪律见 RULINGS §五）。**改设计 → 先改 RULINGS 一行 → 再改 PRODUCT-DESIGN → 最后同步原型**。

---

## 〇、版本谱系（主档 v1 → v20）

| 版本 | 日期 | 一句话 | 关键内容 |
|---|---|---|---|
| v1–v2 | 2026-09-21/22 | 初版重写 | 67 仓库调研结论、定位重估、能力地图 |
| v3 | 2026-09-22 | 第 3 轮落地 | 12 条交互纪律、阶段模型成型解、P1-12/13 |
| v4–v6 | 2026-09-22 | 过审修订 | 参谋零执行、E 层环境参谋（§6.25） |
| v7 | 2026-09-22 | 过审 | 决策模型分层、对话中心口径 |
| v8 | 2026-09-23 | 第 4 轮 | 五差距 + 身份三连 → P0-1/2/3、P1-14/15/16 |
| **v9** | 09-23 | **裁⑦** | 可计量数据 MySQL 权威档全文同步 |
| v10 | 09-23 | 收口 | P0-10 扫描三件 + Q24；**同版冻结快照 `PRODUCT-DESIGN.v10-frozen.html`** |
| v11 | 10-15 | 运行时口径 | 运行时=外部 CLI（§6.28）、Agent 详情四标签、知识库两级 |
| v12 | 10-15 | 任务化收敛 | 产物编辑下线、工作项→**任务**、看板/收件箱/回放统一 |
| v13 | 10-15 | 能力与集成 | 创建↔详情同构、IM 六通道状态机、能力行级 CRUD |
| **v14** | 10-23 | **团队与小队** | §2.11 两层一词一义、§6.29 小队中心、8 张设计表、Q26 |
| v15 | 10-23 | RSI | 记忆四层唯一管道（§6.9/§2.8 合并）、出域改号 D0–D3、§6.30 |
| v16 | 10-23 | multica 文档层 | 四条纠偏、§6.31 自动化中心、§7 四把钥匙、quoted 边界表 |
| v17 | 10-23 | Harness² | 两拍评估链、INV⟂DOM、surface_manifest、四熔断（§6.30 深化） |
| v18 | 10-23 | 项目工作流绑定 | §6.13 五语义、workflow_bindings、邀请三入口 |
| v19 | 10-23 | 第 8 轮 | 代码层实证翻转、归因瀑布、扩展同意契约、kept 态、13 键身份 |
| **v20** | 10-23 | **口径回填（本版）** | §6.29 待收口→已收口 · §3.3 挂资源字典 · §1.5/§1.6 刷新 · 新增 §1.6.0 波次 + §1.6.7 八轮净增量 + 标的声明/现状基线 · §1.6.5 补 ⑨–⑬ |

> **v10 之后是否还有「定版」**：没有。v11–v20 为**逐轮增量**，最新即 v20；历史版本不保留快照（仅 v10 有冻结件），差异以版本链（主档页脚）为准。

## 一、当前有效（改设计只看这三类）

| 文档 | 角色 | 状态 | 何时更新 |
|---|---|---|---|
| `PRODUCT-DESIGN.html` | **产品主档**（唯一权威设计文本 · v20 · 4,247 行） | **现行** | 每次裁定/收口 |
| `prototype/`（127 页 + `assets/`） | **界面形态基线**（可点可交互，非实现） | **现行** | 与主档同批 |
| `.specs/platform-evolution/RULINGS.md` | **现行口径总表**（裁定/术语/已推翻清单） | **现行** | 每新增一条裁定 |
| `.specs/platform-evolution/ROADMAP.md` | 过审结论台账（第 1 轮 + 第 3–8 轮节） | **现行** | 每轮 ⑤ 通过后 |
| `.specs/platform-evolution/TOPICS.md` | 议题状态账本（谁在哪轮、什么状态） | **现行** | 开轮 / 晋级 |
| `.specs/platform-evolution/DICT-agent-resource-model.md` | 资源关联规则源（四型 / 三裁定 / 五问） | **现行** | §3.3 施工前 |
| `README.md` / `README.en.md` | 仓门面（启动 + 文档地图） | **现行** | 定位/入口变更 |
| `CLAUDE.md` / `STATE.md` | 会话指令 / 跨会话状态 | **现行** | 每次会话 |

## 二、产品主档章节地图（v20）

| 章 | 内容 | 与哪些轮次相关 |
|---|---|---|
| §0 | 文档怎么读 | — |
| §1 | 产品全景：定位 / 用户 / 能力地图 / 不做什么 / **1.5 竞品坐标** / **1.6 改进路线图**（含 1.6.0 升级波次 · 1.6.5 十三条纪律 · 1.6.7 八轮净增量） | R3–R8 |
| §2 | 核心概念：隔离域 / 编排 / 团队与小队（2.11）/ 决策模型（2.12）/ 记忆（2.8） | R4–R7 |
| §3 | 系统架构：3.3 数据模型（含 20+ 张设计新表） | 全部 |
| §4 | 核心时序（七条） | R7 |
| §5 | 使用指南（模块级操作手册） | 全部 |
| §6 | 界面原型：6.0 交互纪律 → 6.31 自动化中心 | 全部 |
| §7 | 角色权限矩阵（四把钥匙 / 归因瀑布） | R4–R8 |
| §8 | 术语表（v14/v15/v16/v17/v18/v19/v20 分组） | 全部 |
| §9 | 常见问题 Q1–Q30 | 全部 |

## 三、原型入口（34 个一级页；`__` 后缀为详情页，共 127 页）

打开 `prototype/index.html` 即可全量导航。一级页与主档章节的对应：

| 主档节 | 原型页 | 主档节 | 原型页 |
|---|---|---|---|
| 6.0 交互纪律 | `discipline.html` | 6.16 用户与权限 | `users.html` |
| 6.1 登录 | `login.html` | 6.17 审批中心 | `approvals.html` |
| 6.2 工作台 | `workbench.html` | 6.19 阶段模型 | `stage-model.html` |
| 6.3 管控面 | `control-plane.html` | 6.20 任务看板 | `board.html` |
| 6.3b Agent 列表 | `agents.html` | 6.21 收件箱 | `inbox.html` |
| 6.3c 运行时发现 | `runtimes.html` | 6.22 执行回放 | `replay.html` |
| 6.4 Agent 详情 | `agent-detail.html` | 6.23 决策模型 | `decision-models.html` |
| 6.5 编排画布 | `canvas.html` | 6.24 微调工厂 | `finetune.html` |
| 6.6 工作流 | `workflows.html` | 6.25 环境参谋 | `env-advisor.html` |
| 6.7 工具市场 | `tools.html` | 6.26 执行隔离 | `isolation.html` |
| 6.8 对话中心 | `chat.html` | 6.27 对外集成 | `integration.html` |
| 6.9 知识库 | `knowledge.html` | 6.29 **小队中心**（Team⟂Squad） | `teams.html` |
| 6.10 运行时监控 | `runtime.html` | 6.30 记忆中心 | `memory.html` |
| 6.11 告警中心 | `alerts.html` | 6.31 自动化中心 | `automations.html` |
| 6.12 监控仪表盘 | `metrics.html` | 实体关系全景 | `relations.html` |
| 6.13 项目管理 | `projects.html` | 6.13b 项目文件（只读） | `projects__files.html` |
| 6.14 角色市场 | `roles.html` | 6.15 审计日志 | `audit.html` |

**已知挂载缺口（如实挂账，不是已具备能力）**：`audit.html` 无 team 筛选与锚点 · `control-plane.html` 未显示 `domains.team_id` · `chat.html` 缺「同刻双投递幂等 + coalesced」呈现；**8 张无入口的旧一代页面已按 10-24 令删除**（`approvals__ap-17/18/19/22/23` + `metrics__role-frontend/role-review/tpl-pipeline-v3`）→ **135 → 127 页，可达 127/127、断链 0**；备份 `/tmp/agentflow-orphans/`。

## 四、证据档与历史包（只读参考，不改正文）

| 目录 / 文件 | 内容 | 性质 |
|---|---|---|
| `RECON-MULTICA-DOCS.md` | multica 45 篇英文文档逐条锁行号 + 勘误与纠偏 | **证据档**（现行，随 R8 附录翻转） |
| `.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md` | 67 个开源仓库一手调研（09-21） | 证据档（**注意 kagent CRD 勘误为 `v1alpha2`**） |
| `.specs/platform-evolution/D-S14…D-S23/` | 21 个议题包 × 6 件（TOPIC/BRAINSTORM/RECON/CONCLUSION/PANEL/REVIEW） | **历史评审记录**（结论已进 ROADMAP；现行以 RULINGS 为准） |
| `.specs/platform-evolution/D-collaboration-layer*` · `D-execution-isolation*` · `D-identity-and-security*` · `D-single-process-state` · `D-stage-model-coupling` · `D-multica-borrow-wave2` · `D-harness-landscape-2026` · `D-declarative-api` · `D-otel-observability` · `D-a2a-protocol-surface` | 第 1–4 轮包 | 历史评审记录 |
| `.specs/{agent-domains,capability-groups,knowledge-plus,multi-provider,agent-control-plane,identity-hardening,small-model-decisions,credential-scan,k8s-final}/` | 早期 change 包（部分已被 RULINGS 取代） | 历史 change |
| `PRODUCT-DESIGN.v10-frozen.html` | 09-23 冻结快照（历史对照，勿引用） | 归档 |

## 五、审核台账（本轮归并 v20 · 2026-10-23）

| # | 文档 | 本轮做了什么 | 状态 |
|---|---|---|---|
| 1 | `PRODUCT-DESIGN.html` | v20：口径回填（待收口→已收口含结论）· §3.3 挂《资源字典》· §1.5/§1.6 刷新（kagent v1alpha2、保鲜期 10-23、P0-10 过审、数字复测、1.6.5 补⑨-⑬）· 新增 1.6.0 升级波次 + 1.6.7 八轮净增量 + 标的声明/现状基线 | **现行** |
| 2 | `prototype/`（6 页 8 处） | 「Squad 归档取消在跑」→ 不连带取消 · 表名 · 两词两义 · 负责人双轨→三轨 · `autopilot:`→`automation:` · 工作项→任务 | **现行** |
| 3 | `platform-evolution/RULINGS.md` | **新建**：裁定/术语/已推翻清单/历史纪律 | **现行** |
| 4 | `platform-evolution/ROADMAP.md` | 补第 5 轮正节；历史保留 | **现行** |
| 5 | `platform-evolution/TOPICS.md` | 第 6 轮占位补名、状态晋级、轮次记录补 3/5/6/7/8 | **现行** |
| 6 | `D-S16-team-entity/CONCLUSION.md` | §0 R1 与 §1 首批五类加 ⛔ 行内标记 | 历史（已标注） |
| 7 | `STATE.md` / `CLAUDE.md` / `README.md` / `README.en.md` | 状态归位 + 文档地图 + 指向 RULINGS/INDEX；README 两版补「文档地图」并按 v20 修正裁撤口径（LangGraph 运行时示例、世界第一/全流程绑定表述） | **现行** |
| 8 | `platform-evolution/D-*/TOPIC.md`（23 个） | 统一页首〔口径注〕指向 RULINGS + v20 | 历史（已标注） |
| 9 | `.specs/CONTEXT.md` · `README-CONSISTENCY-REPORT.md` | 顶部打 ⛔「已作废快照」，指向 INDEX/主档/RULINGS | 作废留痕 |
| 10 | `ROADMAP.md` / `TOPICS.md` 头部 | 标题改「第 1–8 轮」；附录加 09-21 计数过时注 | **现行** |

## 五之二、为什么不物理搬迁

「统一归纳」用的是**索引归并**，不是把 132 个 md 挪进 `product-design/`：`.specs/` 的目录约定是**议题即 change**（R16.5），`D-<slug>/` 必须落在 `platform-evolution/` 下；物理搬迁会打断 23 个包之间的相对引用、`ROADMAP`/`TOPICS` 的指针，以及 `config.get_specs_dir()` 的路径假设。**产物里只有两类真正属于 product-design**：主档 `PRODUCT-DESIGN.html` 与 `prototype/`；其余按 INDEX 的第 1/4 节定位。

### 单一事实源判定顺序（冲突时依次回退）

1. **`.specs/platform-evolution/RULINGS.md`** —— 现行结论（六列账 + 已推翻清单）。
2. **`PRODUCT-DESIGN.html` v20** —— 设计细节与界面语义。
3. **`prototype/`** —— 界面形态与文案（与主档冲突时以主档为准）。
4. **`ROADMAP.md` 对应轮节** —— 过审结论台账。
5. **各包页首〔口径注〕与 `CONCLUSION.md` 尾注** —— 历史留痕。
6. **`STATE.md`** —— 代码基线与冻结状态（**只用来看代码，不看设计**）。

> 六条里前三条是「活」的，后三条是「账」。任何一句不属于前三条的旧文，默认按「历史」处理。

## 六、归并纪律（下次别再走散）

1. **一条口径只活在一个地方**：现行结论在 `RULINGS.md`；设计细节在 `PRODUCT-DESIGN`；界面在 `prototype/`；过审账在 `ROADMAP`；议题状态在 `TOPICS`。
2. **推翻 = 加标记，不删原文**：`⛔〔已被 <日期> 裁定推翻 → 见 RULINGS §四〕`。
3. **同批同步**：改主档 → 同批改原型与术语表；改裁定 → 同批改 RULINGS + ROADMAP 对应轮节。
4. **禁止反向推导**：文档写「未实现」就是未实现；代码基线见 `STATE.md`，不以本目录为代码现状依据。
5. **数字必须复测**：本目录引用的计数（表数/页面数/文件数/错误数）一律注日期与命令，不复用旧值。

## 七、旧件处置台账（每份旧件都有明确去处）

| 对象 | 数量 | 处置 | 说明 |
|---|---|---|---|
| `PRODUCT-DESIGN.html` | 1 | **更新至 v20** | 见 §五 第 1 行 |
| `prototype/` | **127** 页 + assets | **更新**（6 页 8 处口径）**+ 删 8 张无入口旧页**（135→127） | 见 §三；备份 `/tmp/agentflow-orphans/` |
| `platform-evolution/RULINGS.md` | 1 | **新建** | 六列总账 + 已推翻清单 |
| `product-design/INDEX.md` | 1 | **新建** | 本文件 |
| `platform-evolution/ROADMAP.md` | 1 | **更新** | 补第 5 轮正节；标题改「第 1–8 轮」 |
| `platform-evolution/TOPICS.md` | 1 | **更新** | 占位补名 / 状态晋级 / 轮次记录补 3/5/6/7/8 / 表格结构修复 / 附录加口径注 |
| `D-*/TOPIC.md` | 23 | **加页首〔口径注〕** | 指向 RULINGS + v20 |
| `D-*/CONCLUSION.md` | 23 | **不动**（S16 已加 ⛔ 行内标记） | 结论已进 ROADMAP |
| `D-*/` 的 RECON / PANEL / BRAINSTORM / REVIEW | 约 100 | **不动** | 历史评审记录，由 RULINGS 承接现行判断 |
| 早期 change 包（`agent-domains` / `capability-groups` / `knowledge-plus` / `multi-provider` / `agent-control-plane` / `identity-hardening` / `small-model-decisions` / `credential-scan` / `k8s-final`） | 14 个 md | **不动** | 部分口径已被 RULINGS 取代（如 Provider/模型档位）；需要时按 RULINGS 回退 |
| `.specs/CONTEXT.md` | 1 | **打作废标** ⛔ | 2026-07-06 代码快照，路径/表数/功能均过时 |
| `.specs/README-CONSISTENCY-REPORT.md` | 1 | **打历史标** | README 已重写 |
| `PRODUCT-DESIGN.v10-frozen.html` | 1 | **归档不动** | 09-23 冻结对照件，禁引用 |
| `agentflow-product-design-html.zip`（仓根） | 1 | **删除**（用户 10-24 明确） | 691 KB 设计档打包件，内容与 `product-design/` 重复且会与主档版本失同步；全库零引用；git 历史仍可取回 |
| `README.md` / `README.en.md` | 2 | **更新** | 加「文档地图」；修正裁撤口径（LangGraph 运行时、世界第一、全流程绑定） |
| `CLAUDE.md` / `STATE.md` | 2 | **更新** | 加文档地图 + 数字复测；STATE 结构归位 |

