# TEST — v24-doc-refresh 验证记录

> **本 change 只改文档**，故「测试」= **文档结构校验 + 引用可达性 + 事实数字复核**。
> **未改任何代码**，故代码侧门禁（后端 unittest / 前端 vitest / build / E2E）**本轮不重跑**（下表列的是本轮开工前的实测基线，用于对照，不是本轮的通过证据）。

## 一、文档结构校验（本轮通过项）

```text
$ python3 -c "from lxml import html; html.fromstring(open(P,'rb').read())"
OK lxml

标签闭合计数（主档 PRODUCT-DESIGN.html）：
  OK tr    980  980
  OK td   3392  3392
  OK table 103  103
  OK h3    107  107
  OK p     543  543
  OK span 3277  3277
  OK div   725  725
重复 id：无
行数：4277（回填前 4262，净 +15）
```

**结论**：主档**可解析、标签无失衡、无重复 id**。

## 二、引用可达性

```text
$ 主档内 .specs/ 路径逐条检查
MISSING: .specs/k8s-final/TASK.md              ← 回填前既有（非本轮引入）
MISSING: .specs/platform-evolution/D-          ← 截断写法（非本轮引入）
MISSING: .specs/platform-evolution/D-S17..S20/RECON.md ← 区间写法（非本轮引入）

$ RULINGS.md 内 .specs/ 路径逐条检查
（无 MISSING）
```

**本轮新增引用**（`.specs/v24-doc-refresh/`）**全部可达**——该目录已落盘（CHANGE / TASK / FINDINGS / TEST / REVIEW 五件）。

## 三、事实数字复核（本轮写入文档的每个数字都实测过）

| 数字 | 写入位置 | 实测方式 | 结果 |
|---|---|---|---|
| 表 59 张（53+6） | 主档 §1.6 表 / §3.3 导语 | `Base.metadata.tables` 长度 = 53；再按 `__tablename__` 反查未注册模块 = 3 个（6 张表） | ✅ |
| 路由模块 40 | 主档 §1.6 表 | `ls backend/routes/*.py` 去 `__init__` = 40 | ✅ |
| models 模块 32 | 主档 §1.6 表 | `ls backend/models/*.py` 去 `__init__` = 32 | ✅ |
| 前端页 49 | 主档 §1.6 表 | `ls frontend/src/pages/*.tsx` = 49 | ✅ |
| 后端测试文件 49 | 主档 §1.6 表 | `ls backend/tests/test_*.py` = 49 | ✅ |
| 迁移 26 版（001–025） | 主档 §1.6 表 | `MIGRATIONS` 长度 = 26 | ✅ |
| 89 提交 / 32 backend / 18 frontend | 主档 §1.6 标的声明 · INDEX | `git rev-list --count 4ac819bf..HEAD` = 89 | ✅ |
| `node_modules` 跟踪数 0 | 主档 §1.6 P0-5 | `v20-release` 裁决 V3 已 `git rm --cached` | ✅ |
| `.specs/` md 309 个 | RULINGS 头部 | 实测 | ✅ |
| 4 语义锚未做 | RULINGS R0-1（**保留原样**） | `stage_config.py` 无锚实现 | ✅ 确认原口径正确 |
| 编排模板次批未做 | RULINGS R5-5（**保留原样**） | `models/orchestration.py` 无 `team_id` | ✅ 确认原口径正确 |
| 定时作业已做 | RULINGS R6-1（**改**） | `services/l0_job.py:17` + `main.py:248` | ✅ |
| 影子重放已做 | RULINGS R6-3（**改**） | `services/shadow_runner.py:20,37` | ✅ |
| 域级策略表已做 | RULINGS R8-2 | `models/attribution.py:18` | ✅ |
| `automation_triggers.kind` 两型 | D6 | `models/automation.py:24` | ✅ |
| `SUPPORTED_RUNTIMES` 仍含旧四者 + 默认 `"langgraph"` | D8 | `models/agent.py:8-10` + `routes/agents_api.py:58` | ✅ |
| 迁移无 down | D9 | `backend/migrations.py` 只有正向 `MIGRATIONS` 列表 | ✅ |
| 金标/异厂系为布尔 | D10 | `rsi_api.py:212` → `rsi_service.py:396`；`judge_adapter.py:4` | ✅ |
| 6 张表未注册 | E-3 | 逐模块反查 `__tablename__` vs `Base.metadata.tables` | ✅ |

## 四、代码侧门禁（**本轮开工前实测基线 · 非本轮通过证据**）

```text
$ python3 scripts/proto_parity_check.py --strict
原型：127 页 / 35 页族；导航 34 项
独立页 31 · 部分 0 · 缺失 0 · 元页 4          exit 0

$ cd frontend && npx tsc --noEmit
0 错

$ cd frontend && npx vitest run
Test Files 25 passed (25) · Tests 250 passed (250)

$ cd frontend && npm run build
✓ built in 19.13s

$ cd backend && python3 -m unittest discover -s tests
Ran 659 tests in 216.179s
FAILED (failures=1, skipped=6)
  FAIL: test_t07_user_store.TestUserStore.test_import_apply_roundtrips_all_fields
```

**那 1 条失败已定性为环境漂移**（E-2）：`argon2-cffi` 未装 → `backend/passwords.py` 按设计退 scrypt → 断言硬要求 `$` 前缀。**非产品缺陷**，但**测试脆性**（把环境当成不变量）。**修法记入 `STATE.md`「下一步」第 1 条，本轮不改。**

## 五、本轮**没有**跑的（并说明为什么）

| 项 | 为何不跑 |
|---|---|
| 后端 unittest 全量 | **本轮零代码改动**，上一行已给出基线；重跑不产生新证据（且 3.6 分钟） |
| E2E（`scripts/e2e/run_e2e.sh`） | 同上；且需 MySQL + dev server |
| `scripts/ci.sh` | **该脚本当前跑不起来**（E-1：`PY` 指向已删除的 `/tmp/afvenv2`）——这本身是本轮的一条发现 |

## 五之二、代码批最终门禁（第二批收口数 · 2026-10-25）

```text
$ cd backend && python3 -m unittest discover -s tests
Ran 733 tests in 218.280s
OK (skipped=6)                    ← 开工前 659/1 红 → 现 0 失败（新增 74 例：
                                    dimensions 17 · proposals 7 · governance_ledgers 24 ·
                                    golden_sets 12 · runtime_and_rollback 11 + MF-03 订正）

$ cd frontend && npx tsc --noEmit && npx vitest run && npm run build
0 错 · Test Files 25 passed · Tests 250 passed · ✓ built in 19.93s

$ python3 scripts/proto_parity_check.py --strict
exit 0（127 页 / 35 族 · 缺失 0 · 部分 0）
```

§四 所列 659/1 为**开工前基线**（保留作对照）；本表为**收口值**。

## 五之三 · 真 MySQL 迁移重放收口（2026-10-25 · 首跑失败 → 修复 → 重放收敛）

第一笔提交入库后，真 MySQL（裁定⑦权威档）首跑 026–031 **失败**，暴露三件 SQLite 掩盖的问题（教训 `LESSONS.md` L-014）：

1. **inline `REFERENCES` 被 MySQL 静默忽略**——`ADD COLUMN … REFERENCES` 只建列不建约束（查 `information_schema.table_constraints` 实锤 memories 表级 FK = 0，「真外键」仅名义）。修：MySQL 分支改显式表级 `ADD CONSTRAINT`（`add_fk_if_missing` 幂等助手）。
2. **ORM 非 Optional `Mapped[X]` 在 MySQL 落 NOT NULL，而 `default=` 是客户端默认**——027 裸 SQL `INSERT…SELECT` 搬旧行撞 1364。首跑抓 `proposal_diff`/`probe_pack`（TEXT 还不能带 DEFAULT），逐列修后**二跑又抓 `fell_back`（INTEGER）**——遂放弃逐列点修，改**族级**：搬行前枚举「新表有、旧表无、NOT NULL 且无库级默认」的全部列，一律放可空（ORM 写入恒给值；旧行得 NULL，读取侧 `bool(None)=False` / `json.loads(None or "[]")` 已容）。
3. **MySQL DDL 自动提交而账本行不入库**——迁移中途上抛时列变更已物理生效、账本却停在 025，新旧两表并存。修：不补账不跳账，靠**每步存在性预检的幂等重放**收敛。

**重放结果**（`init_db()` · 凭据经 env 文件流入进程）：`已应用 5 个迁移: 027…031`（026 首跑已物理落列、重放幂等 skip 入账）。

**验收（真库实测 · 2026-10-25 12:2x）**：

| 检查项 | 结果 |
|---|---|
| 账本 | `pending = []` · applied 至 `031_rsi_switch_reason` |
| 027 搬行 | `improvement_proposals` **12 行 · ids 1–12**（带 id 保引用：`probe_evidence.proposal_id` 不破） |
| 旧表 | `orchestration_proposals` 已不存在 |
| 026 真外键 | memories 表级 FK ×2：`fk_memories_source_run` / `fk_memories_source_conversation` |
| D4 列形态 | `proposal_diff`/`probe_pack`(text) · `seed`/`blind_rank`/`fell_back`(int) 全部 `IS_NULLABLE=YES` |
| 028–031 | `probe_evidence` / `exec_ledgers` / `rule_versions` / `golden_sets` 均存在；`rsi_switches` 有 `last_reason`/`last_actor` |
| 旧行抽样 | `id=1 · title='MySQL 提案 094746' · fell_back=NULL · domain_signoff_json='[]'`（NULL 容纳自洽） |

**修复后回归**：定向六件 **72 OK**（SQLite 路径不受族级分支影响——该分支 `not _is_sqlite` 门内）· 全库重跑 **Ran 733 · OK (skipped=6)**（与 §五之二 收口值一致）。

**边界（如实）**：`rollback_to()` roundtrip **未在真 MySQL 执行**——down 迁移未经生产验证前不碰生产数据；026 down 的摘约束逻辑由 SQLite 单测 + 代码评审覆盖。旧行 `fell_back=NULL` 不回填（NULL≡False 为既定读取侧容纳，回填即伪造数据）。

## 六、验收判据（自评）

| 判据 | 结果 |
|---|---|
| 主档 HTML 可解析、标签无失衡、无重复 id | ✅ |
| 本轮新增的 `.specs/` 引用全部可达 | ✅ |
| 文档中每个数字都有实测来源（见 §三） | ✅ |
| 设计与代码的分歧**一律挂账**，未单方面改任何一边 | ✅（D1–D10 进 `RULINGS.md` §五点五） |
| 历史正文未删，被推翻处保留 + ⛔ + 指针 | ✅ |
| 代码零改动（**第一批**） | ✅（`git diff --stat` 仅 4 个文档文件） |
| 第二批（代码批）门禁全绿 | ✅ 见 §五之二；改动收口于 026–031 迁移 + 37 文件 + 6 新文件 |
| `STATE.md` / `TOPICS.md` / `ROADMAP.md` 由 leader 独占写 | ✅（本轮只写 `STATE.md`，未动另两份） |
