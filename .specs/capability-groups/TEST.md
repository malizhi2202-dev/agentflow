# TEST: capability-groups — 能力分组（Capability Groups）

- **Change ID**: capability-groups
- **关联**: `@.specs/capability-groups/REQUIREMENT.md` v1.0 · `DESIGN.md` · `TASK.md`「修复任务」段 **v10.4** · `REVIEW.md` §2.0 / §2.4 / 「G4 第四轮（4/4 门结）」/ **G4 第五轮（v10.1–v10.4，4/4 门结）** · `T-FIX-04-SUMMARY.md` / `T-FIX-05-SUMMARY.md` / `T-FIX-13-SUMMARY.md` / **`T-FIX-14-SUMMARY.md`**（本轮验收对象）
- **项目类型**: 全栈（后端 FastAPI + React/TS 前端）
- **产物**: `backend/tests/test_capability_groups.py`（现值 **29 条**用例：本工件建 28 条 + `T-FIX-13` 纯加法 1 条正向 · 新建）· 本文件
- **基线**: 第 1 次 = `5092f1de`（本阶段自己的 RED 交付）；第 2 次复跑 = `50d944d5`（`agent/agent/acdcda109f00`，含 `T-FIX-05` + cherry-pick 的本阶段 RED + `T-FIX-04`）；**第 3 次复跑 = `8923c430`**（`agent/agent/32e8f858dcb6`，起点 = 主审交付 tip `0e8ee534`，码提交 `0e30fff2`，`git merge-base --is-ancestor 0e8ee534 HEAD` 本轮一手复验 = 真）
- **当前状态**: **第 1 轮已复跑第 3 次**（2026-09-24，本阶段一手实跑，非转述）：**29 条 = 16 红 / 12 绿 / 1 skip**。
  本文档**不是**「测试通过」——**9 项 🔴 的账**（v10.4 现值）：F1（=`T-FIX-00`，本工件）✅ · F4（`T-FIX-04`）✅ · **F16（`T-FIX-13`）✅** · **余 6 项未修**
  （F2/F3 → `T-FIX-01/02`、F10 → `T-FIX-03`、F5/F6/F7 → `T-FIX-07/08/09`），R2.5 仍拦集成；
  （`T-FIX-05` 🟡 与 **`T-FIX-14` 🟡（capability 第 4 套真相已接上 · 本轮验收通过，见 §1.9）**已完成，不在这 9 项里）
  （`T-FIX-05` 是 🟡，已完成，不在这 9 项里）
  第 2 轮阻塞在需求侧缺性能预算，第 4/5 轮部分未跑。**测试门（4 专家投票）本轮不召集**，理由见文末「出口条件」。

## 本次测试范围声明（5 轮金字塔 · R5.4）

| 轮次 | 状态 | 范围 | 部分 / 跳过理由 |
|---|---|---|---|
| 第 1 轮 · 功能 | ⚠️ 部分（**已复跑第 3 次**） | 现值 **29 条** = FR1 ×17 · FR2 ×6 · NFR2 ×3 · `TestCapabScaleCredentialChain` ×3（`T-FIX-13` 纯加法补的第 29 条 = 真扩容正向路径），全部入 `backend/tests/` | FR3/FR4 **已有 unit**：`T-FIX-05` 抽出 `groupByCapability` + `capabilitiesOf`，`frontend/src/__tests__/capability-group.test.tsx` **14 条**（本轮一手复跑 `npx vitest run capability-group` → `Tests 14 passed (14)`）→ §1.5 两条 UAT 升级为 unit。**`T-FIX-14` 之后前端也只剩一处定义**（§1.9）。FR5 仍 🟡：`未分类` / 默认域口径 = 待人工裁定第 6、7 条，**裁定前不写用例**（避免把未定口径冻进代码） |
| 第 2 轮 · 性能 | ❌ 未跑（**阻塞待人工**） | — | `REQUIREMENT.md` 非功能性需求 NFR1/2/3 **无任何量化预算**（无 p95 / 无 bundle 上限 / 无 LCP），kit-5-test 步骤 2.1 明确「没有就停下来，让用户先补」→ 记开放项 O-1，不由 AI 自定义阈值（R18.1 ②） |
| 第 3 轮 · 安全 | ⚠️ 部分（**本轮补上后端 CVE 数**） | 越权 / 凭据搬运 / A09 可验性负例**已进用例**（4 条；现值 **2 绿 / 1 红 / 1 skip**，`T-FIX-04` 与 `T-FIX-13` 各收口其内，见 §1.2 末行）；`pip-audit`（verify 在隔离 venv 实跑）+ `npm audit` + 秘钥模式扫描均有数 | `trufflehog` PyPI 上只有**旧 Python v2**（不是 v3 Go 扫描器）、`gitleaks`/`semgrep`/`bandit` 无 apt 候选 → 秘钥扫描仍是模式 grep，**不等价于工具**（盲区 B-3）；SAST 未跑（B-4）；Python 侧无锁文件 → CVE 基线不可固化 |
| 第 4 轮 · 兼容 | ⚠️ 部分 | 4.3 数据迁移 = **N/A（有理由，见 §4.2）**；MySQL 方言差异记 **待确认**（§4.3） | 4.1 跨浏览器 / 4.2 视口未跑：本阶段未起 dev server，且 `npm run build` 必红（`CLAUDE.md` 既载事实，32 个 TS 错误）→ 记开放项 O-2，视觉/可达性走 UAT + 6-review 第三轮 |
| 第 5 轮 · 可观测 | ⚠️ 部分 | A09「扩容审计查得到模板主人」有可执行判据（RED）；「凭据不落日志」已 grep（§5.1） | 指标 / 告警 / `/health` liveness-readiness 区分需起服务实测 → 记开放项 O-3 |

---

## 0.1 环境口径（可复现性 · verify 执行提出，本阶段采纳）

- 本机 **`python` 不在 PATH**（只有 `python3` = 3.8.10，无依赖）→ 本文所有命令用 `/home/malizhi/.venv/bin/python`
  （**Python 3.14.4 / pytest 9.1.1 / SQLAlchemy 2.0.54 / FastAPI 0.141.1**）。
  照字面写 `python -m pytest` 的下游会直接 `command not found`，**别把「跑不起来」误读成「判据不成立」**。
- `ENCRYPTION_KEY` 必须由测试自带（新文件顶部 `os.environ.setdefault`），否则 `services/encryption_service.py` 在导入期就抛。
- 前端命令用 `./node_modules/.bin/vitest`（`npx vitest` 等价）；`npm` / `node` 在 `/tmp/node-v22.19.0-linux-x64/bin`。
- ⚠️ 跑 vitest 会改写**被 git 跟踪**的 `frontend/node_modules/.vite/vitest/results.json` → 提交前 `git checkout --` 复原，
  否则工作树脏（本阶段两次跑到都复原了 · 第 3 次复跑同样复原，`git status --porcelain` 收尾 = 0 行）。
- ⚠️ **环境事实（第 3 次复跑时新增，两个独立现场同证）**：`multica repo checkout <url> --ref <branch>` 在本机**每次都**报
  `isolate checkout Git identity: read user Git identity: exit status 129`，但**工作树照样建好**且正落在请求的 ref 上
  （本阶段实测：报错 → `git rev-parse HEAD` = `8923c430…` = origin 同一 sha、`git status` 干净）。
  机制我实跑到一半：本仓 `git 2.25.1` 在**非 git 目录**里执行 `git config --worktree …` 直接
  `BUG: environment.c:219: git environment hasn't been setup` + **exit 134**（本阶段一手复跑），与 129 同族但**不等于已定位根因**。
  **对下游的实际影响 = 零**（不是判据），但**别把这条报错读成「checkout 失败 → 换个 tip 再来」**：那会让人从错误的基线续做。
  这条同时是「`T-FIX-14` 交付现场报的同款报错」的**第二证人**（4-dev 报 52 次同错、daemon 日志无一次 checkout 成功记录）。

## 第 1 轮 · 功能测试

**全量套件真实输出**（`cd backend && ENCRYPTION_KEY=*** /home/malizhi/.venv/bin/python -m pytest tests/ -q`；
Python 3.14.4 / SQLAlchemy 2.0.54 / FastAPI 0.141.1 / pytest 9.1.1）：

```text
# 未含本次新用例（T-FIX-00 开工前，2026-09-23 10:09 实跑 @ a90ea251）
41 failed, 134 passed, 6 skipped,  41 warnings in 5.06s
# 含 26 条新用例（交付态，10:19 实跑 @ 5092f1de）
58 failed, 143 passed, 6 skipped, 161 warnings in 5.92s
# 复跑第 2 次（T-FIX-04/05 落地后，11:2x 实跑 @ 50d944d5，且本工件新增 2 条 → 28 条）
59 failed, 144 passed, 6 skipped, 165 warnings in 8.65s
# 复跑第 3 次（T-FIX-13/14 落地后，2026-09-24 10:2x 一手实跑 @ 8923c430 → 29 条）
57 failed, 146 passed, 7 skipped, 171 warnings in 6.34s
```

> 四个维度**逐条同源可核对**：41+17（RED）= 58，134+9（护栏）= 143，总数 181 → 207；
> `T-FIX-04` 让 1 条红转绿（58 → 57，143 → 144），本工件新增 2 条红（→ 59 / 144），总数 207 → 209；
> **第 3 次（本轮）四维度自洽**：非 capability 红仍是 **41**（一条未动，见下）· capability 定向 29 条 = 16 红 + 12 绿 + 1 skip
> → 41+16 = **57 红** ✓ · 134+12 = **146 绿** ✓ · 6+1 = **7 skip** ✓ · 总数 181+29 = **210** ✓。
> 第 3 行的数由本阶段**一手复跑**取得（不是转述 4-dev 的数）；4-dev 报的 `57 failed / 144 passed / 6 skipped`
> 与我加的 2 条无关，**对齐成立**。
> ⚠️ **既有 41 红不由本阶段修**：它们是 `test_api_integration`(28) / `test_edge_cases`(6) /
> `test_agent_channel_supplement`(4) / `test_round6_api_edges`(3) 里用打桩会话与漂移代码写出来的用例（架构师 ⑤）。
> **（F22 · 本轮一手更正的归因行）** 本行原写 `test_api_integration`(28) / `test_edge_cases`(7) / `test_round6_api_edges`(3)
> —— 加总 **38 ≠ 41**，且漏了 `test_agent_channel_supplement` 整个文件。现值为**一手按文件统计 FAILED 行**取得的
> `28+6+4+3 = 41`（命令与输出见 §1.9 表末行）；4-dev 的 `T-FIX-14-SUMMARY` ⑤ 与本工件**两份独立取数、加总相符**。
> 本 change 的所有判定一律走**定向**命令，
> 全量数只作对照 —— 既不许「顺手修绿 41 个」（R7.1），也不许削弱别人的断言（R5.3）。

定向与前端（**第 3 次复跑 = 本阶段一手实跑 @ `8923c430`**；上一版数保留作沿革，其 revision = `50d944d5`）：

```text
cd backend  && python -m pytest tests/test_capability_groups.py -q   → 现值 16 failed, 12 passed, 1 skipped（29 条）
                                                        （旧记录 @50d944d5：18 failed, 10 passed，28 条）
cd backend  && python -m pytest tests/ --collect-only -q -k capab     → 现值 29/210 tests collected (181 deselected)
cd frontend && npx vitest run                                        → Test Files 6 passed / Tests 66 passed
cd frontend && npx vitest run capability-group                        → Tests 14 passed (14)   ← 元规则 3：判据吃用例数，不吃退出码
cd frontend && npx tsc --noEmit | grep -c "error TS"                 → 32（= 基线，NFR1 护栏仍成立；本轮**等于** 32 不是 ≥32）
```

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

| AC | 类型 | 用例 | 未修态 → 复跑第 2 次（`50d944d5`）→ **复跑第 3 次（`8923c430`，本阶段一手）** |
|---|---|---|---|
| FR1 第一句（数组成员判定） | integration（真实 session） | `TestCapabFR1AgentFilter` ×17 | 14 RED（新增 2 条见 §1.3.1）/ 3 护栏 → **15 RED / 2 护栏**（17 条里 15 条属 `T-FIX-01/02` 的红名单，一条未减）|
| FR1 第二句（可与 `domain_id` / `status` 组合） | integration | 同上 4 条 `test_capab_combined_*`（含 `domain_id=0` 的 `IS NULL` 支与非 0 支各 1 条） | 4 RED → 4 RED → **4 RED**（`T-FIX-01` 未落地） |
| FR2（`{domain_id, capabilities}` + 去重） | integration | `TestCapabFR2DomainCapabilities` ×6 | 2 RED → **1 RED**（`T-FIX-04` 转绿跨 owner 那条）/ 4 护栏 → **1 RED / 5 绿**（未变） |
| FR3 三层域树 | ~~manual~~ → **unit 已有** | UAT-1（§1.5）+ `capability-group.test.tsx`（`groupByCapability` 分组/组键格式 4 条） | 🟡 无自动化证据 → **✅ 14 passed**（前端，实跑）→ **✅ 复跑仍 14 passed** |
| FR4 能力组展示（名/数量/健康概要/箭头） | ~~manual~~ → **unit 已有** + a11y（待 `T-FIX-06`） | UAT-2（§1.5）+ `CapabilityGroupHeader` 3 条（含 `N healthy / M total` 渲染） | 🟡 → 🟠 **部分**：健康概要与折叠头有 unit；**键盘可达 / `aria-expanded` 仍无证据**（`T-FIX-06` 未落地，实测 `grep -c aria-expanded` 页面仍 0）· **本轮新增**：`AgentBuilder` 卡片侧的 chip 渲染改吃 `capabilitiesOf`（`T-FIX-14`）→ 见 §1.9 与 **O-16**（接线级判据缺口） |
| FR5 未分类 / 默认域 | manual（前端归一半边已有 unit） | UAT-3（§1.5）+ 前端 `capabilitiesOf`「归一后只剩空值 → `未分类`」1 条；**后端半边口径未定**：`未分类` 占用 capability 命名空间（REVIEW F20 → 待人工裁定第 7 条）、默认域双指（F19 → 第 6 条）→ 本轮**不写** `?capability=未分类` 的用例，避免把未定口径冻进代码 | 🟡 待裁定（不因前端绿而升级）· 后端具名入口 `capability_service.py::capabilities_of` **今天仍不存在**（本轮一手 `ls` 复核，见 §1.9 反幻觉行）|
| NFR1 零新增 TS 错误 | 工具 | `cd frontend && ./node_modules/.bin/tsc --noEmit -p tsconfig.json \| grep -c "error TS"` → **32**（**等于**基线 32，不是 ≥32；两个 revision 各实跑一次） | ✅ 护栏（**本轮第三次实跑仍 = 32**，`T-FIX-14` 未新增类型错误） |
| NFR2 向后兼容 | integration | `TestCapabNfr2Regression` ×3 | 3 护栏 → 3 护栏（未减）→ **3 绿（未减）** |
| NFR3 虚拟分组不建表 | 静态核对 | `git diff --name-only` 内无 `backend/models/**`、无迁移文件；新用例只读写 `agents` / `domains` 两张既有表 | ✅ · 本轮 `0e8ee534..8923c430` 的 diff = **4 文件**（代码 1 个 `.tsx` + 工件 3 个 `.md`）→ 仍 ✅ |
| 安全（跨 owner / 凭据搬运 / A09） | integration | `test_capab_fr2_domain_owner_cannot_read_other_owners_capability`、`TestCapabScaleCredentialChain` ×**3**（`T-FIX-13` 加了正向路径那条）、`test_capab_non_admin_percent_query_leaks_nothing`（末条与 FR1 行重叠计） | 4 条全 RED → **3 RED**（跨 owner 转绿；`:208` 裸查未收口，凭据链两条仍红）→ **现值 2 绿 / 1 红 / 1 skip**（**F22 声明行的过时处**：`T-FIX-13` 之后搬运那条转绿、A09 审计负例转 skip〔404 不落审计 = 设计语义，`skipTest` 非静默〕、新增的正向路径绿；剩下的 1 红 = `percent_query_leaks_nothing`，归 `T-FIX-01/02`。**一手复跑**：`-k "domain_owner_cannot_read or scale_must_not_hand or scale_audit_detail or percent_query_leaks"` → `1 failed, 2 passed, 1 skipped`） |

**用例下限对照（TASK `T-FIX-00` 逐条）**：FR1 ≥8 ✓（17，含 ≥1 正向锚点 ✓、≥3 边界 ✓、空串语义已择一 ✓、空格归一 ✓）·
FR1 组合 ≥3 ✓（4）· FR2 ≥2 ✓（6，含 `domain_name` 被断言固化 ✓）· NFR2 ≥1 ✓（3）· 安全负例以非 admin 身份跑并断跨 owner ✓。

### 1.3 RED 基线（第 1 次 17 条 / 复跑第 2 次 18 条 / **复跑第 3 次 16 条**，逐条可复跑）

`cd backend && /home/malizhi/.venv/bin/python -m pytest tests/test_capability_groups.py -q`
→ 第 1 次（`5092f1de`）**17 failed, 9 passed** · 复跑第 2 次（`50d944d5` + 本工件新增 2 条）**18 failed, 10 passed**
· **复跑第 3 次（`8923c430`，本阶段一手）= 16 failed / 12 passed / 1 skipped（29 条）**。

**16 → 逐条去向（不是"红自己少了"，R7.3 的自查）**：第 2 次的 18 红 − `T-FIX-13` 收口的 2 条（`scale_must_not_hand_victim_credential_to_the_copy` 转绿、`scale_audit_detail_must_name_the_template_owner` 转 skip）= **16**，
其余 16 条**同名同数**（本轮 `-v` 逐条点名，见下表末），**一条未被顺手修绿、一条未被削弱**（R5.3）。
本轮新增的第 29 条（`T-FIX-13` 纯加法：`scale_allowed_path_names_template_owner_and_carries_no_template_key`）现值 **PASSED**。

| # | 用例（省略 `test_capab_` 前缀） | 钉的缺陷 | 修它的是 | 第 3 次现值 |
|---|---|---|---|---|
| 1 | `no_cross_key_false_positive` | F2 反例①（跨 key 假阳性） | T-FIX-01/02 | 🔴 RED |
| 2 | `underscore_is_not_a_single_char_wildcard` | F2 反例②（`_` 当通配） | T-FIX-01/02 | 🔴 RED |
| 3 | `percent_is_not_a_wildcard_passthrough` | F2 反例③（`%` 绕穿） | T-FIX-01/02 | 🔴 RED |
| 4 | `non_admin_percent_query_leaks_nothing` | 同上 + A01 边界（非 admin 身份） | T-FIX-01/02 | 🔴 RED |
| 5 | `capabilities_as_plain_string_is_not_a_membership` | 边界：非 list 视为无能力 | T-FIX-02 | 🔴 RED |
| 6 | `capabilities_null_is_tolerated` | 边界：`null` + 无关 key | T-FIX-02 | 🔴 RED |
| 7 | `empty_string_query_means_zero_rows` | **本阶段裁定的空串语义**（见 §1.4） | T-FIX-01 | 🔴 RED |
| 8 | `stored_value_with_padding_matches_normalized_query` | F17 归一化缺失 | T-FIX-02 | 🔴 RED |
| 9 | `query_with_padding_matches_stored_exact_value` | F17 归一化双向 | T-FIX-02 | 🔴 RED |
| 10 | `fr2_whitespace_variants_collapse_to_one_entry` | F17：两组 → 一组 | T-FIX-02 | 🔴 RED |
| 11 | `fr2_domain_owner_cannot_read_other_owners_capability` | F4 / `:110` 越权读（**即使调用者是域 owner**） | T-FIX-04 | ✅ 已绿（`T-FIX-04`） |
| 12 | `scale_must_not_hand_victim_credential_to_the_copy` | F16 凭据搬运链（**判明文不判密文**） | T-FIX-13 | ✅ 已绿（`T-FIX-13`） |
| 13 | `scale_audit_detail_must_name_the_template_owner` | A09：越权发生时审计日志完全正常 | T-FIX-13 | ⚪ SKIP（404 不落审计 = 设计语义，`skipTest` 有注释，非静默） |
| 14-17 | `combined_with_domain_id` / `combined_with_domain_id_zero_means_no_domain` / `combined_with_status` / `combined_with_domain_id_zero_and_status` | FR1 第二句的精确集（每条都带同域假阳性靶） | T-FIX-01 | 🔴 RED ×4 |
| 18-19 | `normalization_folds_inner_whitespace` / `query_does_not_fold_case` | §1.3.1 的两条（后端归一化 = 前端同规则 / `LIKE` 折叠大小写） | T-FIX-01/02 | 🔴 RED ×2 |
| — | 其余 10 条 = 5 条 FR2 护栏 + 3 条 NFR2 护栏 + `positive_anchor…` + `quote_injection…` + `T-FIX-13` 新增正向 | 护栏 / 正向锚点 | — | ✅ 10 绿（+1 skip 已单列） |
| **合计** | **29 条** | | | **16 🔴 / 12 ✅ / 1 ⚪** |

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

### 1.3.1 复跑第 2 次的增量（1 条转绿 · 本工件新增 2 条 · 1 条**新确认的假阳性形态**）

| 变化 | 用例 | 一手证据 |
|---|---|---|
| ✅ 转绿（`T-FIX-04`） | `fr2_domain_owner_cannot_read_other_owners_capability` | 单跑 `-k fr2_domain_owner` → `1 passed, 25 deselected`；改动是 `domain_api.py:110` 复用 `_filter_owner(..., Agent)`（`git show 5e93984d` = 1 文件 `-4/+4`） |
| 🆕 新增红 | `normalization_folds_inner_whitespace`（`"  a\t\tb  "` 存 → 查询 `a b` 须命中） | `Lists differ: [] != ['H1-inner-ws']` |
| 🆕 新增红 | `query_does_not_fold_case`（存 `Code-Review` → 查询 `code-review` 须 **0 条**） | `Lists differ: ['H2-case'] != []` ← **今天真返回了那一行** |

> **这条新确认为什么值得单独记**：`?capability=code-review` 现在能把能力写成 `Code-Review` 的 Agent 也捞出来 ——
> SQLite 的 `LIKE` 对 ASCII **默认不区分大小写**。这是 F2（`contains()` 走文本 LIKE）的**第 4 种表现形态**，
> 此前 REVIEW 只记了跨 key / `_` / `%` 三种，**没人发现大小写也被悄悄折叠了**。
> 归 `T-FIX-01` 同一处修复（换成 Python 端成员判定即一并消失），但**验收口径要补上它**：
> 只写「三种反例转绿」的判据会漏掉这一类。
> ⚠️ 大小写那半条依赖一条**未拍的产品裁定**（`T-FIX-02`：「`casefold()` 折不折叠由产品拍，先按不折叠」），
> 改判时**本条与前端 `capability-group.test.tsx:74` 必须同时改**（只改一边 = 把 F18 从「一个 bug」变成「两套真相」）。
>
> 另：本工件**新增的 2 条不改变任何既有断言**，`MagicMock`/`urlopen`/`8800` 三条 grep 仍为 0，定向数从 26 → 28。

### 1.4 三处「AI 先替你定了」的裁定（须人工过目，R18.1 ①）

1. **`?capability=`（空串）= 返回 0 条**，不是「视为未传、返回全量」。依据：`T-FIX-02` 的归一化契约规定
   非 str / strip 后为空的项一律丢弃 → 归一化后空串**不可能**是任何 Agent 的能力，两种语义里只有「0 条」与它自洽。
   现状的实现是 `if capability:` 的**巧合**（空串跳过过滤）。若人工改判，**改判用例 `empty_string_query_means_zero_rows`**，
   不要用改代码绕过断言（R5.3）。
2. **`capabilities` 非 list（字符串 / `null`）视为「无能力」**，与 `k8s_routing_service._extract_capabilities` 现有行为一致；
   不新增「字符串也算单元素」的解释。落点：`T-FIX-02` 的 `capabilities_of()` docstring 须写死。
   ✅ 复跑时核对：**前端 `capabilitiesOf` 已按同一口径实现并断言**（`capability-group.test.tsx:77-83`，非数组/非字符串 → `[]`）→ 两端一致，本条可视为已定。
3. **归一化细则**（`T-FIX-02` 明写：`strip()` + **折叠连续空白** + `casefold()` 折不折叠**由产品拍、先按不折叠**）。
   `T-FIX-05` 落地时前端已把这三条写成断言（`:73` 折叠空白、`:74` 不折大小写），而**后端此前没有任何用例钉它**
   → 「F18 单一真相」只剩后端一层。本轮补 §1.3.1 那 2 条把后端半边钉上；
   ⚠️ **大小写那一半不是我的裁定**，是 `T-FIX-02` 里的临时口径，**待产品拍**（新开放项 O-9）。

### 1.5 UAT 脚本 → 复跑后：**UAT-1/2 已升级为 unit**，UAT-3 仍待裁定

> 第 1 次为什么只能记 UAT：分组逻辑内联在 1428 行的 `AgentControlPlane.tsx:585-605`，没有可断言的单元。
> `T-FIX-05`（`0f10be77`）抽出 `groupByCapability` + `capabilitiesOf` + `CapabilityGroupHeader` 后，
> 落点 `frontend/src/__tests__/capability-group.test.tsx` 有 **14 条**（本阶段一手复跑 `npx vitest run capability` → `Tests 14 passed (14)`）。
> **升级依据是逐条对得上的**，不是「有测试文件就算过」：

| 原 UAT 期望 | 现在由哪条 unit 承担（用例名取自该文件） | 状态 |
|---|---|---|
| 空串能力不落空名分组、落 `未分类` | `capabilitiesOf · 空串能力不得自成一组，须落 未分类`（`:51`，断 `not.toContain('')` + 落兜底桶） | ✅ 自动化 |
| 带空格值与规范值同组 | `前后空格归一后与规范值同组`（`:62`）+ `归一后同一 Agent 内的重复项去重`（`:68`） | ✅ 自动化 |
| 纯空白 / 非字符串 / 缺字段 | `纯空白能力等同无能力`（`:57`）、`非字符串项 / 非数组 / 缺字段一律丢弃，不抛异常`（`:77`） | ✅ 自动化 |
| 域树三层展开折叠（真实 DOM 路径） | `按 capability 分组，多能力 Agent 落多组`（`:27`）+ `组键格式`（`:45`）+ `CapabilityGroupHeader 渲染组名与健康概要`（`:97`） | 🟠 单元级已过，**浏览器里的折叠交互仍无证据**（未起服务） |
| 健康概要 `N healthy / M total` | `渲染组名与健康概要（N healthy / M total）`（`:97`） | ✅ 自动化（渲染层） |
| 折叠头键盘可达 + `aria-expanded` | **无** | 🟡 仍是 UAT（`T-FIX-06` 未落地；`AgentControlPlane.tsx` 内 `grep -c aria-expanded` 仍 **0**） |
| FR5 默认域双指 / `未分类` 占用命名空间 | **不写用例** | 🟡 待人工裁定第 6、7 条 |

#### UAT-1 · 三层域树展开折叠
- **前置**: 后端起服务；种子数据 = 1 个域内 3 个 Agent，其中 1 个 `capabilities: [" code-review "]`、1 个 `capabilities: []`
- **步骤**: 1. 打开控制面 → 域树 2. 展开域 3. 点能力组头（鼠标一次 + 键盘 Enter 一次）4. 展开组看实例列表
- **期望**: - 带空格那条与 `code-review` **同一组**（不出现两个组）- 无能力 Agent 落 `未分类` - 折叠头可键盘操作，`aria-expanded` 随状态翻转
- **实际**: 🟠 **一半升级为 unit**（分组/归一/组键 4 条 + 渲染 3 条，`npx vitest run capability` → 14 passed，本阶段一手复跑）；
  **浏览器里的折叠交互与键盘可达仍未执行**（本阶段未起服务；`aria-expanded` 是 `T-FIX-06` 判据，实测页面 `grep -c aria-expanded` = 0）
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
# 第 1/2 次（28 条）                          # 复跑第 3 次（29 条 @ 8923c430，本阶段一手实跑）
routes/agents_api.py                189  129  32%   →  198  133  33%
routes/domain_api.py                171   96  44%   →  172   95  45%
services/encryption_service.py       26    4  85%   →   26    4  85%
services/k8s_routing_service.py      58   40  31%   →   58   40  31%
TOTAL                               444  269  39%   →  454  272  40%
```

- 门槛（kit 默认 80% / core 90%）：**未达**。原因是本文件只覆盖 capability 这一条路径，
  两个 routes 模块里其余端点属别的 change —— 记为**已知偏离**，不是「覆盖率达标」。
- 有意义的子集：`agents_api.py:35-38`（能力过滤那三行）与 `domain_api.py:100-119`（FR2 端点）**被执行且被断言**，
  这两处是本 change 的病灶；`T-FIX-01/02` 落地后这两个模块的行覆盖应显著上升（作为**观察项**，不作判据）。
- 边界用例（≥3 要求）：空串 · 空白/带空格值 · **内部连续空白** · **大小写** · 非 list（字符串）· `null` ·
  越界字面量（`%` / `_` / 引号闭合串）· 域不存在 404 · 空域 · 三重参数组合 —— 共 10 类，见 §1.3 + §1.3.1。
- 错误路径：404 × 2（越权 / 未知域）· 非 list 数据形态 × 2 · 凭据不可得路径（拒绝 或 无凭据副本 或 明文不等）三选一。
- ✅ 复跑第 2 次（`50d944d5`，28 条）后**上面那张 coverage 表数字一字未变**：新增的 2 条走的是同一批行，没有把覆盖率「跑高」——
  这句话是给下一个人的防误导提示（覆盖率没动 ≠ 用例没起作用，红的是谓词不是可达性）。
- ⚠️ **但第 3 次（`8923c430`）动了**，且原因要说清：`TOTAL 444 → 454` 语句、`39% → 40%` —— 增的 10 个语句来自 `T-FIX-13` 加的**后端代码**（不是用例，`agents_api.py 189 → 198`），本工件那条纯加法用例只走既有行。
  **本轮没有削弱任何断言**（16 条红的名单与第 2 次逐条同名，见 §1.3），覆盖率微升 ≠ 测试变松，两件事别混着读。

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
| `frontend/src/pages/AgentBuilder.tsx`（capability 取值接线） | T5 的镜像形态：**判据侧空转** | 🟡 | **本轮新增（`T-FIX-14`）**：该文件的能力取值改吃 `capabilitiesOf` 后**零用例引用它**（`grep -rn "AgentBuilder" frontend/src/__tests__` → 无命中，一手实跑）→ 两条【验收】grep 只钉「写法」不钉「行为」。判据强度实测见 §1.9.3，补口登记 **O-16** |

### 1.9 `T-FIX-14` 交接验收轮（第 3 次复跑 · 2026-09-24 · 本阶段一手实跑，非转述）

**被验对象**：分支 `agent/agent/32e8f858dcb6` @ **`8923c430`** · 起点 = 主审交付 tip `0e8ee534` · 唯一含代码的提交 **`0e30fff2`** · 工件 `T-FIX-14-SUMMARY.md`。
**本阶段自己的复跑坐标**：`multica repo checkout … --ref agent/agent/32e8f858dcb6` → 本机 tip = `8923c4306c9968f4ed561297550c976a4ff7e7b4`，与 `git ls-remote origin refs/heads/agent/agent/32e8f858dcb6` **同一 sha**（一手对比 = 交付确已推 origin）；`git status --porcelain` 行数 = **0**（干净）。

#### 1.9.1 谱系 / 边界 / 验收（逐条一手命令）

| 判据 | 本阶段实跑的命令 | 结果 |
|---|---|---|
| 从评审 tip 线性可 FF | `git merge-base --is-ancestor 0e8ee534 HEAD` | **真**（且未动评审分支 `agent/agent/aea499f3c310`、未并 main → 与交付自述一致，R15.2 仍拦合并） |
| 边界（R6.5） | `git diff --name-only 0e8ee534 HEAD` / `--numstat` | **4 文件** = 代码 `frontend/src/pages/AgentBuilder.tsx`（**+2 −1**）+ 工件 `T-FIX-14-SUMMARY.md` / `TASK.md` / `STATE.md`；代码 diff 内容 = 1 行 import + `var capabilities = capabilitiesOf(a);`，**不带走任何自带判断** |
| 【验收①】 | `grep -c "model_config_json.capabilities" src/pages/AgentBuilder.tsx` | 起点 tip `0e8ee534` = **1** → 现值 = **0** ✅（起点值在**自己的** tip 上重取，未抄 `50d944d5` 的字面数 → 元规则 2：判据未漂移） |
| 【验收②】 | `grep -c "capabilitiesOf" src/pages/AgentBuilder.tsx` | 起点 = **0** → 现值 = **2**（`import` + 调用）✅ |
| 前端只剩一处定义（F18 的前端半边） | `grep -rn "model_config_json\.capabilities\|cfg\.capabilities\|\.capabilities) ||" frontend/src --include=*.tsx --include=*.ts` | 只剩 `components/capability/groupByCapability.ts:25` 的**文档注释**（规则定义处自身）→ ✅；消费点 2 个（helper 内 `:55` + `AgentBuilder:49`）+ `AgentControlPlane.tsx:570` 经 `groupByCapability` 间接消费 |
| 既有 41 红一条未动 | `pytest backend/tests -q \| grep ^FAILED \| awk -F'::' '{print $1}' \| sort \| uniq -c` | `test_api_integration` **28** · `test_capability_groups` 16 · `test_edge_cases` **6** · `test_agent_channel_supplement` **4** · `test_round6_api_edges` **3** → 非 capability 红 = **28+6+4+3 = 41** ✅ 同名同数（也正是据此刷掉 §1 那条 41 红归因行原本写的 28+7+3=38 —— F22 第①件） |

**护栏四数与基线逐条同值**（一手，`8923c430`）：`tsc --noEmit \| grep -c "error TS"` = **32**（**等于**基线，不是 ≥32；本文件那条既有 `number \| null` 错误仍在，行号 `:107 → :108`，按元规则 4b 只作提示不作判据）· `vitest run capability-group` = **14/14**（用例数已断言 ≥1，元规则 3，不是 pattern 打空的假绿）· 全量前端 = **6 files / 66 tests 全绿** · 后端定向 = **16F/12P/1S（29）**、全量 = **57F/146P/7S（210）**。跑 vitest 会写被跟踪的 `frontend/node_modules/.vite/vitest/results.json` → 本阶段同样 `git checkout --` 还原，未入库。

#### 1.9.2 一条必须写进判定的事实：**这次替换不是纯搬家**（行为变了）

本阶段自己的一次性探针（用仓内既有 `esbuild` 转译 helper，并**忠实复刻消费点形状** = `capabilities.length > 0` + `capabilities.map(cap => <span>{cap}</span>)`；脚本不落仓）逐条复跑 4-dev 的 SUMMARY ⑥：

| 载荷 `model_config_json.capabilities` | 旧内联 | `capabilitiesOf` | 用户可见差异 |
|---|---|---|---|
| `[""]` | `shows=true` chips=`[""]` | `shows=false` chips=`[]` | 空 chip 消失，**连带「加载记忆」按钮也不渲染**（同一个 `length > 0` 门，现居 `AgentBuilder.tsx:59`） |
| `["   "]` | `shows=true` chips=`["   "]` | `shows=false` chips=`[]` | 同上 |
| `["code-review"," code-review ",7,null]` | 4 chips（含 `"7"`、`"null"`） | 1 chip | 去重 + 非字符串丢弃 |
| `["deep   research"]` | `deep   research` | `deep research` | 折叠连续空白 |
| `{"x":1}`（非数组对象） | `shows=false` | `shows=false` | 无 |
| `"abc"`（**字符串载荷**） | **抛 `TypeError`** | `shows=false` | 整张卡片原先挂不掉 → 现在降级为无 chip（健壮性收口） |
| config 缺失 / `null` | `shows=false` | `shows=false` | 无 |

**判定（三条，逐条给依据）**：① 差异方向 = 向 helper 既有语义清单（`groupByCapability.ts:3-9`）靠齐，**不是新语义**，且归一那 7 条用例本轮逐条点名仍全绿（`:51` 空串 · `:57` 纯空白 · `:62` 前后空格 · `:68` 去重 · `:72` 折叠连续空白不折大小写 · `:77` 非字符串/非数组 · `:86` 只剩空值）→ **不判回归**；② 但 `[""]` / `["   "]` 载荷下**记忆入口随之消失**是真实的用户可见变更（按钮与 chip 共用同一个门），列为 §1.9.4 的人工过目项，不由本阶段判"应该"；③ 反幻觉更正复核成立 —— `backend/services/capability_service.py` **今天不存在**（`ls` → 无此文件，它是 `T-FIX-02` 的交付物），后端今天真正在跑的是 `services/k8s_routing_service.py:20 _extract_capabilities` + **7 处内联**（一手计数 = 7）→ **「两端各自只有一处定义」这条不变量本轮之后只在前端成立**：别让「第 4 套真相已接上」被读成「单一真相达成」。

#### 1.9.3 本阶段查出的一条**判据强度**问题（不是 4-dev 的偏离，是判据自己的）

两条【验收】是 `grep -c` 计数，实测**可被同义写法绕过**（同一探针喂 5 种等价内联形状；TASK 字面 pattern 里的 `.` 未转义，故要求"`model_config_json` 恰好 1 个任意字符后接 `capabilities`"）：

```text
var c1 = (a.model_config_json && a.model_config_json.capabilities) || [];   ← 命中（计数 1）
var c2 = (a.model_config_json?.capabilities) || [];                          ← 漏
var c3 = (a.model_config_json || {}).capabilities || [];                     ← 漏
var c4 = a.model_config_json["capabilities"] || [];                           ← 漏
var c5 = a.model_config_json?.["capabilities"] ?? [];                         ← 漏
```

即：**把那条判断改成可选链写法，第 4 套真相就回来了，而【验收①】仍是 0。** 加严版判据（本阶段实测可用：现值 **0**，同探针命中 3/5，含 `c2`/`c4`）：
`grep -Ec "model_config_json\s*\??\s*[.\[][[:space:]]*[\"']?capabilities" src/pages/AgentBuilder.tsx`。
**处置**：TASK 的判据文本不由本阶段改（那是 3-task / 6-review 的写权）→ 与 §1.9.4 的接线级用例合起来登记为 **O-16**，交主审裁。另注：`grep -c "model_config_json" src/pages/AgentBuilder.tsx` 现值 = **0**（起点 1）→ 若愿意，这条更窄的文件级判据可作 ① 的替身，但它会随页面日后合理使用该字段而失效，故只作候选不作建议。

#### 1.9.4 本阶段的两条裁决（4-dev 交上来的两件，逐条给结论）

**裁决 A · 接线级用例（4-dev 的「建议，非判据」）→ 本阶段判：落，但不由 5-test 本轮自己写。**
- **判「落」的依据**：① 该文件**行为确实变了**（§1.9.2 三类可见差异 + 一类不再抛错），而 R4.2/R4.3 的字面要求（改动伴随测试改动）本轮为零；② 钉住它的只有两条 grep 计数，且这两条**实测可被同义写法绕过**（§1.9.3）→ 现在的状态是「只有工件在管」，不是「只有测试在管」；③ `AgentBuilder` 目前**零测试引用**（一手 grep 无命中）→ 这条缺口是本 change 里唯一一处「前端行为变更无自动化判据」。
- **判「不由我写」的依据**：全仓没有任何任务的 `write_files` 含前端测试文件（`T-FIX-00` 只给 `backend/tests/test_capability_groups.py` + `TEST.md` + `_quick_test.py`），本阶段新建 `frontend/src/__tests__/*.test.tsx` = R6.5 越界 + R2.3（无 TASK 落点不写代码）。**同一件事若 4-dev 做也是越界**（他的 `write_files` 只有那个 `.tsx`）→ 所以他交上来是对的，不是失职。
- **可执行形状已核实存在**（避免给出一条做不动的建议）：`AgentBuilder` 是默认导出、prop 只有 `onSelect`、数据来自 zustand `useAgents`（`stores/agents.ts:25`）→ 既有测试范式里 `useChat.setState({...})` 已有 5 处先例（`chat-store.test.ts:11` 等）、`global.fetch = vi.fn()` 已有先例（`frontend-edge-cases.test.tsx:13`）→ 用 `useAgents.setState({agents:[…], loading:false})` 喂种子即可渲染，**不需要新依赖、不需要起服务**。
- **建议判据（写来给主审直接落 TASK）**：渲染 `AgentBuilder`，喂 `model_config_json.capabilities = ["   "]` → 断言**不出现空 chip、且「加载记忆」按钮不渲染**；喂 `["a", " a "]` → 断言**只剩 1 个 chip**。未修态（`0e8ee534`）该两条**必红**（旧内联渲染 1 个空白 chip + 按钮 / 2 个 chip）→ 是行为判据，不是写法判据。登记 **O-16**。

**裁决 B · `T-FIX-00` 的勾选账面（`TASK.md:123` 仍 `[ ]`，STATE 记「✅ 本阶段闭环」）→ 本阶段判：勾上 `[x]`，并已改。**
- 依据 = 本阶段在 `8923c430` **一手复跑该任务五条 verify**：① 定向收集 ✅（`-k capab` → `29/210 tests collected (181 deselected)`，未修态原文是 `no tests collected`）· ② 定向数 ✅ 有源（现值 `16F/12P/1S`，与 §1.3 逐条名单一致；该条标【验收·**修复后**】，按元规则 2 它今天**本应为假**，红的 16 条全归 `T-FIX-01/02`，不是本任务未完项）· ③ 三条护栏 grep ✅（`MagicMock` / `urlopen` / `8800` 逐个 = **0**）· ④ 全量真实输出已贴 ✅（本轮补第 3 次那行，四个维度自洽）· ⑤ `_quick_test.py` 文件头「非回归基线」标注 ✅ 在位（`grep -c assert` 仍 = 0，走的正是「保留标注」那条合法出路）。
- 勾的是**本任务自身的交付闭环**（RED 基线钉住 + 工件 + 标注），**不是**「capability 测试已全绿」——后者仍写在 §1.3 与「出口条件」里，16 条红一条没少。这条区分也写进勾选行本身，防下一个读 `[x]` 的人误判。


---

## 第 2 轮 · 性能测试

**状态：未跑，阻塞待人工。** `REQUIREMENT.md` 的 NFR1（零新增 TS 错误）/ NFR2（向后兼容）/ NFR3（不建表）
均为定性判据，无一条能当预算用（无 p95、无 bundle 上限、无 LCP/CLS）。kit-5-test 步骤 2.1 要求「没有就停下来，让用户先补」。

已做的部分（不算通过判定，只是基线，避免下一轮拿不到对比）：

| 项 | 第 1 次（`5092f1de`） | 复跑第 2 次（`50d944d5`） |
|---|---|---|
| 后端全量套件耗时 | 5.92s / 207 条 | **8.65s / 209 条**（+2 条用例；wall time 在本机浮动大，**不作判据**） |
| 新定向套件耗时 | 2.13s / 26 条（≈ 82ms/条） | **4.55s / 28 条**（≈ 163ms/条；每条都建一次内存库 + `create_all`，成本在 fixture 不在被测代码 → 不外推） |
| 前端 `vitest run` 基线 | 5 files / 52 tests，3.91s | **6 files / 66 tests，7.18s**（exit 0）；定向 `vitest run capability` = 14 passed |
| `T-FIX-04` 的查询形态 | — | **零新增往返**：改动是给既有那一条查询加 `WHERE agents.owner_id = ?`（非 admin 时），admin 时代码路径与改前完全一致（`git show 5e93984d` = 1 文件 `-4/+4`）。索引实测：`models/agent.py:14` 的 `owner_id` **有** `index=True`，`:22` 的 `domain_id` 是 FK **无** 索引（SQLite 不自动给 FK 建）→ 非 admin 路径吃 `owner_id` 索引且选择度高，**不是性能回归**；真正该盯的是 `T-FIX-01` 把谓词从 SQL 挪进 Python 之后，行数 = owner 过滤后的全行数 |
| N+1 观察 | `domain_api.py:110` 与 `agents_api.py:38` 都是「一次查询 + Python 端逐行取 JSON」→ 本 change 数据量下无 N+1；**但** `T-FIX-01` 若改为逐行 `capabilities_of()` 过滤，全表扫描行数 = owner 过滤后的行数，需人工预算才能判定是否可接受 | 同上（未变） |

→ 开放项 **O-1**：请人工给 `GET /api/agents` 与 `GET /api/domains/{id}/capabilities` 的 p95 预算（或明确「内部工具，不设性能门」并签「已知接受」）。**AI 不自定阈值**。

> **第 3 次复跑（`8923c430`）的对照数**（本阶段一手，只作沿革，不作判据）：定向 **2.70s / 29 条**（≈ 93ms/条，比第 2 次的 163ms/条低 —— 同一台机器 wall time 浮动大，再次印证「耗时不入判据」）· 后端全量 **6.34s / 210 条** · 前端 `vitest run` **6 files / 66 tests** 全绿。
> `T-FIX-14` 的性能影响：仅把一次 `array \|\| []` 换成同量级的遍历 + 去重（O(n)，n = 单 Agent 的能力数，实测数据里 ≤ 3），**无可测回归面**；它不在后端路径上。


---

## 第 3 轮 · 安全测试

### 3.1 依赖漏洞

```text
$ cd frontend && npm audit --omit=dev                       # exit 1
5 vulnerabilities (4 moderate, 1 high)
  js-yaml 5.0.0 - 5.2.1        Severity: high      GHSA-pm4m-ph32-ghv5（flow 集合指数级解析 → DoS）
  esbuild  <=0.24.2            Severity: moderate  GHSA-67mh-4wv8-2f99（dev server 任意跨源读响应）
  prismjs  <1.30.0             Severity: moderate  GHSA-x7hr-w5r2-h6wg（DOM Clobbering）

# 后端：第 1 次写「本机全缺 → 不出结论」，复跑时由 verify 执行在**隔离 venv** 里装上 pip-audit 2.10.1 实跑
$ pip-audit -r <68 项 venv 快照> --no-deps --desc on        # rc 1
Found 8 known vulnerabilities in 4 packages（7 个唯一 ID）
  anyio 4.14.0        CVE-2026-63374 / -64847 / -63349 → 4.14.2   ✅ 可达（httpx/starlette/anthropic 的传递依赖）
  PyPDF2 3.0.1        PYSEC-2026-1835 → 3.9.0（官方建议迁 pypdf）  ✅ **直接声明项** requirements.txt:10
  pip 26.1.2          PYSEC-2026-3721 → 26.2                       ❌ 解释器工具本身，不在声明面
  soupsieve 2.8.4     CVE-2026-85999 / -86000 → 2.9.0              ❌ 经 beautifulsoup4←markdownify，而 markdownify 不在 requirements.txt（venv 自带）
```

- High / Critical：**前端 1**（`js-yaml`）。后端那 8 行的 **severity 未逐条取到**（复跑输出里没给）→ **不猜级**，
  要定级就重跑 `pip-audit --desc on` 把每条的 `severity` 字段贴回来（挂在 O-12 下：常驻化 + 补 severity，两件事一起）。
  前端这条的判定影响需要人：`js-yaml` 是 `react-syntax-highlighter` 的传递依赖，而**本仓 `npm run build` 本来就是红的**
  （`CLAUDE.md` 既载），`fix --force` 会连带 `react-syntax-highlighter@16.1.1` 的 breaking change
  → 记 R2.5 待裁定的**同族决策**，不由 5-test 自行降级。
- **只有 2 个包落在声明面上**（`PyPDF2` + `anyio`），其余 2 个包属工具链 / venv 自带 ——
  这条拆分对定性有用：**别把「8」读成「本应用有 8 个洞」**。
- ⚠️ **更正第 1 轮的一处措辞过宽**：我写过「仓内无任何锁文件」。**Python 侧属实**
  （只有 `backend/requirements.txt`，13 条全 `>=` 区间，无 pip-tools/poetry/uv 锁），
  但 npm 侧有被 git 跟踪的 `frontend/package-lock.json`，另有 `backend/package-lock.json` 是 `"packages": {}` 的**空壳**。
  正确口径：**Python 侧无锁文件 → 后端 CVE 基线不可固化**；npm 侧有锁但 `audit` 仍要人拍降级（`T-FIX-12` ④ 的作用域须照此收窄）。
- 使用限制：那份 68 项清单是**跑测试那个 venv 的快照**，不严格等于 `requirements.txt`；
  `pip-audit` **没有**装进共享 venv（装在一次性 venv，事后复核共享 venv 仍 68 项、无 pip-audit）
  → 要把它变成人人可跑的常驻工具，需要有人拍「装进共享 venv」这一步（记开放项 O-12）。

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
  **不等价于** `trufflehog`/`gitleaks` → 记盲区 **B-3**。
- **复跑时补的两条事实（比第 1 轮的措辞更准）**：
  ① `trufflehog` 在 PyPI 上最高只有 **2.2.1（旧 Python v2）**，**不是** v3 Go 扫描器，`apt-cache` 亦无候选
  —— 所以「装不上」这个说法本身也不准确，正确说法是「**装得上但不是那个工具**」；
  ② 扫描面被我低估了：`git ls-files frontend/node_modules | wc -l` = **35517** 个被 git 跟踪的依赖文件
  （`CLAUDE.md` 既载此事）→ 模式 grep 跳过了它们（我排除了 `node_modules`），
  因此 B-3 的真实范围是「**跟踪面 381 → 全跟踪面 35,898**」，不是「381 个文件扫完」。
  本轮**新写入的测试文件**里的 `"sk-victim-DO-NOT-COPY"` / `"sk-ca"` 是刻意造的假凭据，名字已表明性质。

### 3.3 SAST

未执行（无 Semgrep / CodeQL / Bandit；`pip install bandit` 未做，见 O-12 的常驻化决策）。记盲区 **B-4**，不写「已扫描」。

### 3.4 OWASP Top 10（只列本轮**新增自动化证据**能判的部分；完整判定见 `REVIEW.md` §2.4，本节不重复其取证）

| 项 | 状态 | 本轮证据 / 备注 |
|---|---|---|
| A01 越权 | 🟠 **`:110` 已收口，但留了一条互斥要人裁** | `fr2_domain_owner_cannot_read_other_owners_capability` **转绿**（真实 session 一手复跑，单跑 `1 passed`）· `non_admin_percent_query_leaks_nothing` 仍 RED（等 `T-FIX-01`）。⚠️ admin 旁路与本工件的【护栏】互斥，4-dev 按护栏保留既有 admin 分支 → 三条出路记 **O-11** |
| A02 加密失败 | ✅ 判定不变 | `encryption_service` 每次 `nonce = os.urandom(12)`（`:20`）→ 本轮据此**否决了「判密文不等」这种判据**，用例只判明文 |
| A03 注入 | ✅ 不成立（**但表现形态从 3 种增到 4 种**） | `quote_injection_literal_returns_zero_rows_without_error` 为护栏（0 行、不报错）；与 REVIEW 结论一致：绑定参数，只语义绕过。复跑新证据：同一处 `LIKE` 还**悄悄折叠了大小写**（§1.3.1）→ 「语义绕过」不止通配符一条 |
| A04 不安全设计 | 🔴 **半修** | 「域成员 = 可支配」：`FR2` 端点（`:110`）已收口，**`:208` 的模板候选集仍是裸查**（4-dev 自己指出，并给出复用 `_filter_owner(..., Agent)` 的落点）→ 凭据搬运两条用例保持 RED，等 `T-FIX-13` |
| A05 配置错误 | ❌ 本轮未测 | 见 REVIEW §2.4 前提声明（身份 fail-open，A07 项下） |
| A06 漏洞组件 | 🟠 有数未闭环 | §3.1：前端 1 high 待裁；后端 `pip-audit` 实跑 **8 行 / 7 个唯一 ID / 4 个包**，其中**只有 `PyPDF2` + `anyio` 落在声明面**；Python 侧无锁文件 → 基线不可固化 |
| A07 鉴权 | 🟡 未修（**不由本 change 修，但它决定 A01 的成色**） | **一手复核**：`backend/auth.py:181-186` 在 `request.state.user` 缺失时 `user = get_user("admin")` → **不带身份头即 admin**（`CLAUDE.md` 亦载）。含义：admin 分支还在，`:110` 的行收口在**未鉴权路径上就是空操作** —— 这是 A07 与该分支的耦合，必须与 O-11 一起裁。本轮用例**不等它**（按 `T-FIX-04` v5 结论直传身份跑非 admin 路径） |
| A08 数据完整性 | 🟡 | `scale_*` 两条：副本不得携他人凭据；`audit` 记录须可指认模板主人 |
| A09 日志监控 | 🔴 **有判据未修** | `scale_audit_detail_must_name_the_template_owner`（RED）：`scaled 1→2 (+1)` 里查不到模板归属 |
| A10 SSRF | ❌ 不适用（本面） | 本轮 `write_files` 内无外部 URL 取回逻辑；`_quick_test.py` 的 `127.0.0.1:8000` 属冒烟脚本，已标「非回归基线」 |

---

## 第 4 轮 · 兼容性测试

### 4.1 跨浏览器 / 视口

未执行（未起 dev server；`npm run build` 必红 = 32 个 TS 错误，基线如此）。→ 开放项 **O-2**。
本轮**自动化基线**已随 `T-FIX-05` 上移：`npx vitest run` = **6 files / 66 tests passed**（复跑一手，第 1 次是 5 files / 52）；
`npx vitest run capability` = **14 passed**（元规则 3：判据吃用例数，不吃退出码）。
可达性的现状（一手测，两个文件分别数）：`AgentControlPlane.tsx` `aria-expanded` = **0** / `tabIndex` = **0** / `onKeyDown` = **1**（在别处，非折叠头）；
`components/capability/CapabilityGroupHeader.tsx` 三个全 **0** → `T-FIX-06` 的落点已从「1428 行大文件」变成这个新组件，
**它的 `write_files` 里目前没有该新文件**（4-dev 亦报同一处）→ 与 O-13 同类：action 点名的对象搬了家，落点没跟着搬。

### 4.2 数据迁移

**N/A，理由**：NFR3 + 实测 —— `backend/models/` 本次零改动，仓内无迁移文件，新用例只读写既有 `agents` / `domains` 两张表。
（本 change 若引入 schema 变更，R4.5 要求先回 4-dev 出迁移，本条不得写 N/A。）

### 4.3 跨版本 / 方言（**本轮必须记的一条**）

`agents_api.py:37` 的 `contains()` 在两种方言下渲染不同（REVIEW §第一轮复现）：

```text
sqlite: WHERE (agents.model_config_json LIKE '%' || ? || '%')
mysql : LIKE concat('%%', %s, '%%')
```

- 本轮 **29** 条用例（第 1 次记录时是 26 条，现值见 §1.3）全部跑在 **SQLite**（内存）上 → **对 MySQL 方言零覆盖**。
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

| 用例文件 | 类型 | 覆盖 AC | 作者 / 落点 | 所属轮次 |
|---|---|---|---|---|
| `backend/tests/test_capability_groups.py`（**现值 29 条** = 本工件 28 + `T-FIX-13` 纯加法 1） | integration（真实 session） | FR1（17）· FR2（6）· NFR2（3）· `TestCapabScaleCredentialChain`（3：凭据搬运 / A09 审计 / 真扩容正向） | 前 28 条 = 5-test（本工件）· **第 29 条 = 4-dev（`T-FIX-13`，测试文件对 `0726c73b` 删除行数 = 0，纯加法）** | 1 · 3 |
| `frontend/src/__tests__/capability-group.test.tsx`（**14 条**） | unit（纯函数 + 组件渲染） | FR3（分组/组键）· FR4（渲染 / onToggle）· FR5 前端半边（归一后落 `未分类`）· F17/F18 归一 | `T-FIX-05`（4-dev）· **本阶段复跑核对**：`npx vitest run capability-group` → 14 passed（第 3 次仍 14/14） | 1 |
| `frontend/src/__tests__/agent-builder-capability-wiring.test.tsx`（**待建**，落点见 O-16） | unit（页面渲染 · 喂 `useAgents.setState` 种子） | 把 `T-FIX-14` 的两条 grep 判据**升级为行为判据**：`["   "]` → 无空 chip 且无「加载记忆」按钮；`["a"," a "]` → 只剩 1 个 chip | **待 4-dev**（需先有 TASK 落点：全仓无任务的 `write_files` 含前端测试文件 → 5-test 自建 = R6.5 越界） | 1 |
| `frontend/src/__tests__/agent-control-plane-a11y.test.tsx` | unit（**待建**，`T-FIX-06` 落点） | 键盘可达 / `aria-expanded`（实测页面与该头组件 `aria-expanded` / `tabIndex` 均 **0**，`onKeyDown` 只在页面别处 1 处） | 4-dev（待） | 1 · 4 |
| `.specs/capability-groups/_quick_test.py`（仅加**文件头标注**） | 冒烟脚本 | 无（明确标为**非回归基线**，禁止当任何 verify 的证据） | 5-test（本工件） | 1 |

## 回归保护

本次变更可能影响的旧功能与对应证据：

- `GET /api/agents` 的既有参数（`status` / `domain_id` / 无参）→ `TestCapabNfr2Regression` 3 条，未修态已绿，**修复后必须仍绿**（复跑第 2 次：仍 3 绿 ✅）
- `GET /api/domains/{id}/capabilities` 契约形状（含 `domain_name`）→ `fr2_contract_shape_and_dedup`（复跑仍绿；**它的 admin 身份断言与 TASK 的「不带 admin 旁路」互斥 → O-11**）
- `POST /api/domains/{id}/scale` 的正常路径（调用者用**自己的** Agent 当模板）→ ⚠️ **无用例**：本工件只加了负例。
  记开放项 **O-7**，`T-FIX-13` 落地时须补一条正向（否则「把整条端点堵死」也能骗过负例）
- **一手复核**（不转述）：`domain_api.py:208` 仍是 `db.query(Agent).filter(Agent.domain_id == domain_id).all()` 裸查，
  `:231 template = matching[0]` / `:236 owner_id=user["id"]` / `:243 api_key_encrypted=template.api_key_encrypted` **原位未动**，
  文件仍 290 行 → 凭据搬运两条用例保持 RED 是**应有状态**，不是用例写歪。
- `T-FIX-04` 的改法是**参数化既有谓词**（`_filter_owner(q, user, model=Domain)`），**没有新增第 6 份 owner 副本**
  （全仓仍 5 份：4 个 route 模块 + `storage/sqlite_backend.py:31`）→ 这一条对 F3/F18「副本数」的账是**中性偏正**，
  已登记进另开 CHANGE 的清单，不由本 change 收口。
- capability 的**第 4 套真相**：`frontend/src/pages/AgentBuilder.tsx`（原 `:48` 的 `(a.model_config_json && a.model_config_json.capabilities) || []`，
  同样不过滤空串/空白）→ **本轮已接上**（`T-FIX-14` · 码提交 `0e30fff2` · 本阶段一手验收见 §1.9）→ **O-13 关闭**；
  但**接线侧零用例**（该文件不被任何测试引用）+ 两条 grep 判据实测可被同义写法绕过 → 新开放项 **O-16**；
  同一载荷在后端 A2 记忆里仍按未归一的原始数组用（空串 = 匹配全部）→ 新开放项 **O-17**（归 `T-FIX-01`，不新开任务）
- 既有 41 个红：本工件**未触碰**（定向判定，全量数只作对照）

## 出口条件（下一轮谁做什么，避免被读成「TEST 已过」）

1. `T-FIX-00` 的 verify（三个 revision 各跑一次：交付态 `5092f1de` + 复跑态 `50d944d5` + **本轮 `8923c430`**，
   并由 verify 执行在 `5092f1de` 做过一次第二方复跑，五条**一字不差**命中期望）：
   ① 定向收集 ✓（26 → 28 → **`29/210 tests collected (181 deselected)`**，此前是 `no tests collected`）
   ② 定向通过 ⏳（**修复后**才为真；未修态 17 红 → 复跑 18 红 → **本轮 16 红**，逐条去向见 §1.3）
   ③ 三条 grep 护栏 ✓ 全 0（**本轮第三次实跑仍全 0**）④ 全量真实输出已贴 ✓（本轮补第 3 次那行，四维度自洽）
   ⑤ `_quick_test.py` 已标「非回归基线」✓（本轮复核文件头标注在位，`grep -c assert` 仍 = 0 → 走的是「保留标注」那条合法出路）
   → **五条齐 ⇒ 本阶段已把 `TASK.md:123` 的 `- 状态:` 勾成 `[x]`**（裁决 B，逐条一手依据在 §1.9.4；勾的是本任务闭环，不是「测试全绿」）
2. **一条措辞歧义，现已两次命中 → 建议升格为元规则**：`T-FIX-00` 的 verify ② 写成【验收】「定向通过」，
   但未修态它**必然为假**（RED 基线的定义就是它）；4-dev 在 `T-FIX-04` 撞到**同一条**的第二例
   （它的 verify 字面作用域「定向套件通过」在单任务粒度不可判定，17 红分属 01/02/04/13 四个任务）。
   建议 TASK v9 写进元规则 2 的通用条款：**跨任务共享的判据一律标【验收·修复后】+ 附未修态实测值**。
   不这么写的后果照旧：实现者以为「删掉/弱化用例就达标」（R5.3 的入口）。
   **本轮补一条同族第三例（判据的"可绕性"）**：`T-FIX-14` 的两条【验收】是 grep 计数，实测把那条判断改成可选链写法
   （`model_config_json?.capabilities`）就能在第 4 套真相**复活**的同时让【验收①】仍为 0 → 见 §1.9.3 / **O-16**。
   元规则 2 管的是"取值来源"，这一例管的是"**字面 pattern 判据的覆盖面**"：写 `grep -c "<字面>"` 时须同时说明它挡不住哪些等价写法。
3. 代码修复的阻塞状态（本轮更新）：`T-FIX-04` ✅ / `T-FIX-05` ✅ / `T-FIX-13` ✅（凭据链两条按设计收口：1 绿 + 1 skip）/ **`T-FIX-14` ✅ 本轮验收通过**
   · `T-FIX-01` 等 `T-FIX-02` 的产物 · **`T-FIX-02` 卡在 R4.6 的人批（O-10 四选一）→ 它是当前队列头，且 4-dev 手上「不卡人工」的任务已清零**；
   每条落地后**复跑本节定向命令**，对应红应逐条转绿；任一红转不了 = 该条修复未真正落地。
   ⚠️ 判据链按 `TASK.md` v10.4 的现值走：`16F/12P/1S` →〔02〕`15F/13P/1S` →〔01〕`0F/28P/1S`（**别再按「13F」或「1F 等 A07」验收**；
   且「02→15F」这一环**系推导非实测**（02 未落地不可观测），引用时不得与已实测混写 —— Master 的诚实条款，本阶段附议）。
4. **测试门（4 专家投票）本轮仍不召集**，理由更新为：9 项 🔴 结 3 项（F1 = 本工件、F4 = `T-FIX-04`、**F16 = `T-FIX-13`**）**余 6 项未修**，
   定向 16 红，且 FR3/FR4 的前端 unit 只覆盖到纯函数层（浏览器交互 / 键盘可达无证据 · 接线级判据缺口见 O-16）。
   召集条件 = 第 1 轮 **29 条**全绿 + O-1（性能预算）/ O-2（跨浏览器）/ O-3（可观测）/ O-10 / O-11 有结论。
5. 4.2 跨模型二审（`REVIEW.md` 遗留）：仍未闭环，不因本轮推进而结（按 Master 的硬要求记在这里）。
6. **本轮为什么没有召集 5-test 子循环（verify 执行 + AC 抽查）**：本轮交付物 = F22 豁免刷单（3 处数字/归因行）+ 单条 T-FIX 的交接验收，
   不是新一轮金字塔。刷进去的每一个数都由本阶段**一手实跑**取得（§1.9.1 表），且这四个数此前已有三份独立同数
   （4-dev 的 `T-FIX-14-SUMMARY` ⑤ · 主审 v10 票面 · 安全审计师在 `1ce5ffbf` 的自跑）→ 再派第二方复跑同一批命令的期望信息增量≈ 0。
   **下一判定点按契约召集**：`T-FIX-02 → T-FIX-01` 落地后复跑定向（那时要判的是「红转绿条数 = action 点名的 AC 数」，属 AC 逐条抽查面）+ 第 2/4/5 轮补齐（O-1/O-2/O-3）。

## 本轮更正（我自己写错/写旧的行，逐条给依据；第 3 次复跑 = 后三行 = F22 豁免单三件）

| 更正 | 原来写的 | 现在的事实（一手核对方式） |
|---|---|---|
| 交接基线 | 我给 4-dev 的「从 `5092f1de` 起分支」 | **按字面会拿到 v6 的 TASK/REVIEW**：`5092f1de` 的父提交是 `a90ea251`，`d1e68c07`(v7) / `68f9bb53`(v8) **不是它的祖先**（`git log --graph 50d944d5` 可核）。4-dev 改用「cherry-pick 到 v8 tip 之上」并核对我的三个文件逐字节未动（`git diff 5092f1de 50d944d5 -- <三个文件>` 输出为空，本阶段复核一致）。**教训写死**：交接给下游的基线必须是**可核的祖先关系**，不是「我刚推的那个 commit」 |
| 锁文件口径 | 「仓内**无**任何锁文件」 | Python 侧属实，npm 侧有被跟踪的 `frontend/package-lock.json`（+ `backend/package-lock.json` 是空壳）→ §3.1 已收窄为「**Python 侧**无锁文件」 |
| 状态时效 | 「`groupByCapability` 还没抽出」 | 我读的是 10:04 的 tip；`T-FIX-05`（`0f10be77`）已抽出并带 14 条 unit → §1.5 已升级。**这与主审那两条「我在复述状态而不是数状态」同病根**：写工件前重新取数，别复用十分钟前读到的世界 |
| **（F22·①）41 红的逐文件归因行** | `test_api_integration`(28) / `test_edge_cases`(**7**) / `test_round6_api_edges`(3) → 加总 **38 ≠ 41**，且**整个 `test_agent_channel_supplement` 被漏掉** | 一手按文件统计：`pytest backend/tests -q \| grep ^FAILED \| awk -F'::' '{print $1}' \| sort \| uniq -c` → **28 + 6 + 4 + 3 = 41**（第 3 次复跑同数）→ §1 归因行已按现值改写。这条错在**归因**不在判据：41 这个总数一直是对的（TASK 的【护栏·基线】判据没被污染）|
| **（F22·②）声明行** | §1.2 末行「安全（跨 owner / 凭据搬运 / A09）**4 条全 RED → 3 RED**」+ 文件头「**28 条**用例」 | 一手实跑：`-k "domain_owner_cannot_read or scale_must_not_hand or scale_audit_detail or percent_query_leaks"` → **`1 failed, 2 passed, 1 skipped`**（= 2 绿 / 1 红 / 1 skip，`T-FIX-13` 之后）；用例数 **29**（`--collect-only -q -k capab` → `29/210 collected`，第 29 条 = `T-FIX-13` 的纯加法正向）。两处均已改写 |
| **（F22·③）定向数** | §1 记录块「`18 failed, 10 passed`（28 条）」+ 全量「`59 / 144 / 6`」 | 现值 = **`16 failed / 12 passed / 1 skipped`（29）**、全量 = **`57 / 146 / 7`（210）**；两条都补了取值 revision（`8923c430`），并按元规则 2 保留旧行作沿革。**18→16 不是红自己消失**：转绿的 2 条逐条点名 = `scale_must_not_hand…`（`T-FIX-13`）+ `scale_audit_detail…`（同批转 skip，404 不落审计 = 设计语义）→ 其余 16 条同名同数，全归 `T-FIX-01/02` 的红名单 |

## 开放项（O-1~O-8 为第 1 次，O-9~O-13 为复跑第 2 次新增，**O-16 / O-17 为复跑第 3 次（本轮）新增**；O-14/O-15 已被 REVIEW 的待人工裁定账本占用 → 本工件不占该两号）

| # | 项 | 归属 |
|---|---|---|
| O-1 | 性能预算缺失 → 第 2 轮无法判定 | 人工（R18.1 ②）→ 补进 `REQUIREMENT.md`（R3.2：由 1-requirement 执行） |
| O-2 | 跨浏览器 / 视口未跑 | 人工 UAT |
| O-3 | 指标 / 告警 / 健康检查未跑 | `T-FIX-03` 落地后与 `5-test` 第 5 轮一起做 |
| O-4 | HTTP 参数绑定层无用例（T6） | 5-test 第 2 轮（`TestClient` + 显式覆盖复原） |
| O-5 | MySQL 方言渲染未测（JSON→text 随版本变） | `T-FIX-01` + DESIGN 记录 |
| O-6 | 审计无 trace-id | 议题（跨 change） |
| O-7 | `/scale` 正向路径无用例 | `T-FIX-13` 落地时补 |
| O-8 | **`STATE.md` 不在 `T-FIX-00` 的 `write_files` 里，但 R18.3 + 阶段规约要求写完更新状态行** → 本轮按规则改了它（`git diff --name-only` 里就这一条越界，已在此显式记账而不是藏进提交）。下轮请二选一：把 `STATE.md` 补进每条 T-FIX 的 `write_files`，**或**在该段元规则 1 里写明「`STATE.md` 状态行例外」——否则「守边界」与「写状态」互相否证，实现者只能挑一个违反。**第 2 次命中**：`T-FIX-04` 撞到同一堵墙（4-dev 亦选择「改 + 在 SUMMARY 显式记账」）→ 两条同证，建议直接补 `write_files` | 6-review 下一版 TASK |
| O-9 | **归一化的大小写口径未拍**：`T-FIX-02` 写「`casefold()` 折不折叠由产品拍，先按不折叠」→ 前端 `capability-group.test.tsx:74` 与本工件新增的 `query_does_not_fold_case` 都按**不折叠**钉。若产品改判折叠，**两处必须同时改判**（只改一边 = F18 从「一个 bug」变成「两套真相」） | 人工 / 产品（经 6-review 并入待裁定） |
| O-10 | **`T-FIX-02` 命中 R4.6，四选一没人答 → 队列头卡在这**。引用图（4-dev 已做好）：`_extract_capabilities` 定义在 `k8s_routing_service.py:20`（11 行体）被 `domain_api.py:9` 跨模块 import，调用点 `:175/:211/:285` → 同时命中「删既有代码 ≥5 行」与「删/重命名导出符号」。(i) 删符号 + 改 3 处调用（`T-FIX-13` 的锚点需重定位）· **(ii) 保留为 deprecated 薄封装委托 `capabilities_of`（4-dev 与本阶段都倾向这条：只命中「删 ≥5 行」一条，符号与 import 面不动、漂移最小，且 F18「唯一入口」照样成立）** · (iii) 不动（七副本停在 6，`T-FIX-02` 的【验收】判据必红）。⚠️ R4.6 的人批**不由 5-test 代签** | 人工（R4.6 硬性）|
| O-11 | **admin 旁路与本工件护栏互斥**（= 待人工裁定第 9 条的具体化）。TASK `T-FIX-04`：「模型/模板收口默认**不带** admin 旁路」；本工件【护栏】`fr2_contract_shape_and_dedup`：admin 身份请求他人域、断言看得见其 capability → **不可同时为真**。三条出路：**(A)** 改 TASK 文本（非 admin 收口、admin 沿用既有分支）—— 代价：`auth.py:181-186` 的 fail-open 使「无身份头 = admin」，所以 A 在未鉴权路径上等于**`:110` 的收口形同未修**（A07 修好前该分支对外敞开）。**(A′)** TASK 自己给出的形态：豁免保留但须写成**显式分支 + 落审计**（现况是隐式复用 `_filter_owner` 的 admin 分支，不满足 A′）—— 选它我就补一条「admin 读他人域须落审计」的用例（现在**不写**，免得像 FR5 那样把未定口径冻进代码）。**(B)** 真要 no-bypass：**由 5-test 把该护栏的调用身份从 admin 改成域 owner 本人**（断言的两项 capability 一字不改，属**换身份不换强度**，不是 R5.3 的削弱），4-dev 再删分支。⚠️ 若 4-dev 先删分支会留下 1 条红被读成「dev 改坏了测试」→ **顺序不能反：先裁，再由 5-test 改，再删**（本轮把这条写死的原因：护栏在我手里） | 人工签（R2.5 第 9 条 · 唯一会改变代码形状的那条） |
| O-12 | **`pip-audit` 常驻化**：verify 执行在**一次性 venv** 里装上跑出了后端 CVE 数（共享 venv 未被污染，已复核），但人人可复跑需要有人拍「装进共享 `/home/malizhi/.venv`」这一步；同时那 8 行的 **severity 未逐条取到** → 定级要补一次跑 | 人工（工具链）|
| O-13 | **capability 第 4 套真相**：`frontend/src/pages/AgentBuilder.tsx`（原 `:48`）的 `(...).capabilities \|\| []` 不过滤空串/空白（4-dev 在 `T-FIX-05` 中发现）。F18 现写「后端 7 + 前端 1」→ 要么给 `T-FIX-01/02` 补这个落点，要么把它记进 F18 清单，**别让「前端已平」这句话停在半真的账上** | **✅ 本轮关闭**：`T-FIX-14`（`0e30fff2`）已把它换成 `capabilitiesOf`，本阶段一手验收过（§1.9）；「前端已平」现在成立、**后端 7 处仍待 `T-FIX-01/02`** |
| O-16 | **`T-FIX-14` 的判据强度缺口（本阶段查出，非 4-dev 的偏离）**：① 该接线文件**零用例引用**（`grep -rn AgentBuilder frontend/src/__tests__` 无命中）→ 行为变更只被工件钉着；② 两条【验收】是 grep 计数，**实测可被同义写法绕过**（改成 `model_config_json?.capabilities` → 计数仍 0、第 4 套真相复活；5 种等价形状里字面 pattern 只命中 1 种）。建议出路二选一或都做：**(a)** 落一条接线级渲染用例（判据原文与本阶段核实过的可执行形状在 §1.9.4 裁决 A / 新增测试登记行，`useAgents.setState` 范式已有 5 处先例，不需要新依赖）；**(b)** 把 ① 的 pattern 换成加严版（§1.9.3 给了实测可用的那条）。**要落 TASK 才有人能写**（前端测试文件不在任何任务的 `write_files` 里 → 5-test 与 4-dev 自建同为 R6.5 越界） | **6-review / 主审**（R14 派单：建议开 `T-FIX-15`，写权 = 新前端测试文件）；本阶段不自我授权 |
| O-17 | **后端 A2 记忆装载仍按未归一的原始数组判定**（`agents_api.py:152` 取 `cfg.get("capabilities", [])` → `:164` `if capabilities:` → `:168` `cap.lower() in m.key.lower()`）：载荷 `[""]` 时**空串对任何 key 都子串命中 → 等于不过滤、把该用户近 7 天的 20 条记忆全装进上下文**（一手语义实跑：`"" in "anything"` = True），而非字符串元素会让 `/run` 抛 `AttributeError`（`7.lower()`）→ 前端本轮收口后**同一载荷两端行为方向相反**：卡片不显示该能力，后端却按它匹配一切。该处**今天无任何用例**（`grep -n "memor" backend/tests/test_capability_groups.py` 无命中）。**归 `T-FIX-01`**（它的 action 已含 `agents_api.py:152` 改消费 `capabilities_of`，v10.2·C2）→ 不新开任务；本阶段**不提前写用例**（01 未落地，判据现在为假是设计态，且会把未收口的形状冻进代码） | `T-FIX-01` 落地时由 5-test 补 2 条用例（空串载荷须 0 装载 / 非字符串元素不得抛）· 现登记不修 |
