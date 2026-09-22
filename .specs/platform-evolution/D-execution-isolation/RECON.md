# ② 竞品侦察

> 共享证据底座：`.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md` §2.7.4

## 1. 沙箱技术路线：**分裂，无事实标准**

| 对象 | 隔离粒度 | 冷启动（官方口径） | 持久化 | License | stars |
|---|---|---|---|---|---|
| **Firecracker** | microVM（硬件虚拟化） | **Boot <125ms；150 microVMs/s/host** | microVM 快照 | Apache-2.0 | **37k** |
| **gVisor** | application kernel（per-sandbox 应用内核，**非 seccomp、非 runC wrapper**） | — | n/a | Apache-2.0 | **19k** |
| **E2B** | microVM（docs 未直写 Firecracker，已标注证据强度） | 未找到官方数值 | **强**：pause 存 **FS + 内存**（进程/变量存活），「kept indefinitely」；503 时不丢状态 | Apache-2.0 | 13,894 |
| **Daytona** | **每沙箱独立内核**（dedicated kernel），OCI/Docker 兼容 | **<90ms** | snapshots、「unlimited persistence」 | **AGPL-3.0** ⚠️ | 71,740 |
| **Modal Sandboxes** | **gVisor**（原文「prevent Sandboxes from making malicious system calls」） | 未找到 | FS 30 天 / Directory 30 天 / **Memory 7 天** | 平台闭源 SaaS | 515（client） |
| **Cloudflare Sandbox SDK** | **VM 级**（「Each container instance runs inside its own VM」） | 未找到 | Durable Objects 强一致；**sandbox ID 可存活于 container 之外** | SDK 开源 | 1,138 |
| **Northflank** | microVM（「Kata Containers **or** gVisor」） | 「sub-second… under a second」 | **强**：4GB→64TB、可并排跑 Redis/PG/Mongo | 专有商业 | n/a |
| **Fly.io Machines** | microVM（Firecracker） | 「subsecond speeds」 | Volumes | 商业 | — |
| **microsandbox** | 自托管 microVM | — | — | Apache-2.0 | 8,306 |

**结论**：Firecracker / Cloud Hypervisor / libkrun / gVisor / Kata **五条路线并存**。
`iii`（原 Motia）的 `iii-sandbox` 官方博客明确倾向 **libkrun 而非 Firecracker**。
→ **不该押注单一技术**，应做委托式抽象。

## 2. 控制面赛道如何处理隔离

| 项目 | 隔离做法 | 关键原话/证据 |
|---|---|---|
| **kagent** | ⚠️ **非沙箱产品**，靠 namespace + 运行时 | kagent 1.x 的 `Harness` 指定 workload 与 WorkerPool |
| **Google AX** | microVM/gVisor + `Gateway` 出口白名单 | 凭据在 Agent 触及范围外注入；**但 RBAC/审计/配额无公开证据** |
| **Google Agent Substrate** | microVM（Cloud Hypervisor）/ gVisor + 出口代理注入凭据 | 「not an officially supported Google product」 |
| **agent-sandbox** | ✅ **只编排、不放隔离**，委托 RuntimeClass | 「Agent Sandbox is a *sandbox orchestrator*. It **delegates low-level container isolation** to secure 'Sandbox Runtimes'… via RuntimeClass」 |
| **Multica** | ✅ **用户机器上的守护进程**，代码不出门 | 「它们的『工位』就是你的机器——守护进程跑在你的笔记本或云主机上，**代码不出门**」 |

## 3. 三个可直接照搬的隔离机制

### 3.1 出口默认拒绝 + 工作负载身份（kagent）
`EgressPolicy` **默认拒绝**、first-match-wins、≤256 条规则、**身份用客户端证书里的 SPIFFE ID**。
→ 对 AgentFlow：`Domain` 可承载 `egress_policy`，身份从「进程」升级为「工作负载身份」。

### 3.2 凭证不进 Agent 可达范围（Multica，机制最完整）
- `Connection` 类型**刻意不含凭证**（`pkg/remotemcp/types.go:20-22`：「Credentials are intentionally absent from this wire type」）
- daemon 在 dial 时凭**任务级 24h 短令牌**按需拉取；令牌只存 hash
- plugin secret **独立成表**，使存储读路径**在类型层面够不到**
- agent 的 `mcp_config` 读侧一律 `redactMcpConfig` 置 null，**owner/admin 也不绕过**

### 3.3 「安装 ≠ 授权」（Multica）
对「MCP server 自己决定工具列表」这一本质风险的正面回答：
- 发现**只读不采纳**（`DiscoverMCPHookTools`）
- **管理员审批才算 grant**
- 工具名 + `sha256(inputSchema)` **双 pin**，漂移即停止调用并报 `-32004 "schema changed and requires review"`
- 前端区分 `approved` 与 `drifted` 两种状态

## 4. 一条必须引用的诚实边界

> Roomote：「**do not use Docker sandboxes as a multi-tenant isolation boundary**」
> OpenHands：「**A separate conversation is not a security boundary**」

即：**连容器级沙箱都不足以构成多租户隔离边界**。这条决定了 AgentFlow 在文档里能承诺什么、
不能承诺什么——`Domain` 今天连容器都不是，**绝不能被称为安全边界**。

## 5. 可借鉴清单

| # | 借鉴点 | 证据 | 落点 |
|---|---|---|---|
| 1 | 委托式隔离抽象（RuntimeClass 思路） | agent-sandbox 定位原话 | `IsolationProvider` 接口 + 能力协商 |
| 2 | 出口默认拒绝 + 规则上限 | kagent `EgressPolicy`（默认拒、≤256 条） | `domain.egress_policy` |
| 3 | 工作负载身份（SPIFFE） | kagent 同上 | 从进程身份升级为工作负载身份 |
| 4 | 凭据不进 Agent 可达范围 | Multica（三处机制） | 任务级短令牌 + 类型层隔离 |
| 5 | 发现只读、审批即授权、schema digest pin | Multica | 工具/MCP 接入流程 |
| 6 | 预热池 + 「峰值并发沙箱数」为容量单位 | agent-sandbox `SandboxWarmPool`；OpenHands peak concurrent sandboxes（每沙箱 0.5 vCPU/4 GiB） | 容量规划口径 |
| 7 | **明确声明「这不是安全边界」** | Roomote / OpenHands 原文 | 产品文档与界面文案 |
