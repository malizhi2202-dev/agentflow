# SUMMARY: T-FIX-03 — 修契约缺口 + 两个状态词表各自具名（F10）

- **Change ID**: capability-groups
- **Task ID**: T-FIX-03
- **完成时间**: 2026-09-28 09:1x
- **AI 角色**: Dev（4-dev）
- **起点 tip**: `04245ee7`（评审分支 `agent/agent/87518bcb82fb` 的 v14 卡面修订，含 (c) 落点改址与 `DESIGN.md` 移出 `write_files`）
- **本任务分支**: `agent/agent/42a133ecdd60`（从 `04245ee7` 线性续做，未并 `main` · R15.2）

---

## 入口门禁与前置声明（R2.7 / R2.9 / R1.8 —— 先把不满足的写在前头）

| 项 | 状态 | 处置 |
|---|---|---|
| 正式 `TASK.md` 中的当前 task | ✅ 在（T-FIX-03，v4 重写 + v14 修订） | R2.9 ① 满足，无需临时 TASK |
| `UI-DESIGN.md` | ❌ **本 change 不存在** | **R2.10 在本 change 处于长期未满足态**，已由 `REVIEW.md:32` / `:331` 登记为「覆盖盲区（不是通过，是没基线）」，非本任务新造成。本任务的**视觉取值全部锁定在既有 `frontend/src/styles/tokens.css` 变量 + 卡面明示的行内值**（`--green-bg` / `--green` / `--red-bg` / `--red` / `--orange*` / `--text-muted` / `--bg-input`），**未新增任何颜色 / 字号 / 间距 / 圆角**，也未做任何视觉设计决策 ⇒ 按「无 UI 基线」执行并**在此登记**，不静默绕过。是否补 `UI-DESIGN.md` 交主审/人工（登记为一条待决，不在本任务自决）。 |
| `.specs/LESSONS.md` | ❌ 不存在（实测 `ls` → No such file） | 创建它落在本任务 `write_files` **之外**（R6.5/R7.1）→ **不自行新建**。改以本 change 既有的等价失败库为输入：`TASK.md` 元规则 1–5 + `REVIEW.md` 元规则段 + `T-FIX-05-SUMMARY.md`「下游判据影响」表 + `STATE.md` 的 v3–v14 起因行。**建议**：`LESSONS.md` 的落地是一条独立事项（议题），请主审裁。 |

### R1.8 逐条声明（跨任务失败检查）

- **元规则 1（靶文件 / action 落点边界）** — 已查阅。本次差异：action 的四个落点全部在本任务 `write_files` 内；**v14 已把 `DESIGN.md` 移出 `write_files`**，我确认 `DESIGN.md` / `REQUIREMENT.md` 一字未动（R3.2）。
- **元规则 2（【验收】/【护栏】+ 未修态取值 + 取值来源 tip）** — 已查阅。下表未修态取值全部**本会话在 `04245ee7` 上实跑**取得。⚠️ **我对本卡 verify 的标注有一条更正**（见「决策与偏离」③）：**③ 在今日树上喂值即真 ⇒ 它是【护栏】不是【验收】**。
- **元规则 3（`vitest run <pattern>` 静默 0 用例 = 假绿）** — 已查阅并**正面规避**：新文件名 `agent-health-contract.test.tsx` 与卡面 `npx vitest run agent-health-contract` 逐字对应；判据不吃退出码，**明写用例数 `4 passed (4)`**。
- **元规则 4（`AgentControlPlane.tsx` 单写者串行）** — 已查阅。本波**只动本任务 `write_files` 的 4 个文件**；`T-FIX-06/07/08/09` 卡 `待人工裁定 #1`，无并发写者。行号漂移作为交接物回报（见「下游判据影响」）。
- **元规则 4b（认内容锚不认行号）** — 已查阅并**正面命中**：本卡的四组行号全部已漂（`a.health` 在 `:76/:77` 不在 `:74/:75`；`runtime` 三处是 `:527/:1020/:1073` 不是 `:531/:1076/:1129`；`STATUS_CONFIG` 区 `:24-29`、`getStatusConfig` `:31`；「异常」卡 `:83`）。判据⑤ 按主审 v9/v14 的要求用**全文件内容锚**。
- **元规则 5（收票/增补审查时逐条勾账）** — 已查阅。本卡 v14 的两处改动（(c) 落点改址、`DESIGN.md` 移出）我逐条落到代码/工件，未静默丢弃。
- **F27（写法判据须配行为判据 / grep 计数可被同义写法绕过）** — 已查阅并**下节做了对抗样本证明**。
- **v4 那次 `T-FIX-03` 破坏性任务**（把正确代码改坏 + verify 被改坏所满足 → 假绿）— 已查阅。本次差异：**判据先于实现存在且先失败**（RED 见下），且新判据**不可能是"改坏正确代码"所满足**（③ 反而锁住 v3 那个坑：`isAgentHealthy('healthy') === false` 写死进用例）。

---

## 做了什么（一段话）

按卡面 (a)(b)(c)(d) 四件事全部落地，**未改后端一字**：

1. **新建 `frontend/src/lib/agentHealth.ts`** —— 两个「健康」口径各自具名：`isAgentHealthy`（**生命周期**：`running | standby`，规范源 `DESIGN.md:97-104`）+ `isProbeHealthy` / `isProbeUnhealthy`（**探针判定**：`AgentStatus.status`）。文件头 docstring 写明**作用域声明**（生命周期谓词不覆盖探针判定，作用在探针词表上恒假 —— 就是 v3 那个坑）与**两个取值域零交集**。`isAgentHealthy` 由页面层的私有函数**等值搬入**并改为 import。
2. **(a) 契约缺口收口**：`OverviewCards` 的两行原来读 DTO 的 `health` 字段，而 `/api/control-plane/probes` 的 entry 键集里**根本没有 `health`**（`list_probes` 实读）→ 改成读真正带探针判定的 `status` + 具名谓词。「健康」卡不再恒 0，「异常」卡重新认得 `unhealthy`。
3. **(b)** `:158-159` 与 `:1108` 的三处 `status === 'healthy'` **等值改名**为 `isProbeHealthy(agent.status)`，判定语义一字未变（未换成生命周期谓词）；`getHealthLabel` 原样保留。
4. **(c)** 两个词表各自具名（上面第 1 条）；页面层不再定义任何「健康」谓词。
5. **(d)** `STATUS_CONFIG` / `STATUS_PRIORITY`（键集 `{running,idle,blocked,dead}`，与探针词表**零交集**）合并重键为**一张** `PROBE_STATUS` 表（键集 = `healthy/degraded/unhealthy/error/skipped/unknown` + `priority`）→「运行状态」列不再吐英文状态，列表排序不再全落 99。文案不复制进表，一律取自 `getHealthLabel`。
6. **新增 `frontend/src/__tests__/agent-health-contract.test.tsx`**（4 条用例，唯一新增测试文件）：①②③ 把卡面的行为断言落成**有 runner 的**判据，另加一组把「两个词表零交集」写死的谓词判据。
7. 为让 ①②③ 有 runner，给 `OverviewCards` / `AgentRow` / `CapabilityGroupRow` / `DetailPanel` **加 `export`**（纯加法、不改语义）。卡面点名前两个，③ 的另外两个渲染点住在后两个组件里 —— 同一手段一并处理（**决策与偏离 ①**）。
8. `stores/controlPlane.ts` 的 `AgentStatus` 补一段契约注释：把「哪两个字段是幽灵字段、各自今天什么状态、为什么类型仍是必填 `string`」写在类型定义处。

**偏离原计划的地方**：无（四件事逐条对应卡面）。**新增的、卡面没点名的**：F27 对抗样本证明（下节）、`store` 的契约注释、以及一条 **F10 残留发现**（`AgentProbePanel.tsx` 仍有 5 处读同一个幽灵字段，见「已知未收口」）。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `frontend/src/lib/agentHealth.ts` | **新增** | 两个（实为三个）具名谓词 + 作用域声明 docstring；零依赖、零 React、零 store |
| `frontend/src/pages/AgentControlPlane.tsx` | 修改 | (a)(b)(d) 落点 + `isAgentHealthy` 搬出 + 4 个组件加 `export` |
| `frontend/src/stores/controlPlane.ts` | 修改 | `AgentStatus` 的契约注释（幽灵字段账），**零类型变更** |
| `frontend/src/__tests__/agent-health-contract.test.tsx` | **新增** | 4 条用例：①②③ + 词表零交集 |

`git diff --numstat`（不含两个新文件）：`AgentControlPlane.tsx` **+47/−28** · `controlPlane.ts` **+17/−0**。

### 工件写入（方法要求，非代码面 · 与 `T-FIX-04/05/13/14` 同口径单列）

| 文件 | 说明 |
|---|---|
| `.specs/capability-groups/T-FIX-03-SUMMARY.md` | **新增**（本文件 · kit-4-dev 步骤 6） |
| `.specs/capability-groups/TASK.md` | **只改 `T-FIX-03` 那一行 `状态:`**（卡面 action/verify 正文一字未改 · 步骤 7） |
| `STATE.md` | 四行状态前置（最近更新行 / 当前阶段 / 当前 task / 中断任务 / 产物）（R18.3） |

## 未修态基线（本会话在 `04245ee7` 上**一手实跑**，非转抄）

| 判据 | 未修态取值 | 终态取值 |
|---|---|---|
| ④ `grep -c "isProbeHealthy\|isAgentHealthy" src/lib/agentHealth.ts` | **0**（文件不存在） | **6**（其中**定义处** `^export function …` = **2**，其余为 docstring 引用） |
| ⑤ `grep -c "a\.health" src/pages/AgentControlPlane.tsx`（全文件内容锚） | **2**（`@:76/:77`） | **0** ✅ |
| ⑥ `npx tsc --noEmit \| grep -c "error TS"` | **32** | **32** ✅（等于基线，非 ≥32） |
| 护栏 · 全量前端 `npx vitest run` | 7 files / **68 passed** | 8 files / **72 passed**（68 + 本次 4） |
| 护栏 · `npx vitest run capability-group` | 14 / 14 | **14 / 14** |
| 护栏 · `npx vitest run agent-builder-capability-wiring` | 2 / 2 | **2 / 2** |
| 护栏 · 后端定向 `pytest tests/test_capability_groups.py -q` | **16F / 12P / 1S** | **16F / 12P / 1S**（后端一字未动） |

## TDD：RED → GREEN（一手输出）

### RED（先落 `agentHealth.ts` 的**定义**、页面一字未改）

```text
$ npx vitest run agent-health-contract
 ❯ src/__tests__/agent-health-contract.test.tsx (4 tests | 2 failed)
   × ① 喂 status=healthy → 行徽标绿（--green-bg/--green）且「健康」卡计数 > 0
     AssertionError: expected 0 to be greater than 0          ← 幽灵字段 a.health 恒 undefined ⇒ 「健康」卡恒 0
   × ② 喂 status=unhealthy → 行徽标红且计入「异常」卡
     AssertionError: expected +0 to be 1                      ← 同一根因：异常卡对 unhealthy 恒 0
   ✓ ③ 喂 runtime=langgraph → 三处渲染点都显示该值            ← ③ 今天即真（见下文标注更正）
   ✓ 生命周期口径与探针判定口径互不覆盖
 Test Files  1 failed (1)
      Tests  2 failed | 2 passed (4)
```

**这条 RED 的形状是关键**：它是**行为**红（用户看到的计数是 0），不是「源码里少了某个函数名」的红 ——
判据**先于实现存在、先失败、改完才转绿**，与 v4/v9 那两次「改完再补一条会过的断言」正好相反。

### GREEN（终态）

```text
$ npx vitest run agent-health-contract        # ①②③④（元规则 3：用例数写死）
 ✓ src/__tests__/agent-health-contract.test.tsx (4 tests) 386ms
 Test Files  1 passed (1)
      Tests  4 passed (4)

$ grep -c "a\.health" src/pages/AgentControlPlane.tsx                                          # ⑤（全文件内容锚）
0
$ grep -c "isProbeHealthy\|isAgentHealthy" src/lib/agentHealth.ts                             # ④（含 docstring）
6
$ grep -c "^export function isProbeHealthy\|^export function isAgentHealthy" src/lib/agentHealth.ts
2
$ npx tsc --noEmit 2>&1 | grep -c "error TS"                                                   # ⑥【护栏】
32

$ npx vitest run            # 全量回归
 Test Files  8 passed (8)
      Tests  72 passed (72)
$ npx vitest run capability-group                    → Tests 14 passed (14)
$ npx vitest run agent-builder-capability-wiring     → Tests  2 passed (2)

$ cd backend && python -m pytest tests/test_capability_groups.py -q   # 护栏（后端一字未动）
16 failed, 12 passed, 1 skipped, 130 warnings in 2.49s
```

> 未跑裸 `pytest tests/ -q`：本任务纯前端、零 `backend/` 改动，全量基线（41 红）归 `T-FIX-00`（卡面口径同上）。

### F27 对抗样本证明（写法判据 vs 行为判据 · 已复原未入库）

⑤ 是 `grep -c` 计数 —— 属**写法判据**。按本 change 已升格的 F27（`T-FIX-15` 裁定），我做了对抗注入：
把两行改写成**同义、但 `grep -c "a\.health"` 看不见**的形状，验证它能不能绕过判据：

```text
$ # 注入（临时，未入库）：(a as any)['health'] === 'healthy'  /  (a as any)['health'] === 'unhealthy'
$ grep -c "a\.health" src/pages/AgentControlPlane.tsx
0                                   ← ⑤ 报「已满足」= 假绿，幽灵字段其实还活着
$ npx vitest run agent-health-contract
   × ① …   AssertionError: expected 0 to be greater than 0
   × ② …   AssertionError: expected +0 to be 1
      Tests  2 failed | 2 passed (4)      ← 行为判据抓住了
$ cp /tmp/ACP.keep.tsx src/pages/AgentControlPlane.tsx && rm /tmp/ACP.keep.tsx
$ grep -c "as any" src/pages/AgentControlPlane.tsx
0                                   ← 复原校验；重跑 ①②③ = 4 passed
```

**结论**：⑤ **单用必假绿**（可被 `a['health']` / 解构 / 别名等等价形状绕过），① ② 才是天花板。
本卡把两条一起落，正好构成 F27 要求的「写法判据 + 行为判据」配对；⑤ 只能当**交接期的廉价回归信号**，
不能当验收结论 —— 这条请主审写进基线表的口径。

## 6 维自查（生产代码改动必填 · 4-dev 步骤 4）

```markdown
### 🟢 R1 · 认知过载：未命中
**Symptom**：无。新增最长函数 `getStatusConfig` = 4 行；`PROBE_STATUS` 是数据表不是逻辑。
**Source**：`AgentControlPlane.tsx` diff。
**Consequence**：—
**Remedy**：—

### 🟢 R2 · 变更传播：未命中
**Symptom**：无。
**Source**：`git diff --name-only` = 4 个文件，与 `write_files` 逐项相等（见「越界检查」）。
**Consequence**：—
**Remedy**：—

### 🟡 R3 · 知识重复：探针词表在页面上仍有两次枚举（已收敛到最小，登记）
**Symptom**：探针词表在页面文件里出现两次枚举：`PROBE_STATUS` 的键集（6 个）与 `getHealthLabel` 的
  分支（6 值 + `pass`/`fail` 两个后端不产出的历史别名）。`lib/agentHealth.ts` 里另有 2 个值的具名谓词。
**Source**：`AgentControlPlane.tsx` 的 `PROBE_STATUS` 与 `getHealthLabel`。
**Consequence**：将来探针词表扩值（如新增 `timeout`）时可能只改一处 → 配色/label 各自漂移。
**Remedy**：**已做**——把原计划的两张表（`PROBE_STATUS_STYLE` + `PROBE_STATUS_PRIORITY`）合并成**一张**
  `PROBE_STATUS`，且**label 不复制进表**（`getStatusConfig` 现取 `getHealthLabel`），把枚举次数从 3 降到 2。
  剩余那一次（表 vs label 分支）**本次不动**：把 label 也塞进表会与 `getHealthLabel` 的两个既有别名语义
  打架（见「已知接受」）。登记，交主审。

### 🟢 R4 · 偶然复杂：未命中（并删掉了一处）
**Symptom**：无。
**Source**：本任务**没有**写"以后可能用到"的扩展点——`pass`/`fail` 两个 `getHealthLabel` 认得的别名
  **故意没有**加进 `PROBE_STATUS`（后端探针不产出它们），避免留下没有消费者的配置。
**Consequence**：—
**Remedy**：—

### 🟢 R5 · 依赖混乱：未命中
**Symptom**：无。方向是 页面（表现层）→ `lib/agentHealth.ts`（纯谓词）；后者**零 import**，不反向依赖
  store / 页面 / React。
**Source**：`frontend/src/lib/agentHealth.ts` 第 1 行即注释，无 import 语句。
**Consequence**：—
**Remedy**：—

### 🟢 R6 · 领域扭曲：未命中
**Symptom**：无。命名用领域词：`isProbeHealthy` / `isAgentHealthy` / `PROBE_STATUS`，
  不用 data / info / item 这类技术词；两个口径的名字本身就把取值域说清楚了。
**Source**：`lib/agentHealth.ts`。
**Consequence**：—
**Remedy**：—
```

### 沿用既有抽象 grep（R6.4 / 步骤 1.4）

```text
$ grep -rn "isHealthy|isProbeHealthy|isAgentHealthy|getHealthLabel|HealthBadge" frontend/src --include=*.ts --include=*.tsx
frontend/src/components/AgentProbePanel.tsx:168  const isHealthy = probe.health === 'healthy' || probe.status === 'active';   ← 组件内局部量，非可复用抽象
frontend/src/components/AgentProbePanel.tsx:619  function HealthBadge({ health }: { health: string }) { … }                    ← 组件内私有，且被 5 处幽灵字段喂养
frontend/src/components/capability/CapabilityGroupHeader.tsx:14  注释引用 isAgentHealthy
frontend/src/pages/AgentControlPlane.tsx:35   function getHealthLabel(status)                                                   ← 探针词表的唯一文案源
frontend/src/pages/AgentControlPlane.tsx:368  function isAgentHealthy(status)                                                   ← 生命周期谓词，本次搬到 lib
→ 结论：**不存在**可复用的「健康判定」抽象；`getHealthLabel`（文案）沿用不改，`isAgentHealthy` 搬进新 lib
  并成为唯一定义处。未另起炉灶、未新建第二种 label 映射。

$ ls frontend/src/lib frontend/src/utils
lib: orchestration-sync.ts        utils: requestDedup.ts
→ `lib/` 是既有纯模块目录（范式：零 React 依赖），新文件按同一范式落 `lib/agentHealth.ts`。

$ grep -n "green" frontend/src/styles/tokens.css
24:  --green:          #5cb878;        25:  --green-bg:       rgba(92,184,120,0.08);
→ 视觉取值全部来自既有 token，零硬编码颜色（卡面 (b) 明示的两个变量也在这里）。
```

### 已知接受 + 理由（🟡 项不修的）

- **🟡 `getHealthLabel` 的 `pass` / `fail` 两个别名未纳入新表**：后端探针**从不产出**这两个值
  （`agent_probe_service.py` 写 `healthy/degraded/unhealthy/error/skipped/unknown`），但 `getHealthLabel`
  认得它们。若把配色表也补上这两个键，就会造出「运行状态列判绿、探针徽标判红」的**新**不一致
  （`isProbeHealthy` 按卡面 (b) 必须与 `status === 'healthy'` 等值，不能含 `pass`）。
  ⇒ 选择：表只覆盖**后端真实词表**，`pass`/`fail` 走 fallback（label 由 `getHealthLabel` 给，配色 muted）。
  **现实影响 = 0**（这两个值不产生），登记给主审。

### 已知小问题（🟢 项可省的）

- `OverviewCards` 的 `deadCount` 保留了 `a.status === 'dead'` 这个**探针词表里不存在的死分支**：
  卡面 (b) 冻结判定语义，删除属语义变更，故**原样保留并登记**（代码里已加注释指路）。
- `CapabilityGroupHeader.tsx:14` 的注释写「判定语义住在**页面层**的 `isAgentHealthy`」—— 本次把谓词搬进
  `lib/` 后该注释**过时**。该文件不在本任务 `write_files`（R6.5/R7.3）⇒ **只报不修**，
  交 `T-FIX-06`（它已持有该文件的行）或主审一并刷。

## 越界检查（必填 · R6.5）

```
✅ 越界检查（R6.5）—— 分「代码面」与「方法要求的工件」两栏，避免把后者混进前者自欺：
  - TASK write_files：4 项（agentHealth.ts 新建 / AgentControlPlane.tsx / controlPlane.ts / agent-health-contract.test.tsx 新建）
    ＋ 条件项 backend/routes/control_plane_api.py（**未取**：见「决策与偏离 ②」）
  - 代码面实际 diff：**4 项**，与 write_files 逐项相等 —— frontend/src/lib/agentHealth.ts(新)
    · frontend/src/pages/AgentControlPlane.tsx · frontend/src/stores/controlPlane.ts
    · frontend/src/__tests__/agent-health-contract.test.tsx(新)
  - 代码面越界：0
  - 工件写入（不在 write_files 内，但为 kit-4-dev 步骤 6/7 + R18.3 的强制产物）：
    T-FIX-03-SUMMARY.md(新) · TASK.md(只改本卡 `状态:` 一行) · STATE.md(四行)
```

- `REQUIREMENT.md` / `DESIGN.md` / `REVIEW.md` / `TEST.md` / 他人 `*-SUMMARY.md`：**一字未动**（R3.2 ✅）
- `backend/**`：**一字未动**（`git status` 无后端路径）
- 跑 vitest 写脏的被跟踪缓存 `frontend/node_modules/.vite/vitest/results.json` 已 `git checkout --` 还原，
  收尾工作树 = **恰好 4 个本任务文件**（`git status --short` 实测）

## 破坏性变更（R4.6 / 步骤 1.8）

### 判定命中

- [x] 删除既有代码 ≥ 5 行 —— **形式命中**：`STATUS_CONFIG`(5 行) / `STATUS_PRIORITY`(5 行) / 页面层
      `isAgentHealthy`(3 行) / 两处幽灵字段读取(2 行) 被替换
- [ ] 改公共导出（函数 / 类 / 接口签名）—— **未命中**：既有导出符号**零变更**；四个 `export` 是**纯加法**
- [ ] 改公共 API —— **未命中**
- [ ] 删除文件 / 重命名导出符号 —— **未命中**

### 适用豁免（步骤 1.8.6）

> **「重构内部实现（导出符号不变）」—— 本次命中该豁免，故不进入「反问用户」分支。**
>
> 逐条论证：① 被删的四个符号**全部是模块级私有**（无 `export`，v14 已实读）；② 既有导出面
> **零变更**（`export default AgentControlPlane` 不动，四个新 `export` 是加法）；③ 无公共 API / 路由 / schema 触碰；
> ④ 删除的每一处都有**等值或更强**的替代（`isAgentHealthy` 等值搬入 lib；两处幽灵字段改读语义正确的 `status`；
> 两张零交集表重键为探针词表），且**行为差异被 4 条新用例锁住**。⑤ 同文件先例：`T-FIX-05` 净删 58 行、同属
> 「抽出/改写内部实现」，亦按本豁免执行。

### 引用图（1.8.1 取证 · grep 直出）

```text
被删/改的符号：STATUS_CONFIG ∈ AgentControlPlane.tsx（模块级私有）
$ grep -rn "STATUS_CONFIG" frontend/src
  frontend/src/pages/KnowledgeBase.tsx:35,270      ← 各自的同名**私有**常量，与本文件无引用关系
  frontend/src/pages/Runtime.tsx:17,195,252        ← 同上
  → 对**被我删掉的那个** STATUS_CONFIG：跨文件引用 **0**；本文件内引用点已在同次提交内改完

被删/改的符号：STATUS_PRIORITY ∈ AgentControlPlane.tsx（模块级私有）
$ grep -rn "STATUS_PRIORITY" frontend/src
  → 跨文件引用 **0**；本文件内 2 处调用点（`:229/:230`）已改为 PROBE_STATUS[…].priority

被删/改的符号：isAgentHealthy ∈ AgentControlPlane.tsx:368（模块级私有 → 搬到 lib）
$ grep -rn "isAgentHealthy" frontend/src backend .specs README.md CLAUDE.md
  本文件 1 处调用（:484）→ 改为 import 自 lib
  frontend/src/components/capability/CapabilityGroupHeader.tsx:14  ← **注释里的引用**（非代码），
      本次搬迁后过时 → 只报不修（不在本任务 `write_files` 内），见「已知小问题」
  → 代码引用图 = 本文件内 2 处（定义 + 调用），无跨模块调用点

被删/改的符号：AgentStatus.health 的**消费点**（字段本身保留）
$ grep -rn "\.health" frontend/src
  AgentControlPlane.tsx:76,77 → 本任务改读 status（⑤ = 2 → 0）
  AgentProbePanel.tsx:64,168,169,318,478 → **仍在读幽灵字段**，不在本任务 write_files
      ⇒ 见「已知未收口」，这是本次最重要的一条残留
  backend/main.py:12 / backend/routes/__init__.py:5 → 无关（路由名）
  → 无动态 import / 反射 / 配置驱动的间接引用（本仓前端无此模式：`grep -rn "import(" frontend/src` 未命中动态导入）
```

### 回归测试覆盖

- 旧路径（幽灵字段读取 / 零交集词表）：`frontend/src/__tests__/agent-health-contract.test.tsx` ①②（未修态**必红**，RED 已贴）
- 新路径（`status` + 具名谓词）：同文件 ①②③ + 词表零交集那一条
- 全量前端回归：`8 files / 72 passed`（68 基线**一条未掉**）；`capability-group` 14/14、接线级 2/2 同值
- 后端零扰动：定向 `16F/12P/1S` 与基线逐字同

## 数据库迁移（R4.5）

**N/A** —— 本任务零 schema / model / 迁移文件改动（纯前端；`AgentStatus` 的改动是**注释**，类型零变更）。

## 已知未收口 / 残留（**请主审优先看这一节**）

1. 🔴 **F10 的幽灵字段 `health` 在全仓有 7 个消费点，本任务只收口了 2 个**。
   `frontend/src/components/AgentProbePanel.tsx` 的 **5 处**（`:64` errorCount / `:168` isHealthy /
   `:169` isError / `:318` `<HealthBadge health={probe.health}/>` / `:478` isHealthy）读的**是同一个
   `AgentStatus`（`useControlPlane()` 的 `probes`）**，字段恒 `undefined` ⇒
   `HealthBadge` 永远渲染 `map['unknown']`（"未知"）、errorCount 只剩 `status === 'error'` 那一半。
   **它不在本任务 `write_files`**（R6.5/R7.3）⇒ 只报不修。
   ⇒ **「F10 已修」这句话只在 `AgentControlPlane.tsx` 范围内成立**；建议按同一处置（改读 `status`）**另开一条**
   或把 `AgentProbePanel.tsx` 并进 `T-FIX-03` 的 `write_files` 后追加一批。**这是本任务最该被人接手的一条。**
2. 🟡 **`runtime` 那半边契约缺口** —— **按元规则 4b 本条已订正（O-20 ②）**：原写法把**起点树**的行号
   `:527/:1020/:1073` 当终态，且把**非幽灵**读计进了幽灵数。订正如下（**改内容锚、不写行号**）：
   **`AgentStatus.runtime` 的幽灵读 = 4 处**（不是 5）——
   `AgentControlPlane.tsx` 的 `DetailPanel` 两处（内容锚：头部行的 `Agent #{agent_id} · {agent.runtime}`、
   「能力检查」卡里 `运行时` 那一行的 `{agent.runtime}`）＋ `AgentProbePanel.tsx` 两处（内容锚：
   「运行时」列的 `{probe.runtime || '-'}`、模型分布行的 `{probe.runtime || 'unknown'}`），
   外加类型声明 `stores/controlPlane.ts` 1 处。
   **`AgentControlPlane.tsx` 的 `CapabilityGroupRow` 那一处不在此列** —— 它吃 `stores/agents.ts` 的 `Agent`，
   而 `backend/models/agent.py` 的 `to_dict()` 确实发 `runtime` ⇒ 那里渲染得出来，**不是幽灵**。
   卡面给的两条路里，**后端补键**与护栏「后端一字不动」互斥 ⇒ 本任务只能走前端路，前端路对 `runtime`
   **无解**（无处派生）。③ 钉的因此是「三处接线会把喂进去的值显示出来」（契约形状），**不是**「payload 已有 runtime」。
   ∎ **处置（2026-09-28）**：`T-FIX-16 (c)` 已由后端 `list_probes` 补发该键（纯加法，既有键一个不改），
   上述 4 处幽灵读随之全部有值 —— 详见 `T-FIX-16-SUMMARY.md`。
3. 🟢 **`.specs/LESSONS.md` 始终不存在**（见「入口门禁」）——kit 要求在缺失时创建空骨架，创建它落在
   `write_files` 之外 ⇒ 未做，登记。

> ∎ **本节第 1 条的处置（2026-09-28 补记，不删原文）**：`AgentProbePanel` 那 5 处已被**扩查为 9 个错配形状 / 8 行**
> （5-test `TEST.md` §1.11 第 1 条 + 主审 v15 一手复核），并落成 `T-FIX-16`（本 SUMMARY 所指的「另开一条」）
> —— 已由 4-dev 交付：(a) 5 处幽灵读改读 `status` + 具名谓词、(b) `HealthBadge` 的第 3 张词表并入唯一来源。
> 逐条证据见 `T-FIX-16-SUMMARY.md`。**本节原文保留**（元规则 4d：不静默抹掉当时的判断）。

## 决策与偏离

① **`export` 了 4 个组件（卡面点名 2 个）**：③ 的三个渲染点分布在 `CapabilityGroupRow`(:527) 与
   `DetailPanel`(:1020/:1073)。为让 ③ 有 runner，按**同一手段**（纯加法 `export`、不改语义）一并处理。
   替代路线（整页 `render` + 点 tab + 逐层展开 + mock `fetch`）被否决：断言会依赖与本任务无关的交互路径，
   判据更脆，且要 mock 真 `fetch`（R5.2 不鼓励）。**未新增 `data-testid`**（不拿写权换测试钩子）。
② **未走后端方案**：卡面给了「后端补 `health`+`runtime`」这条选项，但卡面同时把「后端一字不动」写成
   定向 pytest 护栏 —— 两者互斥。按**更硬的那条**（护栏）执行，取前端路。副作用见「已知未收口 2」。
③ **对卡面 verify 标注的一条更正（元规则 2 同族，请主审采纳）**：**③ 在今日树上喂值即真**
   （三处接线本来就正确，只是没有 runner 能打到它们）⇒ 按「【验收】= 今天为假、修后才真」的定义，
   **③ 应标【护栏】**，不是【验收】。它仍然值得执行（它证明三处**接线**没断），但不能当"修好了"的证据。
   **未改卡面文本**（改判据语义是 Reviewer 的活，R3.3），只在此登记。同理 ⑥（`tsc`）卡面已正确标【护栏】。
④ **`stores/controlPlane.ts` 只加注释、不改类型**：把 `health`/`runtime` 改成可选会让
   `AgentProbePanel.tsx:318` 的 `HealthBadge({health: string})` 在 `strict: true` 下报 `error TS`，
   直接顶破 ⑥ 的「恰 32」护栏 ⇒ 类型上的账留给「后端补键」那一轮一起还。已在类型定义处写明原因。

## 是否触发新工作

- [x] **触发新 fix-plan（建议，已写进本节交主审落 TASK）**：
  1. 🔴 `AgentProbePanel.tsx` 的 5 处幽灵字段 `health`（+2 处 `runtime`）—— 同源、同一修法，见「已知未收口 1」
  2. 🟡 后端 `list_probes` 补 `runtime` 键（1 行）→ 与类型改可选同批还账
  3. 🟢 `.specs/LESSONS.md` 空骨架落地（全仓性事项，非本 change）
- [ ] 触发 CONTEXT.md 更新：否（`.specs/CONTEXT.md` 不在 `write_files`）
- [ ] 发现需求/设计问题需暂停交人工：否 —— **未动 `REQUIREMENT.md` / `DESIGN.md`**（R3.2 ✅）；
  (c) 的作用域声明按 **v14 修订**落在 `lib/agentHealth.ts` 的 docstring，**没有**去改 `DESIGN.md`

## 完成判定

- TASK.md 中 `T-FIX-03` 已勾选：**是**（`状态:` 行改写，保留时间戳与判据依据）
- 六条 verify（①②③④⑤⑥）+ 四条护栏全过：**是**（输出见上，全部一手实跑）
- 提交 hash：**见本任务分支 tip**（代码 + 测试**同一个原子提交** R4.1；工件提交紧随其后）
- **G3 代码门本轮不召集**（与 `T-FIX-04/05/13/14` 同口径：本 change 的 4-dev task 集 G3 票已在上一周期收过；
  单条 post-6-review 的 T-FIX 走「SUMMARY + 出口派 5-test」，避免烧 run）。**若主审认为单条 T-FIX 也须过 G3，
  一句话即召集。**
- 出口：@测试验证（5-test）—— 建议本轮的判定点是**行为判据 ①②**（而不是 ⑤ 那条 grep），
  并请顺手对「已知未收口 1」定处置。
