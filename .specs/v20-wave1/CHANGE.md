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
| P0-1 | 会话：服务端 token + `sessions` 表（只存哈希）+ `__Host-session` cookie；解析序 cookie > Bearer PAT > 401；删三处 fail-open | 下一轮 |
| P0-3 | 部署：`DEPLOY_MODE` + `TRUSTED_PROXY_IPS` + 反代后闸门；CORS 提到最外层 | 再下一轮 |

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
