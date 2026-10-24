# REVIEW · v20-wave1（P0-2 · 压缩路径）

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
