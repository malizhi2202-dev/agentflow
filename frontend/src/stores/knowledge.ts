import { create } from 'zustand';

export interface KnowledgeTag {
  id: number;
  name: string;
  color: string;
  owner_id: string;
  created_at: string;
}

export interface KnowledgeSource {
  id: number;
  agent_id: number;
  owner_id: string;
  name: string;
  source_type: 'rag_api' | 'mysql' | 'postgres' | 'redis' | 'http_api' | 'url_crawl' | 'local_file';
  url: string;
  config_json: Record<string, any>;
  enabled: boolean;
  description: string;
  status: string | null;
  file_path: string | null;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  created_at: string;
  updated_at: string;
  tags?: KnowledgeTag[];
}

export interface SourceStatus {
  id: number;
  name: string;
  source_type: string;
  status: string;
  chunks: number;
  filename: string;
  file_path: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface KnowledgeState {
  sources: KnowledgeSource[];
  loading: boolean;
  tags: KnowledgeTag[];
  tagsLoading: boolean;
  fetchKnowledgeSources: (agentId: number, tag?: string) => Promise<void>;
  createSource: (agentId: number, data: Partial<KnowledgeSource>) => Promise<KnowledgeSource | null>;
  updateSource: (agentId: number, sourceId: number, data: Partial<KnowledgeSource>) => Promise<KnowledgeSource | null>;
  deleteSource: (agentId: number, sourceId: number) => Promise<boolean>;
  testSource: (agentId: number, sourceId: number) => Promise<{ ok: boolean; detail: string } | null>;
  uploadFile: (agentId: number, file: File, name?: string, description?: string) => Promise<KnowledgeSource | null>;
  getSourceStatus: (agentId: number, sourceId: number) => Promise<SourceStatus | null>;
  // 标签
  fetchTags: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<KnowledgeTag | null>;
  deleteTag: (tagId: number) => Promise<boolean>;
  addSourceTag: (sourceId: number, tagId: number) => Promise<boolean>;
  removeSourceTag: (sourceId: number, tagId: number) => Promise<boolean>;
}

const uid = () => localStorage.getItem('current_user_id') || 'admin';

const headers = () => ({
  'X-User-Id': uid(),
});

export const useKnowledge = create<KnowledgeState>((set) => ({
  sources: [],
  loading: false,
  tags: [],
  tagsLoading: false,

  fetchKnowledgeSources: async (agentId: number, tag?: string) => {
    set({ loading: true });
    try {
      let url = `/api/agents/${agentId}/knowledge-sources`;
      if (tag) url += `?tag=${encodeURIComponent(tag)}`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) throw new Error('获取资料源失败');
      const data = await res.json();
      set({ sources: Array.isArray(data) ? data : [], loading: false });
    } catch {
      set({ sources: [], loading: false });
    }
  },

  createSource: async (agentId: number, data: Partial<KnowledgeSource>) => {
    const res = await fetch(`/api/agents/${agentId}/knowledge-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    const result = await res.json();
    const src = result.source;
    set((s) => ({ sources: [src, ...s.sources] }));
    return src;
  },

  updateSource: async (agentId: number, sourceId: number, data: Partial<KnowledgeSource>) => {
    const res = await fetch(`/api/agents/${agentId}/knowledge-sources/${sourceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    const result = await res.json();
    const updated = result.source;
    set((s) => ({
      sources: s.sources.map((src) => (src.id === sourceId ? { ...src, ...updated } : src)),
    }));
    return updated;
  },

  deleteSource: async (agentId: number, sourceId: number) => {
    const res = await fetch(`/api/agents/${agentId}/knowledge-sources/${sourceId}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) return false;
    set((s) => ({ sources: s.sources.filter((src) => src.id !== sourceId) }));
    return true;
  },

  testSource: async (agentId: number, sourceId: number) => {
    const res = await fetch(`/api/agents/${agentId}/knowledge-sources/${sourceId}/test`, {
      method: 'POST',
      headers: headers(),
    });
    if (!res.ok) return null;
    const result = await res.json();
    set((s) => ({
      sources: s.sources.map((src) =>
        src.id === sourceId
          ? { ...src, last_test_ok: result.ok, last_test_at: new Date().toISOString() }
          : src
      ),
    }));
    return result;
  },

  uploadFile: async (agentId: number, file: File, name?: string, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (description) formData.append('description', description);

    const res = await fetch(`/api/agents/${agentId}/knowledge-sources/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': uid() },
      body: formData,
    });
    if (!res.ok) return null;
    const result = await res.json();
    const src = result.source;
    set((s) => ({ sources: [src, ...s.sources] }));
    return src;
  },

  getSourceStatus: async (agentId: number, sourceId: number) => {
    const res = await fetch(`/api/agents/${agentId}/knowledge-sources/${sourceId}/status`, {
      headers: headers(),
    });
    if (!res.ok) return null;
    return await res.json();
  },

  // ── 标签 ──

  fetchTags: async () => {
    set({ tagsLoading: true });
    try {
      const res = await fetch('/api/agents/knowledge/tags', { headers: headers() });
      if (!res.ok) throw new Error('获取标签失败');
      const data = await res.json();
      set({ tags: Array.isArray(data) ? data : [], tagsLoading: false });
    } catch {
      set({ tags: [], tagsLoading: false });
    }
  },

  createTag: async (name: string, color?: string) => {
    const res = await fetch('/api/agents/knowledge/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ name, color: color || '#3b82f6' }),
    });
    if (!res.ok) return null;
    const result = await res.json();
    const tag = result.tag;
    set((s) => ({ tags: [...s.tags, tag] }));
    return tag;
  },

  deleteTag: async (tagId: number) => {
    const res = await fetch(`/api/agents/knowledge/tags/${tagId}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) return false;
    set((s) => ({ tags: s.tags.filter((t) => t.id !== tagId) }));
    return true;
  },

  addSourceTag: async (sourceId: number, tagId: number) => {
    const res = await fetch(`/api/agents/knowledge-sources/${sourceId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ tag_id: tagId }),
    });
    if (!res.ok) return false;
    // 刷新 sources 以获取最新 tags
    const result = await res.json();
    set((s) => ({
      sources: s.sources.map((src) =>
        src.id === sourceId
          ? { ...src, tags: [...(src.tags || []), result.tag] }
          : src
      ),
    }));
    return true;
  },

  removeSourceTag: async (sourceId: number, tagId: number) => {
    const res = await fetch(`/api/agents/knowledge-sources/${sourceId}/tags/${tagId}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) return false;
    set((s) => ({
      sources: s.sources.map((src) =>
        src.id === sourceId
          ? { ...src, tags: (src.tags || []).filter((t: KnowledgeTag) => t.id !== tagId) }
          : src
      ),
    }));
    return true;
  },
}));
