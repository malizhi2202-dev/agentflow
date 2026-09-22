# TASK: 项目原型文档重做 —— 交付稿 `product-design.html` 的原子任务

- **Change ID**: `product-prototype-refresh`（来源 issue：MALIZHI-6 项目原型文档审核）
- **关联**: `@.specs/product-prototype-refresh/REQUIREMENT.md`（13 条 AC · 已投票）· `@.specs/product-prototype-refresh/DESIGN.md`（§0 技术栈 / §1.5 标记契约与 K 系列闸 / §6 范围 / §9.5 禁动）· `@.specs/product-prototype-refresh/UI-DESIGN.md`（§15 第一批任务 / §13 U 闸 / §13.0 现算配方 / §14 归口）· `BASELINE-code-facts.md` · `RESEARCH-competitors.md`
- **入口门禁（R2.7）**：CHANGE / REQUIREMENT / DESIGN / **UI-DESIGN**（前端项目必备）/ BASELINE / RESEARCH 六件齐在 tip `1556d819`；G1 4/4 · 需求门 4/4 · G2 4/4 · **G2a 3/4 通过**（🔴 ❌ 的异议按 R13 存档于 `UI-DESIGN.md §18`）→ **通过**，不需要回上游补工件。
- **本文件版本**：**v1 草案**。① 依赖图与波次是 3-task 初判，**待「依赖分析」交回清单/依赖中间物、「波次调度」交回编排结果后定稿**（两者回帖前不合并、不召集 Task 门）；② 每个 `<task>` 的 `<auto>` 一律 `tbd`，**由 Task 门四票 + 自动化三角色（研发负责人 / 资深测试工程师 / 安全审计师）逐条投票后回写**，4-dev 读到 `tbd` 即说明本阶段未过门（R2.9）。

**首轮加载声明（R1.9）**：REQUIREMENT §1–§7 全读（202 行）；DESIGN §0(10–27)／§0.5(29–85)／§1 决策(88–112)／§1.5(125–201)／§6(289–300)／§7(301–331)／§9.4–§9.5(505–523)；UI-DESIGN §5–§9(142–318)／§10–§14(319–513)／§15–§18(516–572)；`templates-TASK.md` 全读 97 行；`kit-rules`／`kit-3-task` 全文。未整读的 reference：`ui-anti-patterns.md`（本阶段不需要——反模式判据已由 2a §12 吸收）、`test-pyramid.md`（5-test 阶段再拉）。

---

## 0. 拆解口径（三条决定任务图形状的裁决，都可回查到工件出处）

1. **按文件冲突切，不按层切**（`kit-3-task` 拆解原则 2）。本 change 的**唯一落盘产物是一个文件**：`.specs/product-prototype-refresh/product-design.html`（DESIGN §0「交付物」行）。因此 T-UI-01…T-UI-09 **共享同一 `write_files` 目标 → 它们之间不存在可并行的两进程写序**，只能是链。**唯一例外是 `T-UI-00`**：它的产物是仓库外的派生名单（§13.0 六条命令），与 HTML 无交集 → 与 `T-UI-01` 真并行（本文件唯一的 `[P]` 对）。自检项「至少 1 个 `[P]`」由此满足，不是硬凑。
   - **被否决的并行方案**（记下来免得 Task 门再问一次）：把稿子切成片段文件并行写、最后拼装。否决理由三条——(i) AC-12 只允许 `.specs/**`＋`STATE.md`，片段与拼装脚本要么进 `.specs/`（污染真源目录、被 AC-4 tier-1 与 AC-10 的核对面扫到）要么落仓库外（失去 git 保护）；(ii) DESIGN §6 明写"对账一律用 §1.5 的单行命令，不引入第二套工具"，拼装脚本就是第二套工具；(iii) 片段拼装会把 D2 要防的"手抄漂移"重新引进来——片段与全稿的 K1/K5 一致性只有在合并后才可验，等于把全部风险推到最后一步。
2. **任务边界＝一次可独立判绿的增量**，不是"一层样式"。每个任务的 `verify` 只跑**该任务首次强制的闸**（见 §5.2 的"首次强制"列）；全量 88 项复跑集中在 `T-UI-09`。理由：`T-UI-01` 阶段稿子里还没有 32 个页块，拿 K1 去验它必然红——2a 在 §16 里跑的是**完整样本**，不逐任务跑，这条链是我为 4-dev 补的。
3. **2a §14 的十一项上报归口不拆成 4-dev 任务**（交棒提示 ②）。它们的持有者不是本 change：DESIGN/BASELINE/tokens.css/`.gitignore` 分别是 2-design 与 L1 的产物，本 change 零 L1 写入（AC-12）。逐项路由见 §7；4-dev 若"顺手做"其中任何一条，按 R6.5/R7.1 判越界回滚。

---

## 1. 波次划分（v1 草案，待依赖分析 + 波次调度校验）

```
Wave 1 (parallel): T-UI-00[P], T-UI-01[P]      # 唯一真并行对：00 写仓库外派生名单，01 写交付稿
Wave 2:            T-UI-02                     # depends T-UI-01
Wave 3:            T-UI-03                     # depends T-UI-01, T-UI-02
Wave 4:            T-UI-04                     # depends T-UI-00, T-UI-03   ← 结构主体（12 章 / 32 块 / 左栏 13+11+2）
Wave 5:            T-UI-05                     # depends T-UI-04
Wave 6:            T-UI-06                     # depends T-UI-04, T-UI-05
Wave 7:            T-UI-07                     # depends T-UI-00, T-UI-04, T-UI-05
Wave 8:            T-UI-08                     # depends T-UI-04..07
Wave 9:            T-UI-09                     # depends 全部
```

> Wave 2–9 每波一个任务，是**单写者约束的结果**（§0.1），不是拆得粗。若「波次调度」能把某些波**合并为同一个 4-dev 会话内的连续步骤**（每步仍各自 commit + 各自 verify，R4.1/R2.4 不因此放松），那是可接受的编排产出；**不接受**的是把它们并到同一次提交或跳过中间 verify。

---

## 2. 任务清单

**通用约定（写一次，各任务不再重复）**

- 所有 `verify` 在**仓库根**执行；`F=.specs/product-prototype-refresh/product-design.html`（人工 ① 若给出既有稿路径，**只改这一行赋值**——DESIGN §0 的两路兼容设计）。
- 所有任务**允许且只允许**改：交付稿本体、本文件的 `status=` 属性与「阻塞日志」、`STATE.md` 的「当前 Task／中断任务」两行。除 `status=` 外，本文件任何字段属 3-task 持有——4-dev 改它即越界（R7.1），必须回本阶段。
- 只读真源按 DESIGN §0.5.1 的清单，**禁止**读 `backup/**` 当参考、禁止改 `frontend/**` `backend/**` 任何文件（AC-12）。

### T-UI-00 派生名单现算（本阶段新增，非 §15 原列 · 理由见字段内）

```xml
<task id="T-UI-00" parallel="true" status="pending">
  <name>把交付稿要用的全部名单与数字从真源现算成一份仓库外的工作清单（禁手抄）</name>
  <read_files>
    .specs/product-prototype-refresh/BASELINE-code-facts.md   <!-- §1 计数命令 / §2 域-页表 -->
    .specs/product-prototype-refresh/RESEARCH-competitors.md  <!-- §2 G 号 + 去向 + slug 唯一真源 -->
    .specs/product-prototype-refresh/UI-DESIGN.md             <!-- §13.0 六条现算命令原文 -->
    .specs/product-prototype-refresh/DESIGN.md                <!-- §1.5 D2/D19 派生纪律 -->
    frontend/src/App.tsx                                      <!-- NAV/ADMIN_NAV/renderContent -->
    frontend/src/pages/*.tsx                                  <!-- 32 页文件名核对 -->
    backend/routes/*.py                                       <!-- 端点计数口径 -->
  </read_files>
  <write_files>
    $TMPDIR/product-refresh-3task/T-UI-00/*.txt   <!-- 仓库外工作清单，不入库（DESIGN §6 B-3 + AC-12） -->
  </write_files>
  <action>
    按 `UI-DESIGN.md §13.0` 的六条命令现算并落成六份清单文件：
    (1) 32 个 `data-page` 名（**先剥全角括号注解再按顿号切**，即 §10-D 的稳健式——现式会产出 33 项脏集合）；
    (2) 13 个 `data-nav` label 原文（含 `💬 对话中心` 的 emoji，逐字不改）；
    (3) 13 条入口的落点组件名 → `#pg-<Component>`（N8 推导链，`orchestration` 取默认分支 `OrchestrationListPage`，
        `users`/`audit` 取**含组件的那个** case 而非权限门 `return perm(...)`）；
    (4) masthead 的 32 / 168（AC-1 的两条计数命令）；(5) 9 个 `vb-G*` 的 G 号；(6) 12 个可见 slug（真源 13 减内部件 1，D19）。
    另附两份：**六处 `nb-*` 语义名**（AC-11 §1.5 已列：token-usage / mcp-tool / trace-viewer / knowledge-rag /
    security-page / assembly-view）与 **附录 10 行**（稿内实际出现的边界句数，S11 依 D11/D19 不进稿）。
    为什么要单独一步：DESIGN D2「数字与清单一律派生」——没有这一步，4-dev 就会去抄 2a 工件里的样本数字
    （§13 表格里的 172/257、30 793 B 是**样本实测值，不是交付稿期望值**），那正是本 change 要消灭的 README 式漂移。
    **本任务不写交付稿。**
  </action>
  <verify>
S=.specs/product-prototype-refresh; p=$(awk -F'|' '/^\| [0-9]+ \|/ || /^\| — \|/ {print $4}' $S/BASELINE-code-facts.md | sed -E 's/（[^（）]*）//g' | tr '、' '\n' | sed -E 's/[[:space:]]//g' | grep -vE '^$' | sort -u | wc -l); n=$(grep -oE "label: '[^']+'" frontend/src/App.tsx | sed -E "s/label: '([^']+)'/\1/" | sort -u | wc -l); im=$(grep -cE "^import .*from '\./pages/" frontend/src/App.tsx); en=$(grep -rEn '^@router\.(get|post|put|patch|delete)' backend/routes | wc -l); g=$(awk -F'|' '/^\| G[0-9]+/{print $2,$9}' $S/RESEARCH-competitors.md | grep 融入原型 | grep -oE 'G[0-9]+' | sort -u | wc -l); sl=$(grep -oE '`[a-z]+(-[a-z]+)+`' $S/RESEARCH-competitors.md | sort -u | grep -v human-approval | grep -v admin-file-read-jail | wc -l); echo "pages=$p nav=$n imports=$im endpoints=$en 融入=$g slug=$sl"; test "$p" = 32 -a "$n" = 13 -a "$im" = 32 -a "$en" = 168 -a "$g" = 9 -a "$sl" = 12
  </verify>
  <done>六行输出恰为 32 / 13 / 32 / 168 / 9 / 12（3-task 本轮已实跑复现，见 §8 自检），清单落仓库外且 `git status --porcelain` 仍 0 行</done>
  <depends_on></depends_on>
  <auto>tbd</auto>
</task>
```

### T-UI-01 … T-UI-09（2a §15 第一批，逐条补齐 read/write/verify/done 边界）

```xml
<task id="T-UI-01" parallel="true" status="pending">
  <name>文档根三件 + :root 整块逐字节照抄（含收尾花括号独占一行）</name>
  <read_files>
    frontend/index.html                    <!-- 第 2/4/6 行：lang / charset / title 的产品形态 -->
    frontend/src/styles/tokens.css         <!-- 第 6-90 行 :root 真身（逐名去重 61 个变量，§14-上报①） -->
    .specs/product-prototype-refresh/UI-DESIGN.md   <!-- §3.1 角色表 · §5.1 字体栈 · §13 闸 · §13.3 空洞教训 -->
    .specs/product-prototype-refresh/DESIGN.md      <!-- §1.5 K6b · §0.5.1 只读真源清单 -->
  </read_files>
  <write_files>
    .specs/product-prototype-refresh/product-design.html
    .specs/product-prototype-refresh/TASK.md        <!-- 仅 status= 与阻塞日志 -->
    STATE.md                                         <!-- 仅「当前 Task」/「中断任务」两行 -->
  </write_files>
  <action>
    新建交付稿：`<!DOCTYPE html>` + `<html lang="zh-CN">` + `<head>` 内 `<meta charset="UTF-8" />`（产品逐字节形态）
    + `<title>AgentFlow · 产品原型与界面原型文档</title>`（C0；品牌名取 README 口径，§14-上报④）。
    然后写**一份内联 `<style>`**，其 `:root` 块**整块逐字节照抄 `tokens.css:6-90`**：只声明本稿会用到的名字
    （§3.1 角色表 + §5/§6 用到的间距/圆角/字号 token；`--blue-border` 本稿不使用 → 见下），
    **收尾 `}` 必须独占一行**——`UI-DESIGN §13.3` 的实测教训：压成紧凑写法不触 K6b，却让 U2b/U12/U25 三条
    排除式闸**一起静默空洞**（补集只剩 2/179 行），稿子可以带着脏值全绿过关。
    引号形态一并照抄：`--font` 里是**单引号** `'Segoe UI'`（§14-上报②：K6b 是文本级比对，写成双引号实测 diff 2 行即红）。
    宁可不声明也不要自造：未用到的 token 不写；写了的名字与值必须能在 tokens.css 找到同名同值（K6b）。
    本任务不写任何正文区块。
  </action>
  <verify>
F=.specs/product-prototype-refresh/product-design.html; pair(){ sed -n '/^:root *[{]/,/^ *}/p' "$1" | tr ';' '\n' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//; s/[ ]//g' | grep -E '^--' | sort -u; }; [ -z "$(comm -13 <(pair frontend/src/styles/tokens.css) <(pair "$F"))" ] && test "$(grep -c '<html[^>]*lang=' "$F")" = 1 && test "$(grep -c '<title>[^<]' "$F")" -ge 1 && test "$(grep -c '<meta charset=' "$F")" = 1 && test "$(grep -c 'var(--blue-border)' "$F")" = 0 && B=$(awk '/^:root *[{]/{r=1} r{n++} r&&/^ *}$/{print n; exit}' "$F"); C=$(sed -n '/^:root *[{]/,/^ *}/!p' "$F" | wc -l); T=$(wc -l < "$F"); test $((T-B)) -eq $C && echo "T-UI-01 PASS 补集 $C/$T"
  </verify>
  <done>K6b（变量名+值全能在 tokens.css 找到）＋ C0 三件（U18 恰 1 / U19 ≥1 / charset 恰 1）＋ U27 零引用 ＋ U2a 非空洞（输出 `PASS C/T`，C 与 T 由本稿实测，**不继承样本的 172/257**）→ AC-12 边界仍 0</done>
  <depends_on></depends_on>
  <auto>tbd</auto>
</task>

<task id="T-UI-02" parallel="false" status="pending">
  <name>字号 8 档闭集 + 两栈（禁 font 简写、禁幻影变量）</name>
  <read_files>
    .specs/product-prototype-refresh/UI-DESIGN.md   <!-- §5.1 字面栈 · §5.2 8 档闭集 · §13 U1/U1b/U3 -->
    frontend/src/main.tsx                           <!-- 自托管 'IBM Plex Sans' 的 use-site 证据（§5.1） -->
    frontend/src/styles/tokens.css
  </read_files>
  <write_files>
    .specs/product-prototype-refresh/product-design.html
    .specs/product-prototype-refresh/TASK.md
    STATE.md
  </write_files>
  <action>
    字号只用 §5.2 钉死的 8 档 `{10,11,12,13,14,15,18,24}px`，字重三档（`700` 仅等宽数字、`800` 禁）；
    **一律 `font-size:` 长写法**，`font:` 简写全稿禁（U1b——U1 原式看不见简写里的字号＝假绿，§13.1-3）。
    字体栈按 §5.1：use-site 前置产品已自托管的 `'IBM Plex Sans'`，尾巴走 `var(--font)`；
    **禁自造变量名**——app 里 26 个"引用而零声明"的幻影名（`--font-display`/`--font-body`/`--text-dim`/`--color-primary` …）
    一个都不许抄进交付稿（§14-上报③：抄进去既触 K6b 又被浏览器静默忽略）。沿用 T-UI-01 的 `:root`，本任务**不新增 token**。
  </action>
  <verify>
F=.specs/product-prototype-refresh/product-design.html; [ -z "$({ grep -oE 'font-size: *[0-9]+px' "$F"; grep -oE 'font: *[^;]*' "$F" | grep -oE '[0-9]+px'; } | grep -oE '[0-9]+' | sort -un | grep -vE '^(10|11|12|13|14|15|18|24)$')" ] && test "$(grep -cE '(^|[;{ ])font: *[0-9'"'"']' "$F")" = 0 && test "$(grep -oE 'var\(--[a-zA-Z0-9-]+\)' "$F" | sed -E 's/var\((--[a-zA-Z0-9-]+)\)/\1/' | sort -u | grep -cE -- '--(bg-elevated|bg-panel|border-normal|border-weak|color-|duration-micro|font-body|font-display|info|radius-|text-dim|text-primary|text-weak)')" = 0 && test "$(grep -c "'IBM Plex Sans'" "$F")" -ge 1
  </verify>
  <done>U1 无输出 ＋ U1b 恰 0 ＋ U3 恰 0（幻影变量零抄）＋ §5.1 栈在位 → 对应 AC-2/AC-6 的可读性前提与 §12 字体类例外声明</done>
  <depends_on>T-UI-01</depends_on>
  <auto>tbd</auto>
</task>

<task id="T-UI-03" parallel="false" status="pending">
  <name>间距档位＋版心几何＋圆角与零动画（§6 全维）</name>
  <read_files>
    .specs/product-prototype-refresh/UI-DESIGN.md   <!-- §6.1 档位授权+6 值例外集 · §6.2 白名单 · §6.3 · §6.4 · §13 U2a/U2b/U12/U25/U9b -->
    frontend/src/App.tsx                            <!-- 例外集出处：287/316/341 的 padding 与 288/317 的 marginBottom -->
    frontend/src/styles/tokens.css                  <!-- .badge 的 1px/6px/3px（155-157）与 reduced-motion 兜底（117-119） -->
  </read_files>
  <write_files>
    .specs/product-prototype-refresh/product-design.html
    .specs/product-prototype-refresh/TASK.md
    STATE.md
  </write_files>
  <action>
    间距走 §6.1 的 8 档授权表（`--s5` 本轮不授权任何用途；节奏靠 16→24→32/40 跳档，不靠新数值）。
    **字面 px 只许 §6.1 例外集的 6 个值且必须带出处**：`1px`·`6px`·`3px`（`.badge`）· `7px`·`10px`·`2px`（左栏 nav 项逐字同形）。
    几何只许 §6.2 白名单：`200px` 左栏 / `1000px` 正文列 / `-9999px`（**必须负号**）；`44em` 可选、不触白名单。
    边框与焦点环一律 `border:`/`outline:` 简写，**不写成 `<n>px` 几何声明**（§6.2 末段）。
    圆角按 §6.3（`--r-sm` 徽标/内联码/导航项 · `--r-md` 页块与待标注 · `--r-lg` 仅 SVG 容器；禁胶囊、禁混合、禁嵌套卡）。
    动效按 §6.4 的**零动画**基线：`transition` 只允许颜色族 + `var(--fast) var(--ease)`；
    禁 `@keyframes`／`transition: all`／`transition: width`／`scroll-behavior: smooth`；`prefers-reduced-motion` 兜底按 §6.4 的显式自补形态写。
    阴影零出现（`box-shadow` 与 `--shadow-*` 都不写）、无 >1px 彩色侧条（§0.4 打破③ / §12 边框类）。
  </action>
  <verify>
F=.specs/product-prototype-refresh/product-design.html; sed -n '/^:root *[{]/,/^ *}/!p' "$F" | grep -cE '#[0-9a-fA-F]{3,8}|rgba?\(' | grep -qx 0 && [ -z "$(sed -n '/^:root *[{]/,/^ *}/!p' "$F" | grep -oE '(^|[;{ ])(grid-template-columns|max-width|min-width|width|left):[ ]*[0-9]+px' | grep -oE '[0-9]+px' | sort -u | grep -vE '^(200px|1000px|9999px)$')" ] && [ -z "$(sed -n '/^:root *[{]/,/^ *}/!p' "$F" | grep -oE '(padding|margin|margin-bottom|margin-top|gap):[^;}]*' | grep -oE '[0-9]+px' | sort -u | grep -vE '^(1px|2px|3px|4px|6px|7px|8px|10px|12px|16px|20px|24px|32px|40px)$')" ] && test "$(grep -cE 'scroll-behavior: *smooth' "$F")" = 0 && test "$(grep -c '@keyframes' "$F")" = 0 && test "$(grep -cE 'transition: *all|transition: *width' "$F")" = 0 && test "$(grep -c 'box-shadow' "$F")" = 0 && test "$(grep -cE 'border-radius: *(999px|9999px|50%)' "$F")" = 0
  </verify>
  <done>U2b 根外零色值 ＋ U12 几何白名单外无输出 ＋ U25 间距例外集外无输出（三条都依赖 U2a 的 :root 窗口真闭合）＋ §6.3/§6.4 与 §12 阴影/边框/动效三条声明机验为 0 → AC-1 的"与后台无法区分"前提成立</done>
  <depends_on>T-UI-01, T-UI-02</depends_on>
  <auto>tbd</auto>
</task>

<task id="T-UI-04" parallel="false" status="pending">
  <name>结构主体：masthead + 12 个域章 + 32 个页块 + 左栏 13+11+2（含 N8 落点与 A 级锚点）</name>
  <read_files>
    .specs/product-prototype-refresh/UI-DESIGN.md   <!-- §7 N1-N8 · §8 C1/C2/C3/C13 · §9 状态矩阵 · §13 U4/U10/U14/U15/U15b/U16/U24 -->
    .specs/product-prototype-refresh/DESIGN.md      <!-- §1.5 契约 · D3 结构四层 · D9 锚点可解析 · D10 域名单点 -->
    .specs/product-prototype-refresh/BASELINE-code-facts.md   <!-- §2 域-页表（32 页归属的唯一基准） -->
    frontend/src/App.tsx                            <!-- renderContent 的 case → 组件（13 条 href 落点） -->
    $TMPDIR/product-refresh-3task/T-UI-00/*.txt     <!-- T-UI-00 的派生名单（禁再抄第二份） -->
  </read_files>
  <write_files>
    .specs/product-prototype-refresh/product-design.html
    .specs/product-prototype-refresh/TASK.md
    STATE.md
  </write_files>
  <action>
    按 §7 的版式写骨架：`header.masthead`（H1 + 校准基线行逐字 `校准基线：<7-40 hex> · YYYY-MM-DD · 页面 32 / 端点 168 / 域 11`，
    **数字取 T-UI-00 现算值**，hex 取写稿时 `git rev-parse --short HEAD`）＋ 200px 左栏两组（13 入口带 `data-nav`＋11 域 `toc-domain`
    ＋附录 2 条）＋ `main > section` 十二个域章（BASELINE §2 的 11 域 + 平台外壳）＋ 32 个页块 + 2 个附加章不带 `class="domain"`。
    **四条形态纪律**（都是实跑撞出来的，破了就是必红）：
    (i) `<section>` 一律 `class` 在前、`id` 在后（§10-冲突 C：K7/K12 的字面正则仍顺序敏感）；
    (ii) 域章内顺序钉死 H2 → 边界句 → 页块 → 嵌套 notice（§10-冲突 B：嵌套 `</section>` 会提前截断 awk 窗口）；
    (iii) 第 8 域目录写 label 原文「审计日志」，「安全与审计」字样全文只许出现在 `#sec-security` 内（D10/N3/U4/K13）；
    (iv) 页块用 **`<article class="page-block" …>`** 且 `data-page`/`data-domain`/`data-owner`/`data-anchor`/`id` 与开标签**同物理行**
        （C3；DESIGN §1.5 该格仍写 `div`，与本文件 §8/§9 及票面"标记形态由 2a 定"冲突 → 本阶段裁决见 §7 表末两行，机验只数 class 串故不破任何判据）。
    13 条入口的 `href="#pg-<Component>"` 一律取 T-UI-00 第 (3) 份名单（N8 现算，含 `orchestration` 默认分支与 `users`/`audit` 双 case 陷阱）——
    **无 `href` 的 `<a>` 不是链接、不进 tab 顺序**，全闸跑绿仍交出"看着能点、按 Tab 跳不过去"的左栏。
    登录态示例（`LoginPage` 块）用 `<code data-literal="<管理员口令>">&lt;管理员口令&gt;</code>` 双写形态（§10-冲突 A：
    只写转义会 AC-9 判 0，只写裸串则屏幕上不可见）。可见 `💬` 包 `<span aria-hidden="true">`，`data-nav` 属性原文不动。
  </action>
  <verify>
F=.specs/product-prototype-refresh/product-design.html; test "$(grep -c 'class="domain"' "$F")" = 12 && test "$(grep -c 'class="page-block"' "$F")" -ge 32 && test "$(grep -oE 'data-nav="[^"]+"' "$F" | wc -l)" = 13 && diff <(grep -oE "label: '[^']+'" frontend/src/App.tsx | sed -E "s/label: '([^']+)'/\1/" | sort -u) <(grep -oE 'data-nav="[^"]+"' "$F" | sed -E 's/data-nav="([^"]+)"/\1/' | sort -u) && test "$(grep -oE '<a [^>]*data-nav[^>]*>' "$F" | grep -vc 'href="#')" = 0 && test "$(grep -oE '<a\b[^>]*>' "$F" | grep 'data-nav=' | grep -vc 'href="#')" = 0 && [ -z "$(comm -23 <(grep -oE '<a [^>]*href="#[^"]+"' "$F" | sed -E 's/.*href="#([^"]+)".*/\1/' | sort -u) <(grep -oE 'id="[^"]+"' "$F" | sed -E 's/id="([^"]+)"/\1/' | sort -u))" ] && test "$(grep -oE ':target[^}]*\}' "$F" | grep -cE 'outline: *2px solid var\(--blue\)')" -ge 1 && [ -z "$(grep -oE ':target[^}]*\}' "$F" | grep -- '--blue-border')" ] && test "$(awk '/<section class="(domain|chapter)"/{insec=($0 ~ /id="sec-security"/)} !insec' "$F" | grep -c '安全与审计')" = 0 && test "$(grep -c 'aria-hidden="true">💬' "$F")" -ge 1 && test "$(grep -c "<管理员口令>" "$F")" -ge 1 && test "$(grep -c "&lt;管理员口令&gt;" "$F")" -ge 1 && grep -qE '校准基线：[0-9a-f]{7,40} · 20[0-9]{2}-[0-9]{2}-[0-9]{2}' "$F"
  </verify>
  <done>K6c 恰 12 · AC-2 `page-block` ≥32 · K5 双向 diff 空 · U10 恰 13 · U15/U15b 各 0 · U16 空集 · U14 无输出 · U4 恰 0 · U24 ≥1 · AC-9 ≥1 · K10 ≥1（K1 页集双向对账在 T-UI-09 全量跑，此处靠 K5/U16 保证两套坐标齐）</done>
  <depends_on>T-UI-00, T-UI-03</depends_on>
  <auto>tbd</auto>
</task>

<task id="T-UI-05" parallel="false" status="pending">
  <name>两轴徽标 C4/C5：短词文本节点 + 产品 .badge 原形底</name>
  <read_files>
    .specs/product-prototype-refresh/UI-DESIGN.md   <!-- §8 C4/C5 · §9 徽标行 · §4 叠底对比度 · §13 U6a/U6b/U20/U26 -->
    frontend/src/styles/tokens.css                  <!-- .badge 155-162：同色 8% 底无边框 + gap:3px + 1px/6px 内距 -->
    .specs/product-prototype-refresh/DESIGN.md      <!-- D13 单写红线 · D4 两轴正交 · §1.5 AC-5 行 -->
  </read_files>
  <write_files>
    .specs/product-prototype-refresh/product-design.html
    .specs/product-prototype-refresh/TASK.md
    STATE.md
  </write_files>
  <action>
    每个页块/条目挂 `chip-o1..o4` 与 `chip-s1..s3` 两枚徽标：**枚举原串只在 `data-owner`/`data-state` 属性里**，
    可见文案是**短词文本节点**（`已有/半接/竞品建议/未做` · `未接/演示/规划`），**不用 `::after`、不加 `role="img"`/`aria-label`**
    （🟫 ④：`::after` 文案不进 Ctrl+F 与选中复制，而"半接/演示/竞品建议"正是评审核对抓手；🔴 的 `aria-label` 覆盖率式在文本节点形态下会把合规稿判红 → 等价式是 U20 空 chip + U26 限两字）。
    o1/o2/o3 用产品 `.badge` **原形**（同色 8% 底 + 无边框：`--green-bg/--orange-bg/--blue-bg`），o4 与 s1..s3 用 `--bg-card` + 1px 框；
    文字色 o1 `--green`／o2 `--orange`／o3 `--blue`／o4+s* `--text-secondary`（§4 实测 6.28／7.13／4.78 叠底全过 AA，红字不落红底）。
    两轴**不合并**（ADR-003），归属在前、状态在后、gap `--s1`；§9 的 12 格里 ✗ 组合一律不画（K3b 会红）。
  </action>
  <verify>
F=.specs/product-prototype-refresh/product-design.html; test "$(grep -cE 'content:"[^"]*(本项目已有|部分已有|缺失-竞品建议新增|未接入|演示边界|规划中)' "$F")" = 0 && test "$(grep -oE 'aria-label="[^"]*"' "$F" | grep -cE '本项目已有|部分已有|缺失-竞品建议新增|未接入|演示边界|规划中')" = 0 && test "$(grep -oE '<span class="chip[^>]*>[^<]*</span>' "$F" | grep -cE '>[[:space:]]*</span>')" = 0 && [ -z "$(grep -oE '<span class="chip[^"]*">[^<]{3,}</span>' "$F" | grep -v 竞品建议)" ] && test "$(grep -o '本项目已有' "$F" | wc -l)" -eq "$(grep -c '本项目已有' "$F")" && [ -z "$(awk '{own=""; sta=""} { if (match($0,/data-owner="[^"]+"/)) own=substr($0,RSTART+12,RLENGTH-13); if (match($0,/data-state="[^"]+"/)) sta=substr($0,RSTART+12,RLENGTH-13); if (own!="" && sta!="") print own"|"sta }' "$F" | sort -u | grep -E '^(本项目已有\|(未接入|规划中)|缺失(-竞品建议新增)?\|(未接入|演示边界))$')" ]
  </verify>
  <done>U6a/U6b 各 0（护栏）＋ U20 空 chip 0 ＋ U26 无输出（短词限两字，唯一四字例外「竞品建议」）＋ AC-5b `occ == lines` ＋ K3b 无非法组合（12 格矩阵的 ✗ 格零出现）</done>
  <depends_on>T-UI-04</depends_on>
  <auto>tbd</auto>
</task>

<task id="T-UI-06" parallel="false" status="pending">
  <name>六处待标注块 C6 + 各域边界句 C7（含安全域与 S6 过度声称面）</name>
  <read_files>
    .specs/product-prototype-refresh/UI-DESIGN.md   <!-- §8 C6/C7 · §10-冲突 B · §13 U4/U5a/U5b -->
    .specs/product-prototype-refresh/BASELINE-code-facts.md  <!-- §3/§4 的 S 系列边界与「允许写入原型的措辞」列（逐字采用） -->
    .specs/product-prototype-refresh/DESIGN.md      <!-- §1.5 AC-7/AC-8/AC-11 行 · D10/D11 · K7/K8/K12 与两版并跑纪律 -->
    frontend/src/pages/*.tsx                        <!-- 孤儿页 SecurityPage/AssemblyView 的现状核对 -->
    backend/routes/token_usage.py                   <!-- 四处"壳能力"之一的锚点核对（只读） -->
    backend/tools_api.py
  </read_files>
  <write_files>
    .specs/product-prototype-refresh/product-design.html
    .specs/product-prototype-refresh/TASK.md
    STATE.md
  </write_files>
  <action>
    六处**各一个具名块**（禁一处代表全部）：`<section class="notice" id="nb-<语义名>" data-state="…">`，
    语义名取 AC-11/§1.5 的六个（token-usage / mcp-tool / trace-viewer / knowledge-rag / security-page / assembly-view），
    各自落在所属域章内、且**早于该章任何嵌套 `<section>`**（U5a/U5b 机验）。「缺哪半条腿」句写在块内（`部分已有 × 未接入` 是 §9 唯一悬置格的入口）。
    边界句 `<p class="edge-note">现状 + 限定词</p>` 逐字取 BASELINE §4 的「允许写入原型的措辞」列，**一条全文只出现一次**、写在所属域章内。
    安全域：`#sec-security` 章内必须有 `X-User-Id` 回落与 localhost 限定那条；全篇禁「网络隔离」字样。
    加密：每一处含「加密」的句子独占一个 `<p>`，同段含 `ENCRYPTION_KEY` 与「短密钥零填充、无 KDF」限定；
    与密钥无关的**传输加密**句不贴密钥限定语（K8 收窄式的存在理由）。
    控制面域章给稳定 `id="sec-control-plane"`，其窗口内含「仿真」或「模拟」（K12：S6 是最高危的过度声称面，CLAUDE.md/README 都不带这两个字）。
    两个孤儿页面不得作为能力页出现（AC-11）。待标注块不加 `⚠️` 前缀、不上彩色左条。
  </action>
  <verify>
F=.specs/product-prototype-refresh/product-design.html; test "$(grep -oE '<section[^>]*>' "$F" | grep -E 'id="nb-[a-z-]+"' | grep -cE 'data-state="(未接入|演示边界|规划中)"')" = 6 && test "$(grep -cE '未接入|演示边界|规划中' "$F")" -ge 6 && test "$(awk '/安全与审计/{f=1} f{print} f&&/<\/section>/{f=0}' "$F" | grep -cE 'X-User-Id|回落')" -ge 1 && test "$(awk '/<section class="domain" id="sec-security"/{f=1} f{print} f&&/<\/section>/{f=0}' "$F" | grep -cE 'X-User-Id|回落')" -ge 1 && test "$(grep -c '网络隔离' "$F")" = 0 && test "$(awk '/<section class="domain" id="sec-control-plane"/{f=1} f{print} f&&/<\/section>/{f=0}' "$F" | grep -cE '仿真|模拟')" -ge 1 && test "$(grep -E '加密' "$F" | grep -E '密钥|API Key' | grep -vcE 'ENCRYPTION_KEY')" = 0 && test "$(awk '/<section class="domain" id="sec-security"/{o=NR} o && !e && /X-User-Id|回落/{e=NR} o && !n && /<section class="notice"/{n=NR} END{print (e && (!n||e<n)) ? "PASS" : "RED"}' "$F")" = PASS
  </verify>
  <done>K6 恰 6 · AC-11 地板 ≥6（UAT-6 逐处在 5-test 勾，不以地板代替）· AC-7 票面词锚 ≥1 **与** K7 节点锚 ≥1（两版同向）· AC-7b 禁词 0 · K12 ≥1 · K8 收窄式 0 · U5a 通过（U5b 同式在控制面域章复跑于 T-UI-09）</done>
  <depends_on>T-UI-04, T-UI-05</depends_on>
  <auto>tbd</auto>
</task>

<task id="T-UI-07" parallel="false" status="pending">
  <name>调研融入块 C8 + 两张表 C9 + 图例 C10 + 两张内联 SVG C12 + 附录与调研局限</name>
  <read_files>
    .specs/product-prototype-refresh/RESEARCH-competitors.md  <!-- §2 G 号/去向/slug 唯一真源 + 计数不变式 -->
    .specs/product-prototype-refresh/UI-DESIGN.md            <!-- §8 C8/C9/C10/C12 · §11 占位符 · §13 U21/U22 · §10-冲突 C -->
    .specs/product-prototype-refresh/DESIGN.md               <!-- D11/D14/D19 · K4/K9/K11/K13 · §1.5 AC-10/AC-13 行 -->
    .specs/product-prototype-refresh/REQUIREMENT.md          <!-- AC-13 ②「调研局限」三项内容口径 -->
    $TMPDIR/product-refresh-3task/T-UI-00/*.txt              <!-- 9 个 G 号 + 12 个可见 slug 清单 -->
    backend/routes/artifact.py                               <!-- 只读：D11 的外发面判断（不得把 S11 细节写进稿） -->
  </read_files>
  <write_files>
    .specs/product-prototype-refresh/product-design.html
    .specs/product-prototype-refresh/TASK.md
    STATE.md
  </write_files>
  <action>
    9 个融入块 `<div class="view-block" id="vb-G<n>" data-from="G<n>"`，块内**一行**写 `来源：调研结论 G<n>`（禁一行堆叠多条，K4b）。
    slug 表：12 行 `<tr data-slug="…">`，`<code>` 原样写 slug；**内部件 `admin-file-read-jail`（＝S11）不进稿**（D11/D19），
    差值只在闸的左集式里显式处理，禁"把第 13 条画进稿子凑绿"——那是消旧式红的唯一省力路径，也正是被禁止的外发动作。
    附录一節标题逐字 `附录：边界句所在域索引`，10 行、每行只写「S 号 → `#sec-*` 锚点」，**禁复述限定句文本、禁出现域名字样**（K13 机验 D10 单点）。
    另写「调研局限」一节：Buzzz 未定位 / AgentOS 三义待指认 / 取证通道为竞品官方自述（AC-13 ②）。
    图例 C10 必须建立**短词↔原串映射**（`部分已有（徽标「半接」）= …`、`缺失-竞品建议新增（徽标「竞品建议」）与缺失（徽标「未做」）= …`），
    且含枚举原串的行**同行必须带路径子串**（D17，否则已投票的 AC-5a 假红）。两张内联 SVG 框图（D3 架构 + §3 状态机）：
    `.node{fill:var(--bg-card);stroke:var(--text-secondary)}`（1.4.11 非文本对比 ≥3:1，`--border-strong` 实测 1.27 会被 U21 拦）、
    `.edge{fill:none;stroke:var(--blue);stroke-width:1.5}`；SVG 内不写字面色、不把 `var()` 写进 presentation 属性；
    每图 `<title>` + `role="img"` + `aria-label`；禁 `<use href>`、禁 `data:` 位图。两张表都必须有 `<caption>` + `th[scope]`。
  </action>
  <verify>
F=.specs/product-prototype-refresh/product-design.html; diff <(awk -F'|' '/^\| G[0-9]+/{print $2,$9}' .specs/product-prototype-refresh/RESEARCH-competitors.md | grep 融入原型 | grep -oE 'G[0-9]+' | sort -u) <(grep -oE 'id="vb-G[0-9]+"' "$F" | sed -E 's/id="vb-(G[0-9]+)"/\1/' | sort -u) && test "$(grep -oE '调研结论[ =]*G[0-9]+' "$F" | sort -u | wc -l)" = 9 && test "$(grep -oE '调研结论[ =]*G[0-9]+' "$F" | wc -l)" -eq "$(grep -cE '调研结论[ =]*G[0-9]+' "$F")" && diff <(grep -oE '`[a-z]+(-[a-z]+)+`' .specs/product-prototype-refresh/RESEARCH-competitors.md | sort -u | grep -v human-approval | grep -v admin-file-read-jail) <(grep -oE 'data-slug="[a-z-]+"' "$F" | sed -E 's/data-slug="([a-z-]+)"/`\1`/' | sort -u) && test "$(awk -F'|' '/^\| G[0-9]+/{n++; if($9 !~ /融入原型|登记议题|否决/) b++} END{print b+0}' .specs/product-prototype-refresh/RESEARCH-competitors.md)" = 0 && test "$(grep -cE '攻击面|弱点(总表|清单)|S1-S10[ ]*(总表|清单|一览|目录)' "$F")" = 0 && test "$(grep -c '<use' "$F")" = 0 && test "$(grep -cE '(border-color|stroke): *var\(--(border|border-strong|blue-border)\)' "$F")" = 0 && test "$(grep -c '<table' "$F")" -eq "$(grep -c '<caption' "$F")" && a=$(grep -c '安全与审计' "$F"); b=$(awk '/<section class="domain" id="sec-security"/{f=1} f{print} f&&/<\/section>/{f=0}' "$F" | grep -c '安全与审计'); test "$((a-b))" -eq 0 && test "$(grep -cE '未定位|三义|官方自述' "$F")" -ge 3
  </verify>
  <done>K9 diff 空 · AC-13 唯一数 9 且 K4b `occ == lines` · K4 diff 空（可见子集 12）· AC-10 第二列 0 · K11 0 · 无 `<use>` · U21 0 · U22 PASS · K13 章外差值 0 · 局限三项各在位（**末条是 3-task 为 AC-13② 提的机验面，此前只靠 UAT-7，待 Task 门裁**）</done>
  <depends_on>T-UI-00, T-UI-04, T-UI-05</depends_on>
  <auto>tbd</auto>
</task>

<task id="T-UI-08" parallel="false" status="pending">
  <name>可达性收尾（skip-link / focus / nav / details）+ 打印不承诺声明</name>
  <read_files>
    .specs/product-prototype-refresh/UI-DESIGN.md   <!-- §7 N7 · §8 C14 · §9 六态矩阵 · §13 U7/U8/U9/U9b/U17/U23/U23b · §6.2 已知例外 -->
    .specs/product-prototype-refresh/DESIGN.md      <!-- §1.5 AC-3/AC-4 行 · §6 样本落位纪律 -->
    .specs/CONTEXT.md                               <!-- 术语与已锁决策（只读） -->
  </read_files>
  <write_files>
    .specs/product-prototype-refresh/product-design.html
    .specs/product-prototype-refresh/TASK.md
    STATE.md
  </write_files>
  <action>
    键盘与读屏路径收尾四件：跳至主内容 skip-link（**只能 `left:-9999px` 负向移出**，`:focus` 复位 `left:var(--s2)`；正向会撑出横向滚动撞 NFR）、
    `:focus-visible` 一律 2px `--blue` 环 + 2px offset、`<nav aria-label="文档目录">`、折叠用原生 `<details>/<summary>`（零 JS）。
    加 C14 打印声明行（masthead 图例之后）：`本稿不支持打印 / 导出 PDF，评审以屏读为准`（U17 机验存在）。
    emoji 白名单复核：全稿除 `💬 对话中心` 外零 emoji（U8）。
    静态化复核：零 `<script>`/`<img>`/`<link>`/`@font-face`/`@import`/`fetch(`/`<iframe`（U7 比 AC-3 更严）。
    `<a href="https://…">` 来源引用**必须保留**——删它是违规（AC-3 的 R6.2 条）。
    已知例外不修、不藏：1.4.10 Reflow 与 2.5.5 AAA 不承诺（§6.2 与 §14-⑩ 已写明理由并归口需求侧）。
  </action>
  <verify>
F=.specs/product-prototype-refresh/product-design.html; test "$(grep -cE '<script|<img|@font-face|<link|@import' "$F")" = 0 && test "$(grep -cE 'fetch\(|XMLHttpRequest|sendBeacon|EventSource|WebSocket\(|import\(|importScripts\(' "$F")" = 0 && grep -q 'aria-label="文档目录"' "$F" && grep -q ':focus-visible' "$F" && test "$(grep -cE 'left: *9999px' "$F")" = 0 && test "$(grep -c 'left:-9999px' "$F")" -ge 1 && test "$(grep -c 'prefers-reduced-motion' "$F")" -ge 1 && test "$(grep -c '不支持打印' "$F")" -ge 1 && test "$(grep -oP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' "$F" | grep -vc '💬')" = 0
  </verify>
  <done>U7 0 · AC-3 加强式 0 命中（exit 1）· U8 白名单外为空（末条按码位族 `grep -oP` 计数，期望除 N2 锁定的那一处 `💬` 外零 emoji）· U23 0 / U23b ≥1 · U9 ≥1 · U17 ≥1 · `nav[aria-label]` 与 `:focus-visible` 在位</done>
  <depends_on>T-UI-04, T-UI-05, T-UI-06, T-UI-07</depends_on>
  <auto>tbd</auto>
</task>

<task id="T-UI-09" parallel="false" status="pending">
  <name>全量复跑（13 AC 票面 + K 系列 + U 系列）与交付记录回填</name>
  <read_files>
    .specs/product-prototype-refresh/REQUIREMENT.md         <!-- §3 十三条 AC 的票面命令原文 -->
    .specs/product-prototype-refresh/DESIGN.md              <!-- §1.5（K 系列现算）+ §7.6 复现配方 + 两版并跑纪律 -->
    .specs/product-prototype-refresh/UI-DESIGN.md           <!-- §13 全部 U 闸 + §13.0 现算配方 + §13.2/§13.3 口径修正 -->
    .specs/product-prototype-refresh/TASK.md                <!-- 本文件 §5.2 首次强制表 -->
    frontend/src/styles/tokens.css
    frontend/src/App.tsx
  </read_files>
  <write_files>
    .specs/product-prototype-refresh/product-design.html   <!-- 仅允许因闸红而做的最小修正 -->
    .specs/product-prototype-refresh/TASK.md
    STATE.md
    .specs/product-prototype-refresh/product-prototype-refresh-SUMMARY.md   <!-- 4-dev 出口自检记录（R1.2/R4.4） -->
  </write_files>
  <action>
    在**最终稿**上按 §5.2 的表逐条复跑三类闸：已投票的 13 条 AC 命令、DESIGN §1.5 现算的 K 系列、UI-DESIGN §13 的 U 系列；
    AC-7/AC-8 执行**两版并跑纪律**（票面词锚与 K7/K8 不一致即判措辞不合格，回稿子改，不动票面命令）。
    **三条口径修正先读**（交棒提示 ③）：§13.1（U2b 锚/U12 词首边界/U1 简写/U13 字节口径/U3 主用通道）、
    §13.2（🔴 的 `href` 核式改稳为 U15/U15b）、§13.3（排除式 `:root` 窗口的空洞自检 U2a）——别把已改稳的式子跑回旧形。
    样本与跑批脚本一律落**仓库外** `$TMPDIR/product-refresh-3task/`，**禁入库**（DESIGN §6 B-3；入库会被 AC-4 tier-1 与 AC-12 自判违规）。
    若需要产品 `parse_gates` 复验票面：只在**仓库外副本**里跑，跑完确认树内 `__pycache__` 为 0（2a 的 §10-E 教训：`git add -A` 会把编译产物一起吞，AC-12 曾因此红过一次）。
    期望值取各闸**自己声明的期望**，不继承 2a 样本的实测数（172/257、30 793 B 那些是样本值）。
    全绿后写交付记录：产物路径 · 逐闸结果（含命令与输出数字）· AC-12 边界复跑 · 样本落位说明 · 未过门遗留项（若有）。
  </action>
  <verify>
F=.specs/product-prototype-refresh/product-design.html; test "$(git diff --name-only b15c4554..HEAD | grep -vcE '^(\.specs/|STATE\.md)')" = 0 && test "$(git status --porcelain | wc -l)" = 0 && test "$(wc -c < "$F")" -le 200000 && test "$(find . -name '__pycache__' | wc -l)" = 0 && echo "边界/清洁/体积三项 PASS；§5.2 全表逐条复跑须零红（闸命令原文取 DESIGN §1.5 与 UI-DESIGN §13，期望值取各闸自述）"
  </verify>
  <done>§5.2 全表命中且零红 · AC-12 边界 0 · 工作树无样本泄漏 · 体积 ≤200 KB（U13 字节口径）· 交付记录已回填 → 交 5-test</done>
  <depends_on>T-UI-00, T-UI-01, T-UI-02, T-UI-03, T-UI-04, T-UI-05, T-UI-06, T-UI-07, T-UI-08</depends_on>
  <auto>tbd</auto>
</task>
```

---

## 3. AC × 任务 × 闸 覆盖矩阵（13 条 AC 无一条无人验）

| AC | 首次强制任务 | 机验闸 | 备注 |
|---|---|---|---|
| AC-1 数字基准可复现 | T-UI-00（现算）＋ T-UI-04（写入 masthead） | K1 · AC-1 两条计数 | 数字禁二次硬编码（D2） |
| AC-2 32 页 + 13 入口 | T-UI-04 | `page-block` 计数 · K5 · U10 · U15/U15b/U16 | UAT-1 逐名勾在 5-test |
| AC-3 零外部资源 | T-UI-08（U7 更严）＋ T-UI-09（票面加强式） | U7 · AC-3 加强式 | 来源 `<a href>` 必须**保留** |
| AC-4 敏感面 0 命中 | T-UI-09 逐条（全产物 tier-1 只能在收口时跑） | tier-1 · tier-2 · U11 · D7 收紧式 | 反例样本禁止入库（§6 B-3） |
| AC-5 归属无假锚点、无堆叠 | T-UI-04（锚点）＋ T-UI-05（堆叠） | K2 · K3 · K3b · AC-5a · AC-5b | 单写靠 D13，形态改文本节点后由 U20/U26 守 |
| AC-6 校准基线行 | T-UI-04 | K10 严格式 | 三处一致指同一 commit 现算 |
| AC-7 安全域边界句 | T-UI-06 | 票面词锚 + **K7** + K13 + U4 | 两版并跑不一致即不合格 |
| AC-8 加密措辞精度 | T-UI-06 | 票面段内共现 + **K8 收窄式** | 禁给传输句贴密钥限定语 |
| AC-9 口令占位符 | T-UI-04 | `grep -c "<管理员口令>"` ≥1 | `data-literal` 双写形态（§10-冲突 A） |
| AC-10 缺口逐条有去向 | T-UI-07 | RESEARCH §2 第二列 0 · K4 | 按可见子集 12（D19） |
| AC-11 六处待标注 | T-UI-06 | K6 恰 6 · 数量地板 | UAT-6 逐处勾 |
| AC-12 零 L1 写入 | 每个任务提交后复跑 · T-UI-09 收口 | `git diff --name-only b15c4554..HEAD` 边界式 | 见 §4 禁做清单 |
| AC-13 竞品融入 + 局限随稿 | T-UI-07 | `调研结论 G<n>` 唯一数 9 · K9 · K4b | 局限一节的机验面是本阶段新提，待门裁 |

**闸的分布**：K 系列（DESIGN §1.5 现算）与 U 系列（UI-DESIGN §13）**各闸的首次强制点见下表**，T-UI-09 全量复跑。按 D18，本文件不写闸范围号——集合大小由那两节现算。

**读表的两条口径**（给 4-dev 与 Task 门的 🔴 维）：

- **禁现式白名单闸在内容还不存在时会空洞绿**（探针实测：只写 `:root`＋三条字号的骨架，T-UI-05 的 U6a/U6b/U20/U26 与 K3b 全绿——因为稿里还没有一枚徽标）。这是 §5.2 把每闸钉在"**创建该内容的那个任务**首次强制"的全部理由：**跑闸的时点比闸的式子更容易出错**。U2a 那支空洞自检管的是"排除式窗口有没有闭合"这一族，管不了"内容还没写"这一族，两族要分开守。
- 期望值一律取**该闸自己的自述期望**，不继承 2a 样本实测数（`PASS 172/257`、`30 793 B` 是样本的 `T`/体积，交付稿的 `T` 与体积必然不同）。

## 4. 禁做清单（4-dev 每一步都适用的红线）

1. `frontend/**`、`backend/**`、`backup/**`、`README.md`、`CLAUDE.md`、`.gitignore` **零写入**（AC-12 与 DESIGN §6：补 `.gitignore` 自己就会被 AC-12 计数 1）。
2. 已投票工件（CHANGE / REQUIREMENT / DESIGN / BASELINE / RESEARCH / UI-DESIGN 的判据与闸命令）**零修改**；要改回上游阶段（R3.2/R2.8）。
3. 交付稿正文**禁**：真凭据形态、本机回环地址的四段点分十进制字面量、绝对路径、邮箱、`.local`/`.internal` 主机名（AC-4 两级）；描述某个被扫字面串时**不得原样嵌入它自己**（DESIGN §9.5 新增禁动）。
4. 禁把 BASELINE §4 的边界清单**整表搬进稿**、附录禁出现「攻击面/弱点总表/S1-S10 字样」（D11/K11）；内部件 `admin-file-read-jail` 与 S11 细节禁进稿（D19）。
5. 禁引入第二套工具链（构建、渲染器、Mermaid、CDN、生成脚本入库）、禁位图与 `data:` 图、禁 `<use href>`、禁 `<script>`。
6. 工具副作用纪律：任何在仓库内 import 产品 Python 模块产生的 `__pycache__`，提交前必须清除，或改在仓库外副本跑（§10-E）。
7. 一个任务一次原子提交（R4.1），提交前跑 R6.5 边界核对（`git diff --name-only` ⊆ 本任务 `write_files`）。
8. 任一 `verify` 未通过不得把 `status` 改成 `done`（R2.4）；`<auto>` 为 `tbd` 时不得开工（本阶段未过门）。

## 5. 交付前必须成立的全局事实

- 体积 ≤ 200 000 **字节**（U13 字节口径；NFR 2 MB 的 1/10）。
- 交付稿只有一处票面级"外部承诺"：C14 的打印不声明行；其余"未做/未接"都是**限定式事实**，不是 TODO。
- 稿内所有数字与名单都可在 T-UI-00 的现算输出里找到同源；改代码 → 改 BASELINE → 重跑现算，不改稿子第二处。

## 5.2 闸 → 首次强制任务（4-dev 每步只跑"首次强制 + 之前所有已强制项"，避免结构性红）

| 闸 | 首次强制 | 期望（自述口径，非样本实测值） |
|---|---|---|
| U18 / U19 / C0 三件 · K6b · U27 · **U2a** | T-UI-01 | 1 / ≥1 / `comm` 空 / 0 / `PASS C/T` 且 C 远大于 2 |
| U1 · U1b · U3 | T-UI-02 | 无输出 / 0 / 0 |
| U2b · U12 · U25 · U9b · §12 阴影·侧条·胶囊三支 | T-UI-03 | 0 / 无输出 / 无输出 / 0 / 0 |
| K6c · AC-2 计数 · K5 · U10 · U15 · U15b · U16 · U14 · U4 · U24 · AC-9 · K10 · K2 · K3 · AC-5a | T-UI-04 | 12 / ≥32 / diff 空 / 13 / 0 / 0 / 空 / 空 / 0 / ≥1 / ≥1 / ≥1 / 空 / 空 / 0 |
| U6a · U6b · U20 · U26 · AC-5b | T-UI-05 | 0 / 0 / 0 / 无输出 / `occ == lines` |
| K6 · AC-11 地板 · AC-7 两版 · AC-7b · K8 · K12 · U5a · U5b | T-UI-06 | 6 / ≥6 / ≥1 且 ≥1 / 0 / 0 / ≥1 / PASS / PASS |
| K9 · AC-13 唯一数 · K4b · K4 · AC-10 · K11 · U21 · U22 · K13 · AC-5a（图例行） | T-UI-07 | diff 空 / 9 / PASS / diff 空 / 第二列 0 / 0 / 0 / PASS / 章外差值 0 / 0 |
| U7 · AC-3 加强式 · U8 · U9 · U23 · U23b · U17 | T-UI-08 | 0 / 0 命中(exit 1) / 白名单外空 / ≥1 / 0 / ≥1 / ≥1 |
| 全量：K1 双向页集 · AC-1 · AC-4 两级 · U11 · U13 · AC-12 边界 · 样本清洁 | T-UI-09 | 双向空 / 32·168 / 0 / 0 / ≤200000 B / 0 |

## 6. 议题 2 · 逐 task 自动化策略（待票，3-task 只给证据不给票）

| 任务 | verify 可机判？ | 破坏性/权限/schema？ | 判断性质 | 3-task 建议（**不是票**） |
|---|---|---|---|---|
| T-UI-00 | 是（六行数字相等） | 无 | 纯派生，零裁量 | 🤖 |
| T-UI-01 | 是（`comm` + 三计数 + U2a） | 无 | 逐字节照抄，踩错即红、报错可定位 | 🤖 |
| T-UI-02 | 是（闭集 + 幻影名集合） | 无 | 纯机械 | 🤖 |
| T-UI-03 | 是（三支白名单 + 五支 0） | 无 | 例外集是**钉死的**，4-dev 无自由裁量区 | 🤖 |
| T-UI-04 | 是（K5/K6c/U15/U16…） | 无 | 量大但全部可机判；`F=` 路径受人 ① 影响是**赋值一行**的事 | 🤖 |
| T-UI-05 | 是（U20/U26/AC-5b/K3b） | 无 | 12 格矩阵 ✗ 格由 K3b 硬拦 | 🤖 |
| T-UI-06 | 是（K6/K7/K8/K12） | 无 | **措辞是对外事实陈述**：限定句写歪了闸抓不到（K11 只拦字样，语义靠 UAT-8）——本 change 的存在理由就是消灭失真文档 | 👤 |
| T-UI-07 | 是（K4/K9/K11/K13） | 无 | 涉**外发面敏感边界**（D11：内部件不进稿），机器只验差值，泄露与否需人眼看一遍 | 👤 |
| T-UI-08 | 是（U7/U8/U23…） | 无 | 机械收尾 | 🤖 |
| T-UI-09 | 是（全量零红 + 边界 + 体积） | 无 | 复跑与记录 | 🤖 |

> 平票默认 👤（安全优先）。`<auto>false</auto>` 的任务 4-dev 执行前暂停等人工确认（R18.2 法定硬停点①）。

## 7. 归口路由表（2a §14 十一项 + 3-task 本轮新发现两项）

| # | 事项 | 本 change 内的处置 | 归口 |
|---|---|---|---|
| ① | `tokens.css` 实为 61 个变量（DESIGN 记 51） | 交付稿按 61 口径物化，K6b 比对不受影响 | 架构设计（DESIGN §0/§0.5.1/§1.5 计数一行） |
| ② | K6b 是文本级比对（引号/空格形态计入） | 已进 T-UI-01 的 action 与 verify | 架构设计（§1.5 补半句） |
| ③ | app 有 26 个引用而零声明的幻影变量 | 交付稿零抄（U3） | 需求分析／未来 `design-token-hygiene` 议题（需代码） |
| ④ | 品牌名两处不一致（`App.tsx:275` vs `README.md:1`） | 稿取 AgentFlow | 需求分析（并入既有 `docs-drift-resync`，不新开） |
| ⑤ | 产品侧三条 a11y/反模式事实（`--text-muted` 2.77 用 186 处 · `.btn-primary` 3.29 用 19 处 · 彩色侧条 11 文件） | 交付稿全避 | 需求分析 → 未来 change（影响面已量化） |
| ⑥ | 上游三条归口（`data-slug` 可见子集 12 / K4 新式 / 计数不变式） | **已闭**，无需再催 | — |
| ⑦ | `tr '、'` 非多字节安全 → K1 左集脏项 | T-UI-00 与 T-UI-04 一律走 §10-D 稳健式 | 架构设计（DESIGN §1.5 的 K1 与 §7.6 配方同条） |
| ⑧ | `.gitignore` 缺 `__pycache__/` | **不做**（做它自己破 AC-12）→ 改为 §4 第 6 条纪律 | 未来说：单开 change 补那一行 |
| ⑨ | 打印/导出 PDF 是否承诺 | 本稿按不承诺 + 显式声明（C14/U17） | 需求分析（要不要 `@media print` 准则） |
| ⑩ | 1.4.10 Reflow 与 2.5.5 AAA 的有理由例外 | 稿内不修、写明 | 需求分析 + 资深用户体验官 |
| ⑪ | D13 锁的是"单写"不是"CSS 生成内容形态" | 交付稿三处已对齐（§8 标记列/末列/`T-UI-05`） | 架构设计（D13 补一句） |
| ⑫（新） | **DESIGN §1.5 AC-2 格仍写 `<div class="page-block">`，与 UI-DESIGN §8 C3／§9 读屏行／§13 实跑样本（`<article>`）不一致**；票面命令只数 class 字面串且 AC-2 明写"标记形态由 2a 定"→ 两形皆绿、4-dev 有两种合法形态可抄（正是 🟫 ③ 那一族） | 本阶段钉 `<article>`（T-UI-04 (iv)），不改任何判据 | 架构设计（改 §1.5 那格） |
| ⑬（新） | **C0 给的三串与其"逐字取 `index.html:2/4/6`"有 3 处字面差**（`data-theme="dark"` 未列 · charset 大小写与自闭合 · title 文本不同）；`tokens.css` 内**无** `[data-theme]` 规则（实测 grep 0 命中），主题属性由 `useTheme.ts:12`/`TopBar.tsx:35` 运行期写入 | T-UI-01 钉：`<html lang="zh-CN">`（不带 `data-theme`——零 JS 稿里声明一个无样式实现的主题态＝失真）＋ `<meta charset="UTF-8" />`（产品逐字节形态）＋ C0 的文档 title 原文；U18/U19 均不受影响 | UI 设计（回写 C0 的"逐字取"表述） |

## 8. 本阶段自检（逐项，本轮实跑口径）

- [x] **入口门禁 R2.7**：六件上游工件齐（含前端必备的 `UI-DESIGN.md`），G2a 3/4 已过（🔴 ❌ 存档在 `UI-DESIGN.md §18`）→ 未伪造"已满足"，未回炉。
- [x] **DESIGN `## 0. 技术栈选定` 已读**（§0 与 §0.5.1/§0.5.2）：所有 `verify` 都是**零依赖单文件形态**下的 `grep/awk/sed/diff/comm/test`，无 npm/pip/构建命令。
- [x] **七字段齐**：10 个任务各有 `id/name/read_files/write_files/action/verify/done`（+ `depends_on`/`auto`）。
- [x] **每个 `write_files` 都在 DESIGN §0.5.1「会新增」范围内**：交付稿本体 + `TASK.md`/`STATE.md` 状态字段 + 一份 SUMMARY；**无一项**落在「禁动清单」（`frontend/**`、`backend/**`、`backup/**`、`README.md`、已投票工件、6 个历史 change 目录）。
- [x] **每个 `verify` 可执行且已实跑**（不是只 `bash -n`）：十条一次抽出在合成探针上跑，**全部零 shell 错误**——`T-UI-00` 输出 `pages=32 nav=13 imports=32 endpoints=168 融入=9 slug=12`（绿）；`T-UI-01` 输出 `T-UI-01 PASS 补集 15/100`（绿，含 U2a 与 K6b 可执行形态：自比空、注入 `--radius-legacy` 报出该对）；`T-UI-02/03` 在只含 `:root`＋三条字号的探针上绿；`T-UI-04/06/07/08/09` 在同一探针上**如预期红**（探针没有页块/域章/融入块），`T-UI-07` 还打回了 K9 的 9 条缺失行。两处**在语法检查里逃掉的缺陷**已当轮修掉：`tr -d '[:space:]'` 会把换行一起吃掉（`pages` 从 32 变 1）、`$( … )` 少一个闭括号（引号失衡）→ 记进 §5.2 的"跑闸时点"条口径。
- [x] **至少 1 个 `[P]`**：Wave 1 的 `T-UI-00[P] , T-UI-01[P]`（唯一无共享写目标的并行对；理由见 §0.1，含被否决的片段拼装方案三条）。
- [x] **无环依赖**：00/01 → 02 → 03 → 04 → 05 → 06/07 → 08 → 09 单向；00 与 01 互不依赖。
- [x] **编号连续**：`T-UI-00 … T-UI-09`（沿用 2a §15 的 `T-UI-*` 前缀，新增项前置为 00，不重排别人给的编号——引用它的人不止一处）。
- [x] **13 条 AC 全覆盖**（§3 矩阵，无一条无人验）；**两版并跑纪律**写进 T-UI-06/T-UI-09。
- [x] **交棒三件事已带**：① tokens 整块逐字节照抄 + 收尾花括号硬约束 → T-UI-01（action + verify 的 U2a）；② §14 十一项上报归口 → §7 路由表（不进 4-dev 任务）；③ §13.1–§13.3 三处口径修正 → T-UI-09 的 action 明写"先读再跑，别跑回旧形"。
- [ ] **Task 门未跑**（本阶段唯一未闭合自检项）：4 票未集（工程效能专家／架构师／研发负责人／资深测试工程师）＋ 议题 2 的自动化三角色未投（研发负责人／资深测试工程师／安全审计师）→ `<auto>` 全部 `tbd`，**未过门前不召集 4-dev、不推进 4-wave**。
- [ ] **子循环未闭合**：依赖分析与波次调度未回帖 → §1 的波次为草案，**不据此开工**。

## 9. 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
| — | 暂无（`F=` 路径受人 ①「既有稿在别处」影响，但 DESIGN §0 已做成单行赋值，**不阻塞**本阶段与 4-dev 开工） | 人工 5 项（`product-design.html` ①/② · 3 个扩展候选 · Buzzz 官网 · AgentOS 三义）仍挂，见 `STATE.md` 阻塞表 | 2026-09-22 |

## 10. Fix 任务（来自 REVIEW / INTEGRATION）

> 此区域由 review/integration 阶段追加，编号 `T-FIX-XX`，默认 `<auto>false</auto>`（人工确认）。本阶段无。
