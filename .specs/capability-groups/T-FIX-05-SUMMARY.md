# SUMMARY: T-FIX-05 — 拆 `CapabilityGroupRow`（分组纯函数 + 折叠头 + F18 前端归一）

- **Change ID**: capability-groups
- **Task ID**: T-FIX-05（TASK.md v8 · G4 第四轮 4/4 全票后派单）
- **完成时间**: 2026-09-23 10:35
- **AI 角色**: Dev（4-dev）
- **分支 / tip**: `agent/agent/acdcda109f00`（起点 `a28e816f` = v8 工件 tip）

---

## 做了什么（一段话）

把 `AgentControlPlane.tsx:585-605` 的分组派生抽成 **纯函数模块** `components/capability/groupByCapability.ts`（`capabilitiesOf` / `groupByCapability` / `groupKeyOf` / `UNGROUPED_LABEL`，零 React / 零 store 依赖），并按 **①b（本任务的实质验收点）** 让该模块**自带那条与后端同名的具名归一规则** `capabilitiesOf`（非字符串丢弃 → `strip()` → 折叠连续空白 → 空/纯空白丢弃 → 按序去重），不是再留一份裸 `Array.isArray(cfg.capabilities)`；折叠头（组名 / 健康概要 / 箭头）拆到新 `CapabilityGroupHeader.tsx`，操作面（排队 badge / 自动路由 / 弹性缩放）留在页面文件内新起的 `GroupOpsBar`，其自动路由开关与排队计数改由 `stores/domains.ts` 的**选择器**就地取，不再逐层透传。`CapabilityGroupRow` props **14 → 5**，页面文件 **1428 → 1372 行**。

**按 TDD 走了 RED→GREEN，且 RED 是"搬家版"的 RED**（下面 verify 段有原文）：先只做**字面搬家**（原谓词原样搬进新文件），跑测试 → `7 failed | 6 passed`，失败的恰好是 7 条归一断言（`capabilities:[""]` 产出空名分组、`" code-review "` 与 `"code-review"` 分成两组、非字符串项未丢弃…），通过的 6 条是搬家语义锁 + 折叠头渲染。这条序列证明该判据**能区分「抽了函数」与「抽对了函数」** —— 若只写「搬家后也绿」的用例，就是 F18 想拦的那种假绿。

**两处主动加的、action 未点名的东西（都写进「决策与偏离」）**：① 新文件按 `CLAUDE.md`「样式复用 tokens.css」直接取 `var(--s2)/var(--s3)/var(--r-md)`（8/12/8px 等值，视觉不变），目的是不把 F6 的硬编码搬进一个 T-FIX-08 无写权限的新靶文件（元规则 1）；② 加 `groupKeyOf(domainKey, capability)` —— 拆组件后 `域key:能力名` 这个 key 格式会在两处各拼一次，成了我自己引入的 R3 知识重复。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `frontend/src/components/capability/groupByCapability.ts` | 新增（59+8 行） | 纯函数：`capabilitiesOf`（具名归一规则）/ `groupByCapability` / `groupKeyOf` / `UNGROUPED_LABEL` |
| `frontend/src/components/capability/CapabilityGroupHeader.tsx` | 新增（62 行） | 折叠头 = 分组展示（名 / `N healthy / M total` / 箭头）+ `actions` 插槽；**不含**任何操作态 |
| `frontend/src/pages/AgentControlPlane.tsx` | 修改 | 分组改调纯函数；`CapabilityGroupRow` 14→5 props；新增模块内私有 `GroupOpsBar` + `GroupOps`；`DomainAccordionRow` 与两个调用点删 7 个透传 prop |
| `frontend/src/__tests__/capability-group.test.tsx` | 新增（139 行 / 14 用例） | 3 组：搬家语义锁（3）· F18 归一（7）· 折叠头 RTL（3）· 组键格式（1） |
| `.specs/capability-groups/{TASK.md,STATE.md}` | 工件 | 勾选 + 状态行（kit 步骤 6/7 强制，不计入代码 diff 边界） |

## verify 输出（必填 · 真实跑过）

### 未修态取值（元规则 2：先在不修代码上跑一遍记取值）

| 判据 | 类型 | 未修态实跑 | 修后要求 | 终态实跑 |
|---|---|---|---|---|
| ① `test ! -e tsconfig.tsbuildinfo && tsc --noEmit \| grep -c "error TS"` | 【护栏】 | **32**（`tsconfig.tsbuildinfo` 实测不存在，守卫成立） | =32（不是 ≥32） | **32** ✅ |
| ② `npx vitest run capability` | 【验收】 | **`No test files found, exiting with code 1`** → 用例数 0 | 通过且用例数 ≥1（元规则 3） | **`Tests 14 passed (14)`** ✅ |
| ③ `wc -l < src/pages/AgentControlPlane.tsx` | 【验收】 | **1428** | < 1428 | **1372** ✅ |
| ④ `test -f …/groupByCapability.ts && grep -c "routeLoading\|scaleLoading\|queueCount" …/CapabilityGroupHeader.tsx` | 【验收】 | `test -f` 先失败（文件不存在，exit 1）→ 判据不可执行 | 打印值 0 | **0** ✅ |
| ⑤ v6 追加：`groupByCapability` 对 `capabilities:[""]` / `" code-review "` 的行为 | 【验收】 | 今天 `:588-592` 不过滤 → **产出空名分组 / 同名两组**（由 RED 运行一手取到，见下） | 无空名分组、落 `未分类`、同组 | 14 条全绿 ✅ |
| 基线表复核 | — | `#fff`=6、`var(--s*/--r-*)`=0、`aria-expanded`=0、`grep -A1 "<div$" \| grep -c onClick`=**6**、`CapabilityGroupRow` 区间硬编码 px/br=**6**、区间卡片样式=**7** | — | 见「下游判据影响」 |

### GREEN 前：搬家版 RED（一手输出，证明判据不软）

```text
$ npx vitest run capability          # 此时 groupByCapability.ts 只是把 :588-592 原样搬进来
 ❯ src/__tests__/capability-group.test.tsx (13 tests | 7 failed)
   × capabilitiesOf · F18 具名归一规则（今天必红：搬家版不做归一） > 空串能力不得自成一组，须落 未分类
     AssertionError: expected [ '' ] to not include ''
   × … > 纯空白能力等同无能力
     AssertionError: expected [ '   ', '\t' ] to deeply equal [ '未分类' ]
   × … > 前后空格归一后与规范值同组
     AssertionError: expected [ 'code-review', ' code-review ' ] to deeply equal [ 'code-review' ]
   × … > 归一后同一 Agent 内的重复项去重（F17：不得拆成两组）
   × … > 折叠连续空白，但不折叠大小写（与后端 capabilities_of 契约一致）
     AssertionError: expected [ '  a\t\tb  ' ] to deeply equal [ 'a b' ]
   × … > 非字符串项 / 非数组 / 缺字段一律丢弃，不抛异常
     AssertionError: expected [ 'ok', 7, null, undefined, {}, '' ] to deeply equal [ 'ok' ]
   × … > 归一后只剩空值的 Agent 落 未分类
 Test Files  1 failed (1)
      Tests  7 failed | 6 passed (13)
```

### 终态：四条 verify + 全量回归

```text
$ npx vitest run capability   # ②（元规则 3：用例数写死，不接受 0 用例的"通过"）
 ✓ src/__tests__/capability-group.test.tsx (14 tests) 163ms
 Test Files  1 passed (1)
      Tests  14 passed (14)

$ test ! -e tsconfig.tsbuildinfo && ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # ①【护栏】
32

$ wc -l < src/pages/AgentControlPlane.tsx   # ③
1372

$ test -f src/components/capability/groupByCapability.ts && grep -c "routeLoading\|scaleLoading\|queueCount" src/components/capability/CapabilityGroupHeader.tsx   # ④
0
(打印值 0 = 判据成立；grep 无命中时以 1 退出，判据读的是数字)

$ npx vitest run   # 全量回归（非本任务契约，只证明没弄坏既有前端用例）
 Test Files  6 passed (6)
      Tests  66 passed (66)      # 既有 52 + 本次 14

$ sed -n '/^function CapabilityGroupRow({/,/^}) {/p' src/pages/AgentControlPlane.tsx | grep -cE "^  [a-zA-Z]+,$"   # action ②「props ≤6」
5
```

> **不跑全量 `pytest tests/ -q` 的理由**（TASK.md ⑥ + 架构师 ⑤）：全量基线本就 **41 failed / 134 passed / 6 skipped**，且本任务是**纯前端**改动、未触碰任何 `backend/` 文件 → 后端定向基线归 `T-FIX-00`（它的 41/134/6 必须出现在 TEST.md 第 1 轮第一行）。

## 跨任务失败检查（R1.8 · LESSONS）

`.specs/LESSONS.md` **实测不存在**（`ls .specs/LESSONS.md` → No such file）。创建它落在本任务 `write_files` 之外，按 R6.5/R7.1 我不自行新建，改以 **TASK.md v8 元规则 1-4 + 未修态基线表 + v3~v8 变更记录**作为本任务的失败库输入，逐条声明：

- **元规则 1（靶文件/action 落点边界）** — 已查阅。本次差异：**verify 与 action 点名的每个落点都在 `write_files` 内**（4 个），我另外避开了两处会踩这条的写法 —— 新折叠头不引入 `aria-expanded` 字样（否则 T-FIX-06 的判据会被我的一句注释钉成假绿），新文件不留硬编码 px（否则 T-FIX-08 对它无写权限）。代价反向转移到 T-FIX-06/08/09，已量化列在「下游判据影响」并交回主审。
- **元规则 2（【验收】/【护栏】+ 未修态取值）** — 已查阅。上表「未修态实跑」列全部**本会话实跑**取得，无一条转抄。
- **元规则 3（`vitest run <pattern>` 静默 0 用例）** — 已查阅并**正面命中**：未修态 `npx vitest run capability` 的输出就是 `No test files found, exiting with code 1`。本次差异：判据不吃退出码，改断言 **`Tests 14 passed (14)`** 的**用例数**。
- **元规则 4（共同靶文件串行）** — 已查阅。本波**只动 `AgentControlPlane.tsx` 一条**（未顺手带 03/06/07/08/09），且**不重排行号无关的锚点**；行号漂移作为交接物显式回报（见下）。
- **v4 那次 `T-FIX-03` 破坏性任务（把正确代码改坏 + verify 被改坏所满足）** — 已查阅。本次差异：我的 RED→GREEN 序列里，**判据先于实现存在且先失败**，且实现完成后才转绿 —— 不是"改完再补一条会过的断言"。
- **v3 那次「被 `head -N` 截断的 grep 当穷尽证据」** — 已查阅。本次每条 grep **回显计数或完整行号**，无 `-n | head` 用法。
- **v7 那次「verify 作用域把测试目录算进去 → 假红」** — 已查阅。本次判据④只打新组件文件；我的测试文件里不出现 `routeLoading|scaleLoading|queueCount` 之外的敏感串的镜像（`queueCounts` 只出现在页面文件，属 GroupOpsBar 的 store 读取）。

## 6 维自查（步骤 4 · 生产代码改动必填）

```markdown
### 🟢 R1 认知过载：CapabilityGroupRow 171 行 / 14 props → 95 行 / 5 props
**Symptom**：原组件同时管分组展示、路由、扩容、排队、loading、Agent 表格。
**Source**：实测 `sed -n '/^function CapabilityGroupRow({/,/^}/p' | wc -l` 与 props 计数 5。
**Consequence**：（已消除）改展示要连带读懂限流/排队。
**Remedy**：折叠头出组件、操作面出 `GroupOpsBar`、派生出纯函数。展开态的 Agent 表格**仍留在页面组件内**
—— 它是 F7「三层树去卡片化」（T-FIX-09）与 F11 之外的第三段，再拆会让 T-FIX-09 的 awk 判据失去落点。

### 🟢 R2 变更传播：0 越界
**Symptom/Consequence/Remedy**：`git diff --name-only` = 1 个修改 + 3 个新增，全部 ⊆ `write_files`；
vitest 运行时改写了**被 git 跟踪的** `frontend/node_modules/.vite/vitest/results.json`（CLAUDE.md 已登记该缺陷），
已 `git checkout --` 还原、不入 diff。

### 🟡 R3 知识重复：本次消灭 1 处、新暴露 1 处、越界 1 处
**Symptom**：(a) 前端第 3 套 capability 谓词（`:588-592`）被 `capabilitiesOf` 取代 ✅；
(b) 拆组件后 `域key:能力名` 这个 key 格式会在 `GroupOpsBar` 与 `DomainAccordionRow` 各拼一次；
(c) `frontend/src/pages/AgentBuilder.tsx:48` 有 `(a.model_config_json && a.model_config_json.capabilities) || []` ——
**与 F18 同形的第 4 套真相**，不在本任务 `read_files/write_files` 内。
**Source**：`grep -rn "capabilities" frontend/src/`（全量，未截断）。
**Consequence**：(b) 两处漂移会让排队数静默失配；(c) F18 的「单一真相」在 AgentBuilder 面上仍不平。
**Remedy**：(b) 就地收进 `groupKeyOf()` 并加断言；(c) **不顺手改**（R7.1），登记给主审 —— 见「是否触发新工作」。

### 🟢 R4 偶然复杂：无新增抽象层
纯函数模块只导出被用到的 4 个符号；`GroupOps` 是 action 明说的「props 打包成一个 ops 对象」，不是预留扩展点。
`CapabilityGroupHeader` 的 `actions` 插槽是唯一新接口 —— 它替代了「把 loading/排队再透传三层」。

### 🟢 R5 依赖混乱：方向正确
`pages/ → components/capability/`（单向、向下）；`groupByCapability.ts` **不 import 任何东西**（纯函数、可 unit）；
`CapabilityGroupHeader.tsx` 只 import `lucide-react` + 一个 type；store 读取只发生在页面组件（`useDomains` 选择器）。
未新建 `services/` 层文件（T-FIX-13 v3 收缩的那条教训：不由实现者预写架构）。

### 🟡 R6 领域扭曲：两个「健康」词表未合流（有意为之）
**Symptom**：折叠头的 `healthyCount` 用**生命周期**谓词 `isAgentHealthy`（`:368`，`running|standby`），
与同文件探针词表 `status === 'healthy'`（`:36/:158/:159/:1081`）并存。
**Source**：F10 (b)(c) + DESIGN.md:97-104。
**Consequence**：若本次把它顺手改名/替换，就重演 v3 那个「把唯一正确处改成恒假」的事故。
**Remedy**：**一个字都没动** `isAgentHealthy` 的判定语义，只是把它留在页面层、把计数结果传给折叠头
（`healthyCount`/`totalCount` 两个 number prop）。具名化（`isProbeHealthy` vs `isAgentHealthy`）是 T-FIX-03 的活。
```

### 已知接受 + 理由（🟡）

- **R6 领域扭曲**：两个词表仍共用「健康」一词 —— 本次**故意不碰**（F10 判定语义不得变 + T-FIX-03 有自己的一套具名方案与 `agentHealth.ts` 落点）。落点：`T-FIX-03 (c)`。
- **R3 (c) `AgentBuilder.tsx:48` 第 4 套真相**：越界，不改；已登记交回主审决定是否并入 T-FIX-01/02 的前端面。

### 已知小问题（🟢）

- `DomainTreeTab` 里 `toggleAutoRoute` 仍是从 store 解构后**零调用**（**改动前既如此**，非本次引入；删它属顺手改）。
- 折叠头仍是 `<div onClick>`（T-FIX-06 的活，我没代做）。
- `groupByCapability` 返回 `Record`，排序仍留在调用点 `Object.keys(...).sort()`（T-FIX-10 的活，`未分类` 恒末位未做）。

## 数据库迁移（R4.5 / 1.7）

N/A —— 纯前端组件/纯函数重构，无 ORM model、无 DDL、无 schema 语义变更。

## 破坏性变更（R4.6 / 1.8）

**判定：未命中（按 1.8.6 豁免），未走反问。** 命中检查逐条：

- [ ] 删除既有代码 ≥5 行 → **删除的都是搬家**：149 行删除里 ~92 行等价搬进新模块（折叠头 71 / 分组派生 21），其余是被拆散的 prop 透传行；净变化 **1428 → 1372**。无一行行为被丢弃（RED 先证明"没归一时会怎样"，GREEN 后既有 52 条前端用例全绿）。
- [ ] 改公共导出 → **无**：`CapabilityGroupRow` / `DomainAccordionRow` 都是模块级私有函数（全仓 grep 只有定义 + 页面内调用），新模块的导出是**新增**，无签名变更、无重命名、无删文件。
- [ ] 改公共 API（HTTP/GraphQL） → **无**，未碰 `backend/`。
- [ ] 删除文件 / 重命名导出符号 → **无**。

### 引用图（1.8.1 · 全量 grep，未截断）

```text
$ grep -rn "CapabilityGroupRow|DomainAccordionRow" frontend/src/ --include=*.ts --include=*.tsx
  src/pages/AgentControlPlane.tsx:370(定义) :679(唯一调用)   ← DomainAccordionRow:546(定义) :861/:890(两处调用)
  → 无任何跨文件引用；间接影响面 = 0（不被其它页面/测试/hook import）
$ grep -rn "capabilities" frontend/src/（R6.4 沿用既有抽象检查）
  src/pages/AgentControlPlane.tsx:590-591(被本次取代的内联谓词)
  src/pages/AgentBuilder.tsx:48(同形谓词，本任务范围外 → 登记)
  → 前端不存在可沿用的 capability 归一 helper/utils（`src/lib/` 亦无）→ 新建 groupByCapability.ts（TASK.md v8 明写的落点）
$ grep -rn "aria-expanded" frontend/src/  → 0（改动前后都是 0，T-FIX-06 的【验收】判据未被本次抢先满足）
$ grep -rn "getHealthLabel|isAgentHealthy|a\.health" src/pages/AgentControlPlane.tsx
  → 判定语义 0 变更（F10 (b) 要求），只发生行号位移
```

**间接影响（诚实列出）**：① `expandedGroups` / `queueCounts` 的 key 由「未归一能力名」变成「归一后能力名」→ 同一 Agent 的 `" code-review "` 从此与 `"code-review"` 共用折叠态与排队数。这正是 F18 要的效果，但它是**可观察行为变化**，不是纯搬家。② `groupByCapability` 归一后组数可能减少（历史上带空格/空串的数据自成一组 → 现在并入规范组或 `未分类`）。

## 越界检查（R6.5 / 步骤 5）

```text
✅ 越界检查（R6.5）：
  - TASK write_files：4 项（groupByCapability.ts 新建 / CapabilityGroupHeader.tsx 新建 / AgentControlPlane.tsx / __tests__/capability-group.test.tsx）
  - 实际代码 diff 涉及：4 项（同一批）
  - 越界：0
  - 工件写入（不计入代码边界，由 kit 步骤 6/7 与本 issue 出口规定）：
      .specs/capability-groups/T-FIX-05-SUMMARY.md（本文件 · 新建）
      .specs/capability-groups/TASK.md（仅 T-FIX-05 的「状态」勾选）
      STATE.md（状态行三字段）
  - 已撤销的越界文件：frontend/node_modules/.vite/vitest/results.json（跑 vitest 的副作用，node_modules 被跟踪所致）→ git checkout -- 还原，未提交
  - 未动：REQUIREMENT.md / DESIGN.md（R3.2）/ stores/domains.ts（只在 read_files）/ backend/**（一行未动）
```

## 决策与偏离

1. **`capabilitiesOf` 与后端同名，而不是自起名**：TS 与 Python 不可能共享一份运行时实现，所以「同一条具名归一规则」的**可执行含义**只能是「两端各一处定义 + 语义逐条对齐 + 名字可 grep 对齐」。语义清单写死在文件头注释：非字符串丢弃 → `strip()` → 折叠连续空白 → 空/纯空白丢弃 → 按序去重；**大小写不折叠**（后端 `casefold()` 待产品拍，前端不先漂）。T-FIX-02 落地时应以 `capabilities_of` 命名并让 `TASK.md`/`REVIEW.md` 交叉引用本文件。
2. **入参用最小结构类型 `CapabilityCarrier { model_config_json?: unknown }` 而非 `Agent`**：`stores/agents.ts` **不在本任务 `read_files` 内**（元规则 1 反过来管我读什么）。纯函数因此与 store 解耦、可直接喂 fixture；`groupByCapability<T extends CapabilityCarrier>(agents: T[]): Record<string, T[]>` 在调用点仍按 `Agent[]` 推断（`tsc` 计数 32 未变即为证明）。
3. **新折叠头直接用 token**（`var(--s2)/var(--s3)/var(--r-md)` 对应 8px/12px/8px，视觉零变化）：避免 F6 的硬编码被搬进 T-FIX-08 无写权限的新靶文件（元规则 1 的 action 面）。**这不是提前做 T-FIX-08**：它页面的 6 处 px 我一处没碰（仍 6→待 0），新文件硬编码判据实测 **0**。
4. **`groupKeyOf` 是 action 未点名的小 additions**：拆组件会让 key 格式在两处各拼一次（R3），收进同一模块是本次改动的直接后果，不是新功能。
5. **选择器是本仓第一处**（R6.4 grep 证据：`grep -rnE "use[A-Z][A-Za-z]*\\((\\(|[a-z]+ ?=>)" src/` 命中全为 `useEffect/useMemo`，无 zustand 选择器；既有风格是整 store 解构 + 两处 `.getState()`）。仍选它而非 `.getState()` 的理由：`.getState()` 读到的排队数不会随 store 更新重渲染，会把 badge 变成"只在挂载时取一次"的死值 —— 那才是行为退化。`zustand ^4.5`（package.json:29）原生支持选择器；不新增依赖、不改 store 契约（`stores/domains.ts` 一行未动）。
6. **`ops` 对象 + store 选择器两条 Remedy 并用**：`routeLoading/scaleLoading/onRoute/onScale` 住在 `DomainTreeTab` 的 `useState`，而 `stores/domains.ts` **不在 `write_files`**（不能把 loading 搬进 store）→ F11 Remedy 的「打包成一个 ops 对象」与「下沉到 store 选择器」各用一半。
7. **删掉两个已死的透传 prop（`groupKey`、`domainId`）**：二者在原 `CapabilityGroupRow` body 内**零读取**（grep 证明），`handleRoute/handleScale` 用的是恒为 `null` 的 `activeDomainId`。顺带发现：**自动路由/扩容/排队在当前代码里是死路径** —— `toggleAutoRoute` 全文件零调用 → `autoRoute[key]` 恒 false → 两个按钮永不渲染；`fetchQueueCounts` 只在 `activeDomainId !== null` 时被调 → `queueCounts` 恒空 → 排队 badge 永不渲染；`handleScale` 首行 `if (activeDomainId === null) return` → 扩容点了必无事发生。**行为原样保留**（本次未改任何条件），但该事实与 F15「路由/扩容缺需求溯源」直接相关，交主审。

## 下游判据影响（元规则 4 的交接物 · 行号已漂移，按新值重定位）

`AgentControlPlane.tsx` 1428 → **1372**（我 import +2 行、组件段 -58 行），**`:370` 以上的锚点也整体 +2**。实测新值：

| 下游任务 | v8 里写的锚点/判据 | T-FIX-05 后实测 | 后果 |
|---|---|---|---|
| T-FIX-03 判据⑤ | `sed -n '74,75p' \| grep -c "a\.health"` = 2 → 0 | `a.health` 现在在 **`:76-77`**；`sed -n '74,75p'` 打到 `function OverviewCards…` → **打印 0** | ⚠️ **假绿**：区间不改就"已满足"，幽灵字段还活着。建议改判据为 `grep -c "a\.health" $P`（2→0）或 `sed -n '76,77p'` |
| T-FIX-03 (b) | `:34` getHealthLabel / `:156/:157/:1137` 探针判定 | **`:36` / `:158` / `:159` / `:1081`**（5 处 `=== 'healthy'`、4 处 `status === 'healthy'`，计数与 v8 一致） | 仅行号位移，判定语义未变 |
| T-FIX-03 (a) | 幽灵 `runtime` 渲染 `:531/:1076/:1129` | **`:527` / `:1020` / `:1073`** | 行号位移 |
| T-FIX-03 (d) | `getStatusConfig:112` + `STATUS_CONFIG:22-27` + `STATUS_PRIORITY:197` | **`:31` / `:24-29` / `:17` / 使用点 `:199-200`** | 行号位移 |
| T-FIX-03/a11y 卡片 | v8 订正为「异常」在 `:81`（`:79-82` 四张卡） | 「异常」现在 **`:83`**，四张卡 `:81-84` | ⚠️ v8 刚订过的行号又漂 +2；建议改用标签文本定位 |
| T-FIX-06 判据① | `grep -c "aria-expanded" AgentControlPlane.tsx` 0→≥1 | 页面 **仍 0**、新折叠头 **仍 0**（我在注释里避开了这个字面串） | 无假绿；但**它的 action 目标（能力组折叠头 `<div onClick>`）现在住在 `CapabilityGroupHeader.tsx:33-35`，而该文件不在 T-FIX-06 的 `write_files`** → 元规则 1 复现，须补落点 |
| T-FIX-06 辅判 | `grep -A1 "<div$" \| grep -c onClick` 6 → 0 | 页面 **5**（`:584` 域折叠头、`:861/:869` 新建域 modal、`:920/:928` 删除确认 modal）+ 新头文件 **1** = 总数仍 6 | ①该判据要归零得改 6 处，而 action 只点名能力组头 → 一条【验收】按 action 做完仍假红，建议拆成「能力组头所在文件归零」+「页面其余另计」；②作用域须覆盖新文件 |
| T-FIX-07 | `#fff` 6 → 0（`:457,:473` 本 change 面） | 页面仍 **6**；`路由/扩容` 两处现在在 **`:410`/`:426`**（`GroupOpsBar` 内，**仍在页面文件**） | 无落点丢失（我特意没把带 `#fff` 的按钮搬出新文件）；行号位移 |
| T-FIX-08 判据① | `awk '/function CapabilityGroupRow/,/^}$/'` 内硬编码 px/br 6 → 0 | 页面区间现在 = **2**（展开态表格的 `borderRadius: 3` / `'50%'`，本就属 T-FIX-08/09 的活）；**新头文件 = 0** | ①awk 区间不再覆盖被搬走的 4 处（那 4 处已按 token 落地，无需 T-FIX-08）②若按 v8 括注把判据改跑「新文件全文」，新文件已是 0 → 会变成**真值但零门槛**，页面区间仍须 2→0，别让它被新文件的 0 顶掉 |
| T-FIX-08 判据② | 页面 `var(--s*/--r-*)` > 0（今天 0） | 页面仍 **0**（我只在新文件用了 token，页面一处没加） | 不受影响 |
| T-FIX-09 | 同 awk 区间卡片样式 7 → 0 | 页面区间现在 = **3**；**新头文件 = 1**（健康概要 pill 的 `borderRadius`，不是卡片边框） | 判据本质是数 `borderRadius`；若重定向到新文件，会把"徽章有圆角"误判成"卡片没拆" → 建议新文件的 pill 显式排除 |
| T-FIX-10 | 组顺序两处 `domain_api.py:119` × `AgentControlPlane.tsx:666` | 前端排序点现在 **`:639`**（`Object.keys(capabilityGroups).sort()`，我原样留在页面） | 行号位移；⚠️ 归一后组名变化会影响该断言的种子数据（`" code-review "` 不再自成组） |

## 是否触发新工作

- [x] **需主审落笔的工件修订（我不改 TASK.md 的 write_files，R7.1）**：`T-FIX-06` 的 `write_files` 补 `frontend/src/components/capability/CapabilityGroupHeader.tsx` 并把两条判据作用域覆盖到它；`T-FIX-08①/09` 明确"新折叠头文件"是排除还是纳入；`T-FIX-03 判据⑤` 的 `sed -n '74,75p'` 区间改址（**假绿，优先**）。
- [x] **新发现（不属本 change 面）**：`AgentBuilder.tsx:48` 是 capability 的**第 4 套真相**（同形不过滤）→ 建议并入 T-FIX-01/02 的前端面或记入 `REVIEW.md` F18 的完整清单（F18 现列「后端 7 + 前端 1」）。
- [x] **既有死路径（与 F15 同源）**：自动路由/扩容/排队三件套因 `toggleAutoRoute` 零调用 + `activeDomainId` 恒 `null` 而永不渲染/永不生效 —— 本次行为原样保留，登记不修。
- [ ] 触发 CONTEXT.md 更新：否（`.specs/CONTEXT.md` 不在本任务 `write_files`；术语缺口已由 T-FIX-12 ⑤ 登记）。
- [ ] 发现需求/设计问题需暂停交人工：否 —— F10/F18 相关红线我都未越（DESIGN/REQUIREMENT 未动）。

## 完成判定

- TASK.md 中 `T-FIX-05` 已勾选：**是**（`状态: [x] T-FIX-05 完成于 2026-09-23 10:35 · SUMMARY: T-FIX-05-SUMMARY.md`）
- 四条 verify 全过（①32 / ②14 用例全绿 / ③1372 / ④0）+ 全量前端 66 passed：**是**
- 提交 hash：**`0f10be77`**（代码 + 测试，原子提交 R4.1）· 工件（本 SUMMARY / TASK 勾选 / STATE 状态行）随后一条 `docs(capability-groups)` 提交
- **G3 代码门说明**：本轮是 6-review 之后回灌的**单条 T-FIX**，G4 已 4/4；按 AGENTS.md 出口条款，本 task 完成即派 5-test，**不重复召集 G3 四票**（G3 针对本 change 的 4-dev 全量 task 集，其票已在上一个 4-dev 周期收过；且元规则 4 要求本文件单写者）。若主审认为单条 T-FIX 也要过 G3，请明说，我再召集。
