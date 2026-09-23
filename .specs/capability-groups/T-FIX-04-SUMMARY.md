# SUMMARY: T-FIX-04 — `domain_api.py:110` 补 owner 行收口（A01 · F4）

- **Change ID**: capability-groups
- **Task ID**: T-FIX-04（TASK.md v8 · 4-dev 波次第 2 条落地）
- **完成时间**: 2026-09-23 11:05
- **AI 角色**: Dev（4-dev）
- **分支 / tip**: `agent/agent/acdcda109f00` · 代码提交见「完成判定」；起点链：`a28e816f`(v8) → T-FIX-05 三提交 → **cherry-pick `5092f1de`（T-FIX-00 RED 基线）** → 本任务

---

## 做了什么（一段话）

`GET /api/domains/{id}/capabilities` 先用 `_filter_owner` 校域存在（`:105`），随后**裸查** `db.query(Agent).filter(Agent.domain_id == domain_id).all()`（`:110`）——于是**域 owner 能把域内他人 Agent 的 capability 画像整份读走**（F4/A01 的主体，v1 判据「非域 owner 且非 admin 读不到」恰好挡不住这一条）。修法：**复用本文件已有的那条 owner 谓词**，把 `_filter_owner` 的实体做成参数（`model=Domain` 默认，签名向后兼容、8 个既有调用点零行为变化），在 `:110` 以 `Agent` 调用它。

**刻意把改动压成 2 行、净增删 0 行**（`:19` 与 `:109-110`，注释走行尾）：`backend/routes/domain_api.py` 是 `T-FIX-02/04/10/11/13` 的共同靶文件（元规则 4），`wc -l` 保持 **290** → `:143 / :172 / :202 / :208 / :231 / :243 / :255 / :279` **全部原位**，下游任务不必再吃一次行号漂移（上一轮 T-FIX-05 在 `AgentControlPlane.tsx` 上漂了 56 行，代价写在 `T-FIX-05-SUMMARY.md` 的交接表里）。

**没有做**（都属 TASK 明写的禁止顺手改）：`visibility` 分支、其余 4 处同类裸查、身份层 A07 fail-open、`_filter_owner` 的全仓合并。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/routes/domain_api.py` | 修改（`-2 / +2`） | `:19` `_filter_owner(q, user, model=Domain)`；`:109-110` Agent 查询套上同一谓词（附「不得读成越权已修复」口径注释） |
| `backend/tests/test_capability_groups.py` | **未改**（在 write_files 内，选择不改，理由见「越界检查」） | — |
| `.specs/capability-groups/{TASK.md,STATE.md}` | 工件 | 勾选 + 状态行（kit 步骤 6/7；STATE.md 越界同 `O-8`） |

## verify 输出（真实跑过 · venv = `/home/malizhi/.venv/bin/python`）

### 本任务判据与它实际能判定的东西

TASK 的 verify 原文是「定向 `pytest tests/test_capability_groups.py -q` **通过**」+ 断言「即使调用者是域 owner 也拿不到他人 capability」+「以非 admin 身份跑」。字面判据在**单任务粒度不可满足**——那 26 条里的 17 红分属 `T-FIX-01/02/04/13` 四个任务。所以我按两问判定，取值全部实跑：

| 判据 | 类型 | 未修态（本任务前，同一棵树） | 修后 |
|---|---|---|---|
| `pytest tests/test_capability_groups.py -q` | 【验收·修复后（全 change）】 | `17 failed, 9 passed`（= T-FIX-00 交付的 RED 基线，逐字复现） | `16 failed, 10 passed` |
| 本任务对应红 `TestCapabFR2DomainCapabilities::test_capab_fr2_domain_owner_cannot_read_other_owners_capability` | 【验收】 | **`FAILED ... tests/test_capability_groups.py:328 AssertionError`**（单独跑 `1 failed`） | **`PASSED`** ✅ |
| 其余 9 条【护栏】+ 3 条 regression 不劣化 | 【护栏】 | 9 passed | **10 passed**（新增的第 10 条正是上面那条红；`fr2_contract_shape_and_dedup` / `fr2_unknown_domain_is_404` / `fr2_blank_only_values_are_dropped` / `fr2_empty_domain_returns_empty_list` 全绿） |
| 全量 `pytest tests/ -q` | 【护栏】对照 | `58 failed, 143 passed, 6 skipped, 161 warnings` | **`57 failed, 144 passed, 6 skipped, 161 warnings`** ✅ 恰好一条转绿，**红不增、跳过与告警计数不变**（既没顺手修绿别人、也没弄坏别的） |
| `git diff --name-only` | 【护栏】R6.5 | — | 仅 `backend/routes/domain_api.py` |
| `wc -l < backend/routes/domain_api.py` | 锚点保护 | 290 | **290**（下游 `:143/:172/:202/:208/:231/:243/:255/:279` 原位） |

> 结论文案按 TASK 要求锁定为：**「入口层已加行过滤，身份层仍待修」**。**禁止**写「越权已修复」——A07 的 `X-User-Id` fail-open 不在本条范围，直传身份的用例挡不住伪造头。

### 复现链（给下游 `verify 执行`：请在 `agent/agent/acdcda109f00` 上跑，不是 `5092f1de`）

```bash
cd backend
/home/malizhi/.venv/bin/python -m pytest tests/test_capability_groups.py -q            # 16 failed / 10 passed
/home/malizhi/.venv/bin/python -m pytest "tests/test_capability_groups.py::TestCapabFR2DomainCapabilities::test_capab_fr2_domain_owner_cannot_read_other_owners_capability" -v   # PASSED
/home/malizhi/.venv/bin/python -m pytest tests/ -q                                    # 57 failed / 144 passed / 6 skipped
```

## 跨任务失败检查（R1.8）

`.specs/LESSONS.md` **本轮再查仍不存在**（`test -f` → 假）。创建它不在本任务 `write_files` 内（R6.5/R7.1），故按上一轮同样做法，以 **TASK.md v8 元规则 1-4 + T-FIX-05-SUMMARY 的交接表 + TEST.md 的 O-1~O-8** 作为失败库输入，逐条声明：

- **元规则 4（共同靶文件串行）** — 命中得最直接：`domain_api.py` 同时是 02/10/11/13 的靶文件。差异：本次**用零净增删行的编辑手法**把漂移压成 0，并在动 `:110` 前先 grep 出**同一字符串在本文件还有 3 份**（`:143/:172/:279`）。若用全局替换，会一口气"收口"4 个 TASK 明令禁止顺手改的点 = R7.1 范围蔓延，而且**看起来更像修好了**。写文件前的 `assert count==1` 挡住了它。
- **元规则 2（【验收】/【护栏】+ 未修态取值）** — 已查阅。上表未修态两列全部本会话实跑；顺带发现该 verify 的字面判据在单任务粒度不可判定（登记为「是否触发新工作」）。
- **元规则 3（判据别吃退出码，要吃数量）** — 已查阅。本条判据写的是**用例数变化 9→10 与全量 143→144**，不是"跑过了"。
- **元规则 1（靶文件/action 落点边界）** — 已查阅。我改的是 action 点名的 `:110` 那一处；`_filter_owner` 是它的**同文件既有谓词**，不是新落点（否则等于给 T-FIX-02 的 7 副本清单再加一份）。
- **v5 那次的教训（判据以修复任务为作用域，不是审查者视角）** — 已查阅：我没有把「A01 全清」当成交付口径。
- **T-FIX-03 破坏性任务那次（verify 被改坏所满足）** — 已查阅：我**没有**为了让判据好看去动 `test_capability_groups.py` 的任何断言（R5.3），它在我 `write_files` 里但我一行未改。

## 6 维自查（步骤 4 · 生产代码改动）

```markdown
### 🟢 R1 认知过载：端点仍是 20 行内联体
**Symptom**：`list_domain_capabilities` 里 capability 抽取仍内联（`:111-118`，F18 七副本之一）。
**Source**：`sed -n '100,119p' backend/routes/domain_api.py`。
**Consequence**：不修则 F17 的"空格变体裂成两组"仍红（`test_capab_fr2_whitespace_variants_collapse_to_one_entry`）。
**Remedy**：**本次故意不做** —— 那是 `T-FIX-02` 建 `capability_service.capabilities_of` 的落点（同一函数、同一文件、
同一批行），我先做就与它抢靶文件（元规则 4）。当前该端点剩余红 = 1 条，已在「是否触发新工作」交接。

### 🟢 R2 变更传播：签名加默认参数，8 个既有调用点行为不变
**Symptom**：`_filter_owner(q, user)` → `_filter_owner(q, user, model=Domain)`。
**Source**：`grep -rn "_filter_owner" backend/` → 本文件 8 处调用全为 `Domain`、无跨模块 import
（其余定义在 `agents_api:18`/`projects_api:16`/`workflows_api:16`/`storage/sqlite_backend.py:31`，各自独立）。
**Consequence**：若做成必填参数，8 处调用会 TypeError —— 那才是真传播。
**Remedy**：默认值 = 原实体，改动面收敛在 1 个新调用点；证据是全量套件 144 passed 里**没有一条从绿转红**。

### 🟡 R3 知识重复：本次 0 新副本，但暴露第 5 份 `_filter_owner`
**Symptom**：owner 谓词在全仓有 **5 份定义**（4 个 route 模块实体各自绑死 + `storage/sqlite_backend.py:31` 的通用版）。
**Source**：上面那条 grep。
**Consequence**：任何一次身份层收口（A07）都要改 5 处，漏一处就是下一个 F4。
**Remedy**：本次**只消费不扩散**（复用 `:19` 那份，未新增谓词、未跨模块 import 私有符号）；
统一收口 = 另开 CHANGE 的既有方向（TASK `T-FIX-04` action 段明写「其余 4 处 + visibility 全局落实 + 三处不变量矛盾 → 另开 CHANGE，本任务内禁止顺手改」）。已把「第 5 份」写进「是否触发新工作」供主审并入该 CHANGE。

### 🟢 R4 偶然复杂：没有新抽象
`model=` 参数化不是发明：`storage/sqlite_backend.py:31` 的 `_filter_owner(self, q, model, owner_id, is_admin)` 已是同形抽象（R6.4 沿用既有抽象）。未新建文件、未新建层、未加配置开关。

### 🟢 R5 依赖方向：拒绝了一条看起来更省事的走法
可以 `from routes.agents_api import _filter_owner`（那里已有 Agent 版）——**故意不做**：路由模块互相 import 私有符号，正是 G4 架构师就 `_extract_capabilities` 判过的「下划线名已成事实边界」，会制造第 2 条跨路由耦合边。改用本文件既有谓词，`domain_api` 的入向依赖数不变（仍只有 `services/*`）。

### 🟡 R6 领域扭曲：admin 旁路 —— 两份工件互斥，我没自裁
**Symptom**：TASK `T-FIX-04` 写「模型/模板收口**默认不带 admin 旁路**（域 owner 没有正当理由读别人的行，admin 也没有）」；
而 `T-FIX-00` 交付的【护栏】`test_capab_fr2_contract_shape_and_dedup` 用 **admin 身份**请求 alice 域内的 alice Agent，
并断言 `capabilities == ["code-review","python"]` —— 即**要求 admin 看得到他人行**。二者不可同时为真。
**Source**：`TASK.md` T-FIX-04 身份层段 vs `backend/tests/test_capability_groups.py:274-286` + `TEST.md:72`（该条被标为两个时点都为真的护栏）。
**Consequence**：若我按 TASK 文本删掉 admin 分支 → **改坏一条护栏**（R5.3 的红线形态之一：让代码去迁就我更喜欢的读法）；
若我按护栏保留 → 本端点对 admin 仍可读全域画像，TASK 的那句默认没落地。
**Remedy**：保留既有 admin 分支（它不是我为本次修复新造的策略，而是 `:19` 起就存在、8 个调用点共用的平台既有行为，
且 `:29` 的 `list_domains` docstring 把「admin 看全部」写成了对外语义），把冲突**原样上呈人工裁定**，
两条出路都写进「决策与偏离」①。**不改任何断言、不加新分支、不静默挑一边。**
```

### 已知接受 + 理由（🟡）

- **R6 的 admin 旁路**：本端点 admin 仍可读到他人 capability —— 接受，因为 (i) 删它会改坏 5-test 的护栏（R5.3），(ii) 它不是本次引入的行为，(iii) 它与人正在裁的「待裁定第 9 条 admin 旁路口径」是同一个形状问题。落点：`REVIEW.md` / `TASK.md` 的下一版 + 人工签字。
- **R3 的第 5 份 `_filter_owner`**：本次不合并，合并属另开 CHANGE。
- **`?capability=` 的 admin 语义**（`agents_api:26`）：未触碰；`T-FIX-01` 落地时若也要「不带 admin 旁路」，会撞上同一条护栏（`test_capab_regression_list_without_capability_returns_all_own_rows` 用 admin 跑），届时同问同一答。

### 已知小问题（🟢）

- `:111-118` 的 capability 内联副本仍在（1 条红：`fr2_whitespace_variants_collapse_to_one_entry`）→ 归 `T-FIX-02`。
- 收口只覆盖 capability 端点的**行集合**；`domain.to_dict()` 的 `agent_count`（`:34` 区间的 `list_domains`）仍按域裸计数，属 action 明令另开 CHANGE 的 4 处之一。

## 数据库迁移（R4.5 / 1.7）

N/A —— 无 model 字段、无 DDL、无 schema 语义变更（`Agent.owner_id` 早已 `nullable=False, index=True`，`models/agent.py:14`，本次只是开始用它过滤）。

## 破坏性变更（R4.6 / 1.8）

**判定：未命中。** 逐条：删除既有代码 ≥5 行 → 否（`-2/+2`）；改公共导出 → 否（`_filter_owner` 是本模块私有函数，`grep -rn "_filter_owner" backend/` 无跨模块引用）；改公共 API 的**请求/响应形状** → 否（仍是 `{domain_id, domain_name, capabilities}`，护栏已断言固化）；删文件/重命名符号 → 否。

**但有一处可观察行为收紧，显式登记**（不是"没影响"）：**非 admin 调用者**从 `GET /api/domains/{id}/capabilities` 能拿到的 capability 集合变小（只剩自己拥有 Agent 的能力）。这正是本条要修的 bug，`T-FIX-00` 用例即判据。

### 引用图（1.8.1 全量 grep，未截断）

```text
$ grep -rn "_filter_owner" backend/ --include=*.py
  routes/domain_api.py:19(定义, 已参数化) + :29 :63 :86 :105 :137 :162 :202 :276(8 处调用, 全 Domain)
  routes/agents_api.py:18(定义) + 5 处调用(Agent)   ← 独立副本，未 import
  routes/projects_api.py:16 / routes/workflows_api.py:16(各自独立副本)
  storage/sqlite_backend.py:31(通用版, (q, model, owner_id, is_admin)) + 3 处调用
  tests/test_capability_groups.py:255(注释引用其现状语义)
  → 间接影响面：本文件 8 个调用点（默认值下语义不变）；跨模块引用 0。
$ grep -rn "visibility" backend/ --include=*.py | grep -v tests/
  models/*.py(定义与 to_dict) + routes/domain_api.py:248(scale 时复制模板 visibility)
  → 全仓**无任何查询**读取 visibility → 本次不启用它（启用=新策略，TASK 归另开 CHANGE）
```

**给 `T-FIX-02` 预置的引用图**（它才真命中 R4.6，见评论里的三选项）：`_extract_capabilities` 定义 `services/k8s_routing_service.py:20`（11 行体），被 `routes/domain_api.py:9` 跨模块 import，调用点 `:175 / :211 / :285` 三处 → 命中「删除既有代码 ≥5 行」+「重命名/移动导出符号」两条触发条件，**回归覆盖已由 `T-FIX-00` 提供**（26 条定向用例）。

## 越界检查（R6.5 / 步骤 5）

```text
✅ 越界检查（R6.5）：
  - TASK write_files：backend/routes/domain_api.py、backend/tests/test_capability_groups.py
  - 实际代码 diff：backend/routes/domain_api.py（1 个）；测试文件**一行未改**
  - 未改测试文件的理由：它已含两个方向的断言（他人行不可见 + 自己的行仍在），
    再补一条就是重复；R5.3 禁止为让自己好过而改断言 —— 我也没为"通过"而改，它本来就该红转绿。
  - 越界（工件，按 kit 步骤 6/7 与 R18.3 强制，同 5-test 的 O-8）：
      .specs/capability-groups/T-FIX-04-SUMMARY.md（本文件·新建）
      .specs/capability-groups/TASK.md（仅 T-FIX-04「状态」一行）
      STATE.md（状态行）
  - 未动：REQUIREMENT.md / DESIGN.md（R3.2）/ backend/services/** / backend/routes/agents_api.py /
    其余 4 处同类裸查 / 任何测试断言
  - 分支拓扑：本轮把 `5092f1de` **cherry-pick 到 v8 tip 之上**（其父是 `a90ea251`＝v6 时代，不含 v7/v8），
    核对 `git diff 5092f1de HEAD -- backend/tests/test_capability_groups.py .specs/capability-groups/TEST.md
    .specs/capability-groups/_quick_test.py` 为空 → 基线逐字节未被我改动
```

## 决策与偏离

1. **admin 分支保留（🟡 需人裁，本条最要紧）**：TASK 与 TEST.md 护栏互斥（证据在 R6 段）。两条出路任选其一，**都由人来定，不由我挑**：
   - (A) 维持现状：护栏不动，把 TASK 那句「默认不带 admin 旁路」改成「**非 admin 调用者**必须收口；admin 分支沿用 `:19` 既有行为」，并把它并入「待裁定第 9 条」一起签；
   - (B) 真要 no-admin-bypass：由 **5-test 重写** `test_capab_fr2_contract_shape_and_dedup` 的调用身份（改成域 owner 本人、agent 仍 owner 一致），我再删分支——顺序不能反（我先删就会留下 1 条红，会被读成我把测试改坏了）。
2. **不加 `visibility` 分支**：action 写的是「owner/visibility 收口」，但全仓没有任何查询读过 `visibility`（引用图已给），在此处单独启用等于**新发明一条可见性策略**，且 TASK 同段把「`visibility` 全局落实」明确划给另开 CHANGE。owner 一条谓词已足够让该端点满足「拿不到他人 capability」。
3. **零净增删行的编辑**：见「做了什么」。给下游的礼物是 `domain_api.py` 锚点全原位；代价是注释写在行尾、`:110` 那行很长（仓内已有同形态长行，如 `agents_api.py:23,63`）。
4. **用默认参数而非新写一个 Agent 版谓词**：后者会让 owner 谓词在全仓从 5 份变 6 份（R3 扩散）。
5. **本轮不做 `T-FIX-01/02`**：它排在最前但 `T-FIX-02` 命中 R4.6，需人答「删/兼容」四选一 → 我把 1.8.1 引用图与三选项成本算好放进出口评论，**不自行挑一个**（R4.6 明写「无人工确认前不动手」）。顺序也回正：TASK 自己的依赖是 **02 建入口 → 01 消费**，与派单里写的 `01 → 02` 相反（按 R1.4 以 TASK 为准）。

## 是否触发新工作

- [x] **需主审落笔（我不改 TASK 的判据文本，R7.1）**：`T-FIX-04` verify 的字面作用域在单任务粒度不可判定 → 建议按 5-test 对 `T-FIX-00` verify ② 提出的同一修法改成 **【验收·修复后】** 并补未修态值 `17 failed / 9 passed`。**这是同一条措辞歧义的第 2 次命中**，够格写进元规则 2 的通用条款而不是逐条补丁。
- [x] **需人答（R18.1 ①）**：admin 旁路（本条 (A)/(B) 二选一）+ `T-FIX-02` 的 R4.6 四选一。
- [x] **`T-FIX-13` 落地时注意**：`/scale` 的 `:202` 域校验收口的是 **Domain** 行，其 `:208` 的 `all_agents` 裸查**同样需要 owner 收口**（否则「以他人 Agent 为模板」的入口照样开着）；那是它的 sink，别只修凭据搬运那三行。
- [x] **另开 CHANGE 的清单 +1**：`_filter_owner` 全仓 5 份定义 + `visibility` 全局落实 + 三处不变量矛盾（TASK 已记的方向）。
- [ ] 触发 CONTEXT.md 更新：否（不在 `write_files`；「域成员 ≠ 可支配」这条口径已由 5-test 写进用例 docstring，够 grep）。
- [ ] 发现需暂停交人工的**需求/设计**问题：本条内无（未动 R3.2 两份工件）；admin 口径的裁定上呈见「决策与偏离」①。

## 完成判定

- TASK.md 中 `T-FIX-04` 已勾选：**是**（`状态: [x]` + 一句话结论 + 未修态/修后取值）
- verify：**对应红→绿 1 条、护栏 9→10 不减、全量 58/143→57/144、`git diff` 单文件 0 越界**；整文件 26 条全绿不可由单任务达成（已按上文登记）
- 提交 hash：代码 **`5e93984d`**（含测试判定的原子提交，本任务无新增断言）· 工件 `e2cc151f`（本 SUMMARY + TASK 勾选 + STATE）· 上游链 `eaf53010` = cherry-pick 自 `5092f1de`
- 出口：@mention 测试验证（本条 + 上一轮 `T-FIX-05` 合并成一次派发，不多烧 run）；G3 四票本轮不召集，理由与上一轮同（元规则 4 单写者 + 本 change 的 4-dev task 集票已在上一周期收过），若主审判定单条 T-FIX 也须过 G3，明说即召集
