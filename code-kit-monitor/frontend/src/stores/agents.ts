import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';

export interface Agent {
  id: number; owner_id: string; name: string; description: string;
  runtime: 'langchain' | 'langgraph' | 'autogen' | 'crewai' | 'codex' | 'custom'; model_provider: string; model_name: string;
  model_config_json: any; api_key: string;
  domain_id: number | null;
  workflow_id: number | null; workflow_summary?: any;
  token_soft_limit: number; token_hard_limit: number;
  total_tokens_used: number; status: string; visibility: string;
  project_count: number; created_at: string; updated_at: string;
}

interface AgentsState {
  agents: Agent[]; loading: boolean;
  fetchAgents: () => Promise<void>;
  fetchAgentsByDomain: (domainId: number | null) => Promise<Agent[]>;
  createAgent: (data: any) => Promise<Agent | null>;
  deleteAgent: (id: number) => Promise<boolean>;
  runAgent: (id: number) => Promise<any>;
  stopAgent: (id: number) => Promise<any>;
}

const uid = () => localStorage.getItem('current_user_id') || 'admin';

export const useAgents = create<AgentsState>((set, get) => ({
  agents: [], loading: false,
  fetchAgents: async () => {
    set({ loading: true });
    const result = await safeFetch('/api/agents');
    set({ agents: (result.ok && result.data ? result.data.agents : []) || [], loading: false });
  },
  fetchAgentsByDomain: async (domainId: number | null) => {
    const params = domainId === null ? 'domain_id=0' : `domain_id=${domainId}`;
    const res = await fetch(`/api/agents?${params}`, { headers: { 'X-User-Id': uid() } });
    const data = await res.json();
    return data.agents || [];
  },
  createAgent: async (payload) => {
    const res = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() }, body: JSON.stringify(payload) });
    if (!res.ok) return null;
    const a = await res.json();
    set((s) => ({ agents: [a, ...s.agents] }));
    return a;
  },
  deleteAgent: async (id) => {
    const res = await fetch(`/api/agents/${id}`, { method: 'DELETE', headers: { 'X-User-Id': uid() } });
    if (!res.ok) return false;
    set((s) => ({ agents: s.agents.filter((a) => a.id !== id) }));
    return true;
  },
  runAgent: async (id) => {
    const res = await fetch(`/api/agents/${id}/run`, { method: 'POST', headers: { 'X-User-Id': uid() } });
    if (!res.ok) return null;
    const r = await res.json();
    set((s) => ({ agents: s.agents.map((a) => a.id === id ? { ...a, status: 'running' } : a) }));
    return r;
  },
  stopAgent: async (id) => {
    const res = await fetch(`/api/agents/${id}/stop`, { method: 'POST', headers: { 'X-User-Id': uid() } });
    if (!res.ok) return null;
    set((s) => ({ agents: s.agents.map((a) => a.id === id ? { ...a, status: 'standby' } : a) }));
    return await res.json();
  },
}));
