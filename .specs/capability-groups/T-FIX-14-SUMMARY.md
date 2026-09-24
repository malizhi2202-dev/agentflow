# SUMMARY: T-FIX-14 — 接上 capability 的**第 4 套真相**（`AgentBuilder.tsx` 内联取值改消费 `capabilitiesOf`）

- **Change ID**: capability-groups
- **Task ID**: T-FIX-14（TASK.md **v10.4** · G4 第五轮 4/4 门结后由主审按 R14 直接派单，独立、不卡任何人工裁定）
- **完成时间**: 2026-09-24 10:17
- **AI 角色**: Dev（4-dev）
- **分支 / tip**: 起点 = 主审交付 tip **`0e8ee534`**（谱系含实现 tip `c7ca5bcd`）→ 本任务码提交 **`0e30fff2`**（分支 `agent/agent/32e8f858dcb6`，工件提交紧随其后）
- **R1.9 加载声明**：首轮读入 = 阶段契约 `kit-4-dev` SKILL（提示词类，整读）+ `references/templates-SUMMARY.md`（模板类，全读 **169 行**，超 150 行预算的只有它，其余 reference **0 行**）+ 本 change 的 `TASK.md` 相关节（按行读 `:240-251` + 元规则 `:62-79` grep 节）+ `STATE.md`（84 行全读）+ `REVIEW.md`（**未整读**，只 `grep -n "T-FIX-14\|O-13"` 命中 4 行后按行读 F18 行）。

---

## 做了什么（一段话）

`frontend/src/pages/AgentBuilder.tsx` 卡片渲染里自己写了一份取值 `(a.model_config_json && a.model_config_json.capabilities) || []`，**不过滤空串 / 纯空白 / 非字符串、不去重、不折叠连续空白** —— 它是同一条规则的**第 4 处实现**（后端 7 处内联 + `AgentControlPlane` 1 处 + 这里 1 处）。本任务按 action 把它换成 `import { capabilitiesOf } from '../components/capability/groupByCapability'` 并**直接调用**，本文件不再自带任何判断：`capabilitiesOf` 住在 helper `:28-39`（strip + 折叠连续空白 + 非字符串丢弃 + 非数组返回 `[]` + 按序去重），与后端 `capability_service.capabilities_of` 同契约（该契约本身由 `T-FIX-05` 落地、由 `capability-group.test.tsx` 14 条用例钉着）。

**改动 = 2 行**（新增 import + 替换 1 行取值，含一行「唯一具名规则住哪」的指路注释）。**未做**的事同样明确：没碰 helper 本体、没碰 `AgentControlPlane.tsx`（元规则 4 单写者）、没碰后端那 7 处内联（属 `T-FIX-01/02`，`02` 仍卡 O-10 人签）、没改任何测试文件与 `TEST.md`（单写者，F22 交 5-test）。

一处**必须给下游看的事实**：这次替换不是纯搬家，行为有变（下表实测）。变的正是 F18 要修的那三面 —— 空白变体不再自成一组/自挂一个空 chip，重复项去重，且**非数组字符串载荷原先会让整张卡片抛 `TypeError`**。前端从此只剩一处定义；「前端已平」这句话现在才成立（后端 7 处仍待 01/02）。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `frontend/src/pages/AgentBuilder.tsx` | 修改（本任务 `write_files` 唯一项） | `:5` 新增 `import { capabilitiesOf } from '../components/capability/groupByCapability';`；`:49` 内联表达式 → `var capabilities = capabilitiesOf(a);`（+1 行指路注释） |
| `.specs/capability-groups/T-FIX-14-SUMMARY.md` | 新增（工件） | 本文件 |
| `.specs/capability-groups/TASK.md` | 工件勾选 | `T-FIX-14` 的 `- 状态: [ ]` → `[x]`（verify 实跑通过后，R2.4），其余 14 条任务一字未改 |
| `STATE.md` | 状态行 | 「当前阶段 / 当前 task / 中断任务 / 产物」四行前置新值（元规则 4c 显式例外，见越界检查） |

`git diff --numstat`（代码，已提交前实跑）：`2 1 frontend/src/pages/AgentBuilder.tsx`。

## verify 输出（全部本会话实跑 · 非转述 · 非推导）

### ①② 【验收】二值判据（TASK 写明取值来源 tip `50d944d5`；我在**本次起点 tip `0e8ee534`** 重取了起点值，两 tip 同值 → 判据未漂移）

```text
# 改前（tip 0e8ee534，一手复跑）
$ cd frontend && grep -c "model_config_json.capabilities" src/pages/AgentBuilder.tsx
1
$ grep -c "capabilitiesOf" src/pages/AgentBuilder.tsx
0

# 改后
$ grep -c "model_config_json.capabilities" src/pages/AgentBuilder.tsx
0                      # 1 → 0 ✅（grep 无匹配时 exit 1，计数本身就是判据）
$ grep -c "capabilitiesOf" src/pages/AgentBuilder.tsx
2                      # 0 → ≥1 ✅（import 行 + 调用行）
```

### ③ 【护栏】`tsc --noEmit` 的 `grep -c "error TS"` **等于 32**（不是 ≥32；元规则 2 三件套写法）

```text
$ npx tsc --noEmit | grep -c "error TS"
32          # 改前 32 → 改后 32，未新增类型错误
# 本文件那 1 条既有错误仍在（改后 `AgentBuilder.tsx(108,131)`，改前 `:107,131`）：
# error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'
# —— 行号因新增 import 而下移 1 行，按元规则 4b 这只作提示、不作判据；内容锚 = `number | null` 那条，非本次引入。
```

### ④ 前端套件（元规则 3：`vitest run <pattern>` 必须同时断言用例数 ≥1）

```text
$ npx vitest run capability-group --reporter=basic
 ✓ src/__tests__/capability-group.test.tsx (14 tests) 162ms
 Test Files  1 passed (1)
      Tests  14 passed (14)        # 用例数 14 ≥ 1 ✅（pattern 命中真文件，不是 0 用例假绿）

$ npx vitest run --reporter=basic     # 全量前端
 Test Files  6 passed (6)
      Tests  66 passed (66)         # 改前基线 66/66 → 改后 66/66，无一条既有绿变红
```

### ⑤ 后端定向 + 全量（本任务零后端码，这一项是**「未扰动」的证据**，不是「已修复」的证据）

```text
$ cd backend && /home/malizhi/.venv/bin/python -m pytest tests/test_capability_groups.py -q
16 failed, 12 passed, 1 skipped, 130 warnings in 2.69s     # 与 tip 0e8ee534 基线逐条同名
$ /home/malizhi/.venv/bin/python -m pytest tests/ -q
57 failed, 146 passed, 7 skipped, 171 warnings in 6.77s
FAILED 分布：test_api_integration 28 · test_capability_groups 16 · test_edge_cases 6
           · test_agent_channel_supplement 4 · test_round6_api_edges 3
非 capability 的红 = 28+6+4+3 = **41 项**（派单要求「一条不许动」→ 实测同名同数，未动、也未顺手修绿）
```

### ⑥ 行为差异实测（一次性探针，脚本不落仓；消费点形状 = 页面里的 `capabilities.length > 0` 与 `capabilities.map(...)`）

```text
[""]                                  | 旧内联: shows=true  chips=[""]                          | capabilitiesOf: shows=false chips=[]
["   "]                               | 旧内联: shows=true  chips=["   "]                       | capabilitiesOf: shows=false chips=[]
["code-review"," code-review ",7,null] | 旧内联: shows=true  chips=["code-review"," code-review ","7","null"] | capabilitiesOf: shows=true chips=["code-review"]
["deep   research"]                   | 旧内联: shows=true  chips=["deep   research"]           | capabilitiesOf: shows=true chips=["deep research"]
{x:1}（非数组对象）                     | 旧内联: shows=false chips=[]                            | capabilitiesOf: shows=false chips=[]
"abc"（非数组字符串）                    | 旧内联: throws(TypeError)                              | capabilitiesOf: shows=false chips=[]
config 缺失 / config = null             | 旧内联: shows=false chips=[]                            | capabilitiesOf: shows=false chips=[]
```

判读：前 4 行就是 F18 的病本体（空 chip / 空白自成一组 / 重复项 / 内部连续空白），第 6 行是白捡的健壮性收口。**语义变更方向 = 向后端 `capabilities_of` 与 `AgentControlPlane` 已有行为靠齐**，不是新语义。

## 跨任务失败检查（R1.8 · LESSONS）

`test -f .specs/LESSONS.md` → **不存在**（连续第四次查仍无，`T-FIX-04/05/13` 三轮同此）。创建它落在本任务 `write_files` 之外 → 按 R6.5/R7.1 不自行新建，沿用同法：以 **TASK.md v10 元规则 1 / 2 / 3 / 4 / 4b / 4c / 4d / 5** + `T-FIX-05-SUMMARY` 的「下游判据影响」交接表 + TEST.md 的 O-1~O-15 作为失败库输入，逐条声明：

| 命中条目 | 声明 |
|---|---|
| **元规则 4b**（判据优先内容锚，行区间会漂） | 已查阅，本任务**全程按内容锚**执行与记账（`var capabilities = capabilitiesOf(a);`）；行号只作提示，且我自己在 ③ 里演示了它漂 1 行 |
| **元规则 3**（`vitest run <pattern>` 静默 0 用例 = 假绿） | 已查阅，④ 同时给出用例数（14 / 66），并按 pattern 命中真文件名 |
| **元规则 4**（`AgentControlPlane.tsx` 单写者串行） | 已查阅，本任务**未碰该文件**（TASK 边界明文禁止），因此与 `T-FIX-03/06/07/08/09` 无冲突 |
| **元规则 2**（跨任务共享判据 = 类型 + 未修态取值 + 取值来源 tip） | 已查阅，起点值我在**自己的 tip 上重取**（1 / 0），未照抄 `50d944d5` 的字面值 |
| **元规则 4d / 5**（采纳上游工件后必 diff 回看勾选；收账要勾账） | 已查阅，本次**未采纳、未覆盖任何上游工件全文**（只在 `0e8ee534` 之上追加）。勾前确认 `T-FIX-14` 该行原为 `[ ]`；勾后普查全表：`- 状态:` 行共 22 条，`[x]` 由 **3 → 4**、`[ ]` 由 **19 → 18**，`git diff` 实测该文件**只有 1 行变化**（`git diff -U0` 全量列出 = 我那一行），未静默吃任何既有勾选 |
| **`T-FIX-05-SUMMARY` 下游判据影响表** | 已查阅，其行号漂移只涉及 `AgentControlPlane.tsx` 与 `OverviewCards`/`AgentRow`；本任务靶文件不同，判据不引用其区间 |
| **`T-FIX-13` 的红名单**（FR1 15 条 + FR2 归一 1 条属 01/02） | 已查阅，本次确认仍适用 → 所以**一条都不碰**（⑤ 实测 16 条同名仍红） |

R1.6 反重复检查：本任务是**首次**做 `T-FIX-14`（无 PROGRESS、无重试），不存在「与第 N 次失败的差异」问题。

## 沿用既有抽象 grep（R6.4 / 1.4）

```text
# 能力：capability 取值归一规则 —— 找到了，沿用，不另起第 5 份
$ grep -rn "capabilitiesOf" frontend/src
frontend/src/components/capability/groupByCapability.ts:28:export function capabilitiesOf(agent: CapabilityCarrier | null | undefined): string[] {
frontend/src/components/capability/groupByCapability.ts:55:    const caps = capabilitiesOf(agent);     # helper 内部唯一消费者（分组）
frontend/src/__tests__/capability-group.test.tsx:9:…from '../components/capability/groupByCapability';
frontend/src/pages/AgentBuilder.tsx:5,49                                                            # 本次新增的两处

# 既有 import 写法（同一 helper 的另一消费者）→ 沿用同一相对路径形式
$ grep -n "groupByCapability" frontend/src/pages/AgentControlPlane.tsx
11:import { groupByCapability, groupKeyOf } from '../components/capability/groupByCapability';

# 前端「自带判断」残留 —— 收口证据
$ grep -rn "\.capabilities) || \[\]\|get(\"capabilities\"\|get('capabilities'" frontend/src | wc -l
0
$ grep -rn "model_config_json.capabilities" frontend/src
frontend/src/components/capability/groupByCapability.ts:25   # 仅剩 helper 的文档注释（规则定义处本身）

# 后端同类内联（不属本任务，属 T-FIX-01/02）
$ cd backend && grep -rn 'get("capabilities"' --include='*.py' routes/ services/ | grep -v capability_service.py | wc -l
7        # 未动。「前端已平、后端未平」是本次交付后的准确现状态，别被本任务标题误读成全仓已平
```

新代码 0 份：本任务只做「接上」，未新增抽象、未新增文件、未新增依赖（package.json 未变）。

## 6 维自查（步骤 4 · 生产代码改动必填）

### 🟢 R1 认知过载：本次让卡片更易读，不是更难
**Symptom**：卡片渲染函数 `agents.map(function(a) { … })` 本来就长（`:47-105`）。
**Source**：`git diff --numstat` = `2 1`，分支与嵌套未增加。
**Consequence**：读代码的人不需要再在此处重建「空串/空白算不算能力」的规则。
**Remedy**：无需处置（净删判断、净加一次调用）。

### 🟢 R2 变更传播：0 越界、0 连带
**Symptom**：跑测试会写被 git 跟踪的 `frontend/node_modules/.vite/vitest/results.json`（`node_modules` 被跟踪是仓内既有事实）。
**Source**：`git status --short` 曾出现该 M 行。
**Consequence**：不处理就会把「跑过测试」的缓存混进任务 diff，污染 R6.5 判据。
**Remedy**：已 `git checkout --` 还原，未入库（`git status` 现仅 `M frontend/src/pages/AgentBuilder.tsx`）。

### 🟡 R3 知识重复：**这是本任务的正面项，也是它没做完的那一半**
**Symptom**：同一条 capability 规则曾有 4 处实现；本次收掉第 4 处，**后端仍有 7 处内联**。
**Source**：见上节 grep（后端计数 = 7）。
**Consequence**：若有人把「T-FIX-14 完成」读成「单一真相达成」，就会在 `T-FIX-01/02` 未落地的情况下继续往第 8 处加代码。
**Remedy**：已知接受（不属本任务 `write_files`，去修即 R6.5 越界）；修法早已落在 `T-FIX-02`（建 `capability_service.py` 唯一入口）→ `T-FIX-01`（消费它），队列头卡 **O-10** 人签，不卡工件。

### 🟢 R4 偶然复杂：没有为「以后」加东西
**Symptom/Source**：未新增 props、未新增可选参数、未新增配置项、未新增包装函数。
**Consequence/Remedy**：无处置项。

### 🟢 R5 依赖方向：`pages/ → components/capability/` 正向
**Symptom**：页面 import 组件层 helper。
**Source**：`AgentBuilder.tsx:5`；helper 头部注释自陈「纯函数，无 React / store 依赖」。
**Consequence**：无反向依赖、无环；helper 因此仍可直接 unit（14 条正在跑）。
**Remedy**：无需处置。

### 🟢 R6 领域扭曲：载荷形状变了但领域词没变
**Symptom**：变量名 `capabilities` 保留（领域词），其类型从 `any` 收紧为 `string[]`。
**Source**：`groupByCapability.ts:28` 返回签名 + `tsc` 计数 32 未变（两处消费点 `:58/:96` 无需断言即通过）。
**Consequence**：非数组载荷不再流进渲染路径（⑥ 第 6 行原先抛 `TypeError`）。
**Remedy**：无需处置。

### 已知接受 + 理由（🟡）
- **本任务未附带任何测试改动（R4.2 / R4.3 字面要求）**。理由：`write_files` 只有 `AgentBuilder.tsx`，加测试必须**新建**文件 → R6.5 越界、R7.1 扩范围；规则**本体**已被 `capability-group.test.tsx` 14 条（含归一 7 条）钉住，本次未改规则语义，只改「谁调用它」。**已把补齐判据写清交给 5-test**（见「是否触发新工作」），我不越权自建。
- **后端 7 处内联**（上面 R3）：属 `T-FIX-01/02`，卡 O-10 人签，不卡本工件。

### 已知小问题（🟢）
- 本文件沿用既有 `var` + ES5 风格函数写法（与全页一致），未顺手 modernize（那是另一条 task 的活）。
- `AgentBuilder.tsx` 仍有 **1 条既有 TS 错误**（`number | null` → `number`，见 ③），它是 `tsc=32` 基线的一部分，不在本任务边界内。
- `:49` 上方我加了一行「唯一具名规则住哪」的注释，指路用；如 5-test 或主审认为该注释多余，删掉不影响任何判据。

## 数据库迁移（R4.5 / 1.7）

**N/A** — 零 schema 变更、零 ORM/entity 触碰、零 `*.sql`。`git diff --name-only` 可复核（只有 1 个 `.tsx`）。

## 破坏性变更（R4.6 / 1.8）

**判定：四条全未命中** → 不走反问协议，但仍贴引用图（1.8.1 精神）。

- [ ] 删除既有代码 ≥ 5 行 —— 实删 **1 行**（numstat `+2 −1`，那 `-1` 是被替换掉的内联表达式行）
- [ ] 改公共导出 —— 本任务未改任何导出符号；`capabilitiesOf` 是被消费方，签名一字未动
- [ ] 改公共 API —— 零 HTTP/GraphQL 变更（纯前端渲染层）
- [ ] 删除文件 / 重命名导出符号 —— 无

```text
被替换的符号：文件内局部表达式（原 AgentBuilder.tsx `:48`，非导出）
直接调用点：无（它不是函数，只是一处内联求值）
本文件的消费者（grep -rn "AgentBuilder" frontend/src）：
  - frontend/src/App.tsx:21   import AgentBuilder from './pages/AgentBuilder'
  - frontend/src/App.tsx:236  case 'agents': … <AgentBuilder onSelect={…} />
    → 唯一 prop 是 onSelect，不读 capabilities → 无调用点受影响
间接影响：无。渲染结果差异见 ⑥ 实测表（4 类输入行为变化 + 1 类不再抛错）
```

**回归覆盖**：规则侧 = `capability-group.test.tsx` 14 绿（含归一 7 条）；接线侧（`AgentBuilder` 真的用上了它）= **当前无用例**，只有本 SUMMARY 的两条 grep 计数 → 已列为给 5-test 的补口，见下节。

## 越界检查（R6.5 / 步骤 5）

```text
✅ 越界检查（R6.5）：
  - TASK 声明的 write_files：1 项（frontend/src/pages/AgentBuilder.tsx）
  - 实际代码 diff 涉及：1 项（git diff --name-only HEAD 全量列出，同一项）
  - 越界：0
  - 明确未碰：frontend/src/pages/AgentControlPlane.tsx（派单禁动）
             frontend/src/components/capability/groupByCapability.ts（helper 本体，只 import）
             backend/**（一条红未动）· frontend/src/__tests__/** · .specs/capability-groups/TEST.md（单写者，F22）
  - 跑测试造成的缓存改动：frontend/node_modules/.vite/vitest/results.json → 已 git checkout -- 还原，未入库
```

工件类写入按 **元规则 4c**（`STATE.md` 是显式例外，更新状态行不算越界但须在此记账）：本 SUMMARY（新增）+ `TASK.md` 仅 `T-FIX-14` 的 `- 状态:` 一行 + `STATE.md` 四行状态前置。三者都不是代码，不与其他任务的 `write_files` 争写权。

## 决策与偏离

1. **TDD 例外（步骤 2）明示**：未先写 RED 用例。原因是 RED 用例必须落在 `src/__tests__/` 新文件里，而 `write_files` 不含它 —— 自我授权新建 = 同时踩 R6.5 与 R7.1。我改为**跑既有规则用例（14 绿）+ 行为差异实测（⑥）**，把「接线级断言」作为建议交测试阶段（他们拥有测试文件写权与 `TEST.md` 单写者身份）。
2. **验收按内容锚而非行号**（元规则 4b）：action 原文写「`AgentBuilder.tsx:48`」，并附「行号以锚为准」；起点 tip 上该表达式实测在 `:48`，我改后文件行号整体 +1，判据全部走 `grep -c`，不依赖行区间。
3. **未采纳/覆盖任何上游工件**：只在 `0e8ee534`（v10.4 tip）之上追加，因此元规则 4d 的「静默吃勾选」风险本次不存在；仍按 4d 复查了 15 条 T-FIX 勾选。
4. 未偏离 action 的任何字面要求：helper 未改、判断未保留、无附带重构。

## 是否触发新工作

- [ ] 触发新 fix-plan 追加进 `TASK.md` —— **否**（未新增任务；`T-FIX-14` 是最后一条不卡人的）
- [x] **交 5-test 的两件事**（不属我写权，写在这里交接）：
  1. **F22 三件**照既有豁免单刷 `TEST.md`：`:54` 归因行 + 声明行 + 定向数（现值 = 16 failed / 12 passed / 1 skipped / 29，本轮实测未扰动）。
  2. **（建议，非判据）**补一条接线级用例锁住「第 4 套真相不再回来」：渲染 `AgentBuilder` 并喂 `model_config_json.capabilities = ["   "]`，断言**不出现空 chip 与「加载记忆」按钮**；喂 `["a", " a "]` 断言只有 1 个 chip。它能把本任务的两条 grep 判据升级为行为判据（现在这两条只有工件在管）。
- [ ] 发现需求/设计问题需开新 CHANGE —— **无**。`REQUIREMENT.md` / `DESIGN.md` 一字未改（R3.2）。
- **一条账面观察，交主审/5-test 核（我不代改）**：`STATE.md` 把 `T-FIX-00` 记为「✅ 本阶段闭环」，而 `TASK.md:123` 该任务的 `- 状态:` 仍是 `[ ]`。按元规则 4d 的口径这正是「读 `[ ]` 的人会把它再派一次」的形状；它属 5-test 的勾选，越界，故只报不修。
- **队列现状态**：4-dev 手上不卡人的任务已清空 → `T-FIX-02 → 01` 等 **O-10** 人签（C2 地雷已在 v10.2 拆，签了即可直接派）；O-9 / O-11 / O-14 / O-15 仍挂人工。**R2.5 与 R15.2 未被本次交付解除**：本工件说的是「第 4 套真相接上了」，不是「安全已可集成」。

## 完成判定

- TASK.md 中 `T-FIX-14` 已勾选：是（`- 状态: [x]`，时间戳 2026-09-24 10:17；`[x]` 普查 3 → 4，其余 21 条状态行逐字未变）
- 提交 hash：代码 **`0e30fff2`**（`fix(capability-groups): T-FIX-14 …`）；工件提交 = 紧随其后的 `docs(capability-groups): T-FIX-14-SUMMARY …`（两个 sha 在出口评论里一并给出）
- 起点谱系：`0e8ee534`（G4 第五轮 4/4 门结 tip，未并 main）
- **G3 代码门本轮未召集**（与 `T-FIX-04/13` 同口径：本 change 的 4-dev 票已在上一周期收过，单条 T-FIX 走「SUMMARY + 出口派 5-test」；主审若要单条过 G3，一句话即可）。出口 = @测试验证（5-test）。
