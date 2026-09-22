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
- backend/parsers/gate.py           —— 只读，用于 §8 票面格式（产品的「门禁」视图读的是**工件文件里的票面块**：`change_detail.py:30-39` 对 7 类工件逐个调 `parse_gates`；**评论不被解析**，故票面必须在工件里落一份）

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
| D3 | 结构四层 + 附录：`头部/校准基线 → 13 入口导航 → 11 能力域 section → 32 个 page-block`，附录含调研局限、9 条融入块、12 slug 去向、**边界句所在域索引：每条只写「S 号 → 所属域 section 的 `id` 锚点」，禁复述限定句文本、禁在附录出现域名字样；该节标题一律写作「边界句所在域索引」，标题与正文都不得出现 `S1-S10` 字样**（🔴 复验轮：那是 K11 收窄式的假红源）（🔴 B-1 的集中清单问题 + 🟩 C2 的 D10 冲突一并收口：附录若写「S1 安全与审计：…」，票面 AC-7 的词锚窗口就漂到附录、K7 节点锚判 0，按 §1.5"两版不一致即不合格"该稿必红——**照设计自己的结构写会得到必红的稿子**）。每条边界句全文只出现一次、在所属域 section 内 | 按"页面"平铺（不按域）/ 按竞品结论为主线 | AC-1 与 AC-2 要"11 域全覆盖 + 32 页逐名 + 13 入口"三套坐标同时可见；域为章、页为块才能同时满足，且孤儿页面（AC-11 禁作能力页）能放进非域位置 | 交付稿偏长（预期 ~1.5-2.5k 行 HTML）；跨层导航必须靠稳定 id |
| D4 | **两轴标签保持正交、分属性承载**：`data-owner`（归属四值）/ `data-state`（标注三态），且两套枚举值各自闭集 | 合并成一个"状态"列（AI 最容易犯的塌缩）/ 用自由文本"部分可用" | `CONTEXT.md` §15.1 已把两轴拆成两个术语；AC-5 管"是不是我们的现状"，AC-11 管"进没进界面"，AC-13 注脚（`:120`）明确二者不可互相代偿。塌成一列会让 AC-11 的六处逐处判据失去抓手 | 每个条目要写两个属性，交付稿稍长；需在 K3 做值域闭集核对 |
| D5 | **标记契约**（§1.5）是交付稿的接口：AC 命令里出现的字面串是**接口名**，2a 可自由改视觉与排版，**不得单方面改字面串** | 让 2a/4-dev 随意命名 class，再回头改 REQUIREMENT 的 AC 命令 | 已投票的 AC 命令是判据本体；"改标记不改命令"= 假红，"改命令不改标记"= 假绿（R3 角色红线：AC 归需求侧，字面串归设计侧定义） | 2a 需一次同步纪律：动字面串必须同笔改 `REQUIREMENT.md` 该条命令并在票面登记，否则按违规处理 |
| D6 | **每条标注独占一个块**（AC-13 的 9 条与 AC-5 的归属条目均"逐块打标"，禁一行汇总） | 一行 dump `G1 G4 G5 …` 交差 | 已投票命令实测两种都能"过"：`grep -oE … \| sort -u \| wc -l` 对挤在一行的标签同样计数 → 数量闸拦不住，必须加**堆叠探测**（出现次数 == 行数）与**逐块 id**（K4）。需求侧交接提示 ① 正是此点 | 交付稿写法更啰嗦；5-test 要多跑两条闸 |
| D7 | **采纳 🔴 的可选收紧式**作为 AC-4 tier-1 的**追加自检**（不替换已投票原式） | 只跑原式（放过"口令/键值对"形态） / 替换原式（动票面） | 对现产物 + `backup/` 实测 0 命中，"要并档请在 2-design 里显式决定"——本条即显式决定。并档后 `secret = "…"`、`api_key: …` 这类形态也被拦，且不动票面 | 交付稿正文今后不能出现 `key: value` 形态的字面示例（写示例时用 `<占位>` 而不是真值） |
| D8 | **tier-2 只对交付稿 `"$F"` 跑**，绝不扩到目录 | 全 `.specs/` 一把扫 | 需求侧交接提示 ②：pattern 文本自身在 `REQUIREMENT.md` 里就自匹配（`@` 与 `\.local` 出现在命令文本中），扩目录必然假红 | 敏感核对的覆盖面靠 tier-1 兜底（tier-1 已含 `backup/`） |
| D9 | **锚点必须可解析**：每条 `本项目已有/部分已有` 的 `data-anchor` 指向 `pages/`、`routes/`、`components/`、`models/`、`services/`、`engine/` 下**实际存在的路径**（可带 `:L-L` 行段） | 只写目录名 / 写"某处有实现" | AC-5 的存在理由就是消灭"看着像引用"的空标（G1 🔴 的假锚点教训）；K2 用 `[ -f ]` 逐条证伪 | 写稿时要真去开文件核对；BASELINE 与代码若不一致要先改 BASELINE（见 R1） |
| D10 | **AC-7/AC-8 的窗口从"词锚定"改"节点锚定"**：交付稿里「安全与审计」字样**只出现在 `<section id="sec-security">` 内**，侧边栏用 label 原文「审计日志」；「加密」的每一处都落在**自己的 `<p>…</p>`** 内 | 照已投票命令原样跑 / 改 AC 命令文本 | 已实测出假绿：把「安全与审计」写进导航后，`awk '/安全与审计/{f=1}…'` 的窗口起点漂到导航段，安全段漏写边界句仍判 1；`id` 锚定版正确判 0。票面命令不改（它在合格稿上同判 1），但 5-test 必须跑加严版 | 交付稿要接受一条"未进票面"的加严闸；域名措辞受约束（不能自由改写成"安全与合规"） |
| D11 | 交付稿的**敏感面自约束**：正文**与附录都不得集中列 BASELINE §4 的 S1-S10 攻击面清单**（索引化只允许 `id` 锚点），只在各自所属域写限定式边界句；**判据补齐**：K11 禁词闸机验措辞 + UAT-8 人工勾语义（此前 D11 零闸＝"声明有判据、实际无判据"，🔴 B-1） | 把 10 条边界一次性列成"平台弱点总表"，或附录用"边界句汇总"名义集中搬正文 | `backend/routes/artifact.py:10-26` 的 `GET /api/changes/{id}/{artifact}` 对 `.md` 产物**无鉴权**可读（S10），交付稿是外发面：一份"弱点目录"比分散的限定句危险得多。**🔴 B-2 纠正推论范围**：文件名保持 `.html` 只避开 `artifact.py` 这一层，**不是交付稿的防线**——`admin_api.py:126-135` 的 `GET /api/admin/files/{path:path}` 既不 `get_current_user` 也不 `has_permission`，唯一守卫是 `'..' in path`，而 `os.path.join(_prompts_dir(), "/etc/hosts")` 会**丢掉前缀**（本轮实测语义），故能访问本机 API 者可读仓库内**任何**文件，`.md`/`.html` 在它面前无区别；同文件 PUT（`:139-143`）反而两条守卫齐备，是现成的对照实现 | 想一次看全攻击面的人要回 BASELINE（内部件）；而"内部件受 localhost 限定"这层**已被上面那条读绕过** → 登记 `admin-file-read-jail`（§6），属新 change 的 L1 修复，本 change 不动代码 |
| D12 | **交付稿不写任何实现方案**（对 12 个需代码议题只写"是什么/怎样算通过 + 归属/标注 + 去向"），两条架构级议题只登记不自设计 | 顺手给沙箱/RAG 画技术方案 | R3 角色红线 + R7.1（需代码议题须新 change）+ 交棒硬边界原文"不要当普通功能设计掉进 2-design" | 读者在交付稿里看不到"打算怎么做"，需另开 change 才有——这是有意的 |

| D13 | **每条记录里，AC 命令所用的枚举字面串只出现一次**：枚举值写在属性里（`data-owner="本项目已有"`），可见徽标文案由 CSS 的 `::after` 配语义 class（`.chip-o1`～`.chip-o4`、`.chip-s1`～`.chip-s3`）提供，**CSS 里禁重抄枚举字面串** | 属性 + 可见文本双写（最自然的写法）/ 纯文本无属性 | 本轮实测的**假红通道**：双写形态下 32 行合格骨架被 AC-5 的堆叠探测判为 `occ=64 / lines=32` → 一份完全合规的稿子必然红；改单写后 `occ=32 / lines=32` 通过，且 AC-5a（同行锚点共现）、AC-2、AC-11 地板、AC-13 唯一数、K6 六处全部不退色 | 屏幕阅读器读不到徽标文字 → 可见文案要在 `<abbr>`/`aria-label` 里用**不同词**（如"已有""部分""竞品建议""缺失"），禁再用枚举原串，否则又变双写 |
| D14 | 交付稿**必须完整呈现 12 个 slug**（`data-slug` 或 `<code>` 原样，AC-10 的 v2 呈现要求），K4 才能拿 `RESEARCH §2` 现算集做双向 diff | 只写"另有 12 条议题见 RESEARCH" | 只写指句 → K4 无从 diff，"写了没落"重新变成无人验的口子（正是 AC-13 ③ 记录过的那类失效） | 交付稿多一张 12 行表；人工若砍扩展候选（人工 ②），该表要跟着回算 |
| D15 | **票面格式按产品的解析器写**（详见 §8 五条）：门名/问题/票行/结果行各有固定形态，票面块**必须落在工件里**（产品只解析工件，不解析评论） | 只把票面写在评论里；或把票写成表格行/列表项 | 实测：写成表格行 → `votes` 空、整块静默丢弃，门禁视图表现为"没投过"；正文裸写票面标记 → 开假门收养真票行。门禁可见性是交付链的一部分，不是排版（R6.2：判据要能被产品自己复述） | 新增一条"跑 `parse_gates` 看能不能解析出本门"的自检（已入 §7） |
| D16 | **设计侧新闸一律"属性顺序无关"**（K3b / K6 重写；已投票 AC 用简单 grep 不受影响） | 把同标签属性书写顺序写进契约 | 🟦 陷阱二实测：非法组合倒序写一行，旧 K3b **静默漏检**（现式判 0、顺序无关式判 1）；`id` 与 `data-state` 倒序时旧 K6 数到 `1` 而真值是 `2`。HTML 属性顺序自由，未声明的顺序不能当接口 | 闸命令各长一行；K3b/K6 的既有样本复跑结论不变 |
| D17 | **含枚举字面串的行必须同行含路径子串**（不限"条目行"，正文与图例同守） | 图例用裸枚举句 | 🟦 陷阱一实测：图例写「归属取值有 本项目已有 / 部分已有 …」→ 已投票的 AC-5a 直接判 `1`（红），第一稿必撞；改成自带路径的写法（「本项目已有 = 能在 `frontend/src/pages/` 或 `backend/routes/` 指到实现」）→ `0`，且这句解释本来就该有 | 图例变长；正文提到归属值时要挂路径 |
| D18 | **闸清单禁写范围号，一律引用式**：非 §1.5 处一律写「K 系列闸（§1.5 现算）」，不写 `K1…K<n>` | 每处手抄当前范围 | G2 收口轮 🟩 抓到：我为加 K12 而 sed 过一轮范围号，结果 `DESIGN` 七处 ＋ `ADR-002` 一处仍写 `§1.5 现算的 K 系列` ——**这正是 D2「反对手抄」的微观实例**，只不过抄的不是数字是编号范围；范围号一过期就误导 2a/4-dev 少跑几条闸 | 引用处不如具体范围号直观，须靠 §1.5 的标题定位 |

### 1.4 上游（需求门 G2）五条交接提示 → 本设计的处置

| 提示 | 处置 | 落点 |
|---|---|---|
| ① AC-13 的 9 条须**逐块打标**，标记形态归 2a，改了要同步命令 | 采纳：D6（逐块 + `id="vb-G<n>"` + `data-from`）＋ K4b 堆叠探测 ＋ K9 集合 diff；字面串接口由 D5 交 2a 一次同步。**并复现到数字**：把 9 条挤成一行的反例，AC-13 原命令照样判 `9`（假绿），`occ=9 / lines=1` 与 K9（稿内 `vb-G*` 块数 0）双双拦下 | D5/D6/§1.5/K4b/K9 |
| ② tier-2 **只跑交付稿**，别扩目录 | 采纳为硬约束（D8），并把 tier-1/tier-2 的作用范围在 §1.5 命令块里逐条写死 | D8/§1.5 |
| ③ 🔴 给了一个可选收紧的 tier-1 扩展式（现产物 0 误报），"要并档请在 2-design 显式决定" | **显式决定并档**（D7）。本轮实测收益：对一份写了 `api_key = "<假值>"` 形态的反例，**已投票原式 0 命中、收紧式 1 命中** → 并档确有增量，且不动票面 | D7/§1.5/§7 |
| ④ 先验"验据"再拿它去验交付稿（🔴 两步法：反例必红／合格稿必绿；两份样本必须落在 `.specs/product-prototype-refresh/` **之外**；合格稿要含易误杀的真实形态） | **已执行**（见 §7.5）：合格稿 = 由 K1/K5 派生命令生成的 32 页骨架，内含 `<a href="https://…">` 来源链接、`data:` URI、内联 `<script>`/`<style>`、内联 SVG；样本落在仓库工作目录的 `scratch/`（**未进 `.specs/product-prototype-refresh/`**，故不污染 AC-4 tier-1）。跑出的两处**判据本身的问题**已进决策：D13（双写枚举串 → 合格稿被 AC-5b 假红）、D10/K7（词锚窗口假绿） | §7.5/D10/D13/K7 |
| ⑤ 人工 5 项拍板仍挂（`product-design.html` ①/② 卡 2a 开工等） | 本阶段不因它停（R18.1：偏好/歧义项不阻塞无依赖的设计步骤）。交付稿路径由 `F=` 单行赋值，①/② 两路对本设计都成立；STATE 阻塞表原样保留 | §0/§6/STATE |

---

## 1.5 交付稿标记契约与对账闸（本设计的核心接口）

> 这节是交付稿的"接口定义"：左边是**已投票 AC 的字面判据**，右边是 2a/4-dev 必须兑现的**标记形态**，最右是设计侧新增的**加严闸**（不进票面、但交付前必须全绿）。2a 换视觉/换 class 名的唯一前提：同笔改左边命令并记票面（D5）。

| AC | 已投票判据（字面串） | 交付稿必须兑现的标记形态 | 设计侧加严闸 |
|---|---|---|---|
| AC-1 / AC-6 | 原型内数字与 BASELINE 一致；`grep -nE "校准基线" "$F" \| head -1` 非空且同行含 7-40 hex SHA ＋ 日期 | 头部一行：`校准基线：<git rev-parse --short HEAD 的 7-40 hex> · <YYYY-MM-DD> · 页面 32 / 端点 168 / 域 11`，数字全部**写派生命令的现算结果**，正文其余处禁重复硬编码 | **K1** 结构计数对账：域章数 == `BASELINE §2` 现算行数是 **12**（能力域 11 ＋ 平台外壳 1，外壳不计入能力域，🟩 N2）、page 块数 == **32（含外壳 2 页：`LoginPage`/`UserCenter`）**、13 入口 == `App.tsx` 现算 label 数 |
| AC-2 | `grep -c 'class="page-block"' "$F"` ≥32 ＋ 侧边栏 13 入口全出现 | 每页一个 `<div class="page-block" id="pg-<PageName>" data-page="<PageName>" data-domain="<域名>">`（**class 字面串不改**）；导航用 `data-nav="<label 原文>"` ×13 | **K1** 页名集合双向对账 · **K5** 入口 label 集合对账 |
| AC-5 | `grep -E "本项目已有\|部分已有" "$F" \| grep -vcE "pages/\|routes/\|…"` → 0 ＋ 堆叠探测 | 归属只写在 `data-owner`，且**同一行**必带 `data-anchor="<真实路径>"`；一行一块；**枚举字面串每行只出现一次**（可见徽标走 CSS，见 D13） | **K2** 锚点 `[ -f ]` 逐条存在性 · **K3** 四值闭集 · **K3b** 两轴非法组合 · **K4b** 堆叠探测 |
| AC-7 | `awk '/安全与审计/{f=1} f{print} f&&/<\/section>/{f=0}' \| grep -cE "X-User-Id\|回落"` ≥1 ＋ 禁词命令 0 | 边界句写在 `<section class="domain" id="sec-security" …> … </section>` 之内；「安全与审计」字样在全文**仅此一个 section 内**（导航写 label 原文「审计日志」） | **K7** 节点锚定版：`awk '/<section class="domain" id="sec-security"/{f=1} f{print} f&&/<\/section>/{f=0}'` → 必须 ≥1 |
| AC-8 | `awk '/加密/{f=1} f{print} f&&/<\/p>/{f=0}' \| grep -cE "ENCRYPTION_KEY"` ≥1 ＋ 同窗口 `无 KDF\|零填充` ≥1 | 每一处含「加密」的句子独占**一个 `<p>…</p>`**，段内同行含 `ENCRYPTION_KEY` 与 S2 限定语 | **K8** 收窄式逐段同行判定：`grep -E "加密" "$F" \| grep -E "密钥\|API Key" \| grep -vcE "ENCRYPTION_KEY"` → 0（🔴 修正：旧式把传输加密句也算违规） |
| AC-9 | `grep -c "<管理员口令>" "$F"` ≥1 | 登录态示例显示字面量 `<管理员口令>`（HTML 里转义书写，grep 命中原文） | 与 D7 收紧式同跑（示例键值一律 `<占位>`） |
| AC-10 | `RESEARCH §2` 去向列第二列 0 ＋ 12 slug 计数不变式 | 交付稿只**引用** slug（`<code>` 原样），12 条去向各带 `data-from`/去向标注；不重算不重述方案 | **K4** `diff`（RESEARCH 现算 12 ↔ 交付稿 `data-slug` 集）→ 空 |
| AC-11 | 数量地板 ≥6 ＋ UAT-6 逐处 | 六处各一个具名块：`<section class="notice" data-state="未接入\|演示边界\|规划中" id="nb-<语义名>">`（D16：属性顺序自由，闸不得依赖顺序）（语义名 = token-usage / mcp-tool / trace-viewer / knowledge-rag / security-page / assembly-view） | **K6** `grep -oE 'id="nb-[a-z-]+"[^>]*data-state="…"' \| sort -u \| wc -l` → **恰好 6**（数量地板只防"漏光"，不防"一处代表全部"） |
| AC-13 | `grep -oE "调研结论[ =]*G[0-9]+" \| sort -u \| wc -l` → 9 ＋ UAT-7 | 每条融入一个 `<div class="view-block" id="vb-G<n>" data-from="G<n>">`，块内**一行**写 `来源：调研结论 G<n>`；②的调研局限单独成节 | **K4** 融入块数 == `RESEARCH §2` 现算融入条数（当前 9）且 `occ == lines`；**K9** `id="vb-G<n>"` 集合 == 现算 G 号集合 → diff 空 |
| AC-3 | 加强版 grep → 0（exit 1） | 无 `<link>`/`<script src>`/`fetch(`；来源引用 `<a href="https://…">` **必须保留**（R6.2，删它才是违规） | 交付前跑同一条命令，另核 `wc -c "$F"` ≤ 2000000 |
| AC-4 | tier-1（含 `backup/`，`--exclude=CHANGE.md`）0 命中；tier-2 只跑 `"$F"` | 全产物零凭据形态、示例全合成 | **D7 并档**：追加跑收紧式 `(password\|passwd\|token\|secret\|api_key)["' ]*[:=]["' ]*[A-Za-z0-9._!@#%^&*-]{4,}`（现产物 + `backup/` 实测 0 命中） |
| AC-12 | `git diff --name-only b15c4554..HEAD \| grep -vcE "^(\.specs/\|STATE\.md)"` → 0 | 本设计与其后所有提交守此边界 | 每次 commit 后复跑（本阶段出口已复跑，见 §7） |

**K6b（视觉一致性）**：交付稿 `:root` 里出现的每个变量，其**变量名与值**都必须能在 `frontend/src/styles/tokens.css` 找到同名同值声明——`comm -13 <(tokens 变量对) <(稿内变量对)` → 空（自造变量如 `--radius-legacy` 会被这一步拦下，已实测）。

**闸的命令形态**（2a/4-dev/5-test 一律照此，仓库根执行；改形态即改接口，须按 D5 同步）。两条前言约束：**D16** 设计侧新闸一律**同标签属性顺序无关**（HTML 属性顺序是自由的，未声明的顺序不构成接口）；**D17** 含枚举字面串的行**必须同行含路径子串**，不限条目行——图例与解释性正文同守，否则已投票的 AC-5a 会在第一稿上假红（🟦 实测：裸图例句判 `1`，自带路径的图例句判 `0`）：

```
K1  B=$(awk -F'|' '/^\| [0-9]+ \|/ || /^\| — \|/ {print $4}' .specs/product-prototype-refresh/BASELINE-code-facts.md \
       | tr '、' '\n' | sed -E 's/（.*//; s/[[:space:]]//g' | grep -vE '^$' | sort -u)
    D=$(grep -oE 'data-page="[^"]+"' "$F" | sed -E 's/data-page="([^"]+)"/\1/' | sort -u)
    comm -23 <(printf '%s\n' "$B") <(printf '%s\n' "$D")     # 缺页 → 空；| wc -l 应 0
    comm -13 <(printf '%s\n' "$B") <(printf '%s\n' "$D")     # 虚构页 → 空（防"稿里凭空多出的页"）
    echo "$B" | wc -l                                        # 32（与 AC-2 的 ≥32 同向）
K2  grep -oE 'data-anchor="[^"]+"' "$F" | sed -E 's/data-anchor="([^"]+)"/\1/; s/:[0-9]+(-[0-9]+)?$//' \
      | sort -u | while read -r p; do [ -f "$p" ] || echo "MISS $p"; done      # 空 = 绿
K3  grep -oE 'data-owner="[^"]+"' "$F" | sed -E 's/.*"(.*)"/\1/' | sort -u | grep -vE '^(本项目已有|部分已有|缺失-竞品建议新增|缺失)$'
    grep -oE 'data-state="[^"]+"' "$F" | sed -E 's/.*"(.*)"/\1/' | sort -u | grep -vE '^(未接入|演示边界|规划中)$'      # 两行均空
K3b awk '{own=""; sta=""}                                  # D16 顺序无关（旧式只看 data-owner 在前的行，倒序静默漏检：实测判 0）
       { if (match($0,/data-owner="[^"]+"/)) own=substr($0,RSTART+12,RLENGTH-13)
         if (match($0,/data-state="[^"]+"/))  sta=substr($0,RSTART+12,RLENGTH-13)
         if (own!="" && sta!="") print own"|"sta }' "$F" | sort -u \
      | grep -E '^(本项目已有\|(未接入|规划中)|缺失(-竞品建议新增)?\|(未接入|演示边界))$'      # 空 = 无非法组合（§3 矩阵）
K4  diff <(grep -oE '`[a-z]+(-[a-z]+)+`' .specs/product-prototype-refresh/RESEARCH-competitors.md | sort -u | grep -v human-approval) \
         <(grep -oE 'data-slug="[a-z-]+"' "$F" | sed -E 's/data-slug="([a-z-]+)"/`\1`/' | sort -u)      # 空 = 12 条齐
K4b test $(grep -oE '调研结论[ =]*G[0-9]+' "$F" | wc -l) -eq $(grep -cE '调研结论[ =]*G[0-9]+' "$F")    # 同行堆叠即红
K5  diff <(grep -oE "label: '[^']+'" frontend/src/App.tsx | sed -E "s/label: '([^']+)'/\1/" | sort -u) \
         <(grep -oE 'data-nav="[^"]+"' "$F" | sed -E 's/data-nav="([^"]+)"/\1/' | sort -u)              # 空 = 13 入口原文一致
K6  grep -oE '<section[^>]*>' "$F" | grep -E 'id="nb-[a-z-]+"' | grep -cE 'data-state="(未接入|演示边界|规划中)"'   # 恰好 6（D16；旧式 id 写后面会少数：实测判 1 vs 真值 2）
K6c grep -c 'class="domain"' "$F"                                                                      # 11 域 + 平台外壳 = 12
K7  awk '/<section class="domain" id="sec-security"/{f=1} f{print} f&&/<\/section>/{f=0}' "$F" | grep -cE 'X-User-Id|回落'   # ≥1
K8  grep -E '加密' "$F" | grep -E '密钥|API Key' | grep -vcE 'ENCRYPTION_KEY'      # 0（🔴 收窄式：只核密钥语义行，逐段同行，替代词锚窗口）
    # 旧式（少中间那一层 grep）三行样本实测判 2、收窄式判 1：旧式把与密钥无关的传输加密句也算违规，
    # 最坏失效是作者为过闸给传输句也贴上密钥限定语 → 凭空造出一句安全失真，正是 AC-8 / D11 要防的东西。
K9  diff <(awk -F'|' '/^\| G[0-9]+/{print $2,$9}' .specs/product-prototype-refresh/RESEARCH-competitors.md \
             | grep 融入原型 | grep -oE 'G[0-9]+' | sort -u) \
         <(grep -oE 'id="vb-G[0-9]+"' "$F" | sed -E 's/id="vb-(G[0-9]+)"/\1/' | sort -u)                # 空 = 9 条逐块齐
K10 grep -cE '校准基线：[0-9a-f]{7,40} · 20[0-9]{2}-[0-9]{2}-[0-9]{2}' "$F"                              # ≥1（AC-6 的严格式）
K11 grep -cE '攻击面|弱点(总表|清单)|S1-S10[ ]*(总表|清单|一览|目录)' "$F"   # D11 的机验面：必须 0（🔴 B-1 补的闸）
    # 收窄原因（🔴 复验轮新发现，非阻断但会让 2a/4-dev 白返工一次）：裸 `S1-S10` 一支纯误伤——
    # D3 要求的合规附录标题「附录：S1-S10 所在域索引」实测判 1（假红），而反例「附录：S1-S10 攻击面总表」
    # 是被 `攻击面` 那一支单独抓到的（去掉 S1-S10 支后仍判 1）。这与已立的 D13 双写假红、K8 旧式误伤同族：
    # **禁词闸抓措辞，标题层最容易自己踩**。
K12 awk '/<section class="domain" id="sec-control-plane"/{f=1} f{print} f&&/<\/section>/{f=0}' "$F" | grep -cE '仿真|模拟'   # ≥1（🟩 N1）
    # S6（K8s 式管控）是 S1-S10 里唯一既无机器闸、又不在 AC-11 六处具名内的边界条，却是最高危过度声称面：
    # 项目自己的 CLAUDE.md:8 / README 就写「K8s 式管控（隔离域/自动路由/渐进扩容/Reconcile 自愈）」且不带"仿真"二字。
    # 承载 S6 的域章必须给稳定 id="sec-control-plane"，其节点锚窗口内含「仿真」或「模拟」（照 K7 的形态，词锚窗口一律不用）。
K13 a=$(grep -c '安全与审计' "$F"); b=$(awk '/<section class="domain" id="sec-security"/{f=1} f{print} f&&/<\/section>/{f=0}' "$F" | grep -c '安全与审计')
    [ "$((a-b))" -eq 0 ] && echo "K13 PASS（章外 0）" || echo "K13 红：D10 单点被破，章外 $((a-b)) 处"   # 🟩 收口轮补
    # 它补的是 C2 的残余语义面：附录若只是**复述** sec-security 段内本有的边界句，票面 AC-7 词锚与 K7 节点锚会同时绿（两版并跑抓不到），
    # K11 又只拦禁词字样 —— 于是"复述"这条路此前只有 UAT-8 兜。K13 用「全文计数 − 章内计数 == 0」把它变成机验，一行 awk 的事。
```

**两版并跑纪律**：AC-7 / AC-8 的票面命令（词锚）与 K7 / K8（节点锚、逐段同行）**必须同时执行**；两版判定不一致 = 交付稿措辞不合格，按 §5-R2 回到稿子改，不改票面命令。

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
   │  page-block ×32（含外壳 2 页）· data-nav ×13 · data-owner 四值闭集 ·  │
   │  data-state 三态闭集 · notice id="nb-*" ×6 · view-block id="vb-G*" ×9 │
   │  sec-security 单点措辞 · <p> 逐段加密限定 · <管理员口令> · 合成数据    │
   └───────┬──────────────────────────────────────────────┬─────────────┘
           │ 2a：视觉基线（间距/字号/组件长相/导航形态）      │ 4-dev：写文件
           v                                              v
   .specs/product-prototype-refresh/UI-DESIGN.md   product-design.html  ← 交付物（≤2MB，浏览器直开）
                                                          │
                          ┌───────────────────────────────┴───────────────┐
                          v                                               v
              已投票 AC 命令（13 条，需求侧）                   K 系列闸（§1.5 现算） 加严闸（设计侧）
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

**两轴标注的合法组合**（D4 的可执行形式；5-test 按此抽查，UAT-6 不代替逐处核对）。**与 K3b 的一致性是本表的机器可核属性**：✗ 格集合 == K3b 的正则并集，△ 格**必须**不被 K3b 拦下（本轮把 `缺失 × 未接入` 由 △ 改 ✗ 正是因为两侧打架——按矩阵判合法的格子被设计侧闸硬红，就是 R3b 命名的"假红诱导改判据"路径）。改后唯一剩余 △ = `部分已有 × 规划中`，判断权留在 UAT：

| 归属 \ 标注 | 未接入 | 演示边界 | 规划中 |
|---|---|---|---|
| 本项目已有 | ✗（既有能力不得画成没接；除非它是孤儿/边界条 → 应改判归属） | ✓（S1-S10 类"只在演示语境成立"） | ✗（既有 ≠ 规划） |
| 部分已有（须点明缺哪半条腿） | ✓（六处待标注里的壳能力多属此） | ✓ | △（缺的半条腿已登记议题时） |
| 缺失-竞品建议新增 | ✗ | ✗（禁把竞品能力画成我们的演示边界） | ✓（带 slug + 去向） |
| 缺失 | **✗**（🟩 C1：与 K3b 同格判红必须同结论；`未接入` 的语义前提是"我们有码没接线"，裸"缺失"配它自相矛盾。若实情确为"有壳无芯"，**改判归属为 `部分已有`**，不是把闸放宽） | ✗ | ✓ |

---

## 4. ADR 索引

- `@.specs/adr/001-prototype-doc-zero-dependency.md` —— 交付稿形态：零依赖单文件 HTML（排除构建链/CDN/位图）。低可逆：一旦交付，下游（S-align、`docs-drift-resync`、票面 AC 命令）都按此假设。
- `@.specs/adr/002-single-source-derivation-gates.md` —— 「单处真源 + 多处 diff 派生闸」范式从 RESEARCH 计数不变式推广为交付稿的通用纪律（K 系列闸（§1.5 现算））。低可逆：改派生方式 = 动所有文档类 AC 的判据。
- `@.specs/adr/003-two-axes-ownership-and-state.md` —— 归属四值与标注三态**永不合并**，分属性承载，值域闭集。低可逆：合并即 AC-5/AC-11/AC-13 三条判据互相失效。

（本 change 无 ARCHITECTURE.md，故不 supersede 任何既有 ADR；`agent-execution-sandbox`、`knowledge-rag-retrieval` 两条架构级议题的 ADR 归属其各自新 change，见 §6。）

---

## 5. 风险

| # | 风险 | 影响 | 概率 | 缓解 |
|---|---|---|---|---|
| R1 | **BASELINE 与代码不一致被交付稿继承**（本轮实测到一例：§2 行 1 记 `Detail`「含 6 个 tab 组件」，代码 `frontend/src/pages/Detail.tsx:9` 的 `TABS` 与 `*Tab` import 均为 **5**） | 交付稿写"6 个 tab"→ 假锚点，且 AC-1 的"数字与 BASELINE 一致"会把错数字固化 | 中 | **本设计不修 BASELINE**（已投票工件，R3 归口需求侧）：交付稿一律**按代码实测值**写（D9/K2 双闸），把该差异作为**第 8 条漂移**在 §7 显式上报需求侧改一行；2a/4-dev 引用 tab 数时以 `TABS` 长度为准。禁止"两边都写"式含糊 |
| R2 | **词锚定判据可被假绿绕过**（AC-7/AC-8 的 `awk` 窗口起点是中文措辞）。**已复现**（§7.5）：「安全与审计」出现在导航时，安全段并无边界句，票面命令仍判 `1`；同一稿换 K7 节点锚定 → 判 `0` | 安全域措辞不合格却能过票 | 高（已复现） | D10 + K7/K8 加严闸；5-test **两版并跑**（票面词锚 + 节点锚），判定不一致即回到稿子改，不改票面命令 |
| R3 | **数量型闸被"堆叠"糊过**（`sort -u \| wc -l` 对挤在一行的 9 个 G 号同样给 9）。**已复现**（§7.5）：反例稿 9 条挤一行 → AC-13 判 `9`（绿），K4b `occ=9 / lines=1` 与 K9（稿内 `vb-G*` 数 0）双双拦下 | AC-5/AC-13 的"逐块"意图变空文 | 中（已复现） | D6 逐块 + K4b 堆叠探测 + K9 集合 diff（三条同处 §1.5 命令块，一次跑完） |
| R3b | **判据也会反过来假红**：枚举字面串"属性 + 可见文本"双写时，32 行**完全合规**的骨架被 AC-5b 判 `occ=64 / lines=32` → 必然不过闸，进而诱导实现方去改判据（比假绿更贵的失效路径）。**已复现**（§7.5） | 交付期反复返工 + 票面被侵蚀 | 高（已复现） | **D13 单写规则**（枚举串每行只出现一次，可见徽标走 CSS `::after` + 语义 class）；单写形态实测 `32/32` 通过且 AC-5a/AC-2/AC-11/AC-13/K6 全部不退色 |
| R4 | **交付稿成第二真源 / 二次漂移**（有人开始在原型里"顺手改数字"，README 的历史就这么来的） | 又一份需要 `docs-drift-resync` 的过时文档 | 中 | D2/K1/K4/K6b 派生对账 + AC-6 校准基线（7-40 hex SHA + 日期 + 页面/端点数）+ §2 单向依赖声明 |
| R5 | **交付稿外发泄面**（它会被转发，也会被截图/导出——D11 的禁词闸管不到非文本形态）。两层要分清：① `artifact.py:10-26` 无鉴权读 `.md` 产物，`product-design.html` 若改名成 `.md` 会被 `artifact=DESIGN` 的子串匹配读走；② **`admin_api.py:126-135` 的 GET 是无鉴权任意文件读**（`'..' in path` 挡绝对路径，`os.path.join` 丢前缀），它让"文件名形态"这层设计**不构成防线** | 把 S1-S10 弱点清单集中送出去；或误以为改了后缀就安全 | 中（②是既有 L1 弱点，非本 change 引入） | ① 文件名保持 `.html`（`SAFE_NAMES`/`.md` 判定不进该面）＋知识上传白名单 `agent_knowledge_api.py:189` 不含 `.html`（不会被自动吞成产品数据）；② 真正的收敛点在 L1：登记 **`admin-file-read-jail`**（GET 补 `get_current_user` ＋ `full.startswith(_prompts_dir())` 双闸，照抄同文件 PUT 的写法），**另开 change**；③ 内容侧与形态无关：D11 禁集中列 ＋ K11 机验 ＋ UAT-8 人工勾 ＋ AC-4 两级 ＋ D7 收紧式 |
| R6 | **2a 单方面改标记**（class/id 换名） | 交付前 9 条 AC 集体假红，或改了命令没改稿 → 假绿 | 中 | D5 的"同笔同步"规则 + §1.5 把字面串写死成接口；票面登记；K 系列闸（§1.5 现算） 在改后必跑 |
| R7 | **范围诱惑**：`trace-viewer-reattach` 之类"接条线就行"的议题被顺手实现；或两条架构级议题被当普通功能设计掉 | 破 AC-12 与 R7.1，交付物变成未评审代码的载体 | 中 | §6 圈死 + R3.1（Architect 零代码）+ 出口必跑 AC-12 diff 命令（§7 实跑 0） |
| R8 | **体积/首屏预算**（1.5-2.5k 行 HTML + 内联 CSS，NFR ≤2 MB / ≤2 s） | 首屏卡顿或超预算 | 低 | 禁位图与 base64（仓库根 `demo.gif` 2.8 MB 是反例）；图形只画必要框图；交付前 `wc -c "$F" ≤ 2000000` 一次性核 |
| R9 | **长期债务**：交付稿的 K 系列闸（§1.5 现算）依赖表格行形（`\| N \|`）与 `data-*` 属性名；且新闸自身曾对**同标签属性顺序**敏感（🟦 陷阱二，已按 D16 改顺序无关式）；BASELINE/RESEARCH 一旦重排表格或改列序，派生命令静默失配 | 闸"绿"但不再对账 | 中 | 把 K 系列命令集中写进 §1.5 与 ADR-002（单处可改）；`docs-drift-resync` 的 AC 里加一条"跑通全部 K 命令（§1.5 现算的 K 系列）"；不另立脚本（禁造第二工具） |

---

## 6. 不在范围

- **12 个需代码议题的实现**（唯一真源 `RESEARCH-competitors.md` §2 反引号 slug 去重集，现 12 条）：`token-cost-ledger`、`unified-inbox`、`trace-viewer-reattach`、`model-verification-tier`、`separation-of-duty-gate`、`skill-capture-from-run`、`mcp-tool-runtime`、`inbound-channel-session`、`approval-ladder-autonomy`、`human-agent-assignment-board`（边界待定）、**`agent-execution-sandbox`**、**`knowledge-rag-retrieval`**（后两条**架构级**：会分别破"单机无容器/无沙箱"与"SQLite 单体 + 文档型知识产物"两条容量边界 → 必须**另开 change ＋ 各自 ADR**，本 DESIGN 不出方案，交付稿里也只以 `缺失-竞品建议新增 + 规划中 + slug` 呈现）。
- 交付稿本体 `product-design.html`（属 4-dev）、视觉基线 `UI-DESIGN.md`（属 2a）、任务拆解（属 3-task）、验证矩阵与 UAT（属 5-test）。
- 生成器/校验脚本落 `frontend/` 或 `backend/`（AC-12 禁止）；对账一律用 §1.5 的单行命令，不引入第二套工具（D2/R9）。
- README.md 回写（`docs-drift-resync`）、孤儿页面/组件清理（out-2）、真实数据接入（out-1）、可交互高保真原型、市场定位与定价（out-4）。
- **`admin-file-read-jail`（🔴 B-2 本轮新登记的需代码议题，第 13 条）**：`admin_api.py:126-135` 的 `GET /api/admin/files/{path:path}` 无鉴权 ＋ 绝对路径绕过 `..` 守卫 → 任意文件读；修法是 GET 补 `get_current_user` ＋ `full.startswith(_prompts_dir())`（同文件 PUT `:139-143` 已有对照实现）。本 change 只到文档层，不改它。**三点归口**：① 它**不进交付稿的 `data-slug` 集**——K4 的现算真源仍是 `RESEARCH-competitors.md` §2 的 12 条，提前塞进稿子会让 K4 假红，故稿内呈现等需求侧把它并入 RESEARCH §2 之后再同步；② 需求侧应同时补 **BASELINE §4 的 S11 边界句**（内部件持有，依 D11 不得进交付稿）与 12→13 的计数不变式；③ 它属"鉴权缺失"类，按 R7.1 新 change 走，无需 ADR（不改架构边界，补的是既有约束）。
- **样本与工具的落位纪律（🔴 B-3）**：`§7.5` 的两份样本一律落**仓库外**（`$TMPDIR/proto-samples/`），**含真形假值的样本禁止 commit 进仓**——它们所在路径不在 AC-4 核对面（`.specs/product-prototype-refresh/` ＋ `backup/`）内，进了 git 历史就成了"不受审副本"。顺带一条已验的否证：**别指望加 `.gitignore`**，AC-12 的 `grep -vcE "^(\.specs/|STATE\.md)"` 对 `.gitignore` 计数 **1** → 加它自己就破了"零 L1 写入"红线（本轮算术复核过）。（🟫 R9.2 二次确认补的口径：**这条只作本 change 的范围结论**——将来别的 change 加 `.gitignore` 不归本闸管，别把"这条路别走"外推成仓库永久戒律。）
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
| K 系列闸可用性 | 两份样本（§7.5）上跑 K 系列闸（§1.5 现算）全部命令形态 | 合格稿 10 条全绿；反例稿逐条报出：缺页 `30` / 虚构页 `Fake` / 假锚点 `pages/Nope.tsx` / K4b `9 vs 1` / K6 `1` / K7 `0` / K8 裸加密 `1` / K9 diff `10` 行 / K3b 非法组合 `1` / K6b 造词变量 `--radius-legacy` / K10 `0` ✅ |
| D3↔D11 冲突消解（🔴 B-1） | D3 附录格改「边界句**所在域索引**（只放 `id`，不放正文）」＋ 新闸 `K11` 双向跑 | 反例附录稿 `1` / 合格稿 `0` ✅（🔴 给的命令与数字一致） |
| 设计侧新闸顺序无关（🟦 陷阱二） | K3b / K6 换顺序无关式，对"倒序属性行"复跑，并对两份既有样本回归 | K3b 旧式判 `0`（静默漏检）→ 新式 `1`；K6 旧式 `1` → 新式 `2`；`good5` 仍是 K6=6 / K3b=0、`bad3` 仍是 K6=1 / K3b=1 → 只增检出、不改既有结论 ✅ |
| 图例不踩已投票 AC-5a（🟦 陷阱一） | 裸枚举句 vs 自带路径图例句 | `1`（假红通道，第一稿必撞）vs `0` ✅ → 立 D17 |
| K8 误伤面（🔴 非阻断 1） | 旧式 vs 收窄式，三行样本 | 旧式 `2`（把 HTTPS 传输句算违规）→ 收窄式 `1` ✅ 已换主用式 |
| `.html` 推论完整性（🔴 B-2） | `python3 -c "import os; print(os.path.join('/app/prompts','/etc/hosts'))"` ＋ 读 `admin_api.py:126-143` 守卫 | `/etc/hosts`（`'..' in path` 挡不住绝对路径），且该 GET 无 `get_current_user`/`has_permission`、PUT 两条都有 ✅ → D11/R5 措辞已改、`admin-file-read-jail` 已登记（§6） |
| §7.6 配方逐条复跑（本轮把配方变成可执行） | 从 §7.6 抽出 ```bash 块写成脚本执行，再对两份既有样本跑新式闸回归 | 十条断言全部命中期望值：K11 `1/0`、K3b 倒序 `1`、K6 `2`、K8 `2/1`、图例 `1/0`、AC-7 词锚 `1`→K7 `0`；既有样本回归 `good5` K6=6 / K3b=0 / K8=0 / K11=0，`bad3` K6=1 / K3b=1 / K8=1 ✅ 结论未变 |
| 加 `.gitignore` 这条路（🔴 B-3③） | `printf '.gitignore\n…' \| grep -vcE "^(\.specs/\|STATE\.md)"` | 计数 `1` → 会自破 AC-12 红线，故不加，改走"样本落仓库外 ＋ 禁入库" ✅ |
| 矩阵与 K3b 逐格一致（🟩 C1） | 12 格全枚举喂 K3b（4 归属 × 3 标注） | 改前 `缺失 × 未接入` 矩阵 △ / 闸红 → **1 格打架**；改后 **12/12 全一致**（✗ 格集合 == K3b 判红集合，△ 格不被拦）✅ |
| 附录按新规格扩节后重跑全部相关闸（🟩 C2 要求） | good5 + 索引式附录 + `sec-control-plane` → good6 | AC-7 词锚 `1` ／ K7 节点锚 `1`（两版同向，不再打架）；「安全与审计」章外 `0`（D10 单点守住）；K11 `0`；K12 `1`；K3b `0`；K8 `0`；page-block `32`；nb `6` ✅ |
| S6 过度声称面（🟩 N1） | `grep -c 仿真` 于 REQUIREMENT / DESIGN；`grep "K8s 式管控" CLAUDE.md README.md` | 「仿真」两文件均 `0` 次，而 CLAUDE.md:8 与 README 都写「K8s 式管控」不带"仿真" → 确为最高危无闸面，补 K12 ✅ |
| K11 标题假红（🔴 复验轮新发现，非阻断） | 合规附录标题 vs 反例，旧式与收窄式并跑 | 旧式 `1`（假红，D3 最自然的标题就踩）／收窄式 `0`；反例两式均 `1`（去掉 `S1-S10` 支仍由 `攻击面` 支抓到）；`good6` 收窄式仍 `0` → 只消误伤、不降检出 ✅ 已换收窄式 + D3 标题纪律双保险 |
| 引用式闸清单（🟩 收口轮非阻断①） | 全仓 grep「`K1`＋省略号＋末号」这种手写范围式（**此处不嵌完整字面串**，否则这条审计痕迹自己就是被扫对象——同 D15 规则 5 / §7.6 不嵌凭据字面量一族） | 改前 DESIGN 七处 ＋ ADR-002 一处 ＋ STATE 两处仍写已过期范围号（我为加 K12 sed 过一轮，漏了这批）→ 改后 **残留 0**，统一为「K 系列闸（§1.5 现算）」并立 **D18** ✅ |
| K13 能否抓到"复述"（🟩 收口轮非阻断②） | 复述 trap 件 vs 两份合格稿，三式并跑 | trap 件 章外 `1`（红）而 AC-7 词锚 `2`／K7 `1` **同向双绿** → 证明确有这条残余面；`good6` 章外 `0` ✅ 由 K13 收口，不再只靠 UAT-8 |
| 票面块能被产品解析（D15，本轮新增） | 载入 `backend/parsers/gate.py` 后对 `DESIGN.md` 跑 `parse_gates`（该文件用 `list[dict]` 注解，本机 python3.8 需先注入 `from __future__ import annotations` 才能 exec —— 环境事实，非缺陷） | 改前：只出 1 个门且门名是表格碎片、`question` 空（正文裸写票面标记会开假门 → 立为 D15 规则 5）；改后：`name=G2 方案门` ＋ 完整 `question` ＋ `votes` 4 条（🟫 ✅ ＋ 三张 ⚪）＋ `result=1/4` ✅ |
| 交付稿存在性 | `git log --all --oneline -- '*product-design*'` | 空 —— 仓库无既有稿，人工 ① 仍待拍板（不卡本阶段） |

**上报人工/需求侧一行**（R1）：`BASELINE-code-facts.md:35` 的「`Detail`（含 6 个 tab 组件）」应为 **5**（`frontend/src/pages/Detail.tsx:9` `TABS` 与 5 个 `*Tab` import 同判）。属已投票工件，本阶段不改，请需求侧改该单元格。

### 7.5 判据两步复现（承接交棒提示 ④：先验"验据"，再拿它验交付稿）

两份样本都落在仓库工作目录的 `scratch/`（**在 `.specs/product-prototype-refresh/` 之外**，避免反例稿被 AC-4 tier-1 当成违规）：

- **合格稿** `good5.html`：由 §1.5 的派生命令**生成**的骨架 —— 12 个域章（11 域 + 平台外壳）× 32 个 `class="page-block"`（页名与锚点取自 `BASELINE §2` ∩ `App.tsx`）× 13 个 `data-nav`（`App.tsx` label 原文）+ 6 个 `nb-*` + 9 个 `vb-G*` + 头部校准基线行；**故意含易误杀形态**：`<a href="https://…">` 来源链接、`data:` URI、内联 `<script>`/`<style>`、内联 SVG `<use href="#…">`。体积 17 KB（NFR 预算 2 MB 的 0.9%）。
- **反例稿** `bad3.html`：真实缺陷各一处（远程 CSS/JS、协议相对 `url()`、`<iframe>`、内联 `fetch(`、假锚点 `pages/Nope.tsx`、虚构页 `Fake`、裸"加密存储"、安全段无边界句、9 条 G 挤一行、只 1 处待标注、枚举串属性+文本双写、非法组合、`api_key` 赋值形态、SHA 写成非十六进制）。

| 判据 | 合格稿 | 反例稿 | 结论 |
|---|---|---|---|
| AC-2 页面块 / 13 入口 | `32` ／ K5 diff 空 | `3` ／ K5 diff 14 | 双向可判 |
| AC-3 零外部资源 | **0 命中**（远程链接、`data:`、内联 script 均未误伤） | 4 命中 | 绿不误杀、红不漏 |
| AC-4 tier-2（只跑 `"$F"`） | 0 | 0（该样本无路径/邮箱 → 本条放过，由 tier-1 兜） | 作用范围按提示 ② 锁死 |
| AC-4 tier-1 **原式** | 0 命中 | **0 命中** ← 未拦住 `api_key` 赋值形态 | **D7 并档的实测收益** |
| AC-4 tier-1 **收紧式（D7）** | 0 命中 | **1 命中** | 并档成立，且不追溯动票面 |
| AC-5a 锚点共现 | 0 | 0 ← 被同行那一个 `pages/` 顶包 | **必须与 AC-5b ＋ K2 成对**（K2 报出 `MISS frontend/src/pages/Nope.tsx`） |
| AC-5b 堆叠探测 | **双写形态 `occ=64 / lines=32` → 假红**；**单写形态 `32/32` → 绿** | `occ=9 / lines=1` → 红 | 复现出**新假红通道** → 立 **D13**（枚举字面串每行一次，可见文案走 CSS） |
| AC-6 校准基线 | `1`（K10 严格式：7-40 hex ＋ 日期同行） | `0`（SHA 写成 `abc`） | 严格式可用 |
| AC-7a 词锚窗口（票面原文） | 1 ✅ | **1 ← 假绿**（安全段并无边界句，窗口从导航起算） | 复现 R2 |
| **K7 节点锚定** | 1 ✅ | **0 → 真红** | D10 的修法成立 |
| AC-8 段共现 ／ K8 逐段同行 | 1、1 ／ 0、0 | 0、0 → 红 ／ 裸加密行 1 | 两版同向 |
| AC-9 占位符 | 1 | 0（写成了 `admin / …`） | 双向可判 |
| AC-10 ＋ K4 slug diff | 缺 11（样本只挂 1 条 slug） | 缺 12 | **fail-closed 生效** → 立 D14：交付稿必须齐 12 条 |
| AC-11 地板 ／ K6 具名 | 16 ／ **6** | 2 ／ **1** | K6 才防"一处代表全部" |
| AC-13 唯一数 ／ K4b ／ K9 | 9 ／ PASS ／ diff 空 | **9 ← 假绿** ／ `9 vs 1` 红 ／ diff 10 行 | 复现提示 ①，两条加严闸拦住 |
| K1 双向页集 | 缺 0 ／ 虚构 0 | 缺 30 ／ 虚构 `Fake` | 缺页与幻觉页都能指名 |
| K3 值域 ／ K3b 组合 ／ K6b 变量 | 外值 0 ／ 非法 0 ／ 造词 0 | 外值 0 ／ **非法 1**（`缺失-竞品建议新增 \| 未接入`）／ **造词 1**（`--radius-legacy`） | 两轴正交与"沿用既有 token"都可机验 |
| K6c 域章数 | `12`（11 域 + 外壳） | `2` | 结构计数对账生效 |

### 7.6 复现配方（🔴 B-3①：验据必须可交付，不接受"作者本机能跑"）

以下在**仓库根**执行，样本写到仓库外（`$TMPDIR/proto-samples/`，依 §6 落位纪律）；每条都是"命令 → 期望值"，评审者与 5-test 可一键复跑（🔴 复验轮已把本段原样抽出 `bash recipe76.sh` 跑通：输出与期望逐条对齐，跑完 `git status --porcelain` 0 行）：

```bash
S="${TMPDIR:-/tmp}/proto-samples"; mkdir -p "$S"

# (1) K11 禁词闸双向：集中列弱点的附录稿 1 / 合格稿 0
printf '<section class="notice" id="nb-appendix"><h2>附录：S1-S10 攻击面总表</h2></section>\n' > "$S/appendix.html"
printf '<section class="notice" id="nb-limits"><h2>本域边界见各章限定句</h2></section>\n'      > "$S/limits.html"
grep -cE '攻击面|弱点(总表|清单)|S1-S10[ ]*(总表|清单|一览|目录)' "$S/appendix.html"   # 期望 1（由「攻击面」支抓到）
grep -cE '攻击面|弱点(总表|清单)|S1-S10[ ]*(总表|清单|一览|目录)' "$S/limits.html"     # 期望 0

# (2) K3b 顺序无关：属性倒序的非法组合必须仍被抓到（旧式静默漏检）
printf '<div><span data-state="未接入"></span><span data-owner="缺失-竞品建议新增"></span></div>\n' > "$S/rev.html"
awk '{own=""; sta=""}
     { if (match($0,/data-owner="[^"]+"/)) own=substr($0,RSTART+12,RLENGTH-13)
       if (match($0,/data-state="[^"]+"/))  sta=substr($0,RSTART+12,RLENGTH-13)
       if (own!="" && sta!="") print own"|"sta }' "$S/rev.html" | sort -u \
  | grep -cE '^(本项目已有\|(未接入|规划中)|缺失(-竞品建议新增)?\|(未接入|演示边界))$'          # 期望 1（旧式同输入判 0）

# (3) K6 顺序无关：id 写在 data-state 之后也要数到 2（旧式判 1）
printf '<section data-state="未接入" id="nb-a"></section>\n<section id="nb-b" data-state="演示边界"></section>\n' > "$S/k6.html"
grep -oE '<section[^>]*>' "$S/k6.html" | grep -E 'id="nb-[a-z-]+"' | grep -cE 'data-state='  # 期望 2

# (4) K8 收窄式：与密钥无关的传输加密句不该被算成违规
printf '<p>全站传输走 HTTPS 加密</p>\n<p>API Key 加密存储</p>\n<p>密钥经 AES-256-GCM 加密，取决于 ENCRYPTION_KEY</p>\n' > "$S/k8.html"
grep -E '加密' "$S/k8.html" | grep -vcE 'ENCRYPTION_KEY'                                  # 旧式期望 2（含误伤）
grep -E '加密' "$S/k8.html" | grep -E '密钥|API Key' | grep -vcE 'ENCRYPTION_KEY'          # 收窄式期望 1（只剩真裸句）

# (5) D17 图例陷阱：裸枚举句踩已投票的 AC-5a；自带路径的图例句不踩
printf '<p>归属取值有 本项目已有 / 部分已有 / 缺失-竞品建议新增 / 缺失</p>\n'          > "$S/legend.html"
printf '<p>本项目已有 = 能在 frontend/src/pages/ 或 backend/routes/ 指到实现</p>\n'      > "$S/legend2.html"
grep -E '本项目已有|部分已有' "$S/legend.html"  | grep -vcE 'pages/|routes/'              # 期望 1 ← 这就是假红通道
grep -E '本项目已有|部分已有' "$S/legend2.html" | grep -vcE 'pages/|routes/'              # 期望 0

# (6) AC-7 假绿 → K7 真红：导航含该字样、安全段无边界句（窗口起点漂移）
printf '<nav><a data-nav="安全与审计">安全与审计</a></nav>\n<section class="domain" id="sec-1"><p>演示数据可回落</p></section>\n<section class="domain" id="sec-security"><p>已交付 RBAC，认证强度足够。</p></section>\n' > "$S/ac7trap.html"
awk '/安全与审计/{f=1} f{print} f&&/<\/section>/{f=0}' "$S/ac7trap.html" | grep -cE 'X-User-Id|回落'   # 票面词锚期望 1（假绿）
awk '/<section class="domain" id="sec-security"/{f=1} f{print} f&&/<\/section>/{f=0}' "$S/ac7trap.html" | grep -cE 'X-User-Id|回落'  # K7 期望 0（真红）

# (7) K11 标题假红双向（🔴 复验轮补的一支误伤：D3 最自然的合规标题被旧式判红，收窄式两侧都判对）
printf '<h2>附录：S1-S10 所在域索引</h2>\n' > "$S/k11-title.html"
printf '<h2>附录：S1-S10 攻击面总表</h2>\n' > "$S/k11-bad.html"
grep -cE '攻击面|弱点(总表|清单)|S1-S10' "$S/k11-title.html"                        # 旧式期望 1 ← 假红，本支已被收窄掉
grep -cE '攻击面|弱点(总表|清单)|S1-S10[ ]*(总表|清单|一览|目录)' "$S/k11-title.html"  # 收窄式期望 0（合规）
grep -cE '攻击面|弱点(总表|清单)|S1-S10[ ]*(总表|清单|一览|目录)' "$S/k11-bad.html"    # 收窄式期望 1（反例仍红）

# (8) K13 D10 单点机验（🟩 收口轮补）：附录只是"复述"章内本有的边界句时，票面 AC-7 与 K7 会同向双绿
printf '<section class="domain" id="sec-security"><p>身份取自 X-User-Id header，未传即回落 admin —— 演示边界。</p><h2>安全与审计</h2></section>
<section class="appendix" data-state="规划中"><p>S1 安全与审计：身份取自 X-User-Id header，未传即回落 admin（复述）</p></section>
' > "$S/k13trap.html"
K13(){ a=$(grep -c '安全与审计' "$1"); b=$(awk '/<section class="domain" id="sec-security"/{f=1} f{print} f&&/<\/section>/{f=0}' "$1" | grep -c '安全与审计'); echo $((a-b)); }
K13 "$S/k13trap.html"        # 期望 1（章外 1 处 → 红）；两份既有合格稿期望 0
awk '/安全与审计/{f=1} f{print} f&&/<\/section>/{f=0}' "$S/k13trap.html" | grep -cE 'X-User-Id|回落'   # 期望 2：词锚判绿（正是它抓不到复述）
awk '/<section class="domain" id="sec-security"/{f=1} f{print} f&&/<\/section>/{f=0}' "$S/k13trap.html" | grep -cE 'X-User-Id|回落'  # 期望 1：节点锚也判绿 → 两版并跑对这条失效，K13 才抓到
# 对照：同一式跑既有合格稿 good6 → 章外 0（期望），故 K13 不误伤

# 末尾固定收尾：grep 无匹配时退出码是 1，不给 `true` 的话整段会被误读成"跑挂了\"
echo "配方跑完：样本 $(ls "$S" | wc -l) 份在 $S（仓库外，故 git status 不含它们），逐条与上方期望值对齐即通过"
true
```

**合格稿不在这段配方里，这是刻意的**：它的全部内容都由 §1.5 的派生命令唯一决定（K1 页集 / K5 入口 / K6 六处 / K9 九条 / K6b 变量对 / K10 基线行），评审者逐条跑那些命令即可复现同样的"全绿"断言，不需要作者的私有文件——把生成脚本入库会同时违反 D2（禁第二套工具）与 §2 的单向依赖。

凭据形态的反例（`api_key` 赋值样式，用来证明 D7 收紧式相对已投票原式的增量：原式 0 命中、收紧式 1 命中）同样按 §6 留在仓库外，本文**不复制其字面量**——"键 = 值"形态一旦写进 `.specs/product-prototype-refresh/`，就会被并档后的收紧式自己命中，这正是需求门提示 ② 说的自匹配陷阱。

**两条"验据本身的问题"已回到设计**（不是回到票面）：① 双写枚举串会让 AC-5b 在合格稿上假红 → **D13**；② 交付稿若少挂 slug，AC-10 的表格判据仍绿而 K4 报缺 → **D14**（必须齐 12 条）。票面 13 条 AC 的命令文本**一字未改**。

---

## 8. 票面格式是机器接口（不是排版细节）

交付链路的投票块会被**产品自己**读走：`backend/routes/change_detail.py:30-39` 对 `CHANGE / REQUIREMENT / DESIGN / UI-DESIGN / TASK / TEST / REVIEW` 七类工件逐个调用 `parse_gates`，把结果喂给详情页的「门禁」视图（本项目五 tab 之一，见 BASELINE §2 行 1）。也就是说：**票面写成人眼可读但机器解析不出的样子，门禁视图就恒空**——这正是本 change 要根治的"说了没落"在交付链路上的镜像。

按 `backend/parsers/gate.py:5-45` 的实测行为（不是读注释猜的）立五条格式约束，编号 **D15** —— 本节自身就是被验对象：

| # | 解析器事实（实跑所得） | 由此产生的写法约束 |
|---|---|---|
| 1 | 块起点是含 `票面标记` 的那一行；块在**空行 + 以 `##` 开头的行**（或 `\n---##`、文件结尾）处结束，`re.DOTALL` | 票面块独占一个小节（如本节或 §8.1），块与后文之间用「空行 + `##`/`###` 标题」自然闭合；块内可以带说明段，但**别在块内插入 `##` 级标题** |
| 2 | 首行按第一个冒号切成 `门名 : 问题`；无冒号则整行当门名（`question` 为空串） | `票面标记` 后首行**必须含冒号**，形如 `票面标记 G2 方案门: <问题>`；门名里不要再用 `：`，否则问题被截半 |
| 3 | 票行正则 `\s*(🟫\|🟦\|🟩\|🔴)\s*(.+?)[:：]\s*(✅\|❌\|⚪\|⚠️)\s*(.*)`；含「结果」二字的行**先被当结果**并 `continue`，不再参与票行匹配 | 每张票独占一行：`色块 + 角色名 + 冒号 + 标记 + 理由`。**禁把票写进表格行或列表项**（`- 🟫 …` 以 `- ` 起头会因 `\s*` 不匹配 `-` 而丢票）；结果行只写 `结果: …`，同不要再带色块，否则该票被吞 |
| 4 | 票行少于 2 行的块被跳过；`votes` 为空的块整体丢弃（`gate.py:12,41`） | 召集投票时至少落一张真实票行；`⚪ 待票` 也算票行（标记枚举含 `⚪`），可用于"已召集未集齐"的中间态 |
| 5 | **全文每一处裸的票面标记都会开一个块**（`findall` 不锚定行首），且第一个块会把它之后的票行"收养"过去 | 说明文字里**禁止裸写该 emoji**（本文其余处一律写「票面标记（U+1F5F3）」）：一个工件里它只能出现在票面块首行。实测：改前本文件 5 处 → 只出 1 个门、门名是表格碎片、`question` 空；改后 1 处 → 门名 / 问题 / 4 张票 / 结果全部解析正确（复跑记录见 §7 末行） |

**本门票面（本节即真源，票齐后由 2-design 改写为终裁，其余阶段不改本节）**：

🗳️ G2 方案门: DESIGN.md 是否完整、可验证？从各自主责维度看，可以进入下一阶段吗？
🟫 架构师(M): ✅ 三项关注点独立复跑成立（§1.5 归口 / §2 单向依赖 / 三条 ADR 名副其实），另提 2 条非阻断
🟦 研发负责人: ✅ 可实现性独立复跑成立（K1/K4/K5/K9 左集 32/12/13/9 全中、D13 单写可过、R9 失配方向全指红）；附两条实现陷阱，已立为 D16/D17
🟩 领域专家: ✅（改票 `01a0c86b`）—— C1/C2 按其自述探针在新 tip 双向复跑核销：12 格全枚举判红集与矩阵 ✗ 集完全重合（6✗＋5✓＋1△，唯一 △ 不被闸拦）、倒序属性文件判红集逐字相同；C2 trap 件按两版并跑判红、合格件全绿；§7.6 十条断言原文复跑全中。其收口轮补的两条非阻断已落地（范围号禁手抄 → D18；K13 补 D10"复述"残余面）—— C1 同一组合三处三个答案（§3 矩阵「缺失 × 未接入」标 △、K3b 判红、ADR-003 只列了带"-竞品建议新增"那条）；C2 D3 附录与 D11/D10 打架（附录若写「S1 安全与审计：…」→ AC-7 词锚窗口漂到附录、K7 判 0，按 §1.5 两版不一致即不合格，照设计自己的结构写会得到必红的稿子）。两条已落地：矩阵该格收 ✗（收紧方向，不放宽任何已投票判据）+ ADR-003 补格与 △ 计数改口 + D3 附录改「S 号 → 锚点，禁复述限定句文本与域名字样」；三条非阻断 N1（新闸 K12 控制面「仿真」）/N2（K1 与 K6c 口径 12=11+1）/N3（×32 含外壳 2 页）一并采纳。待其按自述探针双向复跑改票
🔴 安全审计师: ✅（改票，`01a0c867`）—— B-1/B-2/B-3 全部闭合并经其**实跑**复验：§7.6 配方原样抽出 `bash recipe76.sh` → 10 条输出与期望逐条对齐全中、样本落仓库外、跑完 `git status --porcelain` 0 行；出口闸亦独立复跑（零 L1 写入 0／tier-1 两式各 0 命中）。其改票轮另补一条非阻断：K11 裸 `S1-S10` 支对合规附录标题假红 → 已换收窄式并在 D3 加标题纪律
结果: **4/4 ✅ 终裁通过 → 2a-ui-design**（交棒评论 `01a0c86b-e6b2`，按 R13.4 不再问「要继续吗」）。R9.2 已销账：🟫 Master 二次确认 B-2 ✅／B-3 ✅（`01a0c868`，其称"独立复跑非背书转述"，并补一条口径——`.gitignore` 那条只作**本 change 范围**结论，不外推成仓库永久戒律，我已在 §6 加注）。§10 转为核销留档。仍挂两件，都不卡本门：① 🟩 让 K13 之外的语义面继续由 UAT-8 兜；② 需求侧三件归口（`BASELINE:35` 6→5、BASELINE §4 补 S11、议题 12→13 并档）——🟫 明确要求在 **2a 出口**带上这三件的回执状态，已写进 STATE。

> 这块**本身就是按 D15 写的**，且用产品自己的解析器验过：对改后的 `DESIGN.md` 跑 `parse_gates` → **1 个门**，`name=G2 方案门`、`question` 取到完整问题、`votes` 4 条（🟫 ✅ ＋ 三张 ⚪ 待票）、`result` 取到 `1/4` 那一行。
> 两个真实反例（都实测过，不是设想）：① 票面塞进 markdown 表格或写成 `- ` 列表项 → `votes` 为空、**整块静默丢弃**，门禁视图表现为"这门没投过"；② 正文里裸写票面标记（哪怕只是举例说明）→ 它先开一个假门并把真票行收养过去，门名变成上下文碎片。②是本轮自己踩到并修掉的，故立为规则 5。

### 8.1 非阻断项处置（G2 投票中提出的两条，随本提交收掉）

| 提出方 | 事项 | 处置 |
|---|---|---|
| 🟫 架构师(M) `01a0c851` | ① 本文件原 §0.5.1 引「§8 票面格式」而**全文无 §8**（§7.5 直接跳 §9）——悬空锚点正是本 change 要根治的病 | **已收**：补写本节（§8 + D15 五条 + 真实票面块），§0.5.1 的引用现在有落点；顺带把该行原来"交付链路上的票面块会被解析"这句**不准确**的表述改对——`change_detail.py:30-39` 读的是**工件文件**，不读评论 |
| 🟫 独立复跑确认 | ② `BASELINE-code-facts.md:35` 记 `Detail`「含 6 个 tab 组件」，实测为 **5**（`TABS` 与 `*Tab` import 同判），🟫 独立复跑确认 | 处置链不变：**已投票工件不由 2-design 改**（R3 归口需求侧）→ 交付稿按代码实测值写（D9/K2），需求侧改那一格；已在 §7 上报，不阻塞 2a |

---

## 9. 架构沉淀建议（供 `A-evolve` 同步 · 软约束）

### 9.1 新增的可复用抽象（建议 append 到 CONTEXT「既有抽象索引」）

| 路径 | 能力 | 触发场景 | 复用建议 |
|---|---|---|---|
| `.specs/product-prototype-refresh/DESIGN.md` §1.5（K 系列闸（§1.5 现算） 对账闸，非代码文件） | 让"给人读的文档"变成**可 grep 的验收面对象**：结构锚点（`class`/`data-*`/`id`）+ 派生 diff + 节点锚定窗口 | ① `docs-drift-resync` 校 README 与代码是否一致；② 任何以文档为交付物的 change（架构文档、迁移说明、运维手册）；③ 5-test 需要"文档级 UAT 机器化"时 | 文档型 change 一律先写"标记契约 + K 系列派生闸"再写文档本体；数量型 `grep -c` 一律配 `occ == lines` 堆叠探测 |

### 9.2 新增 / 改变的项目级技术决策（建议 append 到 CONTEXT「已锁技术决策」）

| 决策 | 取值 | 影响范围 | 推翻代价 |
|---|---|---|---|
| 文档型交付物的验收判据 = **节点/属性锚定**，不用中文措辞或词边界当窗口起点 | `id="sec-*"` / `<p>` 段内 / `data-*` 属性 | 本 change 全部文档 AC；未来任何文档 AC | 低（改 AC 命令文本 + 交付稿标记，但会连带已投票票面重开） |
| 数字与清单只从**唯一真源**派生，交付物内禁手抄、禁造第二工具 | K 系列闸（§1.5 现算） 单行命令 | 所有 `.specs/` 产物与 README | 中（要逐处改回引用式） |
| 对外可转发的产物**不集中搬运内部弱点清单**（含附录索引化只放锚点），只写所属域的限定式边界句；措辞面向**任何外发形态**（文档、截图、导出片段皆同） | D11 ＋ K11 ＋ UAT-8 | 任何面向外发的文档/截图/导出 | 低（但一旦整表外发，撤回不了） |

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
  禁改名为 .md 落进 `artifact.py` 无鉴权 GET 面（D11/R5）；同时记一句边界——**这不代表交付稿安全**，`admin_api.py:126-135` 的任意文件读绕过一切文件名设计（已登记 `admin-file-read-jail`，见 §6）。
- 新增禁动：改 AC 命令引用的字面标记必须同笔改交付稿（D5），禁"只改一边"。
- 新增禁动（沉淀／自检类文字适用）：**描述某个被扫字面串时不得原样嵌入它自己**——本轮清范围号时，修口说明与 STATE 日志尾巴各自把那个过期范围式抄了一遍，成了自查自命中的第二现场（同族第三例：D15 规则 5 的裸票面标记、§7.6 不嵌凭据字面量）。
- 解禁：无。
- 建议补做（不阻塞）：项目无 .specs/ARCHITECTURE.md，而 `agent-execution-sandbox`、`knowledge-rag-retrieval`
  两条架构级议题要开 ADR —— 届时先跑 A-architect 建立项目级架构基线，再让那两条议题的 ADR 有可依之处。
```


## 10. 反对意见留档（R13.2 · 本门按 **3/4** 通过，未赞成的票原样留在工件里）

**🟩 条件票已核销（改票 ✅ `01a0c86b`）。** 本节按 R13.2（3/4 档曾要求把未回应反对意见记入工件末尾）保留为**留档**：两条指控原文、指定修法、我的处置与双方各自的复验数据都在下表——留档理由是这四条闸（K3b 一致性、K11、K12、K13）的由来需要可追溯，删掉就等于让后来人看见规则看不见伤疤。🟩 复跑还带来两处增量：范围号禁手抄（→ D18）与「复述」残余面的机验（→ K13）。

| 编号 | 🟩 的指控（原意） | 本工件的处置 | 复验数据 |
|---|---|---|---|
| C1 | 「缺失 × 未接入」这一组合在 DESIGN §3 矩阵标 `△`、§1.5 K3b 判红、`ADR-003` 决策 3 只列了带 `-竞品建议新增` 的那条 → 同一问题三个答案；按矩阵判合法的格子被设计侧闸硬红，正是 R3b 命名的「假红诱导改判据」路径 | 矩阵该格 `△` → **`✗`**（**收紧方向**，不放宽任何已投票判据）＋ 注「实情若为有壳无芯则改判归属为 `部分已有`」；ADR-003 决策 3 补该格、Consequences 的「△ 那两格」改口为唯一剩余 `部分已有 × 规划中`；§3 前言把「✗ 格集合 == K3b 判红集合、△ 格不被拦」升为可机验声明 | 4 归属 × 3 标注 **12 格逐格喂 K3b**：改前 1 格打架 → 改后 **12/12 一致** |
| C2 | D3 附录「含 S1-S10 边界句」与 D11（禁集中搬）／D10（「安全与审计」仅此一个 section）三方打架：4-dev 照 D3 写「S1 安全与审计：…」→ AC-7 词锚窗口漂到附录、K7 节点锚判 0，按 §1.5 两版不一致即不合格 → **照设计自己的结构写会得到必红的稿子** | D3 附录改为「**S 号 → 所属域 section 的 `id` 锚点**，禁复述限定句文本、禁出现域名字样」；后续 🔴 复验轮又发现连标题写 `S1-S10` 都会踩旧 K11 → 已加**标题纪律**（该节称「边界句所在域索引」）＋ K11 收窄式 | `good5` 按新规格扩附录节 + `sec-control-plane` → `good6`：AC-7 词锚 `1`／K7 `1`（两版同向）、「安全与审计」章外 `0`、K11 `0`、K3b `0`、K8 `0`、page-block `32`、`nb-*` `6` |
| N1/N2/N3 | 三条非阻断：S6 无闸且是最高危过度声称面；K1 描述与 K6c 计数口径对不上；`×32(+外壳)` 易读成 34 | 全采纳：新闸 **K12**（`sec-control-plane` 窗口内含「仿真／模拟」≥1，照 K7 形态）；K1 描述改「域章 12 = 能力域 11 ＋ 外壳 1」；一律写「×32（含外壳 2 页）」 | `CLAUDE.md:8`／README 写「K8s 式管控」不带"仿真"，REQUIREMENT/DESIGN 里「仿真」`0` 次 → 该面确认为零覆盖 |

**已闭合并改票为 ✅ 的 🔴 三条（`01a0c855` → 改票 `01a0c867`）** 一并留档，便于将来追溯每条闸的由来：B-1 D11 零闸 → 补 **K11** ＋ UAT-8；B-2 `.html` 推论不完整 → D11/R5/§9.5/ADR-001 改口径 ＋ 登记 `admin-file-read-jail`（不进交付稿 `data-slug` 集）；B-3 验据不可交付 → 新增 **§7.6 复现配方**（🔴 亲自 `bash recipe76.sh` 跑通，样本落仓库外、跑完工作树 0 行）。其改票轮补的 **K11 标题假红**已按第二方案落地（收窄式 + 标题纪律）。

**仍挂两笔账（都不卡本门）**：① 🔴 三条依 R9.2 需另一角色二次确认，已请 🟫 Master 核（`01a0c865`），结论回来前不自行代答；② STATE 表里 4 条人工待拍板项（其中 `product-design.html` ①/② 是 **2a 开工的真前置**，非本门前置）。

---

> 本文件不包含完整代码实现（R3.1）：仅有标记契约、属性签名、单行派生/校验命令与状态机。`product-design.html` 由 4-dev 按 §1.5 写、视觉基线由 2a 出。
