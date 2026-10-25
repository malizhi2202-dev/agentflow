# 裁定记录 — D1–D10（2026-10-25 · 用户「都做」授权本批一次性实施）

> **裁定原则**：设计档是产品权威（CLAUDE.md：「产品应该是什么样 → 看设计档」）。
> 默认方向 = **改代码对齐设计**；**仅当代码做法明显更自洽、且设计该句已陈旧**时才反过来（此时按纪律「推翻 = 加 ⛔ 标记 + 指针，不删原文」）。
> 每条含：裁定 / 理由 / 实施落点 / 迁移号。

| # | 裁定 | 理由 | 实施落点 |
|---|---|---|---|
| **D1** | **设计拆列 + 代码补齐**：`memories` 拆成**两个正交维度**——`status` 承载**生命周期**（active/revoked/stale-flagged，设计原口径），新增 `promotion_status` 承载**晋升状态**（promoted/confounded/quarantined/no_entry，代码现状）；新增 `domain` **内容域**列（五值，与层级正交）；`layer` 值域**订正为 {L1,L2,L3}** | 设计把两个维度写进一列是**设计侧缺陷**（不是代码错），但「内容域维度缺失」是**代码漏做**——两头都要动。`layer` 保留 L1–L3：L0 原文的权威表是 `conversations`/`messages`，复制进 `memories` 会造第二个真源 | 迁移 026 · `models/rsi.py` · `services/rsi_service.py` · 设计 §3.3 该行改口径（记 ⛔ + 指针） |
| **D2** | **改代码对齐设计**：补 `content` / `confidence` / `quarantine_until`（静置期时间列）/ 来源链**真外键** | 设计这四条都成文且是机制前提（静置期、沿链成批撤回）；代码缺失属未做 | 迁移 026（同批） |
| **D3** | **改代码对齐设计**（表保留）+ **设计口径订正**：设计称 `surface_manifest`「不是新表」，代码已建 `surface_manifests`——**表留着比拆掉更省**；但设计要的四个结构字段必须补上 | 「不是新表」的原意是「与 `rsi_switches` 同区、不另起独立子结构」，代码用表实现不算违背；**字段缺失才是真缺口** | 迁移 026 · `models/rsi.py` |
| **D4** | **表名改代码对齐设计**（`orchestration_proposals` → `improvement_proposals`）；**维度取值保留代码的可读写法**（`invariant`/`domain`）并在设计注明等价于 `INV`/`DOM`；补 `proposal_diff`/`probe_pack`/`seed`/`blind_rank`/`fell_back` 五列 | 表名是**引用面最广**的漂移（一条口径只活在一个地方），必须统一；取值 `{INV,DOM}` vs `{invariant,domain}` 语义等价、可读性代码更好，**不值得为字面改数据** | 迁移 027（重命名 + 加列） |
| **D5** | **改代码对齐设计**：建 `probe_evidence` / `exec_ledgers` / `rule_versions` 三表并打通写入路径 | 设计三表是两拍评估、塌缩熔断预算账、版本 diff 只读界面的**唯一落点**，缺了这些「自动体已暂停」之外的所有治理留痕都不成立 | 迁移 028 · `models/rsi.py` + `models/automation.py` · `services/rsi_service.py` · `services/automation_service.py` |
| **D6** | **改代码对齐设计**：`automation_triggers.kind` 加 `api` 型；投递账**两键分开记账**（`idem_key` + `delivery_key` 两列，不用 `or` 合成） | 设计明写「收口成本限定在 `kind` 枚举一处」；两键分开是幂等正确性（GitHub 与通用 Idempotency-Key 语义不同） | 迁移 029 · `models/automation.py` · `services/automation_service.py` |
| **D7** | **改代码对齐设计**：`automations` 加小队引用列 + 小队归档时**级联把指向它的自动化转 `disabled`**（不静默删行） | 设计成文且有明确语义（归档≠取消在跑，但自动化规则不该继续触发） | 迁移 029（同批） · `services/team_service.py` |
| **D8** | **改代码对齐设计**：`SUPPORTED_RUNTIMES` **清掉** langchain/langgraph/autogen/crewai；`POST /api/agents` 的 `runtime` **改必填**（缺则 400 并给可选值），不再默认 `"langgraph"` | §6.28 明写四者「不再作为运行时表述」；创建表单已不收凭据却仍默认旧运行时，是**实打实的旧宇宙残留** | `models/agent.py` · `routes/agents_api.py`（**无迁移**） |
| **D9** | **改代码对齐设计**：给 `backend/migrations.py` 的每个迁移补 `down`（回滚）实现 + `rollback_to(version)` 入口 | 波 0 判据明写「可回滚」；账本只有正向 = 判据不成立。**这是设计已承诺的工程能力**，属欠账 | `backend/migrations.py`（**无新迁移号**，改的是迁移机制本身） |
| **D10** | **改代码对齐设计**：新增 `golden_sets` 表（金标集 + 冻结版本 + 异厂系 judge 厂商记录），影子重放入参的「冻结金标 / 异厂系」**由平台按金标集实体校验**，不再只是调用方传布尔 | R7-1 把「冻结金标 + 异厂系 judge」列为现行口径且标「已实施」；现状是**平台不校验**，等于门禁可被绕过 | 迁移 030 · `models/rsi.py` · `services/rsi_service.py` · `services/judge_adapter.py` |

## 附带（工程断点，与裁定同批修）

| # | 裁定 | 落点 |
|---|---|---|
| **E-1** | `scripts/ci.sh` 的 `PY` 兜底到 `python3`（不再指向已删除的 `/tmp/afvenv2`）；`STATE.md` 与工件里的失效路径一并订正 | `scripts/ci.sh` · `STATE.md` |
| **E-2** | `test_t07` 的断言改成「argon2id 或 scrypt **任一**格式」——**不把环境当代码不变量** | `backend/tests/test_t07_user_store.py` |
| **E-3** | `models/agent_tool.py` / `models/automation.py` / `models/runtime_registry.py` **注册进 `Base.metadata`**（加 3 行 import） | `backend/models/__init__.py` |

## 执行顺序（迁移号即串行顺序）

| 批 | 内容 | 迁移号 | 备注 |
|---|---|---|---|
| **P0** | E-1 / E-2 / E-3（不动 schema） | — | 先修，让本地门禁能跑 |
| **P1** | D1 + D2 + D3（`memories` / `surface_manifests` 加列） | **026** | |
| **P2** | D4（表重命名 + 五列） | **027** | |
| **P3** | D5（三张治理账表 + 写入路径） | **028** | |
| **P4** | D6 + D7（自动化 kind/两键/小队级联） | **029** | |
| **P5** | D10（金标集实体 + 平台侧校验） | **030** | |
| **P6** | D8（运行时旧宇宙，无迁移）+ D9（迁移回滚机制） | — | |
| **P7** | 设计口径回写（主档 §3.3 各行 + RULINGS §五点五 结案） | — | 代码落地后才改设计口径，避免文档再次超前 |
