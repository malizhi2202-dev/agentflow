# TASK · v20-wave6

## T-01 / R6+R7 RSI 治理（完成）

- **files**：`backend/models/rsi.py`(新) · `backend/services/rsi_service.py`(新) · `backend/routes/rsi_api.py`(新) · `backend/models/__init__.py` · `backend/migrations.py`(013) · `backend/main.py` · `backend/tests/test_rsi.py`(新) · `README.md`
- **verify**：
  - `unittest tests.test_rsi -v` → 18 用例全绿
  - 全新库 `init_db()` 应用 001…013 共 13 个迁移、47 张表；二次调用幂等
  - 全仓 354 用例 → 29F/12E/6S（与基线同红，0 新增红）
- **done 判据**：AC-6.1…6.15 全绿
