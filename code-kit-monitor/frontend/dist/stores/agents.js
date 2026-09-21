import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';
const uid = () => localStorage.getItem('current_user_id') || 'admin';
export const useAgents = create((set, get) => ({
    agents: [], loading: false,
    fetchAgents: async () => {
        set({ loading: true });
        const result = await safeFetch('/api/agents');
        set({ agents: (result.ok && result.data ? result.data.agents : []) || [], loading: false });
    },
    fetchAgentsByDomain: async (domainId) => {
        const params = domainId === null ? 'domain_id=0' : `domain_id=${domainId}`;
        const res = await fetch(`/api/agents?${params}`, { headers: { 'X-User-Id': uid() } });
        const data = await res.json();
        return data.agents || [];
    },
    createAgent: async (payload) => {
        const res = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() }, body: JSON.stringify(payload) });
        if (!res.ok)
            return null;
        const a = await res.json();
        set((s) => ({ agents: [a, ...s.agents] }));
        return a;
    },
    deleteAgent: async (id) => {
        const res = await fetch(`/api/agents/${id}`, { method: 'DELETE', headers: { 'X-User-Id': uid() } });
        if (!res.ok)
            return false;
        set((s) => ({ agents: s.agents.filter((a) => a.id !== id) }));
        return true;
    },
    runAgent: async (id) => {
        const res = await fetch(`/api/agents/${id}/run`, { method: 'POST', headers: { 'X-User-Id': uid() } });
        if (!res.ok)
            return null;
        const r = await res.json();
        set((s) => ({ agents: s.agents.map((a) => a.id === id ? { ...a, status: 'running' } : a) }));
        return r;
    },
    stopAgent: async (id) => {
        const res = await fetch(`/api/agents/${id}/stop`, { method: 'POST', headers: { 'X-User-Id': uid() } });
        if (!res.ok)
            return null;
        set((s) => ({ agents: s.agents.map((a) => a.id === id ? { ...a, status: 'standby' } : a) }));
        return await res.json();
    },
}));
