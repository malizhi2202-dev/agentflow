# TASK · v20-wave1

## T-01 / P0-2 口令体系（本轮 · 完成）

- **files**：`backend/passwords.py`(新) · `backend/tests/test_passwords.py`(新) · `backend/auth.py` · `backend/routes/auth_api.py` · `backend/requirements.txt`
- **verify**：
  - `python3 -m unittest tests.test_passwords -v` → 9 用例
  - 全仓后端回归 `unittest discover` → 与 HEAD 基线**同样 29 failures / 12 errors**（无新增红），用例数 190→199（+9）
  - 端到端：临时 DB 上 `init_db()` 应用 5 个迁移并幂等；`_default_admin()` 产出 `$argon2id$` + `must_change_password=True`；错误口令（123456）校验为 False
- **done 判据**：AC-P2-1…7 全绿

## T-02 / P0-1 服务端会话（下一轮）

- `sessions` 表（迁移 006）+ `secrets.token_urlsafe(32)` 只存哈希 + `__Host-session` HttpOnly/Lax
- 解析序：cookie > Bearer PAT > 401；删三处 fail-open（中间件缺省 admin / `_default_admin()` 兜底 / 旧测试断言反转）
- idle 30min / absolute 8h；权限变更即旋转会话；登录节流
- 需要新增依赖：无（stdlib）

## T-03 / P0-3 部署模式与可信代理（再下一轮）

- `DEPLOY_MODE=localhost|lan|behind-proxy`；behind-proxy 强制 `TRUSTED_PROXY_IPS`；`*` 且无 TLS 拒启动；CORS 提到最外
