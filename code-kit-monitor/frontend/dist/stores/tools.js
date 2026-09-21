import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';
export const useTools = create((set, get) => ({
    tools: [], filter: '', loading: false,
    setFilter: (f) => set({ filter: f }),
    fetchTools: async (type) => {
        set({ loading: true });
        const url = type ? `/api/tools?type=${type}` : '/api/tools';
        const result = await safeFetch(url);
        set({ tools: (result.ok && result.data ? result.data.tools : []) || [], loading: false });
    },
    createTool: async (payload) => {
        const uid = localStorage.getItem('current_user_id') || 'admin';
        const res = await fetch('/api/tools', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
            body: JSON.stringify(payload),
        });
        if (!res.ok)
            return null;
        const tool = await res.json();
        set((s) => ({ tools: [tool, ...s.tools] }));
        return tool;
    },
    deleteTool: async (id) => {
        const uid = localStorage.getItem('current_user_id') || 'admin';
        const res = await fetch(`/api/tools/${id}`, { method: 'DELETE', headers: { 'X-User-Id': uid } });
        if (!res.ok)
            return false;
        set((s) => ({ tools: s.tools.filter((t) => t.id !== id) }));
        return true;
    },
}));
