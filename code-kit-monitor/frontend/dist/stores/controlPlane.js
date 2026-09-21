import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';
export const useControlPlane = create((set, get) => ({
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
    restartAgent: async (agentId) => {
        const res = await fetch(`/api/control-plane/agent/${agentId}/restart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return await res.json();
    },
    rescheduleAgent: async (agentId) => {
        const res = await fetch(`/api/control-plane/agent/${agentId}/reschedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return await res.json();
    },
    pauseAgent: async (agentId) => {
        const res = await fetch(`/api/control-plane/agent/${agentId}/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return await res.json();
    },
    setSelectedAgent: (agentId) => set({ selectedAgent: agentId }),
}));
