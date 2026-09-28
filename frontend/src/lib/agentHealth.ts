/**
 * Agent 健康的两个口径 —— **各自具名，不得共用「健康」一词**（T-FIX-03 · F10）。
 *
 * 为什么需要这个文件：`AgentControlPlane.tsx` 里「健康」两个字同时压在两套**零交集**的取值域上，
 * 谁都没具名 —— 于是 v3 版的 `T-FIX-03` 把**生命周期**谓词接到了**探针行**上：那会让徽标永远红，
 * 而它的 grep 判据恰好被这次"改坏"所满足（假绿过关）。两个谓词各自具名之后，语义和判据一起被锁住
 * （行为判据见 `src/__tests__/agent-health-contract.test.tsx`）。
 *
 * ── `isAgentHealthy(status)` · **生命周期**口径 ─────────────────────────────────
 * 取值域 = `stores/agents.ts` 的 `Agent.status`：`running | standby`。
 * 规范源 = `.specs/capability-groups/DESIGN.md` 的「## 健康状态定义」节。
 *
 * ⚠️ **作用域声明**：本谓词定义的是**能力组概要**（`CapabilityGroupRow` 的 "N healthy / M total"）
 *   用的生命周期口径，**不覆盖探针判定**。把它作用在探针词表（见下）上**恒假** ——
 *   探针行要的是 `isProbeHealthy`。不写这一句，下一个人还会拿它去判探针行（上一个就是我）。
 *
 * ── `isProbeHealthy` / `isProbeUnhealthy` · **探针判定**口径 ─────────────────────
 * 取值域 = `stores/controlPlane.ts` 的 `AgentStatus.status`，即健康探针的落库状态：
 * `backend/services/agent_probe_service.py` 写 `healthy` / `degraded` / `unhealthy` /
 * `error` / `skipped` / `unknown`（页面 `getHealthLabel` 另外认得 `pass` / `fail` 两个
 * **后端不产出**的历史别名）。`AgentRow` 的「健康」徽标与概览的「健康 / 异常」卡用它。
 *
 * 两个口径的取值域**零交集**：`isAgentHealthy(x)` 与 `isProbeHealthy(x)` 不可能同时为真。
 */

/** 生命周期口径：Agent 是否处于生命周期意义上的健康运行态。 */
export function isAgentHealthy(status: string): boolean {
  return status === 'running' || status === 'standby';
}

/**
 * 探针判定口径：健康探针是否判 `healthy`。
 * 与 `AgentControlPlane.tsx:158-159` 原来的 `status === 'healthy'` **等值**（T-FIX-03 (b)：
 * 判定语义不得改变，只准等值改名）—— 因此这里**不含** `getHealthLabel` 里的 `pass` 别名。
 */
export function isProbeHealthy(status: string): boolean {
  return status === 'healthy';
}

/**
 * 探针判定口径的负向面，「异常」卡的组成之一。
 * 与 `OverviewCards` 原来的 `health === 'unhealthy'` **等值**（同上）。
 */
export function isProbeUnhealthy(status: string): boolean {
  return status === 'unhealthy';
}
