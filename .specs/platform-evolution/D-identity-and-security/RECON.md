# ② 竞品侦察

> 共享证据底座：`.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md`
> Multica 的 RBAC/HITL 部分经其子代理一手复验（含 1 处更正、1 处弱化）。

## 1. Multica 的身份与鉴权模型（最完整参照）

### 1.1 动作者来源必须服务端盖章
`middleware/auth.go:62-84` 先 `Del("X-Actor-Source"/"X-Agent-ID"/"X-Task-ID")`，
**仅 `mat_` 分支重写**（`:126-135`）；daemon 链同理（`daemon_auth.go:82-98`）。
→ 客户端提交的身份头一律先剔除，再由可信分支写入。**AgentFlow 直接照搬这一条即可消除身份伪造。**

### 1.2 机器凭证门：显式 denylist + **刻意 fail-open**
`handler/actor_guards.go:86-120` 原文：
> 「The denylist below is **intentionally explicit** — **silently passing an unknown actor source is a feature, not a bug**… but the addition of a new value is the moment to decide whether it's human-equivalent or machine-equivalent.」

实现只拦两个值：`case "task_token", "cloud_pat": return true; default: return false`。
配套治理规则（`:88-92`）：
> 「any new machine-credential auth branch added to `auth.go` **MUST stamp a distinct `X-Actor-Source` value AND get reviewed against this gate at the same time**」

**准确表述**：这是「已知机器来源 denylist，未知默认人类等价」，安全性由**代码评审纪律**保证，
而非 fail-closed 默认。这是一条有意识的取舍——对 AgentFlow 的启示是：
若采用同类设计，**必须把纪律写进 CLAUDE.md/AGENTS.md 并加测试**，否则它是隐性漏洞。

### 1.3 看 / 跑双谓词拆分（重要模型）
- `canAccessPrivateAgent`（`handler/agent_access.go:145-167`）——「**看**」：agent actor 恒通过、owner 通过、**workspace owner/admin 通过**
- `canInvokeAgent`/`invokeAgentDecision`（`:73-133`）——「**跑**」：private 恒 deny，**无 admin bypass、无 A2A bypass**

即 **admin 的特权只存在于「看见」侧，不存在于「触发」侧**。

其**真实理由**（`migrations/130_agent_invocation_permission.up.sql:7-10` 原文，比规则本身更有说服力）：
> 「private -> only the agent owner may invoke. **Workspace admin does NOT bypass this any more (that was the privacy hole described in the issue: an admin could invoke someone's private agent and read their mailbox via that agent's Composio connections).**」

具体越权路径：**admin → 触发他人 private agent → 该 agent 的 Composio 连接以属主身份读属主邮箱**。

### 1.4 同一不变量双点校验（MUL-2600）
`middleware/workspace.go:208-220` 原文注释：
> 「Final task-token binding check: even when the workspace was resolved from a chi URL parameter… **This is the catch-all behind resolveWorkspaceUUID's earlier check.** MUL-2600.」

强制「URL 里的 workspace == 令牌里钉死的 workspace」，不等即 403。
`workspace.go:229-232`：成员查询失败一律返回 **404**「workspace not found」而非 403。

**6 级 workspace 解析优先级**（`workspace.go:47-95`，单点真相）：
task-token 绑定 → context → `X-Workspace-Slug` → `?workspace_slug` → `X-Workspace-ID` → `?workspace_id`。

### 1.5 第二条通道独立重新授权
`cmd/server/scope_authorizer.go:96-101` 原文：
> 「Chat sessions are private to their creator… **The realtime layer must not weaken this**: otherwise any workspace member who learns a session_id could subscribe to `chat:message` / `chat:done` / `chat:session_read` for a peer's private chat.」

### 1.6 审计不可用时不降级放行
`handler/agent_env.go:156-168`（**写失败则拒绝返回明文**）、`:244-256`（**写失败则回滚更新**）。
审计写入点按事件监听：`created` / `status_changed` / `assignee_changed` / `task_completed` / `task_failed`（**actor 强制为 agent**）等。

### 1.7 「状态收敛才是主防线」
`workspace_revoke.go:32-37` 原文：
> 「even if the daemon races back online with a still-valid PAT, it finds no agent it can run for, no queued task to claim, and the dispatcher… won't hand it new work — and the member-row deletion in the same tx means subsequent requireWorkspaceMember checks will reject… with **404**」

即：**吊销令牌是纵深防御，同事务的状态收敛（归档 agent + 取消任务 + 强制离线）才是主防线。**

### 1.8 Multica 也有的能力缺口（避免误学）
- **无通用 permission / role_permission 表或权限枚举**——后端是一组散落的具名谓词
- **无 `review_gate` / `approval_gate` / `pending_approval`**（全仓 0 命中）
- **无 issue 状态机「允许迁移表」**（`invalid transition` / `allowedTransition` 全仓 0 命中）
- **PAT 无 scope 列**（`migrations/011:1-11`）＝**完整用户身份**，不是受限令牌
- 前端 `packages/core/permissions/rules.ts:11-20` **显式声明自己是 Go gate 的镜像**——
  这条「双端镜像 + 显式声明」反而是值得学的纪律

## 2. kagent 的授权模型（一个必须警惕的反面案例）

kagent 的 OIDC proxy + `AuthorizationScope`（ALL / NONE / ANY_OF + namespace/name 谓词）设计完整，
**但其官方明确警告：开源版内建 authorizer 对每个检查都放行**（RBAC 实际是企业版门禁），
并提醒不要把 8083 端口暴露到集群外。

→ **启示**：授权代码「看起来有」不等于「实际生效」。AgentFlow 的 6 个权限点有真实生效逻辑
（`has_permission`：admin 豁免、user 只看 `custom_permissions`），这是相对优势，
**应当写进文档并配可执行的验证用例**，而不是默认读者相信。

## 3. 可借鉴清单

| # | 借鉴点 | 证据 | 对 AgentFlow 的落点 |
|---|---|---|---|
| 1 | 身份头先 `Del` 再由可信分支重写 | `middleware/auth.go:62-84` | 彻底消除 `X-User-Id` 伪造 |
| 2 | 看 / 跑双谓词拆分 | `agent_access.go:73-167` | 「能被指派」≠「能执行」 |
| 3 | admin 不越权访问私有资源，并写明**具体越权路径** | `migrations/130:7-10` | 文档里写「为什么」而非只有「是什么」 |
| 4 | 同一不变量双点校验 + 注释说明「不假设前一处覆盖全部入口」 | `workspace.go:208-220` | 域归属校验做两次 |
| 5 | 越权与不存在统一 404 | `workspace.go:229-232` | 防状态码探测 |
| 6 | 第二条数据通道独立鉴权 | `scope_authorizer.go:96-101` | SSE `/api/runtime/stream` 需同款 |
| 7 | 审计不可用时不降级放行 | `agent_env.go:156-168,244-256` | fail-closed |
| 8 | 吊销令牌是纵深防御，状态收敛是主防线 | `workspace_revoke.go:32-37` | 用户停用应同事务处置其 Agent 与任务 |
| 9 | 单点真相的解析优先级表（6 级） | `workspace.go:47-95` | 域/项目解析集中一处 |
| 10 | 前端权限规则显式声明是后端镜像 | `packages/core/permissions/rules.ts:11-20` | 前端 109 处权限判断需此纪律 |
