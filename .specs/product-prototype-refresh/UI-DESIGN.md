# UI-DESIGN: 交付稿的界面基线 —— 间距 / 字号 / 组件长相 / 导航形态

- **Change ID**: `product-prototype-refresh` ｜ **阶段**: 2a-ui-design ｜ **来源**: `@.specs/product-prototype-refresh/DESIGN.md` §1.5（标记契约＝接口）+ §0/§8 + §7.6（配方纪律）
- **我拥有的四样**（G2 交棒原话）：间距 · 字号 · 组件长相 · 导航形态。**本文件不含实现代码**（R3.1 延伸）；`product-design.html` 由 4-dev 按 §1.5 + 本文件写。
- **本文件的每一条数值都来自本轮实测**（命令与结果见 §12/§13），未采用的"看起来合理"的数字一个也没写。

---

## 0. 视觉语汇对齐（brownfield · 步骤 1.5 全跑）

### 0.1 基线引用（R1.9 加载声明 · 逐项起止行）

**读的是技能包内副本**（`kit-2a-ui-design/references/…`）——仓库内**没有** `code-kit/`（实测：根目录无该路径，`CHANGE.md:33` 亦记「九卡库在本仓库未安装」），所以引用一律写文件名 + 行号，**不写仓库路径**（避免造出指不到的假锚点）。

| 加载项 | 行数 | 方式 |
|---|---|---|
| `reference-ui-anti-patterns.md` | 全读 101 行 | R1.9 允许整读的唯一 reference |
| `reference-ui-aesthetics.md` | 仅「调性」节 27-88 行（62 行） | 按节读；**未读** `tech-stacks`/`test-pyramid` |
| `templates-UI-DESIGN.md` | 全读 258 行 | TEMPLATE 类（<150 行整读 OK 的例外：模板本身，非 reference） |

→ reference 合计 **163 行，超 150 软预算 13 行**，超出部分正是本阶段职责必需的「调性」九卡节。**自报越界**，不解释成"没超"。

| 项 | 值 |
|---|---|
| `baseline.pattern` / `.system` | **none —— 本仓库未安装 `code-kit/ui-samples/`**（实测：仓库根无 `code-kit/`；`CHANGE.md:33` 亦记「九卡库在本仓库未安装」）。故基线不引内置样例，改引**产品自身实现**：`frontend/src/styles/tokens.css`（210 行）+ `frontend/src/App.tsx`（侧栏与 13 入口）+ 代表页面 5 个（`Home/Detail/AgentControlPlane/AuditLog/KnowledgeBase`） |
| `baseline.deviation` | 一句话：**照抄色板与密度，去掉动效与阴影，去掉彩色侧条，把 4px 线性 scale 的"档位分配"重排成文档节奏**（理由见 §0.4 与 §12） |
| 调性 | **工业（Industrial）**（`ui-aesthetics.md` 「调性」节第 3 卡：等宽字 / 暴露网格 / 冷色 / 数据密度；参考产品 Bloomberg·Grafana·Linear）。次级影响＝极简卡（Linear 的信息秩序）。**不重选**：`CHANGE.md:29` 已锁「管控台式（深色、信息密度优先）」+ §15.2#7 已锁决策 → R8.7「不允许让用户重选」 |

### 0.2 观察报告（**代码为源**，每条都是本轮实测数，非印象）

| 维度 | 实测到的既有语汇 | 出处 |
|---|---|---|
| Token 源 | 唯一声明处 `frontend/src/styles/tokens.css` 的 `:root`，**逐名去重 61 个**（不是 DESIGN 记的 51；差的 10 个全在"同行多声明"里，见 §14-上报①）；全局无第二个 token 文件 | `grep -oE -- '--[a-z0-9-]+[ ]*:' tokens.css \| sort -u \| wc -l` → 61 |
| 色彩实际比例 | 引用频次（`frontend/src` 全量）：`--border` 251 · `--text-muted` 186 · `--font-mono` 160 · `--text-secondary` 152 · `--bg-card` 126 · `--bg-input` 121 · **`--blue` 103** · `--red` 74 · `--green` 73 · `--orange` 35 · `--purple` 35。→ **中性占绝对多数，品牌蓝是"点缀层"**（约 4% 的 token 引用），语义四色只做状态不做装饰 | 本轮 `grep -rhoE "var\(--[a-z0-9-]+\)" \| sort \| uniq -c` |
| 交互反馈语言 | **只有颜色与边框，没有位移、没有阴影、没有缩放**：`.card:hover{border-color:var(--border-strong)}`（tokens.css:182）· `.card-clickable:hover{background:var(--bg-card-hover)}`（:184）· `.btn-primary:hover{background:var(--blue-hover)}`（:148）· `.tab:hover{color:var(--text-secondary)}`（:209）· `input:focus{border-color:var(--blue)}`（:133）。全仓 `translateY` 只有 2 类用途：`@keyframes slide-in`（:114，入场）与 `top:50%` 的**居中**（`Home.tsx:45` 等）——**不是 hover 反馈**（本行结论经我复核更正，初稿曾把 hover 位移当成既有语汇） | tokens.css:133/148/155/182/184/209 |
| 动效语言 | 单一缓动 `--ease: cubic-bezier(0.16,0,0.2,1)`（引用 7 次）+ 两档时长 `--fast 100ms`（18 次）/ `--normal 200ms`（2 次）；`prefers-reduced-motion` 已全局兜底（`tokens.css:117-119`，**只**含 `animation-duration`/`transition-duration`；实测 `grep -rn 'scroll-behavior' frontend/src` → **0 命中**，产品侧不存在该声明 → §6.4 的 `html{scroll-behavior:auto}` 是本稿自补）。**违例**：`transition: all`（2 处）、侧栏 `transition: width var(--normal)`（`App.tsx:269`）——动的是布局属性 | 本轮实测 |
| 结构语言 | elevation **只有 2 级**（`--shadow-sm` 0 次引用 / `--shadow-md` 7 次）；圆角 3 档且极度偏小（`--r-sm` 51 · `--r-md` 18 · `--r-lg` 5）；密度：卡内边距 16px、gap 8px 是最高频内联值（`padding/gap:8` 344 次、`4` 302 次、`6` 246 次、`12` 164、`16` 126） | 本轮实测 |
| 图形与图标 | 图标库 `lucide-react`（58 个文件引用，`size={16}`）——**交付稿用不了**（零依赖 + 禁位图 → 无图标字体/无 CDN）；logo 是几何字符 `◈` 而非图片（`App.tsx:271`） | 本轮实测 |
| 文案调性 | 工程向、动词短词（`保存/新建/取消/重试/刷新`）；nav 短名（工具库/工作流/角色/Agent…）；**侧栏品牌名写「AI 开发平台」而 README 写「AgentFlow」**（`App.tsx:275` vs `README.md:1`）→ 见 §14-上报④ | 本轮实测 |
| **已知偏差（必须避，不是"沿用"）** | ① **26 个变量被代码引用但从未声明**：`--text-dim` 235 次、`--color-primary` 101 次、`--color-text` 83 次、`--font-display` 35 次、`--color-danger` 35 次…（`tokens.css` 全仓唯一声明处，实测这 26 个零声明）→ 照抄类名会得到**静默失效的颜色**；② `--text-muted` 对比度实测 **2.77:1**（AA 不过）却是第 3 多引用的文字色；③ 彩色左侧条 `borderLeft: Npx solid var(--语义色)` 出现在 **11 个文件**（如 `pages/Roles.tsx:77`、`components/ChangeCard.tsx:16-17`）＝反模式清单「最强 AI dashboard 标志」（`ui-anti-patterns.md:34`） | 本轮实测；名单见 §14-上报③ |

### 0.3 校准状态（R8.7 要求人工确认 —— **本轮没有人工在场，我把未校准写明白而不是藏起来**）

- **已确认的部分**：调性与色板=CHANGE 已锁决策（`CHANGE.md:29` + `§15.2#7`），G2 门 4 位专家已投票通过的 DESIGN 形态（零依赖单文件 HTML、`tokens.css` 逐字内联、K6b 变量闭集）→ **不属于本阶段可改范围**。
- **未经人工逐条校准、但已交票面裁决的部分**：§0.4 的「沿用/延伸/打破」三档、§5 字号闭集、§6 版心几何、§8 组件长相。→ 本轮由 G2a 四专家（🟫🟦🟩🔴）代替"人眼过一遍"，任一专家指出偏差 → 我只改该维并在此段记一行。
- **R18.1 判定**：**不新开发人工提问**。`product-design.html` ①/② 已在 STATE 阻塞表挂账（自 2026-09-22，已由 0-change 提过），按 R18.2「禁止重复提问」→ 本阶段按 **② 新建**起草，并给出 **① 回来时的最小重跑清单**：(a) 只改 `DESIGN §1.5` 的 `F=` 一行；(b) 本文件 §0.2 观察报告对既有稿重跑一遍（同 8 行口径）；(c) 若既有稿调性 ≠ 工业卡，按 `CHANGE.md:33`「以该稿调性为准」改 §1/§4/§5 三节，不动 token 闭集（K6b 与 AC-12 优先级更高）。**两版并跑纪律照 §12 配方执行**。

### 0.4 应用策略

- **沿用**（与原有不可区分）：色板全部 61 个变量名与值 · 圆角 3 档 · `--fast/--normal/--ease` · hover＝背景变深＋边框变强 · 密度（16px 卡内边距 / 8px gap）· 侧栏 200px + `border-right:1px solid var(--border)`（`App.tsx:265-267`）· 工程向短词文案 · `◈` 几何 logo。
- **延伸**（文档场景需要、原实现没有）：长文阅读节奏（`line-height` 1.7 与版心 1000px）· 域章/页块/待标注/融入块四类容器 · 两轴徽标的可见文案 · 锚点定位反馈（`:target`）。
- **打破**（刻意远离，逐条带理由）：① **零动效**（文档不是操作界面，评审场景里动效是噪声；且反模式「散落的微交互」）；② **零阴影**（at-rest 必须平面，`--shadow-*` 一次都不引用）；③ **无彩色左侧条**（改「hairline + 文字 + 前缀序号」）；④ **不写任何字面色值**（颜色只从 `var()` 来）。

---

## 1. 美学北极星

> **「可核对的管控台」——一份看起来像产品本身、而不像"关于产品的 PPT"的文档。**
> 深色冷中性底 + 单一品牌蓝 + 等宽数字/路径 + 暴露的 hairline 网格；信息密度优先，装饰为零。
> 三天后评审者会怎么描述它：**「跟我们的后台长得一样，数字都能点到代码上」**——这就是本交付物的差异化，不是"好看"。

### v0 确认摸路（R8.8 · 异步校准，不阻塞推进）

- **已定（非我发明，来自已投票工件）**：交付物＝零依赖单文件 HTML（ADR-001）· 颜色间距取 `tokens.css` 实际值（§15.2#5）· 调性锁既有实现（#7）· 导航 13 入口 label 原文（K5）· 归属/标注两轴不可合并（ADR-003）· 枚举字面串一物一行（D13/D17）。
- **v0 假设清单**（任一条被指偏差 → 只改该维并重跑 §12）：
  1. 深色调性**保留**（反模式默认禁 dark mode，本产品是 24×7 管控台 → 有理由，见 §12-例外①）；
  2. 交付稿**没有任何按钮**（文档无提交动作；跳转用锚点链接，折叠用 `<details>`）；
  3. 交付稿**零 `<script>`、零 `<img>`、零 `@font-face`**（比已投票的 AC-3 更严，是我这一棒的裁量）；
  4. 界面骨架**不画假截图**，用「区域名 + 控件名」的文字清单（无位图 → 画假截图＝R8.9 伪造）；
  5. 数字一律派生现算（§1.5），交付稿内**不出现任何未挂来源的数字**；
  6. 侧栏品牌名取 `README.md:1`/`CLAUDE.md` 的「AgentFlow」，不取 `App.tsx:275` 的「AI 开发平台」（→ §14-上报④）。

---

## 2. 4 个决策问题（开工前必答）

| 问 | 答 |
|---|---|
| **目的** | 让**平台 owner / 新接手开发者 / 评审者（6-review·S-align）/ 安全负责人**在**不启动前后端、不登录、断网双击**的前提下，一次读懂「现在到底有什么、哪条只到演示边界、竞品结论落在哪」，并且每句话都能点到代码锚点或来源 URL（`REQUIREMENT.md` US-1~US-5）。核心动作＝**定位 → 核对 → 判归属**。 |
| **调性** | **工业（Industrial）**，次级极简（Linear）。理由：受众是工程师与评审者、内容以锚点/表格/状态为主、且必须与真实实现同形（`CHANGE.md:29` 强偏好例外，不重选）。 |
| **约束** | 零依赖单文件 + ≤2 MB + 首屏 ≤2 s + 1280px 无横向滚动（NFR）；WCAG AA 4.5:1 正文 / 3:1 大字与图形；token 名值闭集（**K6b**）；L1 零写入（AC-12）→ 我**不能**改 `tokens.css`，只能在"用不用、用在哪、用多重"上做决策。 |
| **差异化** | **一屏内三件事同形**：导航（13 入口原文）＋ 事实（数字/锚点）＋ 边界（限定句徽标）——用 `data-*` 把「这句话的凭据是什么」做成可见徽标，而不是脚注。 |

**反问自查**：四题都有具体答案、且除调性外三题都不依赖"用户没说过的偏好"→ 不停下来反问。

---

## 3. 颜色系统（R8.3 hex 遗留约束例外 · **显式声明**）

> **例外声明**：本节全部颜色是 hex/rgba，不是 OKLCH。**口径据实收窄**（避免被读成"本仓库不能用 OKLCH"）：`tokens.css` 第 68-89 行的 `--cp-*` 系列**本来就是 OKLCH** → 说明浏览器侧不是障碍；例外只针对**我沿用的这批 hex 值**，因为它们被 K6b 的文本级同名同值比对锁死（换表示法＝换值＝红）。原因不是"懒得换"，是三条已投票/已锁决策同时压在这里：ADR-001 + DESIGN §0（`tokens.css` 实际值逐字内联）+ **K6b**（交付稿 `:root` 的每个变量必须与 `tokens.css` **同名同值**，改值即红）+ **AC-12**（不得写 `frontend/**` 故不能顺手把 token 换成 OKLCH）。控制变量封闭性 ＞ 本条软规则，故记为**已知例外**而非违规。
> 换算 OKLCH 只对未来产品侧有用、对交付稿是红 → **本文件不提供换算表**，避免 4-dev 误抄进 `:root`。

### 3.1 角色表（值＝`tokens.css` 原文，**引号/空格形态一并照抄**，见 §14-上报②）

| 角色 | token | 值 | 交付稿用途 | 绝不用于 |
|---|---|---|---|---|
| 主背景 | `--bg-app` | `#0d0e12` | body 底 | 卡片底（与页块无对比） |
| 导航底 | `--bg-sidebar` | `#0f1015` | 左栏 | — |
| 卡底 | `--bg-card` | `#181a1f` | 页块 / 待标注 / 徽标底 | 大段正文底（会读成"界面截图"） |
| hover 底 | `--bg-card-hover` | `#1e2028` | 导航项与表格行 hover | 静态装饰 |
| 选中底 | `--bg-selected` | `rgba(84,140,240,0.1)` | `:target` 章描边底 | 大面积（会把蓝当主色） |
| 输入底 | `--bg-input` | `#0b0c10` | `<pre>`/SVG 画布底 | — |
| 品牌 | `--blue` | `#548cf0` | 链接 / focus 环 / 归属 `o3` / SVG 边线 | 正文色、10px 以下小字大面积 |
| 品牌 hover | `--blue-hover` | `#6a9df4` | 链接 hover | 静态 |
| 语义 | `--green` `--red` `--orange` `--purple` | 见 `tokens.css:24-31` | **只做语义**（归属/状态/优先级），第二强调色按 `ui-anti-patterns.md:78`「语义需要」放行 | 装饰、渐变、大色块 |
| 主文字 | `--text` | `#e1e2e5` | 正文/标题/表格单元 | — |
| 次文字 | `--text-secondary` | `#9699a0` | 说明句、meta、目录未选中项 | — |
| 弱文字 | `--text-muted` | `#5d6068` | **交付稿禁用于任何信息性文字**（实测 2.77:1，见 §4） | 一切要读的字 |
| hairline | `--border` / `--border-strong` | `rgba(255,255,255,0.06/.10)` | 分隔线、表格行线 | 当"可见边框"表达交互态（实测 1.06 / 1.34，不足 3:1）；**`--blue-border` 同档禁用**（叠底 1.30–1.48，见 §6.4 `:target`） |
| 装饰蓝框 | `--blue-border` | `rgba(84,140,240,0.2)` | **本稿唯一用途**：选中卡片的 1px 静态装饰边（非语义，不承担"态"） | 表达任何交互态（`:target`/`hover`/`focus`）——实测叠底 **1.30:1（on `--bg-app`）/ 1.33:1（on `--bg-card`）**，与 hairline 同档；交互态一律 `--blue`（🟫 ①＋🟦 阻断一，U14 机验）。**登记理由**：本稿此前在 §6.4/C2/§9 三处用它表达 `:target`，却未在此表列行（实测该行计数 0）→ 补上，颜色权威表不再少角色 |
| 字体 | `--font` / `--font-mono` | `tokens.css:43-44` 原文 | 见 §5 | 自造 `--font-display` |
| 间距 | `--s1..--s10` | 4/8/12/16/20/24/32/40 | 见 §6 | 表外数值 |
| 圆角 | `--r-sm/--r-md/--r-lg` | 4/8/12 | 见 §6 | — |

**命名规则**：**One Voice**（品牌色只有 `--blue` 一个 hue；绿/红/橙/紫是语义层，不参与"配色"）· **Tinted Neutral**（中性带蓝紫偏移，`#0d0e12`→`#13141a`→`#181a1f` 三阶同族，无纯灰纯黑纯白）· **Closed Set**（**禁自造变量名**＝K6b；禁复制 §0.2③ 那 26 个幻影名＝U3）。

---

## 4. 对比度实测（WCAG 相对亮度法，脚本本轮实跑，🔴 与 🟦 可直接复算）

| 前景 | 背景 | 实测 | AA 正文 4.5 | 本文件裁定的用法 |
|---|---|---|---|---|
| `--text` | `--bg-app` / `--bg-card` / `--bg-card-hover` | **14.89 / 13.44 / 12.54** | ✅ | 正文、标题、表格单元 |
| `--text-secondary` | `--bg-app` / `--bg-main` / `--bg-card` / `--bg-input` | **6.76 / 6.44 / 6.10 / 6.85** | ✅ | 说明句、meta、目录 |
| `--text-muted` | `--bg-card` / `--bg-app` | **2.77 / 3.07** | ❌ | **禁用于文字**（只允许非信息性刻痕；交付稿无输入框 → 实际为一次都不用） |
| `--blue` | `--bg-card` / `--bg-app` / `--blue-bg` 叠底 | **5.29 / 5.87 / 4.78** | ✅ | 链接、`:focus-visible` 环、`o3` 徽标文字 |
| `--green` | `--bg-card` / `--green-bg` 叠底 | **7.11 / 6.28** | ✅ | `o1` 已有 |
| `--orange` | `--bg-card` / `--orange-bg` 叠底 | **8.17 / 7.13** | ✅ | `o2` 半接 |
| `--purple` | `--bg-card` / `--purple-bg` 叠底 | **5.65 / 5.08** | ✅ | 优先级/分类（非两轴） |
| `--red` | `--bg-card` | **4.64** | ✅ | 缺口/风险文字 |
| `--red` | `--red-bg` 叠 `--bg-card` | **4.28** | ❌ | **红字不得落红底**：红只做 `<code>`/dot/边框，文字落 `--bg-card` 或改 `--text` |
| `#fff`（现 app 的 `.btn-primary` 文字） | `--blue` | **3.29** | ❌ | 交付稿**无 filled primary 按钮**（§1 假设 2）→ 该组合不出现；产品侧修复见 §14-上报⑤ |
| `--border`（hairline） | `--bg-card` | 1.06（14.80 vs 纯白） | — | 只做分隔线；**不用于表达交互态**（1.4.11 需 3:1）→ 交互态一律 `--blue` |

---

## 5. 字体与字号（我拥有「字号」这一样，裁量如下）

### 5.1 字面栈

| 角色 | 写法（**逐字这样写**） | 为什么 |
|---|---|---|
| 正文/标题 | `font-family: 'IBM Plex Sans', var(--font);` | ① 反模式禁 Inter/Roboto/system-ui 作**主**字体，但 `--font` 值被 K6b 锁死不能改 → 解法是**在 use-site 前置一个真字体、把 `var(--font)` 当尾巴**，既不新增变量（K6b 安全）又满足 R8.4；② 产品的**排版意图**本就是 Plex：`frontend/src/main.tsx:5-9` 已自托管 `@fontsource/ibm-plex-sans` 400/500/600（**实测**，不是我的偏好），只是 `tokens.css:43` 没引用它 → 我按"意图"而非"漂移"对齐；③ 交付稿**禁 `@font-face`**（零依赖 + 中文子集会爆 2 MB）→ 未装 Plex 的机器自动回落 `--font`，排版仍由 8 档字号/字重撑住层级。 |
| 数据/路径/锚点 | `font-family: var(--font-mono);` | 值本身即 `'JetBrains Mono', 'Fira Code', monospace`，产品已自托管 400/600（`main.tsx:8-9`）。工业调性的承重墙：所有 commit/路径/端点数/编号走等宽。 |
| 中文 | 不加 `font-feature`、不换 CJK 字体文件 | 零依赖下任何 CJK 字体声明都是空头承诺 → 只写系统栈尾巴。 |
| **禁** | 自造 `--font-display` / `--font-body` | 这两个名字在 app 里正是**幻影变量**（§0.2③：`--font-display` 被引用 35 次、零声明）→ 抄进交付稿＝K6b 红 + 静默失效。 |

### 5.2 字号闭集（**8 档，全来自实测用量，禁第 9 档**）

实测 `frontend/src` 的 `font-size` 只有 8 个值：`10(2) 11(4) 12(2) 13(3) 14(1) 15(1) 18(1) 24(1)`（括号为出现次数），根 `html{font-size:14px}`（tokens.css:94）。交付稿**不发明第 9 档**（U1 机验）。

> **口径限定（R6.2，别把这句话读成 brownfield 事实）**：上式子量的是 **CSS 侧 `font-size: <N>px` 写法** —— 全仓 **15 处 / 8 值**，只落在 2 个文件（`tokens.css` 与 `pages/ToolDetail.tsx:45-46` 的 Markdown 内联样式串）。产品的**主用通道其实是 JSX 内联 `fontSize`（实测 75 个文件 / 15 个值：`8 9 10 11 12 13 14 15 16 18 20 22 24 28 32`，`App.tsx:274` 就是 16）**。8 档是**本交付稿自身的排版裁量**（文档不需要 16/20/22/28/32 这类 UI 密度档，且"字号"这一样归我），**不沿用**其密度档；🟫/🟦 若要判"产品只有 8 档"，那是误读。
> **写法契约**：字号一律 `font-size:` 长写法，**禁 `font:` 简写**（简写里的字号原本逃得过 U1；现由 U1 加抓简写 + U1b 直接禁用，见 §13.1-3）。

| 档 | 角色 | 字号/字重/行高/字距 | 用在哪 |
|---|---|---|---|
| T1 | 文档 H1（masthead） | 24px / 600 / 1.2 / -0.01em | 全站唯一一处 H1（不新增第二处，避免"hero 大数字"味） |
| T2 | 域章 H2 | 18px / 600 / 1.35 | 12 个域章（11 域 + 外壳） |
| T3 | 附加章 H2 | 15px / 600 / 1.4 | 融入、slug 表、局限、附录（与域章层级分开，**不用 `class="domain"`**：K6c 要数到 12） |
| T4 | 页块 H3 / 待标注 H3 | 13px / 600 / 1.5 / mono | 页块名＝文件名原文（mono） |
| T5 | 正文/说明 | 13px / 400 / **1.7** | `.page-sum`、边界句（长中文行、非 UI 密度） |
| T6 | 表格 | 12px / 400 / 1.55 | slug 表、附录索引、对比表 |
| T7 | 徽标 | **10px** / 500 / 1.3 / +0.01em | 两轴 chip（**限两字**：已有/半接/未做/未接/演示/规划；「竞品建议」四字是唯一例外，见 §13-U6） |
| T8 | 目录与 meta | 11px / 600（栏题）· 13px（项） / 1.5 | 左栏；12px mono（校准基线行、来源行） |
| — | 弱层 | **14px 只用于 `html{font-size}` 根**；不出现裸 14px 文字 | 保留根字号给 rem-free 的 px scale 稳定性 |

**字重词汇**：`400 / 500 / 600`（= 产品已加载的 Plex 三档）；`700` **只允许**出现在等宽数字块（app 现状 `tokens.css:198`）；`800` 禁用（app 有 2 处，但产品只加载到 600 → 那是合成粗体，交付稿不复制这个缺陷）。

---

## 6. 间距 · 圆角 · 动效（我拥有「间距」这一样）

### 6.1 间距档位分配（**8 档闭集，禁第 9 值；禁表外 px**）

`--s1 4 · --s2 8 · --s3 12 · --s4 16 · --s5 20 · --s6 24 · --s8 32 · --s10 40`（`--s7/--s9` 不存在，禁"补齐"）。
反模式清单嫌"均匀 4/8/12/16/20 无节奏"（`ui-anti-patterns.md:51`）→ 我不能改 scale 值（K6b），改的是**谁有资格用哪一档**：

| 档 | 授权用途（只这些） | 明确禁止 |
|---|---|---|
| `--s1` 4px | 徽标内左右间隙、chip 之间 | 任何块级 padding |
| `--s2` 8px | 表格单元上下、nav 项内边距、块内 gap | 卡内边距（太挤） |
| `--s3` 12px | 卡内左右 padding 的下半档、页块上间距、nav 项左右 | — |
| `--s4` 16px | **唯一**的卡/待标注内边距（对齐 app `.card`） | 章间距（会读成密排） |
| `--s5` 20px | 保留档：本轮不授权任何用途（留作 4-dev 确需时的最小上界，禁自增 22/28） | — |
| `--s6` 24px | 域章内段落间距、双栏 gap | — |
| `--s8` 32px | 域章上内边距 | — |
| `--s10` 40px | masthead 上下、文档左右留白 | 段内（会散架） |

节奏靠 **16（块内）→ 24（块间）→ 32/40（章间）** 的跳档做出来，不靠新数值。

### 6.2 版心几何（**唯一允许的字面量白名单，U12 机验**）

颜色与间距走 `var()`；**几何尺寸不是 token 的领域**（`tokens.css` 只有一个 `--cp-detail-width:420px`，且它是详情面板宽度，拿来当版心＝语义错用+把交付稿绑到控制面专属变量上）→ 三个数钉死，其余一律 `var()`：

| 值 | 用途 | 依据 |
|---|---|---|
| `200px` | 左栏宽 | 与产品侧栏同宽（`App.tsx:265 width: collapsed ? 48 : 200`）→「与原有无法区分」 |
| `44em`（**可选**，非白名单也非字面 px） | 若 4-dev 把某段散文写到多段，正文可加 `max-width: 44em` 收行宽（中文 71 字/行偏长的逃生口，🟫 (b)）；用 `em` 不触 U12 的 px 白名单，且不新增 token（`--cp-*` 语义不合用） |
| `1000px` | 正文列 `max-width` | 1280 − 200(栏) − 2×40(--s10 留白) ≈ 1000 ⇒ **1280 视口零横向滚动**（NFR），且中文一行 ≈ 71 字 |
| `9999px` | skip-link 移出屏（`:focus` 复位） | 可达性基线，非视觉值 |

不做断点：NFR 明写「不承诺移动端」；`--cp-detail-width`、断点、`vw/vh` 一律不引入（第二栏在 1280 放不下 → **域目录进左栏，不做右侧 TOC**）。

**边框/焦点环宽度不写成 `<n>px` 几何声明**：一律用 `border:` / `outline:` 简写（`border:1px solid var(--border)`、`outline:2px solid var(--blue)`）——`1px`/`2px` 是描边语汇不是版心，白名单只管 `grid-template-columns|max-width|min-width|width|left` 五个**带词首边界**的声明（U12 机验；无边界时 `border-width:`、`--cp-detail-width:` 这类都会被算进来，实测假红 `420px`）。

### 6.3 圆角

`--r-sm 4` → 徽标 / `<code>` / 导航项 / 表格内链接块（app 51 次的主流档）· `--r-md 8` → 页块与待标注卡（app `.card`）· `--r-lg 12` → **仅** SVG 图容器，禁用于卡（会把文档读成营销卡）。禁 999px 胶囊、禁混合圆角。**不做嵌套卡**（页块不是卡中卡：域章本身无底色）。

### 6.4 动效（**本交付稿＝零动画**）

- 允许：`transition: color/background-color/border-color/outline-color var(--fast) var(--ease)` —— 只有颜色，100ms，缓动取产品唯一曲线。
- 禁止：`transition: all`（app 有 2 处）、`transition: width`（`App.tsx:269`）、任何 `@keyframes`（app 有 `pulse-red`/`spin`/`slide-in`/`dash-flow` 四条，**一条都不用**）、**`scroll-behavior: smooth`**（平滑滚动本身就是这份稿里唯一的滚动动画，与 §0.4 打破①「零动效」同族；U9b 机验）。原生滚动不劫持。
- 兜底沿用产品那条媒体查询：`@media (prefers-reduced-motion: reduce){ html{scroll-behavior:auto} *,*::before,*::after{animation-duration:0ms!important;transition-duration:0ms!important} }`（源 `tokens.css:117-119`）→ U9 机验存在。**口径据实**（🟫 ② 纠正；实测 `grep -rn 'scroll-behavior' frontend/src` → **0 命中**）：产品侧根本没有 `scroll-behavior` 这条声明，`tokens.css:117-119` 只有 `*{animation/transition-duration}` 一族，`prefers-reduced-motion` 全仓也仅此一处 → 本稿的 `html{scroll-behavior:auto}` 是**我自补的显式声明**，不是"逐字沿用产品形态"；§0.2 动效语言行同步改正，U9 期望值不变。
- 滚动定位反馈由**静态描边**承担，且必须用**看得见的那一档**：`.domain:target, .page-block:target, .notice:target { outline: 2px solid var(--blue); outline-offset: 2px; background: var(--bg-selected) }`。理由：`:target` 是本稿**唯一**的跳转反馈通道（无按钮、无动画、不做当前项高亮），而 `--blue-border` 叠底实测 **1.30:1（on `--bg-app`）/ 1.33:1（on `--bg-card`）**，与 `--border`（1.06）/`--border-strong`（1.34）同档 → 用它等于违反 §3.1 hairline 行我自己写下的「不足 3:1 不得用于表达交互态」（🟫 ① 与 🟦 阻断一独立复算同判）。改用焦点已用的 `--blue`（5.29/5.87:1 ≥ 3:1，与 §7 N7 的 `:focus-visible` 同形、`outline` 不动布局）；`--bg-selected` 底**保留**为第二通道（叠底 ΔL +0.057/+0.049，暗色分层阈值 0.04 以上），但**判定不依赖它**；新增 U14 机验 `:target` 里禁现 `--blue-border`。

---

## 7. 导航形态与信息架构（我拥有「导航形态」这一样）

```
┌─ 200px 左栏（sticky，自身可滚，bg-sidebar + hairline 右界）────┬─ 1000px 正文列 ─┐
│ ▌平台入口（镜像实现挂载）＝13 项 · 每项 <a class="toc-entry" data-nav="label 原文" href="#pg-<挂载页>">  │ header.masthead  │
│   工具库 工作流 角色 Agent 💬 对话中心 Agent 管控 编排 监控        │  H1 + 校准基线行  │
│   项目 知识库 审批 用户管理 审计日志        ← App.tsx label 原文    │  图例（D17 合规） │
│ ▌能力域 11 项（href="#sec-*"，第 8 域写「审计日志」，见下）        │ main > section×12│
│ ▌附录 2 项：调研局限 / 边界句所在域索引                          │  + 3 附加章      │
└──────────────────────────────────────────────────────────────┴─────────────────┘
```

| # | 决策 | 硬约束来源（不是审美） |
|---|---|---|
| N1 | 左栏**两组**并存：`平台入口（13）` 镜像实现导航，`能力域（11）` 镜像 BASELINE §2 域表 | AC-2「13 入口全出现」+ D3/D4「两套坐标同时给」。**只有第一组带 `data-nav`**，第二组带 `class="toc-domain"` —— 因为 **K5 是 `diff(两侧) → 必须空`**，多写一个 `data-nav` 值即红 |
| N2 | `data-nav` 的值＝`App.tsx` label **原文**，含 `💬 对话中心` 的 emoji，**逐字不许改** | K5 派生自 `grep -oE "label: '[^']+'"`；改字面串＝动接口（D5）。emoji 例外登记在 §11（全稿唯一一处，白名单进 U8） |
| N3 | 第 8 域在目录里写 **「审计日志」**（App 的 label 原文），**不写「安全与审计」** | D10：「安全与审计」字样全文只许在 `#sec-security` 内一次；且 AC-7 的词锚 awk 从**第一次**命中起开窗 → 目录里写就把窗口漂到文档头部，K7/票面两版必然打架（🟩 C2 同款）。章内 H2 才是域名原文 |
| N4 | 域章顺序＝BASELINE §2 的 1..11 + 外壳，**附加章（融入/slug/局限/附录）排在 12 个域章之后且不带 `class="domain"`** | K6c `grep -c 'class="domain"'` 必须 12（11 域 + 外壳）；U4 机验目录不越界 |
| N5 | 跳转全靠 `#` 锚点 + `<details>`，**零 JS**；不做"当前项高亮" | 静态稿无路由态，写 `aria-current` 会恒假（＝对读屏器撒谎，🔴 反模式）；`:target` 只做被跳到的**块**的描边反馈。`<details>` 原生键盘可达（Enter/Space）→ 不必为折叠写 JS |
| N6 | 每页块 `id="pg-<页面名原文>"`，目录/来源行/边界句一律用 `#` 锚点引用（**引用用 id，不复述域名**） | AC-1 可指认性；附录只写「S 号 → `#sec-*`」＝D3/D11 新规格；避免第二处出现枚举/域名字样 |
| N7 | 键盘与读屏路径：`跳至主内容` skip-link → 左栏 13+11+2 **链接** → 正文 `<a>`；定位走原生瞬时（`html{scroll-behavior:auto}`，无 smooth）；`:focus-visible` 一律 2px `--blue` 环（5.29:1 ≥ 3:1 图形对比） | WCAG 2.4.1 绕过区块 / 2.4.7 可见焦点 / 1.4.11 |
| N8 | **13 条入口各自的落点钉死，且从代码现算**（🟦 阻断二）：`<a class="toc-entry" data-nav="<label>" href="#pg-<挂载页组件名>">`。推导链：`App.tsx:51-63`（`NAV` 11 项）+ `:65-68`（`ADMIN_NAV` 2 项）给 `id`→`label`；`renderContent` 的 `case '<id>': … <Component …>` 给 `id`→挂载组件 ⇒ `#pg-<Component>`。三条实测特例：① `orchestration` 有三分支（`:248` 一带），**默认挂载 `OrchestrationListPage`** → 落点取它，1:N 的展开交第二组 `#sec-orchestration`（这正是两组并存的意义：**入口到"那一页"、域到"那一组页"**）；② `users`/`audit` 的 `case` 各出现**两次**（`:146-147` 是权限门 `return perm(...)`、`:231-232` 才是挂载分支）→ 取含组件的那个；③ 13 个目标组件**全部**在 32 页集合内（无需新增块）。失效形态写死在这里的理由：`<a>` 不带 `href` 就**不是链接、不进 tab 顺序** → 全闸跑绿仍交出"看着能点、按 Tab 跳不过去"的左栏，而 U10 只数条数抓不到 | US-2 读懂导航结构 / N7 的键盘路径；U15 + U16 机验 |

---

## 8. 组件规约（交付稿需要的 12 件，全部 <30 行 CSS 可实现）

> 每件的「类名/属性」列＝接口（§1.5 已钉的不可改；本文件新钉的是**纯视觉 class**，改它们不需要同步 `REQUIREMENT.md`，见 D5 与本节末注）。

| 组件 | 标记形态（**一物一行＝物理单行**） | 长相 | at-rest / hover / focus |
|---|---|---|---|
| **C1 masthead** | `<header class="masthead">` + `<h1>` + `<p class="baseline">` + `<div class="legend">` | 上下 `--s10`，下 hairline；H1 T1；基线行 mono 12px `--text-secondary` | 无 hover；基线行文案逐字钉：`校准基线：<7-40 位 hex> · YYYY-MM-DD · 页面 32 / 端点 168 / 域 11`（K10 严格式 + AC-6 三处一致） |
| **C2 域章** | `<section class="domain" id="sec-…">`（**`class` 必须写在 `id` 前**，见 §10-冲突 C） | H2 T2 + `--s8/--s4` 内边距 + 下 hairline | `:target` → `outline:2px solid var(--blue); outline-offset:2px` + `background:var(--bg-selected)`（**禁 `--blue-border`**，U14）；无底（防卡中卡） |
| **C3 页块** | `<article class="page-block" id="pg-X" data-page="X" data-domain="域原文" data-owner="本项目已有" data-anchor="frontend/src/pages/X.tsx">…</article>`（**同物理行**） | `--bg-card` 底 + `--r-md` + `--s4` 内边距 + 1px hairline + H3 mono | rest 平面（**无阴影**）；hover 只 `background: var(--bg-card-hover)`（100ms 颜色过渡）；`:target` 描边 |
| **C4 归属徽标 `o1..o4`** | `<span class="chip chip-o1">已有</span>` —— **短词走文本节点**，枚举原串只在 `data-owner`/`data-state` 属性里（🟫 ④：`::after` 生成内容不进 Ctrl+F、不进选中复制，评审搜「半接/演示/竞品建议」= 0 结果，而这三个词正是 §2「定位 → 核对 → 判归属」的抓手；D13 的单写红线仍咬得住——短词非原串，实测双写原串才红 `occ 5/lines 3`，文本节点形态 `33/33` 绿） | 10px/500，`--s1`/6px 内距，`--r-sm`，1px `--border-strong` 框，底：o1/o2/o3 用**产品 `.badge` 原形**（`tokens.css:155-162` 同色 8% 底 + 无边框：`background:var(--green-bg)/--orange-bg/--blue-bg`、`border-color:transparent`；叠底对比度 §4 已算 7.13 / 6.28 / 4.78 全过 AA）——🟫 ③：我原来的 `--bg-card`+1px 框把产品的"状态标签"画成"表单小框"，读起来不再是同一个东西，且让 T-UI-05 有两种都合法的形态可抄；o4 与 s1..s3 仍 `--bg-card` + 框（红字不落红底＝§4 实测 4.28 裁定的同一族）；文字色 o1 `--green`／o2 `--orange`／o3 `--blue`／o4 `--text-secondary` | `::after` 白名单：`已有/半接/竞品建议/未做`；**禁出现枚举原串**（U6a/U6b）；`:hover` 不变（不是控件） |
| **C5 状态徽标 `s1..s3`** | 同 C4，`chip-s1|s2|s3`，**不再需要** `role="img"`+`aria-label`（文本节点天然可读；🔴 可复算该维） | 文字色一律 `--text-secondary`（**中性**：状态不叠第二套语义色，避免与归属色打架） | 白名单：`未接/演示/规划`；与 o 徽标同排、gap `--s1`、**归属在前** |
| **C6 待标注块** | `<section class="notice" id="nb-<语义名>" data-state="…">`（可带 `data-owner`/`data-anchor`/`data-slug`） | 同 C3 但框 `--border-strong`，H3 T4 + 现状句 T5 + 「缺哪半条腿」T5 | 无 hover；`⚠️` 之类前缀**禁用**（emoji 白名单只有 N2 一处） |
| **C7 边界句** | `<p class="edge-note">现状 + 边界限定词</p>`（**必须在同域章内、且早于本章任何嵌套 `<section>`**，§10-冲突 B） | 13px `--text-secondary`，无底色无线条——**不做彩色左条**（§0.4 打破③），用 `12 · ` 前缀序号代替 | — |
| **C8 融入块** | `<div class="view-block" id="vb-G4" data-from="G4"><p class="vb-src">来源：调研结论 G4</p>…</div>` | 上 hairline（不是卡！）+ 来源行 mono 11px | 一行只准一个 `调研结论 G<n>`（AC-13/K4b 的 occ==lines） |
| **C9 slug 表 / 附录表** | `<table>` + `<caption class="page-sum">` + `<tr data-slug="…">` / `<tr><td>S1</td><td><a href="#sec-security">#sec-security</a></td></tr>` | 12px，行线 hairline，`th` `--text-secondary` 500；单元不截断不换行成省略号（NFR）；`td/th{overflow-wrap:anywhere}`（同 🟦 非阻断2，长 slug/URL 不得顶穿版心）。**两表行数一律现算、禁写范围号**：slug 表＝`RESEARCH §2` 的**交付稿可见子集**（依 **D19**，真源全集与可见集可以不等、差值显式登记在闸行，禁把内部件画进稿子凑绿）；附录表＝**稿内实际出现的边界句数**（BASELINE §4 现有 11 条，但 S11 与 `admin-file-read-jail` 同源、依 **D11/D19 不进外发稿** → 附录 **10 行**，实测样本 10 行） | 行 hover `--bg-card-hover`；附录标题逐字：`附录：边界句所在域索引`（**禁**「S1-S10 总表/清单/一览/目录」「攻击面」「弱点」（K11）；禁复述限定句文本与域名字样（D3/D11）） |
| **C10 图例** | `<div class="legend"><p>本项目已有 = 能在 <code>frontend/src/pages/</code> 或 <code>backend/routes/</code> 指到实现</p>…</div>` | 12px `--text-secondary`，每项一行 | **图例必须建立短词↔原串映射**（🟦 非阻断1）：`部分已有（徽标「半接」）= …`、`缺失-竞品建议新增（徽标「竞品建议」）与缺失（徽标「未做」）= …` —— 全稿原本没有任何地方建立这两对映射，而「半接」正是评审最关心的「缺哪半条腿」入口；合规我核过：AC-5b 仍 `occ==lines`（每行只 1 次原串）、D17 同行含路径子串 ✅、U6a/U6b 禁的是 CSS `content:` 与 `aria-label`，图例是 HTML 文本不触。另加一行 `不支持打印/导出 PDF` 声明（见 §11 新行）。**D17**：含归属枚举值的行必须同行含路径子串，否则 AC-5a 假红；解释句禁复述 `data-*` 原串以外的枚举写法（U6） |
| **C11 代码/锚点** | `<code>frontend/src/…:12-20</code>` | mono 12px `--text-secondary`，`--bg-input` 底 或无底 + `--r-sm`，**不上色**；`overflow-wrap:anywhere`（🟦 非阻断2：最长 slug `human-agent-assignment-board` 28 字符、最长来源 URL 36–37 字符，12px 等宽 ≈ 200–270px，一格不包就顶穿 1280 无横向滚动那条 NFR） | 链接态才用 `--blue`；路径一律**仓库相对路径**（禁绝对路径与用户名，AC-4 tier-2） |
| **C12 SVG 框图** | `<svg viewBox class="fig">` + `<g class="node">` / `<path class="edge">` | `.node{fill:var(--bg-card);stroke:var(--border-strong)}` `.edge{fill:none;stroke:var(--blue);stroke-width:1.5}` —— **SVG 内不写字面色、不写 `var()` 进 presentation 属性**（浏览器不可靠），一律走类 | 无 `<use href>`（AC-3 正命门）、无 `data:` 位图、`<title>`/`role="img"`+`aria-label` 给读屏器；两张为限（D3 框图 + §3 状态机） |

| **C13 左栏项** | `<a class="toc-entry" data-nav="<label>" href="#pg-<Component>">`（第一组）／`<a class="toc-entry toc-domain" href="#sec-*">`（第二组）／附录两条同形 | `display:block; padding:7px var(--s3); margin-bottom:2px; border-radius:var(--r-sm); font-size:13px; color:var(--text-secondary)`；栏题 11px/600；hover 只动 `background:var(--bg-card-hover)`+`color:var(--text)`（与产品 `.card-clickable:hover` 同族信号，🟫 (c) 见下） | **`href` 是接口的一部分**：无 `href` 的 `<a>` 不是链接、不进 tab 顺序（N7/U15 机验）；`data-nav` 仍只许第一组用（K5/N1）；U16 机验每条 `href="#x"` 都能在同稿找到 `id="x"` |
| **C14 打印声明行** | `<p class="edge-note">本稿不支持打印 / 导出 PDF…</p>`（masthead 图例之后一行） | 13px `--text-secondary` | 沉默不管——🟦 非阻断3：本稿定性"天生会被转发"，而浏览器默认不打印背景，`--text` 压白纸实测 **1.30:1** → 显式表态"评审以屏读为准"（U17 机验存在）；要不要做打印态是产品决策，归口 §14-⑨ |

**注（D5 的适用面）**：上表中 `class="page-block"`、`data-*` 五属性、`id="nb-*"`、`id="vb-G*"`、`sec-security`/`sec-control-plane`、`<管理员口令>`、校准基线行的串——**都是接口**，改它们必须同笔改 `DESIGN.md §1.5`；`chip-o1..s3`、`toc-entry`、`edge-note`、`toc-domain`、`legend`、`fig`、`view-block` 之外的视觉 class 与全部 §5/§6 数值——**是我这一棒新钉的视觉规格**，改它们只需改本文件，不动 `REQUIREMENT.md`。

---

## 9. 状态 × 交互矩阵（组件 × 六态）

| 组件 | at rest | hover | `:focus-visible` | `:target`/当前 | 键盘 | 读屏 |
|---|---|---|---|---|---|---|
| 左栏入口 / TOC 项 | 13px `--text-secondary`，无底 | 底 `--bg-card-hover` + 字 `--text`（100ms 颜色） | 2px `--blue` 环 + 2px offset | 静态稿无路由态 → **不做当前项态**（N5） | Tab 逐项，Enter 跳锚 | `nav[aria-label="文档目录"]` 内链接；`💬 对话中心` 原文照读 |
| 域章 / 附加章 | 无底 + 下 hairline | — | — | `outline:2px solid var(--blue)`（**非** `--blue-border`）+ `--bg-selected` 底 | 由 TOC 进入 | `<section>` + `aria-labelledby` 指向 H2 |
| 页块 C3 | 平面卡（**无阴影**） | **无 hover**（🟫 (c)：产品里 `--bg-card-hover` 专配 `.card-clickable{cursor:pointer}`（`tokens.css:183-184`），本稿页块无可点声称 → 借它就是在谎称可点；`card→hover` 的 ΔL 本来也只有 0.027） | 内含链接时环在链接上 | 描边 | 无可聚焦子件（`h3` 不 tabindex） | `article` + mono 文件名读作逐字（路径类，正确） |
| 徽标 C4/C5 | 短词**文本节点**；o1-o3 同色 8% 底无边框（产品 `.badge` 原形），o4/s1-s3 `--bg-card` + 1px 框 | 不变（非控件） | 不适用 | 不适用 | 不适用 | 可读性靠文本节点本身（🟫 ④：`::after` 文案不进 Ctrl+F/复制，故放弃该形态；D13 的"文案不在 DOM 里"这一半由文本节点直接消除，`content:` 与 `aria-label` 禁枚举原串仍由 U6a/U6b 守着） |
| 待标注 C6 | 强框 + 现状句 + 双徽标 | **无 hover**（同 C3；用 `<details>` 时靠原生 `summary` 的 `:focus-visible` 环给反馈） | — | 可被 `#nb-*` 直达 → 描边 | 若用 `<details>`：Enter 展开 | 展开态由原生 `summary` 播报 |
| 融入块 C8 | hairline 上界 + 来源行 | — | 链接 hover 同 C11 | 描边 | Tab 到 `<a>` | 来源行可读 |
| 表格 C9 | 行线 hairline | 行底 `--bg-card-hover` | 单元内链接有环 | — | 原生表格朗读 | `caption` + `th[scope]` 齐（**禁 placeholder 式表头**） |
| 折叠 `<details>` | `--s3` 上距，summary 13px `--blue` | 下划线 | 环在 summary 上 | — | Enter/Space 原生 | 无需 JS |
| 口令占位 | `<code data-literal="<管理员口令>">&lt;管理员口令&gt;</code>` | — | — | — | — | 朗读 `管理员口令`（占位符，不含真凭据，AC-9/US-5） |

**两轴 12 格 → 视觉映射**（DESIGN §3 矩阵的视觉面；✗ 格由 **K3b 硬红**，不是靠肉眼）：

| 归属 × 标注 | `未接入` | `演示边界` | `规划中` |
|---|---|---|---|
| `本项目已有` | ✗ 不得出现（K3b 红）→ 实情若确为"有码没接线"，**改判归属为 `部分已有`** | ✓ 画法：`已有` 绿 + `演示` 中性双 chip（S1-S10 类） | ✗ 不得出现 |
| `部分已有` | ✓ `半接` 橙 + `未接` 中性 + 必写「缺哪半条腿」句 | ✓ `半接` + `演示` + 缺腿句 | **△ 唯一悬置格**：`半接` + `规划`，且必须已登记议题 slug；视觉上不合并成单 chip（ADR-003：两轴永不合并），UAT-6 逐处勾 |
| `缺失-竞品建议新增` | ✗ | ✗（禁把竞品能力画成我们的演示边界） | ✓ `竞品建议` 蓝 + `规划` + `data-slug` |
| `缺失` | ✗（🟩 C1 收紧后与 K3b 同结论） | ✗ | ✓ `未做` 灰 + `规划` + `data-slug` |

---

## 10. 本轮实跑撞出来的四处判据/派生式问题（已按最小合规形态落地，**不擅改任何已投票或已冻结命令**）

| # | 冲突事实（实跑所得） | 本基线的落地解法 | 归口建议（不由我改） |
|---|---|---|---|
| **A** | **AC-9 与 HTML 转义互斥**：票面命令是 `grep -c "<管理员口令>" "$F"` ≥1，而 HTML 里要**可见**显示尖括号必须写 `&lt;…&gt;` → 该形态**不含**字面 `<管理员口令>`，实测 `grep -c` = **0**（红）。写成裸 `<管理员口令>` 则被当未知标签解析、屏幕上什么都不显示（＝"为过闸而写不可见文本"）。 | 两者都要：**可见部分转义** + **同元素属性保留机读原文**：`<code data-literal="<管理员口令>">&lt;管理员口令&gt;</code>` → 实测 `grep -c` = **1** ✓、屏幕上正常显示 `<管理员口令>` ✓、DevTools/DOM 里原文也在（不是隐藏文本）。 | 下轮 `REQUIREMENT` 若愿改：命令换成 `grep -cE "(<|&lt;)管理员口令(>|&gt;)" "$F"` 即两形态皆放行（AC-9 属已投票 → 本 change 不动）。 |
| **B** | **K7/K12 的 awk 窗口会被嵌套 `</section>` 提前截断**：K6 强制待标注块写成 `<section … id="nb-*">`，而 K7/K12 的 awk 是「开窗 → 遇**第一个** `</section>` 关窗」。→ 边界句若排在任何嵌套 section 之后，窗口只剩一小截，**K7/K12 直接判 0**（票面词锚版却可能仍判 1 → 两版打架）。 | 域章内**顺序钉死**：`H2 → 边界句 `<p class="edge-note">` → 页块 → 嵌套 notice`；并加两条机验 **U5a/U5b**（边界句行号 < 本章第一个嵌套 `<section>` 行号）。实测样本：`PASS 122<124`、`PASS 99<106`。 | 设计侧可把 K7/K12 换成深度感知 awk，或在 §1.5 把"边界句先于嵌套 section"升为契约（**后者零风险，建议采**）。 |
| **C** | **K7/K12 字面正则仍属性顺序敏感**：两条 awk 都写死 `/<section class="domain" id="sec-security"/`；而 **D16** 说"同标签属性书写顺序不是契约"。→ 只调换 `class`/`id` 顺序就能让设计侧闸静默判 0（本轮实测：把两属性对调后 K7 输出 0）。 | 交付稿一律按 **`class` 在前、`id` 在后** 写域章与全部 `<section>`（钉成形态，见 C2/C6）；这样既满足 K7/K12 现写法，将来闸改成顺序无关也不会红。 | 设计侧：K7/K12 与 D16 口径并档（`<section[^>]*id="sec-security"[^>]*>` + awk 分段取属性），与 K3b/K6 的重写同族。 |
| **E** | **我自己触发的 AC-12 红（已修，留在这是为了让"跑解析器"这件事留下代价记录）**：回写票面时我用 `/opt/python3.14/bin/python3` 直接 import `backend/parsers/gate.py` 复验票面块 → 生成 `backend/parsers/__pycache__/gate.cpython-314.pyc`，随后的 `git add -A` 把它一起提交 → AC-12（零 L1 写入）在 `e419b88f` 之后实测 **1** | `a6a73506` 删除该产物，`b15c4554..HEAD` 净差异回到 **0**（AC-12 复跑 ✅）。纪律：**读产品代码的解析器要在仓库外副本里跑**，或跑完立刻清 `__pycache__` 再 `add`；`.gitignore` 补 `__pycache__/` 是 L1 写入，我不做 → 归口 §14-⑧ |
| **D** | **K1 的左集派生式在并档后的 `BASELINE §2` 上产出脏项**（本轮实测：并档后现式左集 **33 项 ≠ 32 页**；`comm` 双向报「缺页 2 项 / 虚构页 1 项」，其中一项是 `` `pages/Detail.tsx:3-9`） ``，另一项是 grep 的**运行期提示语**被当成集合元素）。根因不是内容错，是 **`tr '、' '\n'` 按字节处理**：`、` 的 UTF-8 三字节是 `E3 80 81`，于是任何含这三个字节的汉字都会被撕开——实测 `流`＝`E6 B5 81`、`见`＝`E8 A7 81` 都在被撕之列（`BASELINE:35` 并档新增的注解文字里就有它们）→ 产生非法字节序列 → `grep -vE` 判定输入为二进制并把「匹配到二进制文件 （标准输入）」写进 stdout。**并档前同一式子给 32 项干净集合**，所以这是一次"措辞改动引爆既有脆弱式"，不是谁写错了数字。 | 本阶段把跑批式改成**先剥括号注解再按顿号切分**：`sed -E 's/（[^（）]*）//g'` 前置 → 实测左集回到 **32**、`comm` 双向**全空**（§13 的 K1a/K1b 就是这个式子；K1c/K1d 两行保留现式实测值作证据）。交付稿侧**不需为此改任何东西**（页集本来就是 32）。 | 架构设计（DESIGN §1.5 的 K1 与 §7.6 配方同一条左集式）；若不愿改式子，则需求侧需知：`BASELINE §2` 的页面列括号注解**不要用含 `、`以外汉字的长注解**（不可持续，建议仍改式子） |

---

## 11. 占位符策略（R8.9 · 绝不为"看起来完整"自造内容）

| 缺的东西 | 本项目有什么 | 交付稿用什么占位 | 禁什么 | 实测依据 |
|---|---|---|---|---|
| 图标库 | `lucide-react`（58 文件，`size={16}`） | **导航不留图标位**，纯文字 + 缩进；框图用自绘 `<rect>/<path>` 几何 | ❌ 自造 SVG 插画、❌ emoji 装饰 | 零依赖下图标库用不了；`templates-UI-DESIGN.md:222` |
| emoji | 产品源码**确实普遍用 emoji**（实测 45 个文件含 emoji 字符：`✅`37 · `🪙`30 · `❌`29 · `🤖`18 · `🔀`16 · `💬`11 次）→ 触发 `templates-UI-DESIGN.md:230` 的例外条件「品牌原本就用 emoji 时才允许」 | 但**交付稿只继承 1 处**：`💬 对话中心`（`App.tsx:56` 的 label 原文，被 **K5 锁死**）；其余零 emoji（U8 机验白名单外 = 空） | ❌ 把 app 的 emoji 习惯搬进文档当装饰（`✅/❌` 在表格里尤其禁——它会被读成"判定结果"，与两轴徽标的语义打架） | 本轮 `grep -roP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]'` 计数 |
| 头像 / 人脸 | 无头像组件 | 不出现人物位 | ❌ AI 生人脸、❌ 网抓图 | 无该组件 |
| 图片 / 截图 | `demo.gif` 2.8 MB（一张就爆 2 MB 预算） | **界面骨架＝文字清单**（区域名 + 控件名 + 关键状态），框图＝内联 SVG | ❌ 位图、❌ `data:image` 内联、❌ 假截图 | ADR-001 排除项 3 + AC-3 |
| 数字 / KPI | BASELINE §1 同口径命令 | 一律**派生现算**（`32/168/11/26/12/9/13`）+ 校准基线行 | ❌ 编活跃用户数、❌ 抄 CHANGE 参考数、❌ 交付稿自计任何数 | CHANGE:25 数字口径条 |
| 示例数据 | 无真实业务样例授权 | 全合成（`demo-user` / 相对路径 / 占位口令）+ 合成声明行 | ❌ 真口令、❌ IP、❌ 邮箱、❌ 绝对路径（AC-4 双 tier；**反例连本文件都不能写**：四段点分十进制的回环地址字面量会被 tier-1 的 IP 式自己命中，实测曾在此行假红 → 一律写「本机回环地址」） | `grep -cE "[0-9]{1,3}(\.[0-9]{1,3}){3}"` 交付稿须 0 |
| logo | 文字标 + 几何字符 `◈` | `◈` + 文本 `AgentFlow`（`README.md:1`/`CLAUDE.md` 一致） | ❌ 自绘额外图形标、❌ 用 `App.tsx:275` 的「AI 开发平台」（→ §14-上报④） | `App.tsx:274` |
| 竞品名 | 4 家点名，2 家已定位 | 只写已定位者（含来源 `<a href>`）；Buzzz/AgentOS 标「**未定位/三义待指认**」 | ❌ 把竞品自述当本项目既有能力、❌ 编"业界普遍" | RESEARCH §1 |
| 打印 / 导出 PDF | 无 `@media print`（实测 `grep -cE "打印\|@media print"` → UI-DESIGN 改前 **0** · REQUIREMENT **0** · DESIGN **0**；`DESIGN:281` 的 R5 谈的是外发**泄**面不是打印态） | 稿内一行**显式声明不支持**（C14 + U17），评审以屏读为准 | ❌ 沉默——那等于让 4-dev 替产品做一个没人批的承诺（暗色底压白纸实测 `--text` 1.30:1，整条路不可用）；补真打印态需一套 light 配色 → 破 U2b 的"颜色只从 `var()` 来"，属新 token 决策，须走需求门 | 本轮无授权；归口 §14-⑨ |
| 客户推荐 / 活动计数 | 无 | **无此区**（管控台文档不设证言位） | ❌ `TESTIMONIAL PLACEHOLDER` 都别放——放了就是占位符病 | — |

---

## 12. 反 AI-slop 自检（逐类对照 `ui-anti-patterns.md` 8 类，**含声明的例外与实测数**）

- [x] **字体类**：⚠️ 例外一处 —— 主字体栈尾巴含 `Roboto`/系统栈（`--font` 锁死值）。**不能改的原因**：K6b 禁改值 + AC-12 禁写 `tokens.css` + AC-3 禁 webfont/CDN。**缓解**：use-site 前置产品已自托管的 `'IBM Plex Sans'`（§5.1）+ display/body 对比靠 8 档字号/3 档字重/字距，不靠"同字体不同字重"。Space Grotesk 未用。
- [x] **颜色类**：无纯黑纯白（`#0d0e12`/`#e1e2e5`）✅ · 无紫色渐变/霓虹青/渐变字 ✅ · 强调色只有 `--blue` 一个 hue，绿/红/橙/紫**只做语义**（清单「模糊地带」：语义需要 → 允许）✅ · 彩色底上灰字：不存在（徽标底是卡色 + 语义色文字，实测 4.28–8.17:1，红字改落 `--bg-card`，见 §4）✅
- [x] **阴影类**：交付稿 `--shadow-*` **零引用**、`box-shadow` 零出现 ✅（app 有 7 处，我不沿用）
- [x] **边框类**：只有 1px hairline；**无 >1px 彩色侧条** ✅（app 11 个文件有 → §0.2③ + §14-上报⑤）；无渐变边框、无玻璃拟态 ✅
- [x] **动效类**：零 `@keyframes`、零 `transition: all/width`、只动颜色、`prefers-reduced-motion` 逐字兜底、无滚动劫持 ✅
- [x] **布局类**：无卡中卡（域章无底）· 非"均匀卡网格 + 图标 + 标题"（页块按域分组、行内密度不齐）· 无 hero 大数字（H1 24px + 一行 meta 即全部头部）· ⚠️ 例外一处 —— 间距 scale 是 4px 线性系（清单嫌"均匀步长"），**不能改的原因**同字体（K6b + AC-12），**缓解**＝§6.1 的档位授权 + 16→24→32/40 跳档节奏 · 深色模式：产品即 24×7 管控台 + 锁定既有实现 → 有理由的例外 ✅
- [x] **文案类**：无 "Boost/Unleash" 空话 · 无 hedging（「未强制改密」「不代表已交付防护」是限定不是含糊）· 无 Lorem · 无按钮 → 不存在 "Submit/Learn more" ✅
- [x] **组件类**：表格有 `caption`+`th[scope]`（不拿 placeholder 当 label）· 无 hover-only tooltip（改用 `<abbr>` + 同行文字）· 无模态（不需 ESC）· 无 skeleton ✅

**两条"来自产品现状、我选择保留"的非命中**（写清楚，别让评审去猜）：`💬` emoji（K5 接口锁定，白名单一处）；`html{font-size:14px}` 密排根（沿用产品，不改）。

---

## 13. UI 侧自检闸 U1…U17（设计侧 K 系列的视觉补充；**本轮逐条实跑**，命令单行、可原样抽出跑；🟫/🟦 的票内修法已并入）

> 适用对象只有一个：`F=.specs/product-prototype-refresh/product-design.html`。它们**不与任何已投票 AC / 设计侧 K 冲突**（只做加严），也不改 §1.5 的字面串。

```bash
F=.specs/product-prototype-refresh/product-design.html
# (1) 字号闭集：交付稿出现的字号必须 ⊆ 实测 8 档，**含 `font:` 简写里的 px**（期望：无输出）
{ grep -oE 'font-size: *[0-9]+px' "$F"; grep -oE 'font: *[^;]*' "$F" | grep -oE '[0-9]+px'; } | grep -oE '[0-9]+' | sort -un | grep -vE '^(10|11|12|13|14|15|18|24)$'
# (1b) 并且直接禁掉 `font:` 简写（字号一律 `font-size:`，见 §5.2；期望 0）
grep -cE '(^|[;{ ])font: *[0-9'"'"']' "$F"
# (2) 颜色只在 :root：根块之外不得出现任何字面色值（期望 0）。锚**必须容忍空格与缩进**：`tokens.css` 真身是第 6 行 `:root {`、第 90 行 `}`，写成严格锚 `/^:root{/,/^}/` 会把整个根块当成"根块之外"→ 实测报 31（假红）
sed -n '/^:root *[{]/,/^ *}/!p' "$F" | grep -cE '#[0-9a-fA-F]{3,8}|rgba?\('
# (3) 幻影变量：交付稿禁复制 app 那 26 个零声明名（期望 0）
grep -oE 'var\(--[a-zA-Z0-9-]+\)' "$F" | sed -E 's/var\((--[a-zA-Z0-9-]+)\)/\1/' | sort -u | grep -cE -- '--(bg-elevated|bg-panel|border-normal|border-weak|color-|duration-micro|font-body|font-display|info|radius-|text-dim|text-primary|text-weak)'
# (4) 章外域名字样：「安全与审计」只许出现在 #sec-security 之内（D10/U4；按"最近一个章开标签"判，避开嵌套坑）
awk '/<section class="(domain|chapter)"/{insec=($0 ~ /id="sec-security"/)} !insec' "$F" | grep -c '安全与审计'
# (5)(6) 嵌套截断双向机验（§10-冲突 B）：边界句行号必须早于本章第一个嵌套 section（期望 PASS）
awk '/<section class="domain" id="sec-security"/{o=NR} o && !e && /X-User-Id|回落/{e=NR} o && !n && /<section class="notice"/{n=NR} END{print (e && (!n||e<n)) ? "PASS" : "RED"}' "$F"
awk '/<section class="domain" id="sec-control-plane"/{o=NR} o && !e && /仿真|模拟/{e=NR} o && !n && /<section class="notice"/{n=NR} END{print (e && (!n||e<n)) ? "PASS" : "RED"}' "$F"
# (7) 徽标文案白名单：CSS content 与 aria-label 里禁枚举原串（D13 机验；期望 0 0）
grep -cE 'content:"[^"]*(本项目已有|部分已有|缺失-竞品建议新增|未接入|演示边界|规划中)' "$F"
grep -oE 'aria-label="[^"]*"' "$F" | grep -cE '本项目已有|部分已有|缺失-竞品建议新增|未接入|演示边界|规划中'
# (8) 比 AC-3 更严的静态化约束：零 <script>/<img>/@font-face/<link>/@import（期望 0）
grep -cE '<script|<img|@font-face|<link|@import' "$F"
# (9) reduced-motion 兜底必须在（期望 >=1）
grep -c 'prefers-reduced-motion' "$F"
# (10) data-nav 恰 13 且不多写（K5 前哨；期望 13）
grep -oE 'data-nav="[^"]+"' "$F" | wc -l
# (11) IP 字面量（AC-4 tier-1 的交付稿侧增量哨；期望 0）
grep -cE '[0-9]{1,3}(\.[0-9]{1,3}){3}' "$F"
# (12) 版心几何白名单（期望：无输出）。必须先排除 :root（`--cp-detail-width` 一类 token 值不是几何声明），且 width 支要有**词首边界**
sed -n '/^:root *[{]/,/^ *}/!p' "$F" | grep -oE '(^|[;{ ])(grid-template-columns|max-width|min-width|width|left):[ ]*[0-9]+px' | grep -oE '[0-9]+px' | sort -u | grep -vE '^(200px|1000px|9999px)$'
# (13) 内部体积预算（NFR 2 MB 的 1/10 = 200 KB；期望 <=200000 **字节**）
wc -c < "$F"
# (9b) 零滚动动画：禁 smooth（§6.4，🟫 ②）
grep -cE 'scroll-behavior: *smooth|scroll-behavior:smooth' "$F"
# (14) :target 禁再走不可见档描边（🟫 ① ＋ 🟦 阻断一）
grep -oE ':target[^}]*\}' "$F" | grep -c -- '--blue-border'
# (15) 每条带 data-nav 的 <a> 必须有 href="#（🟦 阻断二；无 href 的 <a> 不进 tab 顺序）
grep -oE '<a [^>]*data-nav[^>]*>' "$F" | grep -vc 'href="#'
# (16) 每个 #锚点都落得到（同稿存在该 id；期望空）
comm -23 <(grep -oE '<a [^>]*href="#[^"]+"' "$F" | sed -E 's/.*href="#([^"]+)".*/\1/' | sort -u) <(grep -oE 'id="[^"]+"' "$F" | sed -E 's/id="([^"]+)"/\1/' | sort -u)
# (17) 打印不承诺必须显式声明（🟦 非阻断3）
grep -c '不支持打印' "$F"
```

**本轮跑法与结果（不是承诺，是已跑）**：一致性样本 `good2a.html` 由 §1.5 派生命令现算生成，落在**仓库外** `$TMPDIR/ui2a/`（一次性的 `build.py`/`run.tsv` 同处，**均不入库**——入库会同时违反 D2 与 §2 单向依赖）。跑完 `git status --porcelain` = **0 行**。

| 闸 | 结果 | 闸 | 结果 | 闸 | 结果 |
|---|---|---|---|---|---|
| U3 幻影变量 | ✅ 0 | U4 章外域名 | ✅ 0 | U5a / U5b 嵌套截断 | ✅ `PASS 123<125` / `PASS 100<107` |
| U6a / U6b 徽标枚举串 | ✅ 0 / 0 | U7 静态化 | ✅ 0 | U8 emoji 白名单外 | ✅ 空 |
| U9 reduced-motion | ✅ 1 | U10 data-nav | ✅ 13 | U11 IP 字面量 | ✅ 0 |
| U1 字号闭集 | ✅ 空 | U1b 禁 `font:` 简写 | ✅ 0 | U2b 根外色值（宽容锚） | ✅ 0 |
| U12 几何白名单 | ✅ 空 | U13 体积 | ✅ 28 746 B（预算 200 KB 的 14.4%） | U9b 滚动动画 | ✅ 0 |
| U14 `:target` 禁 `--blue-border` | ✅ 0 | U15 `data-nav` 必带 `href` | ✅ 0 | U16 锚点落点 | ✅ 空 |
| U17 打印声明 | ✅ 1 | | | | |

### 13.0 样本重建配方（不落脚本、只落步骤 —— 回应"§13 的断言我无法复跑"）

一致性样本**故意不入库**（§7.6 的 🔴 B-3 纪律），但它不是黑箱：全部**名单与数字**都由下面 6 条命令现算，任何人可据此重建同一形态（脚本只是把这 6 条输出拼成 §7/§8 钉的标记形态）。

```bash
awk -F'|' '/^\| [0-9]+ \|/ || /^\| — \|/ {print $4}' .specs/product-prototype-refresh/BASELINE-code-facts.md | sed -E 's/（[^（）]*）//g' | tr '、' '\n' | sed -E 's/[[:space:]]//g' | grep -vE '^$' | sort -u   # → 32 个 data-page（§10-D 的稳健式）
grep -oE "label: '[^']+'" frontend/src/App.tsx | sed -E "s/label: '([^']+)'/\1/" | sort -u                                        # → 13 个 data-nav label 原文（K5）
grep -oE "\{ id: '([a-z-]+)', label: '[^']+'" frontend/src/App.tsx                                                               # + renderContent 的 case '<id>' → <Component> ⇒ 13 条 href="#pg-<Component>"（N8）
grep -cE "^import .*from '\./pages/" frontend/src/App.tsx ; grep -rEn '^@router\.(get|post|put|patch|delete)' backend/routes | wc -l   # → masthead 的 32 / 168（AC-1，禁抄）
awk -F'|' '/^\| G[0-9]+/{print $2,$9}' .specs/product-prototype-refresh/RESEARCH-competitors.md | grep 融入原型 | grep -oE 'G[0-9]+' | sort -u   # → 9 个 id="vb-G*"（K9）
grep -oE '`[a-z]+(-[a-z]+)+`' .specs/product-prototype-refresh/RESEARCH-competitors.md | sort -u | grep -v human-approval | grep -v admin-file-read-jail   # → 12 个 data-slug（K4 可见子集）
```
标记形态（`class` 在 `id` 前、`:target` 的 outline、徽标文本节点、附录 10 行等）不在这里派生——那是 §7/§8 的规格，跑批用的 U 闸就是为它而存在。

### 13.1 🟩 前端架构师票内 5 条修口的落地记录（逐条含**复现数字**，全部只改本文件自有的 U 闸与措辞）

| # | 修口 | 修前 → 修后（本机实跑） |
|---|---|---|
| 1 | U2b 的 `:root` 窗口锚不容空格/缩进，而「逐字节照抄 `tokens.css`」的最自然实现就是照抄第 6-90 行 | 把真身 `:root {` 块原样内联后：严格锚 **31**（假红）→ 宽容锚 `/^:root *[{]/,/^ *}/` **0** ✅。另注：`grep -c` 按**行**计数，一行写多条声明会**低估**（我那份紧凑变体样本同一块只报 6）→ 计量口径已在 §13 注明 |
| 2 | U12 的 `width` 支无词首边界，且没先排除 `:root` | 旧式在样本上报 **420px**（`--cp-detail-width` 的 token 值被当成几何声明；架构师侧同类脏值为 `1px 2px 420px`）→ 新式（先 `sed` 排根 + `(^|[;{ ])`）报 **空** ✅；§6.2 同时把「宽度一律走 `border:`/`outline:` 简写」升成契约 |
| 3 | U1 看不见 `font:` 简写里的字号＝假绿 | U1 改为同时抓 `font:` 简写内的 px，并新增 **U1b 直接禁简写**（期望 0）✅；§5.2 钉「字号一律 `font-size:` 长写法」 |
| 4 | U13 期望值差一个数量级（命令输出 KB、期望写 `<=200000` → 实际容忍 195 MB） | 改为**字节口径**：`wc -c < "$F"` 配 `<=200000`（= 200 KB，与 §13 声明的 NFR 1/10 对齐）✅ 实测 29 296 B |
| 5 | §5.2「实测 8 档」缺口径限定（R6.2） | 已补：口径＝`grep -rhoE "font-size: *[0-9]+px" frontend/src` → **15 处 / 8 值**，只落在 2 个文件（`tokens.css` 与 `pages/ToolDetail.tsx:45-46` 的 Markdown 内联样式串）；产品的**主用通道是 JSX 内联 `fontSize`（实测 75 文件 / 15 值 `8,9,…,32`，`App.tsx:274` 就是 16）**，8 档是**交付稿自身的排版裁量**，不是"产品只有 8 档"这个 brownfield 事实 |

**同轮另两处自撞的坑（不属票内，一并记）**：① 样本一开始**自造** `--shadow-md:0 4px 12px rgba(0,0,0,0.3)` → K6b 红（真值是 `tokens.css:54` 的 `0.4`），差一个字符即红 → 结论入 §3.1：**未用到的 token 宁可不声明**，声明了就逐字节照抄；② `tokens.css` 的 `--cp-*` 系列（第 68-89 行）**本来就是 OKLCH** → §3 的 hex 例外声明据实收窄：不是"OKLCH 在本仓库不可行"，而是"我沿用的那批 hex 值被 K6b 文本级锁死"。

**同一份样本上的已投票票面 + 设计侧 K 系列（本轮实跑逐条，零红）**：`AC-1 32/168 · AC-2 32 且入口 diff 空 · AC-3 0 · AC-4 三层全 0 · AC-5a 0 / AC-5b 33/33 · AC-6 行在（`59ac3f07` · 2026-09-22 · 页面 32 / 端点 168 / 域 11，样本重建时点现取） · AC-7a 1 / AC-7b 0 · AC-8a 1 / AC-8b 1 · AC-9 1 · AC-10 16 0 · AC-11 7(≥6) · AC-12 0（本轮曾红一次，见 §10-E）· AC-13 9 · K1 稳健式双向空 · K2 空 · K3 空 · K3b 空 · K4 空（可见子集 12） · K4b PASS · K6 6 · K6b 空 · K6c 12 · K7 1 · K8 0 · K9 空 · K10 1 · K11 0 · K12 1 · U1…U17 全中（U5a 123<125、U5b 100<107、U9b 0、U10 13、U13 28 746 B、U14 0、U15 0、U16 空、U17 1）`；另附三行**诊断/证据**（K1c 现式左集 33 项 → §10-D；U2c 真身 `:root` 块严格锚 31、U12b 旧式脏值 420px → §13.1）。整轮共 **62 行断言**（🟦 要求把 U14 与两条锚点检查计入 → 已计），含 1 行 K4b 与 2 行 U5 的 `PASS` 文案式输出。

> **对齐时点**：本文件初版量在 `73da31a6`；随后上游并入 5 个提交（G2 终裁 4/4、需求侧三件归口、K4 改「可见子集」、S11 并档、D18/D19 新立），我在合并后的 tip 上**全部重跑一遍**再定稿 —— 唯一变化的闸值是 **AC-10 第二列 `15 0` → `16 0`**（去向表增 G16 行，属真源而非我的口径）。样本 masthead 的 commit 串是**构建时点**值（K10 只校格式，AC-6 的"三处一致"指同一 commit 现算三处），4-dev 写稿时按 §1.5 现算重取即可，不必沿用我这两个串的数值来源。

---

## 14. 上报上游的归口项（**不由 2a 改**：DESIGN/BASELINE/tokens.css 分别是 2-design 与 L1 的持有物）

| # | 事实（本轮实测） | 影响 | 归口 |
|---|---|---|---|
| ① | `tokens.css` 的 `:root` **逐名去重是 61 个变量，不是 DESIGN §0/§0.5.1/§1.5 记的 51 个**；差的 10 个全在"同行多声明"里：`--s2 --s3 --s4 --s5 --s6 --s8 --s10`（7）+ `--r-md --r-lg`（2）+ `--normal`（1）＝51+10 | 按 51 写会**把我要用的间距/圆角档位整排漏掉**（`--s2/--s4/--s6/--s8` 全在失计的那 10 个里）；K6b 的比对基准也应以"逐名去重 61"为口径复述 | 架构设计（DESIGN §0/§0.5.1/§1.5 计数一行） |
| ② | **K6b 是文本级同名同值比对**（`sed 's/[ ]//g'` 后 `comm`）→ 值必须**逐字节**照抄，含引号形态：`--font` 写成 `"Segoe UI"`（双引号）实测 **diff 出 2 行＝红**，改回 `tokens.css` 的单引号形态后 diff 空 | 4-dev 一踩就中，且报错信息是"自造变量"，容易误诊 | 架构设计（§1.5 K6b 加半句「含引号与空格形态」） |
| ③ | app 里 **26 个变量名被引用但零声明**（`--text-dim` 235 · `--color-primary` 101 · `--color-text` 83 · `--font-display` 35 · `--color-danger` 35 · `--radius-md/sm`、`--border-weak/normal`、`--bg-elevated/panel`、`--color-{bg,border,surface,success,warning,info,grid,text-dim,text-secondary,elevated}`、`--text-{primary,weak}`、`--font-body`、`--info`、`--duration-micro`） | "沿用既有实现"≠照抄类名：抄进交付稿＝K6b 红 + 浏览器静默无值；已落 U3 机验 | 需求分析/架构设计（可作 `design-token-hygiene` 议题，属"需代码"） |
| ④ | 产品自称两处不一致：`App.tsx:275` 侧栏写「AI 开发平台」，`README.md:1` 与 `CLAUDE.md` 写「AgentFlow」 | 交付稿 H1 取后者；`docs-drift-resync` 需一条 | 需求分析（并入既有议题，不新开） |
| ⑤ | 三条产品侧 a11y/反模式事实：`--text-muted` 2.77:1 却第 3 多引用（186 处）· `.btn-primary` `#fff` on `--blue` = 3.29:1 不达 AA（`btn-primary` 19 处）· `borderLeft: Npx solid 语义色` 彩色侧条 **11 个文件** | 交付稿一律规避（§4/§6.4/§12）；**产品侧修复的影响面**＝`tokens.css` 值 + 186 + 19 + 11 文件，须另开 change（R3：本 change 零 L1 写入，我只登记不改） | 需求分析 → 未来 change |
| ⑥ | 上游三条归口**本阶段已全部并档**（本轮 merge 复核：`BASELINE:35` tab 已改 5、§4 已增 **S11**、`RESEARCH §2` 已增 G16 行使去向表 **16 行**、真源 slug **13** 条、可见子集 **12** 条，并新立 **D19**「按可见子集派生」与 **D18**「禁写范围号」） | 交付稿 `data-slug` 仍挂 **12** 条、附录仍 **10** 行；本轮按新式 K4 复跑 diff 空、AC-10 第二列 0 | 无需再催（已闭） |
| ⑧ | **`.gitignore` 缺 `__pycache__/`**，导致任何在仓库内跑产品解析器（如 `parse_gates`）的 agent 都会把编译产物暴露在 `git add -A` 下（本轮我自己就中了一次，见 §10-E） | 交付稿无关；补一行是 L1 写入，2a 不做 | 任务拆解 → 4-dev（一行 `.gitignore`，或约定"解析器只在仓库外副本跑"） |
| ⑨ | **打印 / 导出 PDF 到底承不承诺**：`REQUIREMENT.md:156` 说本稿"天生会被转发"，但三工件对打印态零声明，NFR 的 1280 无横向滚动验证方式是"一次手动检查"（`:155`） | 本稿本轮按**不承诺**处理并显式声明（C14 + U17）；若要承诺，需要一套 light 配色 → 新增 token 决策，破 U2b「颜色只从 `var()` 来」，须回需求门 | 需求分析（要不要 `@media print` 准则）|
| ⑦ | **`tr '、' '\n'` 不是多字节安全的**（详见 §10-D：`BASELINE §2` 并档后 K1 左集 33 项 ≠ 32，脏项里含一条 grep 的「匹配到二进制文件」提示语；并档前同式干净）→ 一切"按顿号切中文文本"的派生式同雷 | 4-dev 会在 K1 上撞上**说不清原因的假红**（缺页 2 / 虚构页 1）；本文件已给稳健式并保留现式证据两行 | 架构设计（K1 左集式与 §7.6 配方同条；建议 `sed -E 's/（[^（）]*）//g'` 前置，或整条改 `awk -F'、'`） |

---

## 15. 给 3-task 的第一批 UI 任务（R4 产物可直接引用）

| id | 动作 | verify（单行，已在本文件 §13/§1.5 跑过） |
|---|---|---|
| `T-UI-01` | 把 §3.1 的 token 子集**逐字节**物化进交付稿 `:root`（含 `'Segoe UI'` 单引号形态），只声明用到的名 | `comm -13 <(tokens.css 变量对) <(稿内变量对)` → 空（K6b） |
| `T-UI-02` | 按 §5.2 落 8 档字号（长写法，**禁 `font:` 简写**）+ §5.1 两栈（use-site 前置 `'IBM Plex Sans'`，禁自造变量） | U1 空 + U1b 0 + `grep -c "font-display\|font-body" "$F"` → 0 |
| `T-UI-03` | §6.1/§6.2 间距与版心（200/1000/9999 三几何字面量之外全走 `var()`；边框宽度走 `border:`/`outline:` 简写） | U12 空 + U2b 0（锚须容忍 `:root {` 与缩进 `}`，见 §13.1-1）+ U11 0 |
| `T-UI-04` | C1/C2/C3 + C13 左栏项（13 条 `href="#pg-*"` 按 N8 现算）+ `:target` 用 `--blue` outline + 域章属性顺序（`class` 前 `id` 后）+ 域章内顺序钉法 + 页集覆盖 | `grep -c 'class="domain"' → 12`（K6c）+ U14 0 + U15 0 + U16 空 + U5a/U5b PASS + **K1 用稳健式**（先 `sed -E 's/（[^（）]*）//g'` 剥全角括号注解、再 `tr '、' '\n'`）→ `comm` 双向空；用现式会得 33 项假红，见 §10-D |
| `T-UI-05` | C4/C5 两轴徽标：**短词文本节点** + o1-o3 走产品 `.badge` 同色 8% 底原形（禁 `::after`/`role="img"`/`aria-label`） | U6a 0 + U6b 0 + AC-5b occ==lines（33/33）+ 双写原串必红（反例实测 `occ 5/lines 3`） |
| `T-UI-06` | C6/C7 待标注与边界句（6 个具名 `nb-*` 落所属域章、且早于任何嵌套 section） | K6 → 6 + AC-7a ≥1 + AC-8a/b ≥1 |
| `T-UI-07` | C8/C9/C10（含短词↔原串映射）/C12（9 个 `vb-G*`、12 slug 行、图例、两张 SVG 框图） | K9 diff 空 + K4 diff 空 + AC-13 → 9 + K11 → 0 |
| `T-UI-08` | 可达性收尾 + C14 打印声明行：skip-link / `:focus-visible` / `nav[aria-label]` / `caption+th[scope]` / reduced-motion 兜底 / `<details>` | U7 0 + U8 空 + U9 ≥1 |
| `T-UI-09` | 全闸复跑并回填票面（DESIGN §1.5 现算的已投票 AC 与 K 系列闸 ＋ 本文件 U1…U13），样本一律落仓库外 | 全部断言中且零红 + `git status --porcelain` 不含样本 |

---

## 16. 阶段出口自检（逐项，本轮实跑口径）

- [x] **输入齐**：CHANGE（调性）+ REQUIREMENT（13 AC）+ DESIGN（§0/§1.5/§3/§7.6/§8/§10）+ BASELINE + RESEARCH + `CONTEXT.md`；`DESIGN §0 技术栈选定` 已读（§0.5.2「视觉 token 沿用实际值」被本文件 §3 落实为闭集）。
- [x] **brownfield 步骤 1.5 全跑**（§0.2 观察 8 维 + §0.4 三档策略）；**R8.7 人工校准本轮未发生 → 已在 §0.3 显式记为未完成并交 G2a 裁决**（不是"跳过"）。
- [x] **R8.8 v0**：§1 假设清单 6 条 + 单向可改的每维一个数（字号/间距/几何/色阶），任一偏差只改该维。
- [x] **R8.3–R8.6**：hex 例外声明 + 对比度实测 · 字体避泛用栈（含"为什么改不了"的硬约束）· 间距唯一（档位授权）· 动效唯一（零动画 + 缓动/时长单一）。
- [x] **R8.9**：§11 占位符表逐类，零自造插画/数字/凭据。
- [x] **组件规约 ≥5**（12 件）+ 状态矩阵（§9 组件×六态 + 两轴 12 格视觉映射，与 K3b/§3 矩阵同结论）。
- [x] **§7 Do/Don't** 已并入 §0.4「打破」+ §4 用法列 + §12 逐类；**§8 占位符**、**§9 反 AI-slop 自检**、**§10 触发任务** 均在（§15）。
- [x] **不越界**：本文件不碰技术方案（R3）——交付物形态、K 系列闸、票面格式一律沿用 DESIGN；我改的只有间距/字号/组件长相/导航形态 + 三条**加严**不**放宽**的 UI 闸；`frontend/**`、`backend/**` 零写入（AC-12 实测 0）。
- [x] **接口纪律**：未新增任何与 §1.5/票面冲突的字面串；新钉的视觉 class 全部标为"非接口"（§8 注），改它们不需动 `REQUIREMENT.md`。
- [x] **样本落位**：`good2a.html` 与生成/跑批脚本在仓库外 `$TMPDIR/ui2a/`，工作树 0 行（对齐 §7.6 的 🔴 B-3 纪律）。
- [x] **🟫🟦 两票修口已落地**：🟫 四条 🟡＋三条更轻中的 (a)(b)(c)、🟦 两条阻断＋三条非阻断，逐条按对方给定的形态落地并机验（新增 U14 `:target` 禁 `--blue-border`、U15 `data-nav` 必带 `href`、U16 锚点落点存在、U17 打印声明、U9b 禁 smooth；§3.1 补角色行、§7 新增 N8、§8 新增 C13/C14、C4/C5 改文本节点、图例建立短词↔原串映射、`overflow-wrap:anywhere`）。零放宽：全部只改本文件自有 U 闸与措辞，未触碰任何已投票 AC 或冻结 K 命令。
- [x] **AC-12 自曝并修复**：跑产品解析器留下的 `__pycache__` 编译产物被 `git add -A` 扫入 → AC-12 一度实测 1，`a6a73506` 删除后复跑 0（§10-E；`.gitignore` 建议归口 §14-⑧）。
- [x] **票内修口已落地**：🟩 一票附的 5 条 U 闸精度/口径修口逐条复现后落地（§13.1 有修前→修后的实跑数字），未触碰任何已投票 AC 或冻结的 K 命令。
- [ ] **门禁**：G2a 1/4（🟩 ✅，🟫/🟦/🔴 未到）→ 按 R13 契约，票齐前不推进 3-task。

---

🗳️ G2a UI 设计门: UI-DESIGN.md 是否通过？调性是否纯粹、美学是否达标、交互是否可用、组件是否可落地、无障碍是否覆盖？

🟫 资深UI设计师: ✅ 调性执行到位（工业卡零污染、AI-slop 硬命中 0）、字号/间距/几何三维均有闭集与实测出处，可进 3-task；17 行对比度逐行复算与我完全一致；四条 🟡（`:target` 描边 1.30:1 / `scroll-behavior` 归属写错 / 徽标偏离产品 `.badge` / `::after` 文案搜不到）不门控本票，已全部落地，见 §10 与 §13.1
🟦 资深用户体验官: ❌ 条件票两条，均落在本阶段主责维度（组件长相 / 导航形态），**两条已按其给定形态落地并机验**：① `:target` 改 `outline:2px solid var(--blue)`（`--blue-border` 1.33:1 违反 §3.1 自己的 3:1 口径）+ §3.1 补 `--blue-border` 角色行 + 新 U14；② 13 条入口按 N8 从 `App.tsx` 现算 `href="#pg-<Component>"` + 新增 C13 左栏项 + 新 U15/U16（13 条落点实测全齐、锚点 diff 空）。其三条非阻断（图例短词映射 / `overflow-wrap` / 打印表态）亦已落地。改票待其按自己给的三条命令复跑
🟩 前端架构师: ✅ token 封闭性/对比度/锚点逐值复算一致，§10-D 独立复跑同判（现式 33／稳健式 32），C1–C12 零 JS 零构建可表达；附 5 条一行级 U 闸精度修口（已全部落地并复跑，见 §13.1）
🔴 无障碍专家: ⚪ 待票
结果: 2/4 通过、1 票 ❌（条件已满足、待该角色改票）、1 票未到（🔴）。按 R13 契约票未齐 → 本阶段不推进 3-task；两条 ❌ 阻断与九条 🟡/非阻断的落地证据全在本文件（§10-E、§13 结果表、§13.1、§14-⑧⑨），复跑命令在 §13 与 §13.0

---

## 17. 本门票面为什么落在这个工件里

`backend/routes/change_detail.py:30-39` 会对 `UI-DESIGN.md` 这类工件调 `parse_gates`（**评论不被解析**），故票面必须在此落一份；上块按 DESIGN §8 的 D15 五条写：块首行含半角冒号分隔的「门名 : 问题」、四张票各占一行且不以 `- ` 或表格起头、结果行不再带色块、块与后文以「空行 + `##` 标题」自然闭合、本工件内该票面标记 emoji 全文仅出现一次（上文一处，其余段落一律以「票面标记」四字指代）。
