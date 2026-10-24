# SUMMARY: v20-wave4 — 波 4 团队与小队（R5-3 / R5-4 / R5-6）

- **Change ID**: v20-wave4
- **Task ID**: T-01（Team/Squad 两实体 + 五类资产归属）
- **完成时间**: 2026-10-24（提交 `ac839aa0`）
- **AI 角色**: Dev
- **补记说明**: 7-integration 阶段补落（漂移 D4-1）

## 做了什么

把「谁的资产、这次谁一起干」拆成两个词两个实体：**Team**（组织层资源容器：成员四档角色 + 五类资产 + 配额 + 审计边界，**不可指派**）⟂ **Squad**（执行层可指派编组：1 leader Agent + 人/Agent 混编，**不拥有资产**、与他人**无外键**）。五类资产加 `team_id` + `owner_kind(personal|team|platform)`（存量零回填）；资产挂载=一次转让 + 审计、可释放回个人；归档只停未来指派（在跑 run 不连带取消）；指派小队=给 leader 入队一条 leader 任务（同任务同小队去重）。

## 改动文件（关键）

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/models/teams.py` | 新增 | Team / TeamMember / Squad / SquadMember + 常量 |
| `backend/services/team_service.py` | 新增 | 成员校验（非成员 404）、配额、转让、挂载/释放、小队生命周期、leader 任务去重 |
| `backend/routes/teams_api.py` | 新增 | `/api/teams` + `/api/squads` |
| `backend/models/{agent,tool,workflow,knowledge_source,domain,collab}.py` | 修改 | 五类资产归属列 + 任务 `squad_id/is_leader_task` |
| `backend/migrations.py` | 修改 | 010 四表 + 两列 + 索引加固 |
| `backend/tests/test_teams.py` | 新增 | 19 用例（16 服务层 + 3 路由层） |

## verify 输出（本轮复跑）

```text
$ 16 个波次相关模块同批：Ran 217 tests in 39.809s — OK（含 test_teams）
$ 全新库 init_db()：[migrate] 已应用 15 个迁移（含 010）· tables: 49
```

## 已知接受 + 理由

- **团队/小队前端页面未做**：同波 3「先表与校验，再上界面」。
- **配额只在挂载时校验**：`max_agents` / `max_workflows` 在资产挂载路径拒绝；存量资产不回填、不计入配额。
