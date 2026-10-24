import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';

export interface Agent {
  id: number; owner_id: string; name: string; description: string;
  runtime: 'langchain' | 'langgraph' | 'autogen' | 'crewai' | 'codex' | 'custom'; model_provider: string; model_name: string;
  model_config_json: any; api_key: string;
  domain_id: number | null;
  workflow_id: number | null; workflow_summary?: any;
  workflow_ids?: number[];   // 后端 agent.py:24 已有（多工作流绑定）
  role_def?: string;         // UI 在用（AgentDetail 人设）；后端暂未落库 → T-03 待修
  system_prompt?: string;    // 同上
  sop?: string;              // 同上
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

export const useAgents = create<AgentsState>((set, get) => ({
  agents: [], loading: false,
  fetchAgents: async () => {
    set({ loading: true });
    const result = await safeFetch('/api/agents');
    set({ agents: (result.ok && result.data ? result.data.agents : []) || [], loading: false });
  },
  fetchAgentsByDomain: async (domainId: number | null) => {
    const params = domainId === null ? 'domain_id=0' : `domain_id=${domainId}`;
    const res = await fetch(`/api/agents?${params}`);
    const data = await res.json();
    return data.agents || [];
  },
  createAgent: async (payload) => {
    const res = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) return null;
    const a = await res.json();
    set((s) => ({ agents: [a, ...s.agents] }));
    return a;
  },
  deleteAgent: async (id) => {
    const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    set((s) => ({ agents: s.agents.filter((a) => a.id !== id) }));
    return true;
  },
  runAgent: async (id) => {
    const res = await fetch(`/api/agents/${id}/run`, { method: 'POST' });
    if (!res.ok) return null;
    const r = await res.json();
    set((s) => ({ agents: s.agents.map((a) => a.id === id ? { ...a, status: 'running' } : a) }));
    return r;
  },
  stopAgent: async (id) => {
    const res = await fetch(`/api/agents/${id}/stop`, { method: 'POST' });
    if (!res.ok) return null;
    set((s) => ({ agents: s.agents.map((a) => a.id === id ? { ...a, status: 'standby' } : a) }));
    return await res.json();
  },
}));
