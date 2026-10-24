# CHANGE: 后端遗留三项收口（域策略 / 影子重放 runner / L0 抽取）

- **Change ID**: v20-residual · 阶段 0-change（2026-10-24）· 后端（非 UI → 跳 2a）
- **规模**: medium（3 个能力 + 迁移 016 + 3 组用例）

## Why

`STATE.md` 下一步 ②③④ 与 `RULINGS.md` R8-2 的剩余口径一直挂在账上，都是"后端只有一半"：

1. **域策略**：R8-2 要求"域策略 fail-closed"，现状只有"读不出即拒"，**没有任何策略存储** → 域的 accountable 无法表达。
2. **影子重放 runner**：`v20-ui-rsi` 只能**录**影子结果；没有把"金标用例 → pass_rate → record_shadow"跑一遍的入口，探针/影子仍是纯人工填数。
3. **L0 抽取**：记忆四层里 L0（对话原文）没有原子抽取入口，L1 只能手写。

## What

1. 新表 `domain_attribution_policies`（迁移 016）+ `resolve_accountable`：域策略三选一（`member` / `team_owner` / `originator`），策略缺失 = 现状（回退 originator），**策略存在但读不出/非法 → fail-closed 拒绝**；API `GET/PUT /api/domains/{id}/attribution-policy`（PUT 仅管理员）。
2. 新 `services/shadow_runner.py` + `POST /api/rsi/proposals/{id}/shadow/run`：用金标用例（`{expected, actual}`）做**确定性比对**得 pass_rate，再走既有 `record_shadow`（金标冻结 / 异厂 judge / NOISE FLOOR 全部沿用）；`dry_run=true` 时不调用外部模型（默认）。
3. 新 `services/l0_extractor.py` + `POST /api/rsi/l0/extract`：读会话最近 N 条消息，交给**可注入** extractor；默认 `dry_run`（不调模型、返回 candidates=0）；命中则按三字段门写入记忆（`source_ref=conversation:<id>`）。

## 影响面

后端：`models/attribution.py`(新) · `services/{attribution,shadow_runner,l0_extractor}.py` · `routes/{domain_api,rsi_api}.py` · `migrations.py`(016) · `models/__init__.py` · 测试 3 个文件。
前端：不改（三项都是"有 API 才能做界面"的前置）。数据：迁移 016 一张表。架构：0.4 未命中（既有模块内补能力）。

## 范围排除

- 不接真实 LLM judge（无凭据/无预算裁定）→ `dry_run` 默认；真实 judge 走可注入接口。
- 不做 L0 定时作业（先手动触发；调度另立 change）。
- 不做域策略的界面（下一步）。
- 不改 Team/Squad 既有授权口径。

## 验收线

| # | 判据 |
|---|---|
| 1 | 域策略：无策略 → accountable=originator；`member` → 指定人；`team_owner` → 域所属 team 的 owner；策略非法/指向空 → **拒绝（fail-closed）** |
| 2 | runner：pass_rate 由用例确定性算出；低于 NOISE FLOOR → proposal `collapsed`；达标 → `awaiting_approval`；缺金标/异厂 → 409 |
| 3 | L0：默认 dry_run 不写记忆；注入 extractor 且三字段齐 → 写 L1 记忆并留 `source_ref`；缺字段 → `no_entry` |
| 4 | 全量回归与基线同红（0 新增红）；迁移 016 幂等 |

## 风险

| # | 风险 | 缓解 |
|---|---|---|
| R1 | `team_owner` 策略在域无 team 时不可解析 | fail-closed（明确报错，不猜） |
| R2 | runner 的确定性比对被误当"质量结论" | 响应标明 `judge_kind: exact_match (dry_run)`；仍要人批复发布 |
| R3 | L0 抽取可能写入低质记忆 | 默认 dry_run + 三字段门 + confounded 默认 |

## 🛡️ G1（自评轮）

🟫 ✅ 三项都是账面遗留、范围清晰 · 🟦 ✅ 都默认保守（dry_run/fail-closed）· 🟩 ✅ 不新增契约形状（只加端点）· 🔴 ✅ 默认不调外部模型、策略不猜
结果 4/4 → 进入 1-requirement
