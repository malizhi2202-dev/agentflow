import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';

interface MetricsData {
  buckets: any[]; model_totals: Record<string, number>;
  total_tokens: number; total_hits: number; total_time_ms: number;
}

interface MetricsState {
  data: MetricsData | null; global: any | null; loading: boolean;
  fetchMetrics: (entityType: string, entityId: number, minutes?: number) => Promise<void>;
  fetchGlobal: (minutes?: number) => Promise<void>;
}

const uid = () => localStorage.getItem('current_user_id') || 'admin';

export const useMetrics = create<MetricsState>((set) => ({
  data: null, global: null, loading: false,
  fetchMetrics: async (entityType, entityId, minutes = 60) => {
    set({ loading: true });
    const result = await safeFetch(`/api/metrics/${entityType}/${entityId}?minutes=${minutes}`);
    set({ data: (result.ok && result.data) ? result.data : null, loading: false });
  },
  fetchGlobal: async (minutes = 60) => {
    set({ loading: true });
    const result = await safeFetch(`/api/metrics/global?minutes=${minutes}`);
    set({ global: (result.ok && result.data) ? result.data : null, loading: false });
  },
}));
