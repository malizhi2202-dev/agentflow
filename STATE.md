# STATE — 跨会话项目状态

> 仓库根 `STATE.md`。AI 每次开始新会话先读这个，结束前更新。（本文件 2026-09-22 由 0-change 阶段首建）

---

## 当前位置

- **活跃 Change**: `product-prototype-refresh`（来源 issue：MALIZHI-6 项目原型文档审核）
- **当前阶段**: 2a-ui-design **出口完成** —— `UI-DESIGN.md`（430 行 · 界面基线四样＝间距／字号／组件长相／导航形态）落盘：调性取九卡「工业」卡（`CHANGE.md:29` 已锁不重选）、token 闭集与 K6b 对齐、对比度实算裁掉 `--text-muted` 与红底红字、8 档字号闭集、200px 左栏两组导航、C1-C12 组件规约、U1…U13 UI 侧加严闸；**验收方式是实跑**：一致性样本 `good2a.html` 由 §1.5 派生命令现算、落仓库外，**51 条断言全中零红**（13 票面 AC + K1…K12 + U1…U13），工作树 `git status` 0 行。**🗳️ G2a 已召集四专家（0/4 待票）** → 票齐前不进 3-task。三条本轮跑出的判据冲突（AC-9 与 HTML 转义互斥 / K7-K12 窗口被嵌套 `<section>` 截断 / K7-K12 仍属性顺序敏感）与六条上报归口见 `UI-DESIGN.md §10/§14`；上一阶段（2-design）终态记在下方决策日志首条与 `DESIGN.md §8/§10`。
- **当前 Task**: —（等 G2a 票齐后交 3-task）
- **中断任务**（R1.5 清窗）: 无。**G2a 待票中**：四票未集齐 → 按契约静默待票，不推进、不重复催；任一专家指出偏差 → 只改该维（字号／间距／组件／导航其一）并按 §12 配方重跑 51 条
- **会话开始建议**: 转入 **2a 承接态**。(1) 若票齐：按 R13.2 裁决并回写 `UI-DESIGN.md` 票面块（该块是机器接口，D15 五条：块首行半角冒号切门名／票行行首色块、不能进表格或列表项／含「结果」的行先当结果／裸票面标记全文仅一次），再 @任务拆解 进 3-task——**第一批任务就是 `UI-DESIGN.md §15` 的 T-UI-01…09**（tokens 物化必须排第一，因 K6b 要求逐字节含引号形态）。(2) 若 🟩 或 🔴 判 ❌：回 2a 改，禁放宽任何已投票判据。(3) 人工侧 `product-design.html` ①/② 仍未拍板，**本阶段已按 ② 出基线并留 ① 回来的最小重跑清单（`UI-DESIGN.md §0.3`）** → 它已不再是 2a 的前置，若人工改判 ① 只需按该清单重跑。(4) **4-dev 写文件时才需要真前置**：`F=` 路径一行 + `UI-DESIGN.md` §8 表 + §13 闸；样本一律落仓库外（AC-4 tier-1 会自判违规）。(5) 需代码议题 **12→13 计数未并前，交付稿 `data-slug` 仍只挂 12 条**（实测 K4 diff 空），全部仍**不在本 change 内实现**（R7.1）

## 阻塞与待决策

| 项 | 类型 | 详情 | 待谁 | 自 |
|---|---|---|---|---|
| product-design.html 存在性 | 决策（歧义） | 仓库 main 与全部分支均无此文件。① 人工提供既有稿→按「既有稿上融合」做；② 确认不存在→以 README+代码为事实源新建。**2a-ui-design 前必须落定**，W1/W2 不依赖 | 用户 | 2026-09-22 |
| 小队无 D-discovery 主责 | 决策（编制） | 「调研/竞品分析」类诉求按 GO.md 应走 D-discovery 五步 + GD 议题门，但无该阶段成员；现按 0-change→1-requirement 内嵌 research 降级执行 | 用户 | 2026-09-22 |
| 竞品扩展候选 3 个 | 决策（偏好 · 一次拍板） | Dify / AgentOps / n8n（各一句理由见 `RESEARCH-competitors.md` §3）是否纳入深挖；不拍板则按现清单（4 点名）收口，不再单开提问 | 用户 | 2026-09-22 |
| 「Buzzz」未定位 | 决策（歧义） | 4 个候选域名不可解析、buzzz.io 是营销工具、GitHub 无同域仓库 → 待人工给官网或材料，否则本项永久标「待确认」 | 用户 | 2026-09-22 |
| 2a 上报的工件归口（6 条 · 全部非阻断，票面可裁） | 纠正（工件归口，不由 2a 改） | 详见 `@.specs/product-prototype-refresh/UI-DESIGN.md` §14：① `tokens.css` 实为 **61 个变量**（DESIGN 记 51，漏掉的 10 个含 `--s2..--s8/--r-md/--r-lg/--normal`）② **K6b 是文本级比对** → 值须逐字节含引号形态（实测双引号写法 diff 2 行即红）③ app 有 **26 个"引用而零声明"的幻影变量** → 交付稿禁抄（U3 机验）④ 品牌名 `App.tsx:275`「AI 开发平台」vs `README.md:1`「AgentFlow」⑤ 产品侧 a11y/反模式三条事实（`--text-muted` 2.77:1 用 186 处、`.btn-primary` 3.29:1 用 19 处、彩色左侧条 11 文件）⑥ 已在下方表的三条复核 | 架构设计（①②③④）／需求分析（③④⑤，⑤须另开 change） | 2026-09-22 |
| 2a 跑出的三处判据冲突（不改判据，只钉形态） | 决策（把关 · 可在 G2a 一并裁） | `UI-DESIGN.md §10`：A AC-9 的 `grep "<管理员口令>"` 与 HTML 转义互斥（实测转义版判 0）→ 采 `data-literal` 双写；B K6 强制的嵌套 `<section class="notice">` 会截断 K7/K12 的 awk 窗口 → 域章内顺序钉死 + U5a/U5b 机验；C K7/K12 字面正则仍属性顺序敏感（与 D16 相冲，实测对调即判 0）→ 交付稿 `class` 在前 | 架构设计 + G2a 四专家 | 2026-09-22 |
| 「AgentOS」三义 | 决策（歧义） | agentos.com=房产 CRM（已排除）/ rivet agentOS（本轮取此参照）/ AG2 自称 AgentOS——人工所指待明 | 用户 | 2026-09-22 |

## 已留档议题（R18.4）

- `docs-drift-resync`：README.md 大面积过时（2026-07-06 一致性报告实测 10 项 8 不准；本次差异清单 D1-D7 见 `BASELINE-code-facts.md` §5）。待 `product-prototype-refresh` 的新原型文档成为产品事实源后，另开 change 做 README 同步。
- 由 `product-prototype-refresh` / W2 出口登记的需代码议题（**合计 12 条 slug**；唯一真源 = `RESEARCH-competitors.md` §2 表内反引号 slug 去重集，核对命令见该节「计数不变式」；均"需代码 → 新 change"，本 change 内零代码写入）：
  - 轻成本可先行：`token-cost-ledger`（逐运行真实成本账）、`unified-inbox`（告警+审批+待办单一入口）、`trace-viewer-reattach`（把零挂载的 `TraceViewer` 接回界面）、`model-verification-tier`（模型"已验证/自担风险"分级）、`separation-of-duty-gate`（产出者不得自证）、`skill-capture-from-run`（一次成功运行沉淀为可复用 skill）
  - 中等：`mcp-tool-runtime`（MCP 从类型标签变成可运行接入）、`inbound-channel-session`（渠道入站 mention 开会话闭环）、`approval-ladder-autonomy`（硬地板→一次性批准→standing rules→allowlist + 熔断）
  - 架构级（须 2-design + ADR）：`agent-execution-sandbox`（隔离执行/沙箱）、`knowledge-rag-retrieval`（向量检索，破 SQLite 默认形态）
  - 边界待定：`human-agent-assignment-board`（人 + Agent 同板派工，先定产品边界再谈实现）

## 决策日志（最近 10 条，倒序）

- `[2026-09-22]` **2-design 出口（DESIGN.md + ADR-001/002/003）**：步骤 0 走"已锁决策直接读用"例外（`CONTEXT` §15.2#5/#7 + CHANGE 视觉调性）→ **不向人工重开偏好提问**；交付物锁定零依赖单文件 HTML（排除构建链/CDN/位图：`demo.gif` 实测 2.8MB 一张即爆 NFR 预算），接口＝**§1.5 标记契约（AC 命令的字面串即接口名）+ K 系列（K1…K11） 派生对账闸**。三条实测发现进工件：① **AC-7/AC-8 词锚定窗口可假绿**（「安全与审计」出现在导航时，安全段漏写边界仍判 1；`id="sec-security"` 锚定版判 0）→ 交付稿该字样只在安全章出现、侧边栏用 label 原文「审计日志」，加严闸 K7/K8 进 5-test 与票面命令并跑；② **需求侧交接提示③ 的可选收紧 tier-1 扩展式 → 显式决定并档**（`DESIGN` D7，对现产物 + `backup/` 实测 0 命中，不动已投票原式）；③ **唯一基准自身一处小漂移**：`BASELINE:35` 记 `Detail`「含 6 个 tab 组件」，代码 `frontend/src/pages/Detail.tsx:9` 的 `TABS` 与 `*Tab` import 均为 **5** → 本阶段不改已投票工件，交付稿按实测值写并上报需求侧改该单元格。两轴标签（归属四值 / 标注三态）保持正交 + 值域闭集 + 合法组合矩阵（ADR-003），12 需代码议题全部圈在 §6 外（`agent-execution-sandbox`、`knowledge-rag-retrieval` 须各自新 change + ADR，且届时建议先跑 A-architect）。出口自检实跑：`git diff --name-only b15c4554..HEAD | grep -vcE "^(\.specs/|STATE\.md)"` → **0**、tier-1 与并档收紧式 → 各 **0 命中**、`12 / SAME-REQUIREMENT / SAME-STATE`、AC-1 基准 `32/168/11/13` 复现、9 条融入派生 `G1 G4 G5 G6 G7 G8 G9 G10 G13` — `@.specs/product-prototype-refresh/DESIGN.md` ｜ **同阶段续记（收 🟫 两条非阻断）**：新增 DESIGN §8 + D15（票面格式＝机器接口，五条实测约束：块起止／首行半角冒号切门名问题／票行必须行首色块不能进表格或列表项／含「结果」的行先当结果／全文裸票面标记只能出现一次否则开假门）。产品解析器复跑结果：改前 1 门但门名＝表格碎片且 `question` 空，改后 `name=G2 方案门`＋完整问题＋4 条票＋`result=1/4`。BASELINE 的 tab 数差异仍按 R1 归需求侧，不由 2-design 改已投票工件。 ｜ **同阶段续记二（🔴 条件票三条 + 🟦 两陷阱 + 🔴 非阻断一）**：D3↔D11 矛盾消解（附录索引化 + K11 + UAT-8）；`.html` 推论降级并把 `admin-file-read-jail` 登记为第 13 条议题（不进 `data-slug` 集，等需求侧并入后同步）；§7.6 复现配方（十条断言实跑全中：K11 `1/0`、K3b 倒序 `1`、K6 `2`、K8 `2→1`、图例 `1→0`、AC-7 词锚 `1` vs K7 `0`；样本落仓库外；`.gitignore` 会自破 AC-12 已算术复核）；K3b/K6 重写为顺序无关（D16，`good5` 回归仍 6/0、`bad3` 仍 1/1）；D17 图例须含路径；K8 收窄避免把传输加密句判违规而诱导贴错限定语。DESIGN 现 **17 条决策 / 15 条闸命令（K1…K11 含 b/c 变体）/ §7.6 复现配方**；票面块同步到 3/4 并经产品 `parse_gates` 复验可解析。 ｜ **同阶段续记三（🟩 条件票两条 + 三条非阻断）**：C1 由"三处三答案"收成一格一答案——§3 矩阵 `缺失 × 未接入` △→✗、ADR-003 决策 3 补该格并把"△ 那两格"改口为唯一剩余 △（`部分已有 × 规划中`，判断权留 UAT），修向是**收紧**、不放宽任何已投票判据；C2 附录改「S 号 → `id` 锚点，禁复述限定句文本与域名字样」，否则照设计自己的结构写会得到必红的稿子（D10 单点被附录打断 → AC-7 词锚窗口漂移 → K7 判 0 → 两版不一致即不合格）；N1 加 **K12**（S6 是 S1-S10 里唯一无闸又最高危的过度声称面：CLAUDE.md:8/README 写「K8s 式管控」不带"仿真"，REQUIREMENT/DESIGN 里「仿真」0 次）；N2/N3 措辞对账（域章 12=能力域 11+外壳 1、page-block ×32 含外壳 2 页）。DESIGN 现 **17 条决策 / K1…K12 共 16 条闸命令 / 470 行**；矩阵↔K3b 逐格一致性 12/12、good6 全绿复验均已实跑。 ｜ **同阶段续记四（🔴 改票 ✅ → G2 以 3/4 过门进 2a）**：🔴 亲跑 §7.6 配方 10/10 后把 B-1/B-2/B-3 判为闭合，改票轮顺手抓到 **K11 一支纯误伤**（合规附录标题「附录：S1-S10 所在域索引」旧式判 `1`；反例其实由「攻击面」支抓到）→ 采纳收窄式并加 D3 标题纪律，配方补 (7) 组 + `true` 收尾，现 13 条断言全中、exit=0；票面块同步 3/4，并把 🟩 未回的 C1/C2 与 N1/N2/N3 按 R13.2 记进新增 **§10 反对意见留档**（含逐格 12/12 一致与 good6 全绿两条复验数据）。
- `[2026-09-22]` **需求门 4/4 ✅ 终裁通过，本阶段出口**：三张条件票（🟩 `01a0c815-603c`／🟫 `01a0c815-d682`／🔴 `01a0c816-eaff`）在修正落地后全部翻正，**且三位都是执行命令而非读文字**——🔴 按 `### AC-*` 分节把工件里验证方式行的命令原文抽进 bash 逐条跑（反例必红／合格稿必绿，AC-3/4/5/7/8/9 全对）、🟫 反测我采纳的判据能否被 inflate（漏画 → 7 拦下、挤一行 → 1 拦下）、🟩 原文照跑三条对账命令（`12 / SAME / SAME`）。落地的判据性改动：AC 12→**13**（新增 AC-13 竞品融入判据）、全文计数型命令换逐条/段内共现、AC-4 核对面纳入 `backup/`（平台编辑器自动备份已入库这一事实复验后入 BASELINE 新增 **S10**，S1-S9 引用范围同步 S1-S10）、归属字段统一 §1 四值枚举。**五条交接提示交下游、不回炉改已投票的 AC**（含 🔴 的可选收紧扩展式——2-design 已按 D7 显式并档，见上一行；另把她的"抽命令原文、反例必红／合格稿必绿"两步法连同样本放置禁忌——反例/合格稿不得落在 `.specs/product-prototype-refresh/` 内，否则被 AC-4 tier-1 自判违规——记为提示 5；本阶段已在 `58ced1e5`（AC 段与 `612e4dd4`/`d07b4c1c` 逐字一致，diff 为证）复现：12 条 F 型命令对合格稿 12/12 放过、对反例稿拦下 9 条，余 3 条为成对设计或样本缺料）。交 [@架构设计] 进 2-design ＋ 2a；人工 5 项仍挂、① 卡 2a 开工 — `@.specs/product-prototype-refresh/REQUIREMENT.md#终裁`

- `[2026-09-22]` **需求门 4/4 到齐 + 🔴🟫 两张条件票当轮闭合**：安全审计师构造反例证明 **AC-3/AC-4/AC-5/AC-7/AC-8 的全文计数型命令可被绕过**（远程 `url()`/协议相对/`srcset`/`iframe`/内联 `fetch` 判绿；同行堆叠多条"本项目已有"互相顶包；`grep -A2 加密` 被邻行蒙过；AC-4 核对面漏 `backup/`——平台编辑器保存即自动复制原件入 `backup/`，`CLAUDE.md` 亦记为"产物保存前的自动备份"）→ 本阶段**逐条独立重跑反例与合格稿后**换命令：AC-3 加强版（反例 5 命中 vs 旧命令 0）并把 out-1「不接真实数据」并进机器闸、Then 明写保留 `<a href>` 来源引用；AC-4 两级（tier-1 含 `backup/` 现 0 命中 exit 1，tier-2 管绝对路径/邮箱/主机名）＋ 新纪律"本 change 产物不经平台 PUT 编辑器"；AC-5 加同行堆叠探测；AC-7/8 改段内共现。高级产品经理指出 **CHANGE 验收线 1 末句「并含调研新增界面」在 12 条 AC 里无人验**（`grep -c 调研新增界面 REQUIREMENT` → 0 证实）→ 新增 **AC-13**（9 条「融入原型」须带"来源=调研结论 G<n>"标注 + 调研局限随稿一节 + UAT-7 逐条勾）。另：归属列两拨词汇（本文两值 vs 表内五值，实测 1/6/7/1）→ §1 定**四值枚举为唯一口径**；G11 补"最近骨架"锚点（`assignee` 全仓 0 命中、`scheduled_task.py:13,18` 的 `agent_id`+`owner_id`）；§4 追加安全类可引事实；🔴 非阻断 2 的代码事实复验后入 BASELINE 新增 **S10**（`artifact.py:10-26` GET 产物无鉴权、PUT 才要 `project:write`）→ S1-S10 整表禁搬进外发原型稿；`F=` 路径赋值统一。计数对账不变式复跑：12 / SAME-REQUIREMENT / SAME-STATE ✓

- `[2026-09-22]` **需求门第 1、2 票入账（🟦 ✅、🟩 ❌条件票）**：🟦 三条非阻断当轮改入工件（AC-2 行/页措辞纠错＝BASELINE §2 实为 12 行·32 页；AC-11 由数量地板抬为六项逐处 + UAT-6；US-2 的 13 入口并入 AC-2）→ `240b8e37`；🟩 唯一阻断项＝跨工件计数破口（真源 12 个需代码 slug，三处手抄 11、`approval-ladder-autonomy` 在 v2 枚举漏网）→ v2 分组重排＝12、RESEARCH §2 立「计数不变式 + 一条命令三处对账」、CONTEXT §15.2#10 立规、STATE 与自检同步，非阻断的 CONTEXT §3 快照路标同轮落地 → `47b624d9`（数票依据一律走服务端实时读，未凭记忆；该时段 `multica` 读接口曾一度不可达，GitHub 侧可达故照常推送）
- `[2026-09-22]` **1-requirement 出口**：`REQUIREMENT.md`（7 US / 12 AC（出口时点数；G2 🟫 条件票补 AC-13 → 现 **13 AC**）全 GWT+单一验证 / v1·v2·out / NFR 5 轮）交付；W1 事实底稿 `BASELINE-code-facts.md` 成为数字唯一基准（页面 34 文件·**挂载 32**、端点 **168**、模型 19、表 26=ORM 口径、store 12、孤儿 2 页 + 9 组件、既有能力边界 S1-S9（出口时点数；G2 🔴 复验后补 S10 → 现 S1-S10）、漂移 D1-D7）；W2 `RESEARCH-competitors.md` 15 条缺口去向闭合（融入原型 9 / **需代码议题 12 个 slug**（原文误记 11，漏 `approval-ladder-autonomy`，已由 G2 🟩 条件票纠正）/ 否决 3）+ 3 个扩展候选交人工一次拍板；`CONTEXT.md` §15 追加域语言（出口时 11 术语 / 9 已锁决策 → 需求门后终态 **12 术语 / 10 已锁决策** / 5 默认行为；术语 +1＝G2 🟫 把「归属三态」纠正为**归属四值**并拆出独立的「标注三态」；§3 另加快照路标）— `@.specs/product-prototype-refresh/REQUIREMENT.md`
- `[2026-09-22]` **调研取证通道降级备案**：本运行时 `web_search` 不可用（endpoint 未配置），事实改由官网 HTML + 官方 README + GitHub Search API 直连取得（2026-09-22 全部实测可达）；竞品自述一律经「归属」字段隔离，禁止当本项目现状（R6.2）
- `[2026-09-22]` **W1 定性两处「壳能力」**：`routes/token_usage.py` 系正则扫 `.specs/*-SUMMARY.md` 文本（非逐运行记账）、`tools_api.py:89-91` 的 MCP 只生成骨架 zip（无运行时）→ 原型必须标「未接入/演示边界」，并登记议题 `token-cost-ledger` / `mcp-tool-runtime`
- `[2026-09-22]` **2a-ui-design 出口（UI-DESIGN.md · 界面基线）**：brownfield 步骤 1.5 全跑（观察 8 维全为实测数：token 引用频次、hover 语汇、圆角/时长档位、图标库、45 文件用 emoji）→ 调性取九卡 **工业（Industrial）**（`CHANGE.md:29` 已锁，不重选）；四样裁量落定：**间距**＝`--s1..--s10` 闭集 + 档位授权表（`--s5` 不授权）· **字号**＝实测 8 档闭集 `{10,11,12,13,14,15,18,24}px` + 字重三档（`700` 仅等宽数字、`800` 禁）· **组件长相**＝C1-C12 规约（零阴影/零动画/无彩色侧条，hover 只动颜色）· **导航形态**＝200px 左栏两组（13 入口带 `data-nav` ＋ 11 域 `toc-domain`，第 8 域目录写「审计日志」＝D10；无第三栏，1280 零横向滚动）。**R8.3 hex 例外显式声明**（K6b 同名同值锁死，故不供 OKLCH 换算表）；字体解法＝use-site 前置产品已自托管的 `'IBM Plex Sans'`（`main.tsx:5-9` 实测）＋ `var(--font)` 当尾巴，不新增变量。**对比度本轮实算**：`--text-muted` 2.77:1 → 交付稿禁用于信息性文字；`--red` 落 `--red-bg` 4.28:1 → 红字改落 `--bg-card`；app 的 `.btn-primary` `#fff on --blue` 3.29:1 → 交付稿无 filled 按钮（产品侧修复影响面 19 处，须另开 change）。**跑出来的三处判据冲突**（都按最小合规形态落地、未改任何已投票命令）：A AC-9 的 `grep "<管理员口令>"` 与 HTML 转义互斥（实测转义版判 0）→ 解 `<code data-literal="<管理员口令>">&lt;管理员口令&gt;</code>`（实测 1 且可见）；B K6 强制的嵌套 `<section class="notice">` 会把 K7/K12 的 awk 窗口提前截断 → 域章内顺序钉死「H2→边界句→页块→嵌套」+ 新闸 U5a/U5b 机验（实测 `PASS 122<124`／`PASS 99<106`）；C K7/K12 字面正则仍属性顺序敏感，与 D16 相冲（实测对调 `class`/`id` 后 K7 判 0）→ 交付稿钉 `class` 在前。**验收方式不是表格而是实跑**：一次性样本 `good2a.html` 由 §1.5 派生命令现算、落仓库外 `$TMPDIR`（`git status` 0 行），**51 条断言全中零红**（13 条票面 AC + K1…K12 + 我新加严的 U1…U13）；新增 UI 闸全部只做加严、不改 §1.5 字面串（D5）。**上报 6 条归口**（§14，不由 2a 改）：① `tokens.css` 实为 **61 个**变量非 51（差在同行多声明，`--s2..--s8/--r-md/--r-lg/--normal` 正在漏掉的 10 个里）② **K6b 是文本级比对**，值须逐字节含引号形态（实测 `"Segoe UI"` → diff 2 行即红，改回单引号后空）③ app 有 **26 个引用而零声明**的幻影变量（`--text-dim` 235 次／`--color-primary` 101 次…）→「沿用实现」≠照抄类名，U3 机验 ④ 品牌名两处不一致（`App.tsx:275`「AI 开发平台」vs `README.md:1`）→ 交付稿取 AgentFlow ⑤ 产品侧 a11y 三条事实（见上）⑥ 已在表的三条需求侧归口本轮复核（`data-slug` 并入前仍只挂 12 条，实测 K4 diff 空）。**G2a 已召集四专家**（票面块在产品自己的 `parse_gates` 下解出 `name=G2a UI 设计门` + 4 票 ⚪ + 结果行，裸票面标记全文 1 处）→ 票齐前不进 3-task — `@.specs/product-prototype-refresh/UI-DESIGN.md`
- `[2026-09-22]` **G1 终裁 4/4 全票通过 → 进 1-requirement**：🔴 复验 `3de89ded` 后按原话翻 ✅，附注两条当轮落地（核对命令换 `1[2]3456`+`--exclude=CHANGE.md` 防自命中与空匹配 exit 2；加密陈述补 `ENCRYPTION_KEY` RuntimeError 与短密钥零填充无 KDF 边界）；🟫 第 2 轮的假锚点纠错（「Artifact 页」不存在，实为 `components/ArtifactTab.tsx`、宿主 `Detail.tsx:60`）复测属实、当轮改掉。整条 G1 票链全文在 `@.specs/product-prototype-refresh/CHANGE.md#过程记录`（本日志按"最近 10 条"上限合并不再展开）
- `[2026-09-22]` 立项 `product-prototype-refresh`：W1 审核 / W2 竞品调研 / W3 融合原型文档，三个工作包全在文档层，L1 代码零改动；视觉调性锁定既有前端实现（Tremor+Tailwind+tokens.css 管控台基线，2a 可修正）— `@.specs/product-prototype-refresh/CHANGE.md`（同轮首建本 `STATE.md`）。更早票链（G1 首轮集票 4/4：原始 2/2，两张条件 ❌ 落地后翻正）全文在 `@.specs/product-prototype-refresh/CHANGE.md:92`，本日志按"最近 10 条"上限压缩为一行

## 已归档 Changes（最近 5 个，倒序）

| 日期 | Change | 摘要 | PR |
|---|---|---|---|
| — | — | 暂无 | — |

> 注：`.specs/` 既有 6 个历史目录（agent-control-plane / agent-domains / capability-groups / k8s-final / knowledge-plus / multi-provider）为历史 change 产物，归档状态无记录（STATE.md 系本批新建）；`capability-groups` 含 CHANGE/REQUIREMENT/DESIGN/TASK 全链产物，疑似已完成未归档，待 INTEGRATION 期认领。

---

## 横向命令状态

```yaml
ai_context_doc: .specs/CONTEXT.md
last_intel_scan: 2026-07-06            # CONTEXT.md / README-CONSISTENCY-REPORT.md 头部记录的扫描日期
last_architect_at:                     # 从未跑 A-architect
last_evolve_at:
last_health_at:
```

---

## 健康检查（AI 每次会话开始前自检）

- [x] `.specs/` 目录存在
- [x] 当前活跃 change 的工件文件齐全（按阶段 CHANGE：CHANGE.md 已落盘）
- [ ] 没有未归档但已合并的 change —— 待核（见上方历史 6 目录注记）
- [x] 没有 > 3 轮自动重试仍未解决的失败
