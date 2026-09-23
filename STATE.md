# STATE — 跨会话状态

> 本文件记录当前进行中的工作与上次断点。**每次会话结束前更新**。
> 最近更新：2026-09-23

## 状态行（6-review 子循环 · 自动写入，勿手改）

| 字段 | 值 |
|---|---|
| 当前阶段 | **6-review**（change `capability-groups`）· 门禁 **G4 收票 3/4，门未结**（安全 ❌ + 资深测试工程师（Master）❌ + 架构师 ✅带 6 条修订；🔴 领域专家未到 → **不裁决、不推进**） |
| 当前 task | 无（Reviewer 只出报告与 fix 任务，R3.3）· 待执行队列：`T-FIX-00`（回 5-test）→ 🔴 `T-FIX-01/02/04/07/08/09/13` |
| 中断任务 | 无写操作中断。`REVIEW.md`(v3) + `TASK.md`(v3) 已落盘并推送 |
| 产物 | `.specs/capability-groups/REVIEW.md` **v3**（17 项：**8🔴** / 7🟡 / 2🟢，含 §2.4 安全节 + 修订记录）· `.specs/capability-groups/TASK.md` §「修复任务」T-FIX-00~13（**v3 已改成可交接**） |
| v2 起因 | G4 安全审计师指出 F4 **按站点记数、应按 sink 分类** → 暴露 **F16**：`POST /api/domains/{id}/scale` 让域 owner 以**他人 Agent 为模板** mint 归自己的副本并**逐字节复制 `api_key_encrypted`**（`domain_api.py:208→:231→:243` → `chat_service.py:103` 解密取用）。主审 in-process 复现确认。v1 那句「capability 列表虽非密钥」盖过了最重的一跳 = **判级错误，已认** |
| v3 起因 | G4 测试工程师（Master）+ 架构师查出**我的取证错误同源**：两条结论都建立在**被 `head -N` 截断的 grep** 上 → ① F6 根因假（间距/圆角 token **存在且本页面 0 引用**，不是"缺失"；只有字号真缺）→ 差点让人在假前提上签「已知接受」；② F3 副本数 5 处错（实为后端 7 + 前端 2，"规范实现"自己文件内也有 2 处内联）；③ 2.3「反向依赖：无」漏查 `services↔engine`；④ `T-FIX-00` 的 verify 与 write_files 互斥（**仓内无 pytest 配置**）；⑤ 全量测试基线实测 **41 failed/134 passed/6 skipped** → 所有 verify 改定向，防 R5.3/R7.1 双踩 |
| 出口条件 | G4 收齐 4 票且 ≥3/4 → 回 `5-test` 跑 T-FIX-00；🔴 全部修复或取得人工「已知接受」签字（R2.5）后才可重进 6-review。**当前禁止进 7-integration、禁止合并** |
| 待人工裁定 | REVIEW.md「待人工裁定」5 条。**第 1 条已加限定**：只有 F6 的「字号」那一半可进「已知接受」，间距/圆角属机械替换不得换签字；签审查口径须连带确认 `CHANGE.md` 把测试放在 `.specs/` 这个错路径。**第 5 条**：`:208` 凭据链**不得缓办**，只能选「本 change 内修」或「另开 CHANGE 优先修」 |

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
