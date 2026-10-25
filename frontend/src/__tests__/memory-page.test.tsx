import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Memory from '../pages/Memory';
import { useRsi } from '../stores/rsi';
import { useAuth } from '../stores/auth';
import { invalidateCache } from '../utils/requestDedup';

const MEM = (over: Partial<any> = {}) => ({
  id: 1, layer: 'L1', kind: 'positive', scope: 'agent', owner_id: 'alice',
  cue: '构建失败时先看 tsc', lesson: '先定位第一个类型错误',
  evidence: [{ ref: 'log-1' }], source_ref: 'sess-1', status: 'promoted',
  confounded: false, source_seq: 5, cites_seq: 4, pollution_flagged: false,
  post_ingest_scan: true, decay_score: 100, last_used_at: null, created_at: null, ...over,
});

const PROP = (over: Partial<any> = {}) => ({
  id: 1, title: '收紧 persona', dimension: 'invariant', surface_name: 'agent-config',
  target: 'prompts/persona.md', status: 'generated',
  budget: { steps: 10, tokens: 20000 }, used: { steps: 0, tokens: 0 },
  probe: {}, shadow: {}, judge_model: '', domain_signoffs: [],
  approved_by: null, approved_at: null, created_at: null, updated_at: null, ...over,
});

const GOV = {
  'GET /api/rsi/switches': {
    body: {
      switches: [
        { category: 'memory', enabled: true, state: 'running', label: '自动体运行中', updated_by: '', updated_at: null },
        { category: 'skill', enabled: false, state: 'paused', label: '自动体已暂停', updated_by: 'root', updated_at: null },
      ],
      categories: ['memory', 'skill', 'orchestration', 'model'],
    },
  },
  'GET /api/rsi/breakers': {
    body: {
      breakers: [
        { name: 'budget', status: 'closed', reason: '', counter: 0, opened_at: null },
        { name: 'collapse', status: 'open', reason: '低于噪声地板', counter: 1, opened_at: null },
      ],
      noise_floor: 0.01,
    },
  },
};

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
  useAuth.setState({ isAdmin: true, currentUser: { id: 'root', name: 'root', role: 'admin' } as any });
  useRsi.setState({
    memories: [], memoriesError: null, memoriesLoading: false,
    reviews: [], reviewsMemoryId: null, reviewsError: null,
    switches: [], breakers: [], noiseFloor: 0.01, govError: null,
    candidates: [], decayDays: 90,
    proposals: [], proposalsError: null, proposalsLoading: false,
    surfaces: [], immutablePrefixes: [],
    goldenSets: [], goldenSetsError: null,
  });
});

describe('记忆 tab', () => {
  it('列表渲染字段；空态有引导', async () => {
    mockApi({
      'GET /api/rsi/memories': { body: { memories: [MEM(), MEM({ id: 2, status: 'no_entry', cue: '空记忆' })] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      ...GOV,
    });
    render(<Memory />);
    await waitFor(() => expect(screen.getByText('构建失败时先看 tsc')).toBeInTheDocument());
    // 状态筛选下拉里也有 promoted/no_entry，这里只断言"列表里出现了" 
    expect(screen.getAllByText('promoted').length).toBeGreaterThan(0);
    expect(screen.getAllByText('no_entry').length).toBeGreaterThan(0);
  });

  it('三字段缺一 → no_entry 且明确说明"合法结论"', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'POST /api/rsi/memories': { body: { stored: false, status: 'no_entry', missing: ['cue', 'lesson', 'evidence'], memory: MEM({ status: 'no_entry' }) } },
      ...GOV,
    });
    render(<Memory />);
    await waitFor(() => expect(screen.getByText(/还没有记忆/)).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('写入记忆')[0]);
    const form = screen.getByRole('region', { name: '写入记忆' });
    fireEvent.click(within(form).getByText('写入记忆'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('no_entry'));
    expect(screen.getByRole('status')).toHaveTextContent('合法结论');
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/rsi/memories')).toBe(true);
  });

  it('因果前缀冲突：409 文案透传', async () => {
    mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'POST /api/rsi/memories': { status: 409, body: { detail: '因果前缀冲突：经验只能引用早于自身任务' } },
      ...GOV,
    });
    render(<Memory />);
    await waitFor(() => expect(screen.getByText(/还没有记忆/)).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('写入记忆')[0]);
    const form = screen.getByRole('region', { name: '写入记忆' });
    fireEvent.click(within(form).getByText('写入记忆'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('因果前缀冲突'));
  });

  it('看评审 → 拉 promotion_reviews 并渲染四要素', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [MEM()] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/reviews': {
        body: { reviews: [{ id: 1, memory_id: 1, verdict: 'helped', fields_complete: true, causal_check: true, pollution_scan: false, reviewer: 'alice', note: '', created_at: null }] },
      },
      ...GOV,
    });
    render(<Memory />);
    await waitFor(() => expect(screen.getByText('构建失败时先看 tsc')).toBeInTheDocument());
    fireEvent.click(screen.getByText('看评审'));
    await waitFor(() => expect(screen.getByText('helped')).toBeInTheDocument());
    expect(screen.getByText('字段完整 ✓')).toBeInTheDocument();
    expect(calls.some((c) => c.url.startsWith('/api/rsi/reviews?memory_id=1'))).toBe(true);
  });

  it('检疫按 source_ref 提交并显示条数；衰减候选列出', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [MEM({ id: 9, cue: '旧经验', decay_score: 12 })] } },
      'POST /api/rsi/memories/quarantine': { body: { ok: true, quarantined: 2 } },
      ...GOV,
    });
    render(<Memory />);
    await waitFor(() => expect(screen.getByText(/旧经验/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('source_ref'), { target: { value: 'sess-1' } });
    fireEvent.click(screen.getByText('检疫'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('已检疫'));
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/rsi/memories/quarantine')).toBe(true);
  });

  it('治理折叠：展开看开关与熔断；点开关提交；熔断复位需二次确认', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'POST /api/rsi/switches/memory': { body: { ok: true, switch: { category: 'memory', enabled: false, state: 'paused', label: '自动体已暂停' } } },
      'POST /api/rsi/breakers/collapse/reset': { body: { ok: true, breaker: { name: 'collapse', status: 'half_open' } } },
      ...GOV,
    });
    render(<Memory />);
    await waitFor(() => expect(screen.getByText(/自动化治理/)).toBeInTheDocument());
    expect(screen.getByText(/已暂停 1 · 熔断 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/自动化治理/));
    await waitFor(() => expect(screen.getByText('memory：')).toBeInTheDocument());

    // D11：停用是必须人批的动作 → 前端 prompt 收因；先证「取消（空原因）= 不提交」
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');
    fireEvent.click(screen.getByText('memory：'));
    expect(promptSpy).toHaveBeenCalled();
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/rsi/switches/memory')).toBe(false);
    promptSpy.mockReturnValue('演练暂停');
    fireEvent.click(screen.getByText('memory：'));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/rsi/switches/memory')).toBe(true));
    // 提交体必须携带原因（服务端 400 是第二道，前端不许漏发）
    const swPost = calls.find((c) => c.method === 'POST' && c.url === '/api/rsi/switches/memory');
    expect(swPost).toBeDefined();
    expect(swPost!.body).toMatchObject({ enabled: false, reason: '演练暂停' });
    promptSpy.mockRestore();

    fireEvent.click(screen.getByText('复位'));
    expect(screen.getByText('确认复位')).toBeInTheDocument();
    fireEvent.click(screen.getByText('确认复位'));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/rsi/breakers/collapse/reset')).toBe(true));
  });
});

describe('遗留小项', () => {
  it('手动熔断：需填原因，提交到 trip 端点', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'POST /api/rsi/breakers/budget/trip': { body: { ok: true, breaker: { name: 'budget', status: 'open' } } },
      ...GOV,
    });
    render(<Memory />);
    await waitFor(() => expect(screen.getByText(/自动化治理/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/自动化治理/));
    await waitFor(() => expect(screen.getByLabelText('熔断原因')).toBeInTheDocument());
    expect(screen.getByText('手动熔断')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('熔断原因'), { target: { value: '预算异常' } });
    fireEvent.click(screen.getByText('手动熔断'));
    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/api/rsi/breakers/budget/trip');
      expect(post?.body).toMatchObject({ reason: '预算异常' });
    });
  });

  it('Tabs 支持方向键切换且 roving tabindex', async () => {
    mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [] } },
      'GET /api/rsi/surfaces': { body: { surfaces: [], immutable_prefixes: [] } },
      ...GOV,
    });
    render(<Memory />);
    const memTab = screen.getByRole('tab', { name: '记忆' });
    const propTab = screen.getByRole('tab', { name: '提案' });
    expect(memTab).toHaveAttribute('tabindex', '0');
    expect(propTab).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(memTab, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByRole('tab', { name: '提案' })).toHaveAttribute('aria-selected', 'true'));
  });

  it('可改面可编辑（PUT）与删除（DELETE），仅管理员可见列表', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [] } },
      'GET /api/rsi/surfaces': {
        body: { surfaces: [{ id: 3, name: 'agent-config', allow_edit: ['prompts/'], immutable: [] }],
                immutable_prefixes: ['scripts/'] },
      },
      'PUT /api/rsi/surfaces/3': { body: { ok: true } },
      'DELETE /api/rsi/surfaces/3': { body: { ok: true } },
      ...GOV,
    });
    render(<Memory />);
    fireEvent.click(screen.getByRole('tab', { name: '提案' }));
    await waitFor(() => expect(screen.getByText('已有可改面')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('编辑可改面 agent-config'));
    fireEvent.change(screen.getByLabelText('白名单路径（编辑）'), { target: { value: 'prompts/, docs/' } });
    fireEvent.click(screen.getByText('保存'));
    await waitFor(() => {
      const put = calls.find((c) => c.method === 'PUT' && c.url === '/api/rsi/surfaces/3');
      expect(put?.body).toEqual({ allow_edit: ['prompts/', 'docs/'] });
    });
    fireEvent.click(screen.getByLabelText('删除可改面 agent-config'));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/rsi/surfaces/3')).toBe(true));
  });

  it('管理员新建可改面 → POST /api/rsi/surfaces', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [] } },
      'GET /api/rsi/surfaces': { body: { surfaces: [], immutable_prefixes: ['scripts/'] } },
      'POST /api/rsi/surfaces': { body: { ok: true, surface: { id: 1, name: 'agent-config' } } },
      ...GOV,
    });
    render(<Memory />);
    fireEvent.click(screen.getByRole('tab', { name: '提案' }));
    await waitFor(() => expect(screen.getByText('新建可改面')).toBeInTheDocument());
    fireEvent.click(screen.getByText('新建可改面'));
    fireEvent.change(screen.getByLabelText('surface 名称'), { target: { value: 'agent-config' } });
    fireEvent.change(screen.getByLabelText('白名单路径'), { target: { value: 'prompts/, skills/' } });
    fireEvent.click(screen.getByText('创建'));
    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/api/rsi/surfaces');
      expect(post?.body).toMatchObject({ name: 'agent-config', allow_edit: ['prompts/', 'skills/'] });
    });
  });
});

describe('提案 tab', () => {
  const openProposals = async () => {
    render(<Memory />);
    fireEvent.click(screen.getByRole('tab', { name: '提案' }));
  };

  it('空态文案', async () => {
    mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [] } },
      'GET /api/rsi/surfaces': { body: { surfaces: [], immutable_prefixes: ['scripts/'] } },
      ...GOV,
    });
    await openProposals();
    await waitFor(() => expect(screen.getByText(/还没有提案/)).toBeInTheDocument());
  });

  it('generated 只给探针，不给发布', async () => {
    mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [PROP()] } },
      'GET /api/rsi/surfaces': { body: { surfaces: [], immutable_prefixes: [] } },
      ...GOV,
    });
    await openProposals();
    await waitFor(() => expect(screen.getByText('收紧 persona')).toBeInTheDocument());
    expect(screen.getByText('记录探针')).toBeInTheDocument();
    expect(screen.queryByText('人批发布')).not.toBeInTheDocument();
  });

  it('影子重放缺金标/异厂 → 409 文案透传', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [PROP({ status: 'probed' })] } },
      'GET /api/rsi/surfaces': { body: { surfaces: [], immutable_prefixes: [] } },
      'POST /api/rsi/proposals/1/shadow': { status: 409, body: { detail: '金标未冻结：防污染闸未通过' } },
      ...GOV,
    });
    await openProposals();
    await waitFor(() => expect(screen.getByText('记录影子重放')).toBeInTheDocument());
    fireEvent.click(screen.getByText('记录影子重放'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('金标未冻结'));
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/rsi/proposals/1/shadow')).toBe(true);
  });

  it('awaiting_approval：非管理员发布按钮置灰并给原因', async () => {
    useAuth.setState({ isAdmin: false, currentUser: { id: 'bob', name: 'bob', role: 'member' } as any });
    mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [PROP({ status: 'awaiting_approval' })] } },
      'GET /api/rsi/surfaces': { body: { surfaces: [], immutable_prefixes: [] } },
      ...GOV,
    });
    await openProposals();
    await waitFor(() => expect(screen.getByText('人批发布')).toBeInTheDocument());
    expect(screen.getByText('人批发布')).toBeDisabled();
    expect(screen.getByText('人批发布')).toHaveAttribute('title', '只有平台管理员可以发布提案');
  });

  it('管理员发布需二次确认，成功后状态变 published', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [PROP({ status: 'awaiting_approval' })] } },
      'GET /api/rsi/surfaces': { body: { surfaces: [], immutable_prefixes: [] } },
      'POST /api/rsi/proposals/1/publish': { body: { ok: true, proposal: PROP({ status: 'published' }) } },
      ...GOV,
    });
    await openProposals();
    await waitFor(() => expect(screen.getByText('人批发布')).toBeInTheDocument());
    fireEvent.click(screen.getByText('人批发布'));
    expect(screen.getByText('确认发布（人批）')).toBeInTheDocument();
    fireEvent.click(screen.getByText('确认发布（人批）'));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/rsi/proposals/1/publish')).toBe(true));
  });

  it('新建提案：需选 surface 才能提交，body 含限额', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [] } },
      'GET /api/rsi/surfaces': { body: { surfaces: [{ id: 1, name: 'agent-config', allow_edit: ['prompts/'], immutable: [], owner_id: 'root' }], immutable_prefixes: [] } },
      'POST /api/rsi/proposals': { body: { ok: true, proposal: PROP() } },
      ...GOV,
    });
    await openProposals();
    await waitFor(() => expect(screen.getByText(/还没有提案/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('新建提案'));
    fireEvent.change(screen.getByLabelText('提案标题'), { target: { value: '收紧 persona' } });
    expect(screen.getByText('创建提案')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('可改面'), { target: { value: 'agent-config' } });
    fireEvent.change(screen.getByLabelText('目标路径'), { target: { value: 'prompts/persona.md' } });
    fireEvent.click(screen.getByText('创建提案'));
    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/api/rsi/proposals');
      expect(post?.body).toMatchObject({
        title: '收紧 persona', dimension: 'invariant',
        surface_name: 'agent-config', target: 'prompts/persona.md',
      });
    });
  });
});

describe('v25 R25 接线（记忆新列 + 金标集选择）', () => {
  const openProps = async () => {
    render(<Memory />);
    fireEvent.click(screen.getByRole('tab', { name: '提案' }));
  };

  // ── R25-1：写入表单带上 domain / content / confidence ──
  it('写入表单带 domain + content + confidence（后端已收，此前落默认值）', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'POST /api/rsi/memories': { body: { stored: true, status: 'promoted', memory: MEM() } },
      ...GOV,
    });
    render(<Memory />);
    await waitFor(() => expect(screen.getByText(/还没有记忆/)).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('写入记忆')[0]);
    const form = screen.getByRole('region', { name: '写入记忆' });
    fireEvent.change(within(form).getByLabelText('内容域'), { target: { value: 'procedural' } });
    fireEvent.change(within(form).getByLabelText('内容摘要'), { target: { value: '内容摘要文本' } });
    fireEvent.change(within(form).getByLabelText('置信度'), { target: { value: '0.9' } });
    fireEvent.change(within(form).getByLabelText('cue'), { target: { value: 'c' } });
    fireEvent.change(within(form).getByLabelText('lesson'), { target: { value: 'l' } });
    fireEvent.change(within(form).getByLabelText('evidence'), { target: { value: 'log-1' } });
    fireEvent.click(within(form).getByText('写入记忆'));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/rsi/memories')).toBe(true));
    const post = calls.find((c) => c.method === 'POST' && c.url === '/api/rsi/memories');
    expect(post?.body).toMatchObject({ domain: 'procedural', content: '内容摘要文本', confidence: 0.9 });
  });

  it('筛选器把 domain / life_status 透传到 query（后端已接受，此前前端未接）', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [MEM({ id: 3 })] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      ...GOV,
    });
    render(<Memory />);
    await waitFor(() => expect(screen.getByLabelText('内容域筛选')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('内容域筛选'), { target: { value: 'rule' } });
    fireEvent.change(screen.getByLabelText('生命周期筛选'), { target: { value: 'stale-flagged' } });
    await waitFor(() => expect(calls.some(
      (c) => /domain=rule/.test(c.url) && /life_status=stale-flagged/.test(c.url))).toBe(true));
  });

  it('列表行回显 domain / 非 active 生命周期 / 置信', async () => {
    mockApi({
      'GET /api/rsi/memories': {
        body: { memories: [MEM({ domain: 'rule', life_status: 'stale-flagged', confidence: 0.5, content: '一句话' })] },
      },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      ...GOV,
    });
    render(<Memory />);
    await waitFor(() => expect(screen.getByText('构建失败时先看 tsc')).toBeInTheDocument());
    // 用 title 选中行内 chip（裸文本会撞筛选 select 的同值 option）
    expect(screen.getByTitle('内容域（与层正交）')).toHaveTextContent('rule');   // 内容域 chip
    expect(screen.getByTitle('生命周期：失效=标记非删除')).toHaveTextContent('stale-flagged'); // 生命周期 chip
    expect(screen.getByText(/置信/)).toBeInTheDocument();
    expect(screen.getByText(/· 一句话/)).toBeInTheDocument();      // 内容摘要 = lesson 尾串（带 · 前缀）
  });

  // ── R25-6：影子重放引用已冻结金标集 → 传 golden_set_id（平台校验，取代自报布尔）──
  it('引用冻结金标集时提交带 golden_set_id，自报勾选禁用', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [PROP({ status: 'probed' })] } },
      'GET /api/rsi/surfaces': { body: { surfaces: [], immutable_prefixes: [] } },
      'GET /api/rsi/golden-sets': {
        body: { golden_sets: [
          { id: 7, name: '回归金标', kind: 'eval_set', cases_count: 12, produced_by: 'openai',
            frozen: true, frozen_at: '2026-10-25T00:00:00', frozen_by: 'root', eval_mark: 'm',
            owner_id: 'root', created_at: null },
          { id: 8, name: '未冻结集', kind: 'eval_set', cases_count: 3, produced_by: 'anthropic',
            frozen: false, frozen_at: null, frozen_by: '', eval_mark: null, owner_id: 'root', created_at: null },
        ] },
      },
      'POST /api/rsi/proposals/1/shadow': { body: { ok: true, proposal: PROP({ status: 'shadowed' }) } },
      ...GOV,
    });
    await openProps();
    await waitFor(() => expect(screen.getByText('记录影子重放')).toBeInTheDocument());
    // 只列已冻结集（id=7），未冻结的 8 不出现为可选项
    const sel = screen.getByLabelText('金标集');
    fireEvent.change(sel, { target: { value: '7' } });
    // 选了金标集 → 两个自报勾选置灰
    expect(screen.getByText('金标已冻结（自报）').closest('label')).toHaveStyle({ opacity: 0.45 });
    fireEvent.click(screen.getByText('记录影子重放'));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/rsi/proposals/1/shadow')).toBe(true));
    const post = calls.find((c) => c.method === 'POST' && c.url === '/api/rsi/proposals/1/shadow');
    expect(post?.body).toMatchObject({ golden_set_id: 7 });
    expect(post?.body).not.toHaveProperty('golden_set_frozen');   // 平台校验下不再发自报布尔
  });

  it('不引用金标集时回退自报（保持旧布尔路径 · 后端标 self_declared）', async () => {
    const calls = mockApi({
      'GET /api/rsi/memories': { body: { memories: [] } },
      'GET /api/rsi/memories/decay': { body: { candidates: [] } },
      'GET /api/rsi/proposals': { body: { proposals: [PROP({ status: 'probed' })] } },
      'GET /api/rsi/surfaces': { body: { surfaces: [], immutable_prefixes: [] } },
      'GET /api/rsi/golden-sets': { body: { golden_sets: [] } },
      'POST /api/rsi/proposals/1/shadow': { body: { ok: true, proposal: PROP({ status: 'shadowed' }) } },
      ...GOV,
    });
    await openProps();
    await waitFor(() => expect(screen.getByText('记录影子重放')).toBeInTheDocument());
    const goldenCheck = screen.getByText('金标已冻结（自报）').closest('label')?.querySelector('input');
    if (goldenCheck) fireEvent.click(goldenCheck);
    fireEvent.click(screen.getByText('记录影子重放'));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/rsi/proposals/1/shadow')).toBe(true));
    const post = calls.find((c) => c.method === 'POST' && c.url === '/api/rsi/proposals/1/shadow');
    expect(post?.body).toMatchObject({ golden_set_frozen: true });
    expect(post?.body).not.toHaveProperty('golden_set_id');
  });
});
