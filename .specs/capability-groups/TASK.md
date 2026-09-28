# capability-groups — 任务拆解

> 对应 REQUIREMENT.md v1.0

## 任务列表

### T1: 后端 — Agent capability 过滤
- 修改 `backend/routes/agents_api.py` 的 `api_list_agents`
- 新增 `capability` 查询参数
- 过滤逻辑：检查 `model_config_json.capabilities` JSON 数组是否包含指定 capability
- 可与 `domain_id` / `status` 组合使用
- 状态: [ ]

### T2: 后端 — 域内能力列表端点
- 修改 `backend/routes/domain_api.py`
- 新增 `GET /api/domains/{id}/capabilities`
- 查询该域内所有 Agent，提取 `model_config_json.capabilities`，去重返回
- 状态: [ ]

### T3: 前端 — capability 组组件
- 新增 `CapabilityGroupRow` 组件
- Props: domainKey, capability, agents[], isExpanded, onToggle
- 显示：组名、Agent 数量、健康概要 (N healthy / M total)、展开/折叠箭头
- 展开后显示 Agent 实例列表（复用现有表格样式）
- 状态: [ ]

### T4: 前端 — DomainTreeTab 三层树
- 修改 `DomainTreeTab` 组件
- 新增 `expandedGroups` state（Set<string>）
- 域展开后：按 Agent 的 capabilities 自动分组
- 无 capabilities 的 Agent → "未分类" 组
- 每个能力组用 `CapabilityGroupRow` 渲染
- 状态: [ ]

### T5: 后端测试
- 创建 `.specs/capability-groups/test_backend.py`
- 测试 capability 过滤
- 测试 capabilities 端点
- 测试跨模块兼容性
- 状态: [ ]

### T6: 前端测试
- 浏览器验证三层树展开
- 验证能力组渲染
- 验证健康概要计算
- 验证零 JS 错误
- 状态: [ ]

### T7: 跨模块验证 + TEST.md
- 验证现有端点仍然工作
- 验证 TypeScript 编译无新增错误
- 编写 TEST.md
- 状态: [ ]

---

## 修复任务（6-review 产出 · 2026-09-23）

> 来源：`@.specs/capability-groups/REVIEW.md`（F1-F16 · **v2**）。Reviewer 未改任何代码（R3.3）。
> 执行回 `4-dev`；**T-FIX-00 是回退任务（5-test），完成前本 change 不得重进 6-review**。

> **两条元规则（v5 · G4 资深测试工程师 ②③ 提出；主审自跑确认后写死在此，约束本段每一条）**
> 1. **靶文件边界**：verify 里每个被 grep / pytest / vitest 打靶的文件，**必须出现在该任务的 `write_files` 里**。缺落点 = 守边界则 verify 必不过、过了就是越界（R7.3/R6.5）。**v7 · G4 Master ② 扩展：这条同样管 `action` 里要求修改的文件**，不只管 verify 的靶文件 —— 连续两轮栽在同一面（`T-FIX-01/02` 要求前端归一却无前端落点、`T-FIX-03` 三条行为断言没有 runner 与测试文件）。写法上就是：**action 点名改哪个文件 / 判据跑哪个命令，那个文件就必须出现在 `write_files`**。
> 2. **每条 verify 标类型 + 取值来源 tip**（v9 · 测试验证请求升格为通用条款：`T-FIX-00` verify ② 的「定向套件通过」措辞歧义**已被 4-dev 第二次撞到**）：**凡跨任务共享的判据，一律写成「类型标注 + 未修态取值 + 取值来源 tip」三件套**，并在**未修代码上实跑一遍**记下取值（否则读的人分不清有没有门槛）：
>    - **【验收】** 必须**现在为假、修后为真**（今天实测：`aria-expanded` = 0；`var(--s*)` = 0；`CapabilityGroupRow` 区间硬编码 = 6；卡片样式 = 7；`collect-only -k capab` = 无用例）
>    - **【护栏】** 必须**两个时点都为真**（如 `tsc` 的 `grep -c "error TS"` **=32**、新测试文件内 `MagicMock` 命中 **=0**）
>    - **【回归信号】**（**v15 新增 · F27 的落地形式**，首个实例 = `T-FIX-03` 判据⑤）**grep 计数型写法判据**：它形式上「现在为假、修后为真」（像【验收】），但**判据本身可以在缺陷存活时为真** —— 同义改写即绕过（实测：`a.health` 改写成 `(a as any)['health']` 后该计数 = 0，而幽灵字段仍在）。⇒ **不得单独构成验收依据**，只作交接期的廉价回归信号；**凡标【回归信号】的卡，其验收结论必须另有行为判据支撑**（本 change 的行为判据 = `vitest run <测试文件>` 的用例数与结果）。标错类型的代价正是这条规则要治的病：读的人以为「计数归零 = 缺陷已修」。证据见 `TEST.md` §1.11 的 M1/M2 双变异。
>    ⚠️ 反例（本段 v3/v4 真犯过）：`grep -c "<div onClick"` 要求为 0，而**今天就是 0** —— JSX 把 `<div` 与 `onClick=` 拆在 `:412/:413` 两行，该字节串根本不存在 → 零门槛。> 每条含 `verify`（R2.3）。`write_files` 之外的改动须先更新本 TASK 或开新 CHANGE（R7.1）。
> 3. **命令型判据必须能区分「跑了 0 条用例」与「跑过了」**（v8 · G4 Master 前看提醒）：`vitest run <pattern>` 按**文件名子串**过滤，改名或漏建 → **静默 0 用例 = 假绿**。凡用 `run <pattern>` 的判据（`T-FIX-03`/`05`/`06`）须**同时断言用例数 ≥1**（把输出喂给 `grep -E "Tests +[0-9]+ passed"` 并要求非空），或在 TEST.md 贴出该命令的用例行数。pytest 侧同形问题已由 `--collect-only -k capab` 覆盖。
> 4b. **行号锚点在共享文件被改动后会漂移 → 判据优先内容锚，不用行区间**（v9 · 4-dev 在 `T-FIX-05` 后报回，主审在 `50d944d5` 一手复现）：`AgentControlPlane.tsx` 1428 → **1372 行**之后，`T-FIX-03` 判据⑤ `sed -n '74,75p' | grep -c "a\.health"` **打印 0 → 判据「已满足」，而幽灵字段活得好好的（现居 `:76-77`）** —— 我 v8 刚立元规则 3 治假绿，自己这条却成了新假绿。同类漂移：卡片行 `:79-82` → **`:81-84`**；`status === 'healthy'` 仍 **4 处**但行号为 `:36/:158/:159/:1081`；`:1137→:1081`；`:34→:36`。**规则**：判据写成全文件 `grep -c "<内容>"`；确需区间时先 `grep -n` 重定位，把区间当提示而不是判据。
> 4c. **`STATE.md` 是元规则 1 的显式例外**（v9 · O-8，两处同证：4-dev `T-FIX-04`、5-test 第 2 轮）：不要往 14 条任务的 `write_files` 里各塞一份 `STATE.md`（那会让任务互判越界）；更新状态行**不算越界**，但必须在各自 SUMMARY 的「越界检查」里记账 —— **别让「守边界」和「写状态」互相否证**。
> 4d. **采纳上游工件后必须 diff 回看本分支已完成勾选**（v10 · 4-dev 报回，`c7ca5bcd` 提交说明实证）：把 `TASK.md` 整份采纳成上游版本时，**上游没有而本分支有的 `[x]` 会被静默抹回 `[ ]`、毫无报错**（v9 写在无勾选的 `a28e816f` 上，采纳即吃掉 `T-FIX-04/05` 的已完成状态）。静默回退 = 把已完成任务重新派出去。规则：采纳后立刻 `git diff <采纳前tip> HEAD -- .specs/capability-groups/TASK.md | grep '^-.*\[x\]'`，被抹的勾选必须显式恢复并在提交说明记账。
> 5. **增补审查必须逐条勾账上游产物里写「登记/入账」的 Remedy 行**（v10.1 · 领域专家 ❌ 票，`78117a1e` 实证）：上游 SUMMARY/交口的 6 维段里每一条自称「登记为口径项 / 写进账本 / 拆两行等人裁」的内容，主审收 delta 时**必须逐条在 REVIEW 账本找到落位并 grep 复核** —— 本次 `T-FIX-13-SUMMARY` 🟡R6 明写「登记为 O-11 同族口径项」，v10 只收了凭据半边、计数半边 `grep '份额'` = 0 静默失踪，被领域专家 ❌ 抓正着。与 4d 同族：**4d 防工件被静默回退，5 防主审收账静默漏项** —— 都是「上游明明写了，下游悄悄没了」。核验式：对上游每处「登记/入账」字样，账本对应行可 grep 到。
> 4. **同一个文件被多条 T-FIX 改到时必须串行 / 单写者**（v8 · Master 前看提醒）：`AgentControlPlane.tsx` 同时是 `T-FIX-03/05/06/07/08/09` 六条的靶文件；并行分派会互相覆盖，且 R6.5 的「diff 只含本任务文件」边界判据在两份改动上**必然各判对方越界**（假红）。派单顺序见下。
> **v3 变更（G4 资深测试工程师 ❌ + 架构师 ✅带 6 条修订，逐条实测后接受）**：本段整体重写成**可交接**的。修的是八类：①`T-FIX-00` 落点与 verify 互斥（无 pytest 配置，`pytest tests/` 收不到 `.specs/`）→ 测试改落 `backend/tests/test_capability_groups.py`；②全量基线实测 **41 failed/134 passed/6 skipped** → 所有 verify 改**定向**，并写明为什么不跑全量（防 R5.3 削弱断言 / R7.1 顺手修绿）；③`capability_service.py` 由 01、02 共同「新建」→ R7.3 冲突，改由 **02 建立、01 消费**并给出顺序；④F6 根因**我写错了**（间距/圆角 token 存在且被 0 使用，非"不存在"）；⑤verify 里所有 `≥1`/`较 X 下降`/`不再…` 非二值判据 → 换成 awk 区间 + 等值判定；⑥用例补正向锚点与边界（含 `?capability=` 空串语义二选一、`" code-review "` 归一化、`domain_id`/`status` 组合），FR3-FR5 依赖 T-FIX-05 抽纯 selector 才有 unit 落点 → 排到 T-FIX-00 之前；⑦安全类修复须**先**让身份层 fail-closed，否则 admin 旁路在默认路径上是空操作（架构师 ④ 时序陷阱）；⑧T-FIX-13 的拒绝状态码按 `CLAUDE.md` 约定改 **404**（v2 写 403 违反项目约定），并撤回 v2 顺手新建的 `domain_scale_service.py`。
> **v4 变更（G4 领域专家 ❌，第 4 票）**：**`T-FIX-03` 整条重写** —— v3 版是**破坏性任务**（会把现在正确的 `:156-1137` 改成恒假，且它的 verify 会被这次改坏所满足 → 假绿），v4 标为「禁止按 v3 执行」并改为「喂数据看行为」；`T-FIX-01/02` 纳入**前端第三套真相**（F18）；`T-FIX-12` 追加 4 条议题（术语表缺口 / `dead` 告警永不触发 / `AgentProbePanel` 5 处幽灵字段 / services↔engine 定序）。F19/F20/F15 属**需求侧**，只登记为待人工裁定第 6/7/8 条，**不进任何 T-FIX**（R3.2）。

> **v5 变更（G4 资深测试工程师 ❌复核 + 安全审计师 ✅带 3 条，逐条实测后接受）**：① `T-FIX-00` 的 `_quick_test.py`、`T-FIX-05/06` 的前端测试文件**补进 `write_files`**（此前 verify 打靶了不可写的文件 → 守边界则必不过，R7.3）；② `T-FIX-06` 的 `<div onClick` 归零判据**删除**（今天实测就是 0，零门槛）；③ 全部 verify 标 **【验收】/【护栏】** 并附**未修态实测值**；④ `T-FIX-13` 的 verify **由判密文改为判明文**（`encrypt()` 每次新 nonce → 旧判据可在凭据仍被盗用时变绿，主审实跑确认）；⑤ `T-FIX-04/13` 的「身份层 fail-closed 先行」由**前置改为结论**（用例今天就可写，不阻塞这条 🔴）；⑥ `T-FIX-03` 的 `status === 'healthy'` 计数归零形式**禁止使用**（今天 =4，含唯一正确的 `getHealthLabel:34` → 只能靠改坏正确代码通过）。

**未修态基线（v5 跑齐 · **v9 重取**：取值来源 tip `0726c73b`（后端）/ `50d944d5`（前端）。4-dev 串行改动会让行号与计数漂移 → 引用前先按**元规则 4b** 重定位；未标注者仍为 v5 原值，供实现者对照「现在为假」）**

| 判据 | 今天实测 | 修后要求 | 类型 |
|---|---|---|---|
| `pytest tests/ --collect-only -q -k capab` | `no tests collected (181 deselected)` | 列出新用例 | 【验收】 |
| `grep -c assert _quick_test.py` | 0 | >0 或加「非回归基线」标注 | 【验收】 |
| `grep -c "aria-expanded" AgentControlPlane.tsx` | 0 | ≥1 **+ 真实键盘用例** | 【验收】 |
| `grep -A1 "<div$" \| grep -c onClick` | 6 | 0 | 【验收】 |
| `grep -c "<div onClick"` | **0（故作废）** | —— 不得用作判据 | ⚠️ 假判据 |
| `grep -c "a\.health" src/pages/AgentControlPlane.tsx`（**v9：原 `sed -n '74,75p'` 行区间版已证实是假绿 —— 区间现打到 `function OverviewCards…`，打印 0 而 `a.health` 住在 `:76-77`**；见 `T-FIX-03` 判据⑤。**v15 终态取值已由 4-dev/5-test 各自实跑确认为 0**，但本行的**类型在 v15 由【验收】改标【回归信号】** —— 原因：同义改写可让它归零而缺陷存活，见元规则 2 第三类与 §1.11 的 M1） | 2 | 0 | 【回归信号】 |
| `grep -c "status === 'healthy'"` | **4**（含 `:34` 正确映射） | —— 不得归零 | ⚠️ 假判据 |
| `awk '/function CapabilityGroupRow/,/^}$/' \| grep -cE "(gap\|padding\|margin): [0-9]+px\|borderRadius: [0-9]+"` | 6 | 0 | 【验收】 |
| 同区间 `grep -c "boxShadow\|border: 1px\|borderRadius"` | 7 | 0 | 【验收】 |
| `grep -cE "#fff\b\|#ffffff\b" AgentControlPlane.tsx` | 6 | 0 | 【验收】 |
| `grep -c "var(--s[0-9]\|var(--r-" AgentControlPlane.tsx` | 0 | >0 | 【验收】 |
| `grep -rn 'get("capabilities"' backend/`（全口径） | 7 | 1 —— 即 `capability_service.py` 内部那处；**`T-FIX-02` verify ① 用 routes+services 且排除该文件 → 目标 0，两口径差的正是这 1 处**（v7 · Master ①） | 【验收】 |
| `groupByCapability` 对 `capabilities:[""]` 的行为（v6 · 领域专家残留 3） | 今天 `:588-592` 不过滤 → 产出一个**空名分组** | 无空名分组、落 `未分类` | 【验收】 |
| `grep -c "model_config_json.capabilities" src/pages/AgentBuilder.tsx`（v9 · `T-FIX-14`） | 1 | **0** | 【验收】 |
| `grep -c "capabilitiesOf" src/pages/AgentBuilder.tsx`（v9 · `T-FIX-14`） | 0 | **≥1** | 【验收】 |
| `grep -A1 "<div$" src/components/capability/CapabilityGroupHeader.tsx \| grep -c onClick`（v9 · `T-FIX-06` 按文件拆分后） | 1 | **0** | 【验收】 |
| 页面 `AgentControlPlane.tsx` 同式计数（**v9：已不属于任何任务判据**，记此防止被读成漏做；5 + 上面 1 = 6 与 v5 总数自洽） | 5 | 不动（与 F15 同批登记不修） | 非判据 |
| `tsc --noEmit` 的 `grep -c "error TS"` | 32 | **=32**（不是 ≥32） | 【护栏】 |
| `pytest tests/ -q` 全量 | 41 failed / 134 passed / 6 skipped（**主审跑的量，Master 未复跑、只 `--collect-only` 得 181 与之自洽** → TEST.md 第 1 轮第一行须贴全量真实输出，让这个数有来源） | 不要求变绿 | 【护栏·基线】 |
### T-FIX-00: 回 5-test — 补 `TEST.md`（5 轮金字塔）+ capability 回归 🔴门禁
> **v3 重写**：v2 版**不可交接**（G4 资深测试工程师 ❌①②③ + 架构师 ④⑤ 共同判定，主审逐条实测后接受）。三处硬伤：`write_files` 与 `verify` 互斥、指向的测试口径抓不住本 bug、用例全是反向断言缺正向锚点。

- **read_files**: `.specs/capability-groups/REQUIREMENT.md`, `DESIGN.md`, `REVIEW.md`（§2.4 + FR1 复现记录）
- **write_files**: `backend/tests/test_capability_groups.py`（**新建，与既有 7 个文件同级 → 才可被 pytest 收集**）, `.specs/capability-groups/TEST.md`, `.specs/capability-groups/_quick_test.py`（**v5 补落点**：verify 打靶它就必须给它写权限 —— G4 测试 ② 指出 v3/v4 缺这条）
- **落点纠正（R2.3/R7.3/R6.5）**: v2 把测试写到 `.specs/capability-groups/test_backend.py` 而 verify 跑 `pytest tests/` —— 实测**仓库根与 `backend/` 都没有 pytest 配置**（`pytest.ini`/`pyproject.toml`/`setup.cfg`/`conftest.py` 全不存在），`pytest tests/` **永远收集不到** `.specs/` 下的文件：守 `write_files` 则 verify 必不过，verify 过了就是偷偷越界写了 `backend/tests/`。根因在需求侧：`CHANGE.md:26` 把测试文件放进 `.specs/`（那是知识产物目录，不是运行目录）→ **该交付物路径由本任务的 `backend/tests/test_capability_groups.py` 取代**，需在 CHANGE 侧注明（改 CHANGE 属 R3.2 → 交人工拍）
- **测试口径必须钉死（G4 测试 ②，否则对 FR1 必然假绿）**: 新建用例**必须走真实 SQLAlchemy session**（`DATABASE_URL` 可 env 覆盖，`backend/database.py:6-8` 支持 sqlite），断言**返回的行集合**。
  **禁止** mock `db.query` 链、**禁止**依赖活服务。理由（实测）：`backend/tests/test_api_integration.py:17` 的 `_mock_db()` 是 `MagicMock(spec=Session)`、`:29` 在**模块级**挂 `app.dependency_overrides[get_db]` → 谓词从不落到真 SQL；`test_agent_channel.py:349,354` 另一路 `urlopen` 打 `127.0.0.1:8800` 活服务。**照这两种"现有风格"写，当前这个 `contains()` 实现也会变绿**，等于给真 bug 补假证据。
  核对：`grep -n "MagicMock" backend/tests/test_capability_groups.py` **无命中** + 不得有 `urlopen`/`8800`
- **RED 先行（R4.4/R6.3，这条同时定义 F1 什么才算补上）**: 贴出反例用例在 **T-FIX-01 之前失败**的输出，原文进 TEST.md 第 1 轮
- **用例下限（G4 测试 ③，R5.1 从 AC 派生；v2 只给了 3 条反向，不够）**:
  - FR1 **≥8 条** = 3 条反向（跨 key 假阳性 / `_` 通配符 / `%` 绕过）+ **≥1 条正向锚点**（真有能力的那条**必须**被返回 —— 缺它则「过滤器永远返回 0 条」也能全绿）+ **≥3 条边界**：`capabilities` 非 list（字符串 / `null`）；`?capability=` **空串**（现 `if capability:` 直接跳过过滤，与「返回 0 条」是两种语义，**须择一**并写进 TEST.md）；`" code-review "` 前后空格（配合 T-FIX-02 归一化）
  - FR1 第二句「可与 `domain_id` 组合」**无用例撑着**：`?capability=` × `domain_id`（含 `domain_id=0` 的 `IS NULL` 支与非 0 支各 1 条）× `status` 组合 ≥3 条。⚠️ REVIEW 第一轮给 `:29-35` 的那个 ✅ **只是读代码判出来的**，本轮起它是有用例的，否则该 ✅ 撤回
  - FR2 **≥2 条**：契约形状 `{domain_id, capabilities}` + 去重；实现多出的 `domain_name` 属 additive，**须被断言固化**而不是被 `print` 过
  - NFR2 **≥1 条**回归：现有端点/参数行为不变
  - 安全负例（G4 测试 ①/安全 ⑤）：**至少一条以非 admin 身份跑**并断**跨 owner 负例**（含 T-FIX-04 的「**即使调用者是域 owner** 也读不到域内他人 Agent」、T-FIX-13 的「无法 mint 他人凭据」）
  - FR3/FR4/FR5：分组逻辑内联在 1428 行的 `AgentControlPlane.tsx:585-605`，不抽纯函数就只能退回 UAT → **标注「依赖 T-FIX-05 抽出纯 selector 后 unit，否则记 UAT 并写明人工步骤」**，且 **T-FIX-05 排在本任务之前或同波**，否则 FR3-FR5 注定又是零证据
- **⚠️ 全量基线本就是红的（G4 架构师 ⑤，实测）**：`cd backend && python -m pytest tests/ -q` → **41 failed / 134 passed / 6 skipped**（`test_api_integration` 28 个 + `test_edge_cases` 7 个 + `test_round6_api_edges` 的 ChatService 三个；前两类是 mock `Session.execute` 返回 `MagicMock` 后迭代直接抛 `TypeError: 'int' object is not iterable`，第三类是 `chat_service` 漂移后测试没跟）。**不写进契约，下一轮实现者会「顺手修绿 41 个既有失败」（= R7.1 范围失控），或反过来削弱断言让自己的用例通过（= R5.3）**。故所有 T-FIX 的 verify 一律用 `pytest tests/test_capability_groups.py -q` **定向**判定，全量数只作对照
- **`_quick_test.py` 不作基线（G4 安全 ⑤）**: 实测全文 **0 个 `assert`**、身份写死 `X-User-Id: admin`（`:6`）、末尾**无条件** `print("=== All backend tests passed! ===")`，唯一像检查的 Test 5 也只是打印 → 这种姿势写的回归**结构性看不见越权**。要么改身份可注入 + 真断言，要么文件头显式标「**非回归基线**」。禁止把它的输出当任何 verify 的证据
- **TEST.md**: 声明 5 轮状态，跳过的轮次给理由（R5.4）；第 4 轮（兼容）须记 MySQL 的 JSON→text 隐式渲染问题（架构师加权：`contains()` 在 MySQL 上序列化是否带空格随版本变，**不只是语义错，还不可移植**）
- **verify（v5 标类型 + 附未修态实测值）**: ① **【验收】** `cd backend && python -m pytest tests/ --collect-only -q -k capab | tail -1` 能列出新用例（今天实测 `no tests collected (181 deselected)`；用例名须含 `capab`）；② **【验收·修复后】** `cd backend && python -m pytest tests/test_capability_groups.py -q` —— ⚠️ **v9 拆掉「定向通过」这个不可判定措辞**（4-dev 在 `T-FIX-04` 第二次撞上：该文件按设计就有红，「通过」二字无从判定）。现在只写数：**在 `0726c73b` 上 = `18 failed / 10 passed`（共 28 条）**；每条 T-FIX 只做两件事 —— 让**属于本任务 AC 的那几条红转绿**（转绿条数须等于该任务 action 点名的 AC 数），并保证**其余红一条不减、护栏绿不得变红**（红数自己少了而本任务没碰它 = 动了别人的靶，R7.3）。全量必须仍是 `59 failed / 144 passed / 6 skipped`（165 项既有红与本 change 无关，见 §2.0）；③ **【护栏】** 该新文件内 `MagicMock` / `urlopen` / `8800` 三种命中数均为 **0**（`grep -n` 逐个查）；④ **【护栏】** TEST.md 第 1 轮**第一行贴 `pytest tests/ -q` 的全量真实输出**，让 41/134/6 这个基线**有来源而不是断言**（G4 测试明确要求：他自己只跑了 `--collect-only` 得 181，与 41+134+6 自洽但未复跑全量）；⑤ **【验收】** `_quick_test.py` 的 `grep -c assert` 由**今天实测 0** 变为 >0，**或**文件头出现「非回归基线」标注（不许既无断言又无标注）
- 状态: [x] **（5-test 勾于 `8923c430`，2026-09-24 · 一手复跑五条：① `-k capab` 收集 `29/210 tests collected`（未修态原文 `no tests collected`）✓ ② 现值 `16 failed / 12 passed / 1 skipped`（本任务钉的是 RED 基线，②按标注系【验收·修复后】、按设计本应为假，16 条红全归 `T-FIX-01/02`，见 TEST.md §1.3 逐条名单）✓ 有源可核 ③ `MagicMock`/`urlopen`/`8800` 三个 grep 逐个 = 0 ✓ ④ TEST.md 第 1 轮首行已贴全量真实输出（本轮补第 3 次：`57/146/7`）✓ ⑤ `_quick_test.py` 文件头「非回归基线」标注在位（`grep -c assert` 仍 = 0，走标注这条合法出路）✓）。⚠️ 本勾**不表示** capability 测试已全绿。证据正文：`TEST.md` §1.9.4 裁决 B

### T-FIX-01: FR1 单一真相 — 弃 JSON 文本 LIKE，改数组成员判定 🔴
- **read_files**: `backend/routes/agents_api.py`, `backend/services/capability_service.py`, `.specs/capability-groups/DESIGN.md`
- **write_files**: `backend/routes/agents_api.py`, `backend/tests/test_capability_groups.py`
- **action**: `agents_api.py:36-38` 的 `contains(f'"{capability}"')` 换成 `capability in capabilities_of(a)`（**消费 T-FIX-02 的产物，本任务不建 `capability_service.py`** —— v2 让 01/02 都「新建」同一文件，R7.3 交付物定义自相矛盾，v3 由架构师 ③ 纠正）；删除手写双引号拼接；归一化（trim + 空白折叠）落在 `capabilities_of` 里，本任务只调；**（v4 · F18）同一条具名规则必须覆盖前端**：`AgentControlPlane.tsx:588-592` 取 `cfg.capabilities` 后不过滤空串/空白/非字符串，是**第三套真相**（`capabilities:[""]` 会自成一个空名分组，而后端算「无能力」归未分类）—— 只统一后端则「单一真相」名不副实；若因数据量须走 `JSON_CONTAINS`，先把 MySQL/SQLite 双方言结论写进 DESIGN 再实现（G4 架构师 ⑥：MySQL 上 JSON→text 隐式渲染，序列化是否带空格随版本变 → **不只是语义错，还不可移植**）；**（v10.2 · C2 · Master 票拆雷）同文件还有一处同类残留**：A2 记忆装载 `agents_api.py:152` 的内联副本 `(a.model_config_json or {}).get("capabilities", [])`（编号沿革 `:133→:152`；**v10.6 主审自纠：v10.5 曾误记 `:151` —— sed 窗口差一行，一手 grep 复核推翻主审、采 5-test 四点锚图 `:152 取值 / :164 判空 / :168 匹配 / :171 回写`**；元规则 4b：认内容锚不认行号，行号错了连主审也会错）—— **T-FIX-02 的 verify ① 打靶范围内、住在本任务 write_files 里的唯一残留** → 本任务落地时一并改消费 `capabilities_of(a)`，否则 ① 恒 ≥1（打靶不可写文件 = 元规则 1 第三次同形，Master 清点）。**O-17（5-test 第 3 次复跑首报，主审实读 `:164-171` 复核并加重）：该消费点不是「只是没归一」，是活的载荷 bug** —— ① `capabilities=[""]` 时 `if capabilities:` 为真（非空列表），而 `"".lower() in m.key.lower()` **恒真** → 该用户近 7 天 **20 条记忆无条件全量**注入上下文（空串归一本应 = 无能力 = 零匹配，此处语义精确取反；前端归一后新造空串绝迹，但**存量行还在**）；② 非字符串元素 → `cap.lower()` 抛 `AttributeError` = 加载路径 500（与前端 `"abc"` 原抛 TypeError 同族，那边 T-FIX-14 已收口、这边没有）；③ 主审加重：列表非空且无空串时，`filtered` **静默丢掉全部不匹配记忆** —— 与 ① 的「全量」互为镜像，两头都没定义过契约。**处置**：随 01 消费 `capabilities_of` 自然收口（`[""]→[]` 走 False 分支 = 零记忆，与 FR2 归一规则一致）；**故意不提前写用例**（01 未落地，提前钉 = 冻未定形状，O-13/FR5 同口径）——落地批由 5-test 在召集后的 AC 面补 ①② 两条行为用例（载荷形状在本条 + TEST.md §1.9）
- **顺序（R7.3）**：`T-FIX-00`（RED 钉住现状）→ `T-FIX-02`（建唯一入口）→ 本任务；**本任务完成即 FR1 行为变更点**，F12（`:110` 越权读）必须与它同批或在其后立刻做，否则 `list_domain_capabilities` 继续读未收口的行
- **verify（v10 重写 · 判据链由主审在 tip `c7ca5bcd` 独立实跑重推 —— v9 的「`18F→13F`」判死为假红）**：`cd backend && /home/malizhi/.venv/bin/python -m pytest tests/test_capability_groups.py -q`。链：`16 failed / 12 passed / 1 skipped`（tip `c7ca5bcd`，含 `T-FIX-13` 已结的 2 条）→〔`T-FIX-02` 落地〕**`15 failed / 13 passed / 1 skipped`**（转绿恰 1 条 = `fr2_whitespace_variants_collapse_to_one_entry`；FR1 的 15 条此时**必须原样红**，因为查询侧还是 LIKE —— 谁提前绿了就是 02 越界碰了 `agents_api.py`）→〔本任务落地〕**`0 failed / 28 passed / 1 skipped`**（FR1 全 15 条转绿，**含 `percent_query_leaks_nothing`**：它的断言 = mallory + `?capability=%` → 0 行，字面成员判定下自然归零，**不依赖 A07/O-11** —— 归因见 TEST.md 1.3 表第 4 行 + 用例 docstring 自证；4-dev 交接 §6「剩这条红等 A07、终态 1F/27P」**已被主审复跑否决**，勿再按它构造判据）。skip 恒为 A09 负例那条（设计语义：404 不落审计）。不写裸 `pytest tests/ -q`；全量仍须 `57 failed / 146 passed / 7 skipped`（非 capability 的 41 红一条不动，v10 一手复跑对数）。**v9 原文（作废存档）**：「基线 `18F/10P` → 本任务后须 `13F/15P`（FR1 那 5 条转绿）」—— 13 是**未实测的预估**且预错了（01 实际能翻全部 15 条），照它验收会把真修好的实现判成假红。T-FIX-00 列的 FR1 ≥8 条全部在内。
- **verify · v9 补第 4 种形态（【验收】· 5-test 首报 + 主审独立复现）**: F2 除「跨 key / `_` 通配 / `%` 通配」外还有第四种 —— **`LIKE` 对 ASCII 不区分大小写**：`agents_api.py:37` 的 `Agent.model_config_json.contains(f'"{capability}"')` 生成 `LIKE '%"code-review"%'` → **用 `code-review` 查询会把能力登记成 `Code-Review` 的 Agent 一起捞出来**（主审内存 SQLite 实跑：`select 'ABC' like 'abc'` = 1、反证 `glob` = 0；MySQL 默认 `*_ci` collation 同样不区分）。用例已由 5-test 落成 `test_capab_query_does_not_fold_case`（今天红）→ **只写「三种反例转绿」会放过这类假阳性**，判据改为**四条**。
- **⚠️ 与 O-9 耦合（改判须两端同改）**: 「折不折叠大小写」是未拍的产品裁定。前端 `capability-group.test.tsx:74` 已断言**不折叠**、后端新用例同向；若产品改判折叠，**两端同一批改**，只改一边就是把 F18 从「一个 bug」改成「两套真相」。注：本任务的 Python 端成员判定收口本身会让这条**一并消失**，不需额外动作。
- 状态: [ ]

### T-FIX-02: 复用既有抽象 + 业务逻辑下沉 services（R3/R5）🔴
- **read_files**: `backend/routes/domain_api.py`, `backend/services/k8s_routing_service.py`, `backend/routes/gateway_api.py`, `backend/routes/agents_api.py`, `backend/routes/agent_knowledge_api.py`
- **write_files**: `backend/services/capability_service.py`(新建，**本任务是它的唯一建立者**), `backend/services/k8s_routing_service.py`, `backend/routes/domain_api.py`, `backend/routes/gateway_api.py`, `backend/tests/test_capability_groups.py`, `backend/routes/agent_knowledge_api.py`（**v10.2 · C2 补落点**：verify ① 打靶它 `:714`，此前无写权 = 元规则 1 第三次同形，Master 票拆雷）
- **action**: 新建 `services/capability_service.py` 作为 capability 派生的**唯一入口**，签名必须带归一化契约（G4 架构师 ②：现有 `_extract_capabilities` 只做「是 str 且 strip 非空」，**不 trim 值本身** → 实测 `['code-review',' code-review ']` 去重得 2 组，同一套真相自己裂开）：`capabilities_of(agent) -> list[str]`（`c.strip()`，并折叠连续空白 + `casefold()` 折不折叠由产品拍，先按不折叠、写进 docstring）+ `distinct_capabilities(agents) -> list[str]`。**消灭 7 处后端副本 + 前端 1 处第三套真相（v4 · F18：`AgentControlPlane.tsx:588-592` 的分组谓词，须走同一条具名归一规则，不得各自实现）**（v3 订正：v2 写「5 处」是**我的 grep 模式漏了** `'cfg.get("capabilities"'`，漏掉 `(x.model_config_json or {}).get(...)` 两处；`get("capabilities"` 实测 7 处）：`agent_knowledge_api.py:714`、`agents_api.py:133`、`domain_api.py:114`（本次新增的内联副本）、**`k8s_routing_service.py` 自己文件内的 `:26 / :39 / :108`**、`gateway_api.py:85`。⚠️ **别只删 `domain_api.py:114` 就宣布完成** —— 「规范实现」`:39`/`:108` 就是它自己的字面副本，那个 helper 在自己文件里都没被贯彻，它只是最不坏的一处。**（v10.2 · C2 + 4b）行号漂移与归属修正**：实测 `:133→:152`、`:114→:115`（内容锚为准）；七站落点 = **02 写权 6 站**（agent_knowledge_api 本轮已补进 write_files）+ **`agents_api.py:152` 一站划归 `T-FIX-01`**（它在本任务 verify② 的「不许碰」侧，由 01 消费 `capabilities_of` 一并消灭 —— 见 01 action 的 v10.2 追加句）。① 的打靶集与涉事任务 write_files∪action 自此**逐站相等**（Master 给的通过判据，已逐条核）
- **顺序（G4 架构师 ③）**：本任务**排在 T-FIX-00 之后**（RED 回归先钉住当前行为，再改导出）；`T-FIX-01` 只消费本任务产出的函数，**不建**这个文件
- **verify（二值，G4 两条都提了）**: ① `cd backend && grep -rn 'get("capabilities"' --include='*.py' routes/ services/ | grep -v capability_service.py | wc -l` **为 0**（**v7 · G4 Master ①：作用域必须显式收窄，且理由要写在这**）—— ⚠️ **不得**用 `.`（整个 backend）：`T-FIX-00` 硬性要求断言 FR2 的契约形状 `{domain_id, capabilities}`，而 `.get(` 是本仓既有测试的常见写法（实测量级：`test_api_integration.py` 7 处 / `test_agent_channel.py` 5 处 / `test_edge_cases.py` 3 处）→ 新测试里一句 `data.get("capabilities")` 就会把这条判据**永远钉在 ≥1**。假红的下场照例只有两种，都被禁止：删断言（R5.3）或越界改测试（R7.3）。**与基线表那行的关系一并写明**（免得读成两条不同判据）：基线按「全 backend」口径 7 → 1，verify ① 按「routes+services 且排除 `capability_service.py`」口径 7 → 0，**同一个意思的两种口径，差的正是 helper 内部那 1 处**（终态它住在 `capability_service.py`）（旧模式 `cfg.get(` 前缀会漏 2 处，禁止使用）；②（**v10 换掉「定向通过」措辞 —— 本文件按设计就有红，「通过」二字无从判定，元规则 2 第四次撞同一面**）`cd backend && /home/malizhi/.venv/bin/python -m pytest tests/test_capability_groups.py -q`：tip `c7ca5bcd` 基线 `16 failed / 12 passed / 1 skipped` → **本任务落地须恰为 `15 failed / 13 passed / 1 skipped`，且转绿的必须是 `test_capab_fr2_whitespace_variants_collapse_to_one_entry` 这一条**（FR1 的 15 条红属查询侧，本任务不许碰 `agents_api.py` 的谓词 → 它们提前变绿 = 越界信号，R7.3）；护栏绿不得变红、全量非 capability 的 41 红不动；③ 归一化断言入用例：`['code-review',' code-review ']` 经 `distinct_capabilities` 后为 **1 组**
- 状态: [ ]

### T-FIX-03: 修契约缺口 + 两个状态词表各自具名（F10 · **v4 重写**）🔴
> **⚠️ v3 版禁止执行**：它要求把 `:156-1137` 换成 `isAgentHealthy(agent.status)`。`isAgentHealthy` 是 `running|standby` 谓词（`:366-368`，生命周期口径），作用在探针词表（`healthy`/`unhealthy`/…）上**恒假** —— 照它做会把「徽标永远红」这个我声称已存在的 bug **真的做出来**；而 v3 的 verify（`grep -c "status === 'healthy'"` 为 0）**恰好被这次改坏所满足** → 假绿过关（R5.2：verify 必须能挡住它声称挡的事）。G4 领域专家首指，主审逐行复现后确认。

- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/stores/controlPlane.ts`, `backend/routes/control_plane_api.py`, `backend/services/agent_probe_service.py`, `.specs/capability-groups/DESIGN.md`
- **write_files**: `frontend/src/lib/agentHealth.ts`(新建), `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/stores/controlPlane.ts`, `frontend/src/__tests__/agent-health-contract.test.tsx`(新建 · **v7 · Master ③：三条行为断言原先没有 runner** —— 主审实跑确认本仓跑得起来：`vite.config.ts:7` 已配 `environment:'jsdom', globals:true, setupFiles:'./src/test-setup.ts'`，devDeps 有 `@testing-library/react ^16` + `jest-dom ^6.9`，`npx vitest run src/__tests__/chat-store.test.ts` 刚跑出 `7 passed`) **（⚠️ v14：`.specs/capability-groups/DESIGN.md` 已自本行移出 —— 原因见下一条 R3.2 修订；v6 的原文存档在该条内）**（+ 若走 (a)-后端方案则含 `backend/routes/control_plane_api.py`）
- **⚠️ v14 修订（R3.2 冲突 · 主审 2026-09-28 本轮查出并就地修）**: 原 `write_files` 还含 `.specs/capability-groups/DESIGN.md`（v6 为回应领域专家残留 2 的「(c) 要改 `DESIGN.md:97-104` 而 DESIGN 只在 `read_files` → 那句话今天无处可写」补进去的）。补的方向对（元规则 1 成立），但**撞上 R3.2**：「Dev 角色不允许修改 `REQUIREMENT.md` 或 `DESIGN.md`」⇒ 按卡面做则实现者必须改设计工件（违 R3.2），不做则漏掉 (c) 那句作用域声明 —— **两条路都被禁止**，与元规则 1 同一族（要求在不可写的文件上落地）。**处置**：(c) 的作用域声明**改落在本任务已经要新建的 `frontend/src/lib/agentHealth.ts` 的 docstring**（两个谓词的定义处，比 DESIGN.md 更靠近失效面）；**`DESIGN.md` 移出 `write_files`**。若人工仍要把该声明升到设计层，那是**架构师**动作，另开一条，不由 4-dev 代劳。此处 v6 的原文保留不删（元规则 4d 同族：不静默抹掉别人的判断）。
- **顺序（v14 补 · 本条此前缺这一行，是它被读成「等人签」的原因之一）**: **独立可做，不卡 `O-9`/`O-10`/`O-11`/`O-14`/`O-15`/`O-18`，也不在 `待人工裁定 #1` 的名单里**（#1 只点名 F5/F6/F7）。`isAgentHealthy`(`AgentControlPlane.tsx:368`)、`OverviewCards`(`:74`)、`AgentRow`(`:105`) 三个符号**均未 `export`**（v14 实读）→ 改名属模块内部，非 R4.6「改公共导出」；新增 `export` 是加法，不改既有导出签名 ⇒ **不触发 R4.6**。故本条**不阻塞于任何人审项**。元规则 4（`AgentControlPlane.tsx` 单写者）：`T-FIX-06/07/08/09` 均卡 `待人工裁定 #1`，本条先做不与任何在途任务抢文件。
- **action（四件事，逐条对应 F10 表）**：
  - **(a) 补契约缺口**：`stores/controlPlane.ts:8,10` 声明的 `health` / `runtime` 后端从不发（`control_plane_api.py:75-85` 构造的 entry 键集实测无此两键）。二选一：后端 `list_probes` 补发 `health`+`runtime`，**或** 前端 `:74/:75` 改读 `status` 并用探针词表判 `unhealthy`。⚠️ **改公共 payload 前先 grep 全部引用点（R4.6）**：`AgentProbePanel.tsx:64,168,169,318,478` 共 5 处在读幽灵字段，`AgentControlPlane.tsx:531,1076,1129` 在渲染幽灵 `runtime`
  - **(b) `:156-1137` 的【判定语义】不得改变**（v6 · G4 领域专家残留 1：原文「保持不动」与 (c)「各自具名」字面冲突，照字面读会逼实现者二选一）：按 (c) **等值改名**成 `isProbeHealthy(agent.status)` 可以；换成生命周期谓词 `isAgentHealthy(agent.status)` **不行**（它只认 `running|standby`，对探针词表恒假 = v3 那个坑）。精准取证（不截断、回显总数）：`grep -n "=== 'healthy'"` = **5 处**（`:34` 合法映射 / `:74` 幽灵字段 / `:156` / `:157` / `:1137`）；`grep -n "status === 'healthy'"` = **4 处**（Master 数的即这个）→ **两个计数都不是合格判据**，只打 `:74-75` 的 `a.health` 才对 —— 它们是当前唯一正确的健康判定（`status` 即探针判定，`:94-95` 赋的正是 `healthy`/`degraded`/…，且 `:160` 用配套的 `getHealthLabel`）
  - **(c) 两个词表各自具名，不得共用「健康」一词**：`isAgentHealthy(Agent.status)`＝**生命周期**口径（能力组概要用它，DESIGN.md:97-104 是其规范源）；`isProbeHealthy(AgentStatus.status)`＝**探针判定**口径。并在 **`frontend/src/lib/agentHealth.ts` 的 docstring 补一句作用域声明**（它定义的是概要用的生命周期口径，**不覆盖探针判定**）—— 不写这句，下次还会有人拿它去判探针行（我就是上一个）。**⚠️ v14 改落点**：原文写「在 `DESIGN.md:97-104` 补一句作用域声明」，该落点**撞 R3.2**（Dev 角色不得修改 `DESIGN.md`）→ 见本卡 v14 修订条。两个谓词本来就在 `agentHealth.ts` 里定义，**声明写在定义处比写在 DESIGN.md 更靠近失效面**；且 `agentHealth.ts` 本就是本任务要新建的文件，落点不需要任何额外权限。若人工要求把该声明升到设计层，那是**架构师**动作，另开一条，不由 4-dev 代劳。
  - **(d) 顺带修词表零交集的两处**：`getStatusConfig`(`:112` + `STATUS_CONFIG:22-27` 键集 `{running,idle,blocked,dead}`) 与 `STATUS_PRIORITY`(`:197` + `:15-20` 同键集) 作用在探针词表上**全部落 fallback / 全落 99** → 「运行状态」列吐英文、列表排序实际失效
- **verify（喂数据看行为，v7 落成有 runner 的判据 —— 没有 runner 的行为断言等于没写）**: ①② **【验收】** · ③ **【护栏】（v15 改标，原标【验收】）** 由 `npx vitest run agent-health-contract` 执行（文件 `frontend/src/__tests__/agent-health-contract.test.tsx`，RTL `render`）：① 喂一条 `status='healthy'` 的探针 DTO → 该 Agent 行徽标底色为 `var(--green-bg)`/字色 `var(--green)`，**且** 顶部「健康」卡计数 > 0；② 喂 `status='unhealthy'` → 徽标红且计入「异常」卡（**v7 订正 · v8/v9 两次重取：标签是「异常」；行号 `:79`→`:81`→ 现 **`:83`**（v7 误写 `:79`；实测 `:79`=Agent 总数 / `:80`=健康 / `:81`=异常 / `:82`=队列任务），不是「停止」** —— 我 v4 曾在同一处写错，见 REVIEW.md 自查段）；③ 喂 `runtime='langgraph'` → `:531/:1076/:1129` 三处渲染出该值。**v15 改标理由（4-dev §三-1 与 5-test `TEST.md` §1.11 第 4 条同证，主审采纳）**：③ 喂的是 fixture 注入的值，而三处接线在**起点树上本就正确** ⇒ 它在未修态也**不为假**，按元规则 2 的定义就是【护栏】而非【验收】；标错的代价正是元规则 2 要治的病（读的人以为它已经为真）。⚠️ **可测性前置**：`OverviewCards` 与 `AgentRow` 现在是 `AgentControlPlane.tsx` 的模块级私有函数 → 本任务需为它们加 `export`（**不改语义**，`tsc` 计数须仍为 32）；若人工判 `export` 不可接受，则 ①②③ 显式降级为「UAT 人工步骤 + 编号写进 TEST.md」，**禁止**留着「造一条…断言…」这类无落点的句子（那正是下一轮「我以为测了」的复发点）。
- **其余判据**: ④ **【验收】**（**v7 · Master ③ 订正标签**：原文误标【护栏】—— 它今天为假、修后才真，按元规则 2 的定义就是【验收】；标错的代价恰是这条规则要治的病：读的人以为它已经为真）`agentHealth.ts` 内 `isProbeHealthy|isAgentHealthy` 命中 **≥2**（今天该文件不存在 = 0）；⑤ **【回归信号】（v15 改标，原标【验收】 —— 4-dev 与 5-test 各自注入同义改写 `(a as any)['health']` 实测：该计数 = 0 而幽灵字段仍存活 ⇒ 它可在缺陷存活时为真，按元规则 2 新增的第三类定义不得单独构成验收依据；本卡验收结论以 ①② 行为判据为准。证据 = `TEST.md` §1.11 的 M1）** 判据仍是**全文件内容锚** `grep -c "a\.health" src/pages/AgentControlPlane.tsx`，取值 **2 → 0**（tip `0726c73b`）。⚠️ **禁止**再用 `sed -n '74,75p'` 行区间版：`T-FIX-05` 之后 `:74-75` 打到的是 `function OverviewCards…` 与 `const totalAgents…` 两行 → **区间版今天打印 0、看着「已满足」，而 `a.health` 实际还在 `:76-77`**（主审在 `50d944d5` 实跑：区间版 = 0，全文版 = 2）。⚠️ **禁止**写成 `grep -c "status === 'healthy'"` 归零 —— 该计数今天实测 **4**，其中 `:34` 是 `getHealthLabel` 内**唯一与探针词表自洽的正确映射**、`:156/:157/:1137` 同样正确（G4 测试实跑指出：归零判据**只能靠改坏正确代码才可能通过**，是 R5.2 反面样本，比我 v4 的措辞更硬一层）；⑥ **【护栏】** `tsc --noEmit` 的 `grep -c "error TS"` **等于 32**（今天实测 32；不是 ≥32）
- 状态: [x] **已完成**（2026-09-28 09:1x · 4-dev · `T-FIX-03-SUMMARY.md` · 起点 tip `04245ee7`）：(a)(b)(c)(d) 四件事全部落地，**后端一字未动**。六条 verify 一手实跑：① ② ③ `npx vitest run agent-health-contract` = **`4 passed (4)`**（新文件 `frontend/src/__tests__/agent-health-contract.test.tsx`；**RED 已证**：实现前 ①② 必红 —— 「健康」卡恒 0 /「异常」卡对 `unhealthy` 恒 0，根因 = 幽灵字段 `health` 恒 `undefined`）· ④ `agentHealth.ts` 命中 **6**（其中 `^export function …` **定义处 = 2**，不为 docstring 灌水）· ⑤ 全文件内容锚 `grep -c "a\.health"` = **2 → 0** · ⑥ `error TS` = **32**（等于基线）。护栏：全量前端 **8 files / 72 passed**（68 基线一条未掉）· `capability-group` **14/14** · 接线级 **2/2** · 后端定向 **16F/12P/1S**（零扰动）。**四条口径更正/登记（请主审看）**：① **卡面 verify③ 应标【护栏】而非【验收】** —— 三处渲染点在今日树上喂值即真（接线本就正确，只是原先无 runner 可打），按元规则 2 的定义它今天不为假；② **F27 对抗样本已做**：把幽灵字段改写成 `(a as any)['health']` 后 ⑤ 报 **0（假绿、缺陷存活）**而 ①② 抓住 **2 failed** ⇒ **⑤ 单用不可作验收，行为判据 ①② 才是天花板**（已复原未入库）；③ 🔴 **F10 的幽灵字段 `health` 全仓有 7 个消费点，本任务只收口 2 个** —— `AgentProbePanel.tsx` 的 `:64/:168/:169/:318/:478` **5 处仍在读**（同一 `useControlPlane()` 的 `probes`，字段恒 `undefined` ⇒ `HealthBadge` 永远渲染「未知」），该文件不在本任务 `write_files` ⇒ 只报不修，**「F10 已修」只在 `AgentControlPlane.tsx` 范围内成立**；④ 🟡 `runtime` 那半边缺口仍未收口（5 处渲染），卡面的「后端补键」选项与护栏「后端一字不动」互斥 ⇒ 另开一条（≈1 行 `entry["runtime"] = …`）。R4.6：形式命中「删 ≥5 行」但适用步骤 1.8.6「重构内部实现（导出符号不变）」豁免（被删四个符号**全为模块级私有**、跨文件引用 **0**、既有导出面零变更、4 个 `export` 为纯加法）。R6.5：diff = **恰好 4 个文件、0 越界**；`DESIGN.md`/`REQUIREMENT.md` 一字未动（R3.2 ✅，(c) 作用域声明按 v14 落在 `lib/agentHealth.ts` docstring）。G3 本轮不召集（与 `T-FIX-04/05/13/14` 同口径），出口 = @测试验证。**∎ v15 主审验收入账（2026-09-28 · 受验 `a4247738`，5-test 一手复跑，证据 `TEST.md` §1.11）**：六条 verify + 四条护栏**全部同值**（`4 passed (4)` · `tsc` 32 · 全量 **8 files / 72 passed** · 后端定向 `16F/12P/1S`），且边界是**结构性**零越界 —— `git diff --name-only 04245ee7..a4247738` 的代码文件**恰好等于 `write_files` 四项**、`backend/**` 与 `DESIGN.md` / `REQUIREMENT.md` 一个都没进 diff。**两条判据改标已由本轮落地**：③ →【护栏】、⑤ →【回归信号】（元规则 2 新增第三类，依据 = M1 注入同义改写后 ⑤ 归零而缺陷存活）。**F10 的判级由「未修」改为「部分收口」**：`AgentControlPlane.tsx` 面 ✅ 结；`AgentProbePanel.tsx` 面（9 个错配形状 / 8 行）= **`T-FIX-16`（可执行）+ `T-FIX-17`（等人拍）** ⇒ **「F10 已修」这句话在 `T-FIX-16` 落地前不成立**，R2.5 下 F10 仍是 🔴。

### T-FIX-04: `:110` 补 owner/visibility 过滤（A01 · F4）🔴
- **read_files**: `backend/routes/domain_api.py`, `backend/models/agent.py`, `CLAUDE.md`, `backend/main.py`
- **write_files**: `backend/routes/domain_api.py`, `backend/tests/test_capability_groups.py`
- **身份层与本案的顺序（v5 改正 · G4 安全 ③）**：v3/v4 把它写成「fail-closed **必须先于** 本任务落地，否则连用例都写不出来」—— **后半句不成立**：REVIEW.md §2.4 与安全、主审两次的复现都是 in-process 直传 `user` 字典跑的，`X-User-Id` 可不可信**与本条回归能不能写无关**。所以本任务**不被身份层阻塞**、今天就可测。正确口径：模型/模板收口**默认不带 admin 旁路**（域 owner 没有任何正当理由读到别人的行，admin 也没有），若人工另批 admin 豁免，必须写成**显式分支 + 审计**；身份层 fail-closed 仍是项目级独立待修（A07，不在本门计红），**但本条不等它**。
- **action**: **只修本 change 新增的那一处 `:110`** —— 域内 Agent 查询加 owner/visibility 收口。**sink 分类见 REVIEW.md §2.4**：`:208` 已独立成 F16/T-FIX-13（不许混进本任务）；其余 4 处（`:34,91,143,172,279`）+ `visibility` 全局落实 + 三处不变量矛盾的方向选择 → 另开 CHANGE，本任务内禁止顺手改（R7.1）
- **v1 verify 的判弱已订正**：原文写「非域 owner 且非 admin 的用户读不到」—— 但漏洞主体恰是**域 owner 越权读域内他人 Agent**，那条断言根本挡不住。按下面重述
- **verify**: 定向 `pytest tests/test_capability_groups.py -q` 通过，用例断言「**即使调用者是域 owner**，也**不能**从 `GET /api/domains/{id}/capabilities` 得到域内**他人** Agent 的 capability」，且以**非 admin 身份**跑。结论文案只能写「**入口层已加行过滤，身份层仍待修**」——**禁止写「越权已修复」**
- 状态: [x] **已完成**（2026-09-23 11:05 · 4-dev · `T-FIX-04-SUMMARY.md` · tip 链 `5e93984d`）：定向 `17F/9P → 16F/10P`（转绿的正是本任务判据用例）、全量 `58/143/6 → 57/144/6`、`domain_api.py` 仍 290 行（净增删 0）；口径按本任务锁为「**入口层已加行过滤，身份层 A07 仍待修**」。**⚠️ 本条留下一处需人裁**：TASK 的「默认不带 admin 旁路」与 `T-FIX-00` 护栏 `test_capab_fr2_contract_shape_and_dedup`（admin 身份请求他人域、断言看得到他人 capability）**互斥** → 已并入 **O-11**，我按护栏保留既有 admin 分支、未改任何断言

### T-FIX-13: 堵 F16 凭据搬运链（`/scale` 以他人 Agent 为模板 mint 副本）🔴 · **v2 新增**
- **read_files**: `backend/routes/domain_api.py`, `backend/services/chat_service.py`, `backend/models/agent.py`, `backend/routes/agents_api.py`
- **write_files**: `backend/routes/domain_api.py`, `backend/tests/test_capability_groups.py`, `backend/routes/agents_api.py`（仅 `:54`/`:84-87` 的 `domain_id` 校验，见 action ②）
  > v3 收缩：v2 顺手写了「新建 `services/domain_scale_service.py`」—— 本任务的正解是**改 3 行**（候选集加 owner 条件 + 不复制凭据 + 模板选择确定化），抽新 service 属额外设计，R7.3 下不该由 Reviewer 预写。若实现者认为确需抽层，先更新本 TASK 再动
- **收口口径（v5 · G4 安全 ③）**：**「不带 admin 旁路」定为默认，不是备选** —— 域 owner 没有正当理由 mint 一份装着别人 API Key 的副本，admin 也没有。这样 T-FIX-13 今天可测、在 fail-open 的默认路径上依然有效、且不必把 `main.py`/`auth.py` 拽进本 change（R7.1）。身份层本身仍是 A07 项目级独立待修，**F16 不等它**。
- **action**: `domain_api.py:208` 的模板候选集按 owner/visibility 收口（**只有调用者可支配的 Agent 能当模板**）；`:243` 的 `api_key_encrypted=template.api_key_encrypted` **默认不再复制凭据** —— 副本要么要求调用者自备 key，要么走显式的「共享凭据」授权路径并落审计（选型属产品决定）。附带两个必修小项：① `:231 template = matching[0]` 的"取第一个"是不确定选择（无排序），须确定化；② `agents_api.py:54`（创建）与 `:84-87`（`setattr` 白名单含 `domain_id`）**接受任意 `domain_id`、不校验存在与归属** —— 这是本链的前置条件，须拒绝把 Agent 放进不属于你的域
- **审计可验性（A09）**: `:255` 的 `log_audit("domain.scale", …)` 现在只记 `"scaled N→M (+K)"`，**F16 发生时日志完全正常** → detail 须带上 `template_id` 与 `template_owner`
- **verify（v5 改正 · L2 断错对象 → 改判明文；v9 把「通过」换成数）**: 定向 `cd backend && python -m pytest tests/test_capability_groups.py -q`，tip `0726c73b` 基线 `18 failed / 10 passed` → **本任务后须 `16 failed / 12 passed`**（转绿的必须恰是 `TestCapabScaleCredentialChain` 两条：凭据搬运 + A09 审计缺 `template_owner`；**A01×A07 身份层那条红不在本任务范围，不许凑数顺手改掉**）。用例必须断下面三选一，**且禁止用「密文不等」作判据**：① `decrypt(副本.api_key_encrypted) != 受害者明文 Key`；② 副本根本不携带可用凭据（字段为 NULL / 走自建凭据）；③ 该请求被拒（404，按 `CLAUDE.md` 越权与不存在统一）。⚠️ **为什么不许判密文**：`encryption_service.py:20` 每次 `nonce = os.urandom(12)` → **同一明文的密文必然逐次不同**；主审实跑 `encrypt(K) != encrypt(K)` → **True**，所以实现者只要写 `api_key_encrypted = encrypt(decrypt(template.api_key_encrypted))`，「不等于受害者密文」这条断言**通过而盗窃完全成立**（`decrypt(副本) == 受害者明文 Key` → True，`chat_service.py:103` 运行时照样解出明文取用）。§2.4 的复现用的是 `"ENC::alice-…"` 假密文，它证明了**复制传播**，但**不能**当回归判据样板（R5.2：verify 要验「漏洞已堵住」，不是「代码改了」）
- **verify · v10 补三条（主审在 tip `c7ca5bcd` 实跑对数后落档）**：
  ① **判据达成记账**：定向 `16F/12P/1S(29)`、全量 `57/146/7`、非 capability 红 41 —— 主审一手复跑与 4-dev 报数**全对上**；上条「本任务后须 `16F/12P`」在含 skip 的口径下即 `16 failed / 12 passed / 1 skipped`，**已达成**。
  ② **A09 覆盖提供方条款（采纳 4-dev §2 案甲，共享判据第五缺「谁来提供覆盖」补上）**：候选集收口后，A09 负例用例走 404 → 按设计 `skipTest`；**「收口后 A09 需正向路径用例，由实现者以加法提供」** —— 已交付：`test_capab_scale_allowed_path_names_template_owner_and_carries_no_template_key`（真扩容路径，断 `template_id`/`template_owner`/`decrypt(副本)=="not_set"`/自备 key 用调用者自己的 key 四件，当前绿）。案乙（5-test 并回负例）作废。**⚠️ O-14 改判 (β) 时，`decrypt(副本)=="not_set"` 这条断言与 `domain_api.py` 的凭据行必须同批改**，不许只改代码留旧断言。（**v10.1 · 领域专家 ❌ 票修正**：O-14 完整选项空间是 **(α)/(β)/(γ) 三分支** —— (γ)=上游本条 action 原第二分支「显式共享凭据授权 + 落审计」，勿按 v10 初稿的二选一接活；**(β) 的前置 = A07 fail-closed**，身份不可信时 (β) = 给伪造 admin 铸真 Key 副本。计数口径另见 **O-15**：`desired_replicas` 约束「域」还是「调用者份额」未拍，`:191` docstring 两句已假。全在 REVIEW.md v10.1 账本。）
  ③ **「§4 复用建议」作废 + O-11 豁免站点清单**：4-dev 在 `T-FIX-04` 交口的提醒「scale 收口可直接 `_filter_owner(..., user, Agent)` 复用、不必造第 6 份谓词」**与 v9 锁定的「不带 admin 旁路」默认互斥**（`_filter_owner` 带 admin 分支）—— 以工件口径为准，4-dev 按严格谓词实现是对的；该对话建议**不得**再被下一个读者当作指引（R1.4：对话不是工件）。若 O-11 日后拍 **(A′) 显式豁免**，改动点是 **3 处 / 2 文件**，两处源码注释各自宣称「只改这一处」都不完整：(a) `domain_api.py` `scale_agents` 的**域门**（`q = _filter_owner(db.query(Domain)`，现带旁路）· (b) 同函数**模板候选集**（`Agent.owner_id == user` 严格谓词行）· (c) `agents_api.py` `_assert_domain_access`。逐处落审计，见 REVIEW.md v10 账本 F24。
- **不得缓办条款**: 本条**不许**降级为 ROADMAP 议题（R2.5）。若人工判定它超出本 change 范围，唯一合法出路是**另开 CHANGE 优先修**，或在 REVIEW.md「待人工裁定」上留下**人对"已知接受"的原话签字**；两者都没有时本 change 停在 6-review
- 状态: [x] **已完成**（2026-09-23 11:55 · 4-dev · `T-FIX-13-SUMMARY.md`）：定向 `18F/10P → 16F/12P/1S`（29 条），全量 `59/144/6 → 57/146/7` 且**非 capability 的红逐条仍是 41 项**；口径按本条锁死为「入口层已加行过滤，身份层 A07 仍待修」。四处改动：`:211` 候选集只留调用者可支配的行（**不带 admin 旁路**，故意不复用带 admin 分支的 `_filter_owner`）· `/:233` 无可用模板 400→404（本条用例硬要求 + CLAUDE.md 统一越权/不存在）· `:236` 模板选择确定化 `min(id)` · `/:248` 不再搬运模板凭据（`not_set` 哨兵 = `agents_api.py` 既有「无 key」约定；NULL 要改 `models/agent.py:21` 的 NOT NULL、空串实测 `decrypt("") → ValueError`）· `/:263` 审计补 `template_id`/`template_owner`/`credential=` · `agents_api.py:25/:70/:104` 拒绝把 Agent 放进不存在或他人的域。⚠️ **本条留下一处判据互斥**：v9 期望 `16F/12P`，但 action ① 收口后 `test_capab_scale_audit_detail_must_name_the_template_owner` 必走 404 → 该用例自己 `skipTest`（`tests/test_capability_groups.py:433`）→ 只有 28 条时可达 **`16F/11P/1S`**；A09 是必修项、不能只由一条 skip 承载 → 我以**纯加法**补了正向路径用例（真扩容 + 审计可查 + 副本不落模板 Key），把 12P 变成有断言支撑的 12P。既有 28 条**一条断言未改**（R5.3）。⚠️ 新开放项 **O-14**：前端 `stores/domains.ts:150-156` 从不发 `api_key` → 收口后 UI 扩出的副本一律无凭据（功能上等于弹性缩放停用），需人拍 (α) 前端加自备 key 输入 / (β) 允许继承「模板自己的」Key。

### T-FIX-05: 拆 `CapabilityGroupRow`（R1 · F11）🟡
- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/stores/domains.ts`
- **write_files**: `frontend/src/components/capability/groupByCapability.ts`(新建 · 纯函数), `frontend/src/components/capability/CapabilityGroupHeader.tsx`(新建), `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/__tests__/capability-group.test.tsx`（**v5 补落点**：verify 要跑 `vitest run capability`，靶文件必须可写。好消息是**仓里本来就有 vitest** —— G4 测试实测 `package.json:10 "test": "vitest run"`、`devDeps vitest ^2.0.0`、`src/__tests__/` 已有 5 个用例文件 → FR3-FR5 不必退回「只能 UAT」）
- **顺序（v3 · G4 测试 ③）**: **排在本 change 的 `T-FIX-00` 之前或同波**。分组逻辑现在内联在 1428 行的 `AgentControlPlane.tsx:585-605`，不抽成纯函数就没有 unit 落点，FR3/FR4/FR5 下一轮**仍然零证据** —— 所以它不只是"顺手重构"，它是 FR3-FR5 可测性的**前置条件**
- **action（v6 补 F18 · 领域专家残留 3）**：① 把 `:585-605` 的分组派生抽成 `groupByCapability(agents) → Record<string, Agent[]>` **纯函数**（无 React 依赖、可 unit）；**①b 该纯函数必须调用与后端同一条具名归一规则**（过滤空串/空白/非字符串 + `strip()`），**不得**再自带一份裸 `Array.isArray(cfg.capabilities)` —— F18 此前只写在 `T-FIX-01/02` 的 action 里，而那两条 `write_files` **一个前端文件都没有** → 「要求落地的任务落不了地、能落地的任务不知道要做」（领域专家残留 3）；② 分组展示（名/数量/健康概要/箭头）与操作面（自动路由/扩容/排队/loading）拆开，`CapabilityGroupRow` 的 **14 个 props 降到 ≤6**，操作态从 `stores/domains.ts` 取，不逐层透传
- **verify（二值 · G4 两条都提了）**: ① `cd frontend && test ! -e tsconfig.tsbuildinfo && ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` **等于 32**（`grep -c … ≥ 32` 是**永远为真的废检查** —— 基线本来就是 32）；② 定向 `npx vitest run capability` 通过且用例数 ≥1；③ `wc -l < src/pages/AgentControlPlane.tsx` **< 1428**；④ `test -f src/components/capability/groupByCapability.ts && grep -c "routeLoading\|scaleLoading\|queueCount" src/components/capability/CapabilityGroupHeader.tsx` **为 0**（操作态确已离开分组展示组件）
- **verify · v6 追加（挡「只搬家不归一」）**：**【验收】** 往 `groupByCapability` 喂一条 `capabilities:[""]` 的种子 → 断言 ①结果里**不存在空名分组**（无 `''` key）②该 Agent 落入 `未分类` ③喂 `capabilities:[" code-review "]` 时与 `"code-review"` **归入同一组**。今天这条必红（`:588-592` 不过滤），故它是能区分「抽了函数」与「抽对了函数」的那道门 —— 只把内联代码搬进文件、不接归一规则，也照样能让 `wc -l` 与 props 数达标
- 状态: [x] **已完成**（2026-09-23 10:35 · 4-dev · `T-FIX-05-SUMMARY.md` · tip 链 `0f10be77`）：4 条 verify 全过（tsc=32【护栏】· `vitest run capability` **14 用例全绿**【验收】· 页面 1428→1372【验收】· 新折叠头操作态 0【验收】）；①b 的**搬家版先红 7 条**再补 `capabilitiesOf` 归一 → 判据被证明能区分「抽了函数」与「抽对了函数」

### T-FIX-06: 键盘可达 + 对比度实测（UI 3.4 · F9）🟡
- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/styles/tokens.css`
- **write_files**: `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/components/capability/CapabilityGroupHeader.tsx`（**v9 · 元规则 1 在 `T-FIX-06` 上复现**：4-dev 已把 action 点名的「能力组折叠头 `<div onClick>`」**整体搬进该文件 `:33-35`**，而它此前不在 `write_files` → 照 action 做完也判不过，即「要求做的文件不能改」），`frontend/src/styles/tokens.css`, `frontend/src/__tests__/agent-control-plane-a11y.test.tsx`（**v5 补落点**：verify ② 要跑 `vitest run a11y`，v3/v4 全套 T-FIX 里**没有任何** `frontend/src/__tests__/*` 落点 —— G4 测试 ② 实跑 `grep -c "__tests__"` = 0 证实）
- **action**: 能力组头 `<div onClick>`（`:411-413`）改 `<button>`（或 `role="button" tabIndex={0}` + Enter/Space `onKeyDown`），补 `aria-expanded` / `aria-controls`；确认 `prefers-reduced-motion` 有降级；用工具（非肉眼）实测 `#fff` on `var(--blue)` 与 `fontSize: 10` 的 WCAG 2.1 AA 对比度并记入 TEST.md 第 4 轮
- **verify（v5 标类型 + 换掉一条【今天已为真】的假判据）**: ① **【验收】** `grep -c "aria-expanded" src/pages/AgentControlPlane.tsx` 由今天实测 **0** 变 ≥1 **且** ② **【验收】** `npx vitest run a11y` 里有一条**真实键盘用例**：对折叠头 `fireEvent.keyPress('{Enter}')`（或 `space`）→ 断言 `aria-expanded` 由 false 翻到 true。⚠️ **禁止**再用 `grep -c "<div onClick"` 归零作判据 —— 该计数**今天实测就是 0**（折叠头在 `:412` 是 `<div` 换行、`:413` 才 `onClick={onToggle}`，字节串 `<div onClick` 在文件里根本不存在）→ 零门槛（G4 测试 ③ 实跑指出）。替代辅判（**v9 · 按 4-dev 报回拆成两文件，原写法是假红**）：**【验收】** 折叠头现已住在 `src/components/capability/CapabilityGroupHeader.tsx`，判据 = 该文件内 `grep -A1 "<div$" … | grep -c onClick` **由 1 变 0**（tip `50d944d5` 实测 `:33-34` = `<div` + `onClick={onToggle}`，正是 action 点名的那一处）。⚠️ **页面文件的同名计数不再是本任务判据**：`AgentControlPlane.tsx` 现剩 **5** 处（按 `<div`+`onClick` **成对**记，以免两种数各说一遍：域头 `:583-584`、新建域 modal `:860-861` 与 `:868-869`、删除确认 `:919-920` 与 `:927-928`；4-dev 报的是 `onClick` 行，我复核的是 `<div` 行，**同一处不矛盾**），**5 + 1 = 6** 与 v5 那个总数自洽，但 action 只管折叠头 1 处 —— 要求「页面 6 → 0」会逼实现者去动四个不属于本任务的交互（R7.1 越界 → 假红）。剩余 5 处与 F15（路由/扩容缺需求溯源）同批登记不修。；注意**别用 `<button` 计数**（今天已是 14，那是另一回事）；③ **【护栏】** `tsc --noEmit` 的 `grep -c "error TS"` = 32
- 状态: [ ]

### T-FIX-07: 清 `#fff` 硬编码（UI 3.1 · F5）🔴
- **read_files**: `frontend/src/styles/tokens.css`, `frontend/src/pages/AgentControlPlane.tsx`
- **write_files**: `frontend/src/styles/tokens.css`, `frontend/src/pages/AgentControlPlane.tsx`
- **action**: `tokens.css` 增加倾斜中性前景 token（禁纯白，ui-anti-patterns 颜色类），替换 `:457,473`（本 change 面）；`:850,962,1012,1225` 属 pre-existing 同形，一并替换须在 verify 里证明无回归
- **verify**: **【验收】** `cd frontend && grep -c "#fff\b\|#ffffff\b" src/pages/AgentControlPlane.tsx` 由今天实测 **6**（`:457,:473` 本 change 新增 + `:850,:962,:1012,:1225` 既有）变 **0**；**【护栏】** `grep -c "#fff" src/styles/tokens.css` 不变（token 定义里的十六进制不算违规）
- 状态: [ ]

### T-FIX-08: 硬编码间距/圆角改用既有 token + 字号 scale 待决（UI 3.1 · F6）🔴
> **v3 根因订正（G4 测试 ④，主审实测认错）**：v1/v2 写「`tokens.css` 无字号与**间距** scale token，仅 `--s1`/`--r-sm` → 「用 token」物理上不可用」。**间距与圆角的两半都是错的**，来源是我上一轮自己那条被 `head -60` 截断的 grep。全量列出后实测：`tokens.css:47` 有完整间距 scale **`--s1/2/3/4/5/6/8/10`**，`:50` 有 **`--r-sm/--r-md/--r-lg`**；tokens.css 自己用 `var(--s*)` 3 处；**`AgentControlPlane.tsx` 用 `var(--s*)`/`var(--r-*)` = 0 处**。→ 正解是「**有 token 不用**」，不是「没有 token 可用」。这个差别要紧：前者是机械替换、无需设计决策，**不该出现在给人签字的「已知接受」选项里**。字号那半仍缺（`:34-36` 的 `--text/--text-secondary/--text-muted` 是**颜色**不是字号，全仓 61 个自定义属性里无任何 font-size token）。
- **read_files**: `frontend/src/styles/tokens.css`, `frontend/src/pages/AgentControlPlane.tsx`
- **write_files**: `frontend/src/pages/AgentControlPlane.tsx`
- **action · (a) 本 change 内直接做（机械、无决策）**：`CapabilityGroupRow` 内硬编码 `padding`/`margin`/`gap`/`borderRadius` 换成既有 `--s*`/`--r-*`（`gap: 12px`→`var(--s3)`、`borderRadius: 8px`→`var(--r-md)` 等），就近映射不改视觉
- **action · (b) 需人工定调（出本任务范围则显式挂起）**：字号无 scale → 定一套非等差 font-size token 是设计决策，**不属 Reviewer 权限**（R3.3）。若人工不在本轮定，(b) 记为未闭环，**不得**因 (a) 完成就宣布 F6 关闭
- **verify（二值；v2 的「较当前下降」不可判定，两条 ❌ 都点过）**: ① `cd frontend && awk '/function CapabilityGroupRow/,/^}$/' src/pages/AgentControlPlane.tsx | grep -cE "(gap|padding|margin): [0-9]+px|borderRadius: [0-9]+"` 为 **0**（已按 T-FIX-05 拆出组件则改对新文件全文跑同一条）；② `grep -c "var(--s[0-9]\|var(--r-" src/pages/AgentControlPlane.tsx` **> 0**（当前实测 0，这条挡住「口头改了」）；③ `./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` **等于 32**（不是 ≥32）
- 状态: [ ]

### T-FIX-09: 三层树去卡片化（UI 3.2 · F7）🔴
- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`
- **write_files**: `frontend/src/pages/AgentControlPlane.tsx`
- **action**: 域卡片 > 能力组卡片 > Agent 行 = 卡片嵌套卡片（anti-pattern 布局类）。Level 2/3 去掉 `border + borderRadius`（`:402-403`），改用缩进 + 单条分隔线承载层级；若人工判定「三层卡是产品形态」→ 按 R2.5 走「已知接受」签字，不留空
- **verify（二值）**: `cd frontend && awk '/function CapabilityGroupRow/,/^}$/' src/pages/AgentControlPlane.tsx | grep -c "boxShadow\|border: 1px\|borderRadius"` 为 **0**（能力组层去卡片化的可计数判据）；截图复核结论记 TEST.md UAT 段，**不作为通过依据**（未起服务，见盲区）
- 状态: [ ]

### T-FIX-10: 组顺序两端一致（F14）🟢
- **read_files**: `backend/routes/domain_api.py`, `frontend/src/pages/AgentControlPlane.tsx`
- **write_files**: 上述二者之一
- **action**: `domain_api.py:119` 与 `AgentControlPlane.tsx:666` 各自 `sort()`，中文 `未分类` 落位依赖 locale → 固定规则（`未分类` 恒末位，其余按原值升序）且只在一处定义
- **verify**: 同一份种子数据下，`GET /api/domains/{id}/capabilities` 与画布分组顺序逐位相同
- 状态: [ ]

### T-FIX-11: FR2 端点消费者与验收口径（F12）🟡
- **read_files**: `backend/routes/domain_api.py`, `frontend/src/stores/domains.ts`, `frontend/src/pages/AgentControlPlane.tsx`, `.specs/capability-groups/REQUIREMENT.md`
- **write_files**: `frontend/src/stores/domains.ts`, `frontend/src/pages/AgentControlPlane.tsx`
- **action**: 二选一 —— (a) 前端改为消费该端点作为组名来源；(b) 承认「本地派生」即实现、把该端点定位为纯外部集成面并在 REQUIREMENT 写清其验收方式。当前「实现了但零消费者 + 零测试」使 FR2/用户故事 4 不可验。**注意：选 (b) 需改 REQUIREMENT，属 R3.2 红线（Reviewer/Dev 不得改需求）→ 由人工拍板后交 1-requirement 执行**
- **verify**: 选定后 TEST.md 第 1 轮有对应 AC 用例，或 REQUIREMENT 明确该端点验收口径
- 状态: [ ]

### T-FIX-12: 登记议题（不入本 change）🟢
- **read_files**: `.specs/CONTEXT.md`, `frontend/src/styles/tokens.css`, `STATE.md`
- **write_files**: `STATE.md`, `.specs/platform-evolution/TOPICS.md`
- **action**: 按 R18.4 登记四条 —— ① `tokens.css:43` `--font` 含 **Roboto**（字体类强制禁忌，全局既有、非本 change）；② `visibility="private"` 全后端从未被执行（跨端点 + 模型字段存废，与 T-FIX-04/13 同源的统一收口）；③ `CONTEXT.md` 已 **79 天**未更新、无「技术债」段、§3 规模表与现实偏离（实测 117 py / 100 ts·tsx vs 记录 112 / 96）→ 可重跑 intel-scan；④ **依赖不可复现构建**：`backend/requirements.txt` 13 条**全为 `>=` 区间、仓内无任何锁文件**（`poetry.lock`/`uv.lock`/`requirements.lock` 实测均不存在）→ CVE 扫描无法固化基线（本条为存量，**不是 capability-groups 的红**）
  > 交叉引用不另立项：`X-User-Id` 身份 fail-open 已在 `CLAUDE.md` 待修清单内（A07），只点名不重复登记（R18.4 禁同义概念）
- **action · v4 追加四条（G4 领域专家）**：⑤ **术语表缺口是 F10 那类混用的土壤** —— 实测 `capability`/`能力组`/`健康概要`/`未分类`/`默认域` 在 `.specs/CONTEXT.md` 中 **0 命中**（`探针` 仅散文中出现 2 次、无定义条目），而本 change 的 DESIGN 首次把「健康」写成规范 → 把这 6 个术语写进 CONTEXT.md 域语言段，否则下一轮 review 还会在同一词表上判错行；⑥ `alert_service.py:141` 读 `status in ("dead","unhealthy")` 里的 **`dead` 全后端无写入点** → `agent_dead` 告警**永不触发**（与 F10 同根因的既有扩散面，本 change 面外）；⑦ `AgentProbePanel.tsx:64,168,169,318,478` 5 处读幽灵 `probe.health` 字段（T-FIX-03 修契约时须一并核，R4.6）；⑧ `services/scheduler_service.py:5` → `engine.scheduler` 与 `engine/reconcile_loop.py:57,:464` → `services.*` 构成 **services↔engine 层级双向**（无 import cycle），DESIGN.md:10 的依赖清单未给 `engine` 排位次 → 补 ADR/依赖清单定序
- **action · v10 两条 + v10.2 两条（均 pre-existing、diff 外；**处置受 STATE 第 5 条约束：凭据链只许「本 change 内修」或「另开 CHANGE 优先修」两条出路，议题包只作锚点不作处置出口 —— 安全审计师 ④，主审接受**）**：⑨ **凭据使用面之 chat 路 —— `chat_api.py:18` `POST /agents/{id}/chat` 不校验 agent 归属**：`chat_service.py:48` 裸 id 取行、`:103` decrypt 他人 key 调 provider（拿不到 key 字符串，但能烧配额/冒计费身份）；id 的**无门枚举源 = `gateway_api.py:39-49`**（无 owner/域过滤，扫全部域 + 无域 Agent；v10.4 精度修正 · 安全改判票 #1：原并列的 `domain_api.py:144` 在 T-FIX-13 后仅 admin/旁路面成立，非 admin 面不再给出他人 id —— 别让半处过度声明给整条定标打折）→ 与 ② 同族，**开票时 ②⑨ 一批收口**。⑩ 捆绑包：`/scale` `desired_replicas` 无上界 · `delete_domain` 置 NULL 不滤 owner · `models/knowledge_source.py:20` 注释称加密实存明文 · `domain_id=0` falsy 分支绕过 `_assert_domain_access`（自伤级）。**⑪（v10.2 · A10×A01 探针链，安全审计师 ❌ 票首报、主审五锚复核）**：owner 写 `agents_api.py:101` `model_config_json` → `agent_probe_service.py:31-46` 取参拼 URL → `:207` 无 header GET → `:217/:223` 内网响应体入库 → `control_plane_api.py:66-69` **零 owner 过滤跨 owner 读回**；脱敏 `:25-27` 仅掩 `sk-` 形。**→ 另开 CHANGE 优先修，并挂 STATE 进 7-integration 前欠项清单**。**⑫（v10.2）`services/llm_providers.py:235` `genai.configure(api_key=…)` 进程级全局、`:256` 才实例化 → 并发下 Gemini 用「最后写入的 Key」= 跨租户使用他人凭据且无需知道 id** —— 同票⑪批。
- **verify**: 十二条在 `STATE.md` 或 `TOPICS.md` 可 grep 到（⑤⑥⑦⑧ 为 v4 追加 · ⑨⑩ 为 v10 追加 · ⑪⑫ 为 v10.2 追加）；**⑨⑪⑫ 另须在 STATE 有「另开 CHANGE / 集成前结清」字样**（不得只落在议题包 —— 第 5 条口径）
- 状态: [ ]

### T-FIX-14: 接上 capability 的**第 4 套真相**（v9 · 5-test O-13 + 4-dev 报回，主审一手复现）🟡
- **read_files**: `frontend/src/pages/AgentBuilder.tsx`, `frontend/src/components/capability/groupByCapability.ts`
- **write_files**: `frontend/src/pages/AgentBuilder.tsx`
- **action**: `AgentBuilder.tsx:48` 自己写了一份 `var capabilities = (a.model_config_json && a.model_config_json.capabilities) || []` —— 不过滤空串/空白/非字符串，是「同一条规则多处实现」的第 4 处（后端 7 + `AgentControlPlane` 1 + 这里 1）。改为 `import { capabilitiesOf } from '../components/capability/groupByCapability'` 并直接调用（该 helper 已在 `:28-34` 实现 strip + 折叠连续空白 + 非数组返回 `[]`，与后端 `capabilities_of` 同契约），**不得再自带判断**。
- **verify**: ① **【验收】** `grep -c "model_config_json.capabilities" src/pages/AgentBuilder.tsx` **1 → 0**；② **【验收】** `grep -c "capabilitiesOf" src/pages/AgentBuilder.tsx` **0 → ≥1**。两条取值均主审在 tip `50d944d5` 实跑（不是读出来的）。
- **为什么单开一条**（元规则 1 的正用，不是加戏）：F18 原文写「后端 7 处 + 前端 1 处」，`AgentControlPlane` 那处随 `T-FIX-05` 收口后 F18 就会被读成「前端已平」→ 这条若不落任务，就只活在评论里，等于没记（R18.3 同一口径）。
- **顺序**: 独立可做，不依赖 O-9/O-10，也不碰 `AgentControlPlane.tsx`（元规则 4 无冲突）→ 可与 `T-FIX-13` 同波由 4-dev 串行做。
- 状态: [x] **已完成**（2026-09-24 10:17 · 4-dev · `T-FIX-14-SUMMARY.md` · 起点 tip `0e8ee534` → 码提交 `0e30fff2`）：两条【验收】一手实跑 —— ① `grep -c "model_config_json.capabilities" src/pages/AgentBuilder.tsx` **1 → 0**、② `grep -c "capabilitiesOf"` **0 → 2**（起点值我在自己的 tip 上重取，与主审 `50d944d5` 的 1/0 同值 → 判据未漂）；护栏 `tsc --noEmit` 的 `error TS` **=32** 前后同值、前端 vitest `capability-group` **14/14**（元规则 3：用例数已断言 ≥1）与全量 **66/66** 同基线、后端定向 **16F/12P/1S** 与全量 **57/146/7**（非 capability 红仍 **41** 项同名）零扰动。行为差异 4 类（空串/纯空白不再渲染 · 去重 · 折叠连续空白 · 非数组字符串载荷原抛 `TypeError` 现降级为无 chip）实测表在 SUMMARY ⑥。**未附带测试改动**：`write_files` 只有该 `.tsx`，新建测试文件即 R6.5 越界 → 接线级断言作为建议交 5-test（SUMMARY「是否触发新工作」②）。


### T-FIX-15: T-FIX-14 的接线级行为判据 + grep 判据反同义化（v10.5 · 5-test 交接验收裁决 A 落任务 = O-16 处置）🟡
- **read_files**: `frontend/src/pages/AgentBuilder.tsx`, `frontend/src/components/capability/groupByCapability.ts`, `frontend/src/__tests__/capability-group.test.tsx`, `frontend/src/stores/agents.ts`, `.specs/capability-groups/TEST.md`（§1.9.3 加严 pattern / §1.9.4 可执行形状与先例清单，判据原文可直接抄）
- **write_files**: `frontend/src/__tests__/agent-builder-capability-wiring.test.tsx`（新建 —— **全仓第一个拿到前端测试写权的任务**，O-16 卡的就是它：此前 5-test 与 4-dev 自建同为 R6.5 越界，两人「只交建议不动手」都是对的）, `.specs/capability-groups/TEST.md`
- **action**: vitest + `@testing-library/react` 渲染 `AgentBuilder`（默认导出、prop 仅 `onSelect`、数据用 `useAgents.setState({agents:[…], loading:false})` 喂种子 —— 无新依赖、不起服务，先例 5 处见 §1.9.4）。断言两条**行为**判据（非写法判据）：① 喂 `model_config_json.capabilities = ["   "]` → 空 chip 不渲染 **且「加载记忆」按钮不渲染**（chip 与按钮共用 `length > 0` 门，现居 `AgentBuilder.tsx:59`，4b 认锚；该联动 = **O-18 人审项**，若人拍「分门」则 ① 随拍随改 —— 它进任务不进口头建议正是为此）；② 喂 `["a", " a "]` → 只剩 **1** 个 chip。未修态 `0e8ee534` 两条必红（空白 chip+按钮 / 2 chips），可执行形状已由 5-test 一手核实。
- **verify（全二值）**: ① `cd frontend && npx vitest run agent-builder-capability-wiring` → **2 passed**（元规则 3：同时断言用例数 =2，防文件名子串 0 用例假绿）；② 全量 `npx vitest run` → **68 passed / 0 failed**（66 基线 +2）；③ 反同义化钉（§1.9.3 加严判据，主审实测现值 **0**）：`cd frontend && grep -Ec "model_config_json\s*\??\s*[.\[][[:space:]]*[\"']?capabilities" src/pages/AgentBuilder.tsx` **为 0** —— 旧字面 pattern 对 5 种等价形状只命中 1（`?.`、`["capabilities"]`、`|| {}` 全漏 = 第 4 套真相可复活而判据仍 0，F27）；加严版命中 3/5。旧 TASK 文本不回改（4d：已勾任务不重开），本条是新口径唯一出处；④ `npx tsc --noEmit` 的 `error TS` **恰 32**（= 基线等值判定，非 ≥32）。
- **顺序**: 独立可做（不卡 O-9/O-10/O-11/O-14/O-15；元规则 4 无冲突：不碰 `AgentControlPlane.tsx`、不碰 `capability-group.test.tsx` 本体）→ **已随 G4 结清当轮派 5-test**（R14 门后即推）
- **元规则 2 第 5 次同形（F27 入账）**: 任何 grep 计数型【验收】写进 verify 前，必须附「等价形状对抗样本未被绕过」的证明（本轮教训：主审与 4-dev 两轮都没查出，是 5-test 的探针查出来的）。
- 状态: [x] **（5-test 交付于 `57c3cc56` 之上，2026-09-24 11:0x · 新文件 `frontend/src/__tests__/agent-builder-capability-wiring.test.tsx` = 2 条行为断言）** 四条 verify 一手实跑：① `vitest run agent-builder-capability-wiring` → **`Tests 2 passed (2)`** ✓ ② 全量 `npx vitest run` → **7 files / 68 passed / 0 failed**（66 基线 +2，未减他人用例）✓ ③ 加严判据 `grep -Ec "model_config_json\s*\??\s*[.\[][[:space:]]*[\"']?capabilities" src/pages/AgentBuilder.tsx` → **0** ✓ ④ `npx tsc --noEmit \| grep -c "error TS"` → **恰 32**（新文件贡献 0）✓。**RED 证明**：临时把页面换成未接线态 `0e8ee534` 重跑 → **2 failed**（`expected 1 to be +0` / `expected ['a', ' a '] to deeply equal ['a']`），随后 `git checkout --` 复原、未入库 → 两条断言真在钉行为。**本卡 F27 规程的首次执行（反同义化对抗证明）**：注入等价内联 `(a.model_config_json?.capabilities) || []` → 旧字面【验收①】仍报 **0（被绕过）**，而本卡 verify③ 报 **1**、新用例报 **2 failed** → 行为判据是天花板，写法判据再严也只是写法判据。边界：`AgentBuilder.tsx` / `capability-group.test.tsx` / `AgentControlPlane.tsx` 一字未动；后端定向仍 `16F/12P/1S`、全量 `57/146/7`、非 capability 红 41 条同名同数（仍归 01/02）。断言① 与 **O-18** 显式绑定（人若拍「分门」= 改断言 + 改那个门，成对改；本任务不重开）。证据正文：`TEST.md` §1.10

### T-FIX-16: F10 剩余面收口 —— `AgentProbePanel` 的探针词表与幽灵字段（O-19 前半 · **可执行，不卡人审**）🔴

> **来源**：`T-FIX-03` 交付后由 4-dev（§三-3）首报 5 处、5-test 在 `TEST.md` §1.11 第 1 条**扩查为 9 个错配形状 / 8 行**，主审本轮在树上一手复跑复核（两侧计数均属实）。**`T-FIX-03` 只把 F10 收口在 `AgentControlPlane.tsx` 内** —— 同一根因（DTO 声明了后端从不发的字段 + 探针词表被第 3 张表复写）在 `AgentProbePanel.tsx` 上**原样存活**，且这里是**用户直接看到的面**（探针面板）。
> **本卡与 `T-FIX-17` 的分界**：本卡收口**词表与幽灵字段**（不涉任何新词）；`:63` / `:65` / `:386` 三条 `status === 'active' | 'idle'` 计数**留给人拍**，归 `T-FIX-17`，本卡**不许顺手改**（R7.1）。

- **read_files**: `frontend/src/components/AgentProbePanel.tsx`, `frontend/src/lib/agentHealth.ts`, `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/stores/controlPlane.ts`, `backend/routes/control_plane_api.py`, `backend/services/agent_probe_service.py`, `frontend/src/__tests__/agent-health-contract.test.tsx`（照抄其 RTL 形状）
  > **⚠️ v16 修订（本条曾被写成「只读 `PROBE_STATUS` / `getHealthLabel` 作为规范源」，与 action (b) 直接冲突 —— 主审自造的元规则 1 第 7 次同形，已认并修）**：那两个符号在本 change 里**尚未跨文件共享**（`AgentControlPlane.tsx:30` / `:45` 均为**模块级私有、无 `export`**；`lib/agentHealth.ts` 里只有注释提到它们的名字），而 (b) 要求 `AgentProbePanel` 消费它们 ⇒ **必须动这两个文件**。原文把「规范源」写成只读，等于**同时要求「可写」与「不可写」**。已删去「只读」措辞并把两个文件移进 `write_files`。**沉淀（进 R1.8 失败库）**：写「消费某处的单一来源」这类 action 前，必须先 grep 那个来源**是否已 export / 是否已跨文件可 import** —— 没有的话，「消费」就等于「先搬迁并开导出」，落点必须一起写进 `write_files`。
- **write_files**: `frontend/src/components/AgentProbePanel.tsx`, `frontend/src/__tests__/agent-probe-panel-vocabulary.test.tsx`（新建）, `backend/routes/control_plane_api.py`, `frontend/src/stores/controlPlane.ts`（仅注释与必要处；见 action ④）, `.specs/capability-groups/T-FIX-03-SUMMARY.md`（见 action ⑤）, **`frontend/src/lib/agentHealth.ts`（(b) 落点①：`getHealthLabel` + `PROBE_STATUS` 搬入并 `export`）**, **`frontend/src/pages/AgentControlPlane.tsx`（(b) 落点②：删原件、改为 import）**
- **action（四件事，一件一个可核对的断言）**:
  - **(a) 消灭 `health` 幽灵读（5 处）**：`:64`（`p.health === 'error' || p.status === 'error'`）、`:168` / `:478`（`probe.health === 'healthy' || probe.status === 'active'` 的后半支同理）、`:169`（`probe.health === 'error'`）、`:318`（`<HealthBadge health={probe.health} />`）。**一律改读 `probe.status`**，并**消费具名谓词** `isProbeHealthy` / `isProbeUnhealthy`（`lib/agentHealth.ts`）而不是再写内联比较 —— 本 change 的 F18/F10 处置就是这个形状，`AgentProbePanel` 是它漏掉的最后一面。
  - **(b) 消灭第 3 张词表 —— 形态已由主审裁定为「搬迁」**：`HealthBadge`（`:619-626`）自带的 `{healthy, warning, error, unknown}` 是**第 3 套探针词表**（`warning` 后端从不产出，`degraded` / `unhealthy` / `skipped` 未覆盖）⇒ 改写成消费**唯一来源**（`AgentControlPlane.tsx` 自己的注释即写明「**文案不在这张表里 —— label 一律取自 `getHealthLabel`，免得两处漂移**」，本卡就是执行这句话）。
    **v16 裁定（对 4-dev 提的三选一）：采 (甲) —— 把 `PROBE_STATUS`(`:30-37`) 与 `getHealthLabel`(`:45-52`) 搬进 `frontend/src/lib/agentHealth.ts` 并 `export`，`AgentControlPlane.tsx` 改为 import。**
    - **(乙) 不采**：只给页面加 `export`、让 `components/AgentProbePanel.tsx` 从 `pages/AgentControlPlane.tsx` import = **`components/ → pages/` 反向依赖**（低层引高层），会把本 change 一直在治的「依赖方向」病种回去；且 `lib/` 正是 `T-FIX-03` 为本 change 立的**纯模块目录**，规范源住那里才是它的位置。
    - **(丙) 不另给降级形态**：其余任何形态都会留下**第二份词表**（要么页面留私有不搬、要么面板自己再写一张），那正是 F10 的病根，等于用一次「降级」把 🔴 换成 🟡。
    - **硬要求（防「搬了但仍有两份」）**：搬完 `AgentControlPlane.tsx` **不得再定义**这两个符号 —— verify ⑦ 用 grep 钉住（**只准 import，不准留第二份**）。`getStatusConfig`(`:39-43`) 可以留在页面（改为 import 后使用）或一并搬走，**由实现者定，但两者只能存在一处**。
    - **R4.6 判定（主审裁定 · 明确写给实现者，不必再自决）**：搬走会从页面删掉 `PROBE_STATUS`(8 行含花括号) + `getHealthLabel`(8 行) = **16 行、非注释非空行 ≥5** ⇒ **形式命中 R4.6 条件 1**。**但适用步骤 1.8.6「重构内部实现（导出符号不变）」豁免**，依据 = 主审本 turn 一手重跑的引用图：**这两个符号的跨文件引用 = 0** —— `grep -rn "PROBE_STATUS\|getHealthLabel" frontend/src` 的全部命中要么在同一文件内（`:30/:40/:42/:45/:183/:220/:221/:1101`），要么是**散文提及**（`lib/agentHealth.ts:20/:34` 的注释、`agent-health-contract.test.tsx:117` 的 docstring），**没有任何 import**；`AgentControlPlane` 的默认导出面零变更，`lib/agentHealth.ts` 的导出面**只增不减**，行为由新测试锁住。⇒ **按 1.8.6 豁免执行，不必再走破坏性变更协议、不必占人的带宽**；实现者仍须在 SUMMARY 贴出自己的引用图与判断（与 (c) 同规矩）。
  - **(c) `runtime` 幽灵键的第二半（F10 的 (a) 契约缺口，另一半）**：`control_plane_api.py` 的 `list_probes` 在构造 entry 时**补发该键**（循环里 `agent` 已取到，≈1 行 `entry["runtime"] = agent.runtime if agent else ""`）。**主审本轮已把 R4.6 引用图备全，供实现者直接判**：全仓 `runtime` 读点 = `AgentProbePanel.tsx:321` / `:510`、`AgentControlPlane.tsx:1039` / `:1092`（4 处，全部是 `AgentStatus` 幽灵读）+ 类型声明 `stores/controlPlane.ts:10` 1 处；**`AgentControlPlane.tsx:546` 不在内**（它吃 `stores/agents.ts` 的 `Agent`，`models/agent.py` 的 `to_dict()` 确实发 `runtime` ⇒ 那里渲染得出来，**不是幽灵**）。⇒ 本项是**纯加法**（既有键一个不改、导出面零变更），按 1.8.6 判豁免；**实现者仍须在 SUMMARY 里贴出自己的引用图与判断**，若判为命中 R4.6 就按协议停下来问，不要自决。
  - **(d) `stores/controlPlane.ts` 的那句假注释（O-20 ①）**：现文写 `health`「**本字段已无任何消费点**」—— 现树实为 **5 处**（`AgentProbePanel`），**本卡落地后才会变真**；同时把 `runtime` 那句「`DetailPanel` / `CapabilityGroupRow` **三处**渲染它 ⇒ 值恒空」按事实订正为**两处**（`DetailPanel` 的 `:1039`/`:1092`）并删去 `CapabilityGroupRow`（`:546` 非幽灵，见 (c) 引用图）。**改完必须让注释与树一致** —— 这句话的存在价值就是让下一个读者不必重新 grep（R1.4）。
  - **(e)（交付物卫生，O-20 ②）** `T-FIX-03-SUMMARY.md` 的「已知未收口 2」行号取自**起点树** `:527/:1020/:1073`（tip 为 `:546/:1039/:1092`），且把非幽灵的 `:546` 计进了幽灵数 ⇒ **按元规则 4b 改写成内容锚或删号，并把「全仓幽灵 `runtime` = 4」写清**。
- **verify（全部二值；**行为判据为准，不许只交 grep**）**:
  - ① **【验收】** 新建 `frontend/src/__tests__/agent-probe-panel-vocabulary.test.tsx`，至少 4 条用例：喂 `status` = `healthy` / `degraded` / `unhealthy` / `unknown` 四条探针 DTO（`useControlPlane.setState({probes:[…]})`，不起服务、无 mock fetch —— 形状抄 `agent-health-contract.test.tsx`），断言 `HealthBadge` 文案分别为 **健康 / 降级 / 异常 / 未知**（`getHealthLabel` 的规范词，`unknown` 走其 fallback）。**今天必红**（现在全渲染「未知」）。
  - ② **【验收】** 同文件再一条：喂 `status='healthy'` 一条 → 「异常」计数不含它；喂 `status='unhealthy'` 一条 → 「异常」计数含它（钉住 `:64` 的 `p.health === 'error'` 幽灵半支已被摘掉、剩下的是真的 `status` 判定）。
  - ③ **【验收】** 命令型判据须吃用例数（元规则 3）：`cd frontend && npx vitest run agent-probe-panel-vocabulary` → 输出含 `Tests` 且 **passed 数 = 用例条数**（不是 0 条）。
  - ④ **【回归信号】** 全文件内容锚（**不得单独作为验收依据**，见元规则 2 第三类）：`grep -c "probe\.health\|p\.health" src/components/AgentProbePanel.tsx` **由 5 → 0**；`grep -c "warning" src/components/AgentProbePanel.tsx` **由 1 → 0**（第 3 张表消失）。
  - ⑤ **【护栏】** `npx tsc --noEmit -p tsconfig.json \| grep -c "error TS"` **等于 32**（不是 ≥32）；补发 `runtime` 键后 `stores/controlPlane.ts` 的类型**不需要改动**（它本来就声明为必填 `string`，改完反而与后端一致 —— 若实现者发现需要动类型，停下来报告，那是本卡判断有误的信号）。
  - ⑥ **【护栏】** 全量前端 `npx vitest run` = 基线 **8 files / 72 passed** + 本卡新增条数（不得掉任何既有用例）；后端定向 `cd backend && python -m pytest tests/test_capability_groups.py -q` 仍 **`16F/12P/1S`**。
  - ⑦ **【回归信号】（v16 新增 · 钉「搬了但仍有两份」）**：`grep -c "^const PROBE_STATUS\|^function getHealthLabel" src/pages/AgentControlPlane.tsx` **由 2 → 0**（页面**只准 import**，不得再定义）；同时 `grep -c "^export const PROBE_STATUS\|^export function getHealthLabel" src/lib/agentHealth.ts` **由 0 → 2**。两条**合起来**才是「真的搬了」—— 只查后面那条会放过「页面留着第二份、lib 里再抄一份」这种既满足归零又满足计数的写法。**不得单独作为验收依据**（元规则 2 第三类）。
  - ⑧ **【护栏】** R6.5 越界检查：`git diff --name-only <起点> HEAD` 与上面 `write_files` **逐项相等**（本卡是 `AgentProbePanel.tsx` 的第 2 张卡；`stores/controlPlane.ts` 只准动注释；`lib/agentHealth.ts` 与 `pages/AgentControlPlane.tsx` 因 v16 修订已在写权内，(b) 的搬迁**不构成越界**）。
- **顺序**: **独立可做，不卡任何人审项**；与 `T-FIX-17`（同文件的三条计数）**互斥，必须串行**（元规则 4 —— `AgentProbePanel.tsx` 是本 change 新增的第 2 个共享靶文件，本卡先做）。`T-FIX-06/07/08/09` 卡 `待人工裁定 #1`，不抢文件。
- 状态: [x] **已完成**（2026-09-28 09:3x · 4-dev · `T-FIX-16-SUMMARY.md` · 起点 tip `da1bf959`）：(a)~(e) 五件事全部落地。八条 verify 一手实跑：**① ② ③** `npx vitest run agent-probe-panel-vocabulary` = **`9 passed (9)`**（新文件，4 格文案 + 3 条异常计数 + 2 条运行时列）· **④【回归信号】** `probe.health|p.health` **5 → 0**、`warning` **1 → 0** · **⑤【护栏】** `error TS` = **32**（类型**未动**，`runtime: string` 原样）· **⑥【护栏】** 全量前端 **9 files / 81 passed**（基线 8/72 一条未掉）、后端定向 **16F/12P/1S**（附全量 `pytest tests/` = **57F/146P/7S** 同基线）· **⑦【回归信号】** 页面定义 **2 → 0** 且 lib export **0 → 2** · **⑧【护栏】** R6.5 diff = **7 项与 `write_files` 逐项相等、0 越界**（`DESIGN.md`/`REQUIREMENT.md`/`REVIEW.md`/`TEST.md` 一字未动）。**RED 已证**：`git stash` 双态对照，未修态 **5 failed | 4 passed** —— ① 的 healthy/degraded/unhealthy 三格全渲染「未知」、② 的 unhealthy 计数为 0；**注意 `unknown` 那格在未修态也为真**（未修态全是「未知」），只写那一格就是假绿，故四格 + 守恒断言一起写。**三条卡面没点名的声明（不静默）**：① 新增 `isProbeErrored` 谓词（否则 `error` 那支只能写内联比较，与 (a) 的要求矛盾）；② `getHealthLabel` 补 **`unknown → '未知'`** 一行 —— **卡面 verify① 隐含要求它**（原 fallback 是 `status \|\| '未知'` ⇒ `getHealthLabel('unknown')` 返回**英文** `'unknown'`），若主审要保留原行为则改 ① 的期望值、此行可撤；③ `getStatusConfig` 一并搬迁（卡面允许，理由是面板也要同一套 fallback，留页面会生第二份）。**R4.6**：(b) 形式命中条件 1（页面 −36 行），我自己的引用图复核「跨文件 import = **0**」⇒ 按卡面明文**适用 1.8.6 豁免**；(c) 纯加法（`+4/−0`），引用图 scoped 到 `AgentStatus` = **4 处 + 类型 1 处**，并逐个排除 `CapabilityGroupRow`/`AgentNodePool`/`AgentBuilder`/`OrchestrationPage`/`ProjectDetail`/`ProjectManager`/`stores/orchestration`/`AgentDetail`/`OrchestrationCanvas`/`orchestration-sync` 等非幽灵点。**残留（建议并入 `T-FIX-17`，不新开卡）**：`StatusBadge` 仍是第 4 张词表（键集 `active/idle/error/stopped` 作用在探针 DTO 上 ⇒ 除 `error` 外整列吐英文），与那三枚恒 0 计数**同源**，人工拍 (甲)/(乙) 时须同批处置。**G3 由主审召集**（v16 §五 明文，我不自行发起）

### T-FIX-17: 探针面板统计条的「活跃 / 空闲」两枚恒 0 计数（O-19 后半 · **等人拍**）🔴

> **为什么单开且必须人拍**：`:63` / `:65` / `:386` 三条 `status === 'active'` / `'idle'` 读的是**探针** DTO，而后端探针词表只有 `healthy / degraded / unhealthy / error / skipped / unknown` —— **`active` / `idle` 根本不在这套词表里**，所以「活跃 N」「空闲 N」与排序条上的「活跃探针」**自诞生起恒 0**。修法有二，**选哪条是给人看的词**（R18.1 ④ 把关），主审不代拍：
> - **方案 (甲)（主审推荐）· 换成词表里真实存在的状态**：三枚计数改为 `getHealthLabel` 已有的词（如 健康 / 降级 / 异常 或 健康 / 异常 / 未探测），**一律走 `getHealthLabel`**，不引入任何新词 —— 与 `T-FIX-16` 的 (b) 同一条纪律（单一来源，不造第 4 张表）。
> - **方案 (乙) · 直接删掉这三处计数**：它们的语义在探针面板里**无数据可依**，删掉就不再有「恒 0 的假指标」。代价 = 用户可见的减项（虽然它从未显示过非 0 值）。
> **两案都不选 = 三个恒 0 的数字继续挂在用户面前。** 另需注意：本卡与 `T-FIX-16` 改同一个文件 ⇒ 若两卡同批，**本卡在 `T-FIX-16` 之后做**。

- **read_files**: `frontend/src/components/AgentProbePanel.tsx`, `frontend/src/pages/AgentControlPlane.tsx`（`getHealthLabel` / `PROBE_STATUS` 规范源）, `frontend/src/lib/agentHealth.ts`（**v16 提示**：`T-FIX-16` 落地后这两个符号已搬到这里并 `export`；本卡排在其后 ⇒ **只需 import，不需要给本卡开这两个文件的写权** —— 写卡时先 grep 来源是否已 export，别重犯 `T-FIX-16` 那次元规则 1）, `backend/services/agent_probe_service.py`（词表的事实来源）, `.specs/capability-groups/TEST.md`（§1.11 第 1 条 / O-19）
- **write_files**: `frontend/src/components/AgentProbePanel.tsx`, `frontend/src/__tests__/agent-probe-panel-vocabulary.test.tsx`（与 `T-FIX-16` 同一文件，串行追加）
- **action**: 按人工裁定的 (甲) / (乙) 处置 `:63`（`activeCount`）、`:65`（`idleCount`）、`:386`（MiniStat「活跃探针」）三处；**卡面只在选项上生效，实现者不自行发明词**。若人未拍 ⇒ 本卡**挂起**，三个恒 0 计数保持现状并在 SUMMARY 显式记录「未裁，未动」。
- **verify**: ① **【验收】**(甲) 时：喂 `healthy` / `unhealthy` 两条 DTO → 对应两枚计数分别 = 1，且标签**逐字等于 `getHealthLabel` 的输出**；(乙) 时：断言这三处**在 DOM 中不存在**（`queryByText` 为 null）。② **【回归信号】** `grep -c "status === 'active'\|status === 'idle'" src/components/AgentProbePanel.tsx` **3 → 0**（不得单独作验收依据）。③ **【护栏】** `tsc` 的 `error TS` = **32**；全量前端不掉既有用例；后端定向仍 `16F/12P/1S`。
- **顺序**: 排在 `T-FIX-16` **之后**（同文件单写者，元规则 4）。**未拍前不派单**。
- 状态: [ ] **挂起 —— 待人拍 (甲)/(乙)**
