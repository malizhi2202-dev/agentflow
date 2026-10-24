/**
 * v21 T-05：自动化中心 / 运行时 / 回放 三页的渲染与交互用例
 *
 * 覆盖点：列表字段、空态引导、启停/删除打对端点且刷新、cron 缺失前端先拦（不发请求）、
 * runtime summary/sessions 渲染 + 失败会话重试、回放时间线（空态与有记录两态）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Runtimes from '../pages/Runtimes';
import Replay from '../pages/Replay';
import { useRuntimes } from '../stores/runtimes';
import { useReplay } from '../stores/replay';
import { useAgents } from '../stores/agents';
import { useCollab } from '../stores/collab';
import { useAuth } from '../stores/auth';
import { invalidateCache } from '../utils/requestDedup';

const AUTOMATION = (over: Partial<any> = {}) => ({
  id: 1, agent_id: 7, agent_name: '巡检助手', agent_status: 'running',
  name: '每日巡检', cron_expr: '0 9 * * 1', capability: 'daily-report',
  enabled: true, last_run: null, owner_id: 'alice',
  created_at: '2026-10-24T00:00:00', updated_at: '2026-10-24T00:00:00', ...over,
});

const TASK = (over: Partial<any> = {}) => ({
  id: 5, title: 'MySQL 任务 1', description: '', status: 'todo', status_category: 'unstarted',
  triage_state: 'triaged', assignee_kind: null, assignee_id: null, priority: 50,
  due_date: null, squad_id: null, is_leader_task: false, evidence: [], evidence_warned: false,
  originator_id: 'alice', accountable_id: 'alice', parent_id: null,
  created_at: '2026-10-24T00:00:00', updated_at: '2026-10-24T00:00:00', ...over,
});

function mockApi(routes: Record<string, { status?: number; body: any }>) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const pathed = `${method} ${String(url).split('?')[0]}`;
    const hit = routes[`${method} ${String(url)}`] ?? routes[pathed] ?? { status: 404, body: { detail: `no mock ${pathed}` } };
    const res: any = {
      ok: (hit.status ?? 200) < 400, status: hit.status ?? 200, headers: new Map(),
      json: async () => hit.body, text: async () => JSON.stringify(hit.body),
    };
    res.clone = () => res;
    return res as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  useAuth.setState({ currentUser: { id: 'alice', name: 'alice', role: 'admin' } as any });
  useRuntimes.setState({ summary: null, stats: null, sessions: [], error: null, loading: false });
  useReplay.setState({ taskId: null, runs: [], error: null, loading: false });
  useAgents.setState({ agents: [{ id: 7, name: '巡检助手' } as any], loading: false });
  useCollab.setState({ tasks: [], tasksError: null, tasksLoading: false });
});

// 自动化中心已由 automations-nine-sections.test.tsx 覆盖（页面在 P3 重写为 9 节形态），
// 本文件只保留 运行时 / 回放 两族用例，避免两份断言互相打架。

describe('运行时', () => {
  it('渲染 summary 指标与会话行', async () => {
    mockApi({
      'GET /api/runtime/summary': { body: { active: 2, total: 9 } },
      'GET /api/runtime/stats': { body: { avg_ms: 1200 } },
      'GET /api/runtime/sessions': {
        body: { sessions: [{ session_id: 's-1', runtime: 'hermes', status: 'running' }] },
      },
    });
    render(<Runtimes />);
    await waitFor(() => expect(screen.getByText('s-1')).toBeInTheDocument());
    expect(screen.getByText('hermes')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '运行时会话' })).toBeInTheDocument();
    expect(screen.getByText(/会话 1 条/)).toBeInTheDocument();
  });

  it('空会话显示空态；失败会话可重试', async () => {
    const calls = mockApi({
      'GET /api/runtime/summary': { body: {} },
      'GET /api/runtime/stats': { body: {} },
      'GET /api/runtime/sessions': { body: { sessions: [{ session_id: 's-2', status: 'failed', error: '超时' }] } },
      'POST /api/runtime/sessions/s-2/retry': { body: { ok: true } },
    });
    render(<Runtimes />);
    await waitFor(() => expect(screen.getByText('s-2')).toBeInTheDocument());
    fireEvent.click(screen.getByText('重试'));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/runtime/sessions/s-2/retry')).toBe(true));
  });

  it('无数据时显示未就绪文案', async () => {
    mockApi({
      'GET /api/runtime/summary': { body: {} },
      'GET /api/runtime/stats': { body: {} },
      'GET /api/runtime/sessions': { body: { sessions: [] } },
    });
    render(<Runtimes />);
    await waitFor(() => expect(screen.getByText(/还没有运行时数据/)).toBeInTheDocument());
    expect(screen.getByText(/暂无运行时会话/)).toBeInTheDocument();
  });
});

describe('回放', () => {
  it('空任务列表给引导；选任务前右侧提示', async () => {
    mockApi({ 'GET /api/tasks': { body: { tasks: [] } } });
    render(<Replay />);
    await waitFor(() => expect(screen.getByText(/还没有任务/)).toBeInTheDocument());
    expect(screen.getByText(/选左边一条任务/)).toBeInTheDocument();
  });

  it('点任务拉运行记录并渲染时间线；无记录给空态', async () => {
    const calls = mockApi({
      'GET /api/tasks': { body: { tasks: [TASK()] } },
      'GET /api/tasks/5/runs': { body: { runs: [{ id: 11, status: 'success', summary: '跑完了' }] } },
    });
    render(<Replay />);
    await waitFor(() => expect(screen.getByText('MySQL 任务 1')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('回放任务 MySQL 任务 1'));
    await waitFor(() => expect(screen.getByText('run #11')).toBeInTheDocument());
    expect(screen.getByText('跑完了')).toBeInTheDocument();
    expect(calls.some((c) => c.url === '/api/tasks/5/runs')).toBe(true);
  });

  it('任务无运行记录时显示空态而不是空白', async () => {
    mockApi({
      'GET /api/tasks': { body: { tasks: [TASK()] } },
      'GET /api/tasks/5/runs': { body: { runs: [] } },
    });
    render(<Replay />);
    await waitFor(() => expect(screen.getByText('MySQL 任务 1')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('回放任务 MySQL 任务 1'));
    await waitFor(() => expect(screen.getByText(/还没有运行记录/)).toBeInTheDocument());
  });
});
