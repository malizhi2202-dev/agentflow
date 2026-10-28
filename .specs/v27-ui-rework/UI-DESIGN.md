---
name: AgentFlow
description: 极简工程工作台：中性底色、单一蓝色强调、清晰层级与克制留白
baseline:
  pattern: "ui-samples/patterns/dashboard.html + table-crud.html"
  system: "ui-samples/systems/agent-team.html + job-scheduler.html"
  deviation: "保留现有深色主题作为可选模式，默认改为浅色；将五类业务页统一为标题区、主工作区和辅助区，而不是均匀卡片网格"
colors:
  brand: "oklch(54% 0.18 255)"
  brand-deep: "oklch(44% 0.18 255)"
  bg: "oklch(98% 0.006 250)"
  surface: "oklch(99.5% 0.002 250)"
  surface-muted: "oklch(96% 0.008 250)"
  text-primary: "oklch(24% 0.015 250)"
  text-secondary: "oklch(48% 0.018 250)"
  text-tertiary: "oklch(54% 0.015 250)"
  border: "oklch(65% 0.012 250)"
  action-primary: "oklch(24% 0.015 250)"
  action-primary-fg: "oklch(98% 0.006 250)"
  focus: "oklch(54% 0.18 255)"
typography:
  display:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.15
    italic: false
  headline:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  body-lead:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  supporting:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontWeight: 500
    textTransform: none
    letterSpacing: "0.01em"
  micro-label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    textTransform: uppercase
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "28px"
  xl: "40px"
  "2xl": "64px"
  "3xl": "96px"
rounded:
  none: "0"
  sm: "4px"
  md: "6px"
  lg: "10px"
  xl: "14px"
motion:
  ease-out: "cubic-bezier(0.16, 1, 0.3, 1)"
  duration-fast: "150ms"
  duration-base: "240ms"
  duration-slow: "400ms"
shadow:
  hover-lift: "none"
  card-lifted: "0 8px 24px rgb(20 30 50 / 0.08)" # 仅弹层 / 主动打开的详情浮层，禁止用于静态卡片
  accent-glow: "none"
---

# UI Design: AgentFlow

## 0. 视觉语汇对齐（brownfield）

### 0.1 观察报告

- **Token 源**：`frontend/src/styles/tokens.css` 与 `frontend/src/styles/ui.css`；现有变量集中但仍是深色优先、hex/rgba 为主。
- **主色实际比例**：蓝色主要用于 primary button、active tab、链接和状态点；目标继续保持稀缺使用，不扩展为大面积背景。
- **中性色**：现有深灰背景层级较多，文字层级偏弱；v27 改为浅色中性默认，并保留深色变量映射。
- **hover / focus**：现有以颜色和背景变化为主；v27 保留颜色反馈，补充统一可见 focus ring，不使用 hover 抬升。
- **动效语言**：已有短 CSS transition 和 reduced-motion；v27 统一为 150/240ms，禁止 bounce 和尺寸动画。
- **elevation 层级**：现有 shadow-sm / shadow-md；v27 默认平面，仅弹层或明确主动抬起状态使用低 alpha 阴影。
- **卡片密度 / rounded**：现有 4/8/12px；v27 采用 4/6/10/14px，减少卡片嵌套，更多使用留白和 hairline。
- **图标库**：`lucide-react`，继续使用；不以 emoji 代替图标。
- **文案调性**：工程向、中文、动词为主；按钮使用“创建 / 编辑 / 保存 / 重试 / 返回”等具体动作。

### 0.2 用户校准结论

- 用户已确认：采用极简 Minimal，参考 Linear / Vercel / Stripe。
- 用户已确认：浅色中性工作台为默认，深色模式保留；使用 IBM Plex Sans / JetBrains Mono；先做五类高频入口。

### 0.2.1 标题责任锁定

- `AppTopBar` 只负责全局壳层、空间上下文和全局动作，不渲染页面级 `h1`。
- `PageHeader` 是每个页面（含列表、详情、编辑）的唯一页面级标题区，渲染唯一 `h1`、上下文、摘要和最多一个主动作。
- 详情 / 编辑覆盖态也使用 `PageHeader`；不再用 AppTopBar 与页面内标题同时承担同一页面标题。

### 0.3 应用策略

- **沿用**：lucide-react、IBM Plex Sans、JetBrains Mono、中文工程文案、现有权限和请求链。
- **延伸**：现有 tokens / 语义类扩展为页面层级契约；现有 `AppTopBar` 继续作为全局壳层上下文区，不承担页面级标题；页面标题统一迁入 `PageHeader`。
- **打破**：深色优先、同质卡片平铺、页面级随机内联间距；不打破业务组件接口。

## 1. 美学北极星

AgentFlow 是一张安静、清晰的工程工作台：用户先看到自己在哪和下一步该做什么，再看到数据和配置；视觉用中性留白建立层级，蓝色只在需要行动或确认状态时出现。

### v0 确认摸路

- **已确认的假设**：极简调性；浅色默认 + 深色模式；IBM Plex Sans / JetBrains Mono；左侧导航保留但降低噪声；五类入口先行；不引入新 UI / 路由库；URL/history/deep-link 不在 v1 重构。
- **用户指出的偏差**：无。

## 2. 4 个决策问题

- **目的**：服务工程用户对 Agent、项目、自动化、任务和编排进行高频查看、配置和决策；核心动作是理解上下文后执行一个明确动作。
- **调性**：极简 Minimal；避免装饰争夺注意力，直接解决当前“丑、平铺、难定位”。
- **约束**：React 18 / TypeScript / Vite / Zustand；不引入依赖；键盘可达、焦点可见、reduced-motion；服务端权限不变。
- **差异化**：每一屏只突出一个“现在最该做的动作”，复杂数据退到有上下文的主工作区和辅助区。

## 3. 颜色系统

- **品牌蓝** `oklch(54% 0.18 255)`：active、链接、focus、关键状态点；绝不用作整块页面背景。
- **品牌深蓝** `oklch(44% 0.18 255)`：hover / pressed / 深色模式可读链接。
- **页面背景** `oklch(98% 0.006 250)`：带极轻蓝灰倾向，避免纯灰。
- **表面** `oklch(99.5% 0.002 250)`：主工作区和浮层；静态不加阴影。
- **弱表面** `oklch(96% 0.008 250)`：工具栏、选中背景、辅助区。
- **主文字** `oklch(24% 0.015 250)`；次文字 `oklch(48% 0.018 250)`；弱文字 `oklch(54% 0.015 250)`，只用于非必要辅助信息，不承载唯一状态信息。
- **边框** `oklch(65% 0.012 250)`：只表达结构关系；交互控件 focus / active 使用品牌蓝，不依靠弱边框表达唯一状态。
- **对比度实测（候选 token）**：按自有 OKLCH→sRGB→WCAG 相对亮度脚本计算，主文字约 15.5:1、次文字约 6.2:1、弱文字（54%）约 4.8:1、品牌蓝约 4.9:1、结构边框（65%）约 3.0:1；实现任务必须将该脚本或等价 axe / Lighthouse 结果写入 TEST，深色主题使用同一方法复测。
- **深色主题映射**：背景 `oklch(10% 0.01 250)`，表面 `oklch(14% 0.012 250)`，弱表面 `oklch(20% 0.012 250)`，主文字 `oklch(94% 0.008 250)`，次文字 `oklch(76% 0.012 250)`，弱文字 `oklch(68% 0.012 250)`；使用近黑而非纯黑，避免纯黑 / 纯白禁忌。
- **语义色**：成功 / 警告 / 危险只用于真实状态，不作为装饰第二主色。

命名规则：一个品牌 hue；中性色带极低 chroma；禁止纯黑纯白、渐变文字、紫色渐变和装饰彩色阴影。

## 4. 字体系统

- **Display / headline / body**：IBM Plex Sans。已安装且适合技术工作台；不用 Inter / Roboto / Arial / system-ui，避免默认 SaaS 视觉。
- **Mono / label / ID / 时间**：JetBrains Mono。只用于确实具有代码或状态值语义的内容。

| 角色 | 字号 | 字重 | 行高 |
|---|---:|---:|---:|
| 页面标题 | 28–36px | 600 | 1.15 |
| 分区标题 | 20–24px | 600 | 1.25 |
| 卡片 / 表格标题 | 16px | 600 | 1.4 |
| 正文 | 14px | 400 | 1.6 |
| 辅助 | 13px | 400 | 1.5 |
| 标签 | 11px | 600 | 1.4 |
| Mono | 12px | 400/600 | 1.6 |

## 5. 间距、圆角、动效

- 间距只使用 `8 / 12 / 20 / 28 / 40 / 64 / 96px`，页面内优先 12/20/28，页面分段使用 40/64。
- 控件圆角 4px；小面板 6px；内容面板 10px；特殊容器最多 14px；禁止卡片套卡片。
- 颜色 / opacity 过渡 150ms；允许的视觉切换只改变 `color`、`background-color`、`border-color`、`opacity`；不 animate width / height / padding / margin，也不为 hover 做 transform。
- 默认无静态阴影；弹层或明确主动抬起的表面最多使用低 alpha 阴影。
- `prefers-reduced-motion: reduce` 下所有 transition / animation 时长归零，取消入场 opacity / transform，保留状态变化本身。

## 5.1 响应式与页面落位

- **≥ 1280px**：侧栏 232px；内容区最大宽度 1440px；列表 / 详情页可使用 `minmax(0, 1fr) + 280px` 辅助栏；辅助栏不是必需时隐藏，不填空卡。
- **768–1279px**：侧栏 208px；辅助栏改为页面内折叠区或详情抽屉；主工作区保持单列优先。
- **< 768px**：侧栏变为可关闭抽屉；页面单列；工具栏允许换行；所有主要可操作目标最小 44px；禁止横向页面滚动。
- 页面固定落位：`PageHeader` → `SummaryRow`（若有真实摘要）→ `Toolbar`（若有筛选/视图操作）→ `MainWorkspace` → `SupportRegion`；无内容的区域不渲染空容器。
- 列表页主工作区是列表 / 表格 / 看板；详情页主工作区是资源内容，辅助区是关联、活动或说明；编辑页主工作区是表单，辅助区是保存状态和帮助。

## 5.2 唯一层级表

| 层级 | 组件角色 | 字号 / 规则 |
|---|---|---|
| L1 | 页面标题 | 28–36px，600，唯一一个 `h1` |
| L2 | 分区标题 | 20–24px，600，`h2` |
| L3 | 卡片 / 表格标题 | 16px，600 |
| L4 | 正文 | 14px，400，1.6 |
| L5 | 辅助 | 13px，400，1.5 |
| L6 | 标签 / 状态 | 11px，600；状态值可用 12px mono |

frontmatter 的 `display` 对应 L1，`headline` 对应 L2，`title` 对应 L3；不再使用另一套独立字号定义。

## 6. 关键组件规约

### Button

- Primary：使用 `--color-action-primary` 背景 + `--color-action-primary-fg` 文字，4px 圆角，具体动词；不用品牌蓝大面积填充。
- Secondary：表面背景 + hairline 边框；hover 只变背景 / 边框。
- Tertiary：文字按钮或 inline link，只用于次要动作。
- Focus：统一 2px 外环，品牌蓝与背景有足够对比。
- 禁止：圆角矩形 + drop shadow + 渐变。

### Input / Field

- 必须有可见 label，不以 placeholder 代替。
- 默认表面背景、1px 边框、4px 圆角；focus 改边框并显示 focus ring。
- 错误同时使用文字和结构标记，不只靠颜色。

### Card / Container

- 默认平面、1px hairline；内容区优先用间距分层。
- hover 只改变边框 / 背景；不抬升、不缩放。
- 禁止 card 套 card；摘要可用轻量 stat row，但不重复“图标 + 大数字 + 小标签”模板。

### Navigation

- 侧栏保留业务分组，但降低标题噪声；active 使用浅蓝背景和品牌蓝文字，不使用彩色侧条；同一屏 active 只允许一个一级入口。
- 一级导航点击先完成详情 / 编辑态清理，再设置目标 nav；目标页面标题和 active 必须同步。
- 当前页面通过唯一 `h1` + active 一级项表达当前位置；详情 / 编辑页使用现有返回动作，不在 v1 新增 breadcrumb 协议。
- 侧栏收缩态所有 icon-only 控件必须有 `aria-label` 和 tooltip 替代路径；展开/收缩按钮键盘可达，`Enter` / `Space` 触发。
- 桌面 Tab 顺序：跳过导航链接 → 侧栏一级项 → 页面标题区主动作 → 工具栏 → 主工作区 → 辅助区；移动抽屉打开时焦点进入抽屉首项，`Escape` 关闭并回到触发按钮。
- 详情 / 编辑覆盖态打开后焦点进入可聚焦的页面标题（`tabindex="-1"`）或返回按钮；`Escape` 在无未保存变更时执行 cancel / back，在存在已有变更确认机制时先打开确认；关闭后焦点回到打开它的列表项；保存失败焦点进入错误摘要 / 重试控件；保存成功焦点进入资源详情标题。
- 保存状态优先级：saving 禁止重复提交；success 关闭编辑态并进入资源详情；error 保持编辑态和输入；cancel / back 关闭编辑态并回详情或列表。若已有未保存确认机制则沿用；没有则不在 v1 新增全局拦截，但一级切换不得让异步响应覆盖仍可见的输入。
- 所有菜单、抽屉、对话框使用现有组件语义：打开时必须有可访问名称、适当的 `aria-expanded` / `aria-modal`；模态层打开时背景内容设为不可交互（`inert` 或等价机制），焦点在活动层内循环；`Escape` 关闭可关闭层并把焦点还给触发控件；测试至少验证打开、Tab 不越出、Escape 关闭、焦点返回四步。

### Page Header / Toolbar

- `PageHeader` 只承载页面标题、上下文摘要和最多一个主动作。
- `Toolbar` 承载筛选、搜索、视图切换和次要动作；工具栏不重复页面标题。
- 主工作区放列表 / 表单 / 看板 / 画布；辅助区放关联、说明、活动和次要状态。

### Status Surface

- loading：品牌倾向的中性 skeleton 或可读 loading 文案，不能是无意义灰条。
- empty：说明原因 + 下一步动作；不编造数字。
- error：可读错误摘要 + 重试 / 返回；通过 `role="alert"` 或合适的 live region 传达。
- success / saving：使用 `role="status"` / `aria-live`，禁用重复提交；成功落回资源详情。

## 7. Do's and Don'ts

### Do

- 让留白、字号和顺序表达层级。
- 每屏只突出一个主动作。
- 用真实状态和真实数据；缺数据时显示诚实空态。
- 复用现有语义类和 lucide 图标。
- 通过 focus、文案和结构同时表达状态。

### Don't

- 不使用 emoji 代替图标。
- 不使用纯黑 / 纯白、渐变文字、玻璃拟态或装饰性彩色阴影。
- 不给每个区域都套卡片，不做统一卡片网格。
- 不用 hover 动画制造层次，不用 bounce / elastic。
- 不把前端导航、URL 参数或本地状态当权限依据。
- 不编造 KPI、活动数、成功率或用户数据。

## 8. 占位符策略

| 缺的东西 | 正确做法 | 禁止做法 |
|---|---|---|
| 图标 | 使用 lucide-react；缺失时使用明示 `[icon]` | emoji / 粗糙自绘 SVG |
| 头像 | 首字母圆形 + 状态点 | AI 人脸 / 网图 |
| 图片 | 明示比例和用途的占位卡 | stock photo / 编造素材 |
| 数据 | 空态说明并引导创建 / 配置 | 编造 KPI 或活动数 |
| logo | 现有 AgentFlow 文字标识 | 另造品牌图形 |
| 状态 | 文字 + 语义标记 + 可访问 live region | 只用颜色或无意义灰条 |

## 9. 反 AI-slop 自检结果

已对照 `reference/ui-anti-patterns.md` 强制禁忌：

- [x] 字体：使用 IBM Plex Sans / JetBrains Mono，未使用 Inter / Roboto / Arial / system-ui 作主字体
- [x] 颜色：无纯黑纯白、紫色渐变、渐变文字、第二装饰主色
- [x] 阴影：静态卡片无阴影，阴影只允许低 alpha 主动抬起状态
- [x] 边框：无彩色粗侧条、渐变边框、玻璃拟态
- [x] 动效：无 bounce、尺寸动画，保留 reduced-motion
- [x] 布局：禁止卡片嵌套、统一卡片网格和 SaaS hero 指标模板
- [x] 文案：使用具体中文动词，不使用空泛营销文案
- [x] 组件：表单 label 不依赖 placeholder，icon-only 控件有 aria-label

## 10. 迁移与兼容策略

- **样式入口**：当前 `frontend/src/main.tsx` 已显式加载 `styles/tokens.css`；首波补接 `styles/ui.css` 并以构建验证，禁止依赖页面偶然 import。
- **语义 token 最小集**：`--color-brand`、`--color-brand-deep`、`--color-bg`、`--color-surface`、`--color-surface-muted`、`--color-text-primary`、`--color-text-secondary`、`--color-text-tertiary`、`--color-border`、`--color-focus`、`--color-success`、`--color-warning`、`--color-danger`；组件不得直接写颜色值。
- **布局 token 最小集**：`--space-1: 8px`、`--space-2: 12px`、`--space-3: 20px`、`--space-4: 28px`、`--space-5: 40px`、`--space-6: 64px`；`PageHeader` padding 28/40px，`Toolbar` gap 12px，`MainWorkspace` gap 28px，`SupportRegion` gap 20px；窄屏统一 padding 20px。
- **壳层标题责任**：`AppTopBar` 只负责全局壳层、空间上下文和全局动作，不渲染 `h1`；`PageHeader` 是页面级唯一标题区。首批页面中 `AgentBuilder`、`ProjectManager`、`Automations`、`Tasks`、`OrchestrationListPage` 迁移到 `PageHeader`，详情 / 编辑覆盖态 `AgentDetail`、`ProjectDetail`、`OrchestrationPage` 也使用 `PageHeader`。低频历史页面不在 v1 一次性迁移。
- **主题映射**：旧变量映射到新语义变量只在 `tokens.css` 完成；`ui.css` 和页面不得直接写 hex / rgba 颜色。
- **深色主题**：使用 `data-theme="dark"` 的同名语义 token 映射；实现时至少验证主文字 / 次文字 / 弱文字、品牌蓝、focus、成功/警告/危险状态相对背景的对比度，正文 ≥4.5:1、非文本边界和 focus ≥3:1；结果写入 TEST。
- v1 先建立语义 token 别名层：保留现有 `--bg-app`、`--bg-card`、`--text`、`--blue` 等变量名作为兼容别名，先让旧页面继续可渲染，再逐页替换为新 token；禁止一次性删除旧变量。
- 浅色主题以 `data-theme="light"` 或现有主题机制为唯一覆盖层；现有深色主题保留同名语义变量的 dark 映射，不允许页面直接写回 hex。默认主题切换只改 token 映射，不改组件业务状态。
- 首波统一补齐 `--bg-panel` 等现有未定义变量，并建立旧变量 → 新语义变量的明确映射表；迁移期间旧变量只能引用新变量，禁止新组件继续直接引用旧色值。
- 按顺序交付：导航状态回归 → token / 语义样式 → Agent / 项目 → 自动化 / 任务 / 编排 → 全量回归与人工走查。
- 每一波都跑 `npm run typecheck`、相关 Vitest、`npm run build`；不批量更新快照掩盖视觉或行为回归。

## 11. UI 实现任务边界预告

- **壳层**：`App.tsx` 仅负责入口协调；不把业务请求迁入壳层。
- **样式**：`tokens.css` / `ui.css` 与现有 UI 组件优先；新建共享组件必须至少被两个首批页面复用。
- **页面**：首批五类页面按“标题区 / 工具栏 / 主工作区 / 辅助区 / 状态”迁移；低频页面不纳入本批完成判定。
- **交互**：详情 / 编辑清理、返回、保存状态、焦点回收各自有测试；不以视觉截图替代交互测试。

### 11.1 共享组件落位

| 语义角色 | 首选复用位置 | 首批消费者 | 不负责什么 |
|---|---|---|---|
| `PageHeader` | `components/ui/` 或现有 `AppTopBar` 扩展 | 五类入口页面 | 不发请求、不保存业务数据 |
| `SummaryRow` | `components/ui/` | Agent / 项目 / 自动化 / 任务 / 编排中有真实摘要者 | 不编造 KPI |
| `Toolbar` | 现有 `components/ui/Toolbar.tsx` 扩展 | 列表 / 看板 / 编排 | 不决定导航 state |
| `MainWorkspace` / `SupportRegion` | 语义 CSS 类优先，不先新建组件 | 五类入口 | 不嵌套 card，不复制页面业务逻辑 |
| `StatusSurface` | 现有状态 / 错误模式优先 | 实际存在异步请求或写操作的页面 | 不吞掉服务端错误，不替代权限判断 |

只有当同一结构在至少两个首批页面出现且 props 可以保持业务无关时，才创建共享 React 组件；否则使用语义 CSS 类或页面局部结构。
