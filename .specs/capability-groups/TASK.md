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
> 每条含 `verify`（R2.3）。`write_files` 之外的改动须先更新本 TASK 或开新 CHANGE（R7.1）。
> **v3 变更（G4 资深测试工程师 ❌ + 架构师 ✅带 6 条修订，逐条实测后接受）**：本段整体重写成**可交接**的。修的是八类：①`T-FIX-00` 落点与 verify 互斥（无 pytest 配置，`pytest tests/` 收不到 `.specs/`）→ 测试改落 `backend/tests/test_capability_groups.py`；②全量基线实测 **41 failed/134 passed/6 skipped** → 所有 verify 改**定向**，并写明为什么不跑全量（防 R5.3 削弱断言 / R7.1 顺手修绿）；③`capability_service.py` 由 01、02 共同「新建」→ R7.3 冲突，改由 **02 建立、01 消费**并给出顺序；④F6 根因**我写错了**（间距/圆角 token 存在且被 0 使用，非"不存在"）；⑤verify 里所有 `≥1`/`较 X 下降`/`不再…` 非二值判据 → 换成 awk 区间 + 等值判定；⑥用例补正向锚点与边界（含 `?capability=` 空串语义二选一、`" code-review "` 归一化、`domain_id`/`status` 组合），FR3-FR5 依赖 T-FIX-05 抽纯 selector 才有 unit 落点 → 排到 T-FIX-00 之前；⑦安全类修复须**先**让身份层 fail-closed，否则 admin 旁路在默认路径上是空操作（架构师 ④ 时序陷阱）；⑧T-FIX-13 的拒绝状态码按 `CLAUDE.md` 约定改 **404**（v2 写 403 违反项目约定），并撤回 v2 顺手新建的 `domain_scale_service.py`。

### T-FIX-00: 回 5-test — 补 `TEST.md`（5 轮金字塔）+ capability 回归 🔴门禁
> **v3 重写**：v2 版**不可交接**（G4 资深测试工程师 ❌①②③ + 架构师 ④⑤ 共同判定，主审逐条实测后接受）。三处硬伤：`write_files` 与 `verify` 互斥、指向的测试口径抓不住本 bug、用例全是反向断言缺正向锚点。

- **read_files**: `.specs/capability-groups/REQUIREMENT.md`, `DESIGN.md`, `REVIEW.md`（§2.4 + FR1 复现记录）
- **write_files**: `backend/tests/test_capability_groups.py`（**新建，与既有 7 个文件同级 → 才可被 pytest 收集**）, `.specs/capability-groups/TEST.md`
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
- **verify**: ① `cd backend && /home/malizhi/.venv/bin/python -m pytest tests/ --collect-only -q -k capab | tail -1` **能看到新用例**（当前为 `no tests collected (181 deselected)`，用例名须含 `capab`）；② `pytest tests/test_capability_groups.py -q` 定向通过；③ `grep -c assert .specs/capability-groups/_quick_test.py` 不为 0 **或** 文件头含「非回归基线」标注（不许既无断言又无标注）；④ `.specs/capability-groups/TEST.md` 存在且贴有 RED 先行输出
- 状态: [ ]

### T-FIX-01: FR1 单一真相 — 弃 JSON 文本 LIKE，改数组成员判定 🔴
- **read_files**: `backend/routes/agents_api.py`, `backend/services/capability_service.py`, `.specs/capability-groups/DESIGN.md`
- **write_files**: `backend/routes/agents_api.py`, `backend/tests/test_capability_groups.py`
- **action**: `agents_api.py:36-38` 的 `contains(f'"{capability}"')` 换成 `capability in capabilities_of(a)`（**消费 T-FIX-02 的产物，本任务不建 `capability_service.py`** —— v2 让 01/02 都「新建」同一文件，R7.3 交付物定义自相矛盾，v3 由架构师 ③ 纠正）；删除手写双引号拼接；归一化（trim + 空白折叠）落在 `capabilities_of` 里，本任务只调；若因数据量须走 `JSON_CONTAINS`，先把 MySQL/SQLite 双方言结论写进 DESIGN 再实现（G4 架构师 ⑥：MySQL 上 JSON→text 隐式渲染，序列化是否带空格随版本变 → **不只是语义错，还不可移植**）
- **顺序（R7.3）**：`T-FIX-00`（RED 钉住现状）→ `T-FIX-02`（建唯一入口）→ 本任务；**本任务完成即 FR1 行为变更点**，F12（`:110` 越权读）必须与它同批或在其后立刻做，否则 `list_domain_capabilities` 继续读未收口的行
- **verify（二值）**: `cd backend && /home/malizhi/.venv/bin/python -m pytest tests/test_capability_groups.py -q` **定向通过**（不写裸 `pytest tests/ -q`，全量基线红 41 个），且 T-FIX-00 列的 FR1 ≥8 条（含正向锚点 + 空串语义 + 空格归一化 + `domain_id`/`status` 组合）全部在内
- 状态: [ ]

### T-FIX-02: 复用既有抽象 + 业务逻辑下沉 services（R3/R5）🔴
- **read_files**: `backend/routes/domain_api.py`, `backend/services/k8s_routing_service.py`, `backend/routes/gateway_api.py`, `backend/routes/agents_api.py`, `backend/routes/agent_knowledge_api.py`
- **write_files**: `backend/services/capability_service.py`(新建，**本任务是它的唯一建立者**), `backend/services/k8s_routing_service.py`, `backend/routes/domain_api.py`, `backend/routes/gateway_api.py`, `backend/tests/test_capability_groups.py`
- **action**: 新建 `services/capability_service.py` 作为 capability 派生的**唯一入口**，签名必须带归一化契约（G4 架构师 ②：现有 `_extract_capabilities` 只做「是 str 且 strip 非空」，**不 trim 值本身** → 实测 `['code-review',' code-review ']` 去重得 2 组，同一套真相自己裂开）：`capabilities_of(agent) -> list[str]`（`c.strip()`，并折叠连续空白 + `casefold()` 折不折叠由产品拍，先按不折叠、写进 docstring）+ `distinct_capabilities(agents) -> list[str]`。**消灭 7 处后端副本**（v3 订正：v2 写「5 处」是**我的 grep 模式漏了** `'cfg.get("capabilities"'`，漏掉 `(x.model_config_json or {}).get(...)` 两处；`get("capabilities"` 实测 7 处）：`agent_knowledge_api.py:714`、`agents_api.py:133`、`domain_api.py:114`（本次新增的内联副本）、**`k8s_routing_service.py` 自己文件内的 `:26 / :39 / :108`**、`gateway_api.py:85`。⚠️ **别只删 `domain_api.py:114` 就宣布完成** —— 「规范实现」`:39`/`:108` 就是它自己的字面副本，那个 helper 在自己文件里都没被贯彻，它只是最不坏的一处
- **顺序（G4 架构师 ③）**：本任务**排在 T-FIX-00 之后**（RED 回归先钉住当前行为，再改导出）；`T-FIX-01` 只消费本任务产出的函数，**不建**这个文件
- **verify（二值，G4 两条都提了）**: ① `cd backend && grep -rn 'get("capabilities"' --include='*.py' . | grep -v __pycache__ | grep -v capability_service.py | wc -l` **为 0**（旧模式 `cfg.get(` 前缀会漏 2 处，禁止使用）；② `cd backend && /home/malizhi/.venv/bin/python -m pytest tests/test_capability_groups.py -q` **定向通过**（⚠️ **不得写裸 `pytest tests/ -q`**：全量基线本就红的，见 T-FIX-00 的基线条）；③ 归一化断言入用例：`['code-review',' code-review ']` 经 `distinct_capabilities` 后为 **1 组**
- 状态: [ ]

### T-FIX-03: 健康口径统一（R3 附 · F10）🟡
- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`, `.specs/capability-groups/DESIGN.md`
- **write_files**: `frontend/src/lib/agentHealth.ts`(新建), `frontend/src/pages/AgentControlPlane.tsx`
- **action**: 抽 `isAgentHealthy(status)` 与 `probeHealthOf(probe)` 两个具名函数（DESIGN.md:97-104 为唯一口径源）；把 `:156-157` 与 `:1137` 的 `agent.status === 'healthy'`（恒假死分支 —— `healthy` 从不是 Agent.status 的取值）改为 `isAgentHealthy(agent.status)`
- **verify**: `cd frontend && grep -c "status === 'healthy'" src/pages/AgentControlPlane.tsx` 为 0；`./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` 仍为 32（不新增）
- 状态: [ ]

### T-FIX-04: `:110` 补 owner/visibility 过滤（A01 · F4）🔴
- **read_files**: `backend/routes/domain_api.py`, `backend/models/agent.py`, `CLAUDE.md`, `backend/main.py`
- **write_files**: `backend/routes/domain_api.py`, `backend/tests/test_capability_groups.py`
- **前置（G4 架构师 ④ 时序陷阱，v3 补）**: **身份层 fail-closed 必须先于本任务的「admin 全量」分支落地。** `main.py:210` 不带 `X-User-Id` 即 `get_user("admin")`（`auth.py:180-185` 同）→ 默认路径的角色**就是** admin；若先加行过滤，`if user.role=="admin": return 不过滤` 在默认路径上是空操作，而且**一条「无 header 应 401/403」的测试都写不出来**，还会给决策者「越权已修」的错觉。fail-open 属项目级待修（`CLAUDE.md` 已记）→ 若人工坚持它完全出本 change，则本任务的过滤**不得含 admin 旁路**，二选一写死在 TEST.md
- **action**: **只修本 change 新增的那一处 `:110`** —— 域内 Agent 查询加 owner/visibility 收口。**sink 分类见 REVIEW.md §2.4**：`:208` 已独立成 F16/T-FIX-13（不许混进本任务）；其余 4 处（`:34,91,143,172,279`）+ `visibility` 全局落实 + 三处不变量矛盾的方向选择 → 另开 CHANGE，本任务内禁止顺手改（R7.1）
- **v1 verify 的判弱已订正**：原文写「非域 owner 且非 admin 的用户读不到」—— 但漏洞主体恰是**域 owner 越权读域内他人 Agent**，那条断言根本挡不住。按下面重述
- **verify**: 定向 `pytest tests/test_capability_groups.py -q` 通过，用例断言「**即使调用者是域 owner**，也**不能**从 `GET /api/domains/{id}/capabilities` 得到域内**他人** Agent 的 capability」，且以**非 admin 身份**跑。结论文案只能写「**入口层已加行过滤，身份层仍待修**」——**禁止写「越权已修复」**
- 状态: [ ]

### T-FIX-13: 堵 F16 凭据搬运链（`/scale` 以他人 Agent 为模板 mint 副本）🔴 · **v2 新增**
- **read_files**: `backend/routes/domain_api.py`, `backend/services/chat_service.py`, `backend/models/agent.py`, `backend/routes/agents_api.py`
- **write_files**: `backend/routes/domain_api.py`, `backend/tests/test_capability_groups.py`, `backend/routes/agents_api.py`（仅 `:54`/`:84-87` 的 `domain_id` 校验，见 action ②）
  > v3 收缩：v2 顺手写了「新建 `services/domain_scale_service.py`」—— 本任务的正解是**改 3 行**（候选集加 owner 条件 + 不复制凭据 + 模板选择确定化），抽新 service 属额外设计，R7.3 下不该由 Reviewer 预写。若实现者认为确需抽层，先更新本 TASK 再动
- **前置**: 同 T-FIX-04 的 fail-closed 顺序陷阱（本任务的收口同样带 admin 旁路语义）
- **action**: `domain_api.py:208` 的模板候选集按 owner/visibility 收口（**只有调用者可支配的 Agent 能当模板**）；`:243` 的 `api_key_encrypted=template.api_key_encrypted` **默认不再复制凭据** —— 副本要么要求调用者自备 key，要么走显式的「共享凭据」授权路径并落审计（选型属产品决定）。附带两个必修小项：① `:231 template = matching[0]` 的"取第一个"是不确定选择（无排序），须确定化；② `agents_api.py:54`（创建）与 `:84-87`（`setattr` 白名单含 `domain_id`）**接受任意 `domain_id`、不校验存在与归属** —— 这是本链的前置条件，须拒绝把 Agent 放进不属于你的域
- **审计可验性（A09）**: `:255` 的 `log_audit("domain.scale", …)` 现在只记 `"scaled N→M (+K)"`，**F16 发生时日志完全正常** → detail 须带上 `template_id` 与 `template_owner`
- **verify（二值）**: 定向 `cd backend && /home/malizhi/.venv/bin/python -m pytest tests/test_capability_groups.py -q` 通过；用例照 REVIEW.md §2.4 的 in-process 构造写（受害 Agent 在攻击者的域内 + 同 capability），断言新副本的 `api_key_encrypted` **不等于**受害者密文，或该请求被拒。**状态码按项目约定**：`CLAUDE.md` 明写「越权与『资源不存在』统一返回 **404**，避免用状态码探测他人资源」→ v2 我写的「或 403/400」**违反本项目约定**，v3 纠正为 404（用 403 等于给探测者一个"存在但无权限"的信号，正是要避免的那种）。结论同样**不得**写「越权已修复」
- **不得缓办条款**: 本条**不许**降级为 ROADMAP 议题（R2.5）。若人工判定它超出本 change 范围，唯一合法出路是**另开 CHANGE 优先修**，或在 REVIEW.md「待人工裁定」上留下**人对"已知接受"的原话签字**；两者都没有时本 change 停在 6-review
- 状态: [ ]

### T-FIX-05: 拆 `CapabilityGroupRow`（R1 · F11）🟡
- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/stores/domains.ts`
- **write_files**: `frontend/src/components/capability/groupByCapability.ts`(新建 · 纯函数), `frontend/src/components/capability/CapabilityGroupHeader.tsx`(新建), `frontend/src/components/capability/GroupOpsBar.tsx`(新建), `frontend/src/pages/AgentControlPlane.tsx`
- **顺序（v3 · G4 测试 ③）**: **排在本 change 的 `T-FIX-00` 之前或同波**。分组逻辑现在内联在 1428 行的 `AgentControlPlane.tsx:585-605`，不抽成纯函数就没有 unit 落点，FR3/FR4/FR5 下一轮**仍然零证据** —— 所以它不只是"顺手重构"，它是 FR3-FR5 可测性的**前置条件**
- **action**: ① 把 `:585-605` 的分组派生抽成 `groupByCapability(agents) → Record<string, Agent[]>` **纯函数**（无 React 依赖、可 unit）；② 分组展示（名/数量/健康概要/箭头）与操作面（自动路由/扩容/排队/loading）拆开，`CapabilityGroupRow` 的 **14 个 props 降到 ≤6**，操作态从 `stores/domains.ts` 取，不逐层透传
- **verify（二值 · G4 两条都提了）**: ① `cd frontend && test ! -e tsconfig.tsbuildinfo && ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` **等于 32**（`grep -c … ≥ 32` 是**永远为真的废检查** —— 基线本来就是 32）；② 定向 `npx vitest run capability` 通过且用例数 ≥1；③ `wc -l < src/pages/AgentControlPlane.tsx` **< 1428**；④ `test -f src/components/capability/groupByCapability.ts && grep -c "routeLoading\|scaleLoading\|queueCount" src/components/capability/CapabilityGroupHeader.tsx` **为 0**（操作态确已离开分组展示组件）
- 状态: [ ]

### T-FIX-06: 键盘可达 + 对比度实测（UI 3.4 · F9）🟡
- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/styles/tokens.css`
- **write_files**: `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/styles/tokens.css`
- **action**: 能力组头 `<div onClick>`（`:411-413`）改 `<button>`（或 `role="button" tabIndex={0}` + Enter/Space `onKeyDown`），补 `aria-expanded` / `aria-controls`；确认 `prefers-reduced-motion` 有降级；用工具（非肉眼）实测 `#fff` on `var(--blue)` 与 `fontSize: 10` 的 WCAG 2.1 AA 对比度并记入 TEST.md 第 4 轮
- **verify（二值；v2 的 `grep -c … ≥ 1` 与「写入 TEST.md」都不可判定 —— 前者一条空 `<div aria-expanded>` 即满足，后者只看有没有字）**: ① `grep -c "aria-expanded" src/pages/AgentControlPlane.tsx` **≥1 且** 同文件 `grep -c "role=\"button\"\|<div onClick" ` 中 `<div onClick` 为 **0**（折叠头须是真 `<button>`，不是补属性的 div）；② 有键盘可达用例：`npx vitest run a11y` 或 TEST.md 第 1 轮记录「Tab 聚焦 + Enter 展开」的**自动断言或人工步骤编号**；③ 对比度写的是**数值 + 判定**（如 `#8a8f98/#14161a = 5.1:1 → 通过 AA`），只贴色值不判定的视为未做
- 状态: [ ]

### T-FIX-07: 清 `#fff` 硬编码（UI 3.1 · F5）🔴
- **read_files**: `frontend/src/styles/tokens.css`, `frontend/src/pages/AgentControlPlane.tsx`
- **write_files**: `frontend/src/styles/tokens.css`, `frontend/src/pages/AgentControlPlane.tsx`
- **action**: `tokens.css` 增加倾斜中性前景 token（禁纯白，ui-anti-patterns 颜色类），替换 `:457,473`（本 change 面）；`:850,962,1012,1225` 属 pre-existing 同形，一并替换须在 verify 里证明无回归
- **verify**: `cd frontend && grep -c "#fff\b\|#ffffff\b" src/pages/AgentControlPlane.tsx` 为 0
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
- **verify**: 四条在 `STATE.md` 或 `TOPICS.md` 可 grep 到
- 状态: [ ]
