/**
 * AS：Agent 详情「能力 · 技能」区（v23 · multica `agent_skill` 迁移的落点）。
 *
 * 契约：`GET /api/agents/{id}/tools` → {tools:[{id,name,type}]}；
 *      `POST /api/agents/{id}/tools {tool_id}` 绑定（幂等）；`DELETE /api/agents/{id}/tools/{tool_id}` 解绑。
 * 口径：**绑定 ≠ 授权**，前端只做动作与回显，不做权限判断。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AgentDetail from '../pages/AgentDetail';
import { useRuntimes } from '../stores/runtimes';
import { invalidateCache } from '../utils/requestDedup';

/** v26：技能区现在住在「能力 → 技能」子栏——切到它（顶层栏在壳层 .tab-bar，子栏在「能力子栏」） */
function gotoSkill() {
  fireEvent.click(within(screen.getByLabelText('Agent 详情标签')).getByRole('button', { name: '能力' }));
  fireEvent.click(within(screen.getByLabelText('能力子栏')).getByRole('button', { name: '技能' }));
}

const BOUND = [{ id: 11, name: 'code-review', type: 'skill', description: '代码审查' }];
const ALL_SKILLS = [
  { id: 11, name: 'code-review', type: 'skill', description: '代码审查' },
  { id: 12, name: 'git-workflow', type: 'skill', description: 'Git 流程' },
];

function mockApi(routes: Record<string, { status?: number; body: any }>) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const key = `${method} ${String(url).split('?')[0]}`;
    const hit = routes[key] ?? routes[`${method} ${String(url)}`] ?? { status: 404, body: { detail: `no mock ${key}` } };
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

const AGENT = (over: Partial<any> = {}) => ({
  id: 7, name: '审查助手', description: '', runtime: 'hermes', model_name: '',
  token_soft_limit: 800000, token_hard_limit: 1000000, ...over,
});

const ROUTES = {
  'GET /api/workflows': { body: { workflows: [] } },
  'GET /api/runtimes': { body: { runtimes: [] } },
  'GET /api/tools': { body: { tools: ALL_SKILLS } },
  'GET /api/agents/7/tools': { body: { tools: BOUND } },
  'GET /api/agents/7/knowledge-sources': { body: [] },
  'GET /api/agents/7/scheduled-tasks': { body: [] },
  'GET /api/metrics/sessions': { body: { sessions: [] } },
};

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  useRuntimes.setState({ registry: [], registryLoading: false, registryError: null });
});

describe('Agent 能力 · 技能', () => {
  // AS-01：已有 Agent → 拉绑定列表并显示
  it('AS-01 显示已绑定技能与数量', async () => {
    mockApi(ROUTES);
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    gotoSkill();
    await waitFor(() => expect(screen.getByText('code-review')).toBeTruthy());
    expect(screen.getByText(/能力 · 技能（1）/)).toBeTruthy();
    expect(screen.getByRole('region', { name: '能力技能' })).toBeTruthy();
  });

  // AS-02：选一个未绑定的技能 → 绑定 → 重新拉列表
  it('AS-02 绑定技能后又拉了一次绑定列表', async () => {
    const calls = mockApi({
      ...ROUTES,
      'POST /api/agents/7/tools': { body: { ok: true, tool_id: 12 } },
    });
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    gotoSkill();
    const select = await screen.findByLabelText('选择要绑定的技能') as HTMLSelectElement;
    await waitFor(() => expect(Array.from(select.options).some((o) => o.value === '12')).toBe(true));
    fireEvent.change(select, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /绑定/ }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/agents/7/tools')).toBe(true));
    const post = calls.find((c) => c.method === 'POST' && c.url === '/api/agents/7/tools')!;
    expect(post.body).toEqual({ tool_id: 12 });
    const listCalls = calls.filter((c) => c.method === 'GET' && c.url === '/api/agents/7/tools');
    expect(listCalls.length).toBeGreaterThanOrEqual(2);   // 写后读一致：绑定后重拉
  });

  // AS-03：解绑 → DELETE → 重拉
  it('AS-03 解绑已绑定技能', async () => {
    const calls = mockApi({ ...ROUTES, 'DELETE /api/agents/7/tools/11': { body: { ok: true } } });
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    gotoSkill();
    await waitFor(() => expect(screen.getByText('code-review')).toBeTruthy());
    fireEvent.click(screen.getByTitle('解绑 code-review'));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/agents/7/tools/11')).toBe(true));
    const listCalls = calls.filter((c) => c.method === 'GET' && c.url === '/api/agents/7/tools');
    expect(listCalls.length).toBeGreaterThanOrEqual(2);
  });

  // AS-04：新建（无 id）→ 提示先保存，且不发绑定相关请求
  it('AS-04 新建时提示先保存，不发绑定请求', async () => {
    const calls = mockApi(ROUTES);
    render(<AgentDetail agent={{ name: '', description: '' }} onBack={() => {}} onSave={() => {}} />);
    gotoSkill();
    await waitFor(() => expect(screen.getByText(/先保存 Agent/)).toBeTruthy());
    expect(calls.some((c) => c.url.indexOf('/tools') >= 0 && c.method !== 'GET')).toBe(false);
  });
});
