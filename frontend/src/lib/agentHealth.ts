/**
 * Agent 健康的两个口径 —— **各自具名，不得共用「健康」一词**（T-FIX-03 · F10）。
 * 另含**探针判定词表的唯一来源**（配色 / 文案 / 排序优先级），见文件后半（T-FIX-16 (b) 搬入）。
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
 * ── 探针判定口径（`isProbe*` 谓词 + 词表常量）────────────────────────────────────
 * 取值域 = `stores/controlPlane.ts` 的 `AgentStatus.status`，即健康探针的落库状态：
 * `backend/services/agent_probe_service.py` 写 `healthy` / `degraded` / `unhealthy` /
 * `error` / `skipped` / `unknown`（`getHealthLabel` 另外认得 `pass` / `fail` 两个
 * **后端不产出**的历史别名）。
 *
 * 两个口径的取值域**零交集**：`isAgentHealthy(x)` 与 `isProbeHealthy(x)` 不可能同时为真。
 *
 * **本模块是探针词表的唯一来源**（T-FIX-16 (b)）：词表曾经在三个地方各写一遍
 * （`AgentControlPlane` 一份、`AgentProbePanel` 的 `HealthBadge` 一份 `{healthy,warning,error,unknown}`、
 * `AgentProbePanel` 的 `StatusBadge` 一份 `{active,idle,error,stopped}`），后两份都与后端真实
 * 词表对不上 ⇒ `degraded`/`unhealthy`/`skipped` 显示不出中文、`warning` 永不出现。前两份已在本卡合并到这里。
 * ⚠️ `AgentProbePanel.tsx` 的 `StatusBadge` 那份**尚未收口**（它键在 `active/idle/stopped`，
 * 与「活跃 / 空闲」计数同源，归 `T-FIX-17` 等人拍）—— 见 `TEST.md` 的 O-19 后半。
 */

/** 生命周期口径：Agent 是否处于生命周期意义上的健康运行态。 */
export function isAgentHealthy(status: string): boolean {
  return status === 'running' || status === 'standby';
}

/**
 * 探针判定口径：健康探针是否判 `healthy`。
 * 与 `AgentControlPlane.tsx` 原来的 `status === 'healthy'` **等值**（T-FIX-03 (b)：
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

/**
 * 探针判定口径的「错误」面：探针判 `error`（与 `unhealthy` 是两个词，文案也不同 —— 见 `getHealthLabel`）。
 * 与 `AgentProbePanel` 原来 `probe.status === 'error'` 的**真**那半支等值（另一半 `probe.health === 'error'`
 * 是幽灵读，已在 T-FIX-16 (a) 摘掉）。存在的理由 = 让组件里**不再出现裸词表字面量**
 * （T-FIX-16 (a)：「消费具名谓词…而不是再写内联比较」）。
 */
export function isProbeErrored(status: string): boolean {
  return status === 'error';
}

/** 探针判定词表的**唯一文案源**（T-FIX-16 (b) 自 `AgentControlPlane.tsx` 搬入）。 */
export function getHealthLabel(status: string): string {
  if (status === 'healthy' || status === 'pass') return '健康';
  if (status === 'degraded' || status === 'fail') return '降级';
  if (status === 'unhealthy') return '异常';
  if (status === 'error') return '错误';
  if (status === 'skipped') return '未探测';
  // `unknown` 是后端**真实产出**的词（`agent_probe_service.py` 把认不出的探针响应归为它），
  // 而它原来落到下面那句 fallback ⇒ 把英文原样吐给用户（`getHealthLabel('unknown') === 'unknown'`）。
  // T-FIX-16 的验收①要求这一格是「未知」⇒ 补一句显式映射（同时也修掉 `AgentControlPlane` 两处同样的英文泄漏）。
  if (status === 'unknown') return '未知';
  return status || '未知';
}

/**
 * 探针判定词表的**唯一配色 / 排序源**（T-FIX-16 (b) 自 `AgentControlPlane.tsx` 搬入）。
 *
 * 键集 = 后端真实产出的六个探针状态，与 `stores/agents.ts` 的生命周期词表（`running/standby`）
 * **零交集** —— 两个词表各自具名正是 F10 的处置，合并回一张表就是把病根种回去。
 * `priority` 越小越靠前（越需要人看一眼的越靠前）。文案不在这张表里 ——
 * label 一律取自 `getHealthLabel`，免得两处漂移。
 */
export const PROBE_STATUS: Record<string, { color: string; bg: string; priority: number }> = {
  healthy:   { color: 'var(--green)',      bg: 'var(--green-bg)',  priority: 4 },
  degraded:  { color: 'var(--orange)',     bg: 'var(--orange-bg)', priority: 1 },
  unhealthy: { color: 'var(--red)',        bg: 'var(--red-bg)',    priority: 0 },
  error:     { color: 'var(--red)',        bg: 'var(--red-bg)',    priority: 0 },
  skipped:   { color: 'var(--text-muted)', bg: 'var(--bg-input)',  priority: 3 },
  unknown:   { color: 'var(--text-muted)', bg: 'var(--bg-input)',  priority: 2 },
};

/**
 * 探针状态 → `{color, bg, label}`。`AgentControlPlane` 的「运行状态」列 / 详情面板与
 * `AgentProbePanel` 的「健康度」徽标**共用这一个**（T-FIX-16 (b)：徽标不再自带第 3 张词表）。
 * 词表外的值落中性配色并把原值当 label（保持既有 fallback 语义）。
 */
export function getStatusConfig(status: string): { color: string; bg: string; label: string } {
  const style = PROBE_STATUS[status];
  if (!style) return { color: 'var(--text-muted)', bg: 'var(--bg-input)', label: status || '未知' };
  return { color: style.color, bg: style.bg, label: getHealthLabel(status) };
}
