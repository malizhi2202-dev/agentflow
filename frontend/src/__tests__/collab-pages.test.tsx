import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Tasks from '../pages/Tasks';
import Inbox from '../pages/Inbox';
import { useCollab } from '../stores/collab';
import { invalidateCache } from '../utils/requestDedup';

const TASK = (over: Partial<any> = {}) => ({
  id: 1, title: '修构建', description: '', status: 'in_progress',
  status_category: 'started', triage_state: 'triaged',
  assignee_kind: 'member', assignee_id: 'bob', priority: 60,
  due_date: null, squad_id: null, is_leader_task: false, evidence: [],
  evidence_warned: false, originator_id: 'alice', accountable_id: 'alice',
  parent_id: null, created_at: '2026-10-24T00:00:00', updated_at: '2026-10-24T00:00:00',
  ...over,
});

const INBOX = (over: Partial<any> = {}) => ({
  id: 1, work_item_id: 7, event_type: 'assigned', relation: 'responsible',
  title: '修复构建', body: '指派给你', action_required: true, has_failure: false,
  merged_count: 1, read: false, archived: false, read_at: null,
  updated_at: '2026-10-24T00:00:00', ...over,
});

/** 路由式 fetch mock：按 method+url 返回 JSON，并记录调用。 */
function mockApi(routes: Record<string, { status?: number; body: any }>) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const key = `${method} ${String(url).split('?')[0]}`;
    const found = routes[key] ?? routes[`${method} ${String(url)}`];
    const hit = found || { status: 404, body: { detail: `no mock for ${key}` } };
    // dedupedFetch 会 res.clone()——mock 必须提供 clone（返回自身即可，body 可重复读）
    const res: any = {
      ok: (hit.status ?? 200) < 400,
      status: hit.status ?? 200,
      headers: new Map(),
      json: async () => hit.body,
      text: async () => JSON.stringify(hit.body),
    };
    res.clone = () => res;
    return res as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

describe('任务看板（/api/tasks）', () => {
  beforeEach(() => {
    invalidateCache();
    vi.clearAllMocks();
    useCollab.setState({
      tasks: [], tasksError: null, tasksLoading: false,
      actionRequired: [], muted: [], unreadCount: 0, inboxError: null, inboxLoading: false,
    });
  });

  it('按四列状态类别分组，并显示 done 缺证据警告', async () => {
    mockApi({
      'GET /api/tasks': {
        body: {
          tasks: [
            TASK({ id: 1, title: '修构建', status: 'in_progress' }),
            TASK({ id: 2, title: '写文档', status: 'in_review' }),
            TASK({ id: 3, title: '上线', status: 'done', evidence_warned: true }),
            TASK({ id: 4, title: '待分诊的', status: 'backlog', triage_state: 'needs_triage' }),
          ],
          total: 4,
        },
      },
    });
    render(<Tasks />);
    await waitFor(() => expect(screen.getByText('修构建')).toBeInTheDocument());
    // 四列都存在（按标题找，避免与卡片上的状态 chip 撞名）
    for (const label of ['未开始', '进行中', '待验收', '已完成']) {
      expect(screen.getByRole('heading', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
    expect(screen.getByText('缺证据')).toBeInTheDocument();
    expect(screen.getByTitle('标记为已分诊（triage 与 status 正交）')).toBeInTheDocument();
  });

  it('新建任务：提交标题/负责人/优先级后重新拉列表', async () => {
    const calls = mockApi({
      'GET /api/tasks': { body: { tasks: [], total: 0 } },
      'POST /api/tasks': { body: { ok: true, task: TASK({ id: 9 }) } },
    });
    render(<Tasks />);
    await waitFor(() => expect(screen.getByText('还没有任务。点「新建任务」开始。')).toBeInTheDocument());

    fireEvent.click(screen.getByText('新建任务'));
    fireEvent.change(screen.getByLabelText('任务标题'), { target: { value: '新任务' } });
    fireEvent.change(screen.getByLabelText('负责人 ID'), { target: { value: 'bob' } });
    fireEvent.click(screen.getByText('创建'));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/api/tasks');
      expect(post?.body).toMatchObject({ title: '新任务', assignee_kind: 'member', assignee_id: 'bob' });
    });
    // 创建后必须刷新（写后读）
    expect(calls.filter((c) => c.method === 'GET' && c.url.startsWith('/api/tasks')).length).toBeGreaterThan(1);
  });

  it('非法状态转移：把后端 400 的业务文案显示出来，而不是吞掉', async () => {
    mockApi({
      'GET /api/tasks': { body: { tasks: [TASK({ id: 5, status: 'backlog' })], total: 1 } },
      'POST /api/tasks/5/status': {
        status: 400, body: { detail: '不允许的状态转移: backlog → done' },
      },
    });
    render(<Tasks />);
    await waitFor(() => expect(screen.getByText('修构建')).toBeInTheDocument());

    // backlog 的合法下一步是 todo / cancelled；点 todo 让后端拒绝，验证文案透传
    fireEvent.click(screen.getByText('→ 待做'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('不允许的状态转移: backlog → done');
    });
  });
});

describe('收件箱（/api/inbox）', () => {
  beforeEach(() => {
    invalidateCache();
    vi.clearAllMocks();
    useCollab.setState({
      tasks: [], tasksError: null, tasksLoading: false,
      actionRequired: [], muted: [], unreadCount: 0, inboxError: null, inboxLoading: false,
    });
  });

  it('分两组渲染并显示未读/需处理计数', async () => {
    mockApi({
      'GET /api/inbox': {
        body: {
          action_required: [INBOX({ id: 1, title: '修复构建' })],
          muted: [INBOX({ id: 2, title: '状态变化', action_required: false, read: true })],
          total: 2, unread_count: 1, unarchived_count: 2,
        },
      },
    });
    render(<Inbox />);
    await waitFor(() => expect(screen.getByText('修复构建')).toBeInTheDocument());
    expect(screen.getByText(/未读 1 · 需我处理 1/)).toBeInTheDocument();
    expect(screen.getByText('需我处理（1）')).toBeInTheDocument();
    expect(screen.getByText('其余（1）')).toBeInTheDocument();
  });

  it('单条标读只打 read 接口并刷新', async () => {
    const calls = mockApi({
      'GET /api/inbox': { body: { action_required: [INBOX({ id: 3 })], muted: [], total: 1, unread_count: 1, unarchived_count: 1 } },
      'POST /api/inbox/3/read': { body: { ok: true, item: INBOX({ id: 3, read: true }) } },
    });
    render(<Inbox />);
    await waitFor(() => expect(screen.getByTitle('标为已读（只动指针）')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('标为已读（只动指针）'));
    await waitFor(() => {
      expect(calls.some((c) => c.method === 'POST' && c.url === '/api/inbox/3/read')).toBe(true);
    });
    expect(calls.filter((c) => c.method === 'GET' && c.url.startsWith('/api/inbox')).length).toBeGreaterThan(1);
  });

  it('批量动作显示条数，失败时报错', async () => {
    mockApi({
      'GET /api/inbox': { body: { action_required: [], muted: [], total: 0, unread_count: 0, unarchived_count: 0 } },
      'POST /api/inbox/read-all': { body: { ok: true, count: 4 } },
    });
    render(<Inbox />);
    await waitFor(() => expect(screen.getByText('全部标读')).toBeInTheDocument());
    fireEvent.click(screen.getByText('全部标读'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('全部标读：4 条'));
  });
});
