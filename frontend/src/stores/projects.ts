import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';

export interface Project {
  id: number; owner_id: string; name: string;
  requirement_raw: string; requirement_type: string;
  parsed_summary: string; agent_id: number | null;
  workflow_id: number | null; status: string;
  created_at: string; updated_at: string;
}

interface ProjectsState {
  projects: Project[]; loading: boolean;
  fetchProjects: () => Promise<void>;
  createProject: (data: any) => Promise<Project | null>;
  deleteProject: (id: number) => Promise<boolean>;
  executeProject: (id: number) => Promise<any>;
  stopProject: (id: number) => Promise<any>;
}

const uid = () => localStorage.getItem('current_user_id') || 'admin';

export const useProjects = create<ProjectsState>((set, get) => ({
  projects: [], loading: false,
  fetchProjects: async () => {
    set({ loading: true });
    const result = await safeFetch('/api/projects');
    set({ projects: (result.ok && result.data ? result.data.projects : []) || [], loading: false });
  },
  createProject: async (payload) => {
    const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() }, body: JSON.stringify(payload) });
    if (!res.ok) return null;
    const p = await res.json();
    set((s) => ({ projects: [p, ...s.projects] }));
    return p;
  },
  deleteProject: async (id) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: { 'X-User-Id': uid() } });
    if (!res.ok) return false;
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
    return true;
  },
  executeProject: async (id) => {
    const res = await fetch(`/api/projects/${id}/execute`, { method: 'POST', headers: { 'X-User-Id': uid() } });
    if (!res.ok) return null;
    const r = await res.json();
    set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, status: 'running' } : p) }));
    return r;
  },
  stopProject: async (id) => {
    const res = await fetch(`/api/projects/${id}/stop`, { method: 'POST', headers: { 'X-User-Id': uid() } });
    if (!res.ok) return null;
    set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, status: 'stopped' } : p) }));
    return await res.json();
  },
}));
