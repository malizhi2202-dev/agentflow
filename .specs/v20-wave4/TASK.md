# TASK · v20-wave4

## T-01 / R5-3 + R5-4 团队与小队（完成）

- **files**：`backend/models/teams.py`(新) · `backend/services/team_service.py`(新) · `backend/routes/teams_api.py`(新) · `backend/tests/test_teams.py`(新) · `backend/models/{agent,tool,workflow,knowledge_source,domain,collab,__init__}.py` · `backend/migrations.py`(010 + 索引加固) · `backend/main.py`
- **verify**：
  - `unittest tests.test_teams -v` → 19 用例全绿（16 服务层 + 3 路由层）
  - 迁移 010：老库加列成功、存量行 `owner_kind=personal`、`team_id` 为空；重跑 `[]`
  - 全新库 `init_db()` 应用 001…010 共 10 个迁移、41 张表，二次调用幂等
  - 全仓 312 用例 → 29F/12E/6S（与基线同红，0 新增红）
- **done 判据**：AC-4.1…4.15 全绿
