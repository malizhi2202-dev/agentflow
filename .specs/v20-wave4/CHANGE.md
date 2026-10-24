# CHANGE · v20-wave4 —— 波 4 团队与小队（R5-3 / R5-4 / R5-6）

> 来源：`PRODUCT-DESIGN.html` v20 §1.6.0 波 4 + §2.11 · §6.29 + `RULINGS.md` R5-3/4/5/6
> 路由：**压缩路径**（0→3→4→6）。
> 前置：波 1 身份（`129c33ec`）、波 3 协作层（`67420190`，任务已有 assignee 三轨）。

## 一句话

协作层有任务了，但「谁的资产、这次谁一起干」还没有实体：没有 `teams` / `team_members`，
五类资产只有 `owner_id`（个人），指派目标到 agent/member 为止。**本波建两个实体并把两词两义钉死**：
Team 管「谁的」（资源容器，不可指派），Squad 管「这次谁一起干」（可指派，不拥有资产）。

## 验收

| AC | 判据 |
|---|---|
| AC-4.1 | `teams`：slug 正则 `^[a-z][a-z0-9-]{1,31}$`、同工作区 slug 唯一（冲突 409）、status ∈ active/paused/archived |
| AC-4.2 | 创建团队**只建 Team 行 + Owner 成员行**，不动任何资产表 |
| AC-4.3 | `team_members` 四档角色 owner/admin/member/viewer；owner 唯一且**只能通过转让产生**；不能移除 owner |
| AC-4.4 | 转让 owner = `confirm=true` 的双人确认；旧 owner 降为 admin；新 owner 必须是现任成员 |
| AC-4.5 | 成员/对象配额：`max_members` 超限拒绝；`max_agents` / `max_workflows` 在资产挂载时拒绝 |
| AC-4.6 | **非成员一律 404**（平台管理员例外）；成员但非 owner/admin 的写操作 403 |
| AC-4.7 | 五类资产（`agents/workflows/tools/knowledge_sources/domains`）加 `team_id` + `owner_kind(personal\|team\|platform)`；存量默认 `personal` 且 `team_id` 为空（**零回填**） |
| AC-4.8 | 资产挂载 = 一次转让 + 审计：只能转让**自己的**资产；已属其他团队拒绝（一个资产只属一个 team，不做多归属）；`owner_id` 不动 |
| AC-4.9 | 资产可释放回个人（`personal` + `team_id=NULL`） |
| AC-4.10 | 团队暂停/归档：归档后拒绝新增成员与挂资产；资产原地保留（不删） |
| AC-4.11 | `squads`：leader **必须是 Agent 且未归档**（`leader_bound` → 409）；slug 唯一 |
| AC-4.12 | `squad_members` 人/Agent 混编（`member_kind ∈ agent\|member`）；入池不授予调用权（仅记录） |
| AC-4.13 | 小队归档 = **只停未来指派**：在跑 run 不连带取消；leader 已归档时归档小队 → 409 `leader_bound` |
| AC-4.14 | 指派小队 = 给 leader 入队一条 **leader 任务**（`assignee_kind=agent`、`is_leader_task=1`、`parent_id=任务`、`squad_id`）；同 (任务, 小队) 活跃去重；任务负责人位变为 `squad` |
| AC-4.15 | Team ⟂ Squad **无外键**；Squad 不持有 `team_id` 与配额（成本归 leader Agent） |

## 最小设计与触碰模块

- 新 `backend/models/teams.py`：`Team` / `TeamMember` / `Squad` / `SquadMember` + `MEMBER_ROLES`、`TEAM_ASSET_KINDS`。
- 五个资产模型各加 `team_id`（可空）+ `owner_kind`（默认 personal）；`work_items` 加 `squad_id` + `is_leader_task`。
- 新 `backend/services/team_service.py`：成员校验（404 口径）、配额、转让、资产挂载/释放、小队生命周期、leader 任务去重。
- 新 `backend/routes/teams_api.py`：`/api/teams`（成员 / 状态 / 转让 / 资产）+ `/api/squads`（成员 / 归档 / 指派）；`main.py` 注册。
- 迁移 010：`teams`/`team_members`/`squads`/`squad_members` 四表 + 五类资产两列 + `work_items` 两列。
- 迁移框架加固：`create_index_if_missing` 在「表不存在 / 列不齐」时跳过（半截 schema 不再炸迁移）。

## 明确不做（记账）

- 前端「小队中心 / 团队详情」页面（按 §1.6.5 ⑨ 先表与校验，再上界面）。
- 编排实例/模板的 `team_id`（裁定 R5-5：**次批**，不得无限顺延，已在 ROADMAP 挂账）。
- 审计页 `team=` 维度筛选：审计已写 action/entity，筛选器属前端。
- 配额用量的 token 归集（团队级成本 = P1-6，波 5 之后）。
