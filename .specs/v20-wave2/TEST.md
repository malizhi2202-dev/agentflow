# TEST · v20-wave2

## 1. 新增单测：跨进程状态（23 条，全绿）

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_cluster_store -v
TestTaskQueue: 入队跨 session 可见 / 重复入队幂等 / 优先级+FIFO 排位 / 领取只给一次
               / 过期租约可被重领(attempts+1) / 续租只认持有者 / 结束移出活跃
               / 按 label+domain 计数 / complete_oldest 按 FIFO 消费 / requeue_expired
TestRateLimit: 超限即拒 / scope 独立 / 窗口切换归零 / reset+truncate / 跨 session 共享
TestReconcileBackoff: 1s→2s 递增 / 超 3 次暂停 / 成功与人工恢复清零 / 跨 session 可见
TestLeaderLease: 单持有者 / 到期被接管 / release 后可被接管 / list 标 active
TestWatcherOffset: 偏移读写 + 默认 0
Ran 23 tests — OK
```

每个用例一个内存 SQLite；「换一个 SessionLocal」即模拟「换一个副本」。

## 2. 迁移 007（旧库 → 新形状，幂等）

```
applied: ['001…006', '007_cluster_state']
cols: id, task_id, label, domain_id, agent_id, priority, score, status,
      enqueued_at, started_at, attempts, lease_owner, lease_expires_at,
      heartbeat_at, finished_at
rows: 旧行原样保留（task_id=t-old, priority=60, status=queued）
again: []        ← 幂等
rate_limit_windows / reconcile_states / cluster_leases / runtime_watcher_offsets: True
```

## 3. 全量回归与前端

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests -p 'test_*.py'
Ran 264 tests in 34.8s — FAILED (failures=29, errors=12, skipped=6)
  ↑ 与波 1 收口时基线同红（仓库既有债），本波 0 新增红

$ cd frontend && npx tsc --noEmit   → 0 错误
$ cd frontend && npm run build      → ✓ built in 19.95s
$ cd frontend && npx vitest run     → 6 files / 57 tests passed
```
