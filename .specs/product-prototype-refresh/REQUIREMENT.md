# REQUIREMENT: 竞品调研融合后的产品原型与界面原型文档

- **Change ID**: product-prototype-refresh ｜ **阶段**: 1-requirement ｜ **来源 Issue**: MALIZHI-6《项目原型文档审核》
- **关联**: `@.specs/product-prototype-refresh/CHANGE.md`（G1 4/4 已过）、`@.specs/product-prototype-refresh/BASELINE-code-facts.md`（W1 唯一数字基准）、`@.specs/product-prototype-refresh/RESEARCH-competitors.md`（W2 缺口与去向）、`@.specs/CONTEXT.md`
- **本阶段产物边界**：需求与验收线，不含实现方式（HOW 归 2-design / 2a-ui-design）。所有「代码锚点」是**现状事实**，不是实现建议。

---

## 1. 口径与判定（先约定，后验收）

- **数字口径**：页面 = `App.tsx` 挂载路由页（实测 **32**，页面文件 34）；能力域 = **11**（含逐页归属，BASELINE §2）；后端 = 路由模块 **28** / 行锚定端点 **168**；侧边栏一级入口 **13**（NAV 11 + 管理员 2）。CHANGE 内数字一律为参考数，**验收只对本文件与 BASELINE 负责**（G1 🟩）。
- **交付物**：一份产品原型 + 界面原型文档（默认 `product-design.html`，落 `.specs/product-prototype-refresh/`；若人工提供既有稿则在其指定位置融合）+ 本需求文档与两份支撑底稿。
- **归属字段**（G1 🔴）：原型里每条能力必须标 `本项目已有（可指 `pages/`/`routes/` 锚点）` 或 `本项目缺失-竞品建议新增`；后者不得画成既有界面已具备的样子。
- **判定归属**：CHANGE 验收线 2「逐条有去向」的判定**发生在本阶段出口**，结果 = RESEARCH §2 表（15 条，去向零空白）。

## 2. 用户故事

- **US-1**：作为**平台 owner**，我想有一份与代码自洽、可浏览器直开、覆盖全部 11 能力域与 32 个挂载页的产品原型，以便对外讲清「平台现在到底有什么」而不被过时 README 误导。
- **US-2**：作为**新接手的开发者**，我想在不启动前后端、不登录的情况下看到界面骨架（侧边栏 13 个一级入口 + 每域页面），以便一次读懂产品信息与导航结构。
- **US-3**：作为**产品决策者**，我想看到同类产品各自有、我们没有的能力，每条带来源与去向（融入原型 / 需代码议题 / 否决+理由），以便一次决定下一步投什么、不投什么。
- **US-4**：作为**评审者（6-review / S-align）**，我想抽查原型里任何一条能力陈述都能落到代码锚点或来源 URL，以便不被竞品宣传文案和"看着像引用"的句子污染事实源。
- **US-5**：作为**安全负责人**，我想让原型如实标注既有安全边界（本地开发默认口令、localhost + header 回落、密钥强度取决于 `ENCRYPTION_KEY`）且示例全合成、登录态用占位符，以便这份天生会被转发下载的文件不把演示边界当成已交付防护、也不泄露凭据。
- **US-6**：作为**下游执行者（2-design / 2a / 4-dev）**，我想拿到 v1 / v2 / out 三类都有内容的范围切分与逐条可验证的 AC，以便不越范围、不顺手改代码。
- **US-7**：作为**文档维护者**，我想让原型自带校准基线（commit + 日期 + 清单快照），以便将来能判定它自己是否又漂成了下一份过时稿。

## 3. 验收准则（AC · 每条 Given/When/Then + 一次可执行验证）

### AC-1 · 数字基准可复现（口径唯一）
- **Given** 仓库根与 `BASELINE-code-facts.md` §1 的「命令」列
- **When** 抽查任一数字（默认抽页面数与端点数）
- **Then** 命令输出与该表实测值一致，且原型/需求文档内出现的同名数字与之一致
- **验证方式**: `grep -cE "^import .*from '\./pages/" frontend/src/App.tsx` → `32`（换端点命令 → `168`）

### AC-2 · 32 页全覆盖、逐页可指域
- **Given** 交付的原型稿 + BASELINE §2 的页面归属表（**12 行 · 32 页**：11 个能力域行 + 1 行平台外壳，末行「合计 = 32 ✓」为自校验行；行 ≠ 页，逐页名在行内列出）
- **When** 人工按该表把 32 个页面名逐名在原型中找到对应页面块
- **Then** 32 页全部命中、无缺页；每页显示所属域；**侧边栏 13 个一级入口（NAV 11 + 管理员 2，BASELINE §1）全部出现**
- **验证方式**: UAT-1（一次人工走查：12 行逐行勾 → 32 页逐名勾 → 13 入口逐项勾）＋ `grep -c 'class="page-block"' product-design.html` → `≥32`（页面块标记形态由 2a 定，改用其他标记须同步本条命令）

### AC-3 · 零外部依赖（供应链闸口 · 承接 CHANGE 验收线 4）
- **Given** 交付的原型 HTML
- **When** 在断网环境双击打开并跑 grep
- **Then** 完整渲染，且无任何外链脚本/样式/CDN
- **验证方式**: `grep -cE "<script src=|<link[^>]*href=[\"']http|@import url\(|unpkg\.com|cdnjs|jsdelivr|cdn\." product-design.html` → `0`（exit 1）＋ 断网打开截图

### AC-4 · 敏感面 0 命中（承接 CHANGE 数据分类 R-1）
- **Given** `.specs/product-prototype-refresh/` 内本 change 的全部产物
- **When** 跑既有核对命令（排除 CHANGE.md 自身）
- **Then** 无真实口令字面量、无密钥形态、无 IP 形态；示例数据全合成
- **验证方式**: `grep -rnE "1[2]3456|sk-[a-zA-Z0-9]{8,}|[0-9]{1,3}(\.[0-9]{1,3}){3}" --exclude=CHANGE.md .specs/product-prototype-refresh/` → 0 命中（exit 1）

### AC-5 · 归属字段无假锚点（承接 G1 🔴 + 🟫 假锚点教训）
- **Given** 原型中所有标 `本项目已有` 的条目
- **When** 检查每条是否给出仓库锚点
- **Then** 每条都含 `pages/` 或 `routes/` 路径锚点，无「看着像引用」的空标
- **验证方式**: `grep "本项目已有" product-design.html | grep -vcE "pages/|routes/|components/|models/|services/|engine/"` → `0`

### AC-6 · 校准基线声明（承接 CHANGE 验收线 3）
- **Given** 原型稿头部
- **When** 读第一屏
- **Then** 有「校准基线：<commit SHA> · <日期> · 页面 32 / 端点 168 / 域 11」快照，并注明它是 S-align 判过期依据
- **验证方式**: `grep -nE "校准基线" product-design.html | head -1` → 非空且同行含 7–40 位十六进制 SHA 与日期

### AC-7 · 安全域陈述带既有边界（BASELINE §4-S1）
- **Given** 原型的「安全与审计」章节
- **When** 呈现 RBAC / 审计 / 登录能力
- **Then** 同屏写明 localhost 限定与 header 缺失回落 admin 这条演示边界，不得出现"网络隔离/强认证已交付"字样
- **验证方式**: `grep -cE "X-User-Id|localhost" product-design.html` → `≥2`（且 `grep -c "网络隔离" product-design.html` → `0`）

### AC-8 · 加密措辞带精度限定（BASELINE §4-S2 · G1 🔴 终裁附注）
- **Given** 原型任何一处「密钥加密存储」陈述
- **When** 读该句
- **Then** 同段含 `ENCRYPTION_KEY` 与「短密钥零填充、无 KDF」限定
- **验证方式**: `grep -A2 "加密" product-design.html | grep -cE "ENCRYPTION_KEY" ` → `≥1`，且 `grep -cE "无 KDF|零填充" product-design.html` → `≥1`

### AC-9 · 演示凭据用占位符
- **Given** 原型的登录态界面示例
- **When** 呈现口令字段
- **Then** 用 `<管理员口令>` 占位符，不出现真实默认口令字面量（与 AC-4 同判）
- **验证方式**: `grep -c "<管理员口令>" product-design.html` → `≥1`

### AC-10 · 缺口逐条有去向（CHANGE 验收线 2 在本阶段出口闭合）
- **Given** `RESEARCH-competitors.md` §2 缺口表
- **When** 逐行读去向列
- **Then** 每行去向 ∈ {融入原型, 登记议题（需代码）, 否决} 且否决必带理由；0 空白、0「写了没落」
- **验证方式**: `awk -F'|' '/^\| G[0-9]+/{n++; if($9 !~ /融入原型|登记议题|否决/) b++} END{print n" "b+0}' .specs/product-prototype-refresh/RESEARCH-competitors.md` → 第二列为 `0`

### AC-11 · 未接入能力不得画成已交付
- **Given** 原型涉及 BASELINE §3/§4 点名的**六处待标注项**：四处「壳能力」（token 统计 / MCP 工具 / 调用链查看 `TraceViewer` 零挂载 / 知识库检索无 embedding）+ 两个「孤儿页面」（`SecurityPage`、`AssemblyView`）
- **When** 呈现它们
- **Then** **逐处**带「未接入 / 演示边界 / 规划中」三态之一标注（六项六处，不是一处代表全部）；两个孤儿页面不得作为能力页出现
- **验证方式**: 数量地板 `grep -cE "未接入|演示边界|规划中" product-design.html` → `≥6` ＋ **UAT-6（5-test 出逐条勾清单：6 项 × 各自锚点，按名找节看标签，不以数量地板代替逐处核对）**

### AC-12 · 全程零 L1 代码写入（范围纪律）
- **Given** 本 change 从立项到需求阶段出口的全部提交
- **When** 看 diff 文件清单
- **Then** 只触及 `.specs/**` 与仓库根 `STATE.md`；`backend/`、`frontend/src/` 零写入
- **验证方式**: `git diff --name-only b15c4554..HEAD | grep -vcE "^(\.specs/|STATE\.md)"` → `0`

> 不可一句话验证的 AC 视为不合格，已按 R18.1① 就地反问或删除；本文件无「界面要好看」式判据——视觉只锁定既有实现基线（CHANGE「视觉调性」），由 2a 承接。

## 4. 范围切分

### v1（本次必做）

1. W1 事实底稿三份：数字口径表、11 域 × 32 页归属、孤儿盘点（2 页 + 9 组件）、9 条既有能力边界（S1-S9）、7 条文档漂移差异（D1-D7）→ 已交付 `BASELINE-code-facts.md`。
2. W2 竞品逐项深挖：4 点名产品消歧（2 确定 / 1 无法唯一 / 1 未定位）+ 15 条能力缺口逐条去向 + 3 个扩展候选 → 已交付 `RESEARCH-competitors.md`。
3. 产品原型 + 界面原型文档一份（默认 `product-design.html`）：11 域全覆盖、32 页 IA 骨架、侧边栏 13 入口、竞品结论按双字段叠加、校准基线头部、零外部依赖、示例全合成。
4. 域语言沉淀进 `@.specs/CONTEXT.md`（本阶段已追加）。
5. 出口：2a-ui-design（前端项目、界面原型必填 UI-DESIGN 基线）与需求门票面记录。

### v2（下一轮考虑 · 即议题，R18.4；已登记 STATE.md「已留档议题」）

- 需代码的能力（**12 条 slug**，以 RESEARCH §2 反引号 slug 去重集为唯一真源，数量一致性核对命令见 RESEARCH §2「计数不变式」）：
  - 轻成本可先行 6：`token-cost-ledger`、`unified-inbox`、`trace-viewer-reattach`、`model-verification-tier`、`separation-of-duty-gate`、`skill-capture-from-run`
  - 中等 3：`mcp-tool-runtime`、`inbound-channel-session`、`approval-ladder-autonomy`
  - 架构级（须 2-design + ADR）2：`agent-execution-sandbox`、`knowledge-rag-retrieval`
  - 边界待定 1：`human-agent-assignment-board`
- 既有议题 `docs-drift-resync`：待原型成为事实源后回写 README（D1-D7 差异清单是它的输入）。
- 界面原型的可交互高保真版（本次静态稿 + 文案）。

### out（永远不做）

1. 不改任何 L1 业务代码（`backend/`、`frontend/src/`），不给原型接真实数据（会把演示边界变成真实暴露面，🟩🔴 双维度同判 → 新 change）。
2. 不删孤儿页面/组件（`SecurityPage`、`AssemblyView` 及 9 个组件）——定性归各议题，本 change 无授权删除。
3. 不把 AgentFlow 扩成代码托管/IDE 平台；不把 BMAD/code-kit 开发流程绑进产品主线（`CLAUDE.md`「不绑定特定开发流程或框架」）。
4. 不做市场定位、定价、GTM 分析，不做集成数量竞赛（RESEARCH G15 否决理由）。
5. 不在产物里出现真实凭据、真实用户会话内容、真实主机名/IP/绝对路径。

## 5. 非功能性需求

- **性能**: 原型单文件体积 ≤ 2 MB（`wc -c product-design.html` → ≤ 2000000）；本地双击到首屏可交互 ≤ 2s（本机一次手动计时，无网络请求）。
- **可访问性**: 中文文案（沿用 `CLAUDE.md` 约定）；颜色与间距取 `frontend/src/styles/tokens.css` 实际值；正文在 1280px 宽下无横向滚动、表格单元格不截断（一次手动检查）；不做 WCAG 认证级要求（交付物是评审文档，非产品界面）。
- **安全**: 四级数据分类（CHANGE「数据分类与敏感面」）+ AC-4 / AC-7 / AC-8 / AC-9 / AC-11 全条适用；零外链（AC-3）即零第三方供应链入口；竞品原文不整段搬运，只摘要 + 引用。
- **兼容性**: Chrome / Edge 近两年版本 + Firefox 可完整渲染；纯静态、不依赖构建工具与网络；断网可开（AC-3）；不承诺移动端适配（out 的端壳结论一致）。
- **可观测性**: 无可运行代码，无埋点/日志需求 = **无**；可判过期性由校准基线（AC-6）+ 归属锚点（AC-5）承担，供 S-align 消费。
- **可维护性**: 需求层数字禁止硬编码——所有数字以 BASELINE 引用式呈现（改代码只改 BASELINE 一行，不扩散）。

## 6. 依赖与假设

- **依赖（人工拍板，卡进 2a 的时限）**：① `product-design.html` 走 ①既有稿融合 / ②确认不存在→新建（现按 ② 起草，两路兼容）；②「等」的 3 个扩展候选是否采纳；③ Buzzz 官网或材料（现未定位）；④ AgentOS 三义中人工所指（现取 rivet 候选做参照、结论仅 2 行）；⑤ 小队是否补编 D-discovery 主责（现内嵌执行，无 GD 议题门）。
- **假设**：交付形态为静态 HTML + 文案（CHANGE 排除可交互高保真）；容量边界 = FastAPI 单体 + SQLite 默认 + 单机部署（G3/G14 判「需架构决策」即据此）；视觉调性锁定既有实现（Tremor 3.18 + Tailwind 3.4 + `tokens.css`）。
- **调研通道的已知局限（必须随产物交付）**：本运行时 `web_search` 不可用，事实取自官网 HTML + 官方仓库 README + GitHub Search API（均 2026-09-22 实测可达），未读第三方评测；竞品能力=其官方自述，一律经「归属」字段隔离，不进本项目事实。

## 7. 门禁与过程记录

- G1（立项/需求方向门）：4/4 通过，链见 `@.specs/product-prototype-refresh/CHANGE.md#过程记录`。
- **需求门（质量门，R9.1 序列中在 G1 之后、G2 方案门之前）**：🟫🟦🟩🔴 四人投票已在本阶段出口评论召集，票面结果待集齐后追加于下方；未集齐 4 票不推进。
- 本阶段自检：AC 全部 G/W/T + 单一验证 ✓ ｜ v1/v2/out 三类齐（v2＝需代码议题 **12** 个 slug + 既有议题 `docs-drift-resync` + 高保真 1 条，out 5 条）✓ ｜ 非功能 5 轮显式（含「无」）✓ ｜ CONTEXT.md 已追加术语/决策/默认行为 ✓ ｜ 无 HOW（实现归 DESIGN/2a）✓ ｜ R18.3 落盘前置（三份产物 + STATE）✓ ｜ **跨工件计数对账**：RESEARCH §2 slug 去重集 = REQUIREMENT v2 = STATE 议题段 = 12 ✓（G2 🟩 条件票落地项）

### 需求门票面（计票中 · 先数票再裁决，未集齐 4 票不推进）

| 角色 | 票 | 时间与依据 | 承接项去向 |
|---|---|---|---|
| 🟦 资深用户评测员 | **✅** | 回帖 `01a0c7ff-84ba-7830-8413-3ade31b3e35b`；在 tip `0db6417b` 亲跑 AC-1（32/168）、AC-4（0 命中 exit 1）、AC-10（`15 0`）、AC-12（0），并逐 label 核过 13 入口、核过 CONTEXT §15.1-15.4 | 三条非阻断：① AC-2「32 行」措辞 → **已当轮改**（12 行 · 32 页 + 自校验行说明）；② AC-11 数量地板不代逐处 → **已当轮改**（六项逐处 + UAT-6 勾清单归 5-test，地板 ≥4 抬到 ≥6）；③ US-2 的 13 入口未进 AC → **已当轮并入 AC-2 Then/UAT-1** |
| 🟫 高级产品经理 | 未到 | 召集票 `01a0c7fd`（15:21）点名范围覆盖 / v1·v2·out / 遗漏场景 / 4 条"观望-否决"是否抬进 v1 | — |
| 🟩 架构师 | **❌ 条件票**（唯一阻断项） | 回帖 `01a0c805-b3d6-7b57-a5b5-c6d374318bcc`；四项关注点逐条**代码实测**通过（可行性基线写实、G1/G6 两条锚点全真、NFR 充分、BASELINE 三层咬合且不与 CONTEXT §3 打架；S1-S9 抽核全真），唯一破口＝**跨工件计数不一致**：RESEARCH §2 实际登记 12 个需代码 slug，而本文 §4 v2、RESEARCH 合计行、STATE 决策日志三处写 11——`approval-ladder-autonomy`（G4/STATE/CONTEXT 三处均在）在 v2 枚举漏网 | **阻断项已当轮落地**：① 本文 §4 v2 补登该 slug 并按轻6/中3/架构级2/边界待定1 分组＝12；② RESEARCH 合计行 11→**12** 并新增「计数不变式 + 核对命令」防复发；③ STATE 决策日志与本文自检行同步 12。非阻断 1 条（CONTEXT §3 表头加快照路标）**亦当轮落地**；其原第二条（AC-2 标记命名耦合）已被 `240b8e37` 吸收、他本人撤回。**待其在新 tip 上复验改票** |
| 🔴 安全审计师 | 未到 | 召集票点名 AC-3/4/5/9/11 粒度、敏感数据处理是否落到 AC+NFR、演示边界与加密措辞 | — |

**当前票面：2/4（🟦 ✅ ＋ 🟩 ❌条件票，唯一阻断项已当轮落地、待其在新 tip 复验改票；🟫🔴 未到）→ 未集齐 4 票，不裁决、不推进**（R9/R13.2；票到齐后在本段改写为终裁 + `▶️ 自动继续`）。本轮改动全部是**改错与收紧**：12 个需代码 slug 的跨工件对账（§4 v2 分组重排 + RESEARCH §2 计数不变式 + STATE 两处）、CONTEXT §3 快照路标；**不改范围、不改 AC 条数（仍 12 条）、不改任何去向判定、不改任何数字基准**（AC-1 32/168、AC-10 `15 0`、AC-12 0 越界复跑结论不变）。
