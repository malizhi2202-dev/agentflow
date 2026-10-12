# DESIGN · identity-hardening
> 状态: **冻结（裁定⑧：不进开发）**· 2026-09-23 · 已过设计门（票形随 TASK）· 〔裁定⑦：sessions/pat/users/audit/告警/change_log 表全部 MySQL 建表（CREATE IF NOT EXISTS 幂等，双引擎方言已由 database.py 抽象）；users.json 迁移=一次性导表进 users 表+双读过渡，非重写 JSON；encryption_service KDF 修复列为追加候选〕设计空间被 REQUIREMENT AC 锁死，本文只裁「放哪/怎么连」

## 模块切分（遵 CLAUDE.md 约定：路由薄、业务进 services/）
| 落点 | 内容 | AC |
|---|---|---|
| `backend/config.py`（改） | `DEPLOY_MODE=localhost|lan|behind-proxy`、`TRUSTED_PROXY_IPS`、`ALLOW_CIDRS`、`AUTH_DEBUG_HEADER_ENABLED/ADMIT_USERS`、`AGENTFLOW_ADMIN_PASSWORD` | 3.1/1.4/2.3 |
| `backend/auth.py`（重写上） | PasswordHasher(argon2id)；`hash/verify`；legacy-64hex 识别+登录时重写；**删自愈重置**；首启引导（env→随机仅打日志）；`must_change_password`/`password_updated_at` 字段 | 2.1/2.2/2.3/2.4 |
| `backend/models/session.py`（新） | `sessions(token_hash idx,user_id,created_at,last_seen,expires_at,ip,ua,revoked_at)` + `pat_tokens(name,user_id,token_hash,scopes_json,expires_at,last_used_at,revoked_at)`——经 database.SessionLocal；**迁移=database.py 内联 ALTER 风格新增建表（幂等 CREATE IF NOT EXISTS）** | 1.1/3.4 |
| `backend/services/auth_service.py`（新） | issue/resolve/rotate/revoke_session；PAT create/list/revoke + Bearer 解析；登录节流 (user,peer_ip) 5/15min 进程内；debug header 三重判定 | 1.1-1.4/2.5 |
| `backend/main.py`（改） | 中间件重写：闸门（DEPLOY_MODE 三值+XFF 仅可信代理，取右起首个非可信，只喂审计/节流）→凭证解析 cookie>Bearer>PAT>debug>401→active 校验→health 豁免；**CORS 提最外层**；`uvicorn.run` 传 proxy_headers/forwarded_allow_ips；启动校验（`*`∧无TLS 拒起）；**cron 直调 service** | 3.1-3.3/1.2/1.5 |
| `backend/routes/auth_api.py`（改） | login 签发 cookie+返回体含 must_change；/me /logout /sessions（列/撤）；/api/auth/tokens CRUD（scopes 枚举=现有权限点字符串，**不造新词**）；list 加权限；泛化 401 | 1.3/2.5/3.4 |
| 6 路由 `_user()` 收编 | chat/channel/agent_knowledge/control_plane/orchestration/human_approval + main.py:229 metrics 中间件→`Depends(current_user)` | 1.2 |
| 前端 | `main.tsx` 删 fetch 注入器→全局 `credentials:'same-origin'`；`stores/auth.ts` 以 /me 为真相源；新 `ForcePasswordChange.tsx`（must_change 驱动+强度条）；`LoginPage/UserManagement` 123456 清零 | 1.1/2.2/2.3 |
| `backend/_migrate_users.py`（新） | 幂等迁移（migrated_at 标记）；只动 users.json，与 sessions 建表分离可独立回滚 | 2.4 |
| 文档 | README 配置表 + CLAUDE.md「现状与已知缺陷」两行改写（身份/口令→已修，闸门行→DEPLOY_MODE 化） | NFR |

## 关键裁定
- **越权 404/认证 401 二分**沿用现状约定（CLAUDE.md「越权与不存在统一 404」不破坏）。
- must_change 门禁在**中间件层**（除 /api/auth/* 外 403 code=password_change_required），前端弹窗只是防误点——服务端才是门（纪律①自家应用）。
- 旧 X-User-Id 行为**不留兼容通道**（裁定#4）；admit 白名单空=开关无效。
- 测试基线：`test_missing_user_header` 断言反转 + 开关对照 + argon2 假哈希迁移用例 + 节流 429 用例 + health 豁免用例。
