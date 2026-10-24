/**
 * AC：Agent 详情「编辑」标签 = 原型 16 分区配置页（change: ui-parity · P3-2）
 *
 * 原型：`.specs/product-design/prototype/agent-detail__config.html`（锚点 sec1…sec16 + sec-im）
 * 本用例守的是**可机读的那几条口径**：
 * - 16 个分区标题全在、页首锚点条正好 16 条链接（9A 只作说明，不占链接）；
 * - 环境变量的值恒掩码（`****` 哨兵），已存明文不出现在 DOM 里；
 * - 危险区必须二次确认才发删除请求（一次点击不落库）；
 * - 保存是**一次** PUT，且把 `model_config_json.env_vars / cli_args / mcp_servers` 一起提交；
 * - 后端 400 的 detail 原样透传（不改写成「保存失败」）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AgentDetail from '../pages/AgentDetail';
import { useRuntimes } from '../stores/runtimes';
import { invalidateCache } from '../utils/requestDedup';

/** mockApi 形态照抄 `ui-parity-pages.test.tsx`：按「方法 + 去 query 的路径」命中路由，并记录每次调用 */
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

const RT = (over: Partial<any> = {}) => ({
  id: 1, machine_id: 'm1', machine_name: 'ubntu', cli: 'dsh', protocol_family: 'stdio',
  binary_path: 'node dsh', source_file: 'known', version: '0.1.3', models: ['deepseek-official/deepseek-chat'],
  models_error: '', capabilities: ['model_list'], status: 'online', last_seen: '2026-10-24T23:00:00Z',
  visibility: 'private', bound_agents: 0, mine: true, ...over,
});

const AGENT = (over: Partial<any> = {}) => ({
  id: 7, name: '审查助手', description: '只读 diff', owner_id: 'u-1', status: 'standby',
  runtime: 'dsh', model_name: 'deepseek-official/deepseek-chat',
  token_soft_limit: 200000, token_hard_limit: 240000,
  gate_pre_check: 'diff 可读', gate_post_check: '发现数 ≥ 1', io_filter: 'sanitize',
  system_prompt: '你审查前端 PR', role_def: '严谨', sop: '触发: on_project_create',
  domain_id: null, visibility: 'private', created_at: '2026-10-20T10:00:00Z',
  custom_env: { FOO: 'bar' },
  custom_args: ['--sandbox', 'read-only'],
  mcp_config: { filesystem: { transport: 'stdio', command: 'mcp-server-filesystem' } },
  ...over,
});

const ROUTES = {
  'GET /api/workflows': { body: { workflows: [{ id: 3, name: '审查流水线', status: 'published', spec_json: { nodes: [1, 2] } }] } },
  'GET /api/runtimes': { body: { runtimes: [RT()] } },
  'GET /api/domains': { body: { domains: [{ id: 1, name: '默认域' }, { id: 2, name: '生产域' }] } },
  'GET /api/tools': { body: { tools: [{ id: 11, name: 'code-review', type: 'skill' }] } },
  'GET /api/agents/7/tools': { body: { tools: [{ id: 11, name: 'code-review', type: 'skill' }] } },
  'GET /api/agents/7/knowledge-sources': { body: [] },
  'GET /api/agents/7/scheduled-tasks': { body: [] },
  'GET /api/agents/7/channels': { body: [] },
  'GET /api/control-plane/probes': { body: { probes: [] } },
};

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  useRuntimes.setState({ registry: [], registryLoading: false, registryError: null });
});

/** 16 个分区标题（顺序即页面顺序；与原型逐字对齐） */
const SECTION_TITLES = [
  '1 · 标识', '2 · 域归属', '3 · 指令与开场白', '4 · 运行时与模型', '5 · 执行设置',
  '6 · 环境变量', '7 · CLI 自定义参数', '8 · MCP 服务绑定', '9 · 对外集成', '10 · 技能',
  '11 · 知识源', '12 · 编排引用', '13 · Access', '14 · 闸门', '15 · 健康与探活', '16 · 危险区',
];

describe('Agent config 十六分区', () => {
  // CFG-01：16 个分区标题全在（少一个就是漏分区）
  it('CFG-01 十六个分区标题全部渲染', async () => {
    mockApi(ROUTES);
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    await waitFor(() => expect(screen.getByText('1 · 标识')).toBeInTheDocument());
    SECTION_TITLES.forEach((t) => {
      expect(screen.getByText(t), `分区标题缺失：${t}`).toBeInTheDocument();
    });
  });

  // CFG-02：锚点条 16 条链接 + 9A 说明；链接指向的锚点 id 必须真实存在
  it('CFG-02 页首锚点条有 16 条链接且锚点存在', async () => {
    mockApi(ROUTES);
    const { container } = render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    const nav = await screen.findByRole('navigation', { name: '分区直达' });
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(16);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(
      Array.from({ length: 16 }, (_, i) => `#sec${i + 1}`),
    );
    // 每个 href 都能落到真实分区（不是贴了个假锚点）
    links.forEach((a) => {
      const id = (a.getAttribute('href') || '').slice(1);
      expect(container.querySelector('#' + id), `锚点 ${id} 无对应分区`).toBeTruthy();
    });
    // 9A（集成 · IM 通道）只作编号对照说明，不占第 17 条链接
    expect(within(nav).getByText(/9A = 集成（IM 通道）/)).toBeInTheDocument();
  });

  // CFG-03：环境变量值恒掩码 —— 显示 ****，已存明文不进 DOM
  it('CFG-03 环境变量值显示掩码，明文不出现在页面', async () => {
    mockApi(ROUTES);
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText('环境变量名 1')).toHaveValue('FOO'));
    expect(screen.getByLabelText('环境变量值 1')).toHaveValue('****');
    expect(screen.getByLabelText('环境变量值 1')).toHaveAttribute('readonly');
    expect(screen.queryByDisplayValue('bar')).toBeNull();
  });

  // CFG-04：危险区必须二次确认才发删除请求
  it('CFG-04 危险区二次确认后才调用删除', async () => {
    const calls = mockApi(ROUTES);
    const onDelete = vi.fn();
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} onDelete={onDelete} />);
    fireEvent.click(await screen.findByRole('button', { name: /删除 Agent/ }));
    // 一次点击只是开弹窗：既不调 onDelete，也不发 DELETE
    expect(onDelete).not.toHaveBeenCalled();
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    expect(screen.getByRole('dialog', { name: '彻底删除这个 Agent？' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  // 没有壳层 onDelete 时，确认后才自己发 DELETE /api/agents/{id}
  it('CFG-05 无 onDelete 时确认后才自己发 DELETE', async () => {
    const calls = mockApi({ ...ROUTES, 'DELETE /api/agents/7': { body: { status: 'deleted' } } });
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /删除 Agent/ }));
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/agents/7')).toBe(true));
  });

  // CFG-06：一次 PUT 把 model_config_json 三个新键（+ 专用列）一起提交
  it('CFG-06 保存把 model_config_json 的 env_vars/cli_args/mcp_servers 一起提交', async () => {
    const calls = mockApi({ ...ROUTES, 'PUT /api/agents/7': { body: { id: 7 } } });
    const onSave = vi.fn();
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={onSave} />);
    fireEvent.click(await screen.findByRole('button', { name: /保存全部/ }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.url === '/api/agents/7')).toBe(true));
    const put = calls.find((c) => c.method === 'PUT' && c.url === '/api/agents/7')!;
    // 三个新键
    expect(put.body.model_config_json.env_vars).toEqual({ FOO: 'bar' });   // **** 哨兵 → 保留原值，不存星号
    expect(put.body.model_config_json.cli_args).toEqual(['--sandbox', 'read-only']);
    expect(put.body.model_config_json.mcp_servers).toEqual({ filesystem: { transport: 'stdio', command: 'mcp-server-filesystem' } });
    // 专用列同步（PUT 白名单里既有 JSON 块也有这三列，只写一边会造成「本页可见、别处不生效」）
    expect(put.body.custom_env).toEqual({ FOO: 'bar' });
    expect(put.body.custom_args).toEqual(['--sandbox', 'read-only']);
    expect(put.body.mcp_config).toEqual({ filesystem: { transport: 'stdio', command: 'mcp-server-filesystem' } });
    // 常规字段仍在一起提交（一次 PUT，不是 N 次）
    expect(put.body.name).toBe('审查助手');
    expect(put.body.runtime).toBe('dsh');
    expect(put.body.system_prompt).toBe('你审查前端 PR');
    expect(put.body.token_soft_limit).toBe(200000);
    expect(put.body.domain_id).toBeNull();
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1);
    expect(onSave).toHaveBeenCalled();
  });

  // CFG-07：后端 400 的 detail 原样透传，且失败时不算保存成功
  it('CFG-07 后端 400 文案透传，失败不调用 onSave', async () => {
    const calls = mockApi({
      ...ROUTES,
      'PUT /api/agents/7': { status: 400, body: { detail: "不支持的 runtime: 'claude'。支持: ['dsh']" } },
    });
    const onSave = vi.fn();
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={onSave} />);
    fireEvent.click(await screen.findByRole('button', { name: /保存全部/ }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("不支持的 runtime: 'claude'");
    expect(onSave).not.toHaveBeenCalled();
    expect(calls.some((c) => c.method === 'PUT')).toBe(true);
  });

  // CFG-08：MCP JSON 坏掉时 fail-closed —— 不发 PUT（半截配置不落库）
  it('CFG-08 MCP JSON 不合法时拦住保存', async () => {
    const calls = mockApi({ ...ROUTES, 'PUT /api/agents/7': { body: { id: 7 } } });
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    const ta = await screen.findByLabelText('MCP 配置 JSON');
    fireEvent.change(ta, { target: { value: '{"filesystem": ' } });
    fireEvent.click(screen.getByRole('button', { name: /保存全部/ }));
    await waitFor(() => expect(screen.getByText(/MCP JSON 解析失败/)).toBeInTheDocument());
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  // CFG-09：未接入项必须显式标注（技能之外的缺口一个都不许伪造）
  it('CFG-09 未接入项显式标注', async () => {
    mockApi(ROUTES);
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    await waitFor(() => expect(screen.getByText('1 · 标识')).toBeInTheDocument());
    expect(screen.getAllByText('未接入').length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/会话开场白/)).toBeInTheDocument();
    // 「别名」在分区说明与未接入说明里各出现一次，故按集合断言
    expect(screen.getAllByText(/别名/).length).toBeGreaterThanOrEqual(1);
  });
});
