# SUMMARY: T-FIX-13 — 堵 F16 凭据搬运链（`/scale` 以他人 Agent 为模板 mint 副本）+ A09 可验性

- **Change ID**: capability-groups
- **Task ID**: T-FIX-13（TASK.md **v9** · 9 项 🔴 里未被人工卡住、最严重的一条）
- **完成时间**: 2026-09-23 11:55
- **AI 角色**: Dev（4-dev）
- **分支 / tip**: `agent/agent/acdcda109f00`；本轮起点链 = `50d944d5`（T-FIX-04）→ **`470775ee`**（cherry-pick 5-test 的 `0726c73b`，28 条基线）→ **v9 工件采纳**（`TASK.md`/`REVIEW.md` ← `4c861ced`）→ 本任务提交

---

## 做了什么（一段话）

`POST /api/domains/{id}/scale` 的模板候选集是**裸查域内全部 Agent**（`:208`），于是任何能过 `:202` 域校验的人（含**域 owner**）都能拿**别人**的 Agent 当模板 mint 副本，而 `:243` 会把受害者的 `api_key_encrypted` **原样搬进副本**；`chat_service.py:103` 运行时解密取用 → 他人 LLM 凭据被盗，且 `:255` 的审计只记 `scaled N→M`，**越权发生时日志完全正常**（A09）。四处一起改：

1. **`:211` 模板候选集收口**（`Agent.owner_id == user["id"]`）—— 只有调用者可支配的 Agent 能当模板；
2. **`:233` 无可用模板由 400 改 404** —— 收口后「没有模板」与「候选全不属于你」不可区分，按 `CLAUDE.md`「越权与资源不存在统一 404」，堵住用状态码探测他人域内资产；
3. **`:236` 模板选择确定化**（`min(matching, key=id)`，原来是 `matching[0]` = 依赖 DB 返回顺序）；**`:248` 不再搬运模板凭据** → `encrypt(payload.get("api_key") or "not_set")`（`not_set` 是 `agents_api.py:45` 建 Agent 时**已在用的**「无凭据」哨兵）；**`:263` 审计 detail 补 `template_id` / `template_owner` / `credential=`**（A09）；
4. **前置条件**（action ②）：`agents_api.py` 新建 `_assert_domain_access`，在 create（`:70`）与 update 的 `domain_id` 白名单分支（`:104`）**拒绝把 Agent 放进不存在或不属于你的域** —— 否则「先进别人的域、再挑别人的模板」这条链第一步不受拦。

**收口口径按 v9 锁死为「不带 admin 旁路」**，所以第 1 条**故意不复用** `_filter_owner`（那条带 admin 分支、被 8 个读路径共用）。一手探针（一次性脚本，不入库）6 条全对：`admin 以他人模板扩容 → 404`、`alice→admin 域 create → 404`、`admin→alice 域 create → 404`、`alice 把自己 Agent 挪进 admin 域（PUT）→ 404`、`无 domain_id → OK`、`domain_id=0 → 放行`。判据是**明文**（`decrypt(副本) != 受害者 Key`），未用「密文不等」—— 我实跑 `encrypt(K) != encrypt(K)` → **True**（`encryption_service.py:20` 每次新 nonce），那条判据在盗窃成立时也能变绿。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/routes/domain_api.py` | 修改（290→296 行，+22/−10 内） | `:211` 候选集收口 · `:233` 404 · `:236` 确定化 · `:248` 凭据 · `:263` 审计 · `:10` `encrypt` import |
| `backend/routes/agents_api.py` | 修改（+19 行） | `:6` import Domain · `:25` `_assert_domain_access` · `:70` create 调用 · `:104` update 调用 |
| `backend/tests/test_capability_groups.py` | **纯加法**（+38 行，1 条用例） | 见「决策与偏离」⑤：为什么必须加、加在哪、若人拍 (β) 要改哪一行 |
| `.specs/capability-groups/{TASK.md,STATE.md}` | 工件 | 状态行（元规则 4c：改 STATE 不算越界但要记账） |

## verify 输出（全部本会话实跑 · 解释器 `/home/malizhi/.venv/bin/python`）

### 取值来源 tip：集成后的本分支（= `0726c73b` 的 28 条基线 + v9 工件）

| 判据 | 类型 | 未修态（本任务前，逐条复现 v9 写的基线） | 修后 |
|---|---|---|---|
| `pytest tests/test_capability_groups.py -q` | 【验收·修复后】计数式 | **`18 failed, 10 passed`**（28 条，与 v9 标的 `0726c73b` 基线一字不差） | **`16 failed, 12 passed, 1 skipped`**（29 条） |
| `pytest tests/ --collect-only -q -k capab \| tail -1` | 【验收】 | `28/209 collected (181 deselected)` | **`29/210 collected (181 deselected)`** |
| `TestCapabScaleCredentialChain::test_capab_scale_must_not_hand_victim_credential_to_the_copy` | 【验收】 | `FAILED` | **`PASSED`**（走 404 分支：`assertEqual(404,…)` 正是本用例认可的三选一之 ③） |
| `…::test_capab_scale_audit_detail_must_name_the_template_owner` | 【验收】 | `FAILED` | **`SKIPPED`** @ `tests/test_capability_groups.py:433`「请求被拒绝（404），不落 domain.scale 审计记录 → 无可断对象」→ **所以我补了正向用例**，见下行 |
| `…::test_capab_scale_allowed_path_names_template_owner_and_carries_no_template_key`（4-dev 新增） | 【验收·A09】 | 不存在 | **`PASSED`** —— 真扩容路径上断 `template_id=` / `template_owner=alice` / `decrypt(副本)=="not_set"` / 自备 key 路径用 `sk-alice-mine` |
| 全量 `pytest tests/ -q` | 【护栏】非回归 | v9 标 `59 failed / 144 passed / 6 skipped` → 我实跑同为 `59/144/6` | **`57 failed / 146 passed / 7 skipped`**，且**非 capability 的红逐条仍是 41 项**（`test_api_integration 28` + `test_edge_cases 6` + `test_agent_channel_supplement 4` + `test_round6_api_edges 3` = **41**，与既有基线同名同数）→ 没有一条既有绿变红、没顺手修绿任何既有红 |
| 该文件内 `MagicMock` / `urlopen` / `8800` | 【护栏】R5.2 | 0 / 0 / 0 | **0 / 0 / 0**（我的加法没引入任何 mock） |
| 身份层那条红（A01×A07） | 【护栏】不许凑数 | 红 | **仍是红**（未碰，属 O-11/A07） |
| FR1/FR2 的 16 条红（属 `T-FIX-01/02`，被 O-10 卡住） | — | 红 | **一条不少仍是红** |

> 结论文案按 v9 锁定：**「入口层已加行过滤，身份层 A07 fail-open 仍待修」**。`_extract_capabilities` 在 `:211` 仍在用（未动，属 `T-FIX-02`），本条不掺归一化。

## 跨任务失败检查（R1.8）

`.specs/LESSONS.md` 第三次查仍不存在 → 按元规则 4c/上两轮同法，以 TASK v9 元规则 **1 / 2 / 3 / 4 / 4b / 4c** + TEST.md 的 O-1~O-13 + `T-FIX-04-SUMMARY`、`T-FIX-05-SUMMARY` 的交接段作失败库输入：

- **元规则 4b（内容锚 + 计数差，行号只作提示）** —— 本轮**受益方**：v9 把 `T-FIX-13` verify 从「定向通过」改成计数式，我才能一眼判定「12P 需要正向用例」。本轮我自己写的注释也全部改成内容锚（不再写「见 `:19`」这种行号）。差异登记：我这轮**动了 `domain_api.py` 的行数（290→296）**，`:231/:243/:255` 这些锚点在 v9 工件里已经指不回原处 —— 但按 4b，下游判据不该再依赖它们；我给下游的是**内容锚**（见「是否触发新工作」）。
- **元规则 2 三件套（类型 + 未修态取值 + 取值来源 tip）** —— 已照做，上表每行都有三件。
- **元规则 4c（STATE.md 例外）** —— 已照做：改了状态行并在本文件记账，不再当越界处理。
- **元规则 1（靶文件/action 落点）** —— 反向命中一处：派单 §4 让我「直接 `_filter_owner(..., user, Agent)` 复用，不必造第 6 份谓词」，而 v9 `T-FIX-13` 的收口口径锁定「**不带 admin 旁路**」—— 那条谓词**带 admin 分支**，照 §4 做就等于把口径里的「默认」作废。**工件优先于对话**（R1.4），所以我写了严格谓词并把 O-11 的单点开关指清楚。这是本轮唯一一次「主审同一轮内两处互斥」，见「决策与偏离」③。
- **v5 那次 L2 断错对象（判密文）** —— 已查阅并**主动避开**：实跑证明判密文会在盗窃成立时变绿。
- **T-FIX-05 的假绿教训（判据在别人正确改动后为真、缺陷仍在）** —— 已查阅：我的新用例断的是「真扩容路径 + 审计可查」，不是「我改过代码」。

## 6 维自查（步骤 4）

```markdown
### 🟢 R1 认知过载：scale_agents 仍是一个 70 行函数，但我没抽层
**Symptom**：候选集、校验、mint、审计全在一个函数里。
**Source**：`sed -n '186,266p' backend/routes/domain_api.py`。
**Consequence**：继续长大会让下一次安全收口要读懂整段。
**Remedy**：**故意不抽 `services/domain_scale_service.py`** —— v3 已把这条从 v2 的 action 里收缩掉（「抽新 service 属额外设计，R7.3 下不该由 Reviewer 预写；若实现者认为确需抽层，先更新本 TASK 再动」）。我没资格替 3-task 改任务边界（R7.1），改为在 5 个改动点各留 1 行归属注释（T-FIX-13/F16/A09），把「为什么长这样」钉在原地。

### 🟡 R2 变更传播：两条对外错误码变了
**Symptom**：`/scale` 无可用模板 `400 → 404`；`POST/PUT /api/agents` 的 `domain_id` 由「不校验」变为可返 `404`。
**Source**：`grep -rn "作为模板\|无法扩容" backend frontend/src` → 只有定义处，**无任何消费者断言旧码**；`frontend/src/stores/domains.ts:155` 是 `if (!res.ok) return null`（状态码无关）。全量 41 项既有红同名同数（见 verify 表）。
**Consequence**：外部 HTTP 消费者（若有）会看到不同状态码；admin 不再能把 Agent 放进他人域。
**Remedy**：登记在「破坏性变更」+ 出口评论；响应体形状未变（`{status,domain_id,capability,current_replicas,desired_replicas,detail}`）。

### 🟡 R3 知识重复：本轮新增 1 处「刻意的重复」
**Symptom**：owner 谓词现在有两种形态 —— `_filter_owner`（带 admin 旁路，8 个读路径）与 `:211`/`_assert_domain_access`（严格，写路径）。
**Source**：`grep -rn "owner_id == user\[\"id\"\]" backend/routes/*.py`。
**Consequence**：后来者很可能「顺手统一」成一条，把 v9 锁定的口径悄悄改掉。
**Remedy**：两处都写了**为什么不同**的注释（读路径的 admin 分支属 O-11 待裁、写路径按 v9 锁死），并指明 O-11 若改口径各自只动一处；`visibility` 一律不启用（见「已知接受」）。

### 🟢 R4 偶然复杂：0 新配置、0 新分支语义
`not_set` 沿用 `agents_api.py:45` 既有哨兵（不是新发明的「空凭据」）；未加 feature flag；未加 `credential_mode` 配置项（那需要一个还没被拍的产品选型）。

### 🟢 R5 依赖方向：只在路由层内收口
`agents_api` 新增 `from models.domain import Domain`（路由 → 模型，正向，与 `domain_api.py:6` 同形）；未引入路由模块互相 import（`_assert_domain_access` 写在用到它的文件里）；`services/` 未动。

### 🟡 R6 领域扭曲：「域内副本数」这个词的含义变了
**Symptom**：`current_count` 原来是「域内具备该能力的 Agent 数」，现在是「**调用者可支配的**该能力 Agent 数」。
**Source**：`:211` + `:219`。
**Consequence**：混属域（域内有他人 Agent）会**更容易触发扩容**（别人的行不再计入副本数）—— 这是收口的直接后果，但对使用者是可观察变化：同一个 `desired_replicas` 现在会多造副本。
**Remedy**：登记为 O-11 同族的口径项（`desired_replicas` 到底约束「域」还是「调用者在该域内的份额」），本次不改语义、只把它写进注释与评论；若人判定应约束「域」，正解是**候选集按调用者收口、计数按域**（两行分开），我已把两者写成独立两行以便拆分。
```

### 已知接受 + 理由（🟡）

- **副本无凭据 = 前端扩容路径退化**（`frontend/src/stores/domains.ts:150-156` 的 body 只有 `capability` / `desired_replicas`，**永不发 `api_key`**）→ 收口后 UI 扩出来的副本一律 `not_set`，等于「扩出来不能干活」。理由：v9 action 明写「`:243` **默认不再复制凭据** —— 要么要求调用者自备 key，要么走显式共享凭据授权路径 + 落审计（选型属产品决定）」，我按字面做了最严的那半，并把选型代价交回（**O-14**，见「是否触发新工作」）。**这条值得被读成「我按工件做、代价我算给你看」，不是「我觉得这样更好」**。
- **`visibility` 未启用**：与 `T-FIX-04` 同因（全仓无任何查询读过它），单独在此启用 = 新策略，属另开 CHANGE。
- **`domain_id=0` 仍放行**（与 `api_list_agents` 的 `0=无域` 语义一致），但 `:54` 原样把 0 落库 → **悬空 FK 是既有问题**，本任务不修不扩大。

### 已知小问题（🟢）

- `:211` 仍走 `_extract_capabilities`（F18 副本之一）→ 等 `T-FIX-02`（O-10）。届时**同一函数**会被两条改动叠加，见「是否触发新工作」的提醒。
- 新用例把「无显式 key → `not_set`」钉成断言（`test_capab_scale_allowed_path…`）。若人拍 (β)「允许继承自己的 key」，要改的是**我这一条断言**，不是 5-test 那两条 —— 已在用例 docstring 里点名。

## 数据库迁移（R4.5 / 1.7）

N/A —— 无 DDL。**特意避开了需要迁移的路线**：v9 允许的正解 ②「字段为 NULL」要求把 `models/agent.py:21` 的 `api_key_encrypted` 从 `nullable=False` 改掉 = schema 变更 + 迁移脚本 + 该文件**只在本任务 `read_files`**；改用 `not_set` 哨兵后不动 schema。空串路线也实测排除：`decrypt("") → ValueError`（实跑），会把用例从红变成 error。

## 破坏性变更（R4.6 / 1.8）

**判定：命中「改公共 API」的弱形式（两条状态码），未命中强触发（无删除 ≥5 行、无删/改名导出符号、无 schema 变更）→ 未走「反问后停手」。** 依据：`git diff --stat` = **+73 / −10**，删掉的 10 行全部是**被替换的单行**（`matching[0]`、裸查、旧 detail、旧审计串），无功能被丢弃。R10.2（>100 行删除）**未触发**，本轮不需要搬家式说明。

### 引用图（1.8.1 · 全量 grep，未截断）

```text
$ grep -rn "scale_agents\|/scale" backend/ frontend/src/ --include=*.py --include=*.ts --include=*.tsx
  backend/routes/domain_api.py:186(定义) | 无其它后端消费者（不经 services/，路由内私有）
  frontend/src/stores/domains.ts:150 fetch + :155 `if (!res.ok) return null`   ← 状态码无关
  backend/tests/test_capability_groups.py:40 import scale_agents（3 条用例用它）
$ grep -rn "api_key_encrypted" backend/ --include=*.py | grep -v tests/
  models/agent.py:21(NOT NULL) :53 :57 :59(to_dict/_mask_key)
  routes/agents_api.py:54(建) :94(改)   routes/domain_api.py:248(本轮改)
  services/chat_service.py:103(运行时 decrypt 取用)  services/… 其余为读
  → 搬运点只有 domain_api.py 一处，无别的调用方依赖「副本继承模板 Key」
$ grep -rn "_assert_domain_access\|domain_id=payload\|\"domain_id\"" backend/ | grep -v tests/
  agents_api.py:25(定义) :70(create) :104(update 白名单分支) ；:120 附近 update 白名单仍含 domain_id（保留，走校验）
$ grep -rn "作为模板\|无法扩容" backend frontend/src → 只有定义处（旧 400 文案无消费者断言）
```

**间接影响（诚实列出）**：① admin 失去「把 Agent 放进他人域」与「以他人 Agent 为模板扩容」两种能力（探针 [2d]/[1] 实测 404）；② 混属域扩容出的副本数变多（R6）；③ 前端扩容出的副本不再携带凭据（O-14）；④ 审计 detail 变长，任何按 `scaled N→M` 精确匹配审计行的东西都会失配（全仓 grep 无此类消费者，`audit.jsonl` 只有写侧）。

## 越界检查（R6.5 / 步骤 5）

```text
✅ 越界检查（R6.5）：
  - TASK(v9) write_files：backend/routes/domain_api.py · backend/tests/test_capability_groups.py · backend/routes/agents_api.py（仅 :54/:84-87 的 domain_id 校验）
  - 实际代码 diff：同 3 个文件，0 越界
  - agents_api.py 改动面核对：只加了 import(1 行) + 私有校验函数(14 行) + 两处调用(各 1 行)，
    未触碰 provider/runtime 校验、api_key 更新、to_dict、删除路径 → 与 action ② 的括注一致
  - 测试文件：纯加法（+38 行 1 条用例），既有 28 条**一条断言未改未删未 skip 化**（R5.3），
    `git diff -- backend/tests/test_capability_groups.py` 只有 + 行，无 - 行
  - 工件写入（元规则 4c：STATE.md 不再计为代码越界，此处只记账）：
      .specs/capability-groups/T-FIX-13-SUMMARY.md（本文件·新建）
      .specs/capability-groups/TASK.md（T-FIX-13 勾选 + 恢复被 v9 采纳覆盖掉的 T-FIX-05/04 两条勾选）
      STATE.md（状态行）
  - 未动：REQUIREMENT.md / DESIGN.md（R3.2）/ backend/services/**（含 encryption_service、auth.py）/
    backend/models/**（schema）/ backend/main.py / frontend/**
  - 分支拓扑（本轮两次集成，均为 cherry-pick/采纳，无 merge、未碰 main，R15.2）：
      `470775ee` = cherry-pick 0726c73b（TEST.md + 测试文件与源 tip 逐字节相同，已核对 diff 为空）
      TASK.md/REVIEW.md = 采纳 4c861ced 的 v9 全文，随后重新落回我自己的两条状态勾选
```

## 决策与偏离

1. **`not_set` 哨兵 = 三选一里「副本不携带可用凭据」的唯一免迁移落法**，理由三条实测：`models/agent.py:21` 该列 `nullable=False`（NULL 路线要 schema + 迁移 + 越界）；`decrypt("")` 实测抛 `ValueError`（空串路线会把用例变成 error）；`agents_api.py:45` 已经在用 `"not_set"` 当「没给 key」的默认（R6.4 沿用既有约定，不发明新的）。
2. **候选集与计数分开写**（`:211` 查询 / `:219` `current_count`）—— 为的是 R6 那条口径若被改判（`desired_replicas` 约束「域」还是「我的份额」），拆分只是删一行注释、把两处条件分开，不需要重写。
3. **不复用 `_filter_owner`**：v9 锁「不带 admin 旁路」，而它带 admin 分支 → 与派单 §4 的建议相反，**按工件走**，并把「若 O-11 另批豁免，改哪一行」写进注释。
4. **400→404 不是洁癖**：是测试的硬要求（`assertEqual(404, exc.status_code)`）+ `CLAUDE.md` 的既有不变量；不改码的话，本条收口会把「拒绝」表达成「参数不对」，等于把越权探测面留着。
5. **我往 5-test 的文件里加了 1 条用例（唯一的加法），因为它挡的是一个真实的判据洞**：v9 期望 `16F/12P`，但 action ① 收口后 `test_capab_scale_audit_detail_must_name_the_template_owner` 必走 404 → 该用例自己 `skipTest`（`test_capability_groups.py:433`）→ 实际可达 **`16F/11P/1S`**；**A09 是必修项，不能只由一条 skip 承载**（否则「审计可查」零绿证）。所以我补正向路径用例，把 12P 变成**有断言支撑的 12P**，并显式声明：**主审那句 `16 failed / 12 passed` 与 action ① 在只有 28 条时互斥** —— 这是共享判据需要「谁提供覆盖」的第五个实例（前四处：`T-FIX-00` ②、「定向通过」在 `T-FIX-01`/`T-FIX-04`/`T-FIX-13`）。
6. **没做的事**：`_extract_capabilities`（等 O-10 的 `T-FIX-02`）、`visibility`、`auth.py:181-186` 的 fail-open（A07/O-11）、前端 api_key 输入框（O-14，且前端文件不在本任务边界）。

## 是否触发新工作

- [x] **O-14（新，建议入账本）**：收口后**前端扩容出的副本一律无凭据**（`domains.ts:150-156` 从不发 `api_key`）→ 需二选一：(α) 给扩容入口加「自备 key」输入（前端 + 契约，属 `T-FIX-11` 的 (a)/(b) 同一族）；(β) 人工签「允许继承**模板自己的** key」（收口后模板恒归调用者，继承即自有 key，`credential=template` 已预留审计取值，改 `:248` 一行 + 我那一条断言）。**不答 → 弹性缩放功能上等于停用**。
- [x] **给 `T-FIX-02`（O-10 落地时）的提醒**：`domain_api.py:211` 现在是 `if capability in _extract_capabilities(a)`，**归一化接上后会与本轮收口叠加** —— 候选集同时受「非本人」与「空格变体不匹配」两层过滤，404 会更多。请按内容锚（元规则 4b）改这一行，别按 `:208` 找它。
- [x] **给 `T-FIX-11`**：`/scale` 的响应契约与错误码本轮变了两处，(a)/(b) 选型时一并把 404 语义写进验收口径（现在是「越权与不存在统一」）。
- [x] **主审可核对的两处判据修订**：① `T-FIX-13` verify 的 `12P` 需要「谁提供正向覆盖」这句（我已提供，但 5-test 若要把 A09 并回自己那条用例，我这条可删）；② 派单 §4 的「复用 `_filter_owner`」与 v9 口径互斥，建议在 v10 里把 §4 那句改掉，避免下一位照对话执行。
- [ ] 触发 CONTEXT.md 更新：否（不在 `write_files`）。
- [ ] 需暂停交人工：本任务内**无**（口径都按 v9 已锁的默认做；O-11/O-14 是需要人拍的**后续**，不阻塞本条闭环）。

## 完成判定

- TASK.md 中 `T-FIX-13` 已勾选：**是**（`状态: [x]` + 计数 + 口径 + skip 说明）
- verify：本任务 2 条 AC 红 → **1 绿 + 1 skip（另有我补的正向用例绿）**；`16F/12P/1S`；全量 `57/146/7`，非 capability 红仍是同名 41 项；0 越界；未改任何既有断言
- 提交 hash：代码 **`78117a1e`**（3 文件 +71/−8；删除的 8 行全是**被替换的单行**：裸查、`matching[0]`、旧 400 文案、旧审计串、旧凭据行 —— 无功能丢弃，R10.2 未触发）· 工件为其后一条 `docs(capability-groups)` 提交（含 v9 采纳 + 两条恢复的勾选 + 本 SUMMARY + STATE）
- **G3**：本轮不召集，理由与前两条同（元规则 4 单写者 + 本 change 的 4-dev task 集票已在上一周期收过）
- **出口**：主审本轮明确「5-test 我这轮不召唤」，故我**不 mention** 测试验证，把第 3 轮判定权交回主审；`T-FIX-13` 的数已在本文件与评论里给全，随时可派
