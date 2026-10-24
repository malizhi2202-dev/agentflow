# TASK · v20-wave1

## T-01 / P0-2 口令体系（本轮 · 完成）

- **files**：`backend/passwords.py`(新) · `backend/tests/test_passwords.py`(新) · `backend/auth.py` · `backend/routes/auth_api.py` · `backend/requirements.txt`
- **verify**：
  - `python3 -m unittest tests.test_passwords -v` → 9 用例
  - 全仓后端回归 `unittest discover` → 与 HEAD 基线**同样 29 failures / 12 errors**（无新增红），用例数 190→199（+9）
  - 端到端：临时 DB 上 `init_db()` 应用 5 个迁移并幂等；`_default_admin()` 产出 `$argon2id$` + `must_change_password=True`；错误口令（123456）校验为 False
- **done 判据**：AC-P2-1…7 全绿

## T-02 / P0-1 服务端会话（本轮 · 完成）

- **files**：`backend/models/session.py`(新) · `backend/services/session_service.py`(新) · `backend/services/agent_trigger.py`(新) · `backend/tests/test_auth_sessions.py`(新) · `backend/migrations.py` · `backend/models/__init__.py` · `backend/main.py` · `backend/auth.py` · `backend/config.py` · `backend/routes/auth_api.py` · `frontend/src/main.tsx` · `frontend/src/App.tsx` · `frontend/src/stores/auth.ts` · `frontend/src/pages/LoginPage.tsx` · `frontend/src/components/ForcePasswordChange.tsx`(新) · 前端各 store/页面（去掉自塞 `X-User-Id`）
- **verify**：
  - `/tmp/afvenv2/bin/python -m unittest tests.test_auth_sessions -v` → 24 用例全绿
  - `npm run build` → 16.5s 通过；`npx vitest run` → 57/57
  - 全仓后端回归 241 用例 → `29 failures / 12 errors / 6 skipped`（与波 1 P0-2 收口时的基线同红，**0 新增红**）
  - 迁移 006 在临时 DB 幂等；旧测试里「缺身份回退 admin」断言已反转为 401
- **done 判据**：AC-1.1…1.12 全绿

## T-03 / P0-3 部署模式与可信代理（本轮 · 完成）

- **files**：`backend/services/deploy_guard.py`(新) · `backend/tests/test_deploy_guard.py`(新) · `backend/config.py` · `backend/main.py` · `backend/auth.py` · `backend/routes/auth_api.py` · `README.md` 配置表
- **verify**：
  - `python -m unittest tests.test_deploy_guard -v` → 14 用例全绿
  - 非法配置三例（mode 拼错 / behind-proxy 无白名单 / `*` 无 TLS）均 `DeployConfigError` 启动失败
  - `DEPLOY_MODE=lan ALLOW_CIDRS=...` 下非白名单 peer → 403，且响应仍带 CORS 头
- **done 判据**：AC-3.1…3.8 全绿
