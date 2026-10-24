# SUMMARY: v20-wave2 — 波 2 单副本事实固化（P1-7 / P0-9）

- **Change ID**: v20-wave2
- **Task ID**: T-01…T-04（按 change 归并，逐任务见 `TASK.md`）
- **完成时间**: 2026-10-24（提交 `09950db4`）
- **AI 角色**: Dev
- **补记说明**: 7-integration 阶段补落（漂移 D4-1）

## 做了什么

把「只在单副本成立」的三处内存状态搬进数据库并加租约：调度队列 / 控制面限流 / 调和退避 / 监控偏移四类落库（迁移 007），任务租约 + 心跳（claim / heartbeat / requeue_expired），cron / watcher / reconcile 单例循环用**数据库租约选主**，删掉死代码 `engine/scheduler.py` 与进程内队列。P0-9 的「单副本承诺」写进 README，并加 `/api/control-plane/cluster` 与管控页集群条如实呈现。

## 改动文件（关键）

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/models/cluster.py`、`scheduler_queue.py` | 新增 | 四类状态表 |
| `backend/services/cluster_store.py` | 新增 | 队列/限流/退避/偏移 + 租约选主 |
| `backend/services/scheduler_service.py`、`runtime_watcher.py`、`engine/reconcile_loop.py` | 改写 | 走落库状态 + 租约 |
| `backend/engine/scheduler.py` | 删除 | 进程内队列死代码 |
| `backend/routes/control_plane_api.py`、`frontend/src/pages/AgentControlPlane.tsx` | 修改 | 集群条如实呈现 |
| `backend/tests/test_cluster_store.py` | 新增 | 租约/认领/回队/选主 |

## verify 输出（本轮复跑）

```text
$ 16 个波次相关模块同批：Ran 217 tests in 39.809s — OK（含 test_cluster_store）
$ cd frontend && npm run build → ✓ built in 15.08s
```

## 已知接受 + 理由

- **多副本仍非生产承诺**：四类状态已落库、单例循环有租约，但设计承诺仍是「单副本」（P0-9），多副本行为以 `/api/control-plane/cluster` 如实呈现为准。
