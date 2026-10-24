# TASK · v20-wave5

## T-01 / P2-4 可观测（完成）

- **files**：`backend/models/orchestration.py` · `backend/services/runtime_tracer.py` · `backend/migrations.py`(011) · `backend/routes/prom_metrics.py`(新) · `backend/config.py` · `backend/main.py` · `backend/tests/test_observability.py`(新)
- **verify**：`unittest tests.test_observability -v` → 6 绿；全仓 336 用例 29F/12E（0 新增红）
- **done**：AC-5.1…5.7

## T-02 / P2-5 声明式 API 四件组（完成）

- **files**：`backend/models/declarative.py`(新) · `backend/services/declarative.py`(新) · `backend/routes/watch_api.py`(新) · `backend/routes/{admin_api,workflows_api}.py` · `backend/migrations.py`(012) · `backend/tests/test_declarative.py`(新)
- **verify**：`unittest tests.test_declarative -v` → 9 绿
- **done**：AC-5.8…5.14

## T-03 / P2-3 隔离契约（完成）

- **files**：`backend/services/execution_contract.py`(新) · `backend/routes/execution_api.py`(新) · `backend/config.py` · `backend/main.py` · `backend/services/{chat_service,agent_trigger}.py` · `backend/tests/test_execution_contract.py`(新)
- **verify**：`unittest tests.test_execution_contract -v` → 9 绿
- **done**：AC-5.15…5.21
