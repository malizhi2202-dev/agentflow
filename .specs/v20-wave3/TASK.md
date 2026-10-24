# TASK · v20-wave3

## T-01 / P1-16 告警落表 + 双队列并表（完成）

- **files**：`backend/models/alert.py`(新) · `backend/services/alert_service.py`(重写) · `backend/routes/alerts_api.py` · `backend/models/orchestration.py` · `backend/models/scheduler_queue.py` · `backend/models/__init__.py` · `backend/migrations.py`(008) · `backend/routes/{orchestration_api,metrics_api}.py` · `backend/tests/test_alerts_and_queue.py`(新)
- **verify**：
  - `unittest tests.test_alerts_and_queue -v` → 6 用例全绿
  - 迁移 008：旧 `scheduling_queue` 6 行按状态映射搬入并删表；重跑 `[]`
  - 全仓 270 用例 → 29F/12E/6S（同基线，0 新增红）
- **done 判据**：AC-3.1…3.7 全绿

## T-02 / P1-4 任务 + 收件箱（完成）

- **files**：`backend/models/collab.py`(新) · `backend/services/collab_service.py`(新) · `backend/routes/tasks_api.py`(新) · `backend/routes/inbox_api.py`(新) · `backend/models/__init__.py` · `backend/main.py` · `backend/migrations.py`(009) · `backend/tests/test_collab.py`(新)
- **verify**：
  - `unittest tests.test_collab -v` → 23 用例全绿（20 服务层 + 3 路由层）
  - 路由层：未登录 401；任务越级转移 400；他人任务 404（管理员可见）
  - 全仓 293 用例 → 29F/12E/6S（同基线，0 新增红）
- **done 判据**：AC-3.8…3.20 全绿
