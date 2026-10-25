/**
 * 协作层状态（波 3 的 API × 波 8-ui 的界面）
 *
 * 口径（主档 §6.20）：
 * - 任务 = 上下文容器：`status`（四类 + blocked）与 `triage_state` 是**正交**两维；
 * - **状态机权威在后端**（`collab_service.TRANSITIONS`）——前端只镜像按钮，非法转移以后端 400 文案为准；
 * - 收件箱 = **指针不是副本**：合并键是任务本身，读/归档只动指针。
 *
 * 读写分离：读走 `safeFetch`（5s 缓存 + in-flight 去重），写走 `dedupedFetch`
 * ——因为 `safeFetch` 会把非 2xx 压成 `Server error: 400`，把后端的业务文案（例如
 * 「不允许的状态转移: backlog → done」）吃掉；写操作需要把这句原样给用户看。
 */
import { create } from 'zustand';
import { safeFetch, dedupedFetch, invalidateCache } from '../utils/requestDedup';

export type TaskStatus =
  | 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done' | 'cancelled';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  status_category: 'unstarted' | 'started' | 'done' | 'closed';
  triage_state: 'needs_triage' | 'triaged';
  assignee_kind: 'member' | 'agent' | 'squad' | null;
  assignee_id: string | null;
  priority: number;
  due_date: string | null;
  squad_id: number | null;
  is_leader_task: boolean;
  evidence: { label?: string; ref?: string }[];
  evidence_warned: boolean;
  originator_id: string;
  accountable_id: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface InboxEntry {
  id: number;
  work_item_id: number | null;
  event_type: string;
  relation: string;
  title: string;
  body: string;
  action_required: boolean;
  has_failure: boolean;
  merged_count: number;
  read: boolean;
  archived: boolean;
  read_at: string | null;
  updated_at: string;
}

/** 后端状态机镜像：只用于按钮文案；判定与拒绝永远由后端做。 */
export const NEXT_STATUS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['todo', 'cancelled'],
  todo: ['in_progress', 'backlog', 'cancelled'],
  in_progress: ['in_review', 'blocked', 'todo', 'cancelled'],
  in_review: ['done', 'in_progress', 'cancelled'],
  blocked: ['in_progress', 'todo', 'cancelled'],
  done: ['in_progress'],
  cancelled: [],
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: '待开始', todo: '待做', in_progress: '进行中', in_review: '待验收',
  blocked: '阻塞', done: '已完成', cancelled: '已取消',
};

export const COLUMNS: { key: string; label: string; statuses: TaskStatus[] }[] = [
  { key: 'unstarted', label: '未开始', statuses: ['backlog', 'todo'] },
  { key: 'started', label: '进行中', statuses: ['in_progress', 'blocked'] },
  { key: 'review', label: '待验收', statuses: ['in_review'] },
  { key: 'done', label: '已完成', statuses: ['done', 'cancelled'] },
];

type WriteResult = { ok: boolean; data?: any; error?: string };

/** 写请求：保留后端 detail 文案（safeFetch 会把它压成 "Server error: 400"）。 */
async function writeJson(url: string, body?: unknown): Promise<WriteResult> {
  try {
    const res = await dedupedFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    invalidateCache();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, data, error: data?.detail || `请求失败 (${res.status})` };
    }
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err?.message || '网络错误' };
  }
}

interface CollabState {
  tasks: Task[];
  tasksError: string | null;
  tasksLoading: boolean;
  actionRequired: InboxEntry[];
  muted: InboxEntry[];
  unreadCount: number;
  inboxError: string | null;
  inboxLoading: boolean;

  fetchTasks: (opts?: {
    mine?: boolean;
    status?: string;
    triageState?: 'needs_triage' | 'triaged';
    assigneeKind?: 'member' | 'agent' | 'squad';
  }) => Promise<void>;
  createTask: (payload: {
    title: string; description?: string;
    assignee_kind?: 'member' | 'agent' | 'squad' | null; assignee_id?: string | null;
    priority?: number;
  }) => Promise<WriteResult>;
  moveStatus: (id: number, status: TaskStatus, evidence?: object[]) => Promise<WriteResult>;
  // v25 R25-8：`start=true` = 确认层「开始」（当场建 run）；缺省 = 「先不开工」只登记
  assign: (id: number, kind: 'member' | 'agent' | 'squad', assigneeId: string,
           start?: boolean) => Promise<WriteResult>;
  triage: (id: number) => Promise<WriteResult>;

  fetchInbox: (opts?: { includeArchived?: boolean }) => Promise<void>;
  readItem: (id: number) => Promise<WriteResult>;
  archiveItem: (id: number) => Promise<WriteResult>;
  readAll: () => Promise<WriteResult>;
  archiveRead: () => Promise<WriteResult>;
}

export const useCollab = create<CollabState>((set, get) => ({
  tasks: [], tasksError: null, tasksLoading: false,
  actionRequired: [], muted: [], unreadCount: 0, inboxError: null, inboxLoading: false,

  fetchTasks: async (opts) => {
    set({ tasksLoading: true, tasksError: null });
    const params = new URLSearchParams();
    if (opts?.mine) params.set('mine', 'true');
    if (opts?.status) params.set('status', opts.status);
    // 视图过滤（看板变体 board__af-109 / af-116）：受理态一轴、负责人轨一轴
    if (opts?.triageState) params.set('triage_state', opts.triageState);
    if (opts?.assigneeKind) params.set('assignee_kind', opts.assigneeKind);
    const qs = params.toString();
    const result = await safeFetch(`/api/tasks${qs ? `?${qs}` : ''}`);
    if (!result.ok) {
      set({ tasksLoading: false, tasksError: result.error || '任务读取失败' });
      return;
    }
    set({ tasks: result.data?.tasks || [], tasksLoading: false, tasksError: null });
  },

  createTask: async (payload) => {
    const out = await writeJson('/api/tasks', payload);
    if (out.ok) await get().fetchTasks();
    return out;
  },

  moveStatus: async (id, status, evidence) => {
    const body = evidence === undefined ? { status } : { status, evidence };
    const out = await writeJson(`/api/tasks/${id}/status`, body);
    if (out.ok) await get().fetchTasks();
    return out;
  },

  assign: async (id, kind, assigneeId, start) => {
    const out = await writeJson(`/api/tasks/${id}/assign`, {
      assignee_kind: kind, assignee_id: assigneeId,
      // 只在「开始」那一下带 start；「先不开工」不传（= 旧行为，兼容存量调用方）
      ...(start ? { start: true } : {}),
    });
    if (out.ok) await get().fetchTasks();
    return out;
  },

  triage: async (id) => {
    const out = await writeJson(`/api/tasks/${id}/triage`, { triage_state: 'triaged' });
    if (out.ok) await get().fetchTasks();
    return out;
  },

  fetchInbox: async (opts) => {
    set({ inboxLoading: true, inboxError: null });
    const qs = opts?.includeArchived ? '?include_archived=true' : '';
    const result = await safeFetch(`/api/inbox${qs}`);
    if (!result.ok) {
      set({ inboxLoading: false, inboxError: result.error || '收件箱读取失败' });
      return;
    }
    set({
      actionRequired: result.data?.action_required || [],
      muted: result.data?.muted || [],
      unreadCount: result.data?.unread_count || 0,
      inboxLoading: false, inboxError: null,
    });
  },

  readItem: async (id) => {
    const out = await writeJson(`/api/inbox/${id}/read`);
    if (out.ok) await get().fetchInbox();
    return out;
  },

  archiveItem: async (id) => {
    const out = await writeJson(`/api/inbox/${id}/archive`);
    if (out.ok) await get().fetchInbox();
    return out;
  },

  readAll: async () => {
    const out = await writeJson('/api/inbox/read-all');
    if (out.ok) await get().fetchInbox();
    return out;
  },

  archiveRead: async () => {
    const out = await writeJson('/api/inbox/archive-read');
    if (out.ok) await get().fetchInbox();
    return out;
  },
}));
