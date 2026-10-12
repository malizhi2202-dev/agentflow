# ③ 结论与建议 · S13 身份三连修复
> 状态：已过审（第 4 轮 · 2026-09-23 用户原话「通过」）· 依据 RECON ①（file:line 双路互证：538c7384+78a43dea）+ ② 先例

- **C13-0 事实修正（v8 必改）**：1.5.3 三行升级为实测全貌——三层 fail-open（中间件/get_current_user+凭空 _default_admin/6 路由 _user()+metrics 中间件）、**零凭证交换**（login 只回身份 JSON，前端 localStorage 注头=UX 层非安全层）、users.json 在 git 与 SQLite 之外、CORS 中间件顺序缺陷、/api/health 无豁免 403、/api/auth/list 公开枚举、404/401 差异可探测、禁用用户不拦截。文档原表述「默认回退 admin」全部成立但**不完整**。
- **C13-1 P0-1 具体化（M）**：login→`secrets.token_urlsafe(32)`→sessions 表（SQLite，存哈希）→`__Host-session` cookie（http 内网退化普通名+p16 红条）；解析序 cookie>Bearer PAT>401；**三层一次清**+中间件校 active；X-User-Id 降三重显式 opt-in（env+localhost 模式+admit 白名单；开启=启动红条+逐请求审计）；cron 自调用改直调 service；idle30m/absolute8h、权限变更必须旋转（OWASP 验收项）；既有 test_missing_user_header 断言反转 401。
- **C13-2 P0-2 具体化（S，可先行）**：`DEPLOY_MODE=localhost|lan|behind-proxy`；behind-proxy 强制 proxy_headers+TRUSTED_PROXY_IPS（默认窄）+TrustedHost；不配可信代理即忽略 XFF；`*`且无 TLS 拒启动；health 豁免；CORS 提最外。
- **C13-3 P0-3 具体化（M）**：argon2-cffi 默认档（≥OWASP 最低）+常数时间 verify+登录时 check_needs_rehash；**删自愈重置**→缺 hash 置 must_change_password+拒登+审计；建号口令必填；首启 Jupyter/Gitea 式引导（env 或随机口令仅打日志）；sha256 混存登录时渐进迁移+幂等脚本；登录节流 5 败/15min→429、401 泛化、list 加权限；**全前端 123456 痕迹清除**（LoginPage 文案/UserManagement 预填）。
- **C13-4 PAT 管理面**：/api/auth/tokens（scopes 对齐 S7 权限目录表单源枚举，不造第二套词；90d 默认；仅创建时明文可见）——CLI/自动化走此正道，debug header 非默认通道。
- 文档落点：P0-1/2/3 行升级参数级+工作量档；1.5.3 按 C13-0 改写；README 教 `--host 0.0.0.0` 危险组合列为缺陷注记（README/CLAUDE.md 本体不动）。原型：p1 首登强制改密弹窗（边界态）+ p16 部署安全卡（只读生效值+红条态）。
