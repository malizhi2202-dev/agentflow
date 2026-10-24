# DESIGN: 后端遗留三项收口

- **Change ID**: v20-residual · 上游 `REQUIREMENT.md`（需求门 4/4）· 后端（跳过 2a）

## 0. 技术栈
不涉及选型；沿用 FastAPI + SQLAlchemy + 既有服务层分层；零新增依赖。

## 0.5 架构对齐
| 触碰 | 方式 |
|---|---|
| `models/attribution.py`(新) | 新表 ORM |
| `services/attribution.py` | 加 `resolve_accountable` + 单点 fail-closed |
| `services/shadow_runner.py`(新) | 纯函数打分 + 调用既有 `record_shadow` |
| `services/l0_extractor.py`(新) | 可注入 extractor + 调既有 `propose_memory` |
| `routes/domain_api.py` / `routes/rsi_api.py` | 加端点（薄映射） |
| `migrations.py` 016 | 一张表 + 索引 |

沿用：服务层判定（不写路由里）、`rsi_service` 的晋升门/影子门（不复制规则）、`AttributionError` 现有语义。
新模式：无。

## 1. 决策
| ID | 决策 | 理由 |
|---|---|---|
| D1 | 域策略存**独立表**（不塞 domains 列） | 一个域一条策略、可审计 `updated_by`；domains 4 字段壳不动 |
| D2 | 无策略 = 回退 originator（现状）；**有策略但不可解析 = 拒绝** | 缺省不改变现有行为；一旦声明就必须能解析（fail-closed 的正确含义） |
| D3 | `team_owner` 在个人域（`team_id` 空）→ 拒绝 | 不猜、不回落 |
| D4 | runner 打分用**确定性精确比对**，并标 `judge_kind=exact_match` | 不冒充异厂 judge（那是真实模型调用，本 change 不做） |
| D5 | L0 默认 `dry_run`；注入 extractor 才写 | 不花模型钱、不产生无依据记忆 |
| D6 | PUT 策略 = 管理员或域 owner | 与既有域权限一致 |

## 2. 数据流
```
PUT /api/domains/{id}/attribution-policy → attribution.set_policy（校验 kind/ref）
任务创建 → resolve_attribution(domain_id) → resolve_accountable → 双列
POST /proposals/{id}/shadow/run → shadow_runner.run_shadow → rsi_service.record_shadow（原门禁不变）
POST /rsi/l0/extract → l0_extractor.extract（默认 dry_run）→ rsi_service.propose_memory（三字段门）
```

## 3. 状态机
无新增；影子/提案状态仍由 `rsi_service` 决定。

## 4/5/6
ADR 无新增；风险见 CHANGE；不在范围见 CHANGE。

## 9. 沉淀
9.1 三个服务都可注入（extractor/judge）→ 建议将来统一成 `adapters` 概念（本 change 不做）。

## 🛡️ G2（自评轮）
🟩 ✅（D1-D6 边界清楚；复用既有门禁不复制规则）· 🟫 ✅（3 文件 + 1 表 + 薄路由）· 🟪 ✅（域策略语义、影子门、记忆门均未改）· 🔴 ✅（PUT 管理员门；默认 dry_run；fail-closed）
结果 4/4 → 3-task
