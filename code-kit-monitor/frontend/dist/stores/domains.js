import { create } from 'zustand';
const uid = () => localStorage.getItem('current_user_id') || 'admin';
export const useDomains = create((set, get) => ({
    domains: [],
    loading: false,
    autoRoute: {},
    queueCounts: {},
    fetchDomains: async () => {
        set({ loading: true });
        try {
            const res = await fetch('/api/domains', { headers: { 'X-User-Id': uid() } });
            const data = await res.json();
            set({ domains: data.domains || [], loading: false });
        }
        catch {
            set({ loading: false });
        }
    },
    createDomain: async (name) => {
        const res = await fetch('/api/domains', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || '创建失败');
        }
        const domain = await res.json();
        set((s) => ({ domains: [...s.domains, { ...domain, agent_count: 0 }] }));
        return domain;
    },
    updateDomain: async (id, name) => {
        const res = await fetch(`/api/domains/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify({ name }),
        });
        if (!res.ok)
            return null;
        const updated = await res.json();
        set((s) => ({
            domains: s.domains.map((d) => (d.id === id ? { ...d, ...updated } : d)),
        }));
        return updated;
    },
    deleteDomain: async (id) => {
        const res = await fetch(`/api/domains/${id}`, {
            method: 'DELETE',
            headers: { 'X-User-Id': uid() },
        });
        if (!res.ok)
            return false;
        await res.json();
        set((s) => ({ domains: s.domains.filter((d) => d.id !== id) }));
        return true;
    },
    // ── K8s 自动路由 ──
    routeToAgent: async (domainId, capability, task) => {
        const url = domainId === null
            ? '/api/gateway/route'
            : `/api/domains/${domainId}/route`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify({ capability, task: task || {} }),
        });
        if (!res.ok)
            return null;
        return await res.json();
    },
    gatewayRoute: async (capability, task) => {
        const res = await fetch('/api/gateway/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify({ capability, task: task || {} }),
        });
        if (!res.ok)
            return null;
        return await res.json();
    },
    scaleAgents: async (domainId, capability, desiredReplicas) => {
        const res = await fetch(`/api/domains/${domainId}/scale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify({ capability, desired_replicas: desiredReplicas }),
        });
        if (!res.ok)
            return null;
        return await res.json();
    },
    fetchQueueCounts: async (domainId) => {
        const res = await fetch(`/api/domains/${domainId}/queue-count`, {
            headers: { 'X-User-Id': uid() },
        });
        if (!res.ok)
            return {};
        const data = await res.json();
        const counts = data.queued_by_capability || {};
        set((s) => {
            const newCounts = { ...s.queueCounts };
            for (const [cap, count] of Object.entries(counts)) {
                newCounts[`${domainId}:${cap}`] = count;
            }
            return { queueCounts: newCounts };
        });
        return counts;
    },
    fetchQueueMonitor: async (domainId, capability) => {
        const params = capability ? `?capability=${encodeURIComponent(capability)}` : '';
        const res = await fetch(`/api/domains/${domainId}/queue-monitor${params}`, {
            headers: { 'X-User-Id': uid() },
        });
        if (!res.ok)
            return null;
        const data = await res.json();
        return data.monitors || data;
    },
    toggleAutoRoute: (domainId) => {
        set((s) => {
            const next = { ...s.autoRoute };
            next[domainId] = !next[domainId];
            return { autoRoute: next };
        });
    },
}));
