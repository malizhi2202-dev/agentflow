# ① 头脑风暴

## 问题定义

本议题合并了同类根因的 4 组事实：**关键状态在内存**、**构建坏了**、**仓库卫生**、**迁移无账本**。
它们共同决定一件事：**别人能否跑起来、能否贡献、能否多副本部署。**

### A 组 · 三处关键状态在进程内存

| # | 位置 | 性质 |
|---|---|---|
| 1 | `services/scheduler_service.py:12,14` `self._queue = PriorityQueue()` / `self._task_labels: dict` | **实例内存** |
| 2 | `routes/control_plane_api.py:38` `_rate_limit_store: dict[...] = {}` | **模块级** |
| 3 | `engine/reconcile_loop.py:288` `_backoff_state: dict[int, dict] = {}` | **模块级** |

后果：**「自动路由 / 渐进扩容 / 自愈」在多进程或多副本下各自为政**——
两个副本各自持有一份队列与一份退避状态，同一实例可能被两个副本同时调和。
这不是性能问题，是**正确性问题**。

### B 组 · 没有可用的生产构建
`npm run build` = `tsc && vite build`，而 `npx tsc --noEmit | grep -c "error TS"` = **32**。
→ **`npm run build` 必然失败**，即项目当前没有可用的生产构建产物。
（`npx vite build` 可绕过类型检查，但那不是项目的构建契约。）

### C 组 · 仓库卫生
`git ls-files | wc -l` = **35,847**，其中 **`node_modules` 占 35,517**；真实代码仅 **273** 个。
`.gitignore` 存在（含 `node_modules`）但**历史提交已把它纳入跟踪**，所以规则不生效。
可观测证据：跑一次 dev server 后 `git status` 出现
`M frontend/node_modules/.vite/deps/_metadata.json`——**依赖缓存污染版本控制**。

### D 组 · 迁移无账本
`backend/database.py` 有 **3 条内联 `ALTER TABLE`**（`:46`、`:65`、`:69`），
无 migrations 目录、无版本账本、无回滚、无并发索引支持。

### E 组 · 无质量门与交付物
仓库根**无** `.github/workflows`、`Dockerfile`、`Makefile`、`LICENSE`、`pyproject.toml`。
即**没有任何一条自动化质量门**，也没有标准启动/构建入口。

## 发散：可选方案

### 方案 A · 状态外置到数据库 + 租约（**推荐**）
把队列、标签映射、退避、限流从内存搬到数据库，并引入**任务租约 + 心跳**。
- 优点：多副本成为可能；状态可观测、可恢复；重启不丢队列。
- 缺点：需要迁移框架支撑（D 组先做）；有性能成本（需索引与轮询/通知）。
- 判断：**是**。这是所有「K8s 式」主张的地基。

### 方案 B · 引入 Redis 做状态外置
用 Redis 存队列与限流。
- 优点：成熟、快。
- 缺点：**与「零外部依赖」核心主张直接冲突**（§1.4 明确不把 Redis 作为必需依赖）。
- 判断：**否（作为必需）**。可作为**可选加速项**保留——Redis 存在则用，不存在则回退数据库。

### 方案 C · 单副本 + 文档写明限制
不解决，只在文档与界面声明「必须单副本部署」。
- 优点：零成本。
- 缺点：放弃多副本能力，且「渐进扩容」在单副本下语义受限。
- 判断：**部分采纳**——**作为过渡必须做**（即 P0-9「先写明」），但不能作为终局。

### 方案 D · 引入外部工作流引擎（Temporal/DBOS 等）
- 判断：**否**。与零依赖冲突，且当前编排引擎（4 个模块）已够用，属过度改造。

### 工程侧方案（B/C/D/E 组）

| 组 | 方案 | 判断 |
|---|---|---|
| B | 修完 32 个 TS 错误，恢复 `npm run build` | **是**（否则 CI 无法建立） |
| B | 把 `build` 脚本改为 `vite build` 并在 CI 单跑 `tsc` | **否**——那是把类型检查降级为可选，属于降低质量门槛 |
| C | `git rm -r --cached node_modules` + 补全 `.gitignore` | **是**（低风险、高收益） |
| D | 引入迁移框架（版本账本 + `NOT VALID` 约束 + fix-forward） | **是** |
| E | 补 CI（先做「能跑通」的最小门：tsc + vitest + pytest） | **是** |
| E | 补 Dockerfile/Helm | **登记为议题**——先有 CI 再谈交付形态 |
| E | 补 LICENSE | **是**（无 LICENSE 等于默认保留全部权利，妨碍采用） |

## 关键设计约束

| 约束 | 来源 |
|---|---|
| **缩容时无法控制终止哪个副本**（长任务风险） | KEDA 官方承认 |
| **租约需带宽限期与心跳** | Agno `lock_grace_seconds` + 心跳 |
| **每步一次写、无独立编排服务**（最轻的持久化） | DBOS |
| **迁移在显式事务外执行**（`CONCURRENTLY` 的前提） | Multica `cmd/migrate/main.go:996-998` 直接 `conn.Exec`，无 Begin 包裹 |
| **`NOT VALID` 约束 + 两段式验证 + fix-forward** | Multica `docs/issue-status-lifecycle-rollout.md` |
| **不可解析就原样返回**（不得推断出更危险的一侧） | Multica `issuestatus.Effective()` |

## 初步判断

**A 组走方案 A（状态外置 + 租约）**，并以方案 C 作为过渡期的显式声明；方案 B 仅作可选加速。
工程侧按「**先让它能构建 → 再让它能被贡献 → 再谈多副本**」的顺序：
B 组（修构建）→ C 组（仓库卫生）→ E 组（CI + LICENSE）→ D 组（迁移框架）→ A 组（状态外置）。
**注意顺序**：A 组依赖 D 组，D 组依赖 B/C 组先把仓库弄干净——否则迁移脚本会淹没在噪声里。
