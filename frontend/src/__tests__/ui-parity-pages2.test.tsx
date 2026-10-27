/**
 * v27-A 回归：小队功能并入「团队与小队 · 小队 tab」后的真端点验证。
 *
 * 前身是 ui-parity P2 的「小队中心独立页（6.29）」describe——该页与 Teams 的 squads tab
 * 是同一实体的双入口，用户裁定（2026-10-26）并入 Teams 并删侧栏项 + SquadsPage.tsx。
 * （更早的「Agent 详情独立页（6.4）」describe 已随 v26-agent-ui 作废。）
 * 本文件验：小队列表渲染 / 入池 POST members / 指派任务 POST assign / 12 节点时间线「未接入」如实标注。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { invalidateCache } from '../utils/requestDedup';

import Teams from '../pages/Teams';
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

const SQUADS = {
  squads: [{
    id: 1, slug: 'code-review', name: '代码审查小队', leader_agent_id: 7,
    instructions: '只看 diff', status: 'active', created_by: 'alice', archive_reason: '',
    archived_at: null, leader_name: '审查助手', leader_archived: false,
    members: [{ id: 1, squad_id: 1, member_kind: 'agent', member_id: '7' }],
    created_at: '', updated_at: '',
  }],
};

beforeEach(() => {
  invalidateCache(); vi.clearAllMocks();
  useTeams.setState({ teams: [], teamsError: null, teamsLoading: false, detail: null,
    detailError: null, detailLoading: false, squads: [], squadsError: null, squadsLoading: false });
});

/** 渲染 Teams 并切到「小队」tab */
async function openSquadsTab(routes: Record<string, { status?: number; body: any }>) {
  const calls = mockApi(routes);
  render(<Teams />);
  fireEvent.click(await screen.findByRole('tab', { name: '小队' }));
  return calls;
}

describe('小队功能（并入 Teams·小队 tab）', () => {
  it('SQ-01 列表渲染成员与指令；入池打成员端点', async () => {
    const calls = await openSquadsTab({
      'GET /api/teams': { body: { teams: [] } },
      'GET /api/squads': { body: SQUADS },
      'GET /api/tasks': { body: { tasks: [] } },
      'POST /api/squads/code-review/members': { body: { ok: true } },
    });
    await waitFor(() => expect(screen.getByText('代码审查小队')).toBeInTheDocument());
    expect(screen.getByText('只看 diff')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('成员 ID'), { target: { value: 'bob' } });
    fireEvent.click(screen.getByRole('button', { name: '入池' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/squads/code-review/members')).toBe(true));
  });

  it('SQ-02 指派任务打 /assign（leader 入队语义由后端负责）', async () => {
    const calls = await openSquadsTab({
      'GET /api/teams': { body: { teams: [] } },
      'GET /api/squads': { body: SQUADS },
      'GET /api/tasks': { body: { tasks: [{ id: 5, title: '要小队干的任务' }] } },
      'POST /api/squads/code-review/assign': { body: { ok: true, deduped: false } },
    });
    await screen.findByText('代码审查小队');
    fireEvent.change(screen.getByLabelText('选择任务'), { target: { value: '5' } });
    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/api/squads/code-review/assign');
      expect(post?.body).toEqual({ task_id: 5 });
    });
  });

  it('SQ-03 原型 12 节点时间线必须标注「未接入」，不造假', async () => {
    await openSquadsTab({
      'GET /api/teams': { body: { teams: [] } },
      'GET /api/squads': { body: SQUADS },
      'GET /api/tasks': { body: { tasks: [] } },
    });
    await screen.findByText('代码审查小队');
    expect(await screen.findByText(/规划原型 · 后端未接入/)).toBeInTheDocument();
    expect(screen.getByText(/12 节点协议时间线/)).toBeInTheDocument();
  });
});
