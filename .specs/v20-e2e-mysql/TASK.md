# TASK: MySQL + 真实运行时 E2E
| id | name | files | verify | auto |
|---|---|---|---|---|
| T01 | 私有 MySQL 实例 + 迁移 | （临时 /tmp，不入仓） | `init_db()` 16 迁移 / 50 表 / 二次幂等 | ✅ |
| T02 | MySQL 后端 + CLI 运行时 | env（见 CHANGE） | `/api/health` 200 · 登录 200 | ✅ |
| T03 | L0 真实抽取（CLI） | `scripts/e2e/seed_l0_mysql.py` | `candidates=2, created=2` | ✅ |
| T04 | 界面 E2E 13 条 | `scripts/e2e/ui_mysql_e2e.js` | 13/13 passed | ✅ |
| T05 | 产品修正 judge_kind | `routes/rsi_api.py` `tests/test_shadow_runner.py` | `unittest tests.test_shadow_runner` 13 绿 | ✅ |
Task 门（自评）：研发 ✅ 测试 ✅ 安全 ✅（不碰系统库/无 sudo/无 key）→ 3/3
