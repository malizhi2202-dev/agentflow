# RECON · S13 身份三连修复方案 — 第 4 轮 ②

> **状态**：已过审（随 ⑤ 门「通过」2026-09-23）· 2026-09-23 · 证据源：agent `538c7384`（本地代码只读核实 + 业界先例 web_fetch）
> **总裁定**：轮1 记录的三条风险**全部确认，且①②比记录更严重**（下述 ⚠ 项）。修法已有先例支撑，P0-1/2/3 可具体化到参数级。

## ① 本地代码事实（file:line，比文档记录多出的面全部 ⚠ 标出）

**风险① 身份自述（确认+加重 ⚠）**
- `main.py:193-212 auth_middleware`：无 X-User-Id → `get_user("admin")` 默认（:209-210）；**有 id 不存在才 401**（唯一不 fail-open 分支）
- ⚠ **三层兜底**：`auth.py:181-186 get_current_user` 空→admin，且 `_default_admin()`（:103-113）users.json 无 admin 时**凭空构造**；⚠ 6 个路由各自 `_user()` 回退字面量 admin 字典（chat_api:10-15、channel_api:20-25、agent_knowledge_api:14-19、control_plane_api:20-25、orchestration_api、human_approval_api）+ main.py:229 metrics 中间件同写法
- ⚠ **全仓无任何 token/session**：login 只回 `{id,name,role}`（auth_api:186-207）"登录"非凭证交换；前端 `main.tsx:11-21` 全局 fetch 注入 `X-User-Id: localStorage.current_user_id || 'admin'`——OWASP 明禁 localStorage 存凭证，此处连凭证都没有
- ⚠ 授权层覆盖面窄：has_permission 仅 5 文件；agents/chat/orchestration/control_plane/human_approval/channel/domain/gateway 只 `_uid()`——伪造即全权
- ⚠ 中间件不校验 `active`（仅 has_permission/login 校）→ 禁用用户带 header 仍可操作
- ⚠ 用户库是 **JSON 文件**：`auth.py:30-37` users.json 在仓库与 SQLite 之外；无 DB 迁移可依

**风险② localhost 闸门（确认）**
- `main.py:196-199` IP 白名单；⚠ `"localhost"` 字面量永不命中（无效项）、`"unknown"` 403（此处 fail-closed）
- ⚠ 全仓 0 命中 XFF/proxy-headers/trusted_proxy；`uvicorn.run`（main.py:298-300）未传 proxy_headers → 反代后 `client.host`≡127.0.0.1，闸门=大门
- ⚠ 文档自害：README:335/CLAUDE.md 教 `--host 0.0.0.0`（config 默认虽 127.0.0.1）
- ⚠ 无豁免：/api/health 也 403（反代健康检查挂）；⚠ CORS 中间件顺序错误（main.py:184/194/216 add_middleware 头插→CORS 最内层），403 不带 CORS 头

**风险③ 口令（确认）**
- `auth.py:19-21` 无盐 sha256；:24-26 `==` 比较（非常数时间）；:126-136 **自愈重置分支**（缺 password_hash→静默变 123456）；:140-143 首启即落盘默认 admin
- ⚠ 出厂面扩散：建号默认 123456（auth_api:71）、UserManagement 预填、**LoginPage:145 界面公开默认口令文案**
- ⚠ 无登录节流/锁定；⚠ /api/auth/list 公开全用户枚举面；⚠ 404/401 差异=用户名枚举；requirements 无 argon2/bcrypt（cryptography 仅用于 API Key AES-GCM）

## ② 业界先例（各带 URL）

- **Jupyter**：token 默认开、启动打印带 token URL、空 token=NOT RECOMMENDED — jupyter-server.readthedocs.io/en/latest/operators/security.html
- **Open WebUI**：免登录=显式 `WEBUI_AUTH=False` 且切换不可回退；`WEBUI_SECRET_KEY` 必须持久 — docs.openwebui.com/getting-started/quick-start/
- **Gitea**：无可用出厂口令，admin 命令行显式建（可 --random-password）；**`--must-change-password` 默认 true**；机器令牌 `generate-access-token --scopes "[read|write]:<block>"` — docs.gitea.com/administration/command-line/
- **uvicorn**：`--proxy-headers` 默认开但**只信 forwarded_allow_ips（默认 127.0.0.1,::1）**；`*`=信任一切=坑 — uvicorn.dev/settings/ ；Gitea 反代页：不声明"我在代理后"则 header 视为不存在
- **OWASP 口令存储**：argon2id 最低 m=19456,t=2,p=1；sha256 明令不适合；老哈希=登录时重哈希/PHC 混存 — Password_Storage_Cheat_Sheet
- **argon2-cffi 25.1.0**：默认 argon2id m=65536,t=3,p=4（**超 OWASP 最低档**）；`check_needs_rehash` 天然支持静默升级
- **OWASP Session**：≥128bit CSPRNG、仅 cookie 交换、`HttpOnly;Secure;SameSite`+`__Host-`、**权限变化必须旋转**、idle+absolute 双超时、勿存 localStorage（直中我们现状）
- **GitHub PAT**："token 不能扩权"、fine-grained+expiration、仅创建时可见（哈希存储字样未达，见清单）

## ③ P0-1/2/3 具体化（agent 综合，⑤ 后转 DESIGN 输入）

- **P0-1（M）**：login 签发 `secrets.token_urlsafe(32)` → `sessions` 表（存 hash）→ `__Host-session` cookie（http 内网退化方案标注）→ 解析序 cookie>Bearer PAT>401；**一次性清三层兜底**+中间件校 active；X-User-Id 降为三重显式 opt-in（env+localhost 模式+admit 白名单，开则横幅红条+每请求审计）；cron 自调用改直调 service；idle30m/abs8h、改密即旋转+吊销列表；测试 `test_missing_user_header` 断言反转为 401
- **P0-2（S）**：`DEPLOY_MODE=localhost|lan|behind-proxy`；behind-proxy 强制 `proxy_headers=True+TRUSTED_PROXY_IPS`+TrustedHost；未配可信代理忽略 XFF；`*`+无 TLS 拒启动；/api/health 豁免；CORS 提最外
- **P0-3（M）**：argon2-cffi PasswordHasher（PHC 串自带盐参）+verify 常数时间+登录时静默 rehash；**删自愈分支**→缺 hash 置 `must_change_password`+拒口令登录+audit；建号口令必填、前端去预填/文案；首启 Jupyter/Gitea 式引导（env 或随机打印日志）；存量 sha256 混存渐进迁移；登录节流(进程内)+泛化 401+list 加权限
- **界面落点**：p1 强制改密弹窗（后端 gate 403+强度条）/p16 部署安全卡（只读生效值+红条态）/PAT 管理页（scopes+90d 默认+只显示一次）

## ④ 未达
Open WebUI 首注册成 admin 专页 404；GitHub"哈希存储"原话；Gitea security 段截断；Nginx XFF 覆写官方文；社区 CVE 横向（禁搜）。
