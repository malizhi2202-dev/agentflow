# TASK · v20-wave2

## T-01 / P1-7 状态外置 + 租约心跳（完成）

- **files**：`backend/services/cluster_store.py`(新) · `backend/models/cluster.py`(新) · `backend/models/scheduler_queue.py`(重写) · `backend/models/__init__.py` · `backend/migrations.py` · `backend/config.py` · `backend/tests/test_cluster_store.py`(新) · `backend/services/{scheduler_service,k8s_routing_service,session_service,runtime_watcher}.py` · `backend/engine/reconcile_loop.py` · `backend/routes/{control_plane_api,orchestration_api}.py` · `backend/main.py` · 删除 `backend/engine/scheduler.py`
- **verify**：
  - `/tmp/afvenv2/bin/python -m unittest tests.test_cluster_store -v` → 23 用例全绿
  - 迁移 007 在「旧形状库」上整表重建并幂等（第二次返回 `[]`），四张新表齐
  - 全仓回归 264 用例 → 29F/12E/6S（与波 1 收口基线同红，0 新增红）
- **done 判据**：AC-2.1…2.11 全绿

## T-02 / P0-9 单副本事实书面化（完成）

- **files**：`backend/routes/control_plane_api.py`（`/cluster`）· `README.md`（副本与单例循环 + 3 项 env）· `frontend/src/stores/controlPlane.ts` · `frontend/src/pages/AgentControlPlane.tsx` · `frontend/src/components/SchedulerConfig.tsx`
- **verify**：
  - `npx tsc --noEmit` → 0 错误；`npm run build` → 通过；`npx vitest run` → 57/57
  - `/api/control-plane/cluster` 返回 `instance_id / leases / queue / process_local`
- **done 判据**：AC-2.12 / AC-2.13 全绿
