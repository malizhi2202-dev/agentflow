/**
 * 自动化中心状态（P3-1，原型 `automations.html` 九节）
 *
 * 口径：
 * - 一条自动化 = Runbook ⟂ 负责人（Agent / Squad 二轨）⟂ 触发器（N 个）；三段各存各的账。
 * - 可见性由后端按 owner/admin 过滤，前端不做二次授权判断；**写操作失败要把后端 detail
 *   原样显示**（不吞成「保存成功」）。
 * - ⑧ 的两本账（`permissions.manage` ⟂ `permissions.run`）由后端一次算好，前端只展示——
 *   权限判定不复制到界面，避免「界面说能跑、后端说 skip」的假绿。
 *
 * 与 v21 的兼容：`useAutomations` / `items` / `error` / `loading` / `fetchAll` / `toggle` /
 * `remove` 这些导出名保留（历史页面和用例引用过）；`toggle` / `remove` 现在是 pause/resume
 * 与 archive 的薄包装（v21 的「删除」在新口径里就是归档：账全部保留）。
 */
import { create } from 'zustand';
import { safeFetch, dedupedFetch, invalidateCache } from '../utils/requestDedup';

export interface Runbook {
  goal: string;
  background: string;
  constraints: string;
  steps: string;
}

export interface FailureStats {
  window_days: number;
  completed: number;
  failed: number;
  skipped: number;
  cancelled: number;
  sample: number;
  rate: number | null;
  breaker_gate: boolean;
  breaker_rule: string;
}

export interface PermissionBook {
  allowed: boolean;
  reason: string | null;
  detail: string;
}

export interface EventFilterRow {
  event: string;
  actions: string[];
}

export interface AutomationTrigger {
  id: number;
  kind: string;
  enabled: boolean;
  cron: string;
  timezone: string;
  secret_preview: string;
  payload_limit: number;
  payload_limit_human: string;
  event_filter: EventFilterRow[];
  next_runs?: string[];
  next_runs_note?: string | null;
  webhook_path?: string;
  created_at: string | null;
}

export interface Automation {
  id: number;
  name: string;
  runbook: Runbook;
  owner_track: string;
  owner_id_ref: string;
  owner_ref_name: string | null;
  exec_mode: string;
  status: string;
  enabled: boolean;
  breaker_open: boolean;
  breaker_reason: string;
  paused_reason: string;
  spec_version: number;
  owner_id: string;
  created_at: string | null;
  updated_at: string | null;
  permissions: { manage: PermissionBook; run: PermissionBook };
  failure_7d: FailureStats;
  trigger_summary: string;
  trigger_count: number;
  triggers?: AutomationTrigger[];
  next_runs: string[];
  next_runs_trigger_id: number | null;
}

export interface AutomationRun {
  id: number;
  trigger_id: number | null;
  trigger_label: string;
  status: string;
  summary: string;
  error: string;
  error_kind: string;
  spec_version: number;
  started_at: string | null;
  finished_at: string | null;
}

export interface AutomationDelivery {
  id: number;
  trigger_id: number | null;
  external_id: string;
  event: string;
  payload_bytes: number;
  status: string;
  response_code: number;
  dedup_key: string;
  error: string;
  replayed_from: number | null;
  replayable: boolean;
  replay_block_reason: string | null;
  received_at: string | null;
}

export interface AutomationMeta {
  total: number;
  enabled: number;
  paused: number;
  archived: number;
  breaker_open: number;
}

export interface OneTimeSecret {
  token: string;
  webhook_url: string;
  note: string;
}

export type WriteResult = { ok: boolean; data?: any; error?: string };

const EMPTY_META: AutomationMeta = { total: 0, enabled: 0, paused: 0, archived: 0, breaker_open: 0 };

async function write(url: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown): Promise<WriteResult> {
  try {
    const res = await dedupedFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    invalidateCache();
    const data = await res.json().catch(() => ({}));
    // 后端 detail 原样透传：这是「失败原因不许被前端改写」的唯一来源
    if (!res.ok) return { ok: false, data, error: data?.detail || `请求失败 (${res.status})` };
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err?.message || '网络错误' };
  }
}

interface AutomationsState {
  // 清单（①）
  items: Automation[];
  meta: AutomationMeta;
  breakerRule: string;
  payloadLimit: number;
  // 选中行与右侧分节（②③④⑥⑦⑧）
  selectedId: number | null;
  detail: Automation | null;
  triggers: AutomationTrigger[];
  runs: AutomationRun[];
  deliveries: AutomationDelivery[];
  // 状态位
  error: string | null;
  loading: boolean;
  notice: string | null;
  secretOnce: OneTimeSecret | null;

  fetchAll: () => Promise<void>;
  select: (id: number | null) => Promise<void>;
  fetchRuns: (id?: number) => Promise<void>;
  fetchDeliveries: (id?: number) => Promise<void>;
  previewCron: (id: number, cron: string, timezone: string) => Promise<{ ok: boolean; next_runs?: string[]; error?: string }>;
  create: (payload: Record<string, unknown>) => Promise<WriteResult>;
  saveSections: (id: number, patch: Record<string, unknown>) => Promise<WriteResult>;
  pause: (id: number, reason?: string) => Promise<WriteResult>;
  resume: (id: number) => Promise<WriteResult>;
  archive: (id: number, reason?: string) => Promise<WriteResult>;
  setBreaker: (id: number, open: boolean, reason?: string) => Promise<WriteResult>;
  addTrigger: (id: number, payload: Record<string, unknown>) => Promise<WriteResult>;
  toggleTrigger: (id: number, triggerId: number, enabled: boolean) => Promise<WriteResult>;
  deleteTrigger: (id: number, triggerId: number) => Promise<WriteResult>;
  rotateTrigger: (id: number, triggerId: number) => Promise<WriteResult>;
  clearNotice: () => void;
  // v21 兼容名
  toggle: (id: number) => Promise<WriteResult>;
  remove: (id: number) => Promise<WriteResult>;
}

export const useAutomations = create<AutomationsState>((set, get) => {
  /** 写成功后统一刷新：清单 + 当前选中行 + 两级账本（写后读一致） */
  const refresh = async (id?: number | null) => {
    await get().fetchAll();
    const target = id ?? get().selectedId;
    if (target != null) await get().select(target);
  };

  /** 把写响应里的 automation 直接落进 detail（省一次往返），随后仍刷新账本 */
  const applyAutomation = (data: any) => {
    if (!data?.automation) return;
    set({
      detail: data.automation,
      triggers: data.automation.triggers || [],
      selectedId: data.automation.id,
    });
  };

  return {
    items: [],
    meta: EMPTY_META,
    breakerRule: '',
    payloadLimit: 64 * 1024,
    selectedId: null,
    detail: null,
    triggers: [],
    runs: [],
    deliveries: [],
    error: null,
    loading: false,
    notice: null,
    secretOnce: null,

    fetchAll: async () => {
      set({ loading: true });
      const out = await safeFetch('/api/automations');
      set({
        items: (out.ok && out.data?.automations) || [],
        meta: (out.ok && out.data?.meta) || EMPTY_META,
        breakerRule: (out.ok && out.data?.breaker_rule) || '',
        payloadLimit: (out.ok && out.data?.webhook_payload_limit) || 64 * 1024,
        error: out.ok ? null : out.error || '加载失败',
        loading: false,
      });
    },

    select: async (id) => {
      if (id == null) {
        set({ selectedId: null, detail: null, triggers: [], runs: [], deliveries: [], secretOnce: null });
        return;
      }
      set({ selectedId: id, error: null, secretOnce: null });
      const out = await safeFetch(`/api/automations/${id}`);
      if (!out.ok) {
        set({ detail: null, triggers: [], error: out.error || '读取失败' });
        return;
      }
      set({
        detail: out.data?.automation || null,
        triggers: out.data?.automation?.triggers || [],
      });
      await Promise.all([get().fetchRuns(id), get().fetchDeliveries(id)]);
    },

    fetchRuns: async (id) => {
      const target = id ?? get().selectedId;
      if (target == null) return;
      const out = await safeFetch(`/api/automations/${target}/runs`);
      set({ runs: out.ok ? out.data?.runs || [] : [], error: out.ok ? null : out.error || '运行史读取失败' });
    },

    fetchDeliveries: async (id) => {
      const target = id ?? get().selectedId;
      if (target == null) return;
      const out = await safeFetch(`/api/automations/${target}/deliveries`);
      if (!out.ok) {
        set({ deliveries: [], error: out.error || '投递记录读取失败' });
        return;
      }
      set({ deliveries: out.data?.deliveries || [] });
    },

    previewCron: async (id, cron, timezone) => {
      const qs = new URLSearchParams({ cron, timezone }).toString();
      // 422 的 detail 是「为什么非法」（5 段/无秒位），safeFetch 会压成 "Server error: 422" → 用裸 fetch 保留文案
      try {
        const res = await dedupedFetch(`/api/automations/${id}/triggers/preview?${qs}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data?.detail || `预览失败 (${res.status})` };
        return { ok: true, next_runs: data?.next_runs || [] };
      } catch (e: any) {
        return { ok: false, error: e?.message || '网络错误' };
      }
    },

    create: async (payload) => {
      const out = await write('/api/automations', 'POST', payload);
      if (out.ok) {
        set({ notice: `已创建「${out.data?.automation?.name || ''}」· v1 快照` });
        await get().fetchAll();
        if (out.data?.automation?.id) await get().select(out.data.automation.id);
      }
      return out;
    },

    saveSections: async (id, patch) => {
      const out = await write(`/api/automations/${id}`, 'PUT', patch);
      if (out.ok) {
        applyAutomation(out.data);
        set({ notice: '已保存（只改了这一段，其余两段未动）' });
        await get().fetchAll();
      }
      return out;
    },

    pause: async (id, reason = '') => {
      const out = await write(`/api/automations/${id}/pause`, 'POST', { reason });
      if (out.ok) {
        applyAutomation(out.data);
        set({ notice: '已暂停：schedule / webhook / Run now 三个入口一起停' });
        await get().fetchAll();
      }
      return out;
    },

    resume: async (id) => {
      const out = await write(`/api/automations/${id}/resume`, 'POST');
      if (out.ok) {
        applyAutomation(out.data);
        set({ notice: '已人工恢复：三个入口重新接入' });
        await get().fetchAll();
      }
      return out;
    },

    archive: async (id, reason = '') => {
      const out = await write(`/api/automations/${id}/archive`, 'POST', { reason });
      if (out.ok) {
        applyAutomation(out.data);
        set({ notice: '已归档：停未来触发，运行史与投递记录只读保留' });
        await get().fetchAll();
      }
      return out;
    },

    setBreaker: async (id, open, reason = '') => {
      const out = await write(`/api/automations/${id}/breaker`, 'POST', { open, reason });
      if (out.ok) {
        applyAutomation(out.data);
        set({ notice: open ? '熔断已打开（止损）' : '熔断已复位（触发仍需人点恢复）' });
        await get().fetchAll();
      }
      return out;
    },

    addTrigger: async (id, payload) => {
      const out = await write(`/api/automations/${id}/triggers`, 'POST', payload);
      if (out.ok) {
        applyAutomation(out.data);
        set({
          secretOnce: out.data?.secret || null,
          notice: out.data?.secret
            ? '触发器已建；token 明文只这一次可见，Rotate 后旧 URL 立即失效'
            : 'schedule 触发器已建（Next runs 见下表）',
        });
        await refresh(id);
      }
      return out;
    },

    toggleTrigger: async (id, triggerId, enabled) => {
      const out = await write(`/api/automations/${id}/triggers/${triggerId}/toggle`, 'POST', { enabled });
      if (out.ok) applyAutomation(out.data);
      return out;
    },

    deleteTrigger: async (id, triggerId) => {
      const out = await write(`/api/automations/${id}/triggers/${triggerId}`, 'DELETE');
      if (out.ok) {
        applyAutomation(out.data);
        set({ notice: '触发器已删除（其余触发器不受影响）' });
      }
      return out;
    },

    rotateTrigger: async (id, triggerId) => {
      const out = await write(`/api/automations/${id}/triggers/${triggerId}/rotate`, 'POST');
      if (out.ok) {
        applyAutomation(out.data);
        set({ secretOnce: out.data?.secret || null, notice: 'URL 已轮换：旧 URL 立即失效' });
      }
      return out;
    },

    clearNotice: () => set({ notice: null, secretOnce: null }),

    // ── v21 兼容名：取反启停 / 删除（现在等于归档）────────────────
    toggle: async (id) => {
      const current = get().items.find((i) => i.id === id) || (get().detail?.id === id ? get().detail : null);
      const enabled = current ? current.enabled : false;
      const out = enabled ? await get().pause(id) : await get().resume(id);
      await get().fetchAll();
      return out;
    },

    remove: async (id) => {
      const out = await get().archive(id, '');
      await get().fetchAll();
      return out;
    },
  };
});
