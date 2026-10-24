# DESIGN: 小队写操作授权

- **Change ID**: v20-squad-authz
- **上游**: `CHANGE.md`（G1）· `REQUIREMENT.md`（需求门）
- **阶段**: 2-design（2026-10-24）· **非 UI → 不跑 2a**

## 0. 技术栈选定

不涉及选型。沿用 FastAPI + SQLAlchemy 2.0 + 既有服务层分层。零新增依赖。

## 0.5 既有架构对齐（brownfield）

### 0.5.1 触碰模块

| 模块 | 路径 | 方式 |
|---|---|---|
| 团队/小队服务 | `backend/services/team_service.py` | 新增异常类 + 判定函数（唯一真源） |
| 团队/小队路由 | `backend/routes/teams_api.py` | 5 处调用 + 错误映射 |
| 测试 | `backend/tests/test_teams.py`（或新增 `test_squad_authz.py`） | 追加用例 |

### 0.5.2 沿用抽象

| 需要什么 | 既有抽象 | 沿用做法 |
|---|---|---|
| admin 判定 | `team_service._is_admin(user)` | 直接复用（与 Team 侧同源） |
| 异常 → HTTP | `routes/teams_api.py::_map_error` | 追加一种异常映射，不改既有分支 |
| 团队授权的既有口径 | `_require_team_admin`（路由层 404/403） | **不改**；Squad 用服务层判定 + 403 |

### 0.5.3 沿用 vs 新模式

- **沿用**：服务层放业务口径、路由只做映射。
- **新增**：一个异常类型 `SquadForbidden`（不并入 `TeamError`，因为 `TeamError` 映射 400）。
- **不做**：不在路由里手写 `if user["id"] != squad.created_by`（避免与 Team 侧各长一套判定 → CLAUDE.md 约定"同一不变量两处独立校验"指**入口 + 中间件**，不是"复制业务规则"）。

## 1. 决策清单

| ID | 决策 | 备选 | 理由 |
|---|---|---|---|
| D1 | 判定放**服务层** `assert_can_manage_squad`，路由调用 | 路由内联 if | 一处真源；后续 CLI/定时任务调用同一函数 |
| D2 | 拒绝用 **403**（不是 404） | 404 隐藏存在性 | Squad 列表全员可见，隐藏无意义；404 反而让人以为队没了 |
| D3 | 不改模型、不加迁移（`created_by` 已存在） | 新增 owner 字段 | 设计口径就是 creator/admin 两人，加字段是过度设计 |
| D4 | 前端不改（错误已透传） | 前端隐藏按钮 | 遵守 D5「前端零授权判断」，避免两套逻辑漂移 |
| D5 | `created_by` 为空 → 只有平台管理员可写 | 回填 owner | 从严方向；backfill 属 v2 |
| D6 | 读不加限制 | 读也限 creator | 列表本来就是组织公开信息（主档 §2.11） |

## 2. 数据流

```
routes/teams_api.py  ──调用──▶  team_service.assert_can_manage_squad(db, squad, user)
        │                              │
        │                              ├─ True  → 继续业务
        │                              └─ False → raise SquadForbidden
        └─ _map_error: SquadForbidden → HTTPException(403, 文案)
```

## 3. 状态机

无新增状态机（管的是"能不能改"，不是状态迁移）。既有：小队 `active → archived` 不变。

## 4. ADR 索引

不新增项目级 ADR（change 级决策见 §1）。

## 5. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R1 | 历史小队 `created_by` 为空 → 只有管理员可改 | 接受（从严）；v2 可 backfill |
| R2 | 前端按钮仍可点 | 符合 D5；403 文案已可见 |
| R3 | 与 Team 的 404 口径不一致被误读为"漏了" | CHANGE/DESIGN 已写明是**有意差异** |

## 6. 不在范围

同 `CHANGE.md` 范围排除 1–4。

## 9. 架构沉淀建议

### 9.1 新增可复用抽象
- `assert_can_manage_squad`：与 `_require_team_admin` 并列，建议下一轮把两者收敛为统一的 `authz` 小模块（本 change 不做，避免动已发 Team 路径）。

### 9.2–9.5
- 无新增技术决策 / 契约 / 依赖 / 禁动清单变化。

## 🛡️ G2 方案门（自评轮）

```
🗳️ G2 方案门: DESIGN.md 是否通过？

   🟩 架构师(M): ✅ D1 服务层唯一真源、D2 403 的语义理由成立、D3 拒绝加字段（不过度设计）。
   🟫 研发负责人: ✅ 面小（2 文件 + 用例），风险 3 条都给了处置；不动前端符合既有约定。
   🟪 领域专家: ✅ 符合 §2.11「小队不是授权单位」——授权只看 creator/admin，不按小队成员授权。
   🔴 安全审计师: ✅ 403 文案不含内幕；读公开/写受限分离；空 created_by 从严。

   结果: 4/4 → 全票通过 ✅ 进入 3-task（跳 2a：非 UI）
```
