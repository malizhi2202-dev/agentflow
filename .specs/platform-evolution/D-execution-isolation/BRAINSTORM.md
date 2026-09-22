# ① 头脑风暴

## 问题定义

Agent 在**平台后端进程内**执行。可复现证据：
- 全后端**仅 `routes/git_safety.py` 使用 `subprocess`**（`:11`、`:18`）；无 `docker`/`container`/`nsjail`/`firejail`/`sandbox` 引用。
- 运行时适配器 4 个（`claude_code` / `codex` / `hermes` / `xiaolongxia`），**进程内调用**。
- **无守护进程、无 CLI**（`cli`/`bin`/`scripts` 目录均不存在）。

后果有三层，且严重程度递增：
1. **安全**：Agent 与平台共享进程与权限边界 → 提示注入可直达平台凭据与数据库。
2. **多租户**：无法在同一实例上安全承载互不信任的租户——这与「隔离域」的产品承诺直接冲突。
3. **能力**：无法跑不可信代码、无法限制出网、无法做资源硬限。

**关键认知**：隔离域（Domain）今天是**逻辑分组**（`models/domain.py` 仅 4 字段：id/name/owner_id/created_at），
**不是安全边界**。文档必须写明这一点——否则「隔离域」这个词会给人错误的安全感。

## 发散：可选方案

### 方案 A · 进程内 + 权限收敛（不改架构）
保持进程内执行，靠工具白名单、参数校验、`gate_registry` 门禁、凭据加密（AES-256-GCM）降低风险。
- 优点：零架构改动，今天就能做。
- 缺点：**不构成安全边界**。同进程内一次逃逸即全量失守；无法做资源与网络硬限。
- 判断：**部分采纳**——作为过渡期的缓解，但**必须同时写明「这不是隔离」**。

### 方案 B · 子进程 + 系统级约束（seatbelt/bubblewrap/AppArmor）
用 `subprocess` 拉起 Agent，靠 OS 级沙箱与 ulimit 限制。
- 优点：比进程内有实质边界；无需容器运行时。
- 缺点：平台绑定 POSIX；跨平台（Windows）无解；逃逸面仍大于虚拟化。
- 判断：**否**。与「零外部依赖、跨平台可跑」的产品主张冲突。

### 方案 C · 委托 RuntimeClass 式抽象（**推荐**）
**不自建沙箱**，只定义「隔离委托接口」：把执行委托给外部沙箱运行时（容器 / microVM / gVisor / Kata），
平台侧保留抽象与能力协商。参照 `kubernetes-sigs/agent-sandbox` 的定位原话：
「Agent Sandbox is a *sandbox orchestrator*. It **delegates low-level container isolation** to secure
'Sandbox Runtimes'… via RuntimeClass」——**只编排、不放隔离**。
- 优点：不押注某一种沙箱技术（业界路线分裂：Firecracker / Cloud Hypervisor / libkrun / gVisor / Kata，
  **无事实标准**）；保留「零依赖单机可跑」的降级路径（无沙箱时退化为方案 A 并**明确告警**）。
- 缺点：需要抽象设计；单机模式下仍无强隔离。
- 判断：**是**。这是唯一同时满足「可演进」与「不破坏零依赖」的方案。

### 方案 D · 守护进程模型（Agent 跑在用户机器上）
参照 Multica：守护进程跑在用户机器/云主机上，**代码不出门**；平台通过长连接下发任务。
- 优点：数据不外流这一条有独特价值；可复用用户机器上已登录的 26 种 CLI。
- 缺点：需要长连接、令牌族、在线状态、任务租约——**依赖 S4（状态外置 + 租约）先落地**。
- 判断：**登记为议题**。不是本轮范围，但与 S4 强耦合，应在 S4 的表结构里预留。

## 关键设计约束

| 约束 | 来源 |
|---|---|
| **不得把「逻辑分组」说成「安全边界」** | OpenHands「A separate conversation **is not** a security boundary」；Roomote「**do not use Docker sandboxes as a multi-tenant isolation boundary**」（即连容器都不够） |
| **凭据不进 Agent 可达范围** | kagent「凭据在 agent 触及范围外注入」；Multica「Credentials are intentionally absent from this wire type」+ 任务级短令牌按需拉取 |
| **出网默认拒绝** | kagent `EgressPolicy` 默认拒绝、first-match-wins、身份用客户端证书里的 **SPIFFE ID** |
| **无法判断时不得推断出更危险的一侧** | Multica `issuestatus.Effective()`「不可解析就原样返回」与 `dispatch/reason.go` 的枚举安全，同一哲学 |

## 初步判断

**主推方案 C（委托式抽象）**，方案 A 作为无沙箱环境的显式降级（并告警），方案 D 登记为议题。
无论选哪个，**第一件事都是把「当前无隔离」写进产品文档与界面**——这是本次调研中最容易被
过度承诺掩盖的事实。
