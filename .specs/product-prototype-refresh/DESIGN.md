# DESIGN: 项目原型文档重做 —— 交付物形态、标记契约与对账闸

- **Change ID**: `product-prototype-refresh`
- **关联**: `@.specs/product-prototype-refresh/REQUIREMENT.md`（13 条 AC）· `@.specs/product-prototype-refresh/BASELINE-code-facts.md`（数字唯一基准 S1-S10）· `@.specs/product-prototype-refresh/RESEARCH-competitors.md`（G1-G15 与 12 slug 唯一真源）· `@.specs/CONTEXT.md` §15 · `@.specs/product-prototype-refresh/CHANGE.md`
- **作者**: AI（Architect 角色）+ 阶段子循环票面 review
- **本 change 的性质**：**只到文档层**。设计对象不是"新功能怎么实现"，而是"这份可验证的交付稿长什么样、靠什么不腐"。任何 L1 代码写入 = 越界（AC-12）。

---

## 0. 技术栈选定

> 步骤 0₋ 架构级预检：`CHANGE.md` 步骤 0.4 已判**未命中**（本 change 不改数据库/鉴权/模块拓扑），按其"已跑过 0-change 的不必重判"直接进本步。项目无 `.specs/ARCHITECTURE.md`（首轮已实测），故无 ADR 可撞；两条架构级议题的处置见 §6。
>
> 步骤 0 例外条款命中：`.specs/CONTEXT.md` §15.2 已有**已锁技术决策** #5（原型零外部依赖、颜色间距取 `tokens.css` 实际值）与 #7/#8（视觉调性锁定既有实现；本 change 零 L1 写入），`CHANGE.md`「视觉调性」亦已走强偏好例外。按"直接读用"处理：**锁定为下述形态，可调整**；不向人工重开偏好提问（R18.1①②不适用——无歧义、无新偏好），也不询问"要继续吗"（R13.4）。

- **选定**：**零外部依赖单文件静态 HTML**（交付稿），不引入任何构建链、包管理器或运行时
- **交付物**：`.specs/product-prototype-refresh/product-design.html`（路径由 AC §1 的 `F=` 单行赋值决定；人工 ① 若给出既有稿路径，只改那一行）
- **"前端"**：HTML5 + **一份内联 `<style>`**，颜色/间距/圆角/字体**逐字内联 `frontend/src/styles/tokens.css` 的实际值**（51 个 CSS 变量，不引 Tailwind runtime、不引 CDN）
- **"后端" / 数据库 / 部署**：**N/A —— 本 change 不选栈、不改栈**。应用侧仍按既有：FastAPI + SQLAlchemy + SQLite（默认）/ React 18 + Vite + TS + Tailwind 3.4 + Tremor 3.18；`frontend/`、`backend/` 只读。
- **关键"依赖"**（全部为交付稿内部约定，非 npm/pip 包）：`class="page-block"`（AC-2 已投票串）· `data-page` / `data-anchor` / `data-owner` / `data-state` / `data-nav` / `data-from` 属性钩子 · `id="vb-G<n>"` · `id="nb-<语义名>"` · `id="sec-security"` · 内联 SVG 图形（禁位图解码）
- **理由**：AC-3 要求断网双击完整渲染且零网络 API，AC-12 要求零 L1 写入，NFR 要求 ≤2 MB 与首屏 ≤2 s —— 唯一同时满足三者的形态就是"手写单文件 + 内联一切"。数字与清单不硬编码（§6 可维护性条）→ 靠 K 系列派生闸从 BASELINE/RESEARCH **现算**。
- **明确排除**：
  1. **构建链产物**（Vite 打包 HTML / Tailwind JIT / Tremor 组件真引入）——需 `npm build`，产物含外链脚本与 chunk，AC-3 与"双击即可"同时判红；且写入 `frontend/` 触 AC-12。
  2. **Markdown 直投 + 前端渲染器 / Mermaid / ECharts / `marked` 等 CDN** —— 远程 `<script src>` 与 `fetch(` 是 AC-3 的正命门；且"要装东西才能看"违反 US-1/US-2 的验收场景。
  3. **截图/贴图为主的原型稿**（Figma 导出位图、base64 内联 PNG/GIF）—— 单文件 ≤2 MB 预算下不可行（仓库根 `demo.gif` 实测 2.8 MB，一张就爆预算），且图片内容不可 grep，13 条 AC 里 9 条的机器判据全部失效。

---

## 0.5 既有架构对齐（brownfield · 本 change 只读既有实现）

### 0.5.1 本次 change 触碰的既有模块（全部为**只读真源**，零写入）

```
只读真源（grep/awk 实测存在，本轮已复跑）：
- frontend/src/App.tsx              —— 侧边栏 13 入口 label 与 32 个页面挂载（label 原文：工具库/工作流/角色/Agent/💬 对话中心/
                                       Agent 管控/编排/监控/项目/知识库/审批/用户管理/审计日志）
- frontend/src/styles/tokens.css    —— 210 行 / 51 个 CSS 变量（--bg-app #0d0e12、--blue #548cf0、--s1..--s10）
- frontend/src/pages/*.tsx          —— 32 挂载页 + 2 孤儿（SecurityPage/AssemblyView，不得作为能力页出现）
- frontend/src/components/*.tsx     —— 9 孤儿组件（TraceViewer 等）
- backend/routes/*.py backend/models/*.py —— 168 端点 / 26 表的锚点来源（AC-5 的 data-anchor 目标）
- .specs/product-prototype-refresh/{BASELINE-code-facts,RESEARCH-competitors}.md —— 数字与清单的唯一真源
- backend/routes/artifact.py        —— 只读，用于 §5-R4 与 D11 的读取面判断
- backend/parsers/gate.py           —— 只读，用于 §8 票面格式（交付链路上的 🗳️ 块会被产品自己解析成门禁视图）

会新增（只落 .specs/）：
- .specs/product-prototype-refresh/DESIGN.md（本文件）
- .specs/adr/001~003-*.md（本阶段 3 条低可逆决策）
- .specs/product-prototype-refresh/product-design.html（交付稿本体 —— 由 4-dev 写、2a 出视觉基线，本阶段不产）
- STATE.md 状态行 + 决策日志（R4.5）

禁动清单（与本次无关，AI 不许"顺手"碰）：
- backend/**、frontend/**（AC-12 硬边界；连格式化/依赖升级都不做）
- backup/**（只作为 AC-4 tier-1 的核对面，不写不删）
- README.md（回写属 `docs-drift-resync`，需新 change）
- .specs/{CONTEXT.md §15.1/§15.2, REQUIREMENT.md, CHANGE.md, BASELINE-code-facts.md, RESEARCH-competitors.md}
  —— 已投票工件；本设计只在交付稿里引用它们，改名/改数须回需求侧（见 D5 的同步规则）
- .specs/agent-control-plane 等 6 个历史 change 目录（S-align 只做只读核对）
```

### 0.5.2 既有抽象沿用对照表

| 本次需要 | 既有有没有？路径 | 决定 |
|---|---|---|
| 视觉 token（颜色/间距/圆角/字体） | 有：`frontend/src/styles/tokens.css` | **沿用其实际值**，内联进交付稿（不引 Tailwind runtime、不自造变量名）→ 由 K6 做集合级一致性核对 |
| 页面/入口清单（IA 骨架的事实） | 有：`frontend/src/App.tsx` 的 `NAV`/`ADMIN_NAV` + `Detail.tsx` 的 `TABS` | **派生**（K1/K5 从代码与 BASELINE §2 现算），禁在交付稿里手抄一份新清单 |
| 能力域划分与规模数字 | 有：`BASELINE-code-facts.md` §1/§2（唯一基准） | **引用式**呈现（CONTEXT §15.2 口径条），禁写"约/大概/目前"式无锚数字 |
| 能力边界措辞 | 有：`BASELINE` §4 的 S1-S10「允许写入原型的措辞」列 | **逐字采用**限定式（AC-7/AC-8 靠它判绿） |
| 竞品结论与去向 | 有：`RESEARCH-competitors.md` §2（G 号 + 去向 + slug 唯一真源） | **派生**（K4 现算 9 条融入集与 12 slug 集），禁重算、禁重述方案 |
| 归属与标注语言 | 有：`CONTEXT.md` §15.1「归属四值」「标注三态」 | **沿用同一套两轴术语**（D4），禁新增同义词、禁把两轴合成一列 |
| 图形绘制 | 无（仓库内无图表资产可内联） | **引入新约定**：交付稿图形一律手写内联 SVG（理由见 0.5.3 第 4 条） |

### 0.5.3 沿用模式 vs 引入新模式

```
- 数字/清单口径：**沿用**「单处真源 + 多处 diff」范式（RESEARCH §2 计数不变式的同构推广）
- 域与页面词汇：**沿用** App.tsx 与 BASELINE §2 的原文；两套坐标正交，交付稿同时给（D4）
- 边界陈述措辞：**沿用** S1-S10 的限定式，禁自创"已交付"式说法
- 交付稿内部结构：**引入新模式** → 理由：仓库内此前无任何"可 grep 的文档"抽象（历史 .specs/*/DESIGN.md 是给人读的
  Markdown，无机器判据）。本 change 的交付物要同时满足 9 条 grep/awk 判据，必须先定义一套**标记契约**（§1.5），
  这是新业务域（文档即验收面对象），不是既有代码域的重构（已按 G2 门要求交票面审）
- 图形：**引入新模式** → 理由：AC-3 封死 CDN 后，位图与外部库都不可用，内联 SVG 是唯一"可 grep + 可断网渲染"
  的画法（且体积可控）。仅限手写简单框图/表格，禁绘制装饰性大图
- 状态管理 / 鉴权 / 数据访问：**不触碰**（本 change 无运行时代码）
```

---

## 1. 决策清单

| # | 决策 | 备选 | 选择理由 | 取舍代价 |
|---|---|---|---|---|
| D1 | 交付稿 = **单文件零依赖静态 HTML**，浏览器直开 | 构建链产物 / Markdown+渲染器 / 位图原型稿 | 见 §0 排除项：AC-3+AC-12+NFR 三者交集只有这一条路 | 无交互（导航靠 `<a href="#…">` + `<details>`）；改样式要动文件本体 |
| D2 | 数字与清单 **一律派生**（K1/K4/K5/K6 现算），交付稿只呈现结果 | 手工抄一份"更顺眼"的清单 / 造生成脚本落 `frontend/` | AC §6 可维护性明写"数字以 BASELINE 引用式呈现，改代码只改 BASELINE 一行"；手抄即下一份 README 式漂移（D1-D7 就是这么来的） | 派生命令对表格格式敏感（`awk -F'\|'` 依赖 `\| N \|` 行形）；格式变了要同步 K 系列命令 |
| D3 | 结构四层 + 附录：`头部/校准基线 → 13 入口导航 → 11 能力域 section → 32 个 page-block`，附录含调研局限、9 条融入块、12 slug 去向、S1-S10 边界句 | 按"页面"平铺（不按域）/ 按竞品结论为主线 | AC-1 与 AC-2 要"11 域全覆盖 + 32 页逐名 + 13 入口"三套坐标同时可见；域为章、页为块才能同时满足，且孤儿页面（AC-11 禁作能力页）能放进非域位置 | 交付稿偏长（预期 ~1.5-2.5k 行 HTML）；跨层导航必须靠稳定 id |
| D4 | **两轴标签保持正交、分属性承载**：`data-owner`（归属四值）/ `data-state`（标注三态），且两套枚举值各自闭集 | 合并成一个"状态"列（AI 最容易犯的塌缩）/ 用自由文本"部分可用" | `CONTEXT.md` §15.1 已把两轴拆成两个术语；AC-5 管"是不是我们的现状"，AC-11 管"进没进界面"，AC-13 注脚（`:120`）明确二者不可互相代偿。塌成一列会让 AC-11 的六处逐处判据失去抓手 | 每个条目要写两个属性，交付稿稍长；需在 K3 做值域闭集核对 |
| D5 | **标记契约**（§1.5）是交付稿的接口：AC 命令里出现的字面串是**接口名**，2a 可自由改视觉与排版，**不得单方面改字面串** | 让 2a/4-dev 随意命名 class，再回头改 REQUIREMENT 的 AC 命令 | 已投票的 AC 命令是判据本体；"改标记不改命令"= 假红，"改命令不改标记"= 假绿（R3 角色红线：AC 归需求侧，字面串归设计侧定义） | 2a 需一次同步纪律：动字面串必须同笔改 `REQUIREMENT.md` 该条命令并在票面登记，否则按违规处理 |
| D6 | **每条标注独占一个块**（AC-13 的 9 条与 AC-5 的归属条目均"逐块打标"，禁一行汇总） | 一行 dump `G1 G4 G5 …` 交差 | 已投票命令实测两种都能"过"：`grep -oE … \| sort -u \| wc -l` 对挤在一行的标签同样计数 → 数量闸拦不住，必须加**堆叠探测**（出现次数 == 行数）与**逐块 id**（K4）。需求侧交接提示 ① 正是此点 | 交付稿写法更啰嗦；5-test 要多跑两条闸 |
| D7 | **采纳 🔴 的可选收紧式**作为 AC-4 tier-1 的**追加自检**（不替换已投票原式） | 只跑原式（放过"口令/键值对"形态） / 替换原式（动票面） | 对现产物 + `backup/` 实测 0 命中，"要并档请在 2-design 里显式决定"——本条即显式决定。并档后 `secret = "…"`、`api_key: …` 这类形态也被拦，且不动票面 | 交付稿正文今后不能出现 `key: value` 形态的字面示例（写示例时用 `<占位>` 而不是真值） |
| D8 | **tier-2 只对交付稿 `"$F"` 跑**，绝不扩到目录 | 全 `.specs/` 一把扫 | 需求侧交接提示 ②：pattern 文本自身在 `REQUIREMENT.md` 里就自匹配（`@` 与 `\.local` 出现在命令文本中），扩目录必然假红 | 敏感核对的覆盖面靠 tier-1 兜底（tier-1 已含 `backup/`） |
| D9 | **锚点必须可解析**：每条 `本项目已有/部分已有` 的 `data-anchor` 指向 `pages/`、`routes/`、`components/`、`models/`、`services/`、`engine/` 下**实际存在的路径**（可带 `:L-L` 行段） | 只写目录名 / 写"某处有实现" | AC-5 的存在理由就是消灭"看着像引用"的空标（G1 🔴 的假锚点教训）；K2 用 `[ -f ]` 逐条证伪 | 写稿时要真去开文件核对；BASELINE 与代码若不一致要先改 BASELINE（见 R1） |
| D10 | **AC-7/AC-8 的窗口从"词锚定"改"节点锚定"**：交付稿里「安全与审计」字样**只出现在 `<section id="sec-security">` 内**，侧边栏用 label 原文「审计日志」；「加密」的每一处都落在**自己的 `<p>…</p>`** 内 | 照已投票命令原样跑 / 改 AC 命令文本 | 已实测出假绿：把「安全与审计」写进导航后，`awk '/安全与审计/{f=1}…'` 的窗口起点漂到导航段，安全段漏写边界句仍判 1；`id` 锚定版正确判 0。票面命令不改（它在合格稿上同判 1），但 5-test 必须跑加严版 | 交付稿要接受一条"未进票面"的加严闸；域名措辞受约束（不能自由改写成"安全与合规"） |
| D11 | 交付稿的**敏感面自约束**：正文**不得整表搬运 BASELINE §4 的 S1-S10 攻击面清单**，只在各自所属域写限定式边界句 | 把 10 条边界一次性列成"平台弱点总表" | `backend/routes/artifact.py:10-26` 的 `GET /api/changes/{id}/{artifact}` 对 `.md` 产物**无鉴权**可读（S10），交付稿是外发面：一份"弱点目录"比分散的限定句危险得多 | 想一次看全攻击面的人要回 BASELINE（内部件，本就受 localhost 限定），而非交付稿 |
| D12 | **交付稿不写任何实现方案**（对 12 个需代码议题只写"是什么/怎样算通过 + 归属/标注 + 去向"），两条架构级议题只登记不自设计 | 顺手给沙箱/RAG 画技术方案 | R3 角色红线 + R7.1（需代码议题须新 change）+ 交棒硬边界原文"不要当普通功能设计掉进 2-design" | 读者在交付稿里看不到"打算怎么做"，需另开 change 才有——这是有意的 |

### 1.4 上游（需求门 G2）四条交接提示 → 本设计的处置

| 提示 | 处置 | 落点 |
|---|---|---|
| ① AC-13 的 9 条须**逐块打标**，标记形态归 2a，改了要同步命令 | 采纳：D6（逐块 + `id="vb-G<n>"` + `data-from`）＋ K4 堆叠探测；字面串接口由 D5 交 2a 一次同步 | D5/D6/§1.5/K4 |
| ② tier-2 **只跑交付稿**，别扩目录 | 采纳为硬约束（D8），并把 tier-1/tier-2 的作用范围在 §1.5 命令块里逐条写死 | D8/§1.5 |
| ③ 🔴 给了一个可选收紧的 tier-1 扩展式（现产物 0 误报），"要并档请在 2-design 显式决定" | **显式决定并档**（D7），作为交付前自检的一部分；不改已投票原式 | D7/§1.5/§7 |
| ④ 人工 5 项仍挂（① `product-design.html` 存在性卡 2a 开工，不卡 2-design） | 本阶段不因它停（R18.1：偏好/歧义项不阻塞无依赖的设计步骤）。交付稿路径由 `F=` 单行赋值，①/②两路对本设计都成立；STATE 阻塞表原样保留，等人工 | §0/§6/STATE |

---

## 1.5 交付稿标记契约与对账闸（本设计的核心接口）

> 这节是交付稿的"接口定义"：左边是**已投票 AC 的字面判据**，右边是 2a/4-dev 必须兑现的**标记形态**，最右是设计侧新增的**加严闸**（不进票面、但交付前必须全绿）。2a 换视觉/换 class 名的唯一前提：同笔改左边命令并记票面（D5）。

| AC | 已投票判据（字面串） | 交付稿必须兑现的标记形态 | 设计侧加严闸 |
|---|---|---|---|
| AC-1 / AC-6 | 原型内数字与 BASELINE 一致；`grep -nE "校准基线" "$F" \| head -1` 非空且同行含 7-40 hex SHA ＋ 日期 | 头部一行：`校准基线：<git rev-parse --short HEAD 的 7-40 hex> · <YYYY-MM-DD> · 页面 32 / 端点 168 / 域 11`，数字全部**写派生命令的现算结果**，正文其余处禁重复硬编码 | **K1** 结构计数对账：域章数 == `BASELINE §2` 现算域数（11）、page 块数 == 32、13 入口 == `App.tsx` 现算 label 数 |
| AC-2 | `grep -c 'class="page-block"' "$F"` ≥32 ＋ 侧边栏 13 入口全出现 | 每页一个 `<div class="page-block" id="pg-<PageName>" data-page="<PageName>" data-domain="<域名>">`（**class 字面串不改**）；导航用 `data-nav="<label 原文>"` ×13 | **K1** 页名集合双向对账 · **K5** 入口 label 集合对账 |
| AC-5 | `grep -E "本项目已有\|部分已有" "$F" \| grep -vcE "pages/\|routes/\|…"` → 0 ＋ 堆叠探测 | 归属只写在 `data-owner`，且**同一行**必带 `data-anchor="<真实路径>"`；一行一块 | **K2** 锚点 `[ -f ]` 逐条存在性 · **K3** 四值闭集 · **K4b** 堆叠探测 |
| AC-7 | `awk '/安全与审计/{f=1} f{print} f&&/<\/section>/{f=0}' \| grep -cE "X-User-Id\|回落"` ≥1 ＋ 禁词命令 0 | 边界句写在 `<section id="sec-security"> … </section>` 之内；「安全与审计」字样在全文**仅此一处**（导航写 label 原文「审计日志」） | **K7** 节点锚定版同条命令（`awk '/<section id="sec-security">/{f=1}…'`）→ 必须 ≥1 |
| AC-8 | `awk '/加密/{f=1} f{print} f&&/<\/p>/{f=0}' \| grep -cE "ENCRYPTION_KEY"` ≥1 ＋ 同窗口 `无 KDF\|零填充` ≥1 | 每一处含「加密」的句子独占**一个 `<p>…</p>`**，段内同行含 `ENCRYPTION_KEY` 与 S2 限定语 | **K8** 逐段同行判定：`grep -E "加密" "$F" \| grep -vcE "ENCRYPTION_KEY"` → 0 ＋ 同法核限定语 → 0 |
| AC-9 | `grep -c "<管理员口令>" "$F"` ≥1 | 登录态示例显示字面量 `<管理员口令>`（HTML 里转义书写，grep 命中原文） | 与 D7 收紧式同跑（示例键值一律 `<占位>`） |
| AC-10 | `RESEARCH §2` 去向列第二列 0 ＋ 12 slug 计数不变式 | 交付稿只**引用** slug（`<code>` 原样），12 条去向各带 `data-from`/去向标注；不重算不重述方案 | **K4** `diff`（RESEARCH 现算 12 ↔ 交付稿 `data-slug` 集）→ 空 |
| AC-11 | 数量地板 ≥6 ＋ UAT-6 逐处 | 六处各一个具名块：`<section class="notice" id="nb-<语义名>" data-state="未接入\|演示边界\|规划中">`（语义名 = token-usage / mcp-tool / trace-viewer / knowledge-rag / security-page / assembly-view） | **K6** `grep -oE 'id="nb-[a-z-]+"[^>]*data-state="…"' \| sort -u \| wc -l` → **恰好 6**（数量地板只防"漏光"，不防"一处代表全部"） |
| AC-13 | `grep -oE "调研结论[ =]*G[0-9]+" \| sort -u \| wc -l` → 9 ＋ UAT-7 | 每条融入一个 `<div class="view-block" id="vb-G<n>" data-from="G<n>">`，块内**一行**写 `来源：调研结论 G<n>`；②的调研局限单独成节 | **K4** 融入块数 == `RESEARCH §2` 现算融入条数（当前 9）且 `occ == lines`；**K9** `id="vb-G<n>"` 集合 == 现算 G 号集合 → diff 空 |
| AC-3 | 加强版 grep → 0（exit 1） | 无 `<link>`/`<script src>`/`fetch(`；来源引用 `<a href="https://…">` **必须保留**（R6.2，删它才是违规） | 交付前跑同一条命令，另核 `wc -c "$F"` ≤ 2000000 |
| AC-4 | tier-1（含 `backup/`，`--exclude=CHANGE.md`）0 命中；tier-2 只跑 `"$F"` | 全产物零凭据形态、示例全合成 | **D7 并档**：追加跑收紧式 `(password\|passwd\|token\|secret\|api_key)["' ]*[:=]["' ]*[A-Za-z0-9._!@#%^&*-]{4,}`（现产物 + `backup/` 实测 0 命中） |
| AC-12 | `git diff --name-only b15c4554..HEAD \| grep -vcE "^(\.specs/\|STATE\.md)"` → 0 | 本设计与其后所有提交守此边界 | 每次 commit 后复跑（本阶段出口已复跑，见 §7） |

**K6b（视觉一致性）**：交付稿 `:root` 里出现的每个变量，其**变量名与值**都必须能在 `frontend/src/styles/tokens.css` 找到同名同值声明——`comm -13 <(tokens 变量对) <(稿内变量对)` → 空（自造变量如 `--radius-legacy` 会被这一步拦下，已实测）。

---

## 2. 数据流 / 架构图

```
      ┌──────────────────────── 只读真源（唯一） ────────────────────────┐
      │ frontend/src/App.tsx        NAV 13 label · 32 页挂载 · TABS 5   │
      │ frontend/src/styles/tokens.css   51 个变量（实际值）             │
      │ BASELINE-code-facts.md      32/168/11/26 · 12 行域表 · S1-S10   │
      │ RESEARCH-competitors.md     G1-G15 去向 · 9 融入 · 12 slug      │
      │ CONTEXT.md §15              归属四值 / 标注三态 / 已锁决策        │
      └───────┬──────────────────────────────────────────┬──────────────┘
              │ 派生（awk/grep 现算，禁手抄）              │ 措辞/术语逐字采用
              v                                          v
   ┌──────────────────────── DESIGN §1.5 标记契约 ────────────────────────┐
   │  page-block ×32(+外壳) · data-nav ×13 · data-owner 四值闭集 ·        │
   │  data-state 三态闭集 · notice id="nb-*" ×6 · view-block id="vb-G*" ×9 │
   │  sec-security 单点措辞 · <p> 逐段加密限定 · <管理员口令> · 合成数据    │
   └───────┬──────────────────────────────────────────────┬─────────────┘
           │ 2a：视觉基线（间距/字号/组件长相/导航形态）      │ 4-dev：写文件
           v                                              v
   .specs/product-prototype-refresh/UI-DESIGN.md   product-design.html  ← 交付物（≤2MB，浏览器直开）
                                                          │
                          ┌───────────────────────────────┴───────────────┐
                          v                                               v
              已投票 AC 命令（13 条，需求侧）                   K1-K9 加严闸（设计侧）
                          └───────────────────────┬───────────────────────┘
                                                  v
                                    5-test 逐条勾清单 + 6-review + STATE/票面
```

**依赖方向（硬约束）**：`代码 → BASELINE/RESEARCH → DESIGN 契约 → 交付稿 → 验收命令`，**单向**。交付稿永不成为任何数字的真源；`frontend/`、`backend/` 永不被本 change 写；`README.md` 的回写走另一 change（`docs-drift-resync`）。

---

## 3. 关键状态机

**交付稿条目状态机**（写入即受闸；任一闸红 → 不得进入票面）：

```
[草稿条目]
   │ 定归属（四值闭集 K3）+ 定标注（三态闭集 K3）
   ├─ 归属∈{本项目已有,部分已有} ─需─> [挂 data-anchor] ─K2 [ -f ]─┬─ 不存在 ─> 改 BASELINE 或降级归属（禁留假锚点）
   │                                                            └─ 存在 ─> [可呈现]
   ├─ 归属=缺失* ─需─> [挂 data-slug + 去向] ─K4─ diff(RESEARCH §2) ─> [可呈现（禁写方案 D12）]
   └─ 竞品融入 ─需─> [独立 vb-G* 块 + 逐块来源行] ─K4/K9─> [可呈现]
[可呈现] ──K1/K5/K6/K6b/K7/K8──> [自检全绿] ──票面──> [冻结为交付物] ──代码漂移──> [S-align 判过期] ──重算──> [草稿]
```

**两轴标注的合法组合**（D4 的可执行形式；5-test 按此抽查，UAT-6 不代替逐处核对）：

| 归属 \ 标注 | 未接入 | 演示边界 | 规划中 |
|---|---|---|---|
| 本项目已有 | ✗（既有能力不得画成没接；除非它是孤儿/边界条 → 应改判归属） | ✓（S1-S10 类"只在演示语境成立"） | ✗（既有 ≠ 规划） |
| 部分已有（须点明缺哪半条腿） | ✓（六处待标注里的壳能力多属此） | ✓ | △（缺的半条腿已登记议题时） |
| 缺失-竞品建议新增 | ✗ | ✗（禁把竞品能力画成我们的演示边界） | ✓（带 slug + 去向） |
| 缺失 | △ | ✗ | ✓ |

---

## 4. ADR 索引

- `@.specs/adr/001-prototype-doc-zero-dependency.md` —— 交付稿形态：零依赖单文件 HTML（排除构建链/CDN/位图）。低可逆：一旦交付，下游（S-align、`docs-drift-resync`、票面 AC 命令）都按此假设。
- `@.specs/adr/002-single-source-derivation-gates.md` —— 「单处真源 + 多处 diff 派生闸」范式从 RESEARCH 计数不变式推广为交付稿的通用纪律（K1-K9）。低可逆：改派生方式 = 动所有文档类 AC 的判据。
- `@.specs/adr/003-two-axes-ownership-and-state.md` —— 归属四值与标注三态**永不合并**，分属性承载，值域闭集。低可逆：合并即 AC-5/AC-11/AC-13 三条判据互相失效。

（本 change 无 ARCHITECTURE.md，故不 supersede 任何既有 ADR；`agent-execution-sandbox`、`knowledge-rag-retrieval` 两条架构级议题的 ADR 归属其各自新 change，见 §6。）

---

## 5. 风险

| # | 风险 | 影响 | 概率 | 缓解 |
|---|---|---|---|---|
| R1 | **BASELINE 与代码不一致被交付稿继承**（本轮实测到一例：§2 行 1 记 `Detail`「含 6 个 tab 组件」，代码 `frontend/src/pages/Detail.tsx:9` 的 `TABS` 与 `*Tab` import 均为 **5**） | 交付稿写"6 个 tab"→ 假锚点，且 AC-1 的"数字与 BASELINE 一致"会把错数字固化 | 中 | **本设计不修 BASELINE**（已投票工件，R3 归口需求侧）：交付稿一律**按代码实测值**写（D9/K2 双闸），把该差异作为**第 8 条漂移**在 §7 显式上报需求侧改一行；2a/4-dev 引用 tab 数时以 `TABS` 长度为准。禁止"两边都写"式含糊 |
| R2 | **词锚定判据可被假绿绕过**（AC-7/AC-8 的 `awk` 窗口起点是中文措辞；本轮实测：「安全与审计」出现在导航时，安全段漏写边界句仍判 1；`id` 锚定版判 0） | 安全域措辞不合格却能过票 | 高（已复现） | D10 + K7/K8 加严闸；5-test 必须跑"词锚 + 节点锚"两版，不一致即判不合格并回到交付稿（不改票面命令） |
| R3 | **数量型闸被"堆叠"糊过**（`sort -u \| wc -l` 对挤在一行的 9 个 G 号同样给 9；实测 2 标签挤 1 行 → `occ=2 lines=1`） | AC-5/AC-13 的"逐块"意图变空文 | 中 | D6 + K4b 堆叠探测（出现次数 == 行数）+ K9（逐块 id 集合 diff） |
| R4 | **交付稿成第二真源 / 二次漂移**（有人开始在原型里"顺手改数字"，README 的历史就这么来的） | 又一份需要 `docs-drift-resync` 的过时文档 | 中 | D2/K1/K4/K6b 派生对账 + AC-6 校准基线（7-40 hex SHA + 日期 + 页面/端点数）+ §2 单向依赖声明 |
| R5 | **交付稿外发泄面**（它会被转发；`artifact.py:10-26` 的 GET 无鉴权可读 `.md` 产物，`product-design.html` 若被改名成 `.md` 就会被 `artifact=DESIGN` 的子串匹配读走） | 把 S1-S10 弱点清单集中送出去 | 中 | D11（禁整表搬 S1-S10，只在所属域写限定句）+ 文件名**必须保持 `.html`**（不是 `.md`，故不进该读取面的 `SAFE_NAMES`/`.md` 判定）+ AC-4 两级 + D7 收紧式 |
| R6 | **2a 单方面改标记**（class/id 换名） | 交付前 9 条 AC 集体假红，或改了命令没改稿 → 假绿 | 中 | D5 的"同笔同步"规则 + §1.5 把字面串写死成接口；票面登记；K1-K9 在改后必跑 |
| R7 | **范围诱惑**：`trace-viewer-reattach` 之类"接条线就行"的议题被顺手实现；或两条架构级议题被当普通功能设计掉 | 破 AC-12 与 R7.1，交付物变成未评审代码的载体 | 中 | §6 圈死 + R3.1（Architect 零代码）+ 出口必跑 AC-12 diff 命令（§7 实跑 0） |
| R8 | **体积/首屏预算**（1.5-2.5k 行 HTML + 内联 CSS，NFR ≤2 MB / ≤2 s） | 首屏卡顿或超预算 | 低 | 禁位图与 base64（仓库根 `demo.gif` 2.8 MB 是反例）；图形只画必要框图；交付前 `wc -c "$F" ≤ 2000000` 一次性核 |
| R9 | **长期债务**：交付稿的 K 系列闸依赖表格行形（`\| N \|`）与 `data-*` 属性名；BASELINE/RESEARCH 一旦重排表格或改列序，派生命令静默失配 | 闸"绿"但不再对账 | 中 | 把 K 系列命令集中写进 §1.5 与 ADR-002（单处可改）；`docs-drift-resync` 的 AC 里加一条"跑通全部 K 命令"；不另立脚本（禁造第二工具） |

---

## 6. 不在范围

- **12 个需代码议题的实现**（唯一真源 `RESEARCH-competitors.md` §2 反引号 slug 去重集，现 12 条）：`token-cost-ledger`、`unified-inbox`、`trace-viewer-reattach`、`model-verification-tier`、`separation-of-duty-gate`、`skill-capture-from-run`、`mcp-tool-runtime`、`inbound-channel-session`、`approval-ladder-autonomy`、`human-agent-assignment-board`（边界待定）、**`agent-execution-sandbox`**、**`knowledge-rag-retrieval`**（后两条**架构级**：会分别破"单机无容器/无沙箱"与"SQLite 单体 + 文档型知识产物"两条容量边界 → 必须**另开 change ＋ 各自 ADR**，本 DESIGN 不出方案，交付稿里也只以 `缺失-竞品建议新增 + 规划中 + slug` 呈现）。
- 交付稿本体 `product-design.html`（属 4-dev）、视觉基线 `UI-DESIGN.md`（属 2a）、任务拆解（属 3-task）、验证矩阵与 UAT（属 5-test）。
- 生成器/校验脚本落 `frontend/` 或 `backend/`（AC-12 禁止）；对账一律用 §1.5 的单行命令，不引入第二套工具（D2/R9）。
- README.md 回写（`docs-drift-resync`）、孤儿页面/组件清理（out-2）、真实数据接入（out-1）、可交互高保真原型、市场定位与定价（out-4）。
- 人工 5 项拍板（`STATE.md` 阻塞表原样保留）：`product-design.html` ①/②、3 个扩展候选、Buzzz 官网、AgentOS 三义、D-discovery 编制。本设计对 ①/② **两路兼容**（`F=` 单行赋值），故不卡本阶段。

---

## 7. 阶段出口自检（本阶段实跑，非复述）

| 项 | 命令（仓库根执行） | 本轮实测 |
|---|---|---|
| 零 L1 写入 | `git diff --name-only b15c4554..HEAD \| grep -vcE "^(\.specs/\|STATE\.md)"` | `0` ✅（本阶段提交后复跑，仍 `0`） |
| tier-1 敏感面（含 `backup/`） | AC-4 原式（`--exclude=CHANGE.md`） | `0` 命中 / exit 1 ✅ |
| tier-1 并档收紧式（D7） | `grep -rnE "(password\|passwd\|token\|secret\|api_key)[\"' ]*[:=][\"' ]*[A-Za-z0-9._!@#%^&*-]{4,}" .specs/product-prototype-refresh/ backup/` | `0` 命中 ✅（含本 DESIGN.md 自身与 3 份 ADR） |
| 12 slug 三方一致 | `RESEARCH §2` 的计数不变式三件套 | `12 / SAME / SAME` ✅ |
| 页面集真源可信 | `diff`（App.tsx 派生 ↔ BASELINE §2 派生） | 完全一致（32/32）✅ —— 唯 §2 行 1 的**括号内** tab 数与代码不符（R1） |
| AC-1 基准复现 | BASELINE §1 三条命令 | `32` / `168` / `13` ✅ |
| 9 条融入派生 | `awk -F'\|' '/^\| G[0-9]+/{print $2,$9}' RESEARCH-competitors.md \| grep 融入原型` | `G1 G4 G5 G6 G7 G8 G9 G10 G13` = 9 ✅ |
| K 系列闸可用性 | 在 `page-block`/`nb-*`/`vb-G*`/token 四类探针样本上跑 K1-K9 | 全部按预期"缺则报缺、多则报多"（缺 31 页 / 虚构页 `Bogus` / 自造变量 `--radius-legacy` / 六处恰好 6 / 两标签挤一行被 `occ≠lines` 拦下）✅ |
| 交付稿存在性 | `git log --all --oneline -- '*product-design*'` | 空 —— 仓库无既有稿，人工 ① 仍待拍板（不卡本阶段） |

**上报人工/需求侧一行**（R1）：`BASELINE-code-facts.md:35` 的「`Detail`（含 6 个 tab 组件）」应为 **5**（`frontend/src/pages/Detail.tsx:9` `TABS` 与 5 个 `*Tab` import 同判）。属已投票工件，本阶段不改，请需求侧改该单元格。

---

## 9. 架构沉淀建议（供 `A-evolve` 同步 · 软约束）

### 9.1 新增的可复用抽象（建议 append 到 CONTEXT「既有抽象索引」）

| 路径 | 能力 | 触发场景 | 复用建议 |
|---|---|---|---|
| `.specs/product-prototype-refresh/DESIGN.md` §1.5（K1-K9 对账闸，非代码文件） | 让"给人读的文档"变成**可 grep 的验收面对象**：结构锚点（`class`/`data-*`/`id`）+ 派生 diff + 节点锚定窗口 | ① `docs-drift-resync` 校 README 与代码是否一致；② 任何以文档为交付物的 change（架构文档、迁移说明、运维手册）；③ 5-test 需要"文档级 UAT 机器化"时 | 文档型 change 一律先写"标记契约 + K 系列派生闸"再写文档本体；数量型 `grep -c` 一律配 `occ == lines` 堆叠探测 |

### 9.2 新增 / 改变的项目级技术决策（建议 append 到 CONTEXT「已锁技术决策」）

| 决策 | 取值 | 影响范围 | 推翻代价 |
|---|---|---|---|
| 文档型交付物的验收判据 = **节点/属性锚定**，不用中文措辞或词边界当窗口起点 | `id="sec-*"` / `<p>` 段内 / `data-*` 属性 | 本 change 全部文档 AC；未来任何文档 AC | 低（改 AC 命令文本 + 交付稿标记，但会连带已投票票面重开） |
| 数字与清单只从**唯一真源**派生，交付物内禁手抄、禁造第二工具 | K1-K9 单行命令 | 所有 `.specs/` 产物与 README | 中（要逐处改回引用式） |
| 对外可转发的产物**不整表搬运内部弱点清单**，只写所属域的限定式边界句 | D11 | 任何面向外发的文档/截图/导出 | 低（但一旦整表外发，撤回不了） |

### 9.3 新增 / 修改的跨模块契约

```
- 无 API / Schema / 事件总线变更（本 change 零 L1 写入）。
- 有一条"文档 ↔ 验收"契约值得记：交付稿的 class/data-*/id 字面串 = 需求侧 AC 命令的接口名，改任一侧必须同笔改另一侧（D5）。
- 记录一条既有事实，供未来禁动判断：backend/routes/artifact.py 的 GET 面按"子串 + endswith('.md')"匹配，
  故 .md 产物（含 DESIGN.md）对 localhost 无鉴权可读；文档型交付物保持 .html 后缀即不进该面。
```

### 9.4 新增 / 升级的依赖

```
N/A —— 零新增依赖（无 npm/pip 包、无构建工具、无外部资源；交付物只内联既有 tokens.css 的实际值）。
```

### 9.5 禁动清单变化

```
- 新增禁动：交付稿正文禁整表搬 BASELINE §4 的 S1-S10 清单（只写所属域限定句）；文档型交付物保持 .html 后缀，
  禁改名为 .md 落进无鉴权 GET 面（D11/R5）。
- 新增禁动：改 AC 命令引用的字面标记必须同笔改交付稿（D5），禁"只改一边"。
- 解禁：无。
- 建议补做（不阻塞）：项目无 .specs/ARCHITECTURE.md，而 `agent-execution-sandbox`、`knowledge-rag-retrieval`
  两条架构级议题要开 ADR —— 届时先跑 A-architect 建立项目级架构基线，再让那两条议题的 ADR 有可依之处。
```

---

> 本文件不包含完整代码实现（R3.1）：仅有标记契约、属性签名、单行派生/校验命令与状态机。`product-design.html` 由 4-dev 按 §1.5 写、视觉基线由 2a 出。
