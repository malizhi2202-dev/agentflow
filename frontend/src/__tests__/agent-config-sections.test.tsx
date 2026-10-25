/**
 * AC：Agent 详情/创建 tab 化后的分区渲染（change: v26-agent-ui · 前身 ui-parity P3-2 十六分区平铺）
 *
 * 形态口径改到 `components/agent-detail/panes.ts` 这张表：顶层 概览/工作/能力/设置/记忆/对话，
 * 能力 5 子栏（指令/技能/MCP/集成/知识源与编排）、设置 7 子栏（通用/Access/环境/CLI 参数/闸门/探活/危险区）。
 * 「16 分区同 DOM + 锚点条 16 链接」的旧断言**随 AnchorBar 退场作废**；守的还是同一批口径，换了测法：
 * - 每个分区标题都能在其所属子栏渲染出来（少一个=漏分区）；
 * - 顶层 6 栏、子栏 5/7 条，名称逐字对齐主档 §6.4；
 * - 环境变量的值恒掩码（`****` 哨兵），已存明文不出现在 DOM 里；
 * - 危险区必须二次确认才发删除请求；
 * - 保存是**一次** PUT，且把 `model_config_json.env_vars / cli_args / mcp_servers` 一起提交——
 *   草稿容器住在壳层，切栏/切组不丢（这条是 tab 化的命门）；
 * - 后端 400 的 detail 原样透传。
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
  // 概览栏（默认落栏）的数据源
  'GET /api/metrics/sessions': { body: { sessions: [] } },
  'GET /api/metrics/agent/7': { body: { limits: { total_tokens_used: 100, token_hard_limit: 240000, usage_percent: 0.04 } } },
  'GET /api/agents/7/memory/channels': { body: { channels: {} } },
  'GET /api/metrics/entity/agent/7/breakdown': { body: { total_tokens: 0, total_calls: 0 } },
};

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  useRuntimes.setState({ registry: [], registryLoading: false, registryError: null });
});

/** 顶层栏切换 */
function gotoTop(name: '概览' | '工作' | '能力' | '设置' | '记忆' | '对话') {
  fireEvent.click(screen.getByRole('button', { name }));
}
/** 进能力子栏 */
function gotoCap(pane: string) {
  gotoTop('能力');
  fireEvent.click(within(screen.getByLabelText('能力子栏')).getByRole('button', { name: pane }));
}
/** 进设置子栏 */
function gotoSet(pane: string) {
  gotoTop('设置');
  fireEvent.click(within(screen.getByLabelText('设置子栏')).getByRole('button', { name: pane }));
}

/** 子栏 → 分区标题（映射与 panes.ts 同源；这里逐字写死，表漂了测试就红） */
const CAP_PANE_TITLES: Record<string, string[]> = {
  '指令': ['3 · 指令与开场白'],
  '技能': ['10 · 技能'],
  'MCP': ['8 · MCP 服务绑定'],
  '集成': ['9 · 对外集成'],
  '知识源与编排': ['11 · 知识源', '12 · 编排引用'],
};
const SET_PANE_TITLES: Record<string, string[]> = {
  '通用': ['1 · 标识', '2 · 域归属', '4 · 运行时与模型', '5 · 执行设置'],
  'Access': ['13 · Access'],
  '环境': ['6 · 环境变量'],
  'CLI 参数': ['7 · CLI 自定义参数'],
  '闸门': ['14 · 闸门'],
  '探活': ['15 · 健康与探活'],
  '危险区': ['16 · 危险区'],
};

describe('Agent 详情 tab 化 · 分区渲染', () => {
  // CFG-01：16 个分区标题全在——逐个落在其所属子栏（少一个=漏分区）
  it('CFG-01 十六个分区标题按子栏全部渲染', async () => {
    mockApi(ROUTES);
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    // 默认落概览（只读工作台）
    await waitFor(() => expect(screen.getByLabelText('概览')).toBeInTheDocument());
    for (const [pane, titles] of Object.entries(CAP_PANE_TITLES)) {
      gotoCap(pane);
      for (const t of titles) {
        expect(await screen.findByText(t), `子栏「${pane}」缺分区：${t}`).toBeInTheDocument();
      }
    }
    for (const [pane, titles] of Object.entries(SET_PANE_TITLES)) {
      gotoSet(pane);
      for (const t of titles) {
        expect(await screen.findByText(t), `子栏「${pane}」缺分区：${t}`).toBeInTheDocument();
      }
    }
  });

  // CFG-02：顶层 6 栏 + 子栏 5/7，名称逐字对主档 §6.4；锚点条已退场
  it('CFG-02 顶层六栏与 5/7 子栏结构正确，分区直达锚点条不再存在', async () => {
    mockApi(ROUTES);
    const { container } = render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    const bar = await screen.findByLabelText('Agent 详情标签');
    expect(within(bar).getAllByRole('button').map((b) => b.textContent))
      .toEqual(['概览', '工作', '能力', '设置', '记忆', '对话']);
    expect(screen.queryByRole('navigation', { name: '分区直达' })).toBeNull();

    gotoCap('指令');
    expect(within(screen.getByLabelText('能力子栏')).getAllByRole('button').map((b) => b.textContent))
      .toEqual(['指令', '技能', 'MCP', '集成', '知识源与编排']);

    gotoSet('通用');
    expect(within(screen.getByLabelText('设置子栏')).getAllByRole('button').map((b) => b.textContent))
      .toEqual(['通用', 'Access', '环境', 'CLI 参数', '闸门', '探活', '危险区']);
    // 分区锚点 id 保留（与升格原型 secN 可对照深链）
    expect(container.querySelector('#sec1')).toBeTruthy();
    expect(container.querySelector('#sec5')).toBeTruthy();
  });

  // CFG-03：环境变量值恒掩码 —— 显示 ****，已存明文不进 DOM（现在要先切到 设置→环境）
  it('CFG-03 环境变量值显示掩码，明文不出现在页面', async () => {
    mockApi(ROUTES);
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    gotoSet('环境');
    await waitFor(() => expect(screen.getByLabelText('环境变量名 1')).toHaveValue('FOO'));
    expect(screen.getByLabelText('环境变量值 1')).toHaveValue('****');
    expect(screen.getByLabelText('环境变量值 1')).toHaveAttribute('readonly');
    expect(screen.queryByDisplayValue('bar')).toBeNull();
  });

  // CFG-04：危险区必须二次确认才发删除请求（先切到 设置→危险区）
  it('CFG-04 危险区二次确认后才调用删除', async () => {
    const calls = mockApi(ROUTES);
    const onDelete = vi.fn();
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} onDelete={onDelete} />);
    gotoSet('危险区');
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
    gotoSet('危险区');
    fireEvent.click(await screen.findByRole('button', { name: /删除 Agent/ }));
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/agents/7')).toBe(true));
  });

  // CFG-06：一次 PUT 把 model_config_json 三个新键（+ 专用列）一起提交；
  //         tab 化命门——先切到 能力→MCP 改文本，再切回 设置 保存：草稿不随切栏蒸发
  it('CFG-06 跨栏切换草稿不丢，保存一次 PUT 提交全部', async () => {
    const calls = mockApi({ ...ROUTES, 'PUT /api/agents/7': { body: { id: 7 } } });
    const onSave = vi.fn();
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={onSave} />);
    // 切到 能力→MCP 改一笔
    gotoCap('MCP');
    const ta = await screen.findByLabelText('MCP 配置 JSON');
    fireEvent.change(ta, { target: { value: '{"filesystem": {"transport": "sse", "url": "http://x"}}' } });
    // 切到 概览再回来——草稿必须还在（壳层 useAgentDraft）
    gotoTop('概览');
    gotoSet('通用');
    fireEvent.click(screen.getByRole('button', { name: /保存全部/ }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.url === '/api/agents/7')).toBe(true));
    const put = calls.find((c) => c.method === 'PUT' && c.url === '/api/agents/7')!;
    // 改动跨栏存活：MCP 新值进了这次 PUT
    expect(put.body.model_config_json.mcp_servers).toEqual({ filesystem: { transport: 'sse', url: 'http://x' } });
    // 另两键（没改过的）按原值双写
    expect(put.body.model_config_json.env_vars).toEqual({ FOO: 'bar' });   // **** 哨兵 → 保留原值，不存星号
    expect(put.body.model_config_json.cli_args).toEqual(['--sandbox', 'read-only']);
    expect(put.body.custom_env).toEqual({ FOO: 'bar' });
    expect(put.body.custom_args).toEqual(['--sandbox', 'read-only']);
    expect(put.body.mcp_config).toEqual({ filesystem: { transport: 'sse', url: 'http://x' } });
    // 常规字段仍在一起提交（一次 PUT，不是 N 次）
    expect(put.body.name).toBe('审查助手');
    expect(put.body.runtime).toBe('dsh');
    expect(put.body.system_prompt).toBe('你审查前端 PR');
    expect(put.body.token_soft_limit).toBe(200000);
    expect(put.body.domain_id).toBeNull();
    expect(calls.filter((c) => c.method === 'PUT' && c.url === '/api/agents/7')).toHaveLength(1);
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
    gotoSet('通用');
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
    gotoCap('MCP');
    const ta = await screen.findByLabelText('MCP 配置 JSON');
    fireEvent.change(ta, { target: { value: '{"filesystem": ' } });
    fireEvent.click(screen.getByRole('button', { name: /保存全部/ }));
    await waitFor(() => expect(screen.getByText(/MCP JSON 解析失败/)).toBeInTheDocument());
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  // CFG-09：未接入项必须显式标注（tab 化后分布在各子栏——逐栏累计计数，缺口一个不许伪造）
  it('CFG-09 未接入项显式标注（跨子栏累计）', async () => {
    mockApi(ROUTES);
    render(<AgentDetail agent={AGENT()} onBack={() => {}} onSave={() => {}} />);
    let unwired = 0;
    for (const pane of ['通用', 'Access', '闸门', '探活']) {
      gotoSet(pane);
      await screen.findByText(pane === '通用' ? '1 · 标识' : /\d+ · /);
      unwired += screen.getAllByText('未接入').length;
    }
    gotoCap('指令');
    await screen.findByText('3 · 指令与开场白');
    unwired += screen.getAllByText('未接入').length;
    expect(unwired).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/会话开场白/)).toBeInTheDocument();
    // 「别名」在未接入说明里出现（标识区）
    gotoSet('通用');
    expect(screen.getAllByText(/别名/).length).toBeGreaterThanOrEqual(1);
  });

  // CFG-10：创建态——两栏（能力/设置）、设置只有 5 子栏（**探活与危险区不进创建页**，主档 §6.4）
  it('CFG-10 创建态无探活/危险区子栏且默认落在含必填的通用栏', async () => {
    mockApi({ ...ROUTES, 'GET /api/runtimes': { body: { runtimes: [RT()] } } });
    render(<AgentDetail agent={{ name: '', description: '' }} onBack={() => {}} onSave={() => {}} />);
    const bar = await screen.findByLabelText('Agent 详情标签');
    expect(within(bar).getAllByRole('button').map((b) => b.textContent)).toEqual(['能力', '设置']);
    // 默认落 设置→通用：名称 + 运行时两个必填输入立即可见
    expect(await screen.findByLabelText('名称')).toBeInTheDocument();
    expect(within(screen.getByLabelText('设置子栏')).getAllByRole('button').map((b) => b.textContent))
      .toEqual(['通用', 'Access', '环境', 'CLI 参数', '闸门']);
    // 概览/工作/记忆/对话不进创建态
    expect(screen.queryByLabelText('概览')).toBeNull();
  });
});
