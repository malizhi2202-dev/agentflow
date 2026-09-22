# ③ 结论与建议

## 结论

**本议题是全部 5 个子议题中唯一的「地基」——其余四项的落地都依赖它。**
理由：状态不外置，多副本就不可能（S2 的守护进程模型、S1 的团队级配额都要求多副本）；
构建不修复，任何自动化质量门都建立不起来（也就无法安全地做 S1/S3 的大改造）。

**执行顺序是硬约束**，不是偏好：
```
修构建(B) → 仓库卫生(C) → CI + LICENSE(E) → 迁移框架(D) → 状态外置 + 租约(A)
```
把 A 提到前面会让迁移脚本淹没在 35,517 个 `node_modules` 文件的噪声里。

## 建议（按执行顺序）

### C1 · 修复前端构建 `P0` 难度：低
修完 **32 个 TS 错误**，恢复 `npm run build`（`tsc && vite build`）通过。
- **不接受**「把 build 改成只跑 vite」的绕过方案——那是把类型检查从契约降级为可选。
- 32 个错误分布在 `ProjectDetail.tsx` / `ProjectManager.tsx` / `ToolMarket.tsx` /
  `WorkflowCreate.tsx` / `AgentBuilder.tsx` / `src/__tests__/frontend-edge-cases.test.tsx`。
- **为何是 P0**：这是「项目当前没有可用的生产构建」——不是代码风格问题。

### C2 · 仓库卫生 `P0` 难度：低
- `git rm -r --cached frontend/node_modules`（及任何其他被误纳入的依赖目录），补全 `.gitignore`。
- 目标：`git ls-files | wc -l` 从 **35,847** 降到约 **273**（真实代码规模）。
- **为何是 P0**：`git status` 被 Vite 缓存污染（`M frontend/node_modules/.vite/deps/_metadata.json`），
  直接影响「能否贡献」——任何 PR 都会带噪声。

### C3 · 补 CI 与 LICENSE `P0` 难度：低
- 最小 CI：`tsc --noEmit` + `npx vitest run` + 后端 pytest（现有 52 个前端测试与 8 个后端测试文件已可跑）。
- 补 `LICENSE`：当前无 LICENSE 等于**默认保留全部权利**，妨碍采用与贡献。
- **不追求一次做全**：先做「能跑通」的门，再逐步加严。

### C4 · 引入迁移框架 `P1` 难度：中
替代 `backend/database.py` 的 3 条内联 `ALTER TABLE`。必备能力：
1. **版本账本**（跳过的迁移也要记录）；
2. **`NOT VALID` 约束 + 两段式验证**（加约束不锁表）；
3. **迁移在显式事务外执行**（`CONCURRENTLY` 的前提）；
4. **fix-forward 纪律**写入文档（禁用旧二进制、禁用裸 `psql` 应用待定迁移）。
- 参照 Multica `docs/issue-status-lifecycle-rollout.md` 的完整纪律。

### C5 · 状态外置 + 任务租约与心跳 `P1` 难度：中 —— **地基**
- 外置对象：调度队列与标签映射（`scheduler_service._queue`/`_task_labels`）、
  控制面限流（`control_plane_api._rate_limit_store`）、调和退避（`reconcile_loop._backoff_state`）。
- 引入 `task_leases(instance_id, lease_until, heartbeat_at, owner_replica)`：
  **租约带宽限期 + 心跳续期**（照搬 Agno `lock_grace_seconds` 思路）。
- 采用 **DBOS 的「每步一次写」**形态，**不引入**独立编排服务或事件溯源引擎。
- **明确写出局限**：租约过期判定本身有时钟与网络不确定性；「多副本 + 长任务」是业界公认难题
  （KEDA 官方承认缩容时无法控制终止哪个副本）。**不要把「支持多副本」写成无限承诺。**

### C6 · 单副本限制的显式声明 `P0` 难度：低（可立即做）
在 C5 完成前，**必须**在文档与界面写明「当前必须单副本部署」及其原因（三处内存状态）。
- **为何与 C5 同列为 P0**：写明成本近乎为零，而不写明的代价是使用者按多副本部署后
  遭遇静默的重复调和与状态不一致。

### C7 · 启动入口统一 `P1` 难度：低
补 `Makefile`，提供一条命令完成「建虚拟环境 / 装依赖 / 建库 / 跑迁移 / 拉起前后端」
（参照 Multica `make dev`）。当前 README 只有分步命令。

### C8 · 交付形态（Docker/Helm） `P2` 难度：中
**登记为议题**。先有 CI 与统一入口，再谈容器化与编排交付。

## 明确不做（本轮）

- **不把 Redis 作为必需依赖**（方案 B）：与 §1.4「零外部依赖」直接冲突。
  保留为**可选加速项**（存在则用、不存在回退数据库）。
- **不引入 Temporal/DBOS 作为外部引擎**（方案 D）：属过度改造，当前编排引擎已够用；
  只借用 DBOS 的「每步一次写」形态。
- **不用「改 build 脚本」绕过类型错误**：降低质量门槛。
- **不承诺无限多副本**：租约机制有固有不确定性，须写明局限。

## 与路线图的对应

本结论 = 产品文档 §1.6 **P0-4（构建）/ P0-5（仓库卫生）/ P0-8（迁移）/ P0-9（单进程声明）/
P1-7（状态外置 + 租约）/ P2-7（工程化交付）** + §1.6.5 纪律②（同一不变量双点校验）。
