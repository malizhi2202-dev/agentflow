# REVIEW: capability-groups — 能力分组（Capability Groups）

- **Change ID**: capability-groups
- **审查时间**: 2026-09-23 09:08 CST
- **审查者**: AI（Reviewer 角色）· 4.2 二审已派出但本 turn 未回收 → 该节标「待确认」（详见 4.2）
- **总体结论**: **阻塞（不通过）** —— 2.0 金字塔门禁 🔴（`TEST.md` 与 CHANGE.md 自declared 的 `test_backend.py` 均不存在）+ **8 项** 🔴 Critical（v1 为 7 项；本文件行头曾误记「5 项」，一并订正）。按 kit-6-review 步骤 2.0：**先回 5-test 补完**，Critical 未修或未获「已知接受」签字前禁止进 7-integration（R2.5）。
- **版本**: **v6**（2026-09-23 11:1x 修订，见「修订记录」）· **四版四票，每一版都被查出一处取证或判级错误**；v4 最重（F10 方向反了、照它修会造新 bug），v5 修的是**判据本身**（三条 verify 可在缺陷仍存活时为真 / 未修已为真）；v6 收领域专家改票 ✅ 带的 3 条文本级残留（其中 1 条会逼实现者在两道门之间二选一）

### 修订记录

| 版本 | 时间 | 触发 | 变更 |
|---|---|---|---|
| v1 | 09:08 | 6-review 主审 | 首版：15 项发现（7🔴/5🟡/3🟢），commit `97044bd0` |
| **v2** | 09:40 | **G4 安全审计师 ❌** | **F4 判错，已在四处改正**：① F4 原按「站点」记数（把 7 处同形查询当成一个可缓办的家族），改为**按 sink 分类**；② 新增 **F16 🔴 凭据搬运链**（`domain_api.py:208 → :231/:243 → chat_service.py:103`）—— v1 那句「capability 列表虽非密钥」恰好把最严重的一跳盖了过去；③ 补 **§2.4 安全审查节**（OWASP 逐项 + 身份层前提 + 依赖/秘钥扫描结果）与 3 条新盲区；④ 待人工裁定第 5 条按 sink 重述；⑤ `T-FIX-04` 拆出 `T-FIX-13`，两条 verify 改写为**不宣称「越权已修复」**，`T-FIX-00` 加「非 admin 身份 + 跨 owner 负例」硬要求 |
| **v3** | 09:5x | **G4 资深测试工程师（Master）❌ + 架构师 ✅带 6 条修订** | 两处**是我的取证/根因错误**，不是判断分歧：① **F6 根因写错** —— 我上一轮那条 `grep … \| head -60` 被截断，据此断言「`tokens.css` 无间距/圆角 scale」；全量重列实测 `:47` 有 `--s1..--s10`、`:50` 有 `--r-sm/--r-md/--r-lg`，且 `AgentControlPlane.tsx` 用它们 **0 次** → 正解是「**有 token 不用**」（机械替换），**不该拿它去换人工「已知接受」签字**；同因把 `--text` 这个已存在的中性前景也判成缺失。② **F3 计数 5 处错**（我的 verify grep 模式 `cfg.get("capabilities"` 漏了 `(x.model_config_json or {}).get(...)` 两处、以及「规范实现」自己文件内两处内联）→ 实为**后端 7 处 + 前端 2 处**。③ `T-FIX-00/01/02/04` 的 verify 与 write_files **互斥**（仓内**无任何 pytest 配置**，`pytest tests/` 收不到 `.specs/`）+ **全量基线实测 41 failed/134 passed/6 skipped** → 全部改定向。④ 2.3「反向依赖：无」**说过头**：我只 grep 了 `from routes`/`from main`，漏了 `services↔engine`。⑤ F13 在 2.2 记 🟡、汇总表记 🟢（自相矛盾，按取严）。⑥ 新增 **F17 🟡 归一化缺失**。⑦ T-FIX-01/02 争建同一文件（R7.3）→ 02 建、01 消费。⑧ 非二值 verify 全部改写。详见 TASK.md 修复任务段 v3 |
| **v4** | 10:1x | **G4 领域专家 ❌（第 4 票 → 4/4 收齐）** | **F10 取证方向反了 + `T-FIX-03` 是破坏性修复且其 verify 会假绿**（详见 F10 段更正声明）：真正恒假的是我打 ✅ 放过的 `:74-75`，被我判恒假的 `:156-1137` 反而是全文件唯一正确处。另按其实测补 **F18 前端第三套真相 / F19 默认域双指 / F20 `未分类` 占用命名空间**；**撤销 F15 的「范围蔓延」定性**，改记「路由/扩容缺需求溯源」（需求欠账，非实现越界）；F10 升 🔴；`'dead'` 告警永不触发、`AgentProbePanel.tsx` 5 处幽灵字段、`CONTEXT.md` 6 个术语零定义 → 进议题。四票齐，见末尾 G4 裁决 |
| **v5** | 10:4x | **G4 第二轮票：安全审计师 ✅（带 3 条新缺陷）+ 资深测试工程师（Master）复核 ❌（3 条 + 半条）** | 主审逐条实测后全部接受：① **`T-FIX-13` 的 verify 是坏判据** —— `encryption_service.py:20` 每次 `os.urandom(12)` 新 nonce，实跑 `encrypt(K) != encrypt(K)` 为 True → 「副本密文不等于受害者密文」可在**凭据仍被盗用**时变绿，改为**判明文**；② **F16 前置写小了** —— 不带 `X-User-Id` 即 admin、`_filter_owner` 对 admin 不加条件 → `:202` 与 `:208` **一起被旁路**，实跑 `scaled` 且 `decrypt(副本)==受害者明文` → 改记 **A01×A07**（反代后 = 远程未鉴权凭据窃取）；③ 身份层 fail-closed 由**前置改为结论**（用例今天就可写，这条 🔴 不该被顺序推走），「不带 admin 旁路」定为**默认**而非备选；④ **`T-FIX-03` 的计数归零形式作废**（今天 =4，含正确的 `:34`）；⑤ 三处 verify 打靶了 `write_files` 之外的文件（`_quick_test.py` + 两个前端测试文件）→ 补落点；⑥ 一条判据**未修就已为真**（`grep -c "<div onClick"` 今天 = 0，因 JSX 拆行）→ 换 `grep -A1 "<div$" \| grep -c onClick`（今天 6）；⑦ 全部 verify 标 **【验收】/【护栏】** 并附未修态实测值（TASK.md 新增基线表 14 行）；⑧ `:99` 与末尾汇总的两个权威计数**统一为 20 项**；⑨ 精化 `:411-413` → `:412-413`。**现行票数进入 2✅/2❌ 平票 → 按 R13.2 提交人工，见末尾「G4 第二轮」** |
| **v6** | 11:1x | **G4 领域专家改票 ❌ → ✅**（其 4 条通过条件在 v4 全部落地，逐条自跑复核；另附 3 条文本级残留 + 1 条计数残留） | 三条残留**确实活在 v5**，已修：① `T-FIX-03` 的 (b)「保持不动」与 (c)「各自具名」**字面冲突** → 改为「判定语义不得变：等值改名 `isProbeHealthy` 可以、换生命周期谓词 `isAgentHealthy` 不行」，并收下其精确取证（`=== 'healthy'` = **5** 处、`status === 'healthy'` = **4** 处，两个计数都不能当验收判据）；② (c) 要求改 DESIGN.md:97-104 但 DESIGN.md 只在 `read_files` → **那句话无处可写**，已补进 `write_files`；③ **F18 前端收敛两头各差一半**（`T-FIX-01/02` 要求前端归一却无前端落点；唯一能改这处逻辑的 `T-FIX-05` 只字未提归一）→ 写进 05 的 action 并加**能区分「搬家」与「归一」**的 vitest 断言（基线表 15 行）。**④ 计数残留与「`T-FIX-13` verify 仍判密文」两条是其读 tip `3c3a47bc`（v4）所见，已在 v5 `cdcc2425` 落地** —— 票面账面亦据其指正更正：安全审计师首轮 ❌ → 09:45 改票 ✅（三条已落地），见「G4 第三轮」 |

> **R9.2 二次确认记录**：F16 由安全审计师首指（给出逐行链），主审**未直接采信，而是独立复现后确认** —— §2.4 的 in-process 复现含「新副本 `api_key_encrypted` 与受害者密文逐字节相等」断言。F16 = 双角色确认的 🔴。
> **G4 提示**：v1 的投票基线已过时，**4 位投票人以 v2 为准**；若某票明确针对 v1，收票时按「对本文件投票」解释并在票面注明版本差异。

### 审查基线（工件与 diff 的实际情况，R6.2 明示）

| 项 | 状态 |
|---|---|
| `REQUIREMENT.md` | ✅ 在（54 行，FR1-FR5 / NFR1-NFR3） |
| `DESIGN.md` | ✅ 在（105 行，含「健康状态定义」节）—— 按 R2.7 已一并读 |
| `TASK.md` | ✅ 在（53 行 / **7 个 task 全为 `状态: [ ]` 未勾**） |
| `TEST.md` | ❌ **不存在**（CHANGE.md 变更范围第 5 行明确列为交付物） |
| `.specs/capability-groups/test_backend.py` | ❌ **不存在**（同上，CHANGE.md 列为交付物）；目录内只有 `_quick_test.py`（打印式脚本，无断言、需活服务端） |
| `UI-DESIGN.md` | ❌ 不存在（本 change 改了 `.tsx`，属前端项目 → 第三轮触发但无 UI 基线可比） |
| 「本次 diff」 | ⚠️ **无独立 diff 可取**。仓库以 `16117315 first commit` 整体导入，`d5a70feb` 仅为目录扁平化重命名（backend 全量 0→N 行）。故本轮以 **CHANGE.md「变更范围」表列出的 4 个文件面**为审查面，逐面核对代码事实。**此替代口径需人工确认（R18.1 ④）** |

> R2.7 全仓预检（同批扫描，供 STATE 使用）：本仓库当前**没有任何 change 具备进入 6-review 的完整前置**：
> `capability-groups`（缺 TEST.md）、`agent-domains`（缺 TEST.md、缺 REVIEW.md，代码已上线）、`small-model-decisions`（缺 DESIGN/TASK/TEST，无代码）、`knowledge-plus`（仅 TEST.md）、`multi-provider`（仅测试脚本）、`agent-control-plane`（已审并 4/4 通过，`.specs/agent-control-plane/REVIEW.md`）。选 `capability-groups` 作为本 issue 的审查目标：它是**工件最全且代码已实现**的一个。

---

## 第一轮 · Spec 合规审查

| 检查项 | 结果 | 证据 |
|---|---|---|
| FR1 Agent 按 capability 过滤 | ❌ **未忠实实现** | `backend/routes/agents_api.py:25,36-38` 用 `Agent.model_config_json.contains(f'"{capability}"')` → 编译为对整个 JSON 文本的 `LIKE '%…%'`。实测（SQLite 内存库，见「复现」）语义错误 |
| FR1 可与 `domain_id` 组合 | ✅ | 同函数 `:29-35`，`domain_id=0` → `IS NULL`（默认域）分支正确 |
| FR2 域内能力列表端点 | 🟡 实现，但**零消费者** | `backend/routes/domain_api.py:100-119` 存在且形状符合契约（额外多 `domain_name`，additive）；`frontend/src/stores/domains.ts` 全文无该端点的 fetch —— 前端在 `AgentControlPlane.tsx:585-605` 本地派生分组。用户故事 4「以便外部集成」因此**不可验证** |
| FR3 三层域树 | ✅ | `AgentControlPlane.tsx:585-605`（派生）+ `:660-698`（渲染 `CapabilityGroupRow`）+ `:708`（`expandedGroups: Set<string>`，key 格式符合 DESIGN §「展开状态」） |
| FR4 能力组展示（名称/数量/健康概要/箭头） | ✅ 实现符合 DESIGN | `:397`（`isAgentHealthy`）+ `:427-438`（📦 名、`{healthyCount} healthy / {totalCount} total`、`ChevronRight` 旋转箭头）。口径与 DESIGN.md:97-104「running/standby → healthy」**逐条一致** |
| FR5 未分类 / 默认域 | ✅ | `:594-596`（无 capabilities → `未分类`）、`:860-870`（默认域行，`isDefault`） |
| NFR1 零新增 TS 错误 | 🟡 不可完整验证 | 实跑 `tsc --noEmit -p tsconfig.json` → **32 个错误**，全部落在 `ProjectDetail.tsx`(15)、`__tests__/*`(12)、`ToolMarket.tsx`(2)、`WorkflowCreate.tsx`(1)、`ProjectManager.tsx`(1)、`AgentBuilder.tsx`(1)；`AgentControlPlane.tsx` 与 `stores/` **0 错误**。但项目构建契约本身是红的（pre-existing，见 STATE.md），无基线可 diff，「零**新增**」无法证明 |
| NFR2 向后兼容（现有端点/UI 不受影响） | ❌ **无证据** | 无 `TEST.md`、无 `test_backend.py`、`backend/tests/` 7 个文件**无一** grep 到 `capability`（实测）。回归完全未覆盖 |
| NFR3 虚拟分组 · 不建新表 | ✅ | `backend/models/` 无新增；`domain_api.py:110` 只读 `Agent` |
| 未引入 out-of-scope 内容 | ⚠️ 判不了 | `REQUIREMENT.md` **无 out-of-scope 段**（需求侧缺口，非实现问题）→ 记为 R18.4 议题 |
| 未范围蔓延 | ✅（v4 改判） | `CapabilityGroupRow` 承担自动路由/扩容/排队 badge（`:445-490`），FR4 只要求「组名、数量、健康概要、箭头」——但 v4 依领域专家证据**撤销越界定性**：路由/扩容规则本就是 capability 粒度且能力组行是唯一宿主，剥到域级反而失去可寻址处。真缺口是该业务规则**无需求溯源**（见 F15），属 R7「谁规定过」而非「按钮长在哪个组件里」，两件事已分开写 |
| 未越过 DESIGN 边界 | ❌ | DESIGN.md:54-66 明写后端实现应为「**`JSON_CONTAINS` 或 Python 端过滤**」，两种都**没用**，改用第三种（JSON 文本 LIKE）→ 设计偏离，且是唯一导致 FR1 错误的决定 |

**FR1 复现记录**（只读实验，未写盘；`cd backend && /home/malizhi/.venv/bin/python -c`，SQLAlchemy 2.0.54 + 内存 SQLite，3 条 Agent）：

```
编译出的谓词 : agents.model_config_json LIKE '%' || '"code-review"' || '%'
MySQL 方言   : agents.model_config_json LIKE concat('%%', '"code-review"', '%%')   ← JSON 列直接 LIKE，本项目 MySQL 为可选部署（CLAUDE.md），未实测 → 待确认

capability=code-review -> ['A','B']   期望 ['A']    ← B 的 capabilities 为空，"code-review" 出现在无关 key(note) 的值上 = 假阳性
capability=code_review -> ['A','B']   期望 []       ← 用户输入的 `_` 未被转义，成 SQL 单字符通配符
capability=%           -> ['A','B','C'] 期望 []     ← 通配符透传，过滤器可被完全绕过（返回含无能力 Agent）
```

> 说明：`contains()` 走的是**绑定参数**，`LIKE` 模式未转义只造成**语义绕过**而非 SQL 注入（`autoescape` 默认 False）。此点已核实，勿升级成注入告警。

**Spec 合规结论**：**不通过**。FR1 语义错误 + NFR2 零证据 + 偏离 DESIGN 指定实现方式。

---

## 第二轮 · 代码质量审查（6 维衰退风险）

### 2.0 TEST.md 5 轮金字塔完整性 —— 🔴 Critical（门禁）

| 轮次 | 状态 | 缺漏 |
|---|---|---|
| 1 功能 | ❌ | `TEST.md` 不存在；FR1-FR5 无一条有自动化测试；`backend/tests/` 0 命中 `capability`；`_quick_test.py` 为 print 脚本（无断言、依赖活服务、非常规测试入口，不进 pytest 收集） |
| 2 性能 | ❌ | 文件缺失，状态未声明（跳过的轮次也必须给理由，R5.4） |
| 3 安全 | ❌ | 同上 |
| 4 兼容 | ❌ | 同上（MySQL 可选部署的 JSON/LIKE 兼容性正是本轮该管的事，见 R2 发现） |
| 5 可观测 | ❌ | 同上 |

按 kit-6-review 步骤 2.0：**任意一项不达 → 🔴 Critical，先回 5-test 补完再继续后续审查**。本轮后续 2.1 的发现**照常报告**（已实测取证，压着不报等于丢信息），但**门禁结论不因它们而放松**：本 change 现在是「红」。

### 2.1 6 维诊断 · 严重度统计

| 编号 | 衰退风险 | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| R1 | Cognitive Overload 认知过载 | 0 | 1 | 0 |
| R2 | Change Propagation 变更传播 | 2 | 1 | 0 |
| R3 | Knowledge Duplication 知识重复 | 1 | 1 | 0 |
| R4 | Accidental Complexity 偶然复杂 | 0 | 1 | 0 |
| —（F17 · v3 归一化，跨 R3/R4） | | 0 | 1 | 0 |
| R5 | Dependency Disorder 依赖混乱 | 0 | 1 | 0 |
| R6 | Domain Model Distortion 领域扭曲 | 1 | 0 | 0 |
| —（UI · 第三轮另计） | | 3 | 1 | 1 |

> 本表按**诊断维度**计数（一次诊断可产出多条发现，且 Spec 合规轮的发现在此不重复计），**与「严重发现汇总」的 F 编号表不是同一分区**。> **权威计数只有一个：20 项 = 9 🔴 / 9 🟡 / 2 🟢**（v6 复确认：按能吃下 `| **F16** |` 加粗起头的解析逐行数过，与 F 表对得上；v5 统一：v2/v3 时期本节曾写「16 项 = 8🔴/5🟡/3🟢」而末尾汇总表写 17 项，两处都自称权威 → R2.5 的签字清单是按 🔴 数生成的，留两个数字会让人签错范围，Master 半条指出）。本节按**诊断维度**组织、与 F 编号表分区不同但项数可对齐，**计数一律以 F 表逐行数出为准**。⚠️ 数 F 表时注意 `| **F16** |` 那行以加粗起头，用 `^\| F` 会漏掉它（Master 自陈第一遍就漏过，与我上轮那个截断同源）。

### 2.2 6 维诊断 · 详细发现（4 要素）

### 🔴 R3 · Knowledge Duplication：新端点重写了同文件已 import 的既有 helper

**Symptom**：`backend/routes/domain_api.py:110-118` 手写「取 `model_config_json.capabilities` → 判 list → 过滤非 str/空白 → 去重」。`domain_api.py:9` **本来就 import 了** `_extract_capabilities` 并在 `:175`/`:211` 正常使用。同一决定在**后端 7 处**各表达一次（v3 订正：v2 记「5 处」是**我的 grep 模式漏了** —— `'cfg.get("capabilities"'` 匹配不到 `(x.model_config_json or {}).get(...)` 写法；换 `get("capabilities"` 实测为 `agents_api.py:133`、`agent_knowledge_api.py:714`、`domain_api.py:114`、`k8s_routing_service.py:26 / :39 / :108`、`gateway_api.py:85`）+ 前端 2 处（`AgentControlPlane.tsx:590`、`AgentBuilder.tsx:48`）。⚠️ 关键修正：被我称作「**规范实现**」的 `k8s_routing_service.py` **在自己文件内就有两处内联副本（`:39`、`:108`）而不调用自家的 `_extract_capabilities`** → 它只是「最不坏的一处」，**不是一个已存在的抽象**，别按「复用既有抽象」的轻松口径估工。`agents_api.py:37` 的语义还与其他 6 处不同（走 JSON 文本 LIKE）。
**Source**：Hunt & Thomas · *The Pragmatic Programmer* ·「Don't Repeat Yourself」；Fowler · *Refactoring* ·「Duplicated Code / Divergent Change」。项目侧对应 R6.4「沿用既有抽象」+ `CLAUDE.md` 约定「数据库访问统一走 …」。
**Consequence**：capability 的口径变更（例如将来允许 `{name, weight}` 对象形式，或加命名空间）需要同时改 5 处；漏一处即「路由认为有、UI 不显示、API 过滤不出来」三类静默不一致。已有一处（`agents_api.py:37`）**现在就**与其他不一致。
**Remedy**：
```python
# before (domain_api.py:110-118)
agents = db.query(Agent).filter(Agent.domain_id == domain_id).all()
caps_set = set()
for a in agents:
    cfg = a.model_config_json or {}
    caps = cfg.get("capabilities", [])
    if isinstance(caps, list):
        for c in caps:
            if isinstance(c, str) and c.strip():
                caps_set.add(c)

# after —— 复用本文件已 import 的规范 helper
agents = _owned_agents(db, user, domain_id)          # 见 T-FIX-04
caps_set = {c for a in agents for c in _extract_capabilities(a)}
```
并把 `_extract_capabilities` 提为 `services/` 公开函数（去下划线），前端对应逻辑收敛到 `stores/domains.ts` 一个 selector。
**生成 fix 任务**：T-FIX-02

### 🔴 R6 · Domain Model Distortion：「Agent 拥有某 capability」存在两套互相矛盾的真相

**Symptom**：API 层把 capability 当成「JSON 文本里出现了 `"x"` 这个带引号的子串」（`agents_api.py:36-38`）；UI 与路由层把它当成「`model_config_json.capabilities` 数组的成员」（`AgentControlPlane.tsx:585-605`、`k8s_routing_service.py:20-29`）。上表复现即为反例：Agent B 无 `code-review` 能力，**API 会返回它、画布不会分组它**。
**Source**：Evans · *Domain-Driven Design* ·「Ubiquitous Language / 模型与实现一致」；Fowler · *Refactoring* ·「Speculative Generality 的反面：模型失真」。
**Consequence**：外部集成方（用户故事 4 的目标读者）拿到的 Agent 集合与平台自己在画布上展示的集合不同 → 按 API 结果做扩缩容/路由决策会作用于错误的 Agent 组。这类 bug 在测试数据里通常不显形（需要恰好「别的 key 上出现同名值」），线上才炸。
**Remedy**：单一真相 = 数组成员判定。Python 端过滤（DESIGN.md:54-66 给的两个合法方案之一）：
```python
if capability:
    agents = _filter_owner(db.query(Agent), user).all()
    agents = [a for a in agents if capability in _extract_capabilities(a)]
```
数据量大再上 MySQL `JSON_CONTAINS` / SQLite `json_each`，并把「按哪个方言」写进 DESIGN 的兼容性约束里（R6.2：MySQL 路径本轮未实测，属待确认）。
**生成 fix 任务**：T-FIX-01

### 🔴 R2 · Change Propagation：一条「域内即全量」的查询被复制 7 份，**其中一份的 sink 是凭据**

**Symptom**：`domain_api.py:110` `db.query(Agent).filter(Agent.domain_id == domain_id).all()` **无 owner / 无 visibility 过滤**，是该文件第 **7** 处同形查询（实测 `:34, 91, 110, 143, 172, 208, 279`，本 change 新增 `:110`）。入口只做了 `_filter_owner(Domain)`（`:105-108`）—— 即代码在此把「域成员」当成了「可支配」。
**Source**：Fowler · *Refactoring* ·「Divergent Change / 同一不变量散落在多处」；Martin · *Clean Architecture* · 边界处强制策略。项目侧对应 `CLAUDE.md`：「同一不变量应在两处独立校验（入口 + 中间件）」+「`Domain` 不是安全边界」（**后者不能豁免本条**：恰恰是 `:202`/`:105` 把 Domain 当成了鉴权前提）。
**Consequence（v2 改正：必须按 sink 分，不能按站点分）**：同一句查询的 7 个调用点，**后果量级不同**，v1 把它们并成一谈是判级错误 ——

| sink 类型 | 调用点 | 后果 | 处置 |
|---|---|---|---|
| 返回 capability 字符串 | `:110`（本 change 新增） | 他人 Agent 的能力画像 + 存在性 | 🔴 本 change 内修（T-FIX-04） |
| **新建 Agent 行并复制凭据字段** | **`:208 → :231 → :243`** | **他人 LLM 凭据被搬运 + 他人 token 配额被消耗** | **🔴 独立成条 = F16，见 §2.4；不得缓办、不得只进 ROADMAP** |
| 计数 / 释放域绑定 / 排队统计 | `:34`(`agent_count`)、`:91`、`:143`、`:172`、`:279` | 存在性枚举 / 计数旁路 | 🔴→ 另开 CHANGE 统一收口（议题） |

另：`models/agent.py:33` `visibility` 默认 `"private"` 在**整个 backend 从未被用于任何查询条件**（全仓 grep：仅 `to_dict()` 输出 + `domain_api.py:248` 模板复制）→ 该字段目前是装饰性的，与产品承诺冲突。
**不变量矛盾（本次实测指出）**：`:202` 按「你是不是域 owner」鉴权、`:208` 按「域内即全量」取数、`agents_api.py:26` 又按 owner 过滤 —— **三处对「域 owner 对域内 Agent 有什么权」给了两个答案**。必须二选一并写进文档：要么「域成员＝管理权」（则删 owner 过滤并改产品口径），要么「域内每个 Agent 读写都按 owner 收口」（则 7 处全改）。现状是最坏的一种：两边都以为对方兜了底。
**Remedy**：按上表分档处理；统一收口函数 `_visible_agents(db, user, domain_id)`（admin 全量 / 非 admin 取 `owner_id == user["id"] or visibility != 'private'`）。**`visibility` 的落实与 6 处旧查询属跨端点修复 → 另开 CHANGE（R3.2/R7.1），但 `:208` 这条不在可另开的集合里（F16 与本条同文件同函数，见 §2.4）。**
**生成 fix 任务**：T-FIX-04（`:110`）· T-FIX-13（`:208` 链）· 其余 5 处 + `visibility` 落实 → 议题（R18.4）

### 🟡 R4 · Accidental Complexity：用字符串模式匹配冒充集合语义

**Symptom**：`agents_api.py:36-38` 三行里塞了「序列化 JSON → 手工补双引号 → LIKE → 通配符不转义」四层偶然复杂度；替代方案（`_extract_capabilities` + `in`）是**一行**且已在同仓存在。
**Source**·Bachman ·*Structure of Programming*／Ousterhout ·*A Philosophy of Software Design* ·「复杂度是功能乘出来的」；Ousterhout ·「Define Existence Out of Arguments」。
**Consequence**：后续维护者会加 `escape`、加 CAST、加分支兼容 MySQL —— 每一步都在给一个本不该存在的抽象打补丁。
**Remedy**：见 T-FIX-01；同时删除手写引号拼接。
**生成 fix 任务**：T-FIX-01

### 🟡 F17 · 归一化缺失：同一套真相自己裂开（v3 新增 · G4 架构师 ②，主审实跑确认）

**Symptom**：`_extract_capabilities` 只做「是 str 且 `strip()` 非空」的过滤，**从不改值本身** → 存成 `" code-review "` 的项原样保留。实跑 `sys.path=['backend']` 于 `['code-review',' code-review ','',7,None]` → `['code-review', ' code-review ']`，`set()` 得 **2 个不同元素**。
**Consequence**：部署数据里存在带空格值时，T-FIX-01 修完 `?capability=` 语义后，`distinct_capabilities()` **仍会把同一能力拆成两个画布分组**，而带空格那组**匹配不到任何查询**。即「UI 显示两组、API 只认一组」—— 这正是 F3 在 Consequence 里预言的那类静默不一致，**它现在就存在于被称作"规范实现"的那份代码里**。v1/v2 完全漏掉。
**Remedy**：归一化（`c.strip()`，是否折叠内部空白 / `casefold()` 由产品定但**必须写死在契约里**）放进**唯一的** `services/capability_service.py`；别在 7 处副本各 trim 一遍（那只是把重复搬家）。顺手要求已并入 T-FIX-02 的 `capabilities_of` 签名 + T-FIX-00 的反例（`['code-review',' code-review ']` 去重后须为 **1 组**）。
**判级说明**：🟡 不升 🔴 —— 它不阻塞本 change 出口，且修复是 T-FIX-02 建单一入口时的**顺手项**；升 🔴 会让"必须在 4 行签名里定死归一化语义"这个真实成本被低估。
**生成 fix 任务**：T-FIX-02（契约）+ T-FIX-00（反例）

### 🟡 R1 · Cognitive Overload：单文件 1428 行 / 单组件 176 行 / 14 个 props

**Symptom**：`frontend/src/pages/AgentControlPlane.tsx` = **1428 行**、一个文件内 ≥10 个组件；本次新增的 `CapabilityGroupRow`（`:370-540`）约 **171 行**、props **14 个**（`:371-386`），其中 `routeLoading`/`scaleLoading`/`autoRouteEnabled`/`queueCount` 与「能力分组」这一职责无关（同一组件既分组又承担路由/扩容操作面）。
**Source**：Martin · *Clean Architecture* ·「SRP 于模块」；Hunt & Thomas ·「Orthogonality」；Ousterhout ·「Class Tendency / 认知负载」。
**Consequence**：改分组展示要连带读懂排队/限流/loading 状态；本 change 的 UI 缺陷（见第三轮无障碍项）会扩散到不相关的控制面逻辑。
**Remedy**：把 `CapabilityGroupRow` 拆为 `CapabilityGroupHeader`（分组+健康概要）与 `GroupOpsBar`（路由/扩容/排队，props 打包成一个 `ops` 对象或下沉到 store 的选择器）；文件按组件切目录。
**生成 fix 任务**：T-FIX-05

### 🔴 F10（v4 重写）· 两套「状态」词表混用，恒假的不是我指的那两行 —— 是我的宾语搞错了

> **v4 更正声明（G4 领域专家 ❌②）**：v1–v3 这一段**取证方向反了**。我判定恒假的是 `:156-157`/`:1137`，理由是「`healthy` 从不是 `Agent.status` 的取值」—— 前提成立，**宾语错了**：那两处读的不是 `Agent.status`，是探针 DTO 的 `status`，`healthy` 恰在其取值域内 → 它们是**全文件唯一正确的健康判定**。真正恒假的是我当时**打了 ✅ 放过**的 `:74-75`。更要命的是我给的 remedy（改成 `isAgentHealthy(agent.status)`）会把现在正确的代码**改成恒假**，而它的 verify 恰好会被这次改坏所满足 → **假绿过关**。这不是措辞问题：报告是 4-dev 的输入，照它做会**造出一个新 bug**（R5.2 + R6.3）。以下为重写后的事实。

**词表（两侧都在同一文件里被混用）**

| 词表 | 取值域 | 写入点（实测） |
|---|---|---|
| **生命周期** `Agent.status` | `running` / `standby` / `paused` / `degraded` | `agents_api.py:125,167`、`reconcile_loop.py:419,439` |
| **探针判定** `AgentStatus.status` | `healthy` / `degraded` / `unhealthy` / `error` / `skipped` / `unknown` | `agent_probe_service.py:216,271,407,419`；`control_plane_api.py:94-95` 把它赋给 `entry["status"]` |

**逐行判决（全部实读原文 + 实读 payload 构造）**

| 行 | 代码 | 判决 | 依据 |
|---|---|---|---|
| `:108`/`:1033` | `agent: AgentStatus` | —— | prop 类型是**探针 DTO**，不是 `Agent`。v1–v3 我把它当 `Agent` 读，错从这里开始 |
| `:156-157`、`:1137` | `agent.status === 'healthy'` | ✅ **正确，勿动** | `status` 即探针判定，`healthy` 在其取值域内；且 `:160` 用 `getHealthLabel`（`:33-40`，正是探针词表）→ **自洽** |
| `:74` | `a.health === 'healthy'` → `healthyCount` | 🔴 **恒 `undefined` → 顶部「健康」卡永远显示 0** | `control_plane_api.py:75-85` 构造的 entry 键集里**没有 `health`**（实测该文件仅在 `:94-95` 写 `entry["status"]`，全文件无 `"health"` 键）；而卡片副标题还写着「healthy 状态」 |
| `:75` | `a.status === 'dead' \|\| a.health === 'unhealthy'` | 🔴 **两个分支都不可能为真 → 「异常」卡永远 0** | 探针词表里没有 `dead`；**全后端 grep `'dead'` 无任何写入点**，只有 `alert_service.py:141` 在**读**它 → 那条 `agent_dead` 告警同样**永不触发**（同一根因的第二处扩散） |
| `:531`、`:1076`、`:1129` | 渲染 `agent.runtime` | 🔴 恒空 | 同上，payload 无 `runtime` 键 |
| `stores/controlPlane.ts:8,10` | `health: string` / `runtime: string` | 🔴 **类型在撒谎** | 接口声明了两个后端从不发出的字段 → TS 编译期完全看不出问题，这正是它能活到今天的原因 |
| `AgentProbePanel.tsx:64,168,169,318,478` | 读 `probe.health` | 🟡 同根因既有扩散面（5 处，非本 change） | 契约修复时须一并 grep（R4.6） |
| `:112` + `:22-27` | `getStatusConfig(agent.status)` | 🔴 「运行状态」列**恒走 fallback** | `STATUS_CONFIG` 键集 `{running,idle,blocked,dead}` 作用在探针词表上**零交集** → 直接吐英文 `healthy`/`unhealthy` + muted 灰 |
| `:197-198` + `:15-20` | `STATUS_PRIORITY[a.status] ?? 99` | 🟡 列表排序**实际失效** | 优先级键集 `{dead:0,blocked:1,running:2,idle:3}` 同样零交集 → 全部落 99，排序退化为原序 |

**Source**：Evans · *DDD* ·「统一语言」；Ousterhout · *A Philosophy of Software Design* ·「深模块要求契约清晰」；项目侧 `CLAUDE.md`「路由只做参数校验与鉴权」的反面 —— 契约漂移没人守。
**Consequence**：这是**用户可见的错误数字**（两张概览卡恒 0 + 一列英文状态 + 排序失效），不是内部美感问题；本 change 的 DESIGN 首次把「健康」写成规范，使这些行成为**可判定**的错码。且 `未分类` 兜底桶与「默认域」双指（F19/F20）说明同一类「一个名字两个所指」在本模块是**系统性的**，不是孤例。
**Remedy**：见重写后的 `T-FIX-03`（四件事：补契约缺口 / `:156-1137` 不动 / 两词表各自具名 + DESIGN 加作用域声明 / verify 换成喂数据看行为）。**`:156-1137` 在报告里已明确标注「当前正确，勿动」**，供 4-dev 与后续 review 双向对账。
**v5 补一层（G4 资深测试工程师 ①，比我 v4 的措辞更硬）**：`grep -c "status === 'healthy'"` **今天实测 = 4** —— `:34`（`getHealthLabel` 内，全文件唯一与探针词表自洽的正确映射）+ `:156`/`:157`/`:1137`。action 只让改后三处 → 计数剩 1 → **任何「该计数归零」形式的 verify 都不可能通过，除非实现者再去改坏现在正确的 `getHealthLabel`**，或把字符串换成别的写法（两种都是造新 bug）。故 T-FIX-03 的 verify 已改成 `sed -n '74,75p' | grep -c "a\.health"`（今天 2 → 0）这种**只打真缺陷那一行**的形式，并明写「禁止用全文计数归零」。**判级变更**：🟡 → **🔴**（领域专家建议上调，主审按其实测后果同意：用户可见错误数字 + 技术上可行但业务上不通）。**R9.2 二次确认**：领域专家首指 → 主审逐行独立复现（含实读 payload 键构造与后端 `'dead'` 无写入点）后确认。
**生成 fix 任务**：T-FIX-03（重写）· 连带 `alert_service.py:141` 与 `AgentProbePanel.tsx` 5 处属既有扩散面 → 登记议题（T-FIX-12）

### 🟡 R5 · Dependency Disorder：业务逻辑落在 routes 层

**Symptom**：`domain_api.py:101-119`（集合派生 + 去重 + 排序）与 `agents_api.py:25-39`（过滤策略）写在路由里；`CLAUDE.md` 约定「路由只做参数校验与鉴权，业务逻辑放 `services/`」。方向上未出现反向/循环（见 2.3），属**层级渗漏**而非依赖混乱。
**Source**：Martin · *Clean Architecture* ·「Dependencies point inward」；项目自订约定（`CLAUDE.md` §约定）。
**Consequence**：capability 逻辑无法被非 HTTP 入口（定时任务、CLI、引擎）复用 —— 而 `scheduled_task` 已经有一条 `capability` 列（`agents_api.py:222-232`），下一步就会再抄第三份。
**Remedy**：新建 `services/capability_service.py`（`capabilities_of(agent)` / `filter_by_capability(agents, cap)` / `distinct_capabilities(agents)`），routes 只做校验与鉴权。与 T-FIX-02 合并执行。
**生成 fix 任务**：T-FIX-02

### 2.3 架构依赖图

2.2 触发条件逐项判：新增顶级模块/package ❌ · 危险 import 合并 ❌ · 新中间件/服务 ❌ · 跨 ≥5 模块重构 ❌ → **未触发**，只给本次面的最小方向核对（grep 实测）：

```mermaid
graph LR
  R1[routes/agents_api.py] --> S1[services/k8s_routing_service.py]
  R2[routes/domain_api.py] --> S1
  S1 --> S2[services/scheduler_service.py]
  R1 --> M1[(models/agent.py)]
  R2 --> M1
  R2 --> M2[(models/domain.py)]
  R2 -. "T-FIX-02 应新增" .-> S3[services/capability_service.py]
```

**循环依赖**：无（`grep "^from routes|from main import"` 在非 routes 层 0 命中；`main.py` 为组装根）。
**反向依赖**：**v3 订正 —— v2 写「无」说过头了**，我当时只 grep 了 `from routes` 与 `from main import`，**没查 `services → engine` 这条边**。架构师补测（我实跑复现）：

| 边 | 证据 | 性质 |
|---|---|---|
| `services/scheduler_service.py:5` → `engine/scheduler.py` | 顶层 import（非函数内延迟导入） | **服务层依赖调度策略层**。与 DESIGN.md:10 自己拍的「依赖只能向下」不冲突 —— 清单里根本没给 `engine` 排位次，所以"谁在谁上面"这个决定**没做完** |
| `engine/reconcile_loop.py:57`、`:464` → `services.agent_probe_service` / `services.audit_service` | **函数体内**延迟 import | 层级双向。刻意延迟规避 cycle 的写法（与 DESIGN.md:123-137 规避 `main` 循环 import 同法），**可辩护、不该报 🔴**，但必须记名：它使 `services↔engine` 在层级别双向，谁日后提模块、谁先 import 谁都会踩 |
| `engine/scheduler.py` | 仅 `heapq`/`dataclasses`/`time` | 叶子 —— 这正是「`PriorityQueue` 该下沉 shared/util 或不与调度策略同层」的实证理由（v2 给不出，因为我没跑过这条边） |

**准确表述**：routes→services→models 单向**成立**；**`services↔engine` 双向、无 import cycle**。故本轮**不为它出 🔴、也不阻塞本 change**，但 **F13 的 remedy 定调须一并写 `engine` 在依赖清单里的位置** —— 不补这一定义，「把域能力聚合逻辑下沉 `services/`」会立刻撞上「`services` 能不能 import `engine`」这个当前无人能答的问题（R6.2：该边未做全仓普查，只验了 capability 相关的这两个文件）。

### 2.4 安全审查节（v2 补 · G4 安全审计师 ❌ 的直接后果）

> kit-6-review 的三轮里没有独立安全节，但 2.0/2.1 把「安全」轮次推给 `TEST.md` —— 而本 change 的 `TEST.md` 不存在，所以**这条 🔴 与安全零证据同源**（同一条门禁红，不重复计两条）。本节按 G4 要求逐项标注 OWASP，**不适用的也写理由**。

#### F16 · 🔴 Critical（A01 越权 → **凭据搬运**）`POST /api/domains/{id}/scale`

主审独立复现（**in-process 直调端点函数**，内存 SQLite，未起 HTTP 服务）：

```
构造：Domain#1 owner=mallory（攻击者是域 owner）
      Agent#10 owner=alice,  domain_id=1, capabilities=["code-review"],
                api_key_encrypted="ENC::alice-super-secret-llm-key"     ← 受害者凭据
      Agent#11 owner=mallory, domain_id=1, capabilities=["python"]      ← 攻击者自己的 Agent（不含该 capability）
调用：scale_agents(domain_id=1, {"capability":"code-review","desired_replicas":2}, user=mallory)
结果：HTTP 返回 {'status': 'scaled'}
      新副本 id=12 name='alice-coder-replica-1' owner_id='mallory'
        api_key_encrypted == 受害者的密文 ? True          ← 逐字节相等
        model_config_json={'capabilities': ['code-review']}  visibility='private'
      攻击者 owner 过滤后能看到(即可 /run): [11, 12]      ← 副本归他所有，跑得动
      受害者 owner 过滤后能看到:            [10]
```

**链（每一跳都有行号，均已读过原文）**：

| 跳 | 位置 | 事实 |
|---|---|---|
| 1 | `domain_api.py:202` | 只鉴权「你是不是这个域的 owner」（`_filter_owner(Domain)`） |
| 2 | `domain_api.py:208` | `db.query(Agent).filter(Agent.domain_id == domain_id).all()` **不带 owner / 不带 visibility** →「域成员」被当成「可支配」 |
| 3 | `domain_api.py:212-215` | 按 capability 命中，`matching` 可包含**他人**的 Agent |
| 4 | `domain_api.py:231` | `template = matching[0]` → 模板可以是别人的 Agent |
| 5 | `domain_api.py:236,243` | `owner_id=user["id"]`（新副本归请求者）＋ **`api_key_encrypted=template.api_key_encrypted`**（装着别人的 LLM Key），`model_config_json`/`workflow_id`/`*_limit` 一并外移 |
| 6 | `agents_api.py` `api_run_agent` | 副本 `owner_id` 已是请求者 → **通过** `_filter_owner`，可正常执行 |
| 7 | `services/chat_service.py:103` | `api_key = decrypt(agent.api_key_encrypted)` → 执行时解密取用，**用的是受害者的 Key** |

**后果**：他人 LLM 凭据被盗用 + 他人 token 配额被消耗（`token_*_limit` 一并复制）+ 他人模型配置/工作流绑定外移。**不是**「证明其存在」——v1 就是这么轻描淡写的，判错。

**前置条件不是构造出来的**（这点决定严重度）：`agents_api.py:54`（创建）与 `:84-87`（`api_update_agent` 的 `setattr` 白名单含 `domain_id`）**接受任意 `domain_id`，既不校验存在也不校验归属** → 「团队域里装着非域 owner 的 Agent」是**当前代码的正常用法**，攻击者只需建一个域并等别人的 Agent 落进来（或反向：把自己的塞进别人的域再扩容，语义同样坏）。

**v5 更正 · 这条前置条件我写小了（G4 安全审计师 ②，主审 in-process 实跑确认）**：真实入口不是「当上域 owner」，是**「够得到这个端口」**。`main.py:209-210` 不带 `X-User-Id` 即 `get_user("admin")`，而 `_filter_owner` 见到 `role=="admin"` 就**完全不加条件** → **域检查（`:202`）与取数（`:208`）被一起旁路**。实跑对照（同一个 alice 拥有的域、mallory 不拥有它）：

```
非 admin 的 mallory（无域所有权）  -> HTTPException 404 域不存在        （:202 拦住了）
不带 X-User-Id 的默认身份 = admin  -> status=scaled，副本 owner_id=admin，
                                      decrypt(副本.api_key_encrypted) == 受害者明文 Key -> True
```

所以 F16 不是「A01 且攻击者恰好是域 owner」，是 **A01 × A07 的组合**：任何能到达端口的客户端默认就是 admin，可对**任意域内任意 Agent** 造出携带他人凭据的副本；而 `main.py:196-199` 的 localhost 判定**在反向代理后失效**（`CLAUDE.md` 已把这条记为待修）→ **真实部署下等价于远程未鉴权凭据窃取**。影响段按此口径读，别停在「域 owner 可 mint」。

**修复判据（T-FIX-13 的 verify · v5 改正：判明文，不判密文）**：非 Agent owner 的调用者，**无法 mint 出可被解密为他人明文 API Key 的副本**。⚠️ v3/v4 写的是「断言副本的 `api_key_encrypted` **不等于**受害者密文」—— **那是个坏判据**：`encryption_service.py:20` 每次 `nonce = os.urandom(12)` → 同一明文密文必然不同（实跑 `encrypt(K) != encrypt(K)` → **True**），于是 `api_key_encrypted = encrypt(decrypt(template.api_key_encrypted))` 这种**把受害者的 Key 重新加密挂到自己名下**的写法**逐字节不等、断言通过、盗窃完全成立**（`chat_service.py:103` 运行时照样解出明文取用）。上面 §2.4 的复现用的是 `"ENC::alice-…"` 假密文，它证明了复制传播，但**不能**当回归判据样板（R5.2）。

#### OWASP Top 10 逐项（本次审查面）

| # | 类别 | 判定 | 依据 |
|---|---|---|---|
| A01 | 失效的访问控制 | 🔴 **命中** | F16（`:208→:243`）+ `:110` 缺 owner 过滤 + `visibility` 全后端未执行 + 三处不变量互相矛盾 |
| A02 | 加密机制失效 | 🟡 不在本面，但相邻 | 口令为无盐 `hashlib.sha256`、默认口令 `123456` 硬编码（`CLAUDE.md` 已记为待修，属项目级议题）；**`api_key_encrypted` 走 `encryption_service` 是真加密** → F16 的可怕之处正在于"密文被合法搬走且运行时会解密" |
| A03 | 注入 | ✅ **不成立 —— 已由主审 v3 自跑负例（此前是二手采信安全审计师的结果，现已换成自己的一手证据）** | in-process 直调 `api_list_agents`，4 行数据、以非 admin 用户身份：<br>`capability="' OR '1'='1"` → `[]` 不报错；`capability="'; DROP TABLE agents; --"` → `[]` 且**表仍有 4 行** → 谓词走绑定参数，SQL 结构未被改写。<br>同一轮把 F2 的两个反例也钉死：`code-review` → `['a1','a2']`（**a2 的 `capabilities` 是 `[]`，只是另一个 key 的值恰为 `"code-review"`** → 跨 key 假阳性）、`code_review` → 同样 `['a1','a2']`（`_` 通配符把 `code-review` 也吃进来）。<br>**A01 维度亦不成立**：`%` → 只返回调用者自己的 3 条（他人的 a4 不出现）→ `:26` `_filter_owner` 确在 `:37` 之前生效。对照：**admin 身份 + `%` → 4 条全出**（含他人 Agent）→ 唯一逃逸口是角色，而角色来自 A07 的可伪造 header。<br>**结论**：F2 是**语义绕过 + 领域扭曲**，不挂安全名头；`capability=''` 实测返回全量（`if capability:` 跳过过滤）→ 该语义须在 TEST.md 里**显式择一**，不能靠巧合。 |
| A04 | 不安全设计 | 🟡 命中（设计层） | 「Domain 是分组还是权限边界」无人拍板（见 R2 节末不变量矛盾）→ 同类洞会在每个新端点复现 |
| A05 | 安全错误配置 | 🟡 项目级 | `main.py:196-199` localhost-only 判定在反向代理后失效（`request.client.host`）；`CLAUDE.md` 已记 |
| A06 | 易受攻击与过时组件 | ➖ **本 change 不适用** | 本次 commit 不含依赖变更（`git show --stat 97044bd0 ad350689` → 仅 3 个文档文件，0 个 `requirements` 行）。存量问题另计（见下「依赖扫描」） |
| A07 | 身份认证失效 | 🔴 **项目级命中，本面相邻 —— v5 升为 F16 的共同成因（A01×A07）**，admin 旁路会把 `:202` 域检查与 `:208` 取数**一起跳过** | `main.py:204` 从 `X-User-Id` 取身份、`:210` **不传即 `get_user("admin")`**；`auth.py:180-185` `get_current_user` 缺 state 时同样回退 admin，唯一缓解是 `main.py:196-199` 的 localhost 判定。**直接影响本轮所有行过滤修复的可验性**（见下方前提声明） |
| A08 | 软件与数据完整性失效 | ➖ 不适用 | 本面无反序列化、无插件/模板加载、无 CI 供应链变更 |
| A09 | 日志与监控失效 | 🟡 命中 | `log_audit` 确实记了 `domain.scale`（`:245+`），但**记不了"模板是别人的"**：审计字段无 `template_owner`。F16 发生时，审计日志看起来完全正常 |
| A10 | 服务端请求伪造 | ➖ 不适用 | 本面无出站 URL 取参（`control_plane_api` 的 `_resolve_health_url` 属别的 change，未审） |

#### 本轮新做的扫描（此前既没做也没列进盲区）

| 扫描 | 结果 | 口径 |
|---|---|---|
| 审查面秘钥/凭据模式 | **1 命中，判为非凭据**：`agents_api.py:45` `api_key = payload.get("api_key","") or "not_set"` 是缺失时的**占位默认值**，不是密钥字面量；4 个审查文件内无真实 key/token/AKIA 字面量 | 主审 grep 补做（`-Ei "(api_key\|secret\|token\|passw\|sk-\|AKIA)…[:=]…"`）。⚠️ 顺带一条 🟢：这行把「未提供 api_key」静默吞成 `"not_set"` 再 `encrypt()`，而不是 400 —— 与 F16 无涉，但会让"凭据缺失"在运行期才炸 |
| 依赖 CVE | **本轮未跑工具**（无 `pip-audit`/`safety` 可用；联网扫描不属本 run 交付）→ 记盲区 | 存量事实：`backend/requirements.txt` 13 条**全是 `>=` 区间、无任何锁文件**（`poetry.lock`/`uv.lock`/`requirements.lock` 均不存在）→ 构建不可复现，属项目级议题，**不是本门的红** |
| OWASP 逐项 | 已做（上表） | v1 全仓 grep `OWASP` 在本文件 0 命中 → 本轮补齐 |

#### 前提声明：本轮所有「行过滤」类修复都建在可伪造的身份上

`T-FIX-04` / `T-FIX-13` 的 owner/visibility 收口，前提是 `request.state.user` 可信 —— 而 A07 说明它**不可信**（无 `X-User-Id` 即 admin）。因此两条任务的 verify **一律不得写「越权已修复」**，只能写「**入口层已加行过滤，身份层仍待修**」（`CLAUDE.md`：同一不变量应在两处独立校验）。身份层 fail-open 不在本 change 面、已登记为项目级待修，**本处不另判一条红**，只防止它被当成已修。

---

## 第三轮 · UI 视觉审查（触发：本 change 改 `AgentControlPlane.tsx`）

> ⚠️ 覆盖盲区先说清：**无 `UI-DESIGN.md`** → 3.3「视觉北极星一致性」无法判定（不是"通过"，是"没基线"）。3.1 的颜色/token 判定按 `frontend/src/styles/tokens.css` 实际存在的变量执行。

### 3.1 Design Tokens 一致性

| 检查项 | 结果 | 证据（行号在本 change 组件内优先） |
|---|---|---|
| 颜色全部来自 token | ❌ | **硬编码纯白 `#fff`**：`:457`、`:473`（均在 `CapabilityGroupRow` 的操作按钮上）；另 `:850, :962, :1012, :1225`（pre-existing 同形）。**v3 订正**：我 v2 写「`tokens.css` 无中性白/前景 token」也不准 —— `--text: #e1e2e5`（`:34`）就是中性前景。正解是**改用 `var(--text)`**（禁纯白是 anti-pattern 要求，但不必新建 token，别为不存在的需求加变量） |
| 无硬编码 hex | ❌ | 同上（`#fff` ×6） |
| 无硬编码字号 | ❌ 命中即 🔴（kit 3.1 规则原文） | `:427` `fontSize: 10`、`:433` `fontSize: 10`、`:437` 同、`:405/:409` `fontSize: 10/11`、`:459/:475` `fontSize: 10` 等 —— 根因**只对一半**：全量列 `tokens.css` 61 个自定义属性后实测 **无任何 font-size token**（`--text/--text-secondary/--text-muted` 是**颜色**不是字号，`:34-36`），所以字号确实"物理上不可用"。**但 v2 同段把间距/圆角也说成缺失是错的**，见下一行 |
| 无硬编码间距/圆角 | ❌ 命中即 🔴 · **v3 根因订正** | `padding: '6px 8px'`(`:401,404`)、`'8px 12px'`(`:415`)、`'2px 8px'`、`'1px 6px'`(`:433,436`)、`borderRadius: 4/8`（`:402,441`）。**我 v2 的归因「`tokens.css` 只有 `--s1`/`--r-sm`，用 token 物理上不可用」是假的** —— 来源是我自己那条被 `head -60` 截断的 grep（同一份报告里另一行其实已写过「`--r-sm` 存在却未用」，v2 自相矛盾我没发现）。实测 `tokens.css:47` 有 `--s1/2/3/4/5/6/8/10`、`:50` 有 `--r-sm/--r-md/--r-lg`，tokens.css 自己用 `var(--s*)` 3 处，而 `AgentControlPlane.tsx` 用 `var(--s*)`/`var(--r-*)` **0 处** → 定性从「缺基础设施」改为「**有 token 不用**」：**机械替换、无需设计决策、不该拿去找人工签字** |
| 字体与 UI-DESIGN 一致 / 无 anti-pattern 字体 | ⚠️ 无法判（无 UI-DESIGN）+ **pre-existing 命中**：`tokens.css:43` `--font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` 含 **Roboto**（强制禁忌 · 字体类）。非本 change 引入 | → 议题（R18.4），不入本 change |
| 第二个强调色 / 彩底灰字 / 纯黑纯白 | ❌ 纯白已记；`var(--purple)` 用于能力标签底色（`AgentBuilder.tsx:98`）属语义色，按「判断模糊地带」不判违规 | |

### 3.2 Anti-Pattern 扫描（逐条对照 `reference-ui-anti-patterns.md` 强制禁忌）

| 类别 | 命中 | 位置与说明 |
|---|---|---|
| 布局类 · **卡片嵌套卡片** | 🔴 **命中** | `AgentControlPlane.tsx:585-605` 的域容器是卡片（`border 1px + borderRadius: 8 + background: var(--bg-card)`），其展开区 `:660-698` 内每个 `CapabilityGroupRow` 又是一张卡片（`:402-403` `border + borderRadius: 4`），组内 Agent 行再套表格 → **三层树=三层卡片**，正是清单里「hierarchy flatten 优先」点名的形态 |
| 布局类 · 统一 4/8/12/16/20 间距 | 🔴 命中 | 同上间距值（4/6/8/12/16 族），与清单「用非线性 scale 替代」冲突 |
| 颜色类 · 纯白 `#fff` | 🔴 命中 | `:457, :473`（本 change）+ 4 处 pre-existing |
| 阴影类 | ✅ 未命中 | 本 change 面无 `box-shadow` |
| 边框类（彩色侧条 >1px / 玻璃拟态） | ✅ 未命中 | 仅 1px `var(--border)` |
| 动效类 | ✅ 未命中 | `transition: background .15s` / `transform: rotate` 只动 transform/背景，无 bounce；未动 layout 属性。（`prefers-reduced-motion` 见 3.4） |
| 文案类 | ✅ 未命中 | 无 hedging / lorem；按钮文案为具体动词「自动路由 / 扩容」 |
| 组件类（placeholder 当 label / 模态 ESC） | ➖ 本 change 面无表单与模态 | |

### 3.3 视觉北极星一致性

**未做** —— 缺 `UI-DESIGN.md`，无美学北极星可比。记为覆盖盲区，不记「通过」。

### 3.4 无障碍快检

| 检查项 | 结果 | 证据 |
|---|---|---|
| 交互元素键盘可达 | ❌ | 能力组头是 `<div`（`:412`）换行 `onClick={onToggle}`（`:413`）——**行号 v5 精化：`:411` 是外层卡片 div**；且该写法使字节串 `<div onClick` 在全文件 **0 命中**，非 `<button>`、无 `tabIndex` → Tab 不可达（WCAG 2.1.1 A 硬失败）。域级 `:552-556` 同形（pre-existing 模式），本 change 复制了它 |
| `aria-expanded` / 语义 | ❌ | 展开态只体现在 `transform: rotate(90deg)`（`:425`），读屏无 `aria-expanded`、无 `aria-controls` |
| 焦点环可见 | ⚠️ | 因不可聚焦，焦点环无从谈起；`tokens.css` 是否有 `:focus-visible` 样式未逐一验（**待确认**） |
| `prefers-reduced-motion` | ⚠️ 待确认 | 本 change 的 `transition` 有 `--fast`/`--ease` token 支撑；全局是否包了 reduced-motion 媒体查询未实测 |
| 对比度实测 | ❌ 未测 | 无浏览器/量具在本环境，`#fff` on `var(--blue)` 与 `fontSize: 10` 的 AA 达标**不可凭目测声明** → T-FIX-06 用工具实测 |
| 装饰图标 alt / aria-hidden | 🟢 | 图标为 lucide 组件 + emoji `📦`（`:430`）；emoji 兼作可见标签、又与图标库混用 → 视觉一致性小问题 |

**UI 轮结论**：🔴 ×3（纯白 `#fff`、硬编码字号 + 间距/圆角（**v3：字号确无 token；间距/圆角有 token 而不用**，两者性质不同、修法不同）、卡片嵌套）+ 🟡 ×1（键盘可达/ARIA）。全部生成 fix 任务。

---

## 第四轮 · 补充审查

### 4.1 技术债评估

**未触发**：本 change 非里程碑/季度大版本/重构项目；`.specs/CONTEXT.md` **无「技术债」段**（实测 grep 0 命中），不满足「多于 30 天未更新」的判定前提。
顺带登记事实（R18.4 议题，不入本 change）：`CONTEXT.md` 头部自述生成于 **2026-07-06**，至今 **79 天**，其 §3 代码规模表已与现实偏离（例：它记「后端 .py 112 / 前端 ts·tsx 96」，当前实测 **117 / 100**）。

### 4.2 跨模型 spot-check —— **触发已判定；二审结果本 turn 未回收 → 待确认**

触发依据（命中 2 条，均已实测）：① 本面涉及鉴权/越权（`domain_api.py:110` 无 owner 过滤，且 `visibility` 全后端未执行）；② `CapabilityGroupRow` ≈171 行 > 80 行。

**已做**：派出一个 **fresh-context 同模型二审 agent**（独立上下文、不带本报告任何结论，只给文件面与 spec 路径，允许其自行做只读复现实验）。

**未做，也不假装**：该二审在本 turn 结束前未返回（已就地取消，不留孤儿任务），其结果**不写进本报告**。故本节结论只有一条：

| 主审发现 | 二审发现 | 是否一致 | 处理 |
|---|---|---|---|
| F1-F15 | — | **待确认**（二审未回收） | G4 汇总轮补记，或按人工裁定改派真跨模型；G4 投票人须把本节当**已知盲区**看待 |

两条诚实边界（R6.2）：

1. **口径**：即便回收，本环境只有同模型可用 —— 那是「fresh-context 二审」，**不等同于** kit 4.2 要的跨模型。是否必须真跨模型 → 见「待人工裁定」第 4 条。
2. **本报告的可信度不依赖本节**。全部实质结论均由主审**自己实跑取证**：FR1 三个反例（内存 SQLite 复现）、谓词编译（SQLite + MySQL 方言）、`tsc --noEmit`（32 错误 / 本面 0 错误）、既有 helper 与 7 处引用点 grep、`visibility` 全后端 grep。二审是**加保险**，不是证据来源；它缺席不改变任何 🔴 判定，也不改变 2.0 门禁的红。

**待办**：G4 汇总轮（收齐 4 票后）补记本节；未补记前本 change 的 4.2 视为未闭环。

---

## 严重发现汇总

> **v4 合计 20 项：9 🔴 / 9 🟡 / 2 🟢**（v1 15/7🔴 → v2 +F16 → v3 +F17 且 F13 升 🟡 → v4 +F18/F19/F20 且 F10 升 🔴）。计数由本表逐行数出，非手填。

| # | 严重度 | 类别 | 描述 | 位置 | fix 任务 |
|---|---|---|---|---|---|
| F1 | 🔴 Critical | 测试门禁 | `TEST.md` 与 CHANGE.md 自declared 的 `test_backend.py` 均不存在，5 轮金字塔全部未声明；FR1-FR5 零自动化覆盖 | `.specs/capability-groups/` | T-FIX-00 |
| F2 | 🔴 Critical | Spec 合规 / R6 | 「Agent 有 capability」两套矛盾真相：API 用 JSON 文本 LIKE，UI/路由用数组成员；跨 key 假阳性 + `%`/`_` 通配符透传（实测复现） | `backend/routes/agents_api.py:25,36-38` | T-FIX-01 |
| F3 | 🔴 Critical | R3 | 重写同文件已 import 的既有 helper（**v3：后端 7 处 + 前端 2 处**；「规范实现」自家文件内也有 2 处内联 → 不是现成抽象） | `backend/routes/domain_api.py:110-118` vs `services/k8s_routing_service.py:20-29` | T-FIX-02 |
| F4 | 🔴 Critical | 安全A01 / R2 | `:110` 无 owner/visibility 过滤的域内 Agent 查询（**v2 按 sink 降级重述**：本条 sink = capability 字符串；同族其余站点见 F16 与议题）；`visibility="private"` 全后端从未被执行 | `backend/routes/domain_api.py:110`（同形 `:34,91,143,172,279`） | T-FIX-04 |
| **F16** | 🔴 **Critical** | **安全A01 → 凭据搬运** | 域 owner 可用 `POST /api/domains/{id}/scale` 以**他人 Agent 为模板** mint 归自己所有的副本，**逐字节复制 `api_key_encrypted`**（`:208→:231→:243`），副本过 owner 过滤可运行 → `chat_service.py:103 decrypt()` 取用受害者凭据。in-process 复现见 §2.4。**v1 把它并进 F4 的「7 处同形查询」是判级错误** | `domain_api.py:202,208,231,236,243` + `chat_service.py:103` | **T-FIX-13** |
| F17 | 🟡 Major | R3/R4 | capability 值未归一化：带空格的 `" code-review "` 与 `"code-review"` 去重成 2 组、且前者匹配不到任何查询（v3 补 · 实跑确认） | `backend/services/k8s_routing_service.py:20-29` | T-FIX-02 + T-FIX-00 |
| F18 | 🟡 Major | R3 / R6 | **前端是 capability 的第三套真相**：`:588-592` 取 `cfg.capabilities` 后**不过滤**空串/空白/非字符串，而后端两套真相都会过滤 → `capabilities:[""]` 的 Agent 在画布上自成一个**空名分组**、在后端算「无能力」归入未分类。**`T-FIX-01` 只统一后端仍收不平**，且这正是 F3 抱怨的那类副本 | `AgentControlPlane.tsx:588-592` vs `k8s_routing_service.py:20-29` | T-FIX-01 + T-FIX-02（前端须纳入同一条具名规则） |
| F19 | 🟡 Major | R6 领域 | **「默认域」一词双指 → FR5 不可判定**：`main.py:143-151` 启动时**真建了一行** `Domain(name="默认域", owner_id="admin")`；而 `:860-870` 的「默认域」卡是 `domainKey="default"`/`domainId=null` 的 NULL 兜底桶，`:836` `sortedDomains` **不过滤**同名行 → 树上可**同时出现两张「默认域」**（一张可删、一张不可删）；删真实那行走 `domain_api.py:84`「`domain_id` 置 NULL（回归默认域）」= **把 Agent 从「默认域」搬进「默认域」**，删除计数对用户不可见。根因在 `agent-domains/REQUIREMENT.md` FR3 自相矛盾（既说"自动创建默认域行"又说"NULL 视为默认域"），本 change FR5 原样继承 | `main.py:143-151`、`AgentControlPlane.tsx:836,858-870`、`domain_api.py:84` | **待人工裁定第 6 条** + T-FIX-12 议题（R3.2：**禁止**混进 T-FIX-04 顺手改） |
| F20 | 🟡 Major | R6 领域 | `未分类` 是**裸字符串 key，与用户可自填的 capability 同一命名空间**（`:594-596` 与 `groups[cap]` 同表）→ 声明 capability 就叫 `未分类` 的 Agent 会并进兜底桶，并在 `domain_api.py:119` 的能力清单里与兜底桶**不可区分**。另 **FR1×FR5 的交集没有任何 AC**：`?capability=未分类` 在 T-FIX-01（数组成员判定）落地后**恒 0 条** → 外部集成方无法复现画布上那一组，用户故事 4 与 FR5 互相打不到 | `AgentControlPlane.tsx:594-596`、`domain_api.py:119` | **待人工裁定第 7 条**（兜底桶改保留字或 API 支持 `capability=__none__`，口径写进 FR5 → 属 1-requirement，Reviewer 只登记） |
| F5 | 🔴 Critical | UI 3.1/3.2 | 纯白 `#fff` 硬编码（本 change 按钮 2 处） | `AgentControlPlane.tsx:457,473`（另 `:850,962,1012,1225` pre-existing） | T-FIX-07 |
| F6 | 🔴 Critical | UI 3.1 | 硬编码字号 + 间距/圆角。**v3 拆性**：字号＝`tokens.css` 确无 font-size token（需人工定 scale）；间距/圆角＝**`--s*`/`--r-*` 已存在、本页面 0 引用**（机械替换，**不该进「已知接受」选项**） | `AgentControlPlane.tsx:401-441,459,475` | T-FIX-08 |
| F7 | 🔴 Critical | UI 3.2 | 卡片嵌套卡片（域卡片 > 能力组卡片 > Agent 行，三层树三层卡） | `AgentControlPlane.tsx:585-605` + `:402-403` | T-FIX-09 |
| F8 | 🟡 Major | Spec 合规 | 偏离 DESIGN 指定的实现方式（「`JSON_CONTAINS` 或 Python 端过滤」两者皆未用） | `DESIGN.md:54-66` vs `agents_api.py:36-38` | T-FIX-01 |
| F9 | 🟡 Major | UI 3.4 | 能力组头 `<div onClick>` 键盘不可达、无 `aria-expanded` | `AgentControlPlane.tsx:412-413,425` | T-FIX-06 |
| F10 | **🔴 Critical（v4 升级）** | R3 / 统一语言 | **两套状态词表混用，而我 v1–v3 指错了对象**：恒假的是 `:74/:75`（顶部「健康」与「异常」两张概览卡**永远 0**（实测卡片标签在 `:78-80`：`label: 健康 / sub: healthy 状态`、`label: 异常 / sub: dead / unhealthy`，两个 sub 里的取值都不可达） —— payload 无 `health` 键，且全后端无 `'dead'` 写入点，只有 `alert_service.py:141` 在读它 → 那条 `agent_dead` 告警同样永不触发）、`:531/:1076/:1129` 的 `runtime` 恒空、`getStatusConfig`(`:112`) 与 `STATUS_PRIORITY`(`:197`) 对探针词表**零交集** → 状态列吐英文、排序失效；`stores/controlPlane.ts:8,10` 声明了后端从不发的字段（**类型在撒谎**，所以编译期看不出来）。v1–v3 判为恒假的 `:156-1137` **是全文件唯一正确的健康判定** | `AgentControlPlane.tsx:74-75,156-157,531,1076,1129,1137` + `control_plane_api.py:75-85` + `stores/controlPlane.ts:8,10` | T-FIX-03（**v3 版会造新 bug，已重写**） |
| F11 | 🟡 Major | R1 | 1428 行单文件 / `CapabilityGroupRow` 171 行 14 props，分组与路由扩容同组件 | `AgentControlPlane.tsx:370-540` | T-FIX-05 |
| F12 | 🟡 Major | Spec 合规 | FR2 端点零消费者；用户故事 4「以便外部集成」不可验证 | `domain_api.py:100-119`、`stores/domains.ts`（无 fetch） | T-FIX-11 |
| F13 | **🟡 Major**（v3 取严）| R5 | 业务逻辑住 routes 层，违反 `CLAUDE.md`「路由只做参数校验与鉴权」——**v2 自相矛盾：2.2 正文记 🟡、本表记 🟢**，按取严统一为 🟡 | `domain_api.py:101-119`、`agents_api.py:25-39` | T-FIX-02 |
| F14 | 🟢 Minor | 一致性 | 组顺序两端各自 `sort()`，中文 `未分类` 的落位依赖 locale | `domain_api.py:119` / `AgentControlPlane.tsx:666` | T-FIX-10 |
| F15 | 🟢 Minor | 需求溯源（**v4 改定性**） | ~~范围蔓延~~ **撤销**：`route_to_agent`(`k8s_routing_service.py:50`) 与 `POST /domains/{id}/scale`(`domain_api.py:185-215`) **本来就是 capability 粒度**的既有规则，实测能力组行是这些按钮的**唯一宿主**（`DomainAccordionRow` 内无同形按钮，只透传 `onRoute/onScale`）→ 把按钮剥到域级会让「按能力扩容」失去可寻址处，**按业务语义能力组行是正确宿主**。真问题：这条业务规则在 `.specs/` 的 REQUIREMENT/DESIGN/CHANGE 里 **0 命中**（我实跑复核确认，只存在于 PRODUCT-DESIGN.html / COMPETITIVE-RESEARCH / BRAINSTORM）→ **需求欠账，不是实现越界** | `AgentControlPlane.tsx:445-490` | T-FIX-05 照做（R1 认知负载，与归属无关）· 溯源缺口 → 待人工裁定第 8 条 |

### 覆盖面声明（不把「没找到问题」当「没有问题」）

- **看了**：FR1-FR5 / NFR1-NFR3 逐条；`agents_api.py`（1-70 行）、`domain_api.py`（1-150 + 7 处 Agent 查询清单）、`k8s_routing_service.py`（1-60）、`models/agent.py` 全文、`AgentControlPlane.tsx` 的 `:74,156,360-490,552-700,860-870,1137`、`stores/domains.ts`、`tokens.css` token 清单、`backend/tests/` 全目录 grep、`.specs/capability-groups/` 四份工件。
- **实跑了**：`tsc --noEmit`（32 错误，本面 0）、SQLAlchemy 谓词编译（SQLite + MySQL 方言）、内存 SQLite 三条样本的 FR1 反例复现、`visibility` 与既有 helper 的全仓 grep。
- **没看 / 判不了（盲区）**：① 运行时 UAT —— 未启动 uvicorn/vite，任何"界面看起来对不对"都没验；② 对比度未实测（无量具）；③ MySQL 部署路径未实测 → 待确认；④ 无 `UI-DESIGN.md` → 视觉北极星与美学一致性整节跳过（非通过）；⑤ 无 `TEST.md` → 5 轮金字塔只能判缺，不能判过；⑥ 未审 `agent-domains`/`knowledge-plus`/`multi-provider`/`small-model-decisions`（均不满足预检）；⑦ 无独立 diff，按 CHANGE「变更范围」表界定审查面，可能漏掉未列在该表却被顺带改动的文件；⑧ 「未与 pre-existing 代码划清归属」的行已逐条标注，但 79 天未更新的 `CONTEXT.md` 使部分「是不是本次引入」只能靠 grep 推断。
- **v2 因安全节新增的盲区（别当通过）**：⑨ **依赖/CVE 扫描未跑工具**（环境无 `pip-audit`/`safety`，联网扫描不属本 run 交付）→ 仅登记存量事实：`requirements.txt` 13 条全 `>=` 区间、无锁文件；⑩ **F16 只做到 in-process 直调复现，未在跑起来的实例上打过 HTTP** → 跨进程/带真 `cryptography` 密钥的端到端链未验；⑪ **A07 身份伪造链的真实部署组合行为未实测** —— `X-User-Id` 伪造与 `main.py:196-199` localhost 判定在反向代理后的实际表现未验（未起服务），`CLAUDE.md` 已记此 fail-open；⑫ **OWASP 逐项是主审自标**：A03 已由主审自跑负例转一手证据（v3），A01 由安全审计师首指 + 主审 in-process 复现，**其余 7 项无第二人复核**；⑬ **F10 的界面表现未实测**（领域专家同一自白）：「健康卡恒 0」「状态列吐英文」是**静态契约推导 + payload 键实测**得出的，未起服务看渲染 → **UAT 时必须顺手确认顶部「健康」卡是否为 0**，若不为 0 则说明另有写入路径我没找到，F10 需再改。：A03 已由主审**自跑负例**转为一手证据（v3），A01 由安全审计师首指 + 主审 in-process 复现，其余 7 项**无第二人复核**。

---

## 待人工裁定（R2.5：🔴 必须修复或显式「已知接受」并签字）

| # | 需人拍板的取舍 | 依据 |
|---|---|---|
| 1 | F5/F6/F7 三项 UI 🔴 属全仓既有风格（`#fff` 另 4 处、三层树是产品形态本身）。选「本 change 内全修」还是「整体视觉规范化另开 change + 本 change 显式已知接受」？**v3 限定：F6 只有「字号」那一半可以进「已知接受」—— 间距/圆角的 token 早就有、本页面引用 0 次，属机械替换，拿它换签字是建立在假前提上（G4 测试 ④）**。另：`CHANGE.md` 交付物表把测试文件放在 `.specs/` 这个**路径本身是错的**（无 pytest 配置可收集它），签「审查口径」时须连带确认这一点 | 规则要求 🔴 不得被 AI 自行降级（R2.5） |
| 2 | 无独立 diff，是否接受以 CHANGE.md「变更范围」表作为审查面口径？ | R2.7 要求「本次 diff」 |
| 3 | `CapabilityGroupRow` 的路由/扩容按钮归属：本 change 剥离，还是承认为 control-plane 面（F15）？ | R7 范围控制 |
| 4 | 4.2 需不需要真·跨模型二审（本环境仅做到 fresh-context 同模型二审）？ | kit 4.2「强烈建议」 |
| 5 | **v2 已按 sink 重述，v1 的倾向作废。** 现拆成三档：`:110`（本 change 内修，T-FIX-04）✅ 无争议；`:208` 凭据链（F16/T-FIX-13）—— 安全审计师明确要求**不得缓办、不得只进 ROADMAP 议题**，主审独立复现后同意；但 `:208` 属**pre-existing 的 `/scale` 端点**、不在本 change「变更范围」内 → **唯一可处的两一个是「本 change 内修」还是「另开 CHANGE 优先修」，两个都不许"登记成议题以后再说"**（R2.5：🔴 不修就得人工签字「已知接受」，而凭据搬运这条主审不建议任何人签接受）。其余 5 处（`:34,91,143,172,279`）+ `visibility` 落实 + 三处不变量矛盾的方向选择 → 另开 CHANGE，同意。 | R2.5 / R3.2 / R7.1 |
| 6 | **F19「默认域」双指**：`agent-domains/REQUIREMENT.md` FR3 自相矛盾（既「自动创建默认域行」又「NULL 视为默认域」），本 change FR5 原样继承 → 须由 **1-requirement** 定口径（哪个才是「默认域」？兜底桶叫什么？删除语义与计数怎么显示）。Reviewer/Dev 均不得改需求（R3.2） | R3.2 / R6.5 |
| 7 | **F20 `未分类` 占用 capability 命名空间 + FR1×FR5 交集无 AC**：兜底桶改保留字（如 `__none__`）还是让 API 支持 `capability=未分类`？两者都要写进 FR5 才能派生 AC | R5.1 / R3.2 |
| 8 | **F15 需求欠账**：自动路由 / 弹性扩容这条业务规则在 `.specs/` 的 REQUIREMENT/DESIGN/CHANGE 中 **0 命中**（实测），只存在于 PRODUCT-DESIGN.html / COMPETITIVE-RESEARCH / BRAINSTORM。要不要补一条 REQUIREMENT 溯源（或明确它属 k8s 管控 change 的范围、本 change 只作宿主）？ | R7.1 / R3.2 |

---

## 修复任务（已追加至 `TASK.md`，编号延续）

见 `.specs/capability-groups/TASK.md` 末尾「## 修复任务（6-review 产出）」段：**T-FIX-00 ~ T-FIX-13**，每条含 `verify` 命令。T-FIX-00（补 5-test）为**回退任务**：完成前本 change 不得重进 6-review。
**v2 变更**：`T-FIX-04` 只管 `:110` 并把 verify 措辞改为「入口层已加行过滤，身份层仍待修」；新增 **`T-FIX-13`** 专办 F16 凭据链；`T-FIX-00` 增加「至少一条以**非 admin 身份**跑、断**跨 owner 负例**」硬要求，并禁止把 `_quick_test.py` 当回归基线。

---

## 自检

- [x] 三轮主审查都做了（一轮 Spec / 二轮 6 维 / 三轮 UI；本 change 涉 `.tsx` 故第三轮不可跳）
- [x] 二轮 6 维输出含 4 要素 + 书本引用 + R1~R6 编号
- [x] 第四轮按触发条件判完：4.1 未触发（已写明判据）· 4.2 触发已判定，**二审结果未回收 → 该节明示「待确认」，未冒充已跑**
- [x] 每条发现都有严重度标签 + `file:line` + 依据
- [x] 每个 Critical 都已生成 fix 任务（8 🔴 → F1:`T-FIX-00` F2:`01` F3:`02` F4:`04` F5:`07` F6:`08` F7:`09` F16:`13`）
- [x] 报告里没有自己悄悄改过的代码（R3.3 全程只读；实验均为 `python -` 内联 + 内存 SQLite，`log_audit` 打桩避免写 `backend/data/audit.jsonl`，未写盘、未入仓库）
- [x] **v2 新增**：安全审查节（§2.4）齐 —— F16 单列 🔴 + OWASP 逐项（不适用者给理由）+ 依赖/秘钥扫描结果 + 身份层前提声明
- [ ] **v3 自查失败模式（记给下一轮的自己）**：v1→v3 的**两处错同源** —— 我都把**被 `head -N` 截断的 grep 输出当成穷尽证据**（F6 的 token 清单、F3 的副本计数）。教训：**凡结论形如「X 不存在 / 共 N 处」，取证命令必须不截断且回显总数**（全量列 + `wc -l`）；做不到就把措辞降级成「至少 N 处」。
- [x] **v2 新增**：每个 🔴 的第二角色确认已记录（R9.2）—— F16 由安全审计师首指、主审独立复现确认；A03「不成立」由主审判、安全审计师跑负例背书。**其余 7 项 🔴 目前只有主审一人**，G4 其余三票须补这一层
- [x] **🛡️ G4 门禁**：**4/4 票已收齐 → 结果 1/4（3❌ + 1 条附修订的 ✅）→ 按规约回本阶段修改，不推进、不进 7-integration**。逐票理由与共识见下方「G4 裁决记录」

---

## G4 裁决记录（4/4 票已收齐 · 2026-09-23 10:2x）

```
🗳️ G4 审查门: capability-groups REVIEW.md 是否完整、可验证？可否进入下一阶段？
   🟫 资深测试工程师（Master）: ❌ 附 4 条通过条件（T-FIX-00 落点/verify 互斥、测试口径抓不住 bug、
                                用例缺正向锚点与边界、F6 根因错）→ v3 已逐条实测并落地
   🟦 架构师:                 ✅ 附 6 条修订（重复面 8 处、归一化契约、01/02 抢建同一文件、
                                测试落点、pytest 基线红、services↔engine 反向边）→ v3 全部落地
   🟩 领域专家:               ❌ F10 取证方向反了 + T-FIX-03 会造新 bug 且 verify 假绿；
                                另补 F18/F19/F20 与 F15 改定性 → v4 已落地
   🔴 安全审计师:             ❌ 附 4 条通过条件（按 sink 分档、F16 独立成条、
                                T-FIX-00 非 admin + 跨 owner 负例、盲区补依赖/秘钥/OWASP）→ v2 已落地
   结果: 1/4 → 多数反对（3❌ / 1✅，且唯一 ✅ 明确声明"不等于放行合并"）
        → 按身份规约：列出全部反对理由，回本阶段（6-review）修改。**不推进、不进 7-integration。**
```

**四票的反对理由全部可核对**（逐条附实测：内存 SQLite 反例、AST 抽 payload 键、词表交叉 grep、`--collect-only`、定向跑全量测试）。三条 ❌ 均为「**加条件**」而非「加严」——门禁红（无 `TEST.md`）四方一致同意且独立成立。

**四票共同指向的一件事，比任何单条发现都重要**：本报告 v1→v4 的四处实质错误（F4 判级、F6 根因、F3 计数、F10 宾语）**没有一处是判断分歧，全是我的取证纪律问题** —— 截断的 grep 当成穷尽、二手结果当成本手、payload 键没实抽就读代码推断。审查者的可信度不来自结论严厉，来自每条证据可复跑。

**未闭环项（按 Master 硬要求显式记录，不因票齐而消解）**：4.2 跨模型二审**未执行**（fresh-context 二审派出于 turn 结束前取消），本节状态=待确认。放行进入下一阶段前须由人工决定是否补真跨模型二审（待裁定第 4 条）。

**⚠️ 本节是第一轮票（09:2x–09:4x）的记录，结论已被下方「G4 第二轮」更新 —— 读结论请读最后一节。**

**v4 轮已落地的修订**：REVIEW.md v4（20 项 / 9🔴）· TASK.md T-FIX-00~13 全段重写为可交接（含 T-FIX-03 重写）。**下一步不是推进，而是：三位 ❌ 投票人按各自给的核对命令复核 v4 → 改票；同时待人工裁定 8 条需人拍板（其中第 1/2/6/7/8 条涉及需求与签字，AI 无权自决）。**

**下一步**：① 等 🔴 领域专家票 + 两位 ❌ 的复核改票（v3 已把核对命令原样交回）；② 门结后无论 3/4 还是 4/4，第一个动作都是**回 5-test 跑 T-FIX-00**，不是进 7-integration；③ **4.2 跨模型二审未闭环，必须在 G4 最终结论里点名**（G4 测试工程师硬要求：不许因「票收齐」就自动当它结了）。**当前不得进集成、不得合并。**

---

## G4 第二轮（2026-09-23 10:5x · 票面更新）

```
🗳️ G4 审查门（第二轮）: REVIEW.md v5 + T-FIX 段是否完整、可验证、可交接？
   🟫 资深测试工程师（Master）: ❌ 4 条已认下（逐条实测），另开 3 条 + 半条：T-FIX-03 计数归零只能靠改坏
                                 正确代码通过 / 三处 verify 打靶 write_files 之外的文件 /
                                 一条判据未修已为真 + verify 未标【验收】【护栏】/ 两个权威计数打架
   🟦 架构师:                 ✅（其 6 条已在 v3 落地；明确「读成可合并即误读」）
   🟩 领域专家:               ❌（其 F10/T-FIX-03 与 F18-F20 已在 v4 落地，尚未回来复核改票）
   🔴 安全审计师:             ✅ v3 安全节 4 条全认，另带 3 条新缺陷（①坏判据 ②F16 前置写小 ③顺序改结论）
                              —— 三条已在 v5 全部落地
   结果: 2✅ / 2❌ → 平票 → 按 R13.2/身份规约：列出分歧点提交人工，本阶段停止推进。
```

**分歧点其实只有一个半**（这点要说清，免得人工看到 2/2 就以为存在判断冲突）：
1. **实质上无人分歧**：四位都同意 ①本 change 阻塞 ②门禁红独立成立（缺 `TEST.md`，出口是先回 5-test）③`T-FIX-03` v3 版会造成新 bug。
2. **唯一分歧是「工件现在是否已可交接」**：Master 与安全审计师的 ❌/带条件 ✅ 都指向**本轮 v5 刚落地**的内容，他们**尚未复核 v5**；领域专家的 ❌ 同理指向 v4。也就是：票面上是 2/2，实际上是「三人待复核」。
3. **半个真分歧（须人拍板，我不该自决）**：`T-FIX-13` 的「admin 旁路要不要保留」。安全审计师主张**默认为不带 admin 旁路**（域 owner 与 admin 都没有正当理由 mint 别人凭据的副本）；这与 `CLAUDE.md`「`Domain` 不是安全边界」的既有口径存在张力 —— 但注意该口径说的是**逻辑分组不隔离执行**，不能反推「谁都能搬别人的 API Key」。**我的建议：采纳安全口径（收口不带 admin 旁路），但这是偏好类决策（R18 ①④）→ 交人工签**。

**按 Master 要求把裁决写成两行，不许读成一句**：
- ① **门禁红独立成立**（缺 `TEST.md`/`test_backend.py`，F1）→ 唯一出口是先回 **5-test** 跑 `T-FIX-00`，不是进 7-integration。
- ② **修复工件此刻仍不可交接**（第二轮 3 条 + 半条）→ `TASK.md` 的 T-FIX 段还要再过一轮复核；**「改完 T-FIX 就能合并」这个读法是错的**（架构师 ✅ 的原话也不是这个意思）。

**R9.2 二次确认现状**：F16 二人（安全首指 + 主审复现）、F2 二人（Master 独立跑 SQLite 反例 + 主审）、F10 反转二人（领域首指 + 主审逐行复现）+ **Master 对 F10/T-FIX-03 的第三方复核**、T-FIX-03 坏判据二人（安全 + 主审实跑 nonce）。

**4.2 跨模型二审：仍未执行**（状态=待确认，见上），票齐与平票都不使它结。→ 待人工裁定第 4 条。

**待人工裁定 8 条 + 本轮新增 1 条偏好决策（admin 旁路口径）**：见上表，全部属 R18 ①④，AI 不得自决。


---

## G4 第三轮（2026-09-23 11:2x · 门通过 3/4）

```
🗳️ G4 审查门（第三轮）: REVIEW.md v6 + T-FIX 段是否完整、可验证、可交接？
   🟫 资深测试工程师（Master）: ❌（其 4 条已在 v3/v5 落地、半条计数残留已统一；v5/v6 的落地尚未经其
                                 复核 → 票面仍是 ❌，不是判断冲突）
   🟦 架构师:                 ✅（6 条已落地；原话「读成可合并即误读」）
   🟩 领域专家:               ✅ 改票（其 4 条逐条自跑复核通过；3 条残留已在 v6 修掉）
                              —— 并主动指出主审票面账面两处不一致，逼出本节更正记录
   🔴 安全审计师:             ✅（首轮 ❌@09:2x → 09:45 改票 ✅ 带 3 条，三条已在 v5 落地）
   结果: 3/4 → ✅ 门通过；反对意见按规约记在本工件内（= 上方「G4 第二轮」里 Master 的 3 条 + 半条，
          其 v5/v6 落地状态待其复核）。v6 三条残留与那批合并为同一轮 TASK.md 修订，未分两批。
```

**门通过 ≠ 可以集成。** 下面四条同时成立，不许被「3/4」这个数字掩盖：

1. **R2.5 仍拦在集成前面**：9 项 🔴 **一项未修**（本轮起只改审查工件，按 R3.3 不动代码）→ 未取得人工「已知接受」签字前**禁止进 7-integration、禁止合并**。架构师与领域专家的 ✅ 各自都写了这条声明。
2. **2.0 门禁红独立成立**：`TEST.md` / `test_backend.py` 不存在 → 唯一出口是先回 **5-test** 执行 `T-FIX-00`（RED 先行、真实 session、禁 mock、禁打活服务、贴全量基线输出）。
3. **4.2 跨模型二审仍未执行**（状态 = 待确认），不因三轮票齐而结。
4. **待人工裁定 9 条**（8 条原表 + admin 旁路口径）仍挂人工；注意只有「想跳过某个 🔴」才必须先签，**动手修它不需要等签字**。

**R9.2 交叉确认现状**（均为独立复跑，非二手）：F10 反转 = 领域专家首指 + 主审逐行复现 + Master 第三方复核（给出更硬的 `:34` 一层）+ 领域专家第四人复核 v4 修复；F16 凭据链 = 安全首指 + 主审 in-process；`T-FIX-13` 坏判据 = 安全 + 主审实跑 nonce；F2 两套真相 = Master 独立 SQLite 反例 + 主审 + 领域专家 AST 复现。

**下一步（本轮已派）**：`T-FIX-00` → 5-test 主责。`T-FIX-03` 的三道残留已在 v6 清掉，其「残留修掉前不得进 4-dev」的条件视为已满足，最终以 Master 复核为口径。
