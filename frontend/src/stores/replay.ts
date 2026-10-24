/**
 * 任务回放状态（v21 T-05）
 *
 * 口径（裁定：回放 = 任务回放 + 入口链）：回放的单位是**任务的运行记录**（`/api/tasks/{id}/runs`），
 * 不是「重新执行」——只读时间线，重跑仍在运行时页/任务卡上做。
 */
import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';

export interface RunRow {
  id: number;
  run_id?: string;
  status?: string;
  started_at?: string;
  finished_at?: string;
  summary?: string;
  agent_id?: number | null;
  error?: string | null;
  [key: string]: any;
}

interface ReplayState {
  taskId: number | null;
  runs: RunRow[];
  error: string | null;
  loading: boolean;
  openTask: (taskId: number) => Promise<void>;
  clear: () => void;
}

export const useReplay = create<ReplayState>((set) => ({
  taskId: null,
  runs: [],
  error: null,
  loading: false,

  openTask: async (taskId) => {
    set({ loading: true, taskId, runs: [], error: null });
    const out = await safeFetch(`/api/tasks/${taskId}/runs`);
    const rows = out.ok ? (out.data?.runs ?? out.data ?? []) : [];
    set({
      runs: Array.isArray(rows) ? rows : [],
      error: out.ok ? null : out.error || '加载失败',
      loading: false,
    });
  },

  clear: () => set({ taskId: null, runs: [], error: null, loading: false }),
}));
