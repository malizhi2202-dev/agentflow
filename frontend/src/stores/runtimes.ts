/**
 * 运行时发现状态（v21 T-05）
 *
 * 数据全部来自既有只读端点：`/api/runtime/summary`、`/api/runtime/stats`、`/api/runtime/sessions`。
 * 重试是**唯一**写操作（`POST /api/runtime/sessions/{id}/retry`），失败文案原样回给用户。
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

type WriteResult = { ok: boolean; data?: any; error?: string };

interface RuntimesState {
  summary: RuntimeSummary | null;
  stats: RuntimeSummary | null;
  sessions: RuntimeSession[];
  error: string | null;
  loading: boolean;
  fetchAll: () => Promise<void>;
  retry: (sessionId: string) => Promise<WriteResult>;
}

export const useRuntimes = create<RuntimesState>((set, get) => ({
  summary: null,
  stats: null,
  sessions: [],
  error: null,
  loading: false,

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
