/**
 * 自动化中心状态（v21 T-05）
 *
 * 口径：定时任务本体在 `scheduled_tasks`（每个 Agent 名下）；本 store 走平台视角聚合口
 * `/api/automations`（可见性由后端按 owner/admin 过滤，前端不做二次授权判断）。
 * 创建仍走 Agent 名下的 `POST /api/agents/{id}/scheduled-tasks`——任务必须挂在某个 Agent 上。
 */
import { create } from 'zustand';
import { safeFetch, dedupedFetch, invalidateCache } from '../utils/requestDedup';

export interface Automation {
  id: number;
  agent_id: number;
  agent_name?: string | null;
  agent_status?: string | null;
  name: string;
  cron_expr: string;
  capability: string;
  enabled: boolean;
  last_run: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

type WriteResult = { ok: boolean; data?: any; error?: string };

async function write(url: string, method: 'POST' | 'DELETE', body?: unknown): Promise<WriteResult> {
  try {
    const res = await dedupedFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    invalidateCache();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, data, error: data?.detail || `请求失败 (${res.status})` };
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err?.message || '网络错误' };
  }
}

interface AutomationsState {
  items: Automation[];
  error: string | null;
  loading: boolean;
  fetchAll: () => Promise<void>;
  toggle: (id: number) => Promise<WriteResult>;
  remove: (id: number) => Promise<WriteResult>;
  create: (agentId: number, payload: { name: string; cron_expr: string; capability: string }) => Promise<WriteResult>;
}

export const useAutomations = create<AutomationsState>((set, get) => ({
  items: [],
  error: null,
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    const out = await safeFetch('/api/automations');
    set({
      items: (out.ok && out.data?.automations) || [],
      error: out.ok ? null : out.error || '加载失败',
      loading: false,
    });
  },

  toggle: async (id) => {
    const out = await write(`/api/automations/${id}/toggle`, 'POST');
    if (out.ok) await get().fetchAll();
    return out;
  },

  remove: async (id) => {
    const out = await write(`/api/automations/${id}`, 'DELETE');
    if (out.ok) await get().fetchAll();
    return out;
  },

  create: async (agentId, payload) => {
    const out = await write(`/api/agents/${agentId}/scheduled-tasks`, 'POST', payload);
    if (out.ok) await get().fetchAll();
    return out;
  },
}));
