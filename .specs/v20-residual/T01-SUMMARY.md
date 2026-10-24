# SUMMARY: T01 — 域策略表 + resolve_accountable

- **Change ID**: v20-residual · T01 · 2026-10-24

## 做了什么

新表 `domain_attribution_policies`（迁移 016，一域一条）+ `get_policy/set_policy/resolve_accountable`。
`resolve_attribution` 新增 `domain_id`，accountable 缺省时按域策略解析：
无策略 → originator（现状）；`member` → 指定人；`team_owner` → 域所属 team 的 owner；
**有策略但不可解析（个人域/未知 kind/空 ref）→ AttributionError（fail-closed）**。
API：`GET/PUT /api/domains/{id}/attribution-policy`（PUT 限管理员或域 owner；越权与不存在 404）。

## verify

```text
$ unittest tests.test_domain_policy
Ran 11 tests — OK   # 7 服务层 + 4 路由层
```
