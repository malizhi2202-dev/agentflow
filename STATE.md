# STATE — 跨会话状态

> 本文件记录当前进行中的工作与上次断点。**每次会话结束前更新**。
> 最近更新：2026-09-23

## 状态行（5-test 子循环 · 自动写入，勿手改）

| 字段 | 值 |
|---|---|
| 当前阶段 | **5-test 第 1 轮 · `T-FIX-00` 已交付（RED 基线）**，change `capability-groups`（2026-09-23 10:2x）。2.0 门禁红已解：`TEST.md` 存在且声明 5 轮状态。⚠️ **交付的是「bug 被钉住」不是「测试通过」**：新 26 条里 **17 红 / 9 护栏绿**，全量 **58 failed / 143 passed / 6 skipped**（既有 41 红不属本 change，按定向判定）。⚠️ 前置不变：R2.5 下 9 项 🔴 一项未修 → **禁止进 7-integration、禁止合并**；G4 第三轮 3/4 只放行「审查工件可交接」；4.2 跨模型二审仍未执行 |
| 当前 task | `T-FIX-00` ✅（本阶段闭环，剩余 5 轮判定等修复）· 待执行队列：**4-dev** 🔴 `T-FIX-01/02/04/13`（有 RED 判据可复跑）→ 🔴 `T-FIX-07/08/09` + 🟡 `T-FIX-03/05/06/10/11` · `T-FIX-12` 议题登记 |
| 中断任务 | 无写操作中断。`TEST.md`(第 1 轮) + `backend/tests/test_capability_groups.py`(26 条) + `_quick_test.py`(标「非回归基线」) 已落盘 |
| 产物 | `.specs/capability-groups/TEST.md` **第 1 轮**（RED 基线 · 5 轮状态声明 · 17 红逐条对应 T-FIX · 修后可实现性核查 · 7 个开放项）· `backend/tests/test_capability_groups.py`（真实 session，禁 mock DB / 禁依赖活服务，三条 grep 护栏均 0 命中）· `.specs/capability-groups/REVIEW.md` **v6**（20 项 = 9🔴/9🟡/2🟢）· `.specs/capability-groups/TASK.md` T-FIX-00~13 **v6** |
| 5-test 要点 | ① 落点 `backend/tests/`（**不是** `.specs/`：仓内无 pytest 配置，`pytest tests/` 收不到 `.specs/` 下的文件）② 缝 = 真实 SQLAlchemy session（既有两种口径——模块级打桩 `get_db` / 打活服务——对 `contains()` bug **必然假绿**）③ 本阶段两处裁定须人工过目：`?capability=` **空串 = 返回 0 条**、`capabilities` **非 list 视为无能力**（TEST.md §1.4）④ TASK `T-FIX-00` verify ② 的措辞歧义已记在 TEST.md 出口条件 2（未修态它必然为假，建议下标为【验收·修复后】） |
| v2 起因 | G4 安全审计师指出 F4 **按站点记数、应按 sink 分类** → 暴露 **F16**：`POST /api/domains/{id}/scale` 让域 owner 以**他人 Agent 为模板** mint 归自己的副本并**逐字节复制 `api_key_encrypted`**（`domain_api.py:208→:231→:243` → `chat_service.py:103` 解密取用）。主审 in-process 复现确认。v1 那句「capability 列表虽非密钥」盖过了最重的一跳 = **判级错误，已认** |
| v6 起因 | **G4 领域专家改票 ✅（带 3 条文本级残留），主审核实：三条确实活在 v5** —— ① `T-FIX-03` 的 (b)「保持不动」与 (c)「各自具名」**字面冲突**，落到「必须二选一」的门上会逼实现者去删正确代码（又回 v3 坑）→ 改为「**判定语义不得变**」（等值改名 `isProbeHealthy` 可以、换生命周期谓词 `isAgentHealthy` 不行）；② (c) 要改 `DESIGN.md:97-104`（防下一个人再犯 F10 的唯一防线）而 DESIGN 只在 `read_files` → **这句话今天无处可写**，已补 `write_files`；③ **F18 两头各差一半**（01/02 要求前端归一却无前端落点；唯一能改这处逻辑的 05 只字未提归一）→ 写进 05 + 加能区分「只搬家」与「归对了」的 vitest 断言；④ 收下其精确取证：`=== 'healthy'` = **5** 处、`status === 'healthy'` = **4** 处，两个计数都不可作验收判据；⑤ 更正其指出的两处票面账面不一致（安全首轮 ❌→09:45 ✅、其读 tip `3c3a47bc` 所见两条已在 `cdcc2425` 修）；⑥ 写入 G4 第三轮：3/4 通过但集成仍被 R2.5 与 2.0 双重拦住 |
| v5 起因 | **G4 第二轮票（安全 ✅带 3 条 + Master ❌带 3 条 + 半条）查的是「判据本身不成立」**：① `T-FIX-13` verify 判密文不等 → `encryption_service.py:20` 每次 `os.urandom(12)` 新 nonce（实跑 `encrypt(K)!=encrypt(K)` = True）→ **凭据仍被盗用时可变绿**，改判明文；② F16 前置写小 —— 无 `X-User-Id` 即 admin、`_filter_owner` 对 admin 不加条件 → `:202`+`:208` **一起旁路**（实跑 `scaled` + `decrypt(副本)==受害者明文`）→ 改记 **A01×A07**（反代后 = 远程未鉴权凭据窃取）；③ fail-closed 由前置改**结论**（用例今天可写），「不带 admin 旁路」定为**默认**（与 `CLAUDE.md`「Domain 不是安全边界」的张力 → 须人工签）；④ `T-FIX-03` 的 `status === 'healthy'` 归零判据作废（今天 =4，含唯一正确的 `getHealthLabel:34`）；⑤ 三处 verify 打靶 `write_files` 之外的文件 → 补落点；⑥ 一条判据**未修已为真**（`<div onClick` 今天 =0，JSX 拆行）→ 换 `grep -A1 "<div$" \| grep -c onClick`（今天 6）；⑦ 两个「权威计数」统一为 20 项；⑧ `:411-413` → `:412-413` |
| v4 起因 | **G4 领域专家 ❌ 查出本报告最严重的一处**：F10 **取证方向反了** —— 我判恒假的 `AgentControlPlane.tsx:156-1137` 读的是**探针 DTO 的 `status`**（`healthy` 在其取值域内 → 唯一正确处），真正恒假的是我打 ✅ 放过的 `:74-75`（`control_plane_api.py:75-85` 构造的 payload **无 `health`/`runtime` 键**，而 `stores/controlPlane.ts:8,10` 声明了它们 → 类型在撒谎）。后果不止于报告错：**我给的 T-FIX-03 会把正确代码改成恒假，且它的 verify（grep 计数归零）恰好被这次改坏满足 → 假绿**。已在 v4 整条重写为「喂数据看行为」并标注「禁止按 v3 执行」。另补 F18 前端第三套真相 / F19 默认域双指 / F20 `未分类` 占用命名空间，**撤销 F15 范围蔓延定性**（改记需求溯源欠账，实测 `.specs/` 内 0 命中），F10 升 🔴 |
| v3 起因 | G4 测试工程师（Master）+ 架构师查出**我的取证错误同源**：两条结论都建立在**被 `head -N` 截断的 grep** 上 → ① F6 根因假（间距/圆角 token **存在且本页面 0 引用**，不是"缺失"；只有字号真缺）→ 差点让人在假前提上签「已知接受」；② F3 副本数 5 处错（实为后端 7 + 前端 2，"规范实现"自己文件内也有 2 处内联）；③ 2.3「反向依赖：无」漏查 `services↔engine`；④ `T-FIX-00` 的 verify 与 write_files 互斥（**仓内无 pytest 配置**）；⑤ 全量测试基线实测 **41 failed/134 passed/6 skipped** → 所有 verify 改定向，防 R5.3/R7.1 双踩 |
| 出口条件 | **5-test 测试门（4 专家投票）本轮不召集** —— 召集条件 = `T-FIX-01..13` 落地后第 1 轮 17 条 RED 全绿 + 开放项 O-1（性能预算）/O-2（跨浏览器）/O-3（可观测）有结论（TEST.md 文末表）。🔴 全部修复或取得人工「已知接受」签字（R2.5）后才可重进 6-review。**当前禁止进 7-integration、禁止合并** |
| 待人工裁定 | **8 条 + 1 条偏好决策**（`T-FIX-13` 要不要保留 admin 旁路；安全主张不保留，主审附议但按 R18 ④ 交人签）。**注：动手修 🔴 不需要等签字，只有想跳过某个 🔴 才必须先签** —— 所以 5-test / 4-dev 现在就能动，不等人。原 8 条见 REVIEW.md（v4 新增第 6「默认域双指须 1-requirement 定口径」、第 7「`未分类` 保留字/`__none__` + FR1×FR5 无 AC」、第 8「路由/扩容规则无需求溯源」）。**第 1 条已加限定**：只有 F6 的「字号」那一半可进「已知接受」，间距/圆角属机械替换不得换签字；签审查口径须连带确认 `CHANGE.md` 把测试放在 `.specs/` 这个错路径。**第 5 条**：`:208` 凭据链**不得缓办**，只能选「本 change 内修」或「另开 CHANGE 优先修」 |

> 全仓 6-review 预检结论：本仓库当前**无任何 change 具备进入 6-review 的完整前置**（`capability-groups`/`agent-domains` 缺 TEST.md，`small-model-decisions` 缺 DESIGN/TASK/TEST 且无代码，`knowledge-plus`/`multi-provider` 工件不全，`agent-control-plane` 已审 4/4 通过）。选 `capability-groups` 为目标：工件最全且代码已实现。

## 当前阶段

**产品化调研与文档重写**（code-kit discovery 第 1 轮 + P-product 产物重写）

## 最近完成

| 时间 | 事项 | 产物 |
|---|---|---|
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
