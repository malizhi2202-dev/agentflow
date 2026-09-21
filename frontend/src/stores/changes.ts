import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';

export interface ChangeSummary {
  total_changes: number; active_changes: number; alerts: number; blocked: number;
  overall_progress_pct: number; total_tasks: number; done_tasks: number;
  gates_passed: string; avg_days: number;
}

export interface ChangeItem {
  id: string; title: string; phase: string; phase_name: string;
  progress: string; progress_pct: number; status: string; priority: string;
  interrupted: boolean; interrupted_task?: string;
  created_at?: string; updated_at?: string; total_days?: number;
  task_stats: { total: number; done: number; in_progress: number; blocked: number; auto: number; manual: number };
  gate_stats: { total: number; passed: number; rejected: number; conditional: number; pending: number };
  next_action: string; blockers: string[];
  v1_count: number; v2_count: number; risk_count: number;
}

interface ChangeState {
  changes: ChangeItem[]; summary: ChangeSummary | null; loading: boolean;
  filter: { q: string; status: string; phase: string };
  fetchChanges: () => Promise<void>;
  setFilter: (f: Partial<ChangeState['filter']>) => void;
}

export const useChanges = create<ChangeState>((set, get) => ({
  changes: [], summary: null, loading: false,
  filter: { q: '', status: 'all', phase: 'all' },
  fetchChanges: async () => {
    set({ loading: true });
    const result = await safeFetch('/api/changes');
    set({ changes: (result.ok && result.data ? result.data.changes : []) || [], summary: (result.ok && result.data ? result.data.summary : null) || null, loading: false });
  },
  setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f } })),
}));

export function filteredChanges(changes: ChangeItem[], f: { q: string; status: string; phase: string }) {
  return changes.filter((c) => {
    if (f.q && !c.id.toLowerCase().includes(f.q.toLowerCase())) return false;
    if (f.status !== 'all' && c.status !== f.status) return false;
    if (f.phase !== 'all' && c.phase !== f.phase) return false;
    return true;
  });
}
