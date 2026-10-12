# REQUIREMENT · identity-hardening

> 状态: 需求已过专家门（见 §5）· 2026-09-23 · 上游=ROADMAP §五#4、v8 P0-1/2/3、D-identity-and-security-2 全部 GD 验收项

## 1 用户故事
- US1 作为部署者，我登录后获得**服务端签发的会话**，任何请求不带头也证明不了我是谁——身份不再可冒充。
- US2 作为脚本/Agent 维护者，我可创建**受限 PAT**（scope+过期+只显示一次），替代裸 header。
- US3 作为管理员，我把服务放到反代后面时**必须显式声明可信代理**，否则 XFF 视为不存在——不会静默开门。
- US4 作为首启用者，我拿到的是**一次性随机口令（仅启动日志）或 env 预设**，首登强制改密；系统永远不存在 123456。
- US5 作为被禁用用户的管理员，我禁用即全路由生效，不再有「不查权限的口子」。
- US6 作为调试者，本机自测可开 debug header，但**三重条件缺一即关**，开着有红条+逐请求审计。
- US7 作为老用户，我的存量口令哈希在下次成功登录时**无感升级**，不强制我重置。

## 2 验收准则（AC 编号续 P0 参数）
- **AC-1.1** 凭证交换：login 成功→`secrets.token_urlsafe(32)`；sessions 表列=(token_hash,user_id,created_at,last_seen,expires_at,ip,ua,revoked_at)；Set-Cookie `__Host-session`（无 TLS 退化普通名，p16 卡可见退化态）。解析序 cookie>Bearer>401；`X-User-Id` 通道删除。
- **AC-1.2** 三层清除：main.py 缺省回退 / get_current_user 回退+_default_admin / 6 路由 `_user()` 字面量全消；统一 `Depends(current_user)`；中间件校验 active（403 语义与越权一致化 404 规约另议，本域先 401/403 二分）。
- **AC-1.3** 生命周期：idle 30min/absolute 8h；改密/角色/权限变更→旋转+吊销其余会话；`/api/auth/logout`；「我的活跃会话」可列可撤；日志只记 token 加盐哈希。
- **AC-1.4** debug header 三重 opt-in：env ∧ DEPLOY_MODE=localhost ∧ admit 白名单；开启=启动红条+`auth:debug_header` 审计；测试 `test_missing_user_header` 断言反转 401 + 新增开关对照用例（开=200/关=401）。
- **AC-1.5** cron：`main.py:69-81` 回环 HTTP 改直调 service 层，不留 header 后门。
- **AC-2.1** argon2id：argon2-cffi PasswordHasher 默认档；verify 常数时间捕 VerifyMismatchError；登录后 check_needs_rehash 静默重写。
- **AC-2.2** 自愈分支删除：缺 password_hash→must_change_password=True+口令登录 401+logger.error+审计 `auth:password_reset_skipped`；建号 password 必填（400 拒绝缺省）；前端预填/文案 123456 清零。
- **AC-2.3** 首启引导：env `AGENTFLOW_ADMIN_PASSWORD` 优先（用后仍 must_change）；否则随机 `token_urlsafe(18)` 仅打启动日志；现存 admin 可被 123456 验通→启动置 must_change+部署卡红条。
- **AC-2.4** 迁移：64-hex 识别 legacy；登录成功即 argon2 重写+清 legacy_sha256；幂等脚本 `python -m backend._migrate_users`（migrated_at）；`password_updated_at` 新增；users.json 重写与 sessions 建表**两套脚本各自可回滚**。
- **AC-2.5** 配套：进程内节流 (user+peer_ip) 5 败/15min→429；login 泛化 401；`/api/auth/list` 加权限（lan/behind-proxy 默认关）。
- **AC-3.1** DEPLOY_MODE 三值（默认 localhost 保持现闸门）；lan=网段白名单 ALLOW_CIDRS；behind-proxy 强制 proxy_headers+TRUSTED_PROXY_IPS+TrustedHost(allowed_hosts 无 `*`)。
- **AC-3.2** XFF 只在 client.host∈可信代理时解析，取从右往左第一个非可信地址，**仅用于审计/节流维度**；`forwarded_allow_ips="*"`∧无 TLS→拒绝启动。
- **AC-3.3** /api/health 闸门豁免；CORS 中间件最外层（403/预检带 CORS 头）。
- **AC-3.4** PAT：/api/auth/tokens CRUD；scopes 枚举与权限目录表同源（不造第二套词）；expires 默认 90d 禁永不过期；仅创建时明文；revoked_at 软删；`last_used_at`。
- **NFR** 旧会话兼容=无（全新凭证）；性能：session 查表走 SQLite 索引 (token_hash)；文档同步 README 配置表+CLAUDE.md 现状表更新（改码即改账）；一切对外写端点在完成品上才有（⑬ 由本 change 满足后解除）。

## 3 非目标
RBAC 覆盖面扩张、多副本、TLS 终结、git 历史重写、A2A。

## 4.5 裁定⑦介质修订（2026-09-23 追加，覆盖前文介质表述）
AC-1.1/1.3/2.4/3.4 中的 sessions、pat_tokens、users 均建在 **MySQL**（aiomysql 驱动已在依赖）；口令迁移=「users.json → MySQL users 表」一次性导表+双读过渡（legacy 识别逻辑不变），不再「重写 users.json」；审计 auth:* 事件与告警同库。

## 5 需求门记录（2026-09-23 · 4 角色投票）
🟥安全：✅（三条硬要求全部成 AC：默认关白名单/旋转 MUST/降级可见 p16）｜🟦研发：✅（双迁移分离入 AC-2.4；工作量与 v8 M/S/M 一致）｜🟫架构：✅（scopes 同源 AC-3.4；⑬ 解除条件明确）｜🟨产品：✅（裁定#4 背书可用性变化；401/403 二分记录在 AC-1.2 待议项）
**4/4 通过**。人审注：范围源自用户已过审 P0 行+裁定原话，无新自主裁决。
