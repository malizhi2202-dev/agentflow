# SUMMARY: T-FIX-16 — F10 剩余面收口（`AgentProbePanel` 的词表与幽灵字段）

- **Change ID**: capability-groups
- **Task ID**: T-FIX-16
- **完成时间**: 2026-09-28 09:3x
- **AI 角色**: Dev（4-dev）
- **起点 tip**: `da1bf959`（评审分支 `agent/agent/87518bcb82fb` 的 **v16 卡面修订** —— 起点含 5-test 的 `b1cdb0f6` 与 4-dev 上一轮的 `a4247738`，线性可 FF、零代码改动）
- **本任务分支**: `agent/agent/42a133ecdd60`（从 `da1bf959` 线性续做，**未并 `main`** · R15.2）
- **上游**: `T-FIX-03`（只收口了 `AgentControlPlane.tsx` 面）· 5-test `TEST.md` §1.11 第 1 条（O-19）· 主审 v15/v16

---

## 入口门禁与 R1.8 声明

| 项 | 状态 |
|---|---|
| 正式 `TASK.md` 中的当前 task | ✅ `T-FIX-16`，**v16 已修订**（write_files 补齐 + verify ⑦ 新增），R2.9 ① 满足 |
| `<auto>` 门禁 | ✅ 卡面写明「**可执行，不卡人审**」（与 `T-FIX-17` 的分界写在卡面第二段） |
| 顺序 | ✅ 排在 `T-FIX-17` 之前（同文件单写者，元规则 4）；`T-FIX-06/07/08/09` 卡 `待人工裁定 #1`，不抢文件 |
| `.specs/LESSONS.md` | ❌ 仍不存在；创建落在 write_files 之外 ⇒ **不自行新建**（同 `T-FIX-03/05` 口径），改以本 change 的等价失败库为输入 |

**R1.8 逐条声明（本卡命中的失败库条目）**

- **元规则 1（action 落点必须进 `write_files`）** — 已查阅，**本卡就是它第 7 次同形的修复对象**（上一轮我按 R7.1 停下、零写入；主审 v16 已把 `lib/agentHealth.ts` + `pages/AgentControlPlane.tsx` 补进写权）。本次差异：**卡面 action (a)~(e) 点名的 7 个落点全部在 `write_files` 内**，⑧ 实测 diff 与之逐项相等（见「越界检查」）。
- **v16 新增沉淀（「消费单一来源」= 搬迁 + 开导出两件事）** — 已查阅并**正面执行**：本卡 (b) 的「消费」我按「搬迁 + `export` + 两处 import」办，且 verify ⑦ 两条合起来钉「真的搬了」。
- **元规则 2（判据类型三分：【验收】/【护栏】/【回归信号】）** — 已查阅。**本 SUMMARY 对自带判据的标注见「决策与偏离 ③」**：我自己新写进测试文件的 2 条 runtime 断言在未修态即真 ⇒ 我标它们为【护栏】，不当验收依据。
- **元规则 3（`vitest run <pattern>` 必须吃用例数）** — 已查阅：文件名与卡面命令逐字对应，判据吃 `9 passed (9)`。
- **元规则 4b（认内容锚不认行号）** — 已查阅：本卡 (e) 的处置对象就是 `T-FIX-03-SUMMARY` 里的起点树行号；我在 `AgentProbePanel.tsx` 的注释与 SUMMARY 里一律用**内容锚 / 符号锚**。
- **F27 / 元规则 2 第三类（写法判据可被绕过）** — 已查阅，并**又拿到一个实证**：本卡 ④ 的两条 `grep` 计数被**我自己注释里的散文**打败过（见「已知小问题 1」）。
- **v4 那次 `T-FIX-03` 破坏性任务（把正确代码改坏 + verify 被改坏所满足）** — 已查阅。本次差异：**判据先于实现存在、先失败**（RED 节），且 ① 的四个期望值是**词表规范词**，靠改坏代码无法同时满足四格。

---

## 做了什么（一段话）

按卡面 (a)~(e) 五件事全部落地：

1. **(a) `health` 幽灵读 5 处全摘**：`:64`「异常」计数、`:168`/`:478` 时间线健康点、`:169` 时间线错误点、`:318` 健康度徽标 —— 一律改读真正带探针判定的 `AgentStatus.status`，且**消费具名谓词**（`isProbeHealthy` / `isProbeUnhealthy` / 新增的 `isProbeErrored`）而不是再写内联比较。
2. **(b) 第 3 张词表消灭（按主审裁定 (甲) 搬迁）**：`PROBE_STATUS` + `getHealthLabel`（并连 `getStatusConfig` 一起）从 `pages/AgentControlPlane.tsx` 搬进 `lib/agentHealth.ts` 并 `export`，页面改为 import；`AgentProbePanel` 的 `HealthBadge` 改吃**同一份** `getStatusConfig` ⇒ `AgentControlPlane` 的「运行状态」列与 `AgentProbePanel` 的「健康度」列从此同一来源。**页面不再定义这两个符号**（⑦ 钉住）。
3. **(c) `runtime` 补键**：`control_plane_api.py` 的 `list_probes` 在构造 entry 时补发 `"runtime": agent.runtime if agent else ""`（与既有 `model_name` 同源同形状，纯加法）⇒ 4 处幽灵渲染从此有值。
4. **(d) `stores/controlPlane.ts` 的契约注释与树对齐**：`health` 那句从「本字段已无任何消费点」改为**落地后为真**的表述（并写清 2 + 5 两批是谁收口的）；`runtime` 那句从「`DetailPanel` / `CapabilityGroupRow` **三处**」订正为 **`DetailPanel` 两处**、删去非幽灵的 `CapabilityGroupRow`，并写明 (c) 已补键。
5. **(e) `T-FIX-03-SUMMARY.md` 卫生**：把「已知未收口 2」的起点树行号 `:527/:1020/:1073` 全部换成**内容锚 / 符号锚**，幽灵数 **5 → 4**（并写明 `:546`/`CapabilityGroupRow` 那处**不是**幽灵、依据是 `models/agent.py` 的 `to_dict()` 确实发 `runtime`），另补两条 ∎ 处置记录（第 1、2 条的落地去向）。
6. **新增测试文件** `frontend/src/__tests__/agent-probe-panel-vocabulary.test.tsx`（9 条用例）：4 条钉「健康度」列文案 = 词表规范词、3 条钉「异常」计数按真实 `status` 判定、2 条钉「运行时」列读的是 DTO 的真实键。

**偏离原计划的地方**：无。**卡面没点名、我自己加的**三处小项（`isProbeErrored` 谓词、`getHealthLabel` 补 `unknown → 未知`、`getStatusConfig` 一并搬迁）逐条声明在「决策与偏离 ①」。

## 改动文件（7 = `write_files` 逐项）

| 文件 | 性质 | 说明 |
|---|---|---|
| `frontend/src/components/AgentProbePanel.tsx` | 修改 | (a) 5 处幽灵读 + `HealthBadge` 改吃唯一来源（+37/−17） |
| `frontend/src/__tests__/agent-probe-panel-vocabulary.test.tsx` | **新增** | 9 条用例（137 行） |
| `backend/routes/control_plane_api.py` | 修改 | (c) 补发 `runtime` 键（+4/−0，含 3 行注释） |
| `frontend/src/stores/controlPlane.ts` | 修改 | (d) 只动注释（+16/−11，**零类型变更**） |
| `.specs/capability-groups/T-FIX-03-SUMMARY.md` | 修改 | (e) 内容锚订正 + 两条处置记录（+18/−5） |
| `frontend/src/lib/agentHealth.ts` | 修改 | (b) 落点①：搬入 `PROBE_STATUS` / `getHealthLabel` / `getStatusConfig` 并 export（+64/−4） |
| `frontend/src/pages/AgentControlPlane.tsx` | 修改 | (b) 落点②：删原件、改 import（+7/−36） |

### 工件写入（方法要求，非代码面 · 与既往单列同口径）

`.specs/capability-groups/T-FIX-16-SUMMARY.md`（本文件）· `TASK.md` 只改 `T-FIX-16` 那一行 `状态:` · `STATE.md` 四行前置。

## 未修态基线（本会话在 `da1bf959` 上**一手实跑**）

| 判据 | 未修态 | 终态 |
|---|---|---|
| ① 「健康度」列（4 格） | healthy / degraded / unhealthy **全渲染「未知」**；unknown 格恰为「未知」 | **健康 / 降级 / 异常 / 未知** ✅ |
| ② 「异常」计数 | `unhealthy` 时为 **0**（`p.health === 'error'` 死支 + `status === 'error'` 为假） | healthy → **0**，unhealthy → **1** ✅ |
| ③ 命令型 | — | `Tests 9 passed (9)` ✅ |
| ④【回归信号】`probe.health\|p.health` / `warning` | **5** / **1** | **0** / **0** ✅ |
| ⑤【护栏】`error TS` | 32 | **32** ✅（类型**未动**，`runtime: string` 原样保留） |
| ⑥【护栏】全量前端 | 8 files / 72 passed | **9 files / 81 passed** ✅（+1 文件 +9 用例，既有 72 条一条未掉） |
| ⑥【护栏】后端定向 | 16F / 12P / 1S | **16F / 12P / 1S** ✅ |
| ⑦【回归信号】页面定义 / lib export | **2** / **0** | **0** / **2** ✅ |
| ⑧【护栏】R6.5 diff | — | **7 项 = `write_files` 逐项相等，0 越界** ✅ |

**后端全量也顺手确认零扰动**：`pytest tests/ -q` = **57 failed / 146 passed / 7 skipped**，与本 change 记录的基线逐字相同（非 capability 的 41 红一条未动）。

## TDD：RED → GREEN（一手输出）

判据先于实现存在、且在**未修态真失败** —— 做法：写好测试文件后 `git stash push`（暂存 6 个源码文件的改动、**不动未跟踪的新测试**），跑测试，再 `git stash pop`：

```text
$ git stash push -m "T-FIX-16 impl (temporary, for RED proof)"   # 仅暂存已跟踪的源码改动
$ grep -c "probe\.health\|p\.health" src/components/AgentProbePanel.tsx
5                                        # 确认已回到未修态
$ npx vitest run agent-probe-panel-vocabulary
 × ① 喂 status=healthy   → 「健康度」列文案为「健康」     expected '未知' to be '健康'
 × ① 喂 status=degraded  → 「健康度」列文案为「降级」     expected '未知' to be '降级'
 × ① 喂 status=unhealthy → 「健康度」列文案为「异常」     expected '未知' to be '异常'
 ✓ ① 喂 status=unknown   → 「健康度」列文案为「未知」     ← 唯一一格恰好在未修态也为真（因为未修态**全部**是「未知」）
 × ② 喂 status=unhealthy 一条 → 「异常」计数含它          expected +0 to be 1
 × ② healthy + unhealthy 两条 → 「异常」计数恰为 1        expected +0 to be 1
 ✓ 运行时列两条（DTO 真键）                              ← 见「决策与偏离 ③」：这两条是【护栏】不是【验收】
 Test Files  1 failed (1)
      Tests  5 failed | 4 passed (9)

$ git stash pop
$ npx vitest run agent-probe-panel-vocabulary
 ✓ src/__tests__/agent-probe-panel-vocabulary.test.tsx (9 tests) 625ms
 Test Files  1 passed (1)
      Tests  9 passed (9)                                  # R4.6 5.5 / R2.4
```

> **这条 RED 的形状值得单独说**：`unknown` 那一格在未修态**也为真**（全部渲染「未知」）—— 只写这一格会得到一个"看着通过"的假绿。四格一起写、并附 ② 的守恒断言（healthy+unhealthy 两条 → 恰 1，而不是「全算」或「全不算」），才逼出真实语义。

## verify 输出（八条，全部一手实跑）

```text
① ② ③  npx vitest run agent-probe-panel-vocabulary
        ✓ src/__tests__/agent-probe-panel-vocabulary.test.tsx (9 tests) 625ms
        Test Files  1 passed (1)      Tests  9 passed (9)

④ 【回归信号】
        grep -c "probe\.health\|p\.health" src/components/AgentProbePanel.tsx   → 0   （未修态 5）
        grep -c "warning"                  src/components/AgentProbePanel.tsx   → 0   （未修态 1）

⑤ 【护栏】 npx tsc --noEmit -p tsconfig.json | grep -c "error TS"                → 32
        stores/controlPlane.ts 的 `runtime: string` 原样保留（⑤ 要求「不需要动类型」—— 实测确实不需要）

⑥ 【护栏】 npx vitest run
        Test Files  9 passed (9)      Tests  81 passed (81)        （基线 8/72 + 本卡 1/9）
        cd backend && python -m pytest tests/test_capability_groups.py -q
        16 failed, 12 passed, 1 skipped, 130 warnings in 2.60s
        （附：全量 pytest tests/ -q = 57 failed / 146 passed / 7 skipped = 记录基线）

⑦ 【回归信号】
        grep -c "^const PROBE_STATUS\|^function getHealthLabel" src/pages/AgentControlPlane.tsx → 0
        grep -c "^export const PROBE_STATUS\|^export function getHealthLabel" src/lib/agentHealth.ts → 2

⑧ 【护栏】 R6.5：git status --short（起点 da1bf959 → 工作树）
        M .specs/capability-groups/T-FIX-03-SUMMARY.md
        M backend/routes/control_plane_api.py
        M frontend/src/components/AgentProbePanel.tsx
        M frontend/src/lib/agentHealth.ts
        M frontend/src/pages/AgentControlPlane.tsx
        M frontend/src/stores/controlPlane.ts
        ?? frontend/src/__tests__/agent-probe-panel-vocabulary.test.tsx
        → 7 项，与 write_files 逐项相等，0 越界
```

## 6 维自查（生产代码改动必填）

```markdown
### 🟢 R1 · 认知过载：未命中
**Symptom**：无。新增最长函数 `HealthBadge` ≈ 20 行（全是 style），`getStatusConfig` 4 行、`isProbeErrored` 1 行；
  无嵌套 > 3 层、无 > 50 行函数。
**Source**：`lib/agentHealth.ts` 与 `AgentProbePanel.tsx` 的 diff。
**Consequence**：—   **Remedy**：—

### 🟢 R2 · 变更传播：未命中
**Symptom**：无。
**Source**：⑧ 的 7 项与 `write_files` 逐项相等；`backend/**` 只动了 `control_plane_api.py` 一个函数里的一行字典键。
**Consequence**：—   **Remedy**：—

### 🟡 R3 · 知识重复：本卡消灭了 2 份词表，**还剩 1 份**（不属本卡，已登记）
**Symptom**：`AgentProbePanel.tsx` 的 `StatusBadge`（内容锚：`探针名称 | 状态 | 健康度 …` 表头的**第 2 列**
  那个徽标）仍自带一张表，键集 = `active / idle / error / stopped`（3 个键命中计数：`grep -c "active:\|idle:\|stopped:"` = 3）。
  它作用在**探针** DTO 上，而后端探针词表只有 healthy/degraded/unhealthy/error/skipped/unknown
  ⇒ 除 `error` 外**每一行都落 fallback、把英文原样吐给用户**（`label: status`）。
**Source**：`frontend/src/components/AgentProbePanel.tsx`，`StatusBadge`。
**Consequence**：探针面板还有一列在泄漏英文词；与「活跃 / 空闲」两枚恒 0 计数**同源**（都是 `active`/`idle`）。
**Remedy**：**不在本卡**（卡面 `不许顺手改` 的三处就是它的同族，R7.1）⇒ 只报不修。
  **建议并入 `T-FIX-17`**：人工拍 (甲)（换词表内状态）时，`StatusBadge` 的键集应与那三枚计数**同批**换成
  `getHealthLabel` 的规范词；拍 (乙)（删）时它也一并处理。否则「探针面板还剩一张对不上的表」会被下一轮重新发现。

### 🟢 R4 · 偶然复杂：未命中（并刻意避开了一处）
**Symptom**：无。`isProbeErrored` 有 2 个调用点（`errorCount` 与时间线 `isError`），不是投机抽象。
**Source**：`lib/agentHealth.ts:isProbeErrored`。
**Consequence**：—   **Remedy**：**刻意没做**的事 —— 为保住「每个状态一个图标」而在组件里再枚举一遍词表
  （那会是第 4 张表）。改为中性 `<Circle/>`，并在「已知小问题 2」登记恢复路径（往 `PROBE_STATUS` 一处加 `icon`）。

### 🟢 R5 · 依赖混乱：未命中（本卡的搬迁正是为了维持方向）
**Symptom**：无。新依赖方向 = `components/AgentProbePanel.tsx` → `lib/agentHealth.ts` ←`pages/AgentControlPlane.tsx`；
  `lib/agentHealth.ts` 自身**零 import**（无 React、无 store）。
**Source**：`frontend/src/lib/agentHealth.ts` 第 1 行起无 import 语句。
**Consequence**：—   **Remedy**：主审 (乙) 案（面板 import 页面）被否，理由与我一致：`components/ → pages/` 是反向依赖。

### 🟢 R6 · 领域扭曲：未命中
**Symptom**：无。`HealthBadge` 的 prop 由 `health` 改名为 `status` —— 原来那个名字在撒谎
  （它接的本来就是探针状态，而 `AgentStatus.health` 是幽灵字段）。命名与领域一致。
**Source**：`AgentProbePanel.tsx` HealthBadge。
**Consequence**：—   **Remedy**：—
```

### 沿用既有抽象 grep（R6.4）

```text
$ grep -rn "getStatusConfig\|getHealthLabel\|PROBE_STATUS" frontend/src
（改动前）AgentControlPlane.tsx 同文件 8 处 + 散文提及 3 处；**跨文件 import = 0**
→ 结论：这三个符号**不是**既有可复用抽象（它们是页面私有的），所以本卡的动作是**搬迁并开导出**，
  不是"再写一份"。搬迁后跨文件 import = 3 处（面板 1、页面 1、lib 自身 1）—— 见 ⑧ 的引用图。

$ grep -rn "isProbeHealthy\|isProbeUnhealthy\|isAgentHealthy" frontend/src
lib/agentHealth.ts 定义 3 个 + AgentControlPlane.tsx 3 处调用 + AgentProbePanel.tsx 3 处调用（本卡新增）
→ 沿用 T-FIX-03 立的具名谓词，未另起炉灶、未在组件里写裸词表比较。

$ grep -rn "getHealthLabel" backend/services/agent_probe_service.py   # 反查词表事实来源
→ 后端只写 healthy/degraded/unhealthy/error/skipped/unknown（含 `else "unknown"`）⇒ `getHealthLabel` 必须认识
  `unknown`（见「决策与偏离 ①」），且 `warning`（旧表第 2 个键）**后端确实从不产出**。
```

### 已知接受 + 理由（🟡 未修项）

- **`StatusBadge` 那张表**（见 R3）：不在本卡 `write_files` 语义内（卡面明确「不许顺手改」同族三处）⇒ 登记，
  建议并入 `T-FIX-17`。**理由**：动它就等于替人把 `active/idle` 的产品词选了，正是 `T-FIX-17` 要人拍的那件事。

### 已知小问题（🟢 登记即可）

1. **④ 的两条 `grep` 计数被「注释里的散文」打败过（两次）**：我第一版把旧键名与旧字段名写进了新加的注释
   （`warning` 与 `p.health`），计数立刻从 0 变成 1 —— 这不是笔误，是元规则 2 第三类的**又一个实证**：
   全文内容锚对散文同样敏感。已改写注释让计数归零，但**这条恰恰说明它为什么只能当【回归信号】**。
   （与 `T-FIX-03` 那次 `a.health` 写进注释同形，本 change 第二次。）
2. **图标降级（用户可见）**：`HealthBadge` 原来每个状态一个图标（✓/⚠/✕/○），现统一中性 `<Circle/>`。
   要恢复分状态图标，正确落点是往 `PROBE_STATUS` 一处加 `icon` 字段（而不是在组件里再枚举词表）。
3. **卡面 `write_files` 的「现为 6 项」是笔误**：实读是 **7 项**（原 5 + v16 补的 2）。集合本身正确、
   ⑧ 按 7 项逐项核过；只校正计数，不影响边界判断。

## 越界检查（R6.5 / verify ⑧）

```
✅ 越界检查（R6.5）—— 分「代码面」与「方法要求的工件」两栏：
  - TASK write_files：7 项（AgentProbePanel.tsx / agent-probe-panel-vocabulary.test.tsx(新) /
    control_plane_api.py / controlPlane.ts / T-FIX-03-SUMMARY.md / lib/agentHealth.ts / pages/AgentControlPlane.tsx）
  - 实际 diff：**7 项，逐项相等**
  - 越界：0
  - 工件写入（方法要求）：T-FIX-16-SUMMARY.md(新) · TASK.md(只改本卡 `状态:` 一行) · STATE.md(四行)
```

- `REQUIREMENT.md` / `DESIGN.md` / `REVIEW.md` / `TEST.md` / 他人 `*-SUMMARY.md`：**一字未动**（R3.2 ✅）
- `T-FIX-17` 的面（`activeCount` / `idleCount` / MiniStat「活跃探针」**以及** `:168/:478` 的 `|| status === 'active'` 支）
  **一处未碰**（R7.1）
- 跑 vitest 写脏的被跟踪缓存 `frontend/node_modules/.vite/vitest/results.json` 已 `git checkout --` 还原

## 破坏性变更（R4.6 · 卡面要求「贴出自己的引用图与判断」，两条都贴）

### (b) 搬迁 `PROBE_STATUS` / `getHealthLabel`（+ `getStatusConfig`）

**命中条件 1（形式）**：`pages/AgentControlPlane.tsx` **−36 行**（含两个符号的定义与注释）。

**引用图（我自己重跑，一手）**：

```
$ grep -rn "PROBE_STATUS\|getHealthLabel\|getStatusConfig" frontend/src     # 改动前
  同文件命中 8 处：AgentControlPlane.tsx:30/:40/:42/:45/:183/:220/:221/:1101
  散文提及 3 处：lib/agentHealth.ts:20/:34、__tests__/agent-health-contract.test.tsx:117
  **import 语句：0 处**
$ grep -rn "from '../lib/agentHealth'\|from './lib/agentHealth'" frontend/src   # 改动前
  → 0 命中（lib 当时只导出三个谓词，页面是**唯一**使用者）
间接影响：无（无动态 import、无反射、无字符串拼接的 import；前端全仓 `grep -rn "import("` 未命中动态导入）
```

**判断**：**适用步骤 1.8.6「重构内部实现（导出符号不变）」豁免**。依据四条：
① 被移动的三个符号都是**页面模块级私有**（改动前无 `export`）；② 跨文件引用 **0**（上面 grep 直出）；
③ 既有导出面**零变更**（`AgentControlPlane` 默认导出不动），`lib/agentHealth.ts` 导出面**只增不减**；
④ 行为差异被 9 条新用例锁住（含未修态 5 红）。⇒ **不走破坏性变更协议的反问分支**（与主审 v16 卡的裁定一致）。

### (c) 后端补发 `runtime` 键

**命中条件**：无（纯加法，既有键一个不改、导出面零变更）；形式上也**不**命中条件 1（`+4/−0`）。

**引用图（scoped 到 `AgentStatus`，逐个排除非幽灵点）**：

```
$ grep -rn "\.runtime" frontend/src
  AgentStatus.runtime 的读点（幽灵，改动前恒空）：
    AgentProbePanel.tsx  「运行时」列 `{probe.runtime || '-'}` · 模型分布行 `{probe.runtime || 'unknown'}`
    AgentControlPlane.tsx  DetailPanel 头部行 `Agent #{agent_id} · {agent.runtime}` · 「运行时」行 `{agent.runtime}`
    → 合计 4 处（+ 类型声明 stores/controlPlane.ts 1 处）
  非幽灵（**不在**引用图内，逐条核过类型来源）：
    AgentControlPlane.tsx 的 CapabilityGroupRow 那处 —— 吃 stores/agents.ts 的 `Agent`，同行有 `agent.model_name`，
      而 backend/models/agent.py 的 `to_dict()` 发 `"runtime"` ⇒ 渲染得出来
    AgentNodePool.tsx · AgentBuilder.tsx · OrchestrationPage.tsx · ProjectDetail.tsx(×2) · ProjectManager.tsx ·
    stores/orchestration.ts · AgentDetail.tsx · OrchestrationCanvas.tsx · lib/orchestration-sync.ts(×5)
      —— 全部吃 `Agent` / node data / 表单 state，与 AgentStatus 无关
```

**判断**：纯加法，**适用 1.8.6 豁免**；且实现后不再有幽灵读（`stores/controlPlane.ts` 的类型**不需要改**，⑤ 已复核）。

## 数据库迁移（R4.5）

**N/A** —— 零 schema / model / 迁移改动（后端只在一个只读端点的响应字典里加了一个键）。

## 残留与交接（请主审/下一轮优先看）

1. 🟡 **`AgentProbePanel` 的 `StatusBadge` 仍是第 4 张词表**（键集 `active/idle/error/stopped`，作用在探针 DTO 上
   ⇒ 除 `error` 外整列吐英文）。**不在本卡范围**（卡面禁改同族三处）⇒ 建议并入 `T-FIX-17` 一并处置。
2. 🟢 `HealthBadge` 的图标降级（见「已知小问题 2」）。
3. 🟢 **F10 判级**：本卡落地后 `AgentProbePanel` 面的 **5 处幽灵读 + 第 3 张表**已收口 ⇒
   F10 的 `AgentControlPlane` 面（`T-FIX-03`）与 `AgentProbePanel` 面（本卡）**都已结**；
   但上面第 1 条那张 `StatusBadge` 表仍属「词表对不上」同族（它不吃幽灵字段，吃的是词表外的词）
   ⇒ **建议主审判级时把这两件事分开记**（幽灵字段 = 已清零；第 4 张表 = 待 `T-FIX-17`）。

## 决策与偏离

① **三处卡面没点名的小项，逐条给理由**：
   - **`isProbeErrored`（新增谓词）**：卡面 (a) 要求「消费具名谓词…而不是再写内联比较」，而 `error` 这一支
     原本就存在（`errorCount` 与时间线 `isError`）—— 不具名就只能写 `p.status === 'error'` 内联比较，
     与卡面矛盾。它 2 个调用点，不是投机抽象。
   - **`getHealthLabel` 补 `unknown → '未知'`**：卡面 **verify ① 要求 `unknown` 那格是「未知」**，
     而 `getHealthLabel('unknown')` 原样返回 **英文 `'unknown'`**（末行 fallback 是 `status || '未知'`）。
     也就是说 ① 隐含要求这条映射存在。**我按 ① 加了这一行，并在此显式声明**（元规则 4d：不静默改别人的判断）：
     顺带修掉 `AgentControlPlane` 两处同样的英文泄漏。**若主审认为该保留 `unknown → 'unknown'` 的原行为，
     改 ① 的期望值即可，我这一行可撤。**
   - **`getStatusConfig` 一并搬迁**：卡面允许「留在页面或一并搬走，**但两者只能存在一处**」。
     我选一并搬 —— 因为 `HealthBadge` 也需要「词表外值 → 中性配色 + 原值当 label」这套 fallback；
     留在页面就会在面板里复制第二份 fallback 逻辑（正是本卡要消灭的形状）。
② **未动 `T-FIX-17` 的任何一处**：包括 `:168`/`:478` 的 `|| probe.status === 'active'` 支（它虽在同一表达式里，
   但**属于** `active` 词问题）⇒ 我只摘了幽灵那半支，另一半原样保留并加注释指路。
③ **对自带判据的诚实标注**：我在新测试文件里写的两条「运行时列」断言（`runtime=''` → `-`、`runtime='langgraph'` → 该值）
   **在未修态也为真**（RED 那 4 条 passed 里有它们）—— 按元规则 2 它们是**【护栏】**，**不是**【验收】。
   验收只有 ①②（行为）与 ③（命令吃用例数）；④⑦ 是【回归信号】，⑤⑥⑧ 是【护栏】。
④ **未自行发起 G3**：主审 v16 明确「你落地后我按工件召集，你不必自己发起」⇒ 本卡出口只报到工件层面。

## 是否触发新工作

- [x] **建议并入 `T-FIX-17`（不新开卡，R18.4）**：`StatusBadge` 的键集与那三枚 `active/idle` 计数**同批**处置 ——
      人工拍 (甲)/(乙) 时它必须一起动，否则探针面板会剩一张对不上的表。
- [ ] 触发 CONTEXT.md 更新：否（不在 write_files；术语缺口已由 `T-FIX-12` ⑤ 登记）
- [ ] 发现需求/设计问题需暂停：否 —— `REQUIREMENT.md` / `DESIGN.md` 一字未动（R3.2 ✅），
      (b) 的搬迁是**实现层重构**，不改设计工件

## 完成判定

- `TASK.md` 中 `T-FIX-16` 已勾选：**是**（`状态:` 行改写，保留时间戳与八条判据依据）
- 八条 verify 全过：**是**（①②③ 9 passed (9) · ④ 5→0 与 1→0 · ⑤ 32 · ⑥ 9 files/81 passed 与 16F/12P/1S · ⑦ 2→0 与 0→2 · ⑧ 7 项 0 越界）
- RED 证明：**是**（`git stash` 双态对照，5 failed | 4 passed，原文见上）
- 提交 hash：**见本任务分支 tip**（代码 + 测试**同一个原子提交** R4.1；工件提交紧随其后）
- **G3**：**由主审召集**（v16 §五 明文；本卡动第 2 个共享靶文件 + 后端公共 payload + 移动导出位置）——
  我不自行发起，等主审按工件召集。
