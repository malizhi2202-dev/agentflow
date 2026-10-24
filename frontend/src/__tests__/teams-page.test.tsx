import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Teams from '../pages/Teams';
import { useTeams } from '../stores/teams';
import { useAuth } from '../stores/auth';
import { invalidateCache } from '../utils/requestDedup';

const TEAM = (over: Partial<any> = {}) => ({
  id: 1, slug: 'agentflow-core', name: 'AgentFlow 平台团队', description: '',
  owner_user_id: 'alice', status: 'active',
  quota: { token_soft_limit: 80000, token_hard_limit: 100000, max_agents: 20, max_workflows: 20, max_members: 5 },
  member_count: 2, asset_counts: { agents: 0, workflows: 0, tools: 0, knowledge_sources: 0, domains: 0 },
  created_at: '2026-10-24T00:00:00', updated_at: '2026-10-24T00:00:00',
  ...over,
});

const MEMBERS = [
  { id: 1, team_id: 1, user_id: 'alice', role: 'owner', created_at: '' },
  { id: 2, team_id: 1, user_id: 'bob', role: 'member', created_at: '' },
];
const EMPTY_ASSETS = { agents: [], workflows: [], tools: [], knowledge_sources: [], domains: [] };

const SQUAD = (over: Partial<any> = {}) => ({
  id: 1, slug: 'code-review', name: '代码审查小队', leader_agent_id: 7,
  instructions: '', status: 'active', created_by: 'alice', archive_reason: '',
  archived_at: null, leader_name: '审查助手', leader_archived: false,
  members: [{ id: 1, squad_id: 1, member_kind: 'agent', member_id: '7' }],
  created_at: '', updated_at: '', ...over,
});

function mockApi(routes: Record<string, { status?: number; body: any }>) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const exact = `${method} ${String(url)}`;
    const pathed = `${method} ${String(url).split('?')[0]}`;
    const hit = routes[exact] ?? routes[pathed] ?? { status: 404, body: { detail: `no mock ${pathed}` } };
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
  useTeams.setState({
    teams: [], teamsError: null, teamsLoading: false,
    detail: null, detailError: null, detailLoading: false,
    squads: [], squadsError: null, squadsLoading: false,
  });
});

describe('tab 键盘可达', () => {
  it('←/→/Home/End 切 tab，且只有当前 tab 可 tab 到（roving tabindex）', async () => {
    mockApi({
      'GET /api/teams': { body: { teams: [] } },
      'GET /api/squads': { body: { squads: [] } },
    });
    render(<Teams />);
    const teamsTab = screen.getByRole('tab', { name: '团队' });
    const squadsTab = screen.getByRole('tab', { name: '小队' });
    expect(teamsTab).toHaveAttribute('tabindex', '0');
    expect(squadsTab).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(teamsTab, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByRole('tab', { name: '小队' })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByRole('tab', { name: '小队' })).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(screen.getByRole('tab', { name: '小队' }), { key: 'Home' });
    await waitFor(() => expect(screen.getByRole('tab', { name: '团队' })).toHaveAttribute('aria-selected', 'true'));
  });
});

describe('团队 tab', () => {
  it('列表渲染字段；空态有引导文案', async () => {
    mockApi({
      'GET /api/teams': { body: { teams: [TEAM(), TEAM({ id: 2, slug: 'other', name: '第二团队', status: 'paused' })] } },
      'GET /api/squads': { body: { squads: [] } },
    });
    render(<Teams />);
    await waitFor(() => expect(screen.getByText('AgentFlow 平台团队')).toBeInTheDocument());
    expect(screen.getByText('agentflow-core')).toBeInTheDocument();
    expect(screen.getByText('第二团队')).toBeInTheDocument();
    expect(screen.getByText('已暂停')).toBeInTheDocument();
  });

  it('空团队时显示建团引导', async () => {
    mockApi({
      'GET /api/teams': { body: { teams: [] } },
      'GET /api/squads': { body: { squads: [] } },
    });
    render(<Teams />);
    await waitFor(() => expect(screen.getByText(/还没有团队。团队是「谁的资产」的容器/)).toBeInTheDocument());
  });

  it('非法 slug 前端先拦，不发请求', async () => {
    const calls = mockApi({
      'GET /api/teams': { body: { teams: [] } },
      'GET /api/squads': { body: { squads: [] } },
    });
    render(<Teams />);
    await waitFor(() => expect(screen.getByText(/还没有团队/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('新建团队'));
    fireEvent.change(screen.getByLabelText('团队 slug'), { target: { value: 'Bad Slug' } });
    fireEvent.click(screen.getByText('创建团队'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/slug 必须匹配/));
    expect(calls.filter((c) => c.method === 'POST' && c.url === '/api/teams').length).toBe(0);
  });

  it('建团 409 文案透传，成功后刷新列表', async () => {
    const calls = mockApi({
      'GET /api/teams': { body: { teams: [] } },
      'GET /api/squads': { body: { squads: [] } },
      'POST /api/teams': { status: 409, body: { detail: 'slug 已被占用' } },
    });
    render(<Teams />);
    await waitFor(() => expect(screen.getByText(/还没有团队/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('新建团队'));
    fireEvent.change(screen.getByLabelText('团队 slug'), { target: { value: 'agentflow-core' } });
    fireEvent.change(screen.getByLabelText('团队名称'), { target: { value: 'X' } });
    fireEvent.click(screen.getByText('创建团队'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('slug 已被占用'));
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/teams')).toBe(true);
  });

  it('打开抽屉：摘要显示我的角色，成员可添加/移除（owner 不可移除）', async () => {
    const calls = mockApi({
      'GET /api/teams': { body: { teams: [TEAM()] } },
      'GET /api/teams/agentflow-core': { body: { team: TEAM(), members: MEMBERS, assets: EMPTY_ASSETS } },
      'POST /api/teams/agentflow-core/members': { body: { ok: true } },
      'DELETE /api/teams/agentflow-core/members/bob': { body: { ok: true } },
      'GET /api/squads': { body: { squads: [] } },
    });
    render(<Teams />);
    await waitFor(() => expect(screen.getByText('AgentFlow 平台团队')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('打开团队 AgentFlow 平台团队'));
    await waitFor(() => expect(screen.getByText(/我的角色 · owner/)).toBeInTheDocument());

    // owner 行的移除按钮禁用
    const ownerRow = screen.getByText('alice').closest('tr')!;
    expect(ownerRow.querySelector('button')).toBeDisabled();

    // 添加成员
    fireEvent.change(screen.getByLabelText('成员 user id'), { target: { value: 'carol' } });
    fireEvent.click(screen.getByText('添加成员'));
    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/api/teams/agentflow-core/members');
      expect(post?.body).toMatchObject({ user_id: 'carol', role: 'member' });
    });

    // 移除普通成员 → DELETE
    const bobRow = screen.getByText('bob').closest('tr')!;
    fireEvent.click(bobRow.querySelector('button')!);
    await waitFor(() => {
      expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/teams/agentflow-core/members/bob')).toBe(true);
    });
  });

  it('归档团队：二次确认后提交，archived 态禁用加成员/挂资产', async () => {
    const archived = TEAM({ status: 'archived' });
    const calls = mockApi({
      'GET /api/teams': { body: { teams: [TEAM()] } },
      'GET /api/teams/agentflow-core': { body: { team: archived, members: MEMBERS, assets: EMPTY_ASSETS } },
      'GET /api/squads': { body: { squads: [] } },
    });
    render(<Teams />);
    await waitFor(() => expect(screen.getByText('AgentFlow 平台团队')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('打开团队 AgentFlow 平台团队'));
    await waitFor(() => expect(screen.getByText(/已归档/)).toBeInTheDocument());

    expect(screen.getByText('添加成员')).toBeDisabled();
    expect(screen.getByText('挂载')).toBeDisabled();
    expect(screen.getByText('添加成员')).toHaveAttribute('title', '团队已归档：只停未来指派与变更');
    expect(calls.length).toBeGreaterThan(0);
  });

  it('释放资产用各自 kind（工作流不能被当成 Agent 释放）', async () => {
    const calls = mockApi({
      'GET /api/teams': { body: { teams: [TEAM()] } },
      'GET /api/teams/agentflow-core': {
        body: {
          team: TEAM(), members: MEMBERS,
          assets: { ...EMPTY_ASSETS, workflows: [{ id: 42, name: '发布流程', owner_id: 'alice', owner_kind: 'team', team_id: 1 }] },
        },
      },
      'POST /api/teams/agentflow-core/assets/workflows/42/release': { body: { ok: true } },
      'GET /api/squads': { body: { squads: [] } },
    });
    render(<Teams />);
    await waitFor(() => expect(screen.getByText('AgentFlow 平台团队')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('打开团队 AgentFlow 平台团队'));
    await waitFor(() => expect(screen.getByText('发布流程')).toBeInTheDocument());
    fireEvent.click(screen.getByText('释放'));
    await waitFor(() => {
      expect(calls.some((c) => c.method === 'POST'
        && c.url === '/api/teams/agentflow-core/assets/workflows/42/release')).toBe(true);
    });
  });

  it('转让 owner：未勾选确认时按钮禁用；勾选后提交 confirm=true', async () => {
    const calls = mockApi({
      'GET /api/teams': { body: { teams: [TEAM()] } },
      'GET /api/teams/agentflow-core': { body: { team: TEAM(), members: MEMBERS, assets: EMPTY_ASSETS } },
      'POST /api/teams/agentflow-core/transfer-owner': { body: { ok: true, team: TEAM({ owner_user_id: 'bob' }) } },
      'GET /api/squads': { body: { squads: [] } },
    });
    render(<Teams />);
    await waitFor(() => expect(screen.getByText('AgentFlow 平台团队')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('打开团队 AgentFlow 平台团队'));
    await waitFor(() => expect(screen.getByLabelText('新 owner 用户 id')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('新 owner 用户 id'), { target: { value: 'bob' } });
    const btn = screen.getByText('转让 owner');
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/api/teams/agentflow-core/transfer-owner');
      expect(post?.body).toMatchObject({ new_owner: 'bob', confirm: true });
    });
  });

  it('资产挂载：提交 kind + id；冲突文案透传', async () => {
    const calls = mockApi({
      'GET /api/teams': { body: { teams: [TEAM()] } },
      'GET /api/teams/agentflow-core': { body: { team: TEAM(), members: MEMBERS, assets: EMPTY_ASSETS } },
      'POST /api/teams/agentflow-core/assets/tools/9/claim': {
        status: 400, body: { detail: '只能转让自己的资产' },
      },
      'GET /api/squads': { body: { squads: [] } },
    });
    render(<Teams />);
    await waitFor(() => expect(screen.getByText('AgentFlow 平台团队')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('打开团队 AgentFlow 平台团队'));
    await waitFor(() => expect(screen.getByLabelText('资产类型')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('资产类型'), { target: { value: 'tools' } });
    fireEvent.change(screen.getByLabelText('资产 ID'), { target: { value: '9' } });
    fireEvent.click(screen.getByText('挂载'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('只能转让自己的资产'));
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/teams/agentflow-core/assets/tools/9/claim')).toBe(true);
  });
});

describe('小队 tab', () => {
  it('列表 + 建队 + 归档 409 文案透传', async () => {
    const calls = mockApi({
      'GET /api/teams': { body: { teams: [] } },
      'GET /api/squads': { body: { squads: [SQUAD()] } },
      'POST /api/squads': { body: { ok: true, squad: SQUAD({ id: 2, slug: 'new-squad' }) } },
      'POST /api/squads/code-review/archive': { status: 409, body: { detail: 'leader Agent 已归档' } },
    });
    render(<Teams />);
    // 页名已移到壳层顶栏（.crumb），页面内只断言结构：tablist 存在
    await waitFor(() => expect(screen.getByRole('tablist', { name: '团队或小队' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: '小队' }));

    await waitFor(() => expect(screen.getByText('代码审查小队')).toBeInTheDocument());
    expect(screen.getByText(/leader · 审查助手/)).toBeInTheDocument();

    // 归档：先点一次进入确认，再点一次提交
    fireEvent.click(screen.getByText('归档小队'));
    fireEvent.click(screen.getByText('确认归档（只停未来指派）'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('leader Agent 已归档'));
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/squads/code-review/archive')).toBe(true);
  });

  it('建队需要 leader Agent ID；提交后刷新列表', async () => {
    const calls = mockApi({
      'GET /api/teams': { body: { teams: [] } },
      'GET /api/squads': { body: { squads: [] } },
      'POST /api/squads': { body: { ok: true, squad: SQUAD({ id: 2 }) } },
    });
    render(<Teams />);
    fireEvent.click(screen.getByRole('tab', { name: '小队' }));
    await waitFor(() => expect(screen.getByText(/还没有小队/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('新建小队'));
    fireEvent.change(screen.getByLabelText('小队 slug'), { target: { value: 'new-squad' } });
    fireEvent.change(screen.getByLabelText('小队名称'), { target: { value: '新小队' } });
    expect(screen.getByText('创建小队')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('leader Agent ID'), { target: { value: '7' } });
    fireEvent.click(screen.getByText('创建小队'));
    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/api/squads');
      expect(post?.body).toMatchObject({ slug: 'new-squad', name: '新小队', leader_agent_id: 7 });
    });
    expect(calls.filter((c) => c.method === 'GET' && c.url === '/api/squads').length).toBeGreaterThan(1);
  });
});
