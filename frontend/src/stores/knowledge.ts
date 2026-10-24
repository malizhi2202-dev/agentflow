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
  /** 连接配置。后端 `to_dict(mask_secrets=True)` 只把 password / api_key 两键打码 → 页面不展示它。 */
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

/**
 * 写操作统一返回 { ok, data?, error? }。
 *
 * 为什么不再用 `T | null`：知识库页的纪律是「写失败把后端 detail 原样显示」，
 * 旧签名（失败返回 null）把 detail 丢掉了，页面只能写「失败，请重试」——等于把
 * 后端「不支持的文件类型: .exe」「文件过大: 11534336 bytes…」这些可执行信息吃掉。
 */
export interface WriteResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface KnowledgeState {
  sources: KnowledgeSource[];
  loading: boolean;
  tags: KnowledgeTag[];
  tagsLoading: boolean;
  fetchKnowledgeSources: (agentId: number, tag?: string) => Promise<void>;
  createSource: (agentId: number, data: Partial<KnowledgeSource>) => Promise<WriteResult<KnowledgeSource>>;
  updateSource: (agentId: number, sourceId: number, data: Partial<KnowledgeSource>) => Promise<WriteResult<KnowledgeSource>>;
  deleteSource: (agentId: number, sourceId: number) => Promise<WriteResult>;
  testSource: (agentId: number, sourceId: number) => Promise<WriteResult<{ ok: boolean; detail: string }>>;
  uploadFile: (agentId: number, file: File, name?: string, description?: string) => Promise<WriteResult<KnowledgeSource>>;
  getSourceStatus: (agentId: number, sourceId: number) => Promise<SourceStatus | null>;
  // 标签
  fetchTags: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<WriteResult<KnowledgeTag>>;
  deleteTag: (tagId: number) => Promise<boolean>;
  addSourceTag: (sourceId: number, tagId: number) => Promise<boolean>;
  removeSourceTag: (sourceId: number, tagId: number) => Promise<boolean>;
}

const headers = () => ({
  });

/** 读失败响应里的 detail（原样透传，不吞成「请求失败」）。 */
async function failure(res: Response, fallback: string): Promise<WriteResult<any>> {
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: (data && data.detail) || `${fallback}（HTTP ${res.status}）` };
}

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return failure(res, '创建资料源失败');
    const result = await res.json();
    const src = result.source;
    set((s) => ({ sources: [src, ...s.sources] }));
    return { ok: true, data: src };
  },

  updateSource: async (agentId: number, sourceId: number, data: Partial<KnowledgeSource>) => {
    const res = await fetch(`/api/agents/${agentId}/knowledge-sources/${sourceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return failure(res, '更新资料源失败');
    const result = await res.json();
    const updated = result.source;
    set((s) => ({
      sources: s.sources.map((src) => (src.id === sourceId ? { ...src, ...updated } : src)),
    }));
    return { ok: true, data: updated };
  },

  deleteSource: async (agentId: number, sourceId: number) => {
    const res = await fetch(`/api/agents/${agentId}/knowledge-sources/${sourceId}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) return failure(res, '删除资料源失败');
    set((s) => ({ sources: s.sources.filter((src) => src.id !== sourceId) }));
    return { ok: true };
  },

  testSource: async (agentId: number, sourceId: number) => {
    const res = await fetch(`/api/agents/${agentId}/knowledge-sources/${sourceId}/test`, {
      method: 'POST',
      headers: headers(),
    });
    if (!res.ok) return failure(res, '测试连接失败');
    const result = await res.json();
    set((s) => ({
      sources: s.sources.map((src) =>
        src.id === sourceId
          ? { ...src, last_test_ok: result.ok, last_test_at: new Date().toISOString() }
          : src
      ),
    }));
    return { ok: true, data: result };
  },

  uploadFile: async (agentId: number, file: File, name?: string, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (description) formData.append('description', description);

    const res = await fetch(`/api/agents/${agentId}/knowledge-sources/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return failure(res, '上传文件失败');
    const result = await res.json();
    const src = result.source;
    set((s) => ({ sources: [src, ...s.sources] }));
    return { ok: true, data: src };
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color: color || '#3b82f6' }),
    });
    if (!res.ok) return failure(res, '创建标签失败');
    const result = await res.json();
    const tag = result.tag;
    set((s) => ({ tags: [...s.tags, tag] }));
    return { ok: true, data: tag };
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
      headers: { 'Content-Type': 'application/json' },
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
