import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';

/**
 * `GET /api/control-plane/probes` 的 entry（`control_plane_api.py` 的 `list_probes`）。
 *
 * ⚠️ **该 DTO 里有两个「幽灵字段」（F10 · T-FIX-03）**：后端构造的 entry 键集实测为
 * `{agent_id, agent_name, status, probes, model_name, tokens_used, token_soft_limit,
 * token_hard_limit, last_heartbeat}` —— **没有 `health`、也没有 `runtime`**。
 *
 * - `health`：**T-FIX-03 (a) 已收口**（前端改读 `status`）—— `status` 才是探针判定
 *   （`if p.probe_type == "health": entry["status"] = p.status`）。本字段已无任何消费点。
 * - `runtime`：**仍未收口**。`AgentControlPlane.tsx` 的 `DetailPanel` / `CapabilityGroupRow`
 *   三处渲染它 ⇒ 值恒空。修它必须让后端 `list_probes` 补发该键，与 T-FIX-03 的
 *   「后端一字不动」护栏互斥 → 登记为残留，不在本任务自查自改。
 *
 * 两个字段都**刻意保留为必填 `string`**（不改可选）：`AgentProbePanel.tsx` 的
 * `HealthBadge({ health }: { health: string })` 在 `strict` 下会把 `string | undefined`
 * 判成 `error TS`，顶破「`error TS` 恰 32」这条验收护栏。类型上的账留给补键那一轮一起还。
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
