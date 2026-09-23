// 能力分组（capability groups）的唯一前端规则 —— 纯函数，无 React / store 依赖，可直接 unit。
//
// 从 `AgentControlPlane.tsx:585-605` 的内联派生抽出（T-FIX-05 · F11），并按 F18 接上
// 与后端**同一条具名归一规则**：`backend/services/capability_service.py::capabilities_of`
// （T-FIX-02 建立，签名与语义见 TASK.md「T-FIX-02 action」与 REVIEW.md F17）。
// TS 与 Python 不可能共享一份运行时实现，所以「单一真相」在这里的可执行含义是：
// **两端各自只有一处定义，且语义逐条对齐** —— 改一边不另一边就是新 bug。
// 语义清单（两端必须一致）：非字符串丢弃 → `strip()` → 折叠连续空白 → 空/纯空白丢弃 → 按序去重。
// 大小写不折叠（`casefold()` 由产品拍，未拍之前两端都不做，避免前端先漂）。

/** 无 capability（或全部被归一丢弃）的 Agent 归入的组名，与后端字面量一致。 */
export const UNGROUPED_LABEL = '未分类';

/** `groupByCapability` 对元素的最小要求：只读 `model_config_json`，故任何带该字段的对象都可分组。 */
export interface CapabilityCarrier {
  model_config_json?: unknown;
}

function capabilitiesField(config: unknown): unknown {
  if (typeof config !== 'object' || config === null) return undefined;
  return (config as { capabilities?: unknown }).capabilities;
}

/**
 * 具名归一规则（对齐后端 `capabilities_of`）：取 `model_config_json.capabilities`，
 * 过滤非字符串 / 空串 / 纯空白，`strip()` + 折叠连续空白，按序去重。
 */
export function capabilitiesOf(agent: CapabilityCarrier | null | undefined): string[] {
  const raw = capabilitiesField(agent ? agent.model_config_json : undefined);
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;                  // 非字符串（数字 / null / 对象）
    const normalized = item.trim().replace(/\s+/g, ' ');     // strip + 折叠连续空白
    if (!normalized) continue;                              // 空串 / 纯空白 → 视作无能力
    if (out.indexOf(normalized) === -1) out.push(normalized); // 归一后按序去重
  }
  return out;
}

/**
 * 组键（`域 key : 归一后的能力名`）。折叠状态集合与排队计数都以它为 key，
 * 格式只在这一处定义（避免 R3 知识重复：拆组件后两处各自拼一次）。
 */
export function groupKeyOf(domainKey: string, capability: string): string {
  return domainKey + ':' + capability;
}

/** 按 capability 分组；一个 Agent 的多个能力 → 落多组；无能力 → `未分类`。 */
export function groupByCapability<T extends CapabilityCarrier>(
  agents: readonly T[],
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const agent of agents) {
    const caps = capabilitiesOf(agent);
    if (caps.length === 0) {
      if (!groups[UNGROUPED_LABEL]) groups[UNGROUPED_LABEL] = [];
      groups[UNGROUPED_LABEL].push(agent);
    } else {
      for (const cap of caps) {
        if (!groups[cap]) groups[cap] = [];
        groups[cap].push(agent);
      }
    }
  }
  return groups;
}
