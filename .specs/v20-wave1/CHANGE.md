# CHANGE · v20-wave1 —— 波 1 身份三连（P0-1 / P0-2 / P0-3）

> 来源：`PRODUCT-DESIGN.html` v20 §1.6.0 波 1「身份三连 · 一切闸门的前提」+ §1.6.1 P0-1/2/3
> 路由：**压缩路径**（0→3→4→6），变更在 CHANGE 内写「最小需求/AC」与「最小设计/触碰模块」，逐 P0 提交、逐 P0 汇报（用户 10-24 定的节奏）。
> 前置：波 0 已收口（P0-4/6/7/8；P0-5 按用户决定只记账）；后端依赖已装通（`/tmp/afvenv2`，镜像 pypi.tuna），**端到端可验**。

## 一句话

现在「谁在请求」是客户端自己说的：`X-User-Id` 自述、缺省即 admin、口令是无盐 sha256 + 出厂 123456。**本轮把身份改由服务端签发**，否则后面所有团队/小队权限都是假闸门（设计档 D1 死因预演第一条）。

## 本波三件与顺序

| # | 内容 | 状态 |
|---|---|---|
| P0-2 | 口令：argon2id + 废出厂口令 + 删「重置 123456」自愈分支 + 登录时渐进升级 | **本轮完成** |
| P0-1 | 会话：服务端 token + `sessions` 表（只存哈希）+ `__Host-session` cookie；解析序 cookie > Bearer PAT > 401；删三处 fail-open | **本轮完成** |
| P0-3 | 部署：`DEPLOY_MODE` + `TRUSTED_PROXY_IPS` + 反代后闸门；CORS 提到最外层 | **本轮完成** |

## 最小需求与验收（P0-2 部分）

| AC | 判据 |
|---|---|
| AC-P2-1 | 口令哈希为 **argon2id**（`$argon2id$` 前缀）；缺 argon2-cffi 时退 scrypt（OWASP 可接受） |
| AC-P2-2 | 同一口令两次哈希**不同**（每口令独立盐） |
| AC-P2-3 | 校验常数时间（`hmac.compare_digest` / argon2 自身比较），空值/未知格式返回 False 不抛 |
| AC-P2-4 | **不再有出厂口令**：首启口令 = env `AGENTFLOW_ADMIN_PASSWORD` 或随机生成并只打印一次；`must_change_password=True` |
| AC-P2-5 | 缺失 `password_hash` 的旧账号**不再被重置为 123456** → 置 `must_change_password`，口令登录被拒（403 + 审计） |
| AC-P2-6 | 历史无盐 sha256 仍可登录，但登录时**静默升级**为当前算法（`needs_rehash`） |
| AC-P2-7 | 建用户/改口令：不传口令 → 随机生成且强制首登修改；弱口令（<12 位或字符集过窄）→ 400 |

## 最小设计与触碰模块

- 新 `backend/passwords.py`（**纯标准库**，可无依赖单测）：argon2id 优先 → scrypt（`N=2^15,r=8,p=1`，显式 `maxmem`，否则 OpenSSL 32 MiB 上限直接炸）→ 兼容 64 位 hex sha256；`needs_rehash` / `generate_password` / `is_weak`。
- `backend/auth.py`：`hash_password/verify_password` 改为从 `passwords` 导入；`_default_admin()` 用 `_bootstrap_admin_password()`（env 或随机 + 启动日志一次）；`load_users()` 的自愈分支改为置 `must_change_password`，不再写 123456。
- `backend/routes/auth_api.py`：登录（拒 must_change、成功即 rehash、失败写审计）、建用户（随机口令 + 弱口令 400）、改口令（弱口令 400 + 清标记）。
- `backend/requirements.txt`：`argon2-cffi>=23.1.0`（设计指定的算法；缺库仍可跑，退 scrypt）。
- 新 `backend/tests/test_passwords.py`（9 用例）。

**不做**：不改 `X-User-Id` 中间件与 cookie（属 P0-1）；不迁 `users.json` → MySQL（裁定⑦ 的迁移与 sessions 建表是两套账，跟 P0-1 一起做）；不做登录节流（P0-1 配套）。

---

## 追加：P0-1 服务端会话（10-24 完成）

| AC | 判据 | 落地 |
|---|---|---|
| AC-1.1 | 登录成功 → `secrets.token_urlsafe(32)`，**库里只存 sha256**，明文只进 HttpOnly cookie | 迁移 `006_auth_sessions`（`sessions` 表 `ux_sessions_token_hash` 唯一索引） |
| AC-1.2 | cookie 名 `__Host-session`（TLS）；无 TLS 退化 `af_session`，HttpOnly + SameSite=Lax + Path=/ | `session_service.set_session_cookie` + `deploy_guard.session_cookie_name()` |
| AC-1.3 | 解析序 **cookie > Bearer PAT > 401**；`X-User-Id` 不再产生身份 | `main._resolve_identity`；`test_x_user_id_no_longer_authenticates` |
| AC-1.4 | 三处 fail-open 清零：中间件缺省 admin / `get_current_user` 回退 `_default_admin()` / 前端全局注入 `X-User-Id` | `main.py` · `auth.py` · 删 `main.tsx` 拦截器 |
| AC-1.5 | cron 触发不再回环 HTTP + 伪造 `X-User-Id`，改直调 service（`services/agent_trigger.py`） | `main._cron_scheduler_loop` |
| AC-1.6 | 双到期：idle 30min 滑动 / absolute 8h 固定 | `session_service._live`；`test_idle_and_absolute_expiry` |
| AC-1.7 | 口令/权限变更 → 吊销目标用户全部会话；自助改密后重签当前会话 | `revoke_user_sessions`；`TestSessionRotation` |
| AC-1.8 | 登录失败泛化 401（不泄露账号状态）+ 节流 5 败/15min → 429 + 审计 | `auth_api.login`；`test_login_throttle` |
| AC-1.9 | 用户对象出网前剥 `password_hash` | `_public_user`；`test_login_sets_httponly_cookie_and_me_has_no_hash` |
| AC-1.10 | PAT：`af_pat_` 前缀、只存哈希、**禁止永不过期**（默认 90 天）、scopes 必须取权限目录内、可吊销 | `session_service.create_pat`；`TestPat` |
| AC-1.11 | 首登强制改密由**服务端**拦：`must_change_password` 时除 `/api/auth/*` 外全 403 | `main.auth_middleware` 第 5 步 + 前端 `ForcePasswordChange` |
| AC-1.12 | 越权吊销他人会话/令牌 → 404（不用状态码探测） | `auth_api.revoke_my_session` / `revoke_token` |

## 追加：P0-3 部署模式与可信代理（10-24 完成）

| AC | 判据 | 落地 |
|---|---|---|
| AC-3.1 | `DEPLOY_MODE=localhost\|lan\|behind-proxy`（默认 localhost）；非法值**启动即失败** | `deploy_guard.validate_deploy_config`（lifespan 第一步） |
| AC-3.2 | behind-proxy 必须给 `TRUSTED_PROXY_IPS`；`*` 一律拒绝 | 同上；`test_star_trusted_proxy_is_rejected` |
| AC-3.3 | 未配可信代理即**忽略 XFF**；可信代理后才解析，取右起首个非可信地址 | `deploy_guard.effective_client_ip`（3 用例） |
| AC-3.4 | 客户端 IP 只喂审计/节流，不参与鉴权判定 | `request.state.client_ip` → `auth._get_client_ip` |
| AC-3.5 | `/api/health` `/api/ping` 免来源闸门与身份（探活面） | `_PUBLIC_PATHS`；`test_health_is_exempt_from_source_gate` |
| AC-3.6 | CORS 提最外层（异常响应也带 CORS 头） | `add_middleware` 在 auth 之后 → 实际最先执行；`test_source_gate_rejects_non_loopback_but_keeps_cors_headers` |
| AC-3.7 | `FORWARDED_ALLOW_IPS='*'` 且无 TLS → 拒绝启动 | `validate_deploy_config` |
| AC-3.8 | 部署生效值只读可查（p16 部署安全卡数据源） | `GET /api/auth/deploy-info`（`user:manage`） |

## 追加：本波明确不做（记账）

- `users.json` → MySQL 表化（裁定⑦）：口令/会话两套账已分开，表化迁移不阻塞波 1 验收，登记到 `TOPICS.md` 待波 2 一并处置。
- 登录节流为**进程内存**（`shortcut:` 注释已写上限）：波 2 P1-7 状态外置时搬进库。
- `X-User-Id` 调试通道保留但默认关闭、三重 opt-in、逐请求审计——**不是**身份来源。
