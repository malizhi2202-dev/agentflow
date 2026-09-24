# UAT + 集成前核验登记 · capability-groups（7-integration 入口轮）

- **执行者**：集成归档（7-integration 主责 · Verifier+Release 角色）
- **时间 / 锚**：2026-09-24 10:2x CST @ tip `0e8ee534`（分支 `agent/agent/aea499f3c310`；实现谱系 tip `c7ca5bcd`；`git merge-base --is-ancestor 78117a1e 0e8ee534` = YES）
- **本轮判决**：**集成闸门保持关闭** —— 不合并（R15.2）、不归档（R2.5 + kit-7 §0 D2/D5 未清）、不跑 UAT（UAT 是人的动作，见 §3）。G4 的 4/4 只结「审查工件可交接」，本文件把它与「可集成」之间的距离逐条量出来。
- **一手性声明**：本文件所有数字均为**本进程实跑**（命令与输出原文在 §1）；引用他人数处已标来源 tip。**R4.4：无输出不声称通过。**

---

## 1. 全套自动化（阶段步骤 1 · 真实输出）

```text
$ cd backend && /home/malizhi/.venv/bin/python -m pytest tests/test_capability_groups.py -q
16 failed, 12 passed, 1 skipped, 130 warnings in 2.73s

$ cd backend && /home/malizhi/.venv/bin/python -m pytest tests/ -q
57 failed, 146 passed, 7 skipped, 171 warnings in 7.12s

# 按文件分解（我自己数 FAILED 行，用来复核 TEST.md 的归因行）
28  tests/test_api_integration.py
16  tests/test_capability_groups.py
 6  tests/test_edge_cases.py
 4  tests/test_agent_channel_supplement.py
 3  tests/test_round6_api_edges.py   → 非 capability 红 = 28+6+4+3 = 41 ✓

$ cd frontend && npx tsc --noEmit | grep -cE 'error TS[0-9]+'
32                                    # 【护栏】判据要求 =32（不是 ≥32）→ 本 change 未新增类型债

$ cd frontend && npm run build        # tsc && vite build
（tsc 阶段即失败，vite build 从未执行）→ 与 CLAUDE.md 既载事实一致：**当前没有可用的生产构建**

$ cd frontend && npx vitest run
Test Files  6 passed (6)   Tests  66 passed (66)

$ cd frontend && npx vitest run capability
Test Files  1 passed (1)   Tests  14 passed (14)
```

**对数结论**：定向 `16F/12P/1S`、全量 `57/146/7`、非 capability 41 红、`tsc=32`、前端 `66/14` —— **与 6-review v10 票面、TASK 判据链的未修态基线全部逐数对上**（既证明工件可验证，也证明红线仍在）。**第 4 种表现形态我复核为真**：`agents_api.py:53` 仍是 `Agent.model_config_json.contains(f'"{capability}"')`（JSON 文本 LIKE），故 FR1 的 15 条红是需求未实现的现行判据，不是测试噪声。

---

## 2. R2.5 台账（🔴 必须修复或人签「已知接受」）

权威计数 **9 项 🔴**（`REVIEW.md` 严重发现表逐行数出：F1 F2 F3 F4 F5 F6 F7 F10 **F16**（`| **F16** |` 加粗起头，用 `^\| F` 会漏））。我在 tip `0e8ee534` 逐条重取锚点：

| 🔴 | 归属任务 | 本轮一手取值 | 状态 |
|---|---|---|---|
| F1 测试门禁 | T-FIX-00 | `backend/tests/test_capability_groups.py` 存在、29 条；`TEST.md` 507 行 | ✅ 已修（转绿有据） |
| F4 无 owner 行过滤（`:110`） | T-FIX-04 | `domain_api.py:111` 走 `_filter_owner(..., Agent)` | ✅ 已修（身份层另计，见 §4 A07） |
| F16 凭据搬运链 | T-FIX-13 | `domain_api.py:248` = `api_key_encrypted=encrypt(payload.get("api_key") or "not_set")`，模板 Key 不再复制；审计行带 `template_id=`/`template_owner=`/`credential=`（`:263`） | ✅ 已修（取得链闭合；**使用面未闭合，见 §4**） |
| F2 两套真相（API LIKE vs 数组成员） | T-FIX-01 | `agents_api.py:53` 仍是 LIKE；定向 15 条 FR1 红 | 🔴 **未修**（卡 O-10） |
| F3 重写既有抽象 7 处 | T-FIX-02 | `grep -rn 'get("capabilities"' routes/ services/ \| grep -v capability_service.py \| wc -l` = **7**；`services/capability_service.py` **不存在** | 🔴 **未修**（卡 O-10） |
| F5 `#fff` 硬编码 | T-FIX-07 | `grep -cE "#fff\b\|#ffffff\b" src/pages/AgentControlPlane.tsx` = **6**（要求 0） | 🔴 **未修** |
| F6 硬编码字号/间距/圆角 | T-FIX-08 | `grep -c "var(--s[0-9]\|var(--r-"` = **0**（要求 >0）；`fontSize: 28/11/10`、`borderRadius: 8` 仍在 | 🔴 **未修**（字号那半待人工定 scale） |
| F7 卡片嵌卡片（三层树） | T-FIX-09 | 结构未动（`AgentControlPlane.tsx` 三层卡） | 🔴 **未修** |
| F10 两套「健康」词表混用 | T-FIX-03 | `grep -c "a\.health" src/pages/AgentControlPlane.tsx` = **2**（要求 0，且必须是全文内容锚 —— 行区间版是已证伪的假绿） | 🔴 **未修** |

→ **3 修 / 6 未修，且「已知接受」签字 0 份**：R2.5 **未解除**。
`T-FIX-05`（F11 🟡）与 `T-FIX-14`（F18 🟡 第 4 套真相）不在此表；后者 4-dev 在飞，取值 `grep -c "model_config_json.capabilities" src/pages/AgentBuilder.tsx` = **1** / `capabilitiesOf` = **0**（判据要求 0 / ≥1），我不代做也不代判（R3 角色红线）。

## 2b. 人工欠项清点（谁签、签什么）

**MALIZHI-14 全部 12 条评论的作者类型 = `agent`，`member` 0 条** —— 即：**本 change 至今没有任何一条人工签字**。据此逐条判定：

| 欠项 | 内容 | 不答的后果（不是「保持现状」） |
|---|---|---|
| O-9 | 归一化是否折叠大小写（前后端必须同批改） | 01 落地时 `query_does_not_fold_case` 判据走向未定 |
| O-10 | `T-FIX-02` 的 R4.6 四选一 | 02/01 全队列冻结 → FR1 15 条红长驻 |
| O-11 | admin 旁路口径（3 站点 + 第四类旁路） | 「改完 3 站点 ≠ 收口」，半开口径 |
| O-14 | 扩容凭据 (α)/(β)/(γ) | **弹性缩放事实停用** + `desired=5`×`no_op` 锁死 → 任一支都要「删壳重扩」收尾 |
| O-15 | `desired_replicas` 约束「域」还是「调用者份额」 | 同一个词两套计数（`domain_api.py:285` queue_monitor 按域 vs scale 按份额） |
| 待人工裁定第 1–8 条 | 含 UI 🔴 是否「已知接受」、需求溯源（第 6/7/8 条） | F5/F6/F7/F19/F20/F15 无出口 |

---

## 3. 人工 UAT（阶段步骤 2 · **本轮未执行，阻塞在人工**）

TEST.md §1.5 的 UAT 脚本 + 4.2/覆盖面声明点名的盲区，逐条登记为「待人工」。全部需要**跑起来的实例**（`uvicorn main:app --port 8000` + `npm run dev`），本阶段不起服务（R17 中间态不落盘纪律 + 无人为我判 UI 结果）。

| UAT | 步骤要点 | 期望 | 实际 | 执行人 / 时间 |
|---|---|---|---|---|
| UAT-1 三层域树展开折叠 | 域→能力组头（鼠标一次 + 键盘 Enter）→ 组内实例列表 | `" code-review "` 与 `code-review` **同组**；无能力落 `未分类`；`aria-expanded` 随状态翻转 | 🟠 分组/归一/组键/渲染半边已升 unit（`vitest run capability` → **14 passed**，我一手复跑）；**浏览器里的折叠交互与键盘可达无证据**（`grep -c aria-expanded` = 0，T-FIX-06 未落地） | 待人工 / — |
| UAT-2 健康概要 `N healthy / M total` | 造 2 `running` + 1 `dead`，读组头，与 `DESIGN.md:97-104` 生命周期口径逐条对 | 概要 = `2 healthy / 3 total`，且**不得**用探针词表 | 🟡 未执行。⚠️ F10 教训：走查时先看用的是哪套词表 | 待人工 / — |
| UAT-3 默认域 / `未分类` 两个兜底桶 | 造 `domain_id=NULL` 的 Agent，看它落哪行哪组 | 与 FR5 一致 | 🟡 **未执行且口径未定**（F19/F20 → 待人工裁定第 6、7 条）→ 裁定前跑出的「通过」不算通过 | 待人工 / — |
| UAT-4 F10 界面表现确认 | 顶部「健康」卡是否为 0 | 若**不为 0** ⇒ 存在 review 未找到的写入路径 → F10 需重开（覆盖面声明 ⑬ 明写此判据） | 🟡 未执行（静态推导称恒 0，**未实测**） | 待人工 / — |
| UAT-5 跨浏览器 / 视口（开放项 O-2） | 4 轮金字塔兼容面 | — | 🟡 未执行（`npm run build` 必红 → 无生产构建可验） | 待人工 / — |
| UAT-6 探针 SSRF 面（A10 v10.2 改判 🟡） | `model_config_json.health_url` 写入 → 探针无 header GET → `body[:500]` 入库 → 零 owner 过滤读回 | 集成前须结清（另开 CHANGE 优先修） | 🟡 未起服务实测；**静态锚点我复核为真**：`agent_probe_service.py:207` 裸 `session.get(health_url)`、`:223` `body[:500]`、`control_plane_api.py:69` `db.query(AgentProbeLatest).all()` 无过滤 | 待人工 / — |

R2.6（UAT 失败自动重试 ≤3 轮）：**未触发**（一条 UAT 都没跑，谈不上失败重试）。

---

## 4. `STATE.md` 集成前清单逐条核验（阶段入口的合法动作 = 登记并保持闸门）

| 清单项 | 我一手读到的代码 | 结清？ |
|---|---|---|
| **A07 fail-open**（无头即 admin） | `main.py:204-210`：`user_id = request.headers.get("X-User-Id")` → 无头时 `user = get_user("admin")`；`auth.py:181-186` `get_current_user` 同形回退；唯一缓解 = `main.py:198-200` localhost 判定（反代后失效，CLAUDE.md 自载） | ❌ 未修 |
| **O-11 旁路口径（含第四类）** | `_filter_owner`（`domain_api.py:20-23`）对 `role=admin` 不加条件；scale 域门 `:203` 仍走它、候选集 `:211` 用严格谓词；`agents_api._assert_domain_access` 为第三站；两处新注释各称「只改这一处」 | ❌ 未裁（**修完 3 站点 ≠ 收口**：第四类无头即 admin 与 `test_api_integration.py:271-274` 那条今天即红的断言须同批带走） |
| **使用面 ①（chat 消耗他人凭据）** | `chat_api.py:18-32` 不校验 agent 归属 → `chat_service.py:48` 裸 `Agent.id` 取行 → `:103` `decrypt(agent.api_key_encrypted)` 调 provider | ❌ 未修（→ 另开 CHANGE 优先修） |
| **使用面 ②（探针链跨 owner 读回）** | 见 §3 UAT-6 三锚 | ❌ 未修 |
| **使用面 ③（genai 进程级全局 Key）** | `llm_providers.py:235` `genai.configure(api_key=…)` 改**进程级全局**、`:256` 才 `GenerativeModel(...)` → 并发下后写者胜，连 agent id 都不需要 | ❌ 未修 |
| **无门枚举源** | `gateway_api.py:39-49`：`db.query(Domain).all()` + 无域 Agent 全量，零 owner/域过滤，返回 `agent_id`/`agent_name`/proxy_url —— v10.4 订正后的唯一无门通道，实读属实 | ❌ 未修 |
| **F26（Key 撤销无 API 路）** | `agents_api.py:112` `if "api_key" in payload and payload["api_key"]:` → PUT 空串 = 静默 no-op（旧 Key 留着、掩码照常显示）；`domain_api.py:248` 注释「与 agents_api 同一个约定」对 update 面不成立 | ❌ 未修（入 O-14 (β) 代价列） |

**判定**：清单 7 项 **0 项结清** → 即使 R2.5 的 6 项 🔴 有人批量签「已知接受」，上表这 7 项仍各自需要「修」或「另开 CHANGE 优先修」的人工决定（凭据链条目 **不得缓办、不得只登记议题** —— STATE 待裁定第 5 条只开两条出路）。**引用 G4 票面请一律引到 `STATE.md:23` 这一行为止**（安全审计师 09:54 改判票的覆盖边界条款原文已钉在 `REVIEW.md` 裁决块）。

---

## 5. LESSONS 提名（R1.8.4 · ARCHIVE 前必跑，本轮已跑，**入库随归档发生**）

扫了 `.specs/capability-groups/T-FIX-04/05/13-SUMMARY.md` 的「决策与偏离」+ 遗留 PROGRESS（本 change 无 PROGRESS）+ `REVIEW.md` 历轮自纠段。按提名条件（>30 分钟 / 跨任务可撞 / 6 个月内可能再撞）筛：

**提名入库（6 条）**

1. **判据打在共享文件的「行区间」上 = 假绿**：内容被改后区间指向别处，打印 0 看着「已满足」而缺陷仍在（实证 `sed -n '74,75p'` → 幽灵字段搬家到 `:76-77`）。正解 = **全文件内容锚 + 计数差**。
2. **`vitest run <pattern>` 按文件名子串过滤**：改名/漏建 → 静默 0 用例 = 假绿；命令型判据必须同时断言「用例数 ≥1」。
3. **verify 打靶不在 `write_files` 的文件**：守边界必不过、过了就是越界（本仓同一形态栽了 3 次：`T-FIX-00` 落点、`agents_api.py:152`、`agent_knowledge_api.py:714`）。`action` 点名的文件同受此约束。
4. **加密不可作等值 oracle**：`encryption_service.py:19` 每次 `os.urandom(12)` 新 nonce → 「判密文不等」的判据可在凭据仍被盗用时变绿；改判**明文**。
5. **`LIKE` 的第 4 种泄漏形态**：内存 SQLite `select 'ABC' like 'abc'` = 1（MySQL 默认 `*_ci` 同形）→ 只写「跨 key / `_` / `%` 三种反例」会放过 `?capability=code-review` 命中 `Code-Review` 这类假阳性。
6. **零断言的「回归脚本」**（`_quick_test.py` 式：全文 0 个 `assert` + 身份写死 + 末尾无条件 `print("All backend tests passed!")`）：这种姿势**结构性看不见越权**，禁止当任何 verify 的证据。

**不入库（附理由，防污染）**：票面漏读的计数规程（属本仓 `REVIEW.md` 内部流程条款，非跨栈技术坑）；`STATE.md` 与任务写权互斥（已由本仓元规则 4c 承载）；交接基线须可核祖先关系（同上，且已被 §1 D4 类记录）。

**复核既有 active 条目**：`.specs/LESSONS.md` 不存在 → 无 `superseded`/`deprecated` 可标；建文件随 ARCHIVE（R4 归档套件 + 本文件 §5 为提名清单）。

---

## 6. 缺口登记（R18.4：暂缓项 = 议题，不顺手补）

1. **项目级常驻工件从未建立**：`.specs/LESSONS.md`、`.specs/CHANGELOG.md`（本轮补齐的是 `.specs/ALIGNMENT.md`）→ 随 ARCHIVE 产生，不提前造空壳。
2. **规则源偏差（登记不擅改）**：我的 Agent Identity 要求「对照 kit-rules **R4.5 归档套件表**」核完整性，而装机的 `kit-rules` R4.5 = *Schema 变更必伴随迁移文件*，归档套件表不在此版本（且仓内 `code-kit/` 已于 2026-09-21 剥离，`S-align.md` prompt 无源）→ 本轮按 `kit-7-integration/SKILL.md` 的输入/输出清单 + 技能模板执行，**不自行编造一张「归档套件表」当判据**。需人确认口径。
3. **仓级健康项（非本 change 范围，只登不修）**：`node_modules` 被 git 跟踪（35,517/35,847）、`npm run build` 必红、迁移为 `database.py` 内联 3 条 `ALTER TABLE`、`_seed_*.py` 孤儿（ALIGNMENT D6-1）→ 属 `M-health` / `ROADMAP` 面，开在这里 = 范围蔓延（R7.1）。

---

## 7. 出口

- **产物**：本文件 + `.specs/ALIGNMENT.md`（第 1 轮）+ `STATE.md` 状态行与「当前阶段」行更新；**零代码改动**（核验只读：`git diff --name-only` = 3 个 `.md`）。
- **门禁**：G4 4/4（6-review 出口，票面对象 = 工件）· **7-integration 入口闸门 = 关闭**（R2.5 六项 🔴 + 已知接受 0 份 + D2/D5 四项未裁 + UAT 零执行 + 人工签字 0 条）。
- **合法下一步**（不越权，按依赖排）：**① 人工**一次批完 §2b 六组欠项（其中 **O-10 一签即可直接派 02→01**；凭据使用面三条须选「另开 CHANGE 优先修」并开票）；**② 修复批**：`T-FIX-14`（在飞）→ `T-FIX-01/02`（卡 ①）→ `T-FIX-03/06/07/08/09`（UI/契约面，其中 07/08/09 是 3 条 🔴，07/08 与 §2b 第 1 条签字互斥）；**③ 测试批**：5-test 按 F22 刷 TEST.md（我在 ALIGNMENT D1-2/D1-3 独立复算并给了正确取值 29 条 / 16F-12P-1S / 28+6+4+3=41）；**④ 结清 §4 七项**后回本阶段跑 UAT，UAT 全绿才谈 R15.2 合并与归档。
- **不做**：不合并（R15.2）、不归档（不可逆、须人确认）、不代 4-dev/5-test 改文件（单写者）。
