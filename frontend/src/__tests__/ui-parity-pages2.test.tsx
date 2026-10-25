/**
 * ui-parity P2 用例：小队中心独立页（6.29）。
 *
 * （原「Agent 详情独立页（6.4）」describe 已随 v26-agent-ui 作废：侧栏二级入口与
 *  AgentDetailPage.tsx 一起移除——列表点卡片即进详情壳，不再保留重复的「先选再看」入口。）
 * 小队页验真实端点：列表 / 成员 / 加成员 / 指派任务（POST）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { invalidateCache } from '../utils/requestDedup';

import SquadsPage from '../pages/SquadsPage';
import { useTeams } from '../stores/teams';

function mockApi(routes: Record<string, { status?: number; body: any }>) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const pathed = `${method} ${String(url).split('?')[0]}`;
    const hit = routes[pathed] ?? { status: 404, body: { detail: `no mock ${pathed}` } };
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
  invalidateCache(); vi.clearAllMocks();
  useTeams.setState({ teams: [], teamsError: null, teamsLoading: false, detail: null,
    detailError: null, detailLoading: false, squads: [], squadsError: null, squadsLoading: false });
});

describe('小队中心独立页（6.29）', () => {
  const SQUADS = {
    squads: [{
      id: 1, slug: 'code-review', name: '代码审查小队', leader_agent_id: 7,
      instructions: '只看 diff', status: 'active', created_by: 'alice', archive_reason: '',
      archived_at: null, leader_name: '审查助手', leader_archived: false,
      members: [{ id: 1, squad_id: 1, member_kind: 'agent', member_id: '7' }],
      created_at: '', updated_at: '',
    }],
  };

  it('列表 → 成员表；加成员打成员端点', async () => {
    const calls = mockApi({
      'GET /api/squads': { body: SQUADS },
      'GET /api/tasks': { body: { tasks: [] } },
      'POST /api/squads/code-review/members': { body: { ok: true } },
    });
    render(<SquadsPage />);
    await waitFor(() => expect(screen.getByText('代码审查小队')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('打开小队 代码审查小队'));
    await waitFor(() => expect(screen.getByLabelText('小队成员')).toBeInTheDocument());
    expect(screen.getByText('7')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('成员 ID'), { target: { value: 'bob' } });
    fireEvent.click(screen.getByText('加成员'));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/squads/code-review/members')).toBe(true));
  });

  it('指派任务打 /assign（leader 入队语义由后端负责）', async () => {
    const calls = mockApi({
      'GET /api/squads': { body: SQUADS },
      'GET /api/tasks': { body: { tasks: [{ id: 5, title: '要小队干的任务' }] } },
      'POST /api/squads/code-review/assign': { body: { ok: true, deduped: false } },
    });
    render(<SquadsPage />);
    await waitFor(() => expect(screen.getByText('代码审查小队')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('打开小队 代码审查小队'));
    await waitFor(() => expect(screen.getByLabelText('选择任务')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('选择任务'), { target: { value: '5' } });
    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/api/squads/code-review/assign');
      expect(post?.body).toEqual({ task_id: 5 });
    });
  });

  it('原型时间线区块必须标注「未接入」，不造假', async () => {
    mockApi({ 'GET /api/squads': { body: SQUADS }, 'GET /api/tasks': { body: { tasks: [] } } });
    render(<SquadsPage />);
    await waitFor(() => expect(screen.getByText('代码审查小队')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('打开小队 代码审查小队'));
    await waitFor(() => expect(screen.getByText(/规划原型 · 后端未接入/)).toBeInTheDocument());
    expect(screen.getByText(/12 节点协议时间线/)).toBeInTheDocument();
  });
});
