import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';
const uid = () => localStorage.getItem('current_user_id') || 'admin';
export const useOrchestration = create((set, get) => ({
    orchestrations: [], loading: false,
    yamlContent: '',
    topologyState: { nodes: [], edges: [] },
    edgeConfigs: new Map(),
    nodePool: [],
    canvasDirty: false,
    yamlDirty: false,
    selectedEdgeId: null,
    reconcileStatus: null,
    queue: [],
    templates: [],
    traceSpans: [],
    metricData: null,
    fetchOrchestrations: async () => {
        set({ loading: true });
        const result = await safeFetch('/api/orchestration');
        set({ orchestrations: (result.ok && result.data ? (Array.isArray(result.data) ? result.data : []) : []), loading: false });
    },
    fetchDetail: async (id) => {
        const res = await fetch(`/api/orchestration/${id}`, { headers: { 'X-User-Id': uid() } });
        if (!res.ok)
            return null;
        return await res.json();
    },
    applyYaml: async (yaml, edgesConfig) => {
        const res = await fetch('/api/orchestration/apply', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify({ yaml_raw: yaml, edges_config: edgesConfig || [] }),
        });
        return await res.json();
    },
    validateYaml: async (yaml) => {
        const res = await fetch('/api/orchestration/validate', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify({ yaml_raw: yaml }),
        });
        return await res.json();
    },
    fetchQueue: async () => {
        const res = await fetch('/api/orchestration/queue/list', { headers: { 'X-User-Id': uid() } });
        const data = await res.json();
        set({ queue: Array.isArray(data) ? data : [] });
    },
    fetchTemplates: async () => {
        const res = await fetch('/api/orchestration/templates', { headers: { 'X-User-Id': uid() } });
        const data = await res.json();
        set({ templates: Array.isArray(data) ? data : [] });
    },
    deployTemplate: async (id, values) => {
        const res = await fetch(`/api/orchestration/templates/${id}/deploy`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify({ values }),
        });
        return await res.json();
    },
    fetchTrace: async (id) => {
        const res = await fetch(`/api/metrics/orchestration/${id}/trace`, { headers: { 'X-User-Id': uid() } });
        const data = await res.json();
        set({ traceSpans: Array.isArray(data) ? data : [] });
    },
    fetchMetrics: async (id, minutes = 60) => {
        const res = await fetch(`/api/metrics/orchestration/${id}?minutes=${minutes}`, { headers: { 'X-User-Id': uid() } });
        const data = await res.json();
        set({ metricData: data });
    },
    setYamlContent: (yaml) => set({ yamlContent: yaml }),
    setTopologyState: (state) => set({ topologyState: state }),
    setEdgeConfig: (edgeId, config) => {
        const next = new Map(get().edgeConfigs);
        next.set(edgeId, config);
        set({ edgeConfigs: next });
    },
    removeEdgeConfig: (edgeId) => {
        const next = new Map(get().edgeConfigs);
        next.delete(edgeId);
        set({ edgeConfigs: next });
    },
    setNodePool: (agents) => set({ nodePool: agents }),
    fetchNodePool: async () => {
        const res = await fetch('/api/agents', { headers: { 'X-User-Id': uid() } });
        const data = await res.json();
        const agents = Array.isArray(data) ? data : (data.agents || []);
        set({ nodePool: agents.map((a) => ({
                id: a.id, name: a.name,
                runtime: a.runtime || 'langgraph',
                model_name: a.model_name || a.model || '',
            })) });
    },
    setSelectedEdge: (edgeId) => set({ selectedEdgeId: edgeId }),
    setCanvasDirty: (dirty) => set({ canvasDirty: dirty }),
    setYamlDirty: (dirty) => set({ yamlDirty: dirty }),
}));
