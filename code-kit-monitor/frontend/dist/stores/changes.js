import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';
export const useChanges = create((set, get) => ({
    changes: [], summary: null, loading: false,
    filter: { q: '', status: 'all', phase: 'all' },
    fetchChanges: async () => {
        set({ loading: true });
        const result = await safeFetch('/api/changes');
        set({ changes: (result.ok && result.data ? result.data.changes : []) || [], summary: (result.ok && result.data ? result.data.summary : null) || null, loading: false });
    },
    setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f } })),
}));
export function filteredChanges(changes, f) {
    return changes.filter((c) => {
        if (f.q && !c.id.toLowerCase().includes(f.q.toLowerCase()))
            return false;
        if (f.status !== 'all' && c.status !== f.status)
            return false;
        if (f.phase !== 'all' && c.phase !== f.phase)
            return false;
        return true;
    });
}
