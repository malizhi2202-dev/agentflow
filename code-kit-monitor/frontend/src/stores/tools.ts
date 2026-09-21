import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';

export interface Tool {
  id: number; owner_id: string; type: 'plugin' | 'skill' | 'mcp';
  name: string; description: string;
  content_md: string;
  token_soft_limit: number; token_hard_limit: number;
  permissions: string[]; mcp_host_config: any;
  status: string; visibility: string;
  created_at: string; updated_at: string;
}

interface ToolsState {
  tools: Tool[];
  filter: string;
  loading: boolean;
  setFilter: (f: string) => void;
  fetchTools: (type?: string) => Promise<void>;
  createTool: (data: any) => Promise<Tool | null>;
  deleteTool: (id: number) => Promise<boolean>;
}

export const useTools = create<ToolsState>((set, get) => ({
  tools: [], filter: '', loading: false,
  setFilter: (f) => set({ filter: f }),
  fetchTools: async (type?) => {
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
    if (!res.ok) return null;
    const tool = await res.json();
    set((s) => ({ tools: [tool, ...s.tools] }));
    return tool;
  },
  deleteTool: async (id) => {
    const uid = localStorage.getItem('current_user_id') || 'admin';
    const res = await fetch(`/api/tools/${id}`, { method: 'DELETE', headers: { 'X-User-Id': uid } });
    if (!res.ok) return false;
    set((s) => ({ tools: s.tools.filter((t) => t.id !== id) }));
    return true;
  },
}));
