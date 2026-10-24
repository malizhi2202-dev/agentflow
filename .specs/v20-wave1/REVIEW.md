# REVIEW · v20-wave1（P0-1 / P0-2 / P0-3 · 压缩路径）

| 维度 | 结论 | 依据 |
|---|---|---|
| 算法符合设计 | ✅ argon2id（`PasswordHasher()` 默认 64MiB/t=3/p=4）；缺库退 scrypt 并显式 maxmem | `test_format_is_self_describing` + 端到端 `$argon2id$` |
| 常数时间 | ✅ `hmac.compare_digest`；argon2 内部比较 | 代码 |
| 出厂口令已废 | ✅ 无 123456；env 或随机 + 只打印一次；`must_change_password=True` | 端到端输出 |
| 自愈分支已删 | ✅ 缺哈希 → 置标记 + 拒登录（403 + 审计），不再写 123456 | `auth.load_users` / `auth_api.login` |
| 渐进迁移 | ✅ `needs_rehash` → 登录成功即升级并写审计 | `test_upgrade_path` |
| 弱口令 | ✅ 建用户/改口令 <12 位或字符集窄 → 400 | `is_weak` |
| 依赖 | +`argon2-cffi`（设计指定）；`passwords.py` 在缺库时仍可运行 | requirements + 9 用例（两次跑：有/无库） |
| 安全边界 | ⚠ 登录节流、会话 cookie、`X-User-Id` 自述仍在（P0-1 范围，未做） | 本波只做口令 |
| 兼容性 | ⚠ 首启随机口令只出现在启动日志——生产务必用 `AGENTFLOW_ADMIN_PASSWORD` | 代码注释 + 启动横幅 |
| 越界 | 无：diff = 5 文件，全在 T-01 清单内 | `git status` |

## P0-1 服务端会话 · 复核（10-24）

| 维度 | 结论 | 依据 |
|---|---|---|
| 身份不再自述 | ✅ 中间件是唯一身份入口；`X-User-Id` 仅在 env∧localhost∧admit 三重 opt-in 下生效，且逐请求写 `auth:debug_header` 审计 | `main._resolve_identity` + `test_x_user_id_no_longer_authenticates` |
| fail-open 清零 | ✅ 三处全清：中间件缺省 admin（改 401）/ `get_current_user` 回退 `_default_admin()`（改 401）/ 前端 `main.tsx` 全局注入拦截器（删除）；各 route 的 `_user()` 也改成缺省 401 | grep `X-User-Id\|current_user_id` in `frontend/src` → 仅剩注释 |
| 凭证存储 | ✅ 只存 sha256；`ux_sessions_token_hash` / `ux_pat_tokens_token_hash` 唯一索引；明文不出现在日志与 `/api/auth/*` 响应（建 PAT 时一次性返回是唯一例外，注释已写明） | `services/session_service.py` · 迁移 006 |
| 双到期 | ✅ idle 滑动 + absolute 固定；`cleanup_expired` 只删「过期超 7 天」（可审计） | `_live` / `test_idle_and_absolute_expiry` |
| 旋转 | ✅ 改密吊销全部会话后重签；权限变更吊销目标用户会话 | `TestSessionRotation` |
| 节流 | ✅ 5 败/15min → 429；成功清计数；**进程内存**（`shortcut:` 注释写明上限 → 波 2 P1-7 外置） | `login_throttled` |
| 首登强制改密 | ✅ 服务端 403 兜底（`password_change_required`）+ 前端 `ForcePasswordChange` 弹窗；豁免面仅 `/api/auth/*` | `auth_middleware` 第 5 步 |
| 越权口径 | ✅ 他人会话/令牌吊销统一 404，不用状态码探测 | `revoke_my_session` / `revoke_token` |
| 数据泄露 | ✅ 用户对象出网前剥 `password_hash`（此前 `/me` 与用户列表会回传） | `_public_user` |
| 循环依赖/回环 | ✅ cron 改直调 `services/agent_trigger.py`，与路由共享同一实现 | `main._cron_scheduler_loop` |
| 越界 | 无：改动全部落在 T-02/T-03 清单内 | `git status` |

## P0-3 部署闸门 · 复核（10-24）

| 维度 | 结论 | 依据 |
|---|---|---|
| 响亮失败 | ✅ 非法 mode / behind-proxy 无白名单 / `TRUSTED_PROXY_IPS='*'` / `FORWARDED_ALLOW_IPS='*'` 且无 TLS → `DeployConfigError`，lifespan 第一步即抛（不再「数据库初始化跳过」式静默降级） | `validate_deploy_config` + 5 用例 |
| XFF 纪律 | ✅ 未配可信代理一律忽略；可信 peer 才解析，取**右起首个非可信**；全链可信取最左 | `effective_client_ip` 三用例 |
| IP 用途 | ✅ 只喂审计与节流，不参与鉴权 | `_get_client_ip` 读 `state.client_ip` |
| 探活面 | ✅ `/api/health` `/api/ping` 免来源闸门与身份 | `_PUBLIC_PATHS` |
| CORS | ✅ 最后 `add_middleware` → 实际最外层，闸门 403 响应仍带 CORS 头（浏览器能读到错误原因） | `test_source_gate_rejects_non_loopback_but_keeps_cors_headers` |
| 可观测 | ✅ 启动打印生效值；`GET /api/auth/deploy-info`（`user:manage`）供 p16 部署安全卡只读呈现 | 代码 + README 配置表 16 行 |
| 兼容 | ⚠ `lan` / `behind-proxy` 是新能力，默认值保持旧行为（localhost），现网不受影响 | 默认值 |
| 越界 | 无 | `git status` |
