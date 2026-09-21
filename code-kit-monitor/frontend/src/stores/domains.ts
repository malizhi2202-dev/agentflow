import { create } from 'zustand';

export interface Domain {
  id: number;
  name: string;
  owner_id: string;
  created_at: string;
  agent_count?: number;
}

export interface RouteResult {
  status: 'routed' | 'queued';
  agent_id?: number;
  agent_name?: string;
  load?: string;
  position?: number;
  domain_id?: number;
  domain_name?: string;
  proxy_url?: string;
  proxy_instructions?: string;
  detail?: string;
}

export interface ScaleResult {
  status: 'scaled' | 'no_op';
  domain_id: number;
  capability: string;
  current_replicas: number;
  desired_replicas: number;
  created?: number;
  agents?: any[];
  detail?: string;
}

export interface QueueMonitor {
  domain_id: number;
  capability: string;
  queued: number;
  available_agents: number;
  needs_scale: boolean;
}

interface DomainsState {
  domains: Domain[];
  loading: boolean;
  // 自动路由开关 (per domain key)
  autoRoute: Record<string, boolean>;
  // 排队计数缓存: key = "domainId:capability"
  queueCounts: Record<string, number>;

  fetchDomains: () => Promise<void>;
  createDomain: (name: string) => Promise<Domain | null>;
  updateDomain: (id: number, name: string) => Promise<Domain | null>;
  deleteDomain: (id: number) => Promise<boolean>;

  // K8s routing
  routeToAgent: (domainId: number | null, capability: string, task?: any) => Promise<RouteResult | null>;
  gatewayRoute: (capability: string, task?: any) => Promise<RouteResult | null>;
  scaleAgents: (domainId: number, capability: string, desiredReplicas: number) => Promise<ScaleResult | null>;
  fetchQueueCounts: (domainId: number) => Promise<Record<string, number>>;
  fetchQueueMonitor: (domainId: number, capability?: string) => Promise<QueueMonitor | QueueMonitor[] | null>;

  toggleAutoRoute: (domainId: string) => void;
}

const uid = () => localStorage.getItem('current_user_id') || 'admin';

export const useDomains = create<DomainsState>((set, get) => ({
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
    } catch {
      set({ loading: false });
    }
  },

  createDomain: async (name: string) => {
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

  updateDomain: async (id: number, name: string) => {
    const res = await fetch(`/api/domains/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const updated = await res.json();
    set((s) => ({
      domains: s.domains.map((d) => (d.id === id ? { ...d, ...updated } : d)),
    }));
    return updated;
  },

  deleteDomain: async (id: number) => {
    const res = await fetch(`/api/domains/${id}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': uid() },
    });
    if (!res.ok) return false;
    await res.json();
    set((s) => ({ domains: s.domains.filter((d) => d.id !== id) }));
    return true;
  },

  // ── K8s 自动路由 ──
  routeToAgent: async (domainId: number | null, capability: string, task?: any) => {
    const url = domainId === null
      ? '/api/gateway/route'
      : `/api/domains/${domainId}/route`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ capability, task: task || {} }),
    });
    if (!res.ok) return null;
    return await res.json();
  },

  gatewayRoute: async (capability: string, task?: any) => {
    const res = await fetch('/api/gateway/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ capability, task: task || {} }),
    });
    if (!res.ok) return null;
    return await res.json();
  },

  scaleAgents: async (domainId: number, capability: string, desiredReplicas: number) => {
    const res = await fetch(`/api/domains/${domainId}/scale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ capability, desired_replicas: desiredReplicas }),
    });
    if (!res.ok) return null;
    return await res.json();
  },

  fetchQueueCounts: async (domainId: number) => {
    const res = await fetch(`/api/domains/${domainId}/queue-count`, {
      headers: { 'X-User-Id': uid() },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const counts = data.queued_by_capability || {};
    set((s) => {
      const newCounts = { ...s.queueCounts };
      for (const [cap, count] of Object.entries(counts)) {
        newCounts[`${domainId}:${cap}`] = count as number;
      }
      return { queueCounts: newCounts };
    });
    return counts as Record<string, number>;
  },

  fetchQueueMonitor: async (domainId: number, capability?: string) => {
    const params = capability ? `?capability=${encodeURIComponent(capability)}` : '';
    const res = await fetch(`/api/domains/${domainId}/queue-monitor${params}`, {
      headers: { 'X-User-Id': uid() },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.monitors || data;
  },

  toggleAutoRoute: (domainId: string) => {
    set((s) => {
      const next = { ...s.autoRoute };
      next[domainId] = !next[domainId];
      return { autoRoute: next };
    });
  },
}));
