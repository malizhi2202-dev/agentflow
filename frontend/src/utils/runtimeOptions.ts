/**
 * 运行时选项派生（v22 §6.28 发现注册表 → 创建 Agent 表单）
 *
 * 数据源是 `stores/runtimes.ts` 的 `registry`（`GET /api/runtimes`），这里只做**纯派生**：
 * 同一个 CLI 可能被多台机器/多个协议族上报，而 Agent 只按 `cli` 绑定运行时。
 *
 * 口径：
 * - `models` 为空 ≠ 没有模型：`models_error` 非空表示目录**不可读**（对齐 v22 AC-5）；
 * - 模型目录由运行时暴露，平台不内置模型清单（RULINGS 2026-10-15 已裁撤 Provider / API Key）。
 */
import type { RuntimeRegistryRow } from '../stores/runtimes';

/** 按 cli 归并：在线优先（离线条目只在没有在线条目时才代表该 cli）。 */
export function uniqueRuntimesByCli(runtimes: RuntimeRegistryRow[]): RuntimeRegistryRow[] {
  const byCli = new Map<string, RuntimeRegistryRow>();
  for (const rt of runtimes || []) {
    const prev = byCli.get(rt.cli);
    if (!prev || (prev.status === 'offline' && rt.status === 'online')) {
      byCli.set(rt.cli, rt);
    }
  }
  return Array.from(byCli.values());
}

/** 某运行时的模型目录（未发现该运行时 → 空）。 */
export function modelsForRuntime(runtimes: RuntimeRegistryRow[], cli: string): string[] {
  const hit = uniqueRuntimesByCli(runtimes).find((r) => r.cli === cli);
  return (hit && hit.models) || [];
}

/** 某运行时模型目录的不可读原因（读到了 / 未发现 → 空串）。 */
export function modelsErrorForRuntime(runtimes: RuntimeRegistryRow[], cli: string): string {
  const hit = uniqueRuntimesByCli(runtimes).find((r) => r.cli === cli);
  return (hit && hit.models_error) || '';
}
