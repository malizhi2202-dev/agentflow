# REQUIREMENT: 后端遗留三项收口

- **Change ID**: v20-residual · 上游 `CHANGE.md`（G1 4/4）

## 用户故事

1. 作为平台管理员，我要给某个域指定"这次算谁的责任/成本"，而不是永远只记发起人。
2. 作为提案人，我要把金标用例跑一遍得到 pass_rate，而不是手抄一个数字。
3. 作为管理员，我要从一段对话里抽原子记忆，且默认不花模型钱。

## AC

| AC | 判据 |
|---|---|
| AC-1 | `GET /api/domains/{id}/attribution-policy` 返回策略或 `{policy: null}`（无策略=现状）；非成员 404 |
| AC-2 | `PUT` 仅管理员/域 owner；`accountable_kind ∈ member\|team_owner\|originator`；`member` 必须带非空 `accountable_ref`，否则 400 |
| AC-3 | `resolve_attribution(domain_id=...)`：无策略 → originator；`member` → ref；`team_owner` → 域 `team_id` 对应 team 的 `owner_user_id`；域无 team → **AttributionError（fail-closed）**；策略行非法 → 同样拒绝 |
| AC-4 | `POST /api/rsi/proposals/{id}/shadow/run` 用 `cases[{expected,actual}]` 算 pass_rate（确定性）；`baseline` 由入参给；走既有 `record_shadow`（金标冻结/异厂/噪声地板） |
| AC-5 | runner 缺 `golden_set_frozen` 或 `cross_vendor` → 409（沿用后端口径）；低于 NOISE FLOOR → `collapsed`；达标 → `awaiting_approval` |
| AC-6 | runner 响应标明 `judge_kind='exact_match'` 与 `dry_run` 标志，**不冒充异厂 judge** |
| AC-7 | `POST /api/rsi/l0/extract` 默认 `dry_run=true`：不写记忆、返回 `candidates=0` 与说明 |
| AC-8 | 注入 extractor（服务层）且三字段齐 → 经 `propose_memory` 落 L1，`source_ref=conversation:<id>`；缺字段 → `no_entry` 留档 |
| AC-9 | 非会话 owner 调 L0 → 404（越权与不存在统一） |
| AC-10 | 迁移 016 幂等；全量回归 0 新增红 |

## 范围切分
v1 = AC-1…AC-10。v2 = 域策略界面、L0 定时作业、真实 judge 适配器。out = 自动批准发布。

## NFR
安全：PUT 管理员门；L0 越权 404；默认不调外部模型。可观测：三项响应都带 `dry_run`/`judge_kind` 等自证字段。

## 依赖与假设
- 依赖 `attribution.py`（波 7）、`rsi_service.record_shadow/propose_memory`（波 6/7）。
- 假设：`domains.team_id` 可能为空（个人域）→ `team_owner` 策略此时 fail-closed。

## 🛡️ 需求门（自评轮）
🟫 ✅ · 🟦 ✅（默认保守）· 🟩 ✅ · 🔴 ✅（管理员门/404/不调外部）
结果 4/4 → 2-design
