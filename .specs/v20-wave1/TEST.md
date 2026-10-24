# TEST · v20-wave1（P0-2 部分）

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
