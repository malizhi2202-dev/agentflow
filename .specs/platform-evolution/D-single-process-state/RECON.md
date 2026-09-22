# ② 竞品侦察

> 共享证据底座：`.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md` §2.3 / §2.7.3

## 1. 状态外置与租约：谁做了什么

| 对象 | 做法 | 证据 / 原话 |
|---|---|---|
| **Agno** | **锁宽限期 + 心跳** | `lock_grace_seconds` + 心跳机制 |
| **DBOS** | **最轻的持久化**：每 step 一次写，**无独立编排服务** | 官方定位「no separate orchestration server」 |
| **Temporal** | 最全的 durable execution（事件溯源 + 重放） | — |
| **Mastra** | **自陈局限**：多副本无分布式租约 | 官方自述 |
| **KEDA** | **自陈局限**：「缩容时无法控制终止哪个副本」 | 官方文档 |
| **Restate** | 事件驱动持久化 | ⚠️ License = **BSL 1.1**（非 OSI） |

**对本议题的启示**：
- 「多副本 + 长任务」是**公认难题**，连 KEDA 与 Mastra 都公开承认局限。
  所以 AgentFlow 的目标不应是「支持任意多副本」，而是**「状态可外置 + 有租约 + 明确写出局限」**。
- **DBOS 的「每步一次写」**是最小可行形态，比引入事件溯源引擎务实得多。

## 2. 迁移纪律：Multica 的样本（最值得学）

`docs/issue-status-lifecycle-rollout.md` 展示了一套生产级迁移纪律：

| 做法 | 原文要点 |
|---|---|
| **版本账本** | `schema_migrations` 表记录已应用版本；**跳过的迁移也会被记录** |
| **两段式约束** | `ADD CONSTRAINT ... NOT VALID` → 独立事务 `VALIDATE CONSTRAINT` |
| **锁与超时控制** | `SET lock_timeout = '2s'` / `SET statement_timeout = '10s'` |
| **fix-forward 策略** | 出问题不回滚，向前修复；**明确禁止**用旧迁移二进制或直接 `psql` 应用待定迁移 |
| **事务外执行** | runner 直接 `conn.Exec(ctx, string(sql))`，**无 Begin/BeginTx 包裹**——这是 `CONCURRENTLY` 能工作的前提 |
| **并发索引** | `CREATE INDEX CONCURRENTLY`（go-forward 规则；首个使用在 `035`，`001_init` 的 10 个索引均为非并发） |
| **部署顺序** | 「Deploy the backend before relying on the restriction」 |
| **不留隐患** | 一次性 DROP 14 张插件表（`344_plugin_v2_reset`），理由原文：「**never left its feature flag**」 |

**「果断推翻未验证设计」的范例**：Multica 一次性删除了 14 张插件表 + 每关系的 append-only revision log +
capability-snapshot compiler + per-task execution manifest，理由是这套设计**从未走出特性开关**。
→ 这对 AgentFlow 有直接意义：**不要为未验证的抽象付长期维护成本**。

## 3. 工程化交付：竞品的基线

| 对象 | CI / 构建 / 交付 |
|---|---|
| **Multica** | `make dev` 一条命令完成「创建 env、装依赖、初始化数据库、**跑迁移**、拉起全部服务」；官方自陈「**几乎每个工作日都发版**」；自部署支持 **Docker Compose 或 Helm**；镜像发布到 GHCR |
| **kagent** | CNCF Sandbox 项目，标准 K8s 交付 |
| **Google AX** | `ax apply -f` / `ax watch`，Go 项目标准工具链 |
| **agent-sandbox** | SIG Apps 子项目，K8s 标准 |

**共性**：**所有**被调研的活跃项目都有「一条命令跑起来」的入口与自动化质量门。
AgentFlow 当前 **`npm run build` 都失败**，且无 CI、无 Dockerfile、无 Makefile——
这是**采用摩擦**，不是内部整洁度问题。

## 4. 可借鉴清单

| # | 借鉴点 | 证据 | 对 AgentFlow 的落点 |
|---|---|---|---|
| 1 | 状态外置 + **锁宽限期 + 心跳** | Agno `lock_grace_seconds` | `task_leases(lease_until, heartbeat_at)` |
| 2 | **每步一次写**，不引入独立编排服务 | DBOS | 任务状态每次变更写一行 |
| 3 | 明确写出「多副本 + 长任务」的局限 | KEDA 官方承认缩容不可控 | 文档与界面写明 |
| 4 | 版本账本 + 跳过也记录 | Multica `schema_migrations` | 迁移框架必需项 |
| 5 | `NOT VALID` + 两段式验证 | 同上 | 加约束不锁表 |
| 6 | 迁移在显式事务外执行 | `cmd/migrate/main.go:996-998` | `CONCURRENTLY` 的前提 |
| 7 | fix-forward + 禁用旧二进制/裸 psql | 同上 | 运维纪律写进文档 |
| 8 | 一次性删除未走出特性开关的设计 | `344_plugin_v2_reset` 原文 | 避免为未验证抽象付长期成本 |
| 9 | `make dev` 一条命令跑通全部 | Multica README | 补 Makefile |
| 10 | 自部署支持 Compose / Helm | Multica SELF_HOSTING | 登记为议题 |
| 11 | **授权代码看起来有 ≠ 实际生效**（故须可执行验证） | kagent OSS authorizer 放行一切 | 权限点需配验证用例 |

## 5. 一条反向教训

**Multica 的 `done` 门只有提示词契约、服务端零校验**（已逐一核查 `"done"` 全部出现点）。
这与本议题的工程化主题同源：**「有代码」不等于「有效果」，「有构建脚本」不等于「能构建」**。
AgentFlow 的 `npm run build` 正是同构问题——脚本存在、契约存在、**但它必然失败**。
