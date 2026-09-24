# Alignment: agentflow

> S-align 的产物，落 `.specs/ALIGNMENT.md`，每轮覆盖更新，历史轮次折叠进文末附录。
> 本文件是五层对齐的唯一留痕：覆盖了哪些提交、发现哪些漂移、合并了什么、哪些已对齐。
>
> **第 1 轮**（本仓此前不存在 `.specs/ALIGNMENT.md` —— 全仓 `find` 实测 0 命中，属 R15.1 缺口，见 D4-1）。
> 检测阶段全程只读（R15.2 / R15.3：不改 L1 代码，代码层漂移只能改文档/原型/决策层或开新 CHANGE）。

## 概要

- **本轮时间**：2026-09-24 10:2x（`capability-groups` 进 7-integration 前的强制轮）
- **基线范围**：`85af408f..0e8ee534`（32 条提交；净改动 **15 个文件 = 8 代码 + 7 `.md`**，`git diff --name-only 85af408f..HEAD` 实数；其中 `node_modules` 命中 **0**）
- **五层状态**：L1 代码 ✅ 0 项（本 change 代码全在 `T-FIX` 写权内，谱系 `78117a1e ⊆ 0e8ee534` 已核） · L2 原型 ⚠️ 1 项（需求溯源欠账，未拍） · L3 活文档 ⚠️ 4 项 · L4 决策留痕 ✖ **4 项未裁** · L5 执行留痕 ⚠️ 4 项
- **结论**：**12 项漂移，其中 D2-1 / D2-2 / D5-1 / D5-2 四项属未处理的决策矛盾与需求失配 → 按 kit-7 §0「检测出未处理的 D2/D5 漂移禁止继续集成」+ R2.5（未修 🔴 需逐条修或人签「已知接受」）双闸，本轮集成验证停在入口：不合并、不归档。** 与 6-review 出口口径一致（G4 4/4 = 工件可交接 ≠ 可集成）。

## 1. 覆盖的本地提交

| # | commit | 主题 | 归层 |
|---|---|---|---|
| 1 | `97044bd0`…`d1e68c07`（v1→v7 六轮） | `REVIEW.md` + `TASK.md` 六版修订（纯工件） | L4+L5 |
| 2 | `68f9bb53` / `5cd88bc7` / `a28e816f` | v8 门结 4/4 + STATE 同步 | L4+L5 |
| 3 | `0f10be77`（+`fd69c143`/`3e0216df`） | **T-FIX-05 代码**：抽 `components/capability/groupByCapability.ts` + `CapabilityGroupHeader.tsx`，页面 1428→1372 | L1+L5 |
| 4 | `eaf53010` | **T-FIX-00 代码**：`backend/tests/test_capability_groups.py` 26 条 + `TEST.md` 第 1 轮 | L1+L5 |
| 5 | `5e93984d`（+`e2cc151f`/`50d944d5`） | **T-FIX-04 代码**：`domain_api.py:111` 加 owner 行收口 | L1+L5 |
| 6 | `470775ee` | 5-test 复跑第 2 次（28 条 + `TEST.md` 增量） | L1+L5 |
| 7 | `78117a1e`（docs 件 `c7ca5bcd`） | **T-FIX-13 代码**：`domain_api.py` +14/−8 · `agents_api.py` +19/−0（代码面 **+33/−8**，v10.2 勘误后的可复现值） | L1+L5 |
| 8 | `1ce5ffbf`…`0e8ee534` | 6-review v10→v10.4（G4 第五轮召集→4/4 门结→裁决块） | L4+L5 |

未提交变更（`git status`）：**0 项自有改动**。本轮为跑阶段自检产生的两处工具痕迹已如实处理：`frontend/node_modules/.vite/vitest/results.json`（vitest 缓存，被 git 跟踪属仓内既有缺陷）→ 已 `git checkout --` 还原；`frontend/dist/`（未跟踪，非本轮产物，未触碰）。

## 2. 漂移项

| 编号 | 类型 | 层 | 证据 | 描述 | 状态 |
|---|---|---|---|---|---|
| D1-1 | D1 代码变文档未变 | L3 | `CHANGE.md:26` vs `ls backend/tests/test_capability_groups.py` | 交付物表把后端测试写在 `.specs/capability-groups/test_backend.py`（该文件不存在），实际落点在 `backend/tests/`（仓内无 pytest 配置收不到 `.specs/`）。改 CHANGE 属 R3.2 → AI 不擅改 | 需裁决（待人工裁定第 1 条连带） |
| D1-2 | D1 活文档过时 | L5 | 本进程一手复跑 @ `0e8ee534`：定向 `16 failed / 12 passed / 1 skipped`（29 条）、全量 `57/146/7` | `TEST.md:6/:8/:18` 仍写「28 条 / 18 红 / 10 护栏绿」；`:96` 仍写「安全负例 4 条全 RED → 3 RED」（实为 2 绿 / 1 红 / 1 skip） | 待合并（已派 5-test，元规则 4 单写者，我未代改） |
| D1-3 | D1 活文档过时 | L5 | 我自己按 `FAILED` 行逐文件数出：**28 + 6 + 4 + 3 = 41** | `TEST.md:54` 的既有 41 红逐文件归因写 `test_api_integration`(28)/`test_edge_cases`(7)/`test_round6_api_edges`(3) = 38 ≠ 41，漏了 `test_agent_channel_supplement`(4) 且 `test_edge_cases` 数错 | 待合并（同 F22 刷单，5-test） |
| D1-4 | D1 代码注释 vs 代码 | L1 | `domain_api.py:209` 称 `_filter_owner`「被 8 个读路径共用」；实数调用点 = **9**（`:30/:64/:87/:106/:111/:138/:163/:203/:282`，我一手 grep） | 注释计数与代码不符（架构师 ① 已记同形勘误） | 待合并（随 O-11 执行提交顺路） |
| D2-1 | D2 决策矛盾 | L4 | `domain_api.py:20-23`（`role=admin` 直接不过滤）· `:203` 域门 vs `:211` 严格候选谓词 · `agents_api.py:_assert_domain_access` · `main.py:204-210` + `auth.py:181-186`（无头即 admin） | 「不带 admin 旁路为默认」与「3 站点仍带旁路 + 第四类身份旁路」并存，且 `T-FIX-04/13` 的两处新注释各称「只改这一处」（互相矛盾）。政策未拍 → 收口形态未定 | **需裁决（O-11 + A07）** |
| D2-2 | D2 决策矛盾 | L4 | `REVIEW.md §2.4` 前提「行过滤类修复都建在可伪造身份上」 vs O-14 (β)/(γ) 的成立前提「调用者身份可信」 | 扩容凭据三分支未拍；(β)(γ) 硬等 A07 fail-closed；且 F26（`agents_api.py:112` PUT 空串静默 no-op，我实读）令「继承来的 Key 关不掉」进代价列 | **需裁决（O-14）** |
| D5-1 | D5 需求失配 | L4↔L1 | `agents_api.py:53` 仍是 `contains(f'"{capability}"')`（JSON 文本 LIKE）；`capability_service.py` 不存在；`grep -rn 'get("capabilities"' routes/ services/ \| grep -v capability_service.py \| wc -l` = **7** | FR1「单一真相」未实现 → 定向套件 15 条 FR1 红是**需求的现行可执行判据**，不是测试噪声。T-FIX-01/02 卡 O-10（R4.6 四选一未答） | **需裁决（O-10）→ 未处理即禁集成** |
| D5-2 | D5 需求失配 | L4↔L1 | `main.py:143-151` 真建 `Domain(name="默认域", owner_id="admin")` vs `AgentControlPlane.tsx:858-870` 的 `domainKey="default"` NULL 兜底桶；`未分类` 为裸字符串 key | FR5 两个兜底桶口径未定（默认域双指 / `未分类` 占用 capability 命名空间），故 `?capability=未分类` 无用例可写 | **需裁决（待人工裁定第 6、7 条）** |
| D3-1 | D3 原型/需求溯源 | L2↔L4 | 「自动路由 + 按能力扩容」规则在 `.specs/` 的 REQUIREMENT/DESIGN/CHANGE 内 0 命中，只存在于 `PRODUCT-DESIGN.html` / `COMPETITIVE-RESEARCH` / `BRAINSTORM`（F15 实测，我复核 grep 面一致） | 原型层先于需求层落地 = 本 change 的业务规则无溯源 | **需裁决（待人工裁定第 8 条）** |
| D4-1 | D4 执行留痕缺口 | L5 | `find` 全仓：`.specs/ALIGNMENT.md`、`.specs/LESSONS.md`、`.specs/CHANGELOG.md` 本轮之前均**不存在** | 项目级常驻工件从未建立 → R15.1 从未满足过（本文件即补齐的第一块）；LESSONS/CHANGELOG 属归档套件，随 ARCHIVE 产生 | 本文件 = 已合并；余 2 项：待归档 |
| D4-2 | D4 留痕渲染破损 | L5 | `REVIEW.md:552-554`（实测）：「修订记录」表的 v7/v9/v8 三行落在 ``` 代码块内部 | 表格三行不渲染，语义未损（F22 已自记为「我自己的同形疤」） | 待合并（docs 整备，不占判据、不开任务） |
| D4-3 | D4 留痕自相矛盾 | L5 | `STATE.md:30`「当前阶段 = 产品化调研与文档重写」 vs 同文件 `:10` 状态行（6-review v10 → G4 门结） | 同一文件内两处阶段口径互斥，接手者按哪行读？ | **本轮已合并（A1）** |
| D6-1 | D6 孤儿产物 | L3 | `.specs/capability-groups/_seed_domains.py`、`_seed_test_data.py`：全仓（`.specs` / `backend` / `frontend/src`）grep 引用 = **0 命中** | 无任何文档或代码引用这两个种子脚本；`_quick_test.py` 有引用（已标「非回归基线」），不算孤儿 | 建议（见 §3c，删除须人确认） |

漂移类型速查：D1 代码变文档未变 / D2 决策矛盾 / D3 原型漂移 / D4 执行留痕缺口 / D5 需求失配 / D6 孤儿产物

## 3. 合并动作

### 3a. 可自动合并（待确认后执行）

| # | 对应漂移 | 动作 | 目标文件/章节 |
|---|---|---|---|
| A1 | D4-3 | 「当前阶段」行改为本轮真实状态（7-integration 入口核验 → 停在人工闸） | `STATE.md` § 当前阶段 |
| A2 | D4-1 | 建立 `.specs/ALIGNMENT.md`（本文件）并把核验结果落盘 | `.specs/ALIGNMENT.md` · `.specs/capability-groups/UAT.md` · `STATE.md` 状态行 |

### 3b. 需人工裁决

| # | 对应漂移 | 选项 | 建议 |
|---|---|---|---|
| H1 | D1-1 | (i) 改 `CHANGE.md:26` 落点口径为 `backend/tests/`；(ii) 维持原口径并把测试搬回 `.specs/`（→ 无 pytest 配置可收集，verify 必不过） | 采 (i)（R3.2：Reviewer/Integrator 不改需求与立项件） |
| H2 | D2-1 | O-11 三出路（(A′) 逐处豁免+落审计 / (B) 去 role 旁路 / 维持默认无旁路）× A07 fail-closed 排期；**执行形状已定：站点 (a) 只作 scale 入口局部替换，禁改 `_filter_owner` 本体（9 调用点）** | 与 A07 同批裁；「改完 3 站点 ≠ 收口」，第四类旁路（无头即 admin）须同批带走 `test_api_integration.py:271-274` 那条今天即红的断言 |
| H3 | D2-2 | O-14 (α)/(β)/(γ)（(α) 不依赖前置 / (β) 依赖且无痕 / (γ) 依赖但可查）+ O-15（`desired_replicas` 约束「域」还是「调用者份额」） | 不答的后果不是「保持现状」：弹性缩放事实停用，且 `desired=5` × `no_op` 会让「删壳重扩」成为任一支出的收尾成本 |
| H4 | D5-1 | O-10 `T-FIX-02` 的 R4.6 四选一（4-dev 与 5-test 均倾向 (ii) deprecated 薄封装） | 一签即可直接派 02→01（C2 地雷已在 `e6b1e087` 拆，判据链与写权逐站相等） |
| H5 | D5-2 / D3-1 | 默认域双指与 `未分类` 命名空间（第 6、7 条）+ 路由/扩容规则溯源（第 8 条） | 属 1-requirement 层，须由人回到需求口；本 change 内禁止顺手改（R3.2/R7.1） |

### 3c. 建议删除（孤儿产物）

| # | 文件/段落 | 理由 |
|---|---|---|
| R1 | `.specs/capability-groups/_seed_domains.py` · `_seed_test_data.py` | 全仓 0 引用；数据准备职责已被 `backend/tests/test_capability_groups.py` 的 fixture 承担。删除不可逆 → **不自动执行**，等人一句话（R15.2） |

## 4. 已对齐记录

| 时间 | 漂移编号 | 对应提交 | 合并动作 | 合并提交 |
|---|---|---|---|---|
| 2026-09-24 10:2x | D4-3 | `0e8ee534` 之后的入口核验提交 | A1（STATE 当前阶段行改写） | 本轮 `agent/agent/bd9890bb5ca6` 提交，hash 记于 STATE 状态行与本文件 §5 |
| 2026-09-24 10:2x | D4-1 | 同上 | A2（建立 ALIGNMENT + UAT 核验登记） | 同上 |

## 5. 下一轮基线

`0e8ee534`（代码与工件核验锚，6-review 出口 tip）+ 本轮「7-integration 入口核验」提交（其 hash 见 `STATE.md` 集成前核验行）。**下次 S-align 从该提交开始扫**：D1-2 / D1-3（TEST.md 刷单）、D1-4（`:209` 注释）若已被 5-test / O-11 执行批合并，则在 §4 记为已对齐。

---

## 附录 · 历史轮次

（本轮为第 1 轮，无历史。）
