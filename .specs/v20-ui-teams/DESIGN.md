# DESIGN: 团队与小隊页

- **Change ID**: v20-ui-teams
- **上游**: `CHANGE.md`（G1 4/4）· `REQUIREMENT.md`（需求门 4/4）
- **阶段**: 2-design（2026-10-24）

## 0. 技术栈选定

**本次不重选栈**：项目级技术栈已锁定（React 18 + TypeScript 5.5 + Vite 5.4 + Zustand，内联样式 + `tokens.css` CSS 变量）。按 `reference/tech-stacks.md`「适用矩阵」（line 431-447）本项目属「AI / 数据 / 中后台」行，既有选型已落在该行推荐集合内（5️⃣ 系），无迁移理由。

- 查询动作：`grep -n "适用矩阵" reference/tech-stacks.md` → line 431；只读该节 14 行（未整读 522 行）。
- 新增依赖：**0**（图标沿用 `lucide-react`，状态沿用 `zustand`，请求沿用 `requestDedup`）。

## 0.5 既有架构对齐（brownfield）

### 0.5.1 本次 change 触碰的既有模块

| 模块 | 路径 | 触碰方式 |
|---|---|---|
| 应用壳 / 路由 | `frontend/src/App.tsx` | 加 NAV 项、View 两值（teams 单页含双 tab）、渲染分支、初始路径 |
| 状态层 | `frontend/src/stores/*.ts` | **新增** `teams.ts`（与 `collab.ts` 同构） |
| 页面层 | `frontend/src/pages/*.tsx` | **新增** `Teams.tsx` |
| 请求层 | `frontend/src/utils/requestDedup.ts` | 只调用（`safeFetch` 读 / `dedupedFetch` 写 + `invalidateCache`），**不改** |
| 后端 | `backend/routes/teams_api.py` 等 | **只读契约，不改代码** |

### 0.5.2 既有抽象沿用对照表

| 需要什么 | 既有抽象 | 沿用做法 |
|---|---|---|
| 服务端数据 → 页面状态 | `zustand` store（`stores/collab.ts`） | 同构新建 `stores/teams.ts`：列表 + 详情 + 动作 + 错误字段 |
| 读请求 | `safeFetch`（5s 缓存 + in-flight 去重） | 列表/详情一律走它 |
| 写请求 + 错误文案 | `v20-ui-collab` 的 `writeJson`（`dedupedFetch` + 保留 `detail`） | **提取到共享**：`stores/teams.ts` 内复用同写法（避免复制两份 → 见 §1 D3） |
| 抽屉/分区骨架 | 任务页卡片 + 告警页分组 + `CHANGE` 所引 §6.0 统一详情骨架 | 左列表 + 右侧抽屉，分区折叠 |
| 视觉变量 | `src/styles/tokens.css` | 只用既有变量，不新增 token |

### 0.5.3 沿用模式 vs 引入新模式

- **沿用**：store/page 分层、`safeFetch`/`dedupedFetch` 读写分工、内联样式 + CSS 变量、`EmptyPerm` 权限壳、`ErrorBoundary`。
- **引入**：**无新模式**。唯一的结构选择是"单页双 tab"，属既有单页形态（`AgentControlPlane` 亦有分组）内组合，不新增路由层。
- **不做**：不改 `requestDedup` 公共签名（上一 change 已定稿）；不在前端做授权判断。

## 1. 决策清单

| ID | 决策 | 备选 | 理由 |
|---|---|---|---|
| D1 | **单页双 tab（团队/小隊）+ 右侧抽屉** | 两个独立 NAV 入口 / 两张页面 | 两个实体同属"组织与编组"心智；同页减少 NAV 膨胀（当前已 13 项）。原型 `teams.html` 也是双 tab |
| D2 | 详情**按需拉取**（点开才 `GET /api/teams/{ref}`） | 列表时预拉全量详情 | 避免 N+1（团队数 × 详情）；详情含成员与资产，体积大 |
| D3 | 写请求用 `dedupedFetch` 并**读取后端 `detail`** | 复用 `safeFetch`（会压成 `Server error: 400`） | 上一 change 的实证：`safeFetch` 丢弃业务文案；本 change 需要"配额超限/资产冲突/owner 约束"原文 |
| D4 | 资产挂载用 **`kind` 选择 + `asset_id` 手填** | 自建候选列表 | 后端无"未归属资产"端点；自建会造假数据 → 记 `shortcut: 手填 id，待后端 unclaimed 列表上线后换成选择器` |
| D5 | 前端**零授权判断**：按钮可用性只按"后端已知角色"呈现，最终由 403/404 决定 | 前端按 role 矩阵隐藏 | 避免两套授权逻辑漂移（CLAUDE.md 约定：鉴权在服务端） |
| D6 | 小隊**不改权限模型**（当前路由无校验）；界面不新增"只有谁能建队"的暗示 | 顺手加权限 | 改后端语义超出本 change 范围；如实记入 REVIEW 遗留 |
| D7 | 状态切换用**显式按钮 + archived 不可逆提示** | 下拉选择 | 不可逆动作要二次确认（§6.0 纪律） |

## 2. 数据流 / 架构图

```
App.tsx (NAV: teams)
   └─ pages/Teams.tsx            ← 展示 + 表单 + 抽屉
        ├─ useTeams()            ← zustand store
        │    ├─ teams: TeamSummary[]           GET /api/teams
        │    ├─ detail: {team, members, assets} GET /api/teams/{ref}
        │    ├─ squads: SquadSummary[]          GET /api/squads
        │    └─ actions → writeJson()           POST /api/teams… · /api/squads…
        └─ requestDedup
             ├─ safeFetch      (GET, 5s 缓存 + 去重)
             └─ dedupedFetch   (写；不缓存；读取 detail 后 invalidateCache)
```

## 3. 关键状态机（如有）

**团队状态**（后端 `team_service.set_status` 为准，前端只镜像）：

```
active  ⇄  paused
   │          │
   └──────────┴──→ archived（终态，界面提示不可逆；archived 后加成员/挂资产按钮禁用）
```

**小隊归档**：`active → archived`（只停未来指派；**在跑 run 不连带取消**——界面不出现"已取消运行"字样）。

## 4. ADR 索引

本 change **不新增项目级 ADR**（不改模块边界/公共契约/存储）。change 级关键决策见 §1 D1–D7。

## 5. 风险

| # | 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|---|
| R1 | 资产 `asset_id` 手填填错 | 中 | 挂错/报错 | 表单回显 `kind` + id；错误文案透传；`shortcut` 注释 |
| R2 | `archived` 被误点 | 低 | 不可逆 | 二次确认 + 文案「归档不可恢复」 |
| R3 | owner 转让误操作 | 低 | 权限变化 | 必须勾 `confirm` + 输入新 owner |
| R4 | 抽屉内容过长（成员+资产+配额） | 中 | 可用性 | 分区折叠，摘要置顶 |
| R5 | 列表无分页，团队多时卡顿 | 低 | 性能 | 量级小；记入 v2 |

## 6. 不在范围

同 `CHANGE.md`「范围排除」1–5；另加：不改后端任何路由/服务；不改 `requestDedup` 签名。

## 9. 架构沉淀建议（供 A-evolve 批量同步）

### 9.1 新增的可复用抽象
- **`writeJson` 写请求助手**（`dedupedFetch` + `detail` 透传 + `invalidateCache`）：`v20-ui-collab` 与 `v20-ui-teams` 各写了一份 → **建议提取到 `utils/requestDedup.ts` 或 `utils/write.ts`**，下一轮统一（本 change 暂不抽，避免动公共工具影响已发页面）。

### 9.2 新增 / 改变的项目级技术决策
- 无。

### 9.3 新增 / 修改的跨模块契约
- 无新增。**记录契约现状**：`GET /api/teams` 已按成员可见性过滤（非成员不返回），前端不得二次过滤。

### 9.4 新增 / 升级的依赖
- 无。

### 9.5 禁动清单变化
- 无。

## 🛡️ G2 方案门（R9/R13 · 自评轮）

```
🗳️ G2 方案门: DESIGN.md 是否通过？

   🟩 架构师(M): ✅ 0.5 对齐表把"沿用/新增/不做"分清了；D1/D2 直接对应 N+1 与 NAV 膨胀两个真实问题；不引入新模式。
   🟫 研发负责人: ✅ 触碰面收敛（1 新 store + 1 新 page + App 挂载），无后端改动；D3 的写请求策略有前车之鉴（L-005 同族问题）。
   🟪 领域专家: ✅ 领域语义正确：Team 不可指派、Squad 不拥有资产、archived 只停未来指派；界面文案未越界。
   🔴 安全审计师: ✅ D5 明确"前端零授权判断"，把 403/404 交回服务端；D7 对不可逆动作要求二次确认；D6 不擅自改后端权限并如实留档。

   结果: 4/4 → 全票通过 ✅ 自动进入 2a-ui-design
```
