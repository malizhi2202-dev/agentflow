/**
 * RSI 治理状态层（波 6/7 的 API × 界面）
 *
 * 口径：`RULINGS.md` R6-1/R6-3/R7-4/R7-5/R7-6
 * - 记忆四层（L1/L2/L3，L0 由会话表承载）；晋升三字段缺一 → `no_entry`（不是失败，是结论）；
 * - 提案三权分离：探针**永不作发布依据**，影子重放需冻结金标 + 异厂 judge，发布**必须人批**；
 * - 四类开关 = 「自动体已暂停」；四熔断 + NOISE FLOOR。
 *
 * 前端只做两件事：把后端状态画出来、把后端拒绝的文案原样显示（不做授权判断，发布按钮的
 * 管理员置灰是产品明确要求，见 DESIGN D3）。
 */
import { create } from 'zustand';
import { safeFetch, dedupedFetch, invalidateCache } from '../utils/requestDedup';

export const LAYERS = ['L1', 'L2', 'L3'] as const;
export const MEMORY_STATUSES = ['promoted', 'confounded', 'quarantined', 'no_entry'] as const;
export const CATEGORIES = ['memory', 'skill', 'orchestration', 'model'] as const;
export const DIMENSIONS = ['invariant', 'domain'] as const;

export interface Memory {
  id: number; layer: string; kind: string; scope: string; owner_id: string;
  cue: string; lesson: string; evidence: unknown[]; source_ref: string;
  status: string; confounded: boolean;
  source_seq: number; cites_seq: number;
  pollution_flagged: boolean; post_ingest_scan: boolean;
  decay_score: number; last_used_at: string | null; created_at: string | null;
}
export interface Review {
  id: number; memory_id: number; verdict: string;
  fields_complete: boolean; causal_check: boolean; pollution_scan: boolean;
  reviewer: string; note: string; created_at: string | null;
}
export interface Switch { category: string; enabled: boolean; state: string; label: string; updated_by: string; updated_at: string | null }
export interface Breaker { name: string; status: 'closed' | 'open' | 'half_open'; reason: string; counter: number; opened_at: string | null }
export interface Proposal {
  id: number; title: string; dimension: string; surface_name: string; target: string;
  status: string; budget: { steps: number; tokens: number }; used: { steps: number; tokens: number };
  probe: Record<string, unknown>; shadow: Record<string, unknown>; judge_model: string;
  domain_signoffs: string[]; approved_by: string | null; approved_at: string | null;
  created_at: string | null; updated_at: string | null;
}
export interface Surface { id: number; name: string; allow_edit: string[]; immutable: string[]; owner_id: string }

type WriteResult = { ok: boolean; data?: any; error?: string };

async function writeJson(url: string, body?: unknown, method: 'POST' | 'PUT' | 'DELETE' = 'POST'): Promise<WriteResult> {
  try {
    const res = await dedupedFetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    invalidateCache();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, data, error: data?.detail || `请求失败 (${res.status})` };
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err?.message || '网络错误' };
  }
}

interface RsiState {
  memories: Memory[]; memoriesError: string | null; memoriesLoading: boolean;
  reviews: Review[]; reviewsMemoryId: number | null; reviewsError: string | null;
  switches: Switch[]; breakers: Breaker[]; noiseFloor: number; govError: string | null;
  candidates: Memory[]; decayDays: number;
  proposals: Proposal[]; proposalsError: string | null; proposalsLoading: boolean;
  surfaces: Surface[]; immutablePrefixes: string[];

  fetchMemories: (opts?: { layer?: string; status?: string }) => Promise<void>;
  proposeMemory: (payload: Record<string, unknown>) => Promise<WriteResult>;
  fetchReviews: (memoryId: number) => Promise<void>;
  quarantine: (sourceRef: string) => Promise<WriteResult>;
  fetchDecay: (days: number) => Promise<void>;
  fetchGovernance: () => Promise<void>;
  setSwitch: (category: string, enabled: boolean) => Promise<WriteResult>;
  resetBreaker: (name: string) => Promise<WriteResult>;
  tripBreaker: (name: string, reason: string) => Promise<WriteResult>;
  fetchProposals: (status?: string) => Promise<void>;
  fetchSurfaces: () => Promise<void>;
  createSurface: (name: string, allowEdit: string[]) => Promise<WriteResult>;
  updateSurface: (id: number, allowEdit: string[]) => Promise<WriteResult>;
  deleteSurface: (id: number) => Promise<WriteResult>;
  createProposal: (payload: Record<string, unknown>) => Promise<WriteResult>;
  recordProbe: (id: number, steps: number, tokens: number) => Promise<WriteResult>;
  recordShadow: (id: number, payload: Record<string, unknown>) => Promise<WriteResult>;
  signoff: (id: number) => Promise<WriteResult>;
  publish: (id: number) => Promise<WriteResult>;
}

export const useRsi = create<RsiState>((set, get) => ({
  memories: [], memoriesError: null, memoriesLoading: false,
  reviews: [], reviewsMemoryId: null, reviewsError: null,
  switches: [], breakers: [], noiseFloor: 0.01, govError: null,
  candidates: [], decayDays: 90,
  proposals: [], proposalsError: null, proposalsLoading: false,
  surfaces: [], immutablePrefixes: [],

  fetchMemories: async (opts) => {
    set({ memoriesLoading: true, memoriesError: null });
    const qs = new URLSearchParams();
    if (opts?.layer) qs.set('layer', opts.layer);
    if (opts?.status) qs.set('status', opts.status);
    const suffix = qs.toString() ? `?${qs}` : '';
    const result = await safeFetch(`/api/rsi/memories${suffix}`);
    if (!result.ok) { set({ memoriesLoading: false, memoriesError: result.error || '记忆读取失败' }); return; }
    set({ memories: result.data?.memories || [], memoriesLoading: false });
  },

  createSurface: async (name, allowEdit) => {
    const out = await writeJson('/api/rsi/surfaces', { name, allow_edit: allowEdit });
    if (out.ok) await get().fetchSurfaces();
    return out;
  },

  updateSurface: async (id, allowEdit) => {
    const out = await writeJson(`/api/rsi/surfaces/${id}`, { allow_edit: allowEdit }, 'PUT');
    if (out.ok) await get().fetchSurfaces();
    return out;
  },

  deleteSurface: async (id) => {
    const out = await writeJson(`/api/rsi/surfaces/${id}`, undefined, 'DELETE');
    if (out.ok) await get().fetchSurfaces();
    return out;
  },

  proposeMemory: async (payload) => {
    const out = await writeJson('/api/rsi/memories', payload);
    const layer = typeof payload.layer === 'string' ? payload.layer : undefined;
    if (out.ok) await get().fetchMemories({ layer });
    return out;
  },

  fetchReviews: async (memoryId) => {
    set({ reviewsMemoryId: memoryId, reviewsError: null });
    const result = await safeFetch(`/api/rsi/reviews?memory_id=${memoryId}`);
    if (!result.ok) { set({ reviewsError: result.error || '评审账读取失败' }); return; }
    set({ reviews: result.data?.reviews || [] });
  },

  quarantine: async (sourceRef) => {
    const out = await writeJson('/api/rsi/memories/quarantine', { source_ref: sourceRef });
    if (out.ok) await get().fetchMemories();
    return out;
  },

  fetchDecay: async (days) => {
    set({ decayDays: days });
    const result = await safeFetch(`/api/rsi/memories/decay?days=${days}`);
    if (result.ok) set({ candidates: result.data?.candidates || [] });
  },

  fetchGovernance: async () => {
    set({ govError: null });
    const [sw, br] = await Promise.all([
      safeFetch('/api/rsi/switches'), safeFetch('/api/rsi/breakers'),
    ]);
    if (!sw.ok || !br.ok) {
      set({ govError: sw.error || br.error || '治理状态读取失败' });
      return;
    }
    set({
      switches: sw.data?.switches || [],
      breakers: br.data?.breakers || [],
      noiseFloor: br.data?.noise_floor ?? 0.01,
    });
  },

  setSwitch: async (category, enabled) => {
    const out = await writeJson(`/api/rsi/switches/${category}`, { enabled });
    await get().fetchGovernance();
    return out;
  },

  resetBreaker: async (name) => {
    const out = await writeJson(`/api/rsi/breakers/${name}/reset`);
    await get().fetchGovernance();
    return out;
  },

  tripBreaker: async (name, reason) => {
    const out = await writeJson(`/api/rsi/breakers/${name}/trip`, { reason });
    await get().fetchGovernance();
    return out;
  },

  fetchProposals: async (status) => {
    set({ proposalsLoading: true, proposalsError: null });
    const suffix = status ? `?status=${status}` : '';
    const result = await safeFetch(`/api/rsi/proposals${suffix}`);
    if (!result.ok) { set({ proposalsLoading: false, proposalsError: result.error || '提案读取失败' }); return; }
    set({ proposals: result.data?.proposals || [], proposalsLoading: false });
  },

  fetchSurfaces: async () => {
    const result = await safeFetch('/api/rsi/surfaces');
    if (result.ok) {
      set({
        surfaces: result.data?.surfaces || [],
        immutablePrefixes: result.data?.immutable_prefixes || [],
      });
    }
  },

  createProposal: async (payload) => {
    const out = await writeJson('/api/rsi/proposals', payload);
    if (out.ok) await get().fetchProposals();
    return out;
  },

  recordProbe: async (id, steps, tokens) => {
    const out = await writeJson(`/api/rsi/proposals/${id}/probe`, { steps, tokens });
    if (out.ok) await get().fetchProposals();
    return out;
  },

  recordShadow: async (id, payload) => {
    const out = await writeJson(`/api/rsi/proposals/${id}/shadow`, payload);
    if (out.ok) await get().fetchProposals();
    return out;
  },

  signoff: async (id) => {
    const out = await writeJson(`/api/rsi/proposals/${id}/signoff`);
    if (out.ok) await get().fetchProposals();
    return out;
  },

  publish: async (id) => {
    const out = await writeJson(`/api/rsi/proposals/${id}/publish`);
    if (out.ok) await get().fetchProposals();
    return out;
  },
}));
