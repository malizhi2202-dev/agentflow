# CHANGE · v20-wave6 —— 波 6 RSI 产物治理（R6/R7）

> 来源：`PRODUCT-DESIGN.html` v20 §1.6.0 波 6 + §6.30（A-E）+ `RULINGS.md` R6-1..4 / R7-1..6
> 路由：**压缩路径**（0→3→4→6）。
> 前置：波 3 协作层（任务/收件箱）、波 5 声明式账本（change_log）。

## 一句话

设计层的 RSI 结论（记忆四层唯一管道 / 提案制三权分离 / 可改面声明对象 / 四熔断）此前一行代码没有。
**本波把「门禁」落在状态转换层**：晋升缺字段不进正式层、Probe 永远不能发布、
影子重放要求冻结金标与异厂 judge、`scripts/plugins/hooks` 永久禁改、代码层 RSI 直接拒绝。

## 验收

| AC | 判据 |
|---|---|
| AC-6.1 | 记忆四层 `L1/L2/L3`（L0 原文不在此表）+ `kind ∈ positive\|negative`（负知识合法）+ 检疫/衰减状态 |
| AC-6.2 | **晋升三字段缺一 → `no_entry`**：`cue / lesson / evidence` 任一为空即 `stored=false`，行留档但不在正式层 |
| AC-6.3 | `confounded` 为拿不准的**默认**；只有显式「有把握 + 强证据」才 `promoted` |
| AC-6.4 | 来源链撤回：按 `source_ref` 批量进 `quarantined`；检疫记忆不进衰减队列 |
| AC-6.5 | 生成侧限额：`budget_steps ∈ 1..50`、`budget_tokens ∈ 1..200000`；创建即校验可改面 |
| AC-6.6 | **Probe 永不作发布依据**：`generated/probed` 状态直接 publish → 409 |
| AC-6.7 | 探针超步/超钱 → 提案 `blocked` 且对应熔断 `open` |
| AC-6.8 | 影子重放要求**金标冻结 + 异厂 judge**，缺一即 409；通过后状态 `awaiting_approval` |
| AC-6.9 | 提升低于 `NOISE_FLOOR=0.01` → 提案 `collapsed` + 塌缩熔断 `open`（噪声不算改进） |
| AC-6.10 | 发布必须**人类管理员**（非 admin → 409），并记录 `approved_by/approved_at` |
| AC-6.11 | INV⟂DOM 双维：`dimension=domain` 需域成员会签，无会签 publish → 409；`invariant` 不需要 |
| AC-6.12 | 可改面：`scripts/` `plugins/` `hooks/` **永久禁改**（先于任何检查） |
| AC-6.13 | **代码层 RSI 禁止**：`backend/`、`frontend/src/` 目标一律拒绝（R6-4） |
| AC-6.14 | 路径穿越（含 `..`）拒绝；不在白名单拒绝；未知 surface 拒绝 |
| AC-6.15 | 四熔断齐备（budget/steps/collapse/error_rate）；任一 `open` → 拒绝新建提案；人工复位进 `half_open` |

## 触碰模块

- 新 `backend/models/rsi.py`：`Memory` / `Proposal` / `SurfaceManifest` / `BreakerState` + 常量事实源（层级、维度、状态、永久禁改前缀）。
- 新 `backend/services/rsi_service.py`：晋升门、检疫、衰减、可改面判定、提案状态机、熔断。
- 新 `backend/routes/rsi_api.py`：记忆 / 提案 / 可改面 / 熔断；publish 与熔断操作限管理员。
- 迁移 013：四表 + 索引。
- 新 `backend/tests/test_rsi.py`（18 条）。
- `README.md`：RSI 治理一节。

## 明确不做（记账）

- 金标数据集本体、judge 模型调用、影子重放的执行器：本波只做**治理契约与门禁**（数据从调用方传入）。
- 模型权重类 RSI（S19）：无训练面，仅保留治理位。
- 前端「记忆中心 / 提案抽屉」：按 §1.6.5 ⑨ 先表与校验，再上界面。
