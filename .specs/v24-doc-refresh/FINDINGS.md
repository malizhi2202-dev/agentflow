# FINDINGS — 代码 ↔ product-design 一致性对账报告

- **对账基准**：代码 `51fd105d`（2026-10-25）· 设计 `PRODUCT-DESIGN.html` v20 → **v21/v22（本轮回填后）**
- **方法**：四路只读对账（数据模型 / API 端点 / 前端语义 / 文档自述）+ 质量门实测。**全程未改代码**（本轮只改文档）。
- **口径**：一条口径只活在一个地方 —— 现行 → `RULINGS.md`；设计 → 主档；界面 → `prototype/`；**代码实态 → `STATE.md`**。**不据文档反推代码已具备**。

---

## 〇、判定（一句话）

> **主因是「文档滞后于代码」，不是「代码写错了」。**
> 主档 v20 写定于 10-23，其 §1.6「代码实态」表停在 10-12 基线 `4ac819bf`；实测其上 **89 个提交**（32 触 `backend/`、18 触 `frontend/`）**一字未回填**。
> **次因是「设计与代码口径真有不一致」** —— 10 条（D1–D10），**挂账等裁定，不在本轮单方面改任何一边**。

**证据**：页族层面其实早已对齐 —— `proto_parity_check --strict` **exit 0**（127 页原型 / 35 族，独立页 31，**缺失 0 · 部分 0**），`tsc` 0 错，`vitest` 250/250，`build` ✓。所以用户感知到的「不一致」主要落在**文档叙述**与**深度字段口径**两处，不是「页面不存在」。

---

## 一、方向一：文档滞后于代码（已在本轮回填）

### 1.1 主档 §1.6「现状基线表」—— 八维全过期

| 维度 | 文档 v20 写法 | 实测 @ `51fd105d` | 处置 |
|---|---|---|---|
| 数据表 | 26 张（20 models 文件） | **59 张**（53 张注册进 `Base.metadata` + 6 张仅迁移建）· 32 个 models 模块 | 已改 |
| 协作层实体 | `work_items/inbox/team/squad/autopilot` **全 0 命中** | 全落表落路由 | 已改 |
| 调度与状态 | 队列/限流/退避 **三处进程内存** | 已落库（迁移 007/008）+ 租约心跳 + 选主 | 已改 |
| 后端规模 | 29 路由 · 20 model | **40** 路由模块 · **32** model 模块 · 49 测试文件 | 已改 |
| 前端 | 34 页 · **32 个 TS 错误** | **49** 页 · **tsc 0** · build ✓ · vitest 250 | 已改 |
| 运行时 | 4 适配器 · 发现未实现 | + 真执行通道 + 运行时注册表 + daemon 心跳 | 已改 |
| 迁移与质量门 | 3 条内联 ALTER · 无 CI | **0** 内联 · 账本 26 版 · **CI 已建** | 已改 |
| 身份与沙箱 | `X-User-Id` 自述 · 缺省 admin | 服务端会话 + argon2id + 三重 opt-in | 已改 |

> 标的声明原句「**此后 28 个提交全部只动 `.specs/` 与原型**」「设计已领先代码 6 轮 / 11 天」——⛔ 已过期。

### 1.2 主档各节状态芯片 —— 14 节「规划原型 · 未实现」实已落地

§2.12 决策模型 · §5.19 决策模型与微调工厂 · §6.19 阶段模型 · §6.20 看板 · §6.21 收件箱 · §6.22 执行回放 · §6.23 决策模型目录 · §6.24 微调工厂 · §6.25 环境参谋 · §6.26 执行隔离 · §6.27 对外集成 · §6.29 小队中心 · §6.30 自改进管道 · §6.31 自动化中心 —— **全部已接真后端**，本轮改为「已实施」并各附实测口径注。

### 1.3 主档 §3.3 —— 16 张表行逐张标四态

`已实施`（teams/team_members/squads/squad_members/automations 四表/rsi_switches/promotion_reviews/memories/orchestration_proposals/surface_manifests/users+audit）· `部分实施`（任务队列扩列、指派枚举）· `未实现`（probe_evidence/exec_ledgers/training_batches+batch_membership/im_bindings）· `口径差异`（7 张，见 §二）。

### 1.4 RULINGS.md —— 6 处状态列过期

| 条目 | 文档原写 | 实测 |
|---|---|---|
| 裁⑦ | 「`users.json` 表化**未做**」 | **已做**（迁移 018 + `backend/services/user_store.py` 导入器），文件态降为兜底 |
| 裁⑧ | 「波 0–5 已收口，**波 6 在途**」 | 波 0–7 **全收口** |
| R6-1 | 「定时作业**未做**」 | **已做**（`backend/services/l0_job.py` + `main.py` 接线，`L0_EXTRACT_INTERVAL_SECONDS=0` 默认关） |
| R6-3 | 「影子重放执行器**未做**」 | **已做**（`backend/services/shadow_runner.py`：`score_cases` + `run_shadow`） |
| R7-1 | 「冻结金标 + 异厂系 judge」标已实施 | 需降级说明 → **D10** |
| R9-1 | 「已实施（`v22-nav-groups`，**未提交**）」 | **已提交** `cd290f37` |
| 头部 | 「152 个 md」 | 实测 **309** |

**核对无误（保留原样）**：R0-1「4 语义锚未做」✅ 真未做（`stage_config.py` 无锚实现）· R5-5「模板次批未实施」✅ 真未做（`models/orchestration.py` 无 `team_id`）。

### 1.5 STATE.md —— 14 处陈旧，含 3 处**自相矛盾**

- 「默认管理员 `admin` / **`123456`（硬编码，属待修项）**」↔ 同文件别处记「出厂口令已废除 + 强制改密」——**矛盾**
- 「全仓后端回归 **354 用例 29F/12E** 为基线既有债」↔ 实测 **659 例 / 1 失败**——**矛盾**
- 「P0-5 `git rm --cached node_modules` **未做**」↔ 同文件第 128 行记「**已做**」——**矛盾**
- 另：活跃 Change 仍写 `v22-ui-align`（已被 ui-parity 取代）·「前序未提交」四条实际全已提交 ·「当前无未完成的写入任务」与实际相反 · 人工裁定段仍写「裁定⑧ 开发冻结**持续**」。

---

## 二、方向二：设计 ↔ 代码口径差异（**D1–D10 · 挂账待裁定**）

> 本轮**不改设计也不改代码**。单方面把设计改成代码的样子 = 裁撤设计，须留裁定记录。完整表见 `RULINGS.md` §五点五。

| # | 分歧 | 设计（主档） | 代码（实测） | 证据 |
|---|---|---|---|---|
| **D1** | **记忆表三处枚举** | §3.3：`layer` ∈ {L0,L1,L2,L3} + `domain` 内容域（与层级正交）+ `status` ∈ {active,revoked,stale-flagged}（**生命周期**） | `layer` ∈ {L1,L2,L3}；**内容域维度整条缺失**（用 `kind` ∈ {positive,negative} = 正/负知识，非内容域）；`status` ∈ {promoted,confounded,quarantined,no_entry}（**晋升状态**） | `backend/models/rsi.py:21,23-25,53,56-58` |
| **D2** | 记忆表列缺 | `content` / `confidence` / `quarantine_until`（静置期时间列）/ 来源链**真外键** | 三列缺；静置期靠 `status=quarantined`；来源链是裸串 `source_ref` | `backend/models/rsi.py:59-60` |
| **D3** | 可改面声明对象形态 | §3.3 / §6.30 E：`surface_manifest` **不是新表**，含 `path_pattern`/`cap_bytes`/`structure_rules`/`exclusions` | 实建表 `surface_manifests`，**只有** `name`/`allow_edit_json`/`owner_id` | `backend/models/rsi.py:139-161` |
| **D4** | 提案表名与维度取值 | `improvement_proposals`，`dimension` ∈ {INV,DOM}，列 `proposal_diff`/`probe_pack`/`seed`/`blind_rank`/`fell_back` | 表名 `orchestration_proposals`；维度 {invariant,domain}；五列缺（证据落 `probe_json` 单串） | `backend/models/rsi.py:94,36,107` |
| **D5** | **治理账三表全缺** | `probe_evidence` / `exec_ledgers` / `rule_versions` | 均无表（`rule_versions` 只有一个整数字段 `automations.spec_version`） | `backend/models/` 全量 59 表实测 |
| **D6** | 自动化触发型与投递账 | `automation_triggers.kind` ∈ {schedule,webhook,**api**}；`webhook_deliveries` **两键分开记账** | `kind` 只有两型（第三型被显式拒绝）；表名 `automation_deliveries` + 单一 `dedup_key`（两键用 `or` 合成） | `backend/models/automation.py:24,109` · `backend/services/automation_service.py:524,771` |
| **D7** | 小队归档 → 自动化级联 | §3.3：指向归档小队的自动化自动转 `disabled`（不静默删行） | `archive_squad` 只改 `squad.status`；`automations` 无 squad 外键可级联 | `backend/services/team_service.py:485-494` · `backend/models/automation.py:49` |
| **D8** | **运行时旧宇宙残留** | §6.28：LangGraph/LangChain/AutoGen/CrewAI **不再作为运行时表述** | `SUPPORTED_RUNTIMES` **仍列四者**；`POST /api/agents` 的 runtime **默认值仍是 `"langgraph"`** | `backend/models/agent.py:8-10` · `backend/routes/agents_api.py:58-60,114` |
| **D9** | 迁移回滚 | §1.6.0 波 0 判据：「迁移有版本表**可回滚**」 | `backend/migrations.py` 只有正向列表（幂等），**无 down/rollback** | `backend/migrations.py:780-806` |
| **D10** | 金标 / 异厂系 | §7 / R7-1：「冻结金标 + 异厂系 judge」 | **调用方传入布尔**，平台不校验、无金标表 | `backend/routes/rsi_api.py:212-213` → `backend/services/rsi_service.py:396-405` · `backend/services/judge_adapter.py:4` |

### 2.1 D1 为什么最要紧（单列）

设计要的是**两个正交维度**：

```
层级   layer   ∈ {L0 对话原文, L1 原子, L2 场景, L3 核心}
内容域 domain ∈ {semantic, procedural, preference, instruction, rule}   ← 与层级正交
生命周期 status ∈ {active, revoked, stale-flagged}                      ← 衰减重验不通过即 stale-flagged，不物理删
```

代码实现的是**一个维度**：

```
层级   layer   ∈ {L1, L2, L3}                                          ← L0 不入库
正负   kind    ∈ {positive, negative}                                  ← 不是内容域
晋升态 status ∈ {promoted, confounded, quarantined, no_entry}          ← 不是生命周期
```

后果：① **生命周期维度整个丢失**——衰减只有 `decay_score` 数值，**没有 `stale-flagged` 态可落**，「不物理删 + 标失效」的机制不存在；② 内容域不可查——无法按「语义型/流程型/偏好型」检索记忆；③ 静置期无时间列——`quarantine_until` 缺，只有 `status=quarantined` 布尔化。

---

## 三、方向三：文档**超前**于代码（已在本轮降级说明）

| 位置 | 原写法 | 处置 |
|---|---|---|
| §1.6.0 波 0 判据 | 「迁移有版本表**可回滚**」 | 降级为「有版本账本 + 幂等」，并注明 down 未实现 |
| §1.6.5 P1-1 | 「**统一** `audit.jsonl` 与 `audit_service` 两条写入路径」 | 改为「**已实施（表优先，文件兜底）**」——`backend/data/audit.jsonl` 仍被 git 跟踪且仍写一份 |
| R7-1 | 「冻结金标 + 异厂系 judge」标「已实施」 | 改「部分实施」+ 注明为调用方声明 |
| §3.3 `surface_manifest` | 「**不是新表**」 | 保留原文 + 注明「代码实建表 `surface_manifests`」 |

---

## 四、方向四：工程断点（**本轮只记录，未修**）

| # | 问题 | 证据 | 影响 |
|---|---|---|---|
| E-1 | **`scripts/ci.sh:8` 的 `PY` 默认指向已删除的 `/tmp/afvenv2`** | `ls /tmp/afvenv2` → No such file or directory | **本地门禁第一步就跑不起来**；GH Actions 正常（自装依赖）。`STATE.md` 与 20+ 份 `.specs/` 工件都写着这条失效路径 |
| E-2 | **`test_t07_user_store.py:120` 硬断言 `password_hash.startswith("$")`** | `backend/passwords.py` 的设计是 **argon2id 优先、缺库退 scrypt**（合规兜底） | 本机没装 `argon2-cffi` → 退 scrypt → 该例红。**把环境当成了代码不变量**；应改成「两种格式任一」 |
| E-3 | **6 张表未注册进 `Base.metadata`**：`agent_tools` · `automations` · `automation_triggers` · `automation_runs` · `automation_deliveries` · `runtime_registry` | 三个模块（`models/agent_tool.py` `models/automation.py` `models/runtime_registry.py`）**没在 `backend/models/__init__.py` 导入** | 真库靠迁移 024/025 建表不炸，但**凡用 `create_all` 建库的测试碰它们就是 "no such table"**——`test_automations_v2.py` 里那句「必须在 `Base.metadata.create_all` 之前导入」注释就是这个坑的化石。**修法：加 3 行 import**（幂等、便宜） |

---

## 五、核对通过的部分（不重复报）

- **页族覆盖**：127 页原型 / 35 族 ↔ 前端独立页 31 族，**缺失 0 · 部分 0**（`--strict` exit 0）
- **表名一致**（40+ 张）：agents / domains / work_items / work_item_runs / inbox_items / teams / team_members / squads / squad_members / automations 四表 / memories / promotion_reviews / rsi_switches / surface_manifests / sessions / pat_tokens / app_users / audit_log / trace_spans / metrics_raw / change_log / alerts / human_approvals / decision_models / finetune_batches / domain_attribution_policies …
- **五类资产归属两列**（`team_id` + `owner_kind`）：agents / workflows / tools / knowledge_sources / domains 全齐；**编排实例与模板次批未加** ✅ 与 §3.3 收口口径一致
- **归因双列** `originator ⟂ accountable`：`work_items` / `work_item_runs` 双列齐；域策略 fail-closed 已实现
- **身份链**：cookie > PAT > 401，无 admin 回退；`X-User-Id` 三重 opt-in
- **迁移纪律**：26 版版本账本幂等，新表无裸 `ALTER TABLE` 违规
- **任务两轴正交**：`status`（四类 + blocked）⟂ `triage_state`，`STATUS_CATEGORY` 含 `cancelled` ✅
- **决策模型两步绑定**：`BINDINGS` 三用途 / `HEALTH_STATES` 三态 / `GATE_VERDICTS` 与 §2.12 一致
