# TEST · v20-wave1（P0-1 / P0-2 / P0-3 全量）

> 环境：`/tmp/afvenv2`（`python -m venv` + 镜像源装 `requirements.txt`，含 `argon2-cffi 25.1.0`）

## 1. 新增单测（9 条，全绿）

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_passwords -v
test_roundtrip ... ok            test_salt_unique ... ok
test_format_is_self_describing ... ok   test_empty_inputs_are_false_not_crash ... ok
test_legacy_still_verifies ... ok       test_legacy_needs_rehash ... ok
test_upgrade_path ... ok                test_weak ... ok
test_generated_password_is_strong_and_random ... ok
Ran 9 tests in 2.7s — OK
```

抓到一个真实坑并修复：`hashlib.scrypt(N=2^15, r=8)` 恰好等于 OpenSSL 默认 `maxmem=32MiB` 上限，
不显式传 `maxmem` 直接 `ValueError: memory limit exceeded`（单测先红后绿）。

## 2. 全仓回归：与基线逐项对齐

```
# 基线（git worktree HEAD）
$ cd /tmp/afbase/backend && python -m unittest discover -s tests
Ran 190 tests — FAILED (failures=29, errors=12, skipped=6)

# 本改动
$ cd backend && python -m unittest discover -s tests
Ran 199 tests — FAILED (failures=29, errors=12, skipped=6)
```

**结论：新增 9 条全绿，红的数量与基线完全一致（0 新增红）**。这 41 条红是仓库既有债（mock 断言/文案漂移），不在本波范围。

## 3. 端到端（本轮解锁，之前装不上依赖跑不了）

```
[migrate] 已应用 5 个迁移: 001…005
账本行: ['001_agent_memories_domain_id', …, '005_scheduled_tasks']
迁移建表: ['agent_memories','knowledge_source_tags','knowledge_tags','scheduled_tasks']
[migrate] 无待应用迁移          ← 第二次 init_db 幂等
admin hash 前缀: $argon2id$ | must_change: True
正确口令校验: True | 错误口令校验(123456): False
```

## 4. P0-1 服务端会话（24 用例，全绿）

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_auth_sessions -v
TestIdentityChain: 缺失凭证=401 / X-User-Id 不再认证 / 登录写 HttpOnly cookie 且 /me 无哈希
                   / 登录错误泛化 / 坏 cookie=401 / 登出吊销 / 双到期 / 节流 429 / 禁用账号=403
TestMustChangePassword: 业务面 403 但 /api/auth/* 放行 / 弱口令 400 / 旧口令错 400
TestSessionRotation: 改密旋转 / 权限变更吊销目标会话 / 会话列表可撤 / 撤销他人=404
TestPat: Bearer 通过并按作用域鉴权、可吊销 / 拒绝无过期与非法 scope / 未知 PAT=401
TestDeploymentGate: 来源闸门保 CORS 头 / health 豁免 / debug 头三重 opt-in / 非 localhost 关闭
                     / lan 网段 / behind-proxy 只信 XFF 记审计
TestSessionService: cleanup 只删过期 / PAT 过期过滤
Ran 24 tests — OK
```

## 5. P0-3 部署模式与可信代理（14 用例，全绿）

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_deploy_guard -v
TestDeployValidate: 合法配置通过 / 非法 mode 响亮失败 / lan 无白名单 / lan 非法 CIDR
                    / behind-proxy 无可信代理 / '*' 拒绝 / FORWARDED_ALLOW_IPS='*' 且无 TLS
TestPeerGate: localhost 仅回环 / lan 网段 / behind-proxy 只收可信 peer
TestClientIp: 不可信 peer 忽略 XFF / 可信 peer 取右起首个非可信 / 全可信时取最左
TestCookieAndDebug: 无 TLS 退化 af_session / debug 头需 env∧localhost∧admit 三者同时成立
Ran 14 tests — OK
```

## 6. 全量回归与构建（10-24 复测）

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests -p 'test_*.py'
Ran 241 tests in 34.6s — FAILED (failures=29, errors=12, skipped=6)
  ↑ 与 P0-2 收口时基线同红（仓库既有债：mock 断言/文案漂移），本波 0 新增红

$ cd frontend && npm run build
✓ built in 16.53s

$ cd frontend && npx vitest run
Test Files 6 passed (6) · Tests 57 passed (57)
```
