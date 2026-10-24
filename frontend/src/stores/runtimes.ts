/**
 * 运行时状态（v21 T-05 观测 + v22 §6.28 发现注册表）
 *
 * 观测：`/api/runtime/summary|stats|sessions`（重试是唯一的写操作）。
 * 发现：`/api/runtimes`（daemon 上报的注册表）+ `PUT /api/runtimes/{id}/visibility`（仅 owner）。
 * 两块口径不混：观测看会话，发现看「机器 × CLI × 协议族」。
 */
import { create } from 'zustand';
import { safeFetch, dedupedFetch, invalidateCache } from '../utils/requestDedup';

export interface RuntimeSummary {
  [key: string]: any;
}

export interface RuntimeSession {
  session_id: string;
  runtime?: string;
  agent_id?: number;
  status?: string;
  started_at?: string;
  finished_at?: string;
  error?: string | null;
  [key: string]: any;
}

export interface RuntimeRegistryRow {
  id: number;
  machine_id: string;
  machine_name: string;
  cli: string;
  protocol_family: string;
  binary_path: string;
  source_file: string;
  version: string;
  models: string[];
  models_error: string;
  capabilities: string[];
  status: 'online' | 'offline';
  last_seen: string;
  visibility: 'private' | 'public';
  bound_agents: number;
  mine: boolean;
}

type WriteResult = { ok: boolean; data?: any; error?: string };

interface RuntimesState {
  summary: RuntimeSummary | null;
  stats: RuntimeSummary | null;
  sessions: RuntimeSession[];
  error: string | null;
  loading: boolean;
  /** v22 §6.28：daemon 上报的注册表 */
  registry: RuntimeRegistryRow[];
  registryError: string | null;
  registryLoading: boolean;
  fetchAll: () => Promise<void>;
  fetchRegistry: () => Promise<void>;
  setVisibility: (id: number, isPublic: boolean) => Promise<WriteResult>;
  retry: (sessionId: string) => Promise<WriteResult>;
}

export const useRuntimes = create<RuntimesState>((set, get) => ({
  summary: null,
  stats: null,
  sessions: [],
  error: null,
  loading: false,
  registry: [],
  registryError: null,
  registryLoading: false,

  fetchAll: async () => {
    set({ loading: true });
    const [summary, stats, sessions] = await Promise.all([
      safeFetch('/api/runtime/summary'),
      safeFetch('/api/runtime/stats'),
      safeFetch('/api/runtime/sessions'),
    ]);
    const firstErr = [summary, stats, sessions].find((r) => !r.ok);
    set({
      summary: (summary.ok && summary.data) || null,
      stats: (stats.ok && stats.data) || null,
      sessions: (sessions.ok && (sessions.data?.sessions || sessions.data)) || [],
      error: firstErr ? firstErr.error || '加载失败' : null,
      loading: false,
    });
  },

  fetchRegistry: async () => {
    set({ registryLoading: true, registryError: null });
    const res = await safeFetch('/api/runtimes');
    if (!res.ok) {
      set({ registryLoading: false, registryError: res.error || '运行时注册表读取失败' });
      return;
    }
    set({
      registry: (res.data?.runtimes as RuntimeRegistryRow[]) || [],
      registryLoading: false,
    });
  },

  /**
   * 可见性：默认 private（仅自己可见）；置公开 = 只共享路由权，凭据仍在成员本机。
   * 非 owner 由后端返回 404（越权与不存在同码），这里只透传文案。
   */
  setVisibility: async (id, isPublic) => {
    try {
      const res = await dedupedFetch(`/api/runtimes/${id}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public: isPublic }),
      });
      invalidateCache();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, data, error: data?.detail || `请求失败 (${res.status})` };
      await get().fetchRegistry();
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err?.message || '网络错误' };
    }
  },

  retry: async (sessionId) => {
    try {
      const res = await dedupedFetch(`/api/runtime/sessions/${encodeURIComponent(sessionId)}/retry`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      invalidateCache();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, data, error: data?.detail || `请求失败 (${res.status})` };
      await get().fetchAll();
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err?.message || '网络错误' };
    }
  },
}));
