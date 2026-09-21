import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';
const uid = () => localStorage.getItem('current_user_id') || 'admin';
export const useMetrics = create((set) => ({
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
