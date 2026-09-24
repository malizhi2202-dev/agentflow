# STATE — 跨会话状态

> 本文件记录当前进行中的工作与上次断点。**每次会话结束前更新**。
> 最近更新：2026-09-23

## 状态行（5-test 子循环 · 自动写入，勿手改）

| 字段 | 值 |
|---|---|
| 当前阶段 | **6-review v10（2026-09-24 09:4x · 回流增补审查）已落盘 → G4 第五轮（v10）已在 MALIZHI-14 召集，待 4 票**：审 `T-FIX-13` 落地码（v9 只记进度未审码）+ 复跑对数全中 + **新增 F21🟡（O-14 的功能代价面）/F23🟡/F24🟡/F22🟢/F25🟢，无新 🔴**；**4.2 二审六轮来第一次回收**（fresh-context 只读）；**判定链重写**（否决 4-dev §6 推断 + 判死 v9 自己「18F→13F」为假红预判 → 02 后 `15F/13P/1S` → 01 后 `0F/28P/1S`）；元规则 **4d** 入账（采纳工件防静默吃勾）。R2.5/R15.2 不变：**不集成、不合并**；人工欠项 += **O-14**（α/β，不答 = 弹性缩放停用）。以下保留 v9 时点原文 ‖ **6-review 已结：G4 第四轮 4/4 全票 ✅，门结**（Master 第三轮复核后撤回 ❌，其反对意见记录作废）· **出口 = 回 5-test**，动作序 `T-FIX-05`（4-dev · 已派开发执行）→ `T-FIX-00`（5-test · 上一轮已派测试验证），change `capability-groups`。⚠️ **通过的是「审查工件可交接」，不是「本 change 可集成」**：R2.5 下 9 项 🔴 一项未修（**该计数是 v8 时点；11:3x 已结 2 项 → 见本行末与「出口条件」行） → **禁止进 7-integration、禁止合并**（v8：门已 4/4 全票，通过的仍是「工件可交接」）；**人工欠的是「R2.5 那 9 条签字」（尤其第 9 条 admin 旁路口径），不欠「G4 平票裁决」—— G4 从未平票，v5/v6 里我把票面记错过两次，已在 REVIEW.md 更正并写进计数规程**；2.0 门禁红（缺 `TEST.md`）→ 唯一出口是回 **5-test 执行 `T-FIX-00`**（本轮已派）。4.2 跨模型二审仍未执行。剩余那 1 票 ❌ = Master 对 v5/v6 落地的复核，不是判断冲突 ‖ **5-test 第 1 轮已复跑第 2 次**（2026-09-23 11:3x @ `50d944d5`，一手实跑，非转述）：28 条 = **18 红 / 10 护栏绿**，全量 **59 failed / 144 passed / 6 skipped / 165 warnings**；`T-FIX-04` 让跨 owner 那条转绿 ✅，本阶段**新增 2 条红**把「后端归一化必须与前端同规则」钉上，并**新确认 F2 的第 4 种表现形态：`LIKE` 悄悄折叠大小写**（`?capability=code-review` 现在会命中 `Code-Review`）。前端基线 `vitest run` = **6 files / 66 tests**、`vitest run capability` = **14 passed**，`tsc --noEmit` 仍 **32**。⚠️ 交付的是「bug 被钉住」不是「测试通过」；既有 41 红不属本 change → 一律定向判定 |
| 当前 task | **v10 队列口径（覆盖下行旧文）**：已结 ✅ `T-FIX-00/04/05/13`（13 的 `[x]` 与转绿数已由主审 tip `c7ca5bcd` 一手复跑对账）。可做（不卡人）：🟡 **`T-FIX-14`**（独立、判据 `1→0/0→≥1`）→ 卡 O-10：**`T-FIX-02 → T-FIX-01`**（判据按 TASK v10 重写后的链：`16F →〔02〕15F/13P/1S →〔01〕0F/28P/1S`；⚠️ 别再按「13F」或「1F 等 A07」验收）。卡 O-11/O-14：凭据豁免与扩容凭据选型两问人工。5-test 下一判定点 = 02/01 落地后复跑定向 + 顺手刷 TEST.md 声明行（F22）。下行保留 v9 时点原文 ‖ 🔴 **`T-FIX-13` 已完成**（2026-09-23 11:55 · `T-FIX-13-SUMMARY.md` · 定向 `18F/10P → 16F/12P/1S`、全量 `57/146/7`、非 capability 红仍 41 项同名）：F16 凭据搬运链四处收口 + A09 审计可查 + `agents_api` 域归属前置。**本轮已把 5-test 的 `0726c73b`（28 条）与主审 v9 工件（`4c861ced`）集成进 `agent/agent/acdcda109f00`**（cherry-pick + 采纳，逐字节核对通过）→ 下一位请读这条分支的 tip，不要再读 `5092f1de`/`0726c73b`/`4c861ced` 三条中的任何单一条。 ‖ 🔴 **`T-FIX-04` 已完成**（2026-09-23 11:05 · `T-FIX-04-SUMMARY.md` · 定向 `16 failed / 10 passed`、全量 `57/144/6`、`domain_api.py` 行数 290 未变＝下游锚点零漂移）· `T-FIX-00` ✅（本阶段闭环，剩余 5 轮判定等修复）· 待执行队列：**4-dev** 🔴 **`T-FIX-02`（建 `capability_service.py` 唯一入口）→ `T-FIX-01`（只消费 02 的产物，不建该文件）** → 🔴 `T-FIX-04` ✅已完成 → 🔴 `T-FIX-13`（须人拍凭据选型，见「待人工裁定」第 9 条）；`T-FIX-05` ✅已完成（2026-09-23 10:35）→ 🔴 `T-FIX-07/08/09` + 🟡 `T-FIX-03/05/06/10/11` · `T-FIX-12` 议题登记 ‖ **5-test**：第 1 轮已复跑第 2 次，**下一个判定点 = `T-FIX-01/02/13` 落地后再复跑定向**（18 红应逐条转绿，转不了 = 该条没真修）；本轮不等任何前置 |
| 中断任务 | 无。**`T-FIX-05` 无 PROGRESS.md（一次跑完，未触发 R1.1 清窗）**；其 SUMMARY 末尾「下游判据影响」表是 `T-FIX-03/06/07/08/09/10` 的**必读交接物**（元规则 4：`AgentControlPlane.tsx` 单写者串行，本条已落地 → 行号与 awk 区间全部漂移，其中 `T-FIX-03` 判据⑤ 的 `sed -n '74,75p'` 现打到 `function OverviewCards` = **假绿**，`T-FIX-06` 的 action 目标已搬进 `CapabilityGroupHeader.tsx` = **该文件须补进它的 `write_files`**） |
| 产物（本轮增量） | **v10**（2026-09-24 · 本分支 `agent/agent/aea499f3c310` = `c7ca5bcd` 谱系 + v10 提交）：`REVIEW.md` v10 节 + 文件头版本行 · `TASK.md`（元规则 4d · T-FIX-01/02 判据链重写 · T-FIX-13 verify 三条 v10 补 · T-FIX-12 ⑨⑩）· 本 STATE 三行。**未动代码、未动 TEST.md**（单写者，F22 交 5-test）。以下保留 v9 记录 ‖ `REVIEW.md` / `TASK.md` **v9**（采纳自 `4c861ced`，15 条 T-FIX + 元规则 1/2/3/4/**4b**/**4c**/4d）· 新增 `T-FIX-04-SUMMARY.md`、`T-FIX-13-SUMMARY.md` · 基线：`backend/tests/test_capability_groups.py` **29 条**（28 + 4-dev 纯加法 1 条正向 A09 用例）· 原 v8 行保留如下 ‖ 产物 | `.specs/capability-groups/REVIEW.md` **v8**（20 项 = **9🔴** / 9🟡 / 2🟢，含 §2.4 安全节 + G4 第一轮/第二轮裁决记录）· `.specs/capability-groups/TASK.md` T-FIX-00~13（**v8**：元规则 3（`vitest run <pattern>` 须断言用例数 ≥1）+ 元规则 4（`AgentControlPlane.tsx` 单写者串行）+ T-FIX-05 的 ①b 归一判据 + v6 的补 verify 落点 + 全条标【验收】/【护栏】+ **未修态基线表 15 行** + T-FIX-13 改判明文 + v6 三条残留修复） |
| T-FIX-00 落盘位置 | `backend/tests/test_capability_groups.py`（**28 条** · 真实 session · 三条 grep 护栏 0 命中）+ `.specs/capability-groups/TEST.md`（**507 行**，第 1 轮 + §1.3.1 复跑增量 + §1.5 UAT→unit + §3.1 后端 CVE 数 + O-1~O-13）+ `_quick_test.py` 标「非回归基线」—— **原提交 `5092f1de` 的父提交是 `a90ea251`（v6 时代），不含 `d1e68c07` v7 / `68f9bb53` v8 / `5cd88bc7`/`a28e816f`**：直接读那条分支会拿到 **v6 的 TASK/REVIEW**（缺元规则 3/4、缺 `T-FIX-02` 作用域收窄、缺卡片行号订正）→ 4-dev 的_cumulative_ 分支已把 `5092f1de` **cherry-pick 到 v8 tip 之上**（`TEST.md` 与测试文件逐字节相同，`git diff 5092f1de 50d944d5 -- 三个文件` 本阶段复核**为空**），后续一律读 `agent/agent/acdcda109f00`。**⚠️ 我上一轮那句「从 `5092f1de` 起分支」是错的**（按字面拿到 v6），教训写进 TEST.md「本轮更正」：**交接基线必须是可核的祖先关系，不是「我刚推的那个 commit」** |
| 5-test 要点 | ① 落点 `backend/tests/`（**不是** `.specs/`：仓内无 pytest 配置，`pytest tests/` 收不到 `.specs/` 下的文件）② 缝 = 真实 SQLAlchemy session（既有两种口径——模块级打桩 `get_db` / 打活服务——对 `contains()` bug **必然假绿**）③ 本阶段三处须人工过目的语义：`?capability=` **空串 = 返回 0 条** · `capabilities` **非 list 视为无能力** ·（复跑新增）**归一化 = 折叠连续空白 + 不折叠大小写**，后者的下半条是 `T-FIX-02` 里**未拍的产品裁定**，改判须**前后端同时改**（TEST.md §1.4 / O-9）④ TASK `T-FIX-00` verify ② 的措辞歧义**已被 4-dev 第二次撞到**（`T-FIX-04` 的「定向套件通过」在单任务粒度不可判定）→ 建议 v9 升格为元规则 2 通用条款：跨任务共享判据一律标【验收·修复后】+ 未修态取值 ⑤ **两条卡队列的人批**：O-10 `T-FIX-02` 的 R4.6 四选一（4-dev 与本阶段都倾向 (ii) deprecated 薄封装）· O-11 admin 旁路与 TEST.md 护栏互斥（三条出路，(B) 须先由 5-test 换身份再删分支，**顺序不能反**）⑥ 测试门（4 专家）仍不召集，召集条件见 TEST.md 出口条件 4 |
| v2 起因 | G4 安全审计师指出 F4 **按站点记数、应按 sink 分类** → 暴露 **F16**：`POST /api/domains/{id}/scale` 让域 owner 以**他人 Agent 为模板** mint 归自己的副本并**逐字节复制 `api_key_encrypted`**（`domain_api.py:208→:231→:243` → `chat_service.py:103` 解密取用）。主审 in-process 复现确认。v1 那句「capability 列表虽非密钥」盖过了最重的一跳 = **判级错误，已认** |
| v8 起因 | **G4 Master 第三轮复核 ✅ → 4/4 全票，门结**。v8 只吸收其 3 条「前看提醒」（其明说不计为条件，主审仍落成规则）：**元规则 3** = `vitest run <pattern>` 按文件名子串过滤 → 改名/漏建 = **静默 0 用例假绿**，须同时断言用例数 ≥1；**元规则 4** = `AgentControlPlane.tsx` 是 `T-FIX-03/05/06/07/08/09` **六条**共同靶文件 → **必须串行/单写者**，否则并行互覆盖且 R6.5 边界判据互判越界（假红）；卡片行号订正 `:79` → **`:81`**（实读 :79 总数/:80 健康/:81 异常/:82 队列任务）。另据 Master「顺带核到」：v5→v7 未改 `T-FIX-00` 判据文本 → 其对 `T-FIX-00` 的复核继续有效。**集成仍未开**：R2.5 九项 🔴 未修 + 人工签字；4.2 跨模型二审仍未执行 |
| v7 起因 | **G4 Master 第二轮复核 ❌（3 条新残留）**，主审核实：① **活在 v6 且最实** —— `T-FIX-02` verify ① 作用域含 `backend/tests/`，而 `T-FIX-00` 强制要写的 FR2 契约断言必然引入 `data.get("capabilities")` → **判据被自己人钉死在 ≥1、永不通过**（假红 → 诱导 R5.3 删断言 / R7.3 越界改测试）→ 已收窄到 `routes/ services/`，并写明「7→1」与「7→0」两口径之差就是 helper 内部那 1 处；② 元规则 1 扩到「**action 要求改的文件也要有落点**」（本轮两次都栽在这一面）；③ `T-FIX-03` 三条行为断言无 runner、`write_files` 无测试文件 → 补 `agent-health-contract.test.tsx` + 点名 `npx vitest run`（主审实跑 `chat-store.test.ts` → `7 passed` 证明工具链可用）+ 可测性前置（给 `OverviewCards`/`AgentRow` 加 `export`，不改语义）**或**显式降级为 UAT 人工步骤；④ 判据④ 标签【护栏】→【验收】；⑤ 其 ②（F18 前端落点）与 ③ 前半（DESIGN 落点）已在 v6 修，其读的是 v5 tip。**两项主审自纠**：(a) **票面两次漏读**（09:49 把已改 ✅ 的安全记成 ❌；09:58 把已是 3✅/1❌ 的票面写成「2✅/2❌ 平票」）→ 自查新增「出票数块前按 author 取最后一票」规程；(b) 一句自指的 `open(p,'w').write(open(p).read())` **把 `TASK.md` 截成 0 字节** → 已从 HEAD 复原并 sha256 逐字节校验一致，写入纪律（内存算完、只写一次、写前长度下界守卫）进自查 |
| v6 起因 | **G4 领域专家改票 ✅（带 3 条文本级残留），主审核实：三条确实活在 v5** —— ① `T-FIX-03` 的 (b)「保持不动」与 (c)「各自具名」**字面冲突**，落到「必须二选一」的门上会逼实现者去删正确代码（又回 v3 坑）→ 改为「**判定语义不得变**」（等值改名 `isProbeHealthy` 可以、换生命周期谓词 `isAgentHealthy` 不行）；② (c) 要改 `DESIGN.md:97-104`（防下一个人再犯 F10 的唯一防线）而 DESIGN 只在 `read_files` → **这句话今天无处可写**，已补 `write_files`；③ **F18 两头各差一半**（01/02 要求前端归一却无前端落点；唯一能改这处逻辑的 05 只字未提归一）→ 写进 05 + 加能区分「只搬家」与「归对了」的 vitest 断言；④ 收下其精确取证：`=== 'healthy'` = **5** 处、`status === 'healthy'` = **4** 处，两个计数都不可作验收判据；⑤ 更正其指出的两处票面账面不一致（安全首轮 ❌→09:45 ✅、其读 tip `3c3a47bc` 所见两条已在 `cdcc2425` 修）；⑥ 写入 G4 第三轮：3/4 通过但集成仍被 R2.5 与 2.0 双重拦住 |
| v5 起因 | **G4 第二轮票（安全 ✅带 3 条 + Master ❌带 3 条 + 半条）查的是「判据本身不成立」**：① `T-FIX-13` verify 判密文不等 → `encryption_service.py:20` 每次 `os.urandom(12)` 新 nonce（实跑 `encrypt(K)!=encrypt(K)` = True）→ **凭据仍被盗用时可变绿**，改判明文；② F16 前置写小 —— 无 `X-User-Id` 即 admin、`_filter_owner` 对 admin 不加条件 → `:202`+`:208` **一起旁路**（实跑 `scaled` + `decrypt(副本)==受害者明文`）→ 改记 **A01×A07**（反代后 = 远程未鉴权凭据窃取）；③ fail-closed 由前置改**结论**（用例今天可写），「不带 admin 旁路」定为**默认**（与 `CLAUDE.md`「Domain 不是安全边界」的张力 → 须人工签）；④ `T-FIX-03` 的 `status === 'healthy'` 归零判据作废（今天 =4，含唯一正确的 `getHealthLabel:34`）；⑤ 三处 verify 打靶 `write_files` 之外的文件 → 补落点；⑥ 一条判据**未修已为真**（`<div onClick` 今天 =0，JSX 拆行）→ 换 `grep -A1 "<div$" \| grep -c onClick`（今天 6）；⑦ 两个「权威计数」统一为 20 项；⑧ `:411-413` → `:412-413` |
| v4 起因 | **G4 领域专家 ❌ 查出本报告最严重的一处**：F10 **取证方向反了** —— 我判恒假的 `AgentControlPlane.tsx:156-1137` 读的是**探针 DTO 的 `status`**（`healthy` 在其取值域内 → 唯一正确处），真正恒假的是我打 ✅ 放过的 `:74-75`（`control_plane_api.py:75-85` 构造的 payload **无 `health`/`runtime` 键**，而 `stores/controlPlane.ts:8,10` 声明了它们 → 类型在撒谎）。后果不止于报告错：**我给的 T-FIX-03 会把正确代码改成恒假，且它的 verify（grep 计数归零）恰好被这次改坏满足 → 假绿**。已在 v4 整条重写为「喂数据看行为」并标注「禁止按 v3 执行」。另补 F18 前端第三套真相 / F19 默认域双指 / F20 `未分类` 占用命名空间，**撤销 F15 范围蔓延定性**（改记需求溯源欠账，实测 `.specs/` 内 0 命中），F10 升 🔴 |
| v3 起因 | G4 测试工程师（Master）+ 架构师查出**我的取证错误同源**：两条结论都建立在**被 `head -N` 截断的 grep** 上 → ① F6 根因假（间距/圆角 token **存在且本页面 0 引用**，不是"缺失"；只有字号真缺）→ 差点让人在假前提上签「已知接受」；② F3 副本数 5 处错（实为后端 7 + 前端 2，"规范实现"自己文件内也有 2 处内联）；③ 2.3「反向依赖：无」漏查 `services↔engine`；④ `T-FIX-00` 的 verify 与 write_files 互斥（**仓内无 pytest 配置**）；⑤ 全量测试基线实测 **41 failed/134 passed/6 skipped** → 所有 verify 改定向，防 R5.3/R7.1 双踩 |
| 出口条件 | **5-test 测试门（4 专家投票）本轮仍不召集** —— 召集条件 = 定向 28 条全绿（现 **18 红**，17→16 因 `T-FIX-04`、+2 因本阶段新增归一化判据）+ 开放项 O-1（性能预算）/O-2（跨浏览器）/O-3（可观测）/**O-10（`T-FIX-02` 的 R4.6 四选一）**/**O-11（admin 旁路三出路，与 A07 fail-open 耦合）**有结论（TEST.md 文末表）。9 项 🔴 现结 2 项（F1 = `T-FIX-00` 本工件 · F4 = `T-FIX-04`）余 7 项。⚠️ **2.0 那道「缺 TEST.md」的门已解**，现在拦集成的是 **R2.5（7 项 🔴 未修）+ 第 1 轮未全绿 + 测试门未召集**三条，口径仍是**不集成、不合并** |
| 待人工裁定 | **再加 1 条（O-14，来自 `T-FIX-13` 落地后的实测代价）**：收口后前端扩容出的副本一律 `not_set`（`domains.ts` 从不发 `api_key`）→ (α) 前端加「自备 key」输入（与 `T-FIX-11` 的 (a)/(b) 同族）/ (β) 人工签「允许继承模板自己的 Key」（收口后模板恒归调用者，改 `domain_api.py:248` 一行 + 4-dev 那条新断言）。**不答 = 弹性缩放功能停用**。 ‖ **新增 2 条**：① `T-FIX-04` 的「默认不带 admin 旁路」与 `T-FIX-00` 护栏 `fr2_contract_shape_and_dedup` 互斥（改代码 vs 改用例，顺序不能反，详见 `T-FIX-04-SUMMARY.md` 决策①）；② `T-FIX-02` 命中 R4.6（`_extract_capabilities` 定义 11 行 + `domain_api.py:9` 跨模块 import + `:175/:211/:285` 三处调用），四选一未答即不动手（引用图已备好）。原口径不变：**8 条 + 1 条偏好决策**（`T-FIX-13` 要不要保留 admin 旁路；安全主张不保留，主审附议但按 R18 ④ 交人签）。**注：动手修 🔴 不需要等签字，只有想跳过某个 🔴 才必须先签** —— 所以 5-test / 4-dev 现在就能动，不等人。原 8 条见 REVIEW.md（v4 新增第 6「默认域双指须 1-requirement 定口径」、第 7「`未分类` 保留字/`__none__` + FR1×FR5 无 AC」、第 8「路由/扩容规则无需求溯源」）。**第 1 条已加限定**：只有 F6 的「字号」那一半可进「已知接受」，间距/圆角属机械替换不得换签字；签审查口径须连带确认 `CHANGE.md` 把测试放在 `.specs/` 这个错路径。**第 5 条**：`:208` 凭据链**不得缓办**，只能选「本 change 内修」或「另开 CHANGE 优先修」 |

> 全仓 6-review 预检结论：本仓库当前**无任何 change 具备进入 6-review 的完整前置**（`capability-groups`/`agent-domains` 缺 TEST.md，`small-model-decisions` 缺 DESIGN/TASK/TEST 且无代码，`knowledge-plus`/`multi-provider` 工件不全，`agent-control-plane` 已审 4/4 通过）。选 `capability-groups` 为目标：工件最全且代码已实现。

## 当前阶段

**产品化调研与文档重写**（code-kit discovery 第 1 轮 + P-product 产物重写）

## 最近完成

| 时间 | 事项 | 产物 |
|---|---|---|
| 2026-09-23 | **4-dev 执行 `T-FIX-05`**（capability-groups · G4 4/4 后派单）：抽出 `components/capability/groupByCapability.ts`（含与后端同名的具名归一规则 `capabilitiesOf`）+ `CapabilityGroupHeader.tsx`，`CapabilityGroupRow` props 14→5，页面 1428→1372，新增 14 条前端用例（F18 归一 7 条先红后绿） |
| 2026-09-21 | 剥离 code-kit 耦合、目录扁平化 | 全仓 `code-kit\|codekit\|code_kit\|code-kit-monitor` grep = 0 命中 |
| 2026-09-21 | 竞品调研（67 个开源仓库一手实测） | `.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md`（997 行） |
| 2026-09-21 | 参考 Multica 检视可借鉴点 | 已并入调研报告与产品文档 §1.6.5 |
| 2026-09-21 | 重写产品文档与界面原型 | `.specs/product-design/PRODUCT-DESIGN.html`（3,072 行 / 310 KB，零外部依赖，HTML 校验 0 错误） |
| 2026-09-22 | discovery 第 3 轮闭合：S6(7)+S7(12) 过审（原话「都通过」）→ ROADMAP 回写 + **PRODUCT-DESIGN.html v3 执行**（定位句/P1-12·13/盯防重写/§6 全局交互纪律/规划原型注记/FAQ）|
| 2026-09-22 | code-kit 统一改造（D-discovery/P-product 收编为主干前置阶段）+ 本项目产物两轮迁移 + discovery 第 2 轮合规复审 | kit 侧 16 文件；`.specs/platform-evolution/` 5 包 30 文件；HTML 状态标 + 口径更正 3 项 |
| 2026-09-21 | discovery 第 1 轮 5 个子议题落盘 | 旧布局 27 文件 → 同日迁 code-kit 统一命名 → 再按体量红线 R16.8 二次归并：`.specs/platform-evolution/` = `TOPICS.md` + 5 × `D-<子议题>/` 文件包（TOPIC/BRAINSTORM/RECON/CONCLUSION/PANEL/REVIEW）+ `ROADMAP.md`，内容无损 |

## 进行中

- 🆕 **change `small-model-decisions` 立项草案**（2026-09-22，Jev/System One 决策小模型分层 + 对话记忆微调工厂 + 自测闭环）：`.specs/small-model-decisions/CHANGE.md`，澄清已答（A+B+C 首批全要·消费级基线·域内隔离+显式开关·内置基准+用户回放），REQUIREMENT.md 已过需求门（4/4）；**P-product v4 已把产品文档+界面原型补齐并过人审门**（用户原话「通过」2026-09-22；§2.7/§5.19/§6.23/§6.24/术语/FAQ，全标「未实现」）；铁律：两步制显式启用，未绑定=零介入。v5 已过审（「好的」）；**E 层环境参谋追加**（用户原话：按机器配置自识别给可执行方案）→ 需求门第 2 轮 4/4 + **v6 呈审中**（§6.25 新页+联动 8 处）；红线升级为**参谋零执行**（用户原话「只给方案不执行」，白名单代执行取消；画像只读不上传）→ 需求门第 3 轮 4/4 → **v7 已过审（「通过」2026-09-22）· P-product 全线闭环**；**2-design 仍未动——等指令**

无。**当前无未完成的写入任务。**

## 待人工裁定（阻塞后续开发）

| # | 取舍 | 来源 |
|---|---|---|
| 1 | **是否允许用户自定义阶段模型**（允许→改代码；不允许→改产品定位表述） | `D-stage-model-coupling/CONCLUSION.md` |
| 2 | 门禁是否改变现有自动流转行为（Agent 不得自行置终态） | `D-collaboration-layer/` |
| 3 | `work_items` 与 `projects` 合并还是独立 | 同上 |
| 4 | 是否接受「未知身份一律拒绝」的可用性变化 | `D-identity-and-security/` |
| 5 | 是否接受状态外置前先补测试导致的工期延长 | `D-single-process-state/` |
| 6 | 该仓库是否曾推送到公共远端（决定 git 历史审查紧迫度） | 同上（`D-identity-and-security/`） |

## 下一步建议（按 discovery 的硬约束顺序）

1. **修复 32 个 TS 错误**，恢复 `npm run build`（当前必然失败）
2. **`git rm --cached node_modules`**（35,517 / 35,847 个跟踪文件是依赖）
3. **消除 fail-open 身份回退**（`backend/auth.py:181-186` 缺身份回退 admin）
4. 写明「当前必须单副本部署」与「`Domain` 不是安全边界」

完整路线图见 `.specs/platform-evolution/ROADMAP.md`（议题状态账本：同目录 `TOPICS.md`）。

## 环境事实

- 后端：`backend/`，FastAPI + SQLAlchemy 2.0 + SQLite（默认）/ MySQL（可选）
- 前端：`frontend/`，React 18 + TS 5.5 + Vite 5.4 + Zustand
- 虚拟环境：`/home/malizhi/.venv`（Python 3.14.4）
- 启动：后端 `uvicorn main:app --port 8000`；前端 `npm run dev`（5173，代理 `/api` → 8000）
- 默认管理员：`admin` / `123456`（**硬编码，属待修项**）
- 已知缺陷：`npm run build` 失败（32 个 TS 错误）；`node_modules` 被 git 跟踪

## 已知约束

- `.specs/` 是**产品一等数据**（知识产物），**不得删除**
- 读写 `.specs/` 路径一律经 `config.get_specs_dir()`，不要硬编码目录
- 9 阶段模型当前硬编码在 13 个文件中（待配置化）
