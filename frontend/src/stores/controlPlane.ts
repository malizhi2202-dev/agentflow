import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';

/**
 * `GET /api/control-plane/probes` 的 entry（`control_plane_api.py` 的 `list_probes`）。
 *
 * ⚠️ **这个 DTO 上有两个「幽灵字段」（F10）** —— 声明了、但后端构造的 entry 从不出这两个键。
 * 两个都已收口，键集现为
 * `{agent_id, agent_name, status, probes, model_name, runtime, tokens_used, token_soft_limit,
 * token_hard_limit, last_heartbeat}`：
 *
 * - `health`：**已无任何消费点**。`T-FIX-03 (a)` 摘掉了 `AgentControlPlane` 的 2 处
 *   （`OverviewCards` 的「健康 / 异常」卡），`T-FIX-16 (a)` 摘掉了 `AgentProbePanel` 的 5 处
 *   （`:64` 异常计数、`:168`/`:478` 时间线点、`:169`、`:318` 的健康度徽标）—— 全部改读 `status`。
 *   带探针判定的本来就是 `status`（`if p.probe_type == "health": entry["status"] = p.status`）。
 *   字段保留只为不改既有形状，**不要**再拿它做判定。
 * - `runtime`：**T-FIX-16 (c) 已由后端补发**（`list_probes` 构造 entry 时 `"runtime": agent.runtime`）
 *   ⇒ 不再是幽灵字段。补键前 `AgentControlPlane.tsx` 的 `DetailPanel` **两处**渲染它、值恒空
 *   （`CapabilityGroupRow` 那一处**不在此列** —— 它吃 `stores/agents.ts` 的 `Agent`，
 *   `models/agent.py` 的 `to_dict()` 确实发 `runtime`，那里渲染得出来）。
 *
 * 两个字段都**刻意保留为必填 `string`**（不改可选）：`AgentProbePanel.tsx` 的徽标在 `strict` 下
 * 会把 `string | undefined` 判成 `error TS`，顶破「`error TS` 恰 32」这条护栏；补键之后
 * `runtime: string` 已经与后端一致，`health: string` 作为历史形状保留。
 */
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

export interface QueueItem {
  id: number;
  orchestration_id: number;
  orchestration_name: string;
  agent_id: number;
  agent_name: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
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
  selectedAgent: number | null;
  loading: boolean;

  fetchProbes: () => Promise<void>;
  fetchQueue: () => Promise<void>;
  fetchReconcile: () => Promise<void>;
  restartAgent: (agentId: number) => Promise<any>;
  rescheduleAgent: (agentId: number) => Promise<any>;
  pauseAgent: (agentId: number) => Promise<any>;
  setSelectedAgent: (agentId: number | null) => void;
}

export const useControlPlane = create<ControlPlaneState>((set, get) => ({
  probes: [],
  queue: [],
  reconcile: [],
  selectedAgent: null,
  loading: false,

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
