/**
 * AD：v26 Agent 详情壳的「栏与入口」回归（change: v26-agent-ui · 笔3）
 *
 * 盯的是壳层骨架，不是分区内容（分区逐栏断言在 agent-config-sections.test.tsx）：
 * - AD-01 顶层六栏齐、默认落概览；
 * - AD-02 真实入口链：侧栏 Agent → 列表卡片点击 → 进新壳落概览（App 级，覆盖 agentDetail 覆盖态）；
 * - AD-03 概览拉的是真端点（sessions?entity_type=agent / breakdown），代替口径注明；
 * - AD-04 工作栏双端点（tasks?assignee + scheduled-tasks）+ 权限注 + 打开看板回调；
 * - AD-05 切出再回顶层栏草稿不丢、保存恰 1 次 PUT（CFG-06 的顶层栏变体，走「工作」中转）；
 * - AD-06 创建态只两栏、默认落含必填、探活/危险区彻底不在。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../App';
import AgentDetail from '../pages/AgentDetail';
import { useRuntimes } from '../stores/runtimes';
import { invalidateCache } from '../utils/requestDedup';

function mockApi(routes: Record<string, { status?: number; body: any }>, fallback?: any) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const pathed = `${method} ${String(url).split('?')[0]}`;
    const hit = routes[`${method} ${String(url)}`] ?? routes[pathed] ?? fallback
      ?? { status: 404, body: { detail: `no mock ${pathed}` } };
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

const RT = (over: Partial<any> = {}) => ({
  id: 1, machine_id: 'm1', machine_name: 'ubntu', cli: 'dsh', protocol_family: 'stdio',
  binary_path: 'node dsh', source_file: 'known', version: '0.1.3', models: [],
  models_error: '', capabilities: [], status: 'online', last_seen: '2026-10-24T23:00:00Z',
  visibility: 'private', bound_agents: 1, mine: true, ...over,
});

const AGENT = (over: Partial<any> = {}) => ({
  id: 7, name: '审查助手', description: '', owner_id: 'u-1', status: 'standby',
  runtime: 'dsh', model_name: '', token_soft_limit: 200000, token_hard_limit: 240000,
  system_prompt: '', io_filter: 'none', domain_id: null, visibility: 'private',
  custom_env: {}, custom_args: [], mcp_config: {}, ...over,
});

/** 详情壳 + 概览五端点的公共路由（AD-03/04/05 复用） */
const SHELL_ROUTES = {
  'GET /api/workflows': { body: { workflows: [] } },
  'GET /api/runtimes': { body: { runtimes: [RT()] } },
  'GET /api/domains': { body: { domains: [] } },
  'GET /api/tools': { body: { tools: [] } },
  'GET /api/agents/7/tools': { body: { tools: [] } },
  'GET /api/agents/7/knowledge-sources': { body: [] },
  'GET /api/agents/7/scheduled-tasks': { body: [] },
  'GET /api/agents/7/channels': { body: [] },
  'GET /api/control-plane/probes': { body: [] },
  'GET /api/metrics/sessions': { body: { sessions: [] } },
  'GET /api/metrics/agent/7': { body: { limits: { total_tokens_used: 0, token_hard_limit: 240000, usage_percent: 0 } } },
  'GET /api/agents/7/memory/channels': { body: { channels: {} } },
  'GET /api/metrics/entity/agent/7/breakdown': { body: { total_tokens: 0, total_calls: 0 } },
};

function gotoTop(name: string) { fireEvent.click(screen.getByRole('button', { name })); }

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  useRuntimes.setState({ registry: [], registryLoading: false, registryError: null });
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('v26 详情壳 · 栏与入口', () => {
  // AD-01：六栏逐字齐，默认落「概览」只读工作台
  it('AD-01 顶层六栏配置正确且默认落概览', async () => {
    mockApi(SHELL_ROUTES);
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    const bar = await screen.findByLabelText('Agent 详情标签');
    expect(within(bar).getAllByRole('button').map((b) => b.textContent))
      .toEqual(['概览', '工作', '能力', '设置', '记忆', '对话']);
    expect(screen.getByLabelText('概览')).toBeInTheDocument();
  });

  // AD-02：App 级入口链——侧栏「Agent」→ 列表卡片点击 → 覆盖态新壳落概览
  it('AD-02 列表卡片点击进入新壳并落概览', async () => {
    const ADMIN = ['project:read', 'project:write', 'project:delete', 'workflow:stop', 'user:manage', 'audit:view'];
    mockApi({
      ...SHELL_ROUTES,
      'GET /api/auth/me': { body: {
        user: { id: 'admin', name: '管理员', role: 'admin', must_change_password: false, project_ids: [], custom_permissions: [], active: true, created_at: '' },
        permissions: {}, role_permissions: ADMIN, must_change_password: false,
      } },
      'GET /api/auth/users': { body: { users: [] } },
      'GET /api/alerts/count': { body: { unacknowledged: 0 } },
      'GET /api/admin/workflow': { body: { stages: [] } },
      'GET /api/projects': { body: { projects: [] } },
      'GET /api/agents': { body: { agents: [AGENT()] } },
      'GET /api/tasks': { body: { tasks: [], total: 0 } },
    }, { status: 200, body: {} });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Agent' }));
    fireEvent.click(await screen.findByText('审查助手'));
    // 覆盖态挂的是 v26 新壳：六栏 tab-bar 出现且落概览
    const bar = await screen.findByLabelText('Agent 详情标签');
    expect(within(bar).getAllByRole('button')).toHaveLength(6);
    await waitFor(() => expect(screen.getByLabelText('概览')).toBeInTheDocument());
    // 侧栏不再有「Agent 详情」二级入口（与 nav-groups 锁同源，这里从入口链再验一次）
    expect(screen.queryByRole('button', { name: 'Agent 详情' })).toBeNull();
  });

  // AD-03：概览 = 真端点 + 代替口径显式注明（不造 run 表）
  it('AD-03 概览拉 sessions(agent 轨) 与 breakdown，代替口径注明', async () => {
    const calls = mockApi(SHELL_ROUTES);
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    await screen.findByLabelText('概览');
    await waitFor(() => expect(calls.some((c) =>
      c.method === 'GET' && c.url.startsWith('/api/metrics/sessions?') &&
      c.url.includes('entity_type=agent') && c.url.includes('entity_id=7'),
    )));
    await waitFor(() => expect(calls.some((c) =>
      c.method === 'GET' && c.url.startsWith('/api/metrics/entity/agent/7/breakdown'),
    )));
    expect(await screen.findByText(/代替口径/)).toBeInTheDocument();
    expect(screen.getByText('近 24h 无模型会话。')).toBeInTheDocument();
    expect(screen.getByText('暂无探活记录。')).toBeInTheDocument();
  });

  // AD-04：工作栏双端点 + 权限注 + 打开看板
  it('AD-04 工作栏拉 tasks?assignee 与 scheduled-tasks，注明权限口径', async () => {
    const calls = mockApi({
      ...SHELL_ROUTES,
      'GET /api/tasks': { body: { tasks: [{ id: 1, title: '审 PR-88', status: 'todo', assignee_kind: 'agent', assignee_id: '7' }], total: 1 } },
    });
    const onOpenBoard = vi.fn();
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} onOpenBoard={onOpenBoard} />);
    gotoTop('工作');
    await waitFor(() => expect(calls.some((c) =>
      c.method === 'GET' && c.url.startsWith('/api/tasks?') &&
      c.url.includes('assignee_kind=agent') && c.url.includes('assignee_id=7'),
    )));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/agents/7/scheduled-tasks')));
    expect(await screen.findByText('审 PR-88')).toBeInTheDocument();
    expect(screen.getByText(/仅显示与你有关的任务/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /打开看板/ }));
    expect(onOpenBoard).toHaveBeenCalledTimes(1);
  });

  // AD-05：顶层栏中转（能力→工作→能力）草稿不丢，保存恰 1 次 PUT
  it('AD-05 经「工作」栏中转回能力，草稿仍在且保存恰 1 PUT', async () => {
    const calls = mockApi({ ...SHELL_ROUTES, 'PUT /api/agents/7': { body: { id: 7 } } });
    const onSave = vi.fn();
    render(<AgentDetail agent={AGENT({ mcp_config: { fs: { transport: 'stdio', command: 'x' } } })} onBack={() => {}} onSave={onSave} />);
    gotoTop('能力');
    fireEvent.click(within(screen.getByLabelText('能力子栏')).getByRole('button', { name: 'MCP' }));
    const ta = await screen.findByLabelText('MCP 配置 JSON');
    fireEvent.change(ta, { target: { value: '{"fs": {"transport": "sse", "url": "http://y"}}' } });
    // 中转「工作」再回「能力」——壳不卸载，草稿必须还在
    gotoTop('工作');
    gotoTop('能力');
    const saveBtn = await screen.findByRole('button', { name: /保存全部/ });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const puts = calls.filter((c) => c.method === 'PUT' && c.url === '/api/agents/7');
    expect(puts).toHaveLength(1);
    expect(puts[0].body.model_config_json.mcp_servers).toEqual({ fs: { transport: 'sse', url: 'http://y' } });
    expect(puts[0].body.mcp_config).toEqual({ fs: { transport: 'sse', url: 'http://y' } });
  });

  // AD-06：创建态——只两栏；默认落「设置·通用」，两项必填立即可见；探活/危险区彻底不在
  it('AD-06 创建态两栏、默认栏含必填、探活/危险区不渲', async () => {
    mockApi(SHELL_ROUTES);
    render(<AgentDetail agent={{ name: '', description: '' }} onBack={() => {}} onSave={() => {}} />);
    const bar = await screen.findByLabelText('Agent 详情标签');
    expect(within(bar).getAllByRole('button').map((b) => b.textContent)).toEqual(['能力', '设置']);
    expect(await screen.findByLabelText('名称')).toBeInTheDocument();
    expect(screen.getByLabelText('运行时')).toBeInTheDocument();
    const sub = within(screen.getByLabelText('设置子栏')).getAllByRole('button').map((b) => b.textContent);
    expect(sub).toEqual(['通用', 'Access', '环境', 'CLI 参数', '闸门']);
    expect(screen.queryByText('探活')).toBeNull();
    expect(screen.queryByText('危险区')).toBeNull();
    expect(screen.queryByLabelText('概览')).toBeNull();
  });
});
