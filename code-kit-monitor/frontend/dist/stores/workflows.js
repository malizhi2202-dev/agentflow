import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';
const uid = () => localStorage.getItem('current_user_id') || 'admin';
export const useWorkflows = create((set, get) => ({
    workflows: [], loading: false,
    fetchWorkflows: async () => {
        set({ loading: true });
        const result = await safeFetch('/api/workflows');
        set({ workflows: (result.ok && result.data ? result.data.workflows : []) || [], loading: false });
    },
    createWorkflow: async (payload) => {
        const res = await fetch('/api/workflows', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify(payload),
        });
        if (!res.ok)
            return null;
        const wf = await res.json();
        set((s) => ({ workflows: [wf, ...s.workflows] }));
        return wf;
    },
    updateWorkflow: async (id, payload) => {
        const res = await fetch(`/api/workflows/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify(payload),
        });
        if (!res.ok)
            return null;
        const wf = await res.json();
        set((s) => ({ workflows: s.workflows.map((w) => (w.id === id ? wf : w)) }));
        return wf;
    },
    deleteWorkflow: async (id) => {
        const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE', headers: { 'X-User-Id': uid() } });
        if (!res.ok)
            return false;
        set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) }));
        return true;
    },
    publishWorkflow: async (id) => {
        const res = await fetch(`/api/workflows/${id}/publish`, { method: 'POST', headers: { 'X-User-Id': uid() } });
        if (!res.ok)
            return false;
        const wf = await res.json();
        set((s) => ({ workflows: s.workflows.map((w) => (w.id === id ? wf : w)) }));
        return true;
    },
    executeWorkflow: async (id) => {
        const res = await fetch(`/api/workflows/${id}/execute`, { method: 'POST', headers: { 'X-User-Id': uid() } });
        if (!res.ok)
            return null;
        return res.json();
    },
}));
