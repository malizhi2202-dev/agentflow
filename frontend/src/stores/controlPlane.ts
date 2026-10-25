import { create } from 'zustand';
import { safeFetch, dedupedFetch, invalidateCache } from '../utils/requestDedup';

export interface AgentStatus {
  agent_id: number;
  agent_name: string;
  status: string;
  health: string;
  last_heartbeat: string;
  runtime: string;
  model_name: string;
  tokens_used: number;
  token_soft_limit: number;
  token_hard_limit: number;
  probes: ProbeRecord[];
}

export interface ProbeRecord {
  probe_type: string;
  status: string;
  detail: string;
  consecutive_failures: number;
  created_at: string;
}

/** 队列行（P1-7 起落库 + 租约/心跳；不再有编排名称字段） */
export interface QueueItem {
  id: number;
  task_id: string;
  label: string | null;
  domain_id: number | null;
  agent_id: number | null;
  status: string;
  priority: number;
  attempts: number;
  enqueued_at: string | null;
  started_at: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
  heartbeat_at: string | null;
}

/** 副本与单例循环的真相（P0-9 / P1-7） */
export interface ClusterStatus {
  instance_id: string;
  deploy_mode: string;
  lease_ttl_seconds: number;
  leases: Record<string, { name: string; owner: string; active: boolean; expires_at: string | null }>;
  queue: { total: number; leased: number; by_label: Record<string, number> };
  reconcile_backoff_rows: number;
  process_local: string[];
  checked_at: string;
}

/* ── RSI 开关与可改面（P3-4）──────────────────────────────────────────────
 * 数据只从 `/api/rsi/switches` 与 `/api/rsi/surfaces` 来，界面里**不写死四类目、
 * 不写死路径模式**：后端 `RSI_CATEGORIES` 是唯一事实源，前端只做展示与转换。
 *
 * 后端 `SurfaceManifest.to_dict()` 只给 `name / allow_edit / immutable` 三列，
 * 原型「可改面声明」要四列（可写路径模式 / 体量上限 / 结构规则 / 显式排除）——
 * **体量上限与结构规则后端没有落库**，界面必须标「未接入」，不许编数值。
 */

/** 一个类目的自动改进开关（后端未落行时默认 running）；
 *  v25 R25-7：`category==='global'` 是总闸**真行**（不再是前端聚合派生） */
export interface RsiSwitchRow {
  category: string;
  enabled: boolean;
  state?: string;
  label?: string;
  updated_by?: string;
  updated_at?: string | null;
  last_reason?: string;
  last_actor?: string;
}

/** 可改面声明对象（SurfaceSpec）：v25 起四结构列后端已落库并被门禁消费
 *  （R25-2）——未配置项界面显示「—（未配置）」，不再标「未接入」。 */
export interface RsiSurfaceRow {
  id: number;
  name: string;
  allow_edit: string[];
  immutable: string[];
  path_pattern?: string;
  cap_bytes?: number | null;
  structure_rules?: unknown[];
  exclusions?: string[];
  owner_id?: string;
  created_at?: string | null;
}

/** 写操作结果：失败时 `error` 是后端 `detail` 原文（不许被前端改写） */
export interface WriteOutcome {
  ok: boolean;
  error?: string;
}

/** 类目 key → 中文展示名。这只是翻译表，**不决定有哪些类目**（类目来自接口返回） */
export const RSI_CATEGORY_LABELS: Record<string, string> = {
  memory: '知识记忆',
  skill: '技能',
  orchestration: '编排配置',
  model: '决策微模型权重',
};

export function rsiCategoryLabel(category: string): string {
  return RSI_CATEGORY_LABELS[category] || category;
}

/** 裸 fetch + 原样透传 detail：safeFetch 会把非 200 压成 "Server error: N"，丢掉原因 */
async function readJson(url: string): Promise<{ ok: boolean; data?: any; error?: string; status: number }> {
  try {
    const res = await dedupedFetch(url);
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, status: res.status, error: data?.detail || `请求失败 (${res.status})` };
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message || '网络错误' };
  }
}

async function writeJson(url: string, body: unknown): Promise<WriteOutcome> {
  try {
    const res = await dedupedFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    invalidateCache();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.detail || `请求失败 (${res.status})` };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || '网络错误' };
  }
}

export interface ReconcileEntry {
  id: number;
  orchestration_id: number;
  orchestration_name: string;
  status: string;
  drift_detected: boolean;
  message: string;
  created_at: string;
}

interface ControlPlaneState {
  probes: AgentStatus[];
  queue: QueueItem[];
  reconcile: ReconcileEntry[];
  cluster: ClusterStatus | null;
  selectedAgent: number | null;
  loading: boolean;

  // ── RSI 开关卡组（P3-4）──
  rsiSwitches: RsiSwitchRow[];
  rsiSurfaces: RsiSurfaceRow[];
  rsiImmutablePrefixes: string[];
  rsiError: string | null;
  rsiNotice: string | null;
  rsiLoading: boolean;

  fetchProbes: () => Promise<void>;
  fetchQueue: () => Promise<void>;
  fetchReconcile: () => Promise<void>;
  fetchCluster: () => Promise<void>;
  fetchRsi: () => Promise<void>;
  // D11：停用是「必须人批」的状态转换动作——原因必填，后端 400 透传
  setRsiSwitch: (category: string, enabled: boolean, reason?: string) => Promise<WriteOutcome>;
  setRsiMaster: (enabled: boolean, reason?: string) => Promise<WriteOutcome>;
  restartAgent: (agentId: number) => Promise<any>;
  rescheduleAgent: (agentId: number) => Promise<any>;
  pauseAgent: (agentId: number) => Promise<any>;
  setSelectedAgent: (agentId: number | null) => void;
}

export const useControlPlane = create<ControlPlaneState>((set, get) => ({
  probes: [],
  queue: [],
  reconcile: [],
  cluster: null,
  selectedAgent: null,
  loading: false,

  rsiSwitches: [],
  rsiSurfaces: [],
  rsiImmutablePrefixes: [],
  rsiError: null,
  rsiNotice: null,
  rsiLoading: false,

  fetchProbes: async () => {
    set({ loading: true });
    const result = await safeFetch('/api/control-plane/probes');
    set({ probes: (result.ok && result.data ? (Array.isArray(result.data) ? result.data : (result.data.probes || [])) : []), loading: false });
  },

  fetchQueue: async () => {
    set({ loading: true });
    const result = await safeFetch('/api/control-plane/queue');
    set({ queue: (result.ok && result.data ? (Array.isArray(result.data) ? result.data : (result.data.queue || [])) : []), loading: false });
  },

  fetchReconcile: async () => {
    set({ loading: true });
    const result = await safeFetch('/api/control-plane/reconcile');
    set({ reconcile: (result.ok && result.data ? (Array.isArray(result.data) ? result.data : (result.data.entries || [])) : []), loading: false });
  },

  fetchCluster: async () => {
    const result = await safeFetch('/api/control-plane/cluster');
    set({ cluster: result.ok && result.data ? result.data : null });
  },

  /* 四类目开关 + 可改面一起读：两处都是只读数据源，界面不缓存成常量 */
  fetchRsi: async () => {
    set({ rsiLoading: true });
    const [switches, surfaces] = await Promise.all([
      readJson('/api/rsi/switches'),
      readJson('/api/rsi/surfaces'),
    ]);
    const errs: string[] = [];
    if (!switches.ok) errs.push(`开关读取失败：${switches.error}`);
    if (!surfaces.ok) errs.push(`可改面读取失败：${surfaces.error}`);
    set({
      rsiSwitches: switches.ok ? (switches.data?.switches || []) : [],
      rsiSurfaces: surfaces.ok ? (surfaces.data?.surfaces || []) : [],
      rsiImmutablePrefixes: surfaces.ok ? (surfaces.data?.immutable_prefixes || []) : [],
      rsiError: errs.length ? errs.join('；') : null,
      rsiLoading: false,
    });
  },

  /* 单个类目：只打既有端点 POST /api/rsi/switches/{category}（服务层 + 路由两处独立校验） */
  setRsiSwitch: async (category, enabled, reason) => {
    const out = await writeJson(`/api/rsi/switches/${category}`,
                                { enabled, ...(reason ? { reason } : {}) });
    if (!out.ok) {
      set({ rsiError: out.error || '开关失败', rsiNotice: null });
      return out;
    }
    set({
      rsiError: null,
      rsiNotice: enabled
        ? `已恢复「${rsiCategoryLabel(category)}」自动改进 · 审计记「自动体已恢复」`
        : `已暂停「${rsiCategoryLabel(category)}」自动改进 · 审计记「自动体已暂停」· 存量在途不受影响`,
    });
    await get().fetchRsi();
    return out;
  },

  /* 总闸（v25 R25-7）：后端 `switches/global` 真行——off 在转换层短路一切类目。
   * 旧后端（无 global 行/端点未放行）如实回退为逐类目启停，每个单独入审计，
   * 任何一类失败把后端 detail 原样收集透传（不假装成功）。 */
  setRsiMaster: async (enabled, reason) => {
    const rows = get().rsiSwitches;
    if (rows.some((s) => s.category === 'global')) {
      const out = await writeJson('/api/rsi/switches/global',
                                  { enabled, ...(reason ? { reason } : {}) });
      await get().fetchRsi();
      if (!out.ok) {
        const error = out.error || '总闸操作失败';
        set({ rsiError: error, rsiNotice: null });
        return { ok: false, error };
      }
      set({
        rsiError: null,
        rsiNotice: enabled
          ? '全局总闸已恢复 · 一切类目重新可自动改进'
          : '全局总闸已停用 · 转换层短路一切类目（存量在途不受影响）',
      });
      return out;
    }
    const categories = rows.map((s) => s.category).filter((c) => c !== 'global');
    if (categories.length === 0) {
      const error = '未读到四类目（/api/rsi/switches 为空），总闸无法执行';
      set({ rsiError: error, rsiNotice: null });
      return { ok: false, error };
    }
    const failures: string[] = [];
    for (const category of categories) {
      const out = await writeJson(`/api/rsi/switches/${category}`,
                                  { enabled, ...(reason ? { reason } : {}) });
      if (!out.ok) failures.push(`${rsiCategoryLabel(category)}：${out.error || '失败'}`);
    }
    await get().fetchRsi();
    if (failures.length) {
      const error = `总闸部分失败 —— ${failures.join('；')}`;
      set({ rsiError: error, rsiNotice: null });
      return { ok: false, error };
    }
    set({
      rsiError: null,
      rsiNotice: enabled
        ? `总闸已恢复：${categories.length} 类目自动改进同时启用`
        : `总闸已停用：${categories.length} 类目自动改进同时暂停 · 存量在途不受影响 · 回归熔断一并停用（回滚转手工）`,
    });
    return { ok: true };
  },

  restartAgent: async (agentId: number) => {
    const res = await fetch(`/api/control-plane/agent/${agentId}/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  rescheduleAgent: async (agentId: number) => {
    const res = await fetch(`/api/control-plane/agent/${agentId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  pauseAgent: async (agentId: number) => {
    const res = await fetch(`/api/control-plane/agent/${agentId}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  setSelectedAgent: (agentId: number | null) => set({ selectedAgent: agentId }),
}));
