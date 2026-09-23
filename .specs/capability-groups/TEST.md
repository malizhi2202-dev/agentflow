# TEST: capability-groups — 能力分组（Capability Groups）

- **Change ID**: capability-groups
- **关联**: `@.specs/capability-groups/REQUIREMENT.md` v1.0 · `DESIGN.md` · `TASK.md`「修复任务」段 **v6** · `REVIEW.md` §2.0 / §2.4 / 「G4 第三轮」
- **项目类型**: 全栈（后端 FastAPI + React/TS 前端）
- **产物**: `backend/tests/test_capability_groups.py`（26 条用例，新建）· 本文件
- **当前状态**: 第 1 轮 **RED 基线已建立**。本文档**不是**「测试通过」——9 项 🔴 未修（R2.5 仍拦集成），
  第 2 轮阻塞在需求侧缺性能预算，第 4/5 轮部分未跑。**测试门（4 专家投票）本轮不召集**，理由见文末「出口条件」。

## 本次测试范围声明（5 轮金字塔 · R5.4）

| 轮次 | 状态 | 范围 | 部分 / 跳过理由 |
|---|---|---|---|
| 第 1 轮 · 功能 | ⚠️ 部分（RED 基线完成） | FR1 ×15 · FR2 ×6 · NFR2 ×3 · 安全负例 ×2（合计 26 条，全部入 `backend/tests/`） | FR3/FR4/FR5 **无 unit 落点**：分组逻辑内联在 `AgentControlPlane.tsx:585-605`，须 `T-FIX-05` 抽出 `groupByCapability` 纯函数才有可断言的单元 → 本轮按 TASK 记 UAT（§1.5）。修复落地后**必须复跑本轮** |
| 第 2 轮 · 性能 | ❌ 未跑（**阻塞待人工**） | — | `REQUIREMENT.md` 非功能性需求 NFR1/2/3 **无任何量化预算**（无 p95 / 无 bundle 上限 / 无 LCP），kit-5-test 步骤 2.1 明确「没有就停下来，让用户先补」→ 记开放项 O-1，不由 AI 自定义阈值（R18.1 ②） |
| 第 3 轮 · 安全 | ⚠️ 部分 | 越权 / 凭据搬运 / A09 可验性负例**已进用例**（3 条，其中 2 条 RED）；依赖扫描 + 秘钥模式扫描已跑，输出见 §3 | `pip-audit`/`trufflehog`/`gitleaks`/`semgrep`/`bandit` **本机均缺**（实测 `command -v`）→ 秘钥扫描退化为模式 grep，**不等价于工具**，已记盲区 B-3；依赖 CVE 基线不可固化（仓内无任何锁文件 → `T-FIX-12` ④ 议题） |
| 第 4 轮 · 兼容 | ⚠️ 部分 | 4.3 数据迁移 = **N/A（有理由，见 §4.2）**；MySQL 方言差异记 **待确认**（§4.3） | 4.1 跨浏览器 / 4.2 视口未跑：本阶段未起 dev server，且 `npm run build` 必红（`CLAUDE.md` 既载事实，32 个 TS 错误）→ 记开放项 O-2，视觉/可达性走 UAT + 6-review 第三轮 |
| 第 5 轮 · 可观测 | ⚠️ 部分 | A09「扩容审计查得到模板主人」有可执行判据（RED）；「凭据不落日志」已 grep（§5.1） | 指标 / 告警 / `/health` liveness-readiness 区分需起服务实测 → 记开放项 O-3 |

---

## 第 1 轮 · 功能测试

**全量套件真实输出**（`cd backend && ENCRYPTION_KEY=*** /home/malizhi/.venv/bin/python -m pytest tests/ -q`；
Python 3.14.4 / SQLAlchemy 2.0.54 / FastAPI 0.141.1 / pytest 9.1.1）：

```text
# 未含本次新用例（T-FIX-00 开工前，2026-09-23 10:09 实跑）
41 failed, 134 passed, 6 skipped, 41 warnings in 5.06s

# 含本次 26 条新用例（交付态，10:19 实跑）
58 failed, 143 passed, 6 skipped, 161 warnings in 5.92s
```

> 两个数字**同源可核对**：41+17（本轮新增的 RED）= 58，134+9（本轮新增的护栏）= 143，总数 181 → 207。
> REVIEW/TASK 引用的 `41/134/6` 基线在此有了来源（TASK `T-FIX-00` verify ④）。
> ⚠️ **既有 41 红不由本阶段修**：它们是 `test_api_integration`(28) / `test_edge_cases`(7) / `test_round6_api_edges`(3) 里
> 用打桩会话与漂移代码写出来的用例（架构师 ⑤）。本 change 的所有判定一律走**定向**命令，
> 全量数只作对照 —— 既不许「顺手修绿 41 个」（R7.1），也不许削弱别人的断言（R5.3）。

### 1.1 为什么换测试缝（口径先行，防止被按「现有风格」重写）

`backend/tests/` 既有 7 个文件里，两种口径对**本 change 的 bug 必然假绿**（TASK `T-FIX-00` 实测口径，本轮复核）：

| 既有口径 | 位置 | 为什么抓不住 `contains()` |
|---|---|---|
| 模块级把 `get_db` 换成打桩会话 | `tests/test_api_integration.py:17,29` | 谓词从不落到真 SQL，`contains()` 换成任何写法它都绿 |
| 起不来就打活服务 | `tests/test_agent_channel.py:349,354` | 依赖 `127.0.0.1:8000`，不进 CI、不可重复，且身份写死 admin |

本轮新文件的缝：**真实 SQLAlchemy session**（内存 SQLite + `StaticPool`）+ **真实路由函数** + 断言**返回的行集合**。
唯一的桩是 `log_audit`（审计写文件这个外部出口），原因与假设写在 `setUp` 注释里（R5.2）——
DB、谓词、行收口、加解密全部走真的。

护栏核对（TASK verify ③）：`grep -c "MagicMock" / "urlopen" / "8800"` 在新文件内均为 **0**（实跑）。

### 1.2 AC → 用例矩阵

| AC | 类型 | 用例 | 未修态 |
|---|---|---|---|
| FR1 第一句（数组成员判定） | integration（真实 session） | `TestCapabFR1AgentFilter` ×15 | 12 RED / 3 护栏 |
| FR1 第二句（可与 `domain_id` / `status` 组合） | integration | 同上 4 条 `test_capab_combined_*`（含 `domain_id=0` 的 `IS NULL` 支与非 0 支各 1 条） | 4 RED |
| FR2（`{domain_id, capabilities}` + 去重） | integration | `TestCapabFR2DomainCapabilities` ×6 | 2 RED / 4 护栏 |
| FR3 三层域树 | manual → unit（待 `T-FIX-05`） | UAT-1（§1.5） | 🟡 无自动化证据 |
| FR4 能力组展示（名/数量/健康概要/箭头） | manual → unit（待 `T-FIX-05`）+ a11y（待 `T-FIX-06`） | UAT-2（§1.5） | 🟡 同上 |
| FR5 未分类 / 默认域 | manual | UAT-3（§1.5）**+ 口径未定**：`未分类` 占用 capability 命名空间（REVIEW F20 → 待人工裁定第 7 条）→ 本轮**不写** `?capability=未分类` 的用例，避免把未定口径冻进代码 | 🟡 待裁定 |
| NFR1 零新增 TS 错误 | 工具 | `cd frontend && ./node_modules/.bin/tsc --noEmit -p tsconfig.json \| grep -c "error TS"` → **32**（**等于**基线 32，不是 ≥32；本轮实跑） | ✅ 护栏 |
| NFR2 向后兼容 | integration | `TestCapabNfr2Regression` ×3 | 3 护栏 |
| NFR3 虚拟分组不建表 | 静态核对 | `git diff --name-only` 内无 `backend/models/**`、无迁移文件；新用例只读写 `agents` / `domains` 两张既有表 | ✅ |
| 安全（跨 owner / 凭据搬运 / A09） | integration | `test_capab_fr2_domain_owner_cannot_read_other_owners_capability`、`TestCapabScaleCredentialChain` ×2、`test_capab_non_admin_percent_query_leaks_nothing`（末条与 FR1 行重叠计） | 4 条**全 RED** |

**用例下限对照（TASK `T-FIX-00` 逐条）**：FR1 ≥8 ✓（15，含 ≥1 正向锚点 ✓、≥3 边界 ✓、空串语义已择一 ✓、空格归一 ✓）·
FR1 组合 ≥3 ✓（4）· FR2 ≥2 ✓（6，含 `domain_name` 被断言固化 ✓）· NFR2 ≥1 ✓（3）· 安全负例以非 admin 身份跑并断跨 owner ✓。

### 1.3 RED 基线（17 条，逐条可复跑）

`cd backend && /home/malizhi/.venv/bin/python -m pytest tests/test_capability_groups.py -q` → **17 failed, 9 passed**（2.13s）

| # | 用例（省略 `test_capab_` 前缀） | 钉的缺陷 | 修它的是 |
|---|---|---|---|
| 1 | `no_cross_key_false_positive` | F2 反例①（跨 key 假阳性） | T-FIX-01/02 |
| 2 | `underscore_is_not_a_single_char_wildcard` | F2 反例②（`_` 当通配） | T-FIX-01/02 |
| 3 | `percent_is_not_a_wildcard_passthrough` | F2 反例③（`%` 绕穿） | T-FIX-01/02 |
| 4 | `non_admin_percent_query_leaks_nothing` | 同上 + A01 边界（非 admin 身份） | T-FIX-01/02 |
| 5 | `capabilities_as_plain_string_is_not_a_membership` | 边界：非 list 视为无能力 | T-FIX-02 |
| 6 | `capabilities_null_is_tolerated` | 边界：`null` + 无关 key | T-FIX-02 |
| 7 | `empty_string_query_means_zero_rows` | **本阶段裁定的空串语义**（见 §1.4） | T-FIX-01 |
| 8 | `stored_value_with_padding_matches_normalized_query` | F17 归一化缺失 | T-FIX-02 |
| 9 | `query_with_padding_matches_stored_exact_value` | F17 归一化双向 | T-FIX-02 |
| 10 | `fr2_whitespace_variants_collapse_to_one_entry` | F17：两组 → 一组 | T-FIX-02 |
| 11 | `fr2_domain_owner_cannot_read_other_owners_capability` | F4 / `:110` 越权读（**即使调用者是域 owner**） | T-FIX-04 |
| 12 | `scale_must_not_hand_victim_credential_to_the_copy` | F16 凭据搬运链（**判明文不判密文**） | T-FIX-13 |
| 13 | `scale_audit_detail_must_name_the_template_owner` | A09：越权发生时审计日志完全正常 | T-FIX-13 |
| 14-17 | `combined_with_domain_id` / `combined_with_domain_id_zero_means_no_domain` / `combined_with_status` / `combined_with_domain_id_zero_and_status` | FR1 第二句的精确集（每条都带同域假阳性靶） | T-FIX-01 |

三条反例的**失败原文**（`pytest tests/test_capability_groups.py --tb=line -k "no_cross_key or underscore or percent"`）：

```text
AssertionError: Lists differ: ['A-has-cap'] != ['A-has-cap', 'B-no-cap']            ← 跨 key 假阳性
AssertionError: Lists differ: [] != ['A-has-cap', 'B-no-cap']                      ← `code_review` 的 `_` 成了单字符通配
AssertionError: Lists differ: [] != ['A-has-cap', 'B-no-cap', 'C-other']            ← `?capability=%` 把过滤器绕成无操作
AssertionError: Lists differ: [] != ['T-mine', 'U-mine-decoy']                     ← 非 admin 身份下的 `%`（A01 面内）
```

凭据搬运的一手复现（不是读代码读出来的）：

```text
AssertionError: 'sk-victim-DO-NOT-COPY' == 'sk-victim-DO-NOT-COPY'
  : 只判明文：解密拿到受害者 Key = 搬运仍成立
AssertionError: 'template_owner' not found in
  'alice | alice | domain.scale | 审计域:code-review | domain | scaled 1→2 (+1) | 127.0.0.1'   ← A09
```

> 第二条正是安全审计师要求写进 `T-FIX-13` 契约的那件事：**判密文不等会假绿**。
> 本用例判 `decrypt(副本) != 受害者明文`，`encrypt()` 每次新 nonce 这条捷径就骗不过去。

### 1.4 两处「AI 先替你定了」的裁定（须人工过目，R18.1 ①）

1. **`?capability=`（空串）= 返回 0 条**，不是「视为未传、返回全量」。依据：`T-FIX-02` 的归一化契约规定
   非 str / strip 后为空的项一律丢弃 → 归一化后空串**不可能**是任何 Agent 的能力，两种语义里只有「0 条」与它自洽。
   现状的实现是 `if capability:` 的**巧合**（空串跳过过滤）。若人工改判，**改判用例 `empty_string_query_means_zero_rows`**，
   不要用改代码绕过断言（R5.3）。
2. **`capabilities` 非 list（字符串 / `null`）视为「无能力」**，与 `k8s_routing_service._extract_capabilities` 现有行为一致；
   不新增「字符串也算单元素」的解释。落点：`T-FIX-02` 的 `capabilities_of()` docstring 须写死。

### 1.5 UAT 脚本（FR3/FR4/FR5 · 本轮唯一合法证据形式）

> 为什么是 UAT 而不是 unit：分组逻辑内联在 1428 行的 `AgentControlPlane.tsx:585-605`，`groupByCapability` 纯函数
> 尚未抽出（`T-FIX-05`）。抽出后**必须**补 `frontend/src/__tests__/capability-group.test.tsx`，
> 且含 TASK v6 追加的那条归一断言：喂 `capabilities:[""]` → 结果里无空名分组、该 Agent 落 `未分类`；
> 喂 `" code-review "` → 与 `"code-review"` 同组。**「只搬家不归一」过不了这条**。

#### UAT-1 · 三层域树展开折叠
- **前置**: 后端起服务；种子数据 = 1 个域内 3 个 Agent，其中 1 个 `capabilities: [" code-review "]`、1 个 `capabilities: []`
- **步骤**: 1. 打开控制面 → 域树 2. 展开域 3. 点能力组头（鼠标一次 + 键盘 Enter 一次）4. 展开组看实例列表
- **期望**: - 带空格那条与 `code-review` **同一组**（不出现两个组）- 无能力 Agent 落 `未分类` - 折叠头可键盘操作，`aria-expanded` 随状态翻转
- **实际**: 🟡 **未执行**（本阶段未起服务；键盘与 `aria-expanded` 部分是 `T-FIX-06` 的判据，实测当前 `grep -c aria-expanded` = 0）
- **执行人 / 时间**: 待人工 / —

#### UAT-2 · 健康概要 N healthy / M total
- **前置**: 同域内造 2 个 `status=running` + 1 个 `status=dead` 的 Agent
- **步骤**: 1. 展开能力组 2. 读组头概要 3. 与 DESIGN.md:97-104 的生命周期口径逐条对（`running/standby → healthy`）
- **期望**: - 概要 = `2 healthy / 3 total` - 概要**不得**用探针词表（`isProbeHealthy`），两套词表必须各自具名（`T-FIX-03` (c)）
- **实际**: 🟡 未执行 · 附带提醒：本 change 的 F10 教训是「两套『健康』词表混用」，人工走查时**先看用的是哪套**
- **执行人 / 时间**: 待人工 / —

#### UAT-3 · 未分类 / 默认域两个兜底桶
- **前置**: 造 1 个 `domain_id=NULL` 的 Agent
- **步骤**: 1. 看它是否落在「默认域」行 2. 看它是否落在「未分类」组
- **期望**: 与 REQUIREMENT FR5 一致
- **实际**: 🟡 未执行，且**口径本身未定**（REVIEW F19 默认域双指 = 待人工裁定第 6 条；F20 `未分类` 占用命名空间 = 第 7 条）
  → 裁定前这条 UAT 没有稳定判据，跑出的「通过」不算通过
- **执行人 / 时间**: 待人工 / —

### 1.6 覆盖率与边界

```text
$ python -m coverage run --source=. -m pytest tests/test_capability_groups.py -q
$ coverage report --include="routes/agents_api.py,routes/domain_api.py,services/k8s_routing_service.py,services/encryption_service.py"
routes/agents_api.py                189    129    32%
routes/domain_api.py                171     96    44%
services/encryption_service.py       26      4    85%
services/k8s_routing_service.py      58     40    31%
TOTAL                               444    269    39%
```

- 门槛（kit 默认 80% / core 90%）：**未达**。原因是本文件只覆盖 capability 这一条路径，
  两个 routes 模块里其余端点属别的 change —— 记为**已知偏离**，不是「覆盖率达标」。
- 有意义的子集：`agents_api.py:35-38`（能力过滤那三行）与 `domain_api.py:100-119`（FR2 端点）**被执行且被断言**，
  这两处是本 change 的病灶；`T-FIX-01/02` 落地后这两个模块的行覆盖应显著上升（作为**观察项**，不作判据）。
- 边界用例（≥3 要求）：空串 · 空白/带空格值 · 非 list（字符串）· `null` · 越界字面量（`%` / `_` / 引号闭合串）·
  域不存在 404 · 空域 · 三重参数组合 —— 共 8 类，全部在 §1.3 表内。
- 错误路径：404 × 2（越权 / 未知域）· 非 list 数据形态 × 2 · 凭据不可得路径（拒绝 或 无凭据副本 或 明文不等）三选一。

### 1.7 测试质量自检（6 维衰退风险）

| 编号 | 风险 | 命中 | 严重度 |
|---|---|---|---|
| T1 Test Obscurity | 0 | 🔴0 🟡0 🟢0 |
| T2 Test Brittleness | 1 | 🟡1（下）|
| T3 Test Duplication | 1 | 🟡1（下）|
| T4 Mock Abuse | 1 | 🟡1（下）|
| T5 Coverage Illusion | 0 | — |
| T6 Architecture Mismatch | 1 | 🟡1（下）|

**详细发现（4 要素）**

- **🟡 T4 · 审计出口被桩替换**
  **Symptom**: `CapabDbCase.setUp` 把 `routes.*.log_audit` 换成记账桩。
  **Source**: Rosenberg · *How Google Tests Software* ·「不要 mock 你测的东西」。
  **Consequence**: 若实现者改成「不落审计」而非「落得更全」，`scale_audit_*` 会因 `assertTrue(scale_records)` 而红 —— 已按这个方向写了显式判据，桩不会掩盖真实失败。
  **Remedy**: 保持桩（避免测试往仓库写 `audit.jsonl`，实测不桩时确实产生过 untracked 文件），并在 §5.1 用真实审计文件复跑一次（人工/CI）。

- **🟡 T2 · 副本识别依赖响应 `status` 而非名字**
  **Symptom**: `TestCapabScaleCredentialChain` 用「调用前后新增行」的差集识别副本，不认 `-replica-` 命名。
  **Source**: Winters 等 · *Software Design at Google* ·「测试实现细节 = 脆弱」。
  **Consequence**: `T-FIX-13` 若改命名规则，用例不受影响；若改「返回结构」，`assertIn(status, ("scaled","no_op"))` 会红并暴露契约变更 —— 这是想要的信号。
  **Remedy**: 若契约扩了新的 status 值，同步改这一行并在 SUMMARY 里说明。

- **🟡 T3 · 4 条 `combined_*` 结构相同只换参数**
  **Symptom**: `TestCapabFR1AgentFilter::test_capab_combined_*` 四条是同形不同参。
  **Source**: Meszaros · *xUnit Test Patterns* ·「Parameterized Test」。
  **Consequence**: 加第 5 个组合还要复制一段。
  **Remedy**: **本轮故意不参数化** —— 每条的种子数据不同（假阳性靶放的位置不同），合并会削弱可读性；`T-FIX-01` 落地后若仍同形，再收进 `@parameterized`。已记 §1.8。

- **🟡 T6 · 单元落在函数层，HTTP 参数绑定未被覆盖**
  **Symptom**: 新用例直调路由函数，不经过 FastAPI 的参数解析与中间件。
  **Source**: Feathers · *The Art of Unit Testing* ·「金字塔层级应与架构匹配」。
  **Consequence**: 「`?capability=` 是否真被解析成那个 kwarg」这类**契约外壳**问题不在本轮证据里。
  **Remedy**: 归开放项 O-4（起服务后的 1 条 HTTP 冒烟；`TestClient` 会被既有模块级桩污染，须自带显式覆盖并在 teardown 复原 —— 这条经验记入 §1.8，避免下一个人重踩）。

**处理**：命中 4 项 → 按模板须「release 前必修」；本 change 的 release 出口本身被 R2.5 拦着，故 T2/T3/T4/T6 全部**登记在下表**，其中 T4/T6 有对应开放项。

### 1.8 测试质量记事（议题 / 暂缓项）

| 文件 | 维度 | 严重度 | 计划 |
|---|---|---|---|
| `tests/test_capability_groups.py::test_capab_combined_*` | T3 | 🟡 | `T-FIX-01` 绿了之后再看是否参数化 |
| `tests/test_capability_groups.py`（直调函数） | T6 | 🟡 | 开放项 O-4：HTTP 层冒烟 1 条（`TestClient` + 显式 `dependency_overrides` 复原） |
| `tests/test_api_integration.py:29`（模块级桩泄漏） | T4/T5 | 🟡 | **不在本 change 面内**（属既有 41 红的根因）→ 建议随 `T-FIX-12` 议题包一并登记 |

---

## 第 2 轮 · 性能测试

**状态：未跑，阻塞待人工。** `REQUIREMENT.md` 的 NFR1（零新增 TS 错误）/ NFR2（向后兼容）/ NFR3（不建表）
均为定性判据，无一条能当预算用（无 p95、无 bundle 上限、无 LCP/CLS）。kit-5-test 步骤 2.1 要求「没有就停下来，让用户先补」。

已做的部分（不算通过判定，只是基线，避免下一轮拿不到对比）：

| 项 | 实测 |
|---|---|
| 后端全量套件耗时 | 5.92s（207 条，含新 26 条） |
| 新定向套件耗时 | 2.13s（26 条）→ 单条 ≈ 82ms，无慢查询迹象（内存 SQLite，样本太小不外推） |
| 前端 `vitest run` 基线 | **5 files / 52 tests passed**，3.91s（`frontend`，exit 0）→ `T-FIX-05/06` 新增用例的对照基线 |
| N+1 观察 | `domain_api.py:110` 与 `agents_api.py:38` 都是「一次查询 + Python 端逐行取 JSON」→ 本 change 数据量下无 N+1；**但** `T-FIX-01` 若改为逐行 `capabilities_of()` 过滤，全表扫描行数 = owner 过滤后的行数，需人工预算才能判定是否可接受 |

→ 开放项 **O-1**：请人工给 `GET /api/agents` 与 `GET /api/domains/{id}/capabilities` 的 p95 预算（或明确「内部工具，不设性能门」并签「已知接受」）。**AI 不自定阈值**。

---

## 第 3 轮 · 安全测试

### 3.1 依赖漏洞

```text
$ cd frontend && npm audit --omit=dev        # exit 1
5 vulnerabilities (4 moderate, 1 high)
  js-yaml 5.0.0 - 5.2.1        Severity: high      GHSA-pm4m-ph32-ghv5（flow 集合指数级解析 → DoS）
  esbuild  <=0.24.2            Severity: moderate  GHSA-67mh-4wv8-2f99（dev server 任意跨源读响应）
  prismjs  <1.30.0             Severity: moderate  GHSA-x7hr-w5r2-h6wg（DOM Clobbering）
$ pip-audit / bandit / semgrep               # 本机未安装 → 后端依赖与 SAST 未能出数
```

- High / Critical：**1**（`js-yaml`）。判定影响需要人：它是 `react-syntax-highlighter` 的传递依赖，
  **本仓 `npm run build` 本来就是红的**（`CLAUDE.md` 既载），`fix --force` 会连带打破 `react-syntax-highlighter@16.1.1` 的 breaking change。
  → 记 R2.5 待裁定第 1 条的**同族决策**，不由 5-test 自行降级。
- 后端：`backend/requirements.txt` 13 条**全为 `>=` 区间、无任何锁文件**（`T-FIX-12` ④ 已登记为议题）
  → CVE 基线**不可固化**，本轮**不出**「后端依赖干净」这个结论。
- 处理：open（`js-yaml` 与锁文件缺失都需人拍；修依赖本身超出 `capability-groups` 的 `write_files`）。

### 3.2 秘钥扫描（模式 grep，非工具）

```text
$ git ls-files | grep -v node_modules | grep -vE '\.(png|jpg|gif|svg|woff2?)$' | wc -l
381
$ xargs grep -nIE "(api[_-]?key|secret|password|token)\"?\s*[:=]\s*[\"'][A-Za-z0-9_\-]{16,}[\"']"
backend/services/oauth_mock.py:51  "access_token": "mock_access_token_" + uuid...
backend/services/oauth_mock.py:52  "refresh_token": "mock_refresh_token_" + uuid...
```

- 命中 **2**，判定**真凭据 0**：两条都是 `oauth_mock.py` 里与 `uuid` 拼接的**运行时生成值**，不是硬编码密钥。
- ⚠️ 口径声明（避免被当成穷尽证据）：这条模式只吃「`KEY = 字面量`」形态，
  **不等价于** `trufflehog`/`gitleaks`（本机均缺，见 3.1）→ 记盲区 **B-3**。
  本轮**新写入的测试文件**里的 `"sk-victim-DO-NOT-COPY"` / `"sk-ca"` 是刻意造的假凭据，名字已表明性质。

### 3.3 SAST

未执行（无 Semgrep / CodeQL / Bandit）。记盲区 **B-4**，不写「已扫描」。

### 3.4 OWASP Top 10（只列本轮**新增自动化证据**能判的部分；完整判定见 `REVIEW.md` §2.4，本节不重复其取证）

| 项 | 状态 | 本轮证据 / 备注 |
|---|---|---|
| A01 越权 | 🟡 **有判据未修** | `fr2_domain_owner_cannot_read_other_owners_capability`（RED，T-FIX-04）· `non_admin_percent_query_leaks_nothing`（RED） |
| A02 加密失败 | ✅ 判定不变 | `encryption_service` 每次 `nonce = os.urandom(12)`（`:20`）→ 本轮据此**否决了「判密文不等」这种判据**，用例只判明文 |
| A03 注入 | ✅ 不成立 | `quote_injection_literal_returns_zero_rows_without_error` 为护栏（0 行、不报错）；与 REVIEW 结论一致：绑定参数，只语义绕过 |
| A04 不安全设计 | 🟡 | 「域成员 = 可支配」这个错误设计仍活在 `:110`/`:208`，两条用例把它钉住（一红一红） |
| A05 配置错误 | ❌ 本轮未测 | 见 REVIEW §2.4 前提声明（身份 fail-open，A07 项下） |
| A06 漏洞组件 | ❌ 未闭环 | §3.1：1 high 待裁定 + 后端无锁文件 |
| A07 鉴权 | 🟡 未修（**不由本 change 修**） | 身份层 fail-open 是项目级议题；本轮按 `T-FIX-04` v5 结论**不等它**，用例以直传身份跑非 admin 路径 |
| A08 数据完整性 | 🟡 | `scale_*` 两条：副本不得携他人凭据；`audit` 记录须可指认模板主人 |
| A09 日志监控 | 🔴 **有判据未修** | `scale_audit_detail_must_name_the_template_owner`（RED）：`scaled 1→2 (+1)` 里查不到模板归属 |
| A10 SSRF | ❌ 不适用（本面） | 本轮 `write_files` 内无外部 URL 取回逻辑；`_quick_test.py` 的 `127.0.0.1:8000` 属冒烟脚本，已标「非回归基线」 |

---

## 第 4 轮 · 兼容性测试

### 4.1 跨浏览器 / 视口

未执行（未起 dev server；`npm run build` 必红 = 32 个 TS 错误，基线如此）。→ 开放项 **O-2**。
键盘可达（`aria-expanded` 等）是 `T-FIX-06` 判据，实测当前 `grep -c "aria-expanded" AgentControlPlane.tsx` = **0**。

### 4.2 数据迁移

**N/A，理由**：NFR3 + 实测 —— `backend/models/` 本次零改动，仓内无迁移文件，新用例只读写既有 `agents` / `domains` 两张表。
（本 change 若引入 schema 变更，R4.5 要求先回 4-dev 出迁移，本条不得写 N/A。）

### 4.3 跨版本 / 方言（**本轮必须记的一条**）

`agents_api.py:37` 的 `contains()` 在两种方言下渲染不同（REVIEW §第一轮复现）：

```text
sqlite: WHERE (agents.model_config_json LIKE '%' || ? || '%')
mysql : LIKE concat('%%', %s, '%%')
```

- 本轮 26 条用例全部跑在 **SQLite**（内存）上 → **对 MySQL 方言零覆盖**。
- 不只是语义错：MySQL 上 JSON 列隐式转 text 的序列化**是否带空格随版本变**（架构师 G4 ⑥ 加权），
  带不带空格会直接改变 `LIKE '%"...%'` 的命中集 → 同一份数据在两种部署下可能给出**不同结果**。
- 因此：`T-FIX-01` 若走 `JSON_CONTAINS`，**先把 MySQL/SQLite 双方言结论写进 DESIGN 再实现**；
  本条在 TEST.md 里状态 = **待确认**，不得被「新用例全绿」掩盖。→ 开放项 **O-5**。
- 旧 schema 数据读写：`capabilities` 三种历史形态（list / 字符串 / null）已由 §1.3 的 5、6 两条用例覆盖为「视为无能力」。
- 编码 / locale：`未分类` 是中文组名，`domain_api.py:119` 与前端各自 `sort()` → 落位依赖 locale（`T-FIX-10`），
  本轮**未**加断言（口径未定，见 §1.2 FR5 行）。

---

## 第 5 轮 · 可观测性验证

### 5.1 日志 / 审计

- [x] **凭据不落日志**：`git ls-files backend/**/*.py | xargs grep -nE "(print|log_).*api_key"` → **0 命中**（实跑）
- [x] 审计可验性有判据：A09 那条 RED 用例即「事后查得到」的可执行化（T-FIX-13 契约的 `template_id` / `template_owner`）
- [ ] 结构化 / trace-id：`audit.jsonl` 是 JSONL ✓，但**无 trace-id 字段**（`log_audit` 签名里没有）→ 记开放项 **O-6**
- [ ] 关键路径入口/出口日志：未跑（需起服务）

### 5.2 指标 / 5.3 追踪 / 5.4 告警 + 健康检查

未执行 → 开放项 **O-3**（与 `T-FIX-12` ⑥「`dead` 告警永不触发」相关，那条本身就是可观测性缺陷，但属别的 change 面）。

---

## 新增测试登记

| 用例文件 | 类型 | 覆盖 AC | 所属轮次 |
|---|---|---|---|
| `backend/tests/test_capability_groups.py`（26 条） | integration（真实 session） | FR1（15）· FR2（6）· NFR2（3）· A01/A04/A08/A09 负例（2 + 1 重叠） | 1 · 3 |
| `.specs/capability-groups/_quick_test.py`（仅加**文件头标注**） | 冒烟脚本 | 无（明确标为**非回归基线**，禁止当任何 verify 的证据） | 1 |
| `frontend/src/__tests__/capability-group.test.tsx` | unit（**待建**，`T-FIX-05` 落点） | FR3/FR4/FR5 + v6 归一断言 | 1 |
| `frontend/src/__tests__/agent-control-plane-a11y.test.tsx` | unit（**待建**，`T-FIX-06` 落点） | 键盘可达 / `aria-expanded` | 1 · 4 |

## 回归保护

本次变更可能影响的旧功能与对应证据：

- `GET /api/agents` 的既有参数（`status` / `domain_id` / 无参）→ `TestCapabNfr2Regression` 3 条，未修态已绿，**修复后必须仍绿**
- `GET /api/domains/{id}/capabilities` 契约形状（含 `domain_name`）→ `fr2_contract_shape_and_dedup`
- `POST /api/domains/{id}/scale` 的正常路径（调用者用**自己的** Agent 当模板）→ ⚠️ **无用例**：本轮只加了负例。
  记开放项 **O-7**，`T-FIX-13` 落地时须补一条正向（否则「把整条端点堵死」也能骗过负例）
- 既有 41 个红：本轮**未触碰**（定向判定，全量数只作对照）

## 出口条件（下一轮谁做什么，避免被读成「TEST 已过」）

1. `T-FIX-00` 的 verify：① 定向收集 ✓（`26/207 tests collected (181 deselected)`，此前是 `no tests collected`）
   ② 定向通过 ⏳（**修复后**才为真，未修态 17 红是设计目标 —— 见下方「一条措辞歧义」）
   ③ 三条 grep 护栏 ✓ 全 0 ④ 全量真实输出已贴 ✓ ⑤ `_quick_test.py` 已标「非回归基线」✓（`grep -c 非回归基线` = 1）
2. **一条措辞歧义（提给 6-review 与自己）**：`T-FIX-00` 的 verify ② 写成【验收】`pytest tests/test_capability_groups.py -q` 定向通过，
   但未修态它**必然为假**（RED 基线的定义就是它）。建议 TASK 下轮把 ② 标成**【验收·修复后】**，
   并把「未修态实测值 = 17 failed / 9 passed」补进基线表 —— 否则实现者会以为「把用例删了/弱化了就达标」（正是 R5.3 的入口）。
3. 代码修复（`T-FIX-01..13`）现在**解除阻塞**：RED 基线存在，`T-FIX-02` 改公开导出的前置条件（R4.6 回归覆盖）满足。
   每条落地后**复跑本节定向命令**，17 条 RED 应逐条转绿；任一红转不了 = 该条修复未真正落地。
4. **测试门（4 专家投票）本轮不召集**：在 9 项 🔴 未修、第 1 轮 17 条红、FR3-FR5 只有 UAT 的情况下召集，
   等于让专家对「还没实现的测试通过与否」投票。召集条件 = `T-FIX-01..13` 复跑后第 1 轮全绿 + O-1/O-2/O-3 有结论。
5. 4.2 跨模型二审（`REVIEW.md` 遗留）：仍未闭环，不因本轮推进而结（按 Master 的硬要求记在这里）。

## 开放项（本轮新增，须在下一轮有归属）

| # | 项 | 归属 |
|---|---|---|
| O-1 | 性能预算缺失 → 第 2 轮无法判定 | 人工（R18.1 ②）→ 补进 `REQUIREMENT.md`（R3.2：由 1-requirement 执行） |
| O-2 | 跨浏览器 / 视口未跑 | 人工 UAT |
| O-3 | 指标 / 告警 / 健康检查未跑 | `T-FIX-03` 落地后与 `5-test` 第 5 轮一起做 |
| O-4 | HTTP 参数绑定层无用例（T6） | 5-test 第 2 轮（`TestClient` + 显式覆盖复原） |
| O-5 | MySQL 方言渲染未测（JSON→text 随版本变） | `T-FIX-01` + DESIGN 记录 |
| O-6 | 审计无 trace-id | 议题（跨 change） |
| O-7 | `/scale` 正向路径无用例 | `T-FIX-13` 落地时补 |
| O-8 | **`STATE.md` 不在 `T-FIX-00` 的 `write_files` 里，但 R18.3 + 阶段规约要求写完更新状态行** → 本轮按规则改了它（`git diff --name-only` 里就这一条越界，已在此显式记账而不是藏进提交）。下轮请二选一：把 `STATE.md` 补进每条 T-FIX 的 `write_files`，**或**在该段元规则 1 里写明「`STATE.md` 状态行例外」——否则「守边界」与「写状态」互相否证，实现者只能挑一个违反 | 6-review 下一版 TASK |
