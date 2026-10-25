/**
 * Agent 管控面 · 另挂三块卡区（P3-4，原型 `control-plane.html` 6.3）
 *
 * 纪律：
 * - 断言打「页面上真有的文案与字段」，不锁组件结构；
 * - 数据必须来自接口（`/api/rsi/switches|surfaces`、`/api/control-plane/cluster`）——
 *   把接口返回值改掉、页面跟着变才算真接线；
 * - 后端没有的字段一律「未接入 / 该字段后端未提供」，**用例盯住这句话还在**，
 *   防后人偷偷塞演示数值；
 * - 写操作必须打对端点，失败时后端 `detail` 原样进 role=alert；
 * - 既有三层树（域 → 能力组 → Agent）与多标签归属不许退化。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AgentControlPlane from '../pages/AgentControlPlane';
import { useControlPlane } from '../stores/controlPlane';
import { useDomains } from '../stores/domains';
import { invalidateCache } from '../utils/requestDedup';

// ── 夹具：全部照后端真实返回形状 ──────────────────────────

const CLUSTER = {
  instance_id: 'i-abc123',
  deploy_mode: 'localhost',
  lease_ttl_seconds: 90,
  leases: {
    'reconcile-loop': {
      name: 'reconcile-loop', owner: 'i-abc123:4242', active: true,
      expires_at: '2026-10-24T12:00:00', heartbeat_at: '2026-10-24T11:58:30',
    },
  },
  queue: { total: 4, leased: 1, by_label: { 'code-review': 3, python: 1 } },
  reconcile_backoff_rows: 2,
  process_local: ['OAuth 授权 state 与非重放缓存'],
  checked_at: '2026-10-24T11:58:40',
};

/** /api/rsi/switches 的真实形状（后端按 RSI_CATEGORIES 生成四行） */
const SWITCHES = {
  switches: [
    { category: 'memory', enabled: true, state: 'running', label: '自动体运行中', updated_by: 'admin', updated_at: '2026-10-24T08:00:00' },
    { category: 'skill', enabled: true, state: 'running', label: '自动体运行中', updated_by: 'admin', updated_at: '2026-10-24T08:00:00' },
    { category: 'orchestration', enabled: false, state: 'paused', label: '自动体已暂停', updated_by: 'li', updated_at: '2026-10-24T09:10:00' },
    { category: 'model', enabled: false, state: 'paused', label: '自动体已暂停', updated_by: 'li', updated_at: '2026-10-24T09:10:00' },
  ],
  categories: ['memory', 'skill', 'orchestration', 'model'],
};

/** /api/rsi/surfaces 的真实形状：只有 name / allow_edit / immutable 三列 */
const SURFACES = {
  surfaces: [
    { id: 1, name: 'skill', allow_edit: ['workspace/skills', 'agents/skills'], immutable: ['scripts/', 'hooks/'], owner_id: 'admin', created_at: '2026-10-20T00:00:00' },
    { id: 2, name: 'memory', allow_edit: [], immutable: ['scripts/'], owner_id: 'admin', created_at: '2026-10-20T00:00:00' },
  ],
  immutable_prefixes: ['scripts/', 'plugins/', 'hooks/'],
};

const PROBES = [
  {
    agent_id: 1, agent_name: '审查 Agent · 标准', status: 'running', health: 'healthy',
    last_heartbeat: '2026-10-24T11:58:30', runtime: 'dsh', model_name: 'deepseek-chat',
    tokens_used: 1200, token_soft_limit: 1000, token_hard_limit: 4000, probes: [],
  },
];

const QUEUE = [
  {
    id: 1, task_id: 'task-3', label: 'code-review', domain_id: null, agent_id: null,
    status: 'queued', priority: 200, attempts: 0, enqueued_at: '2026-10-24T14:31:02',
    started_at: null, lease_owner: null, lease_expires_at: null, heartbeat_at: null,
  },
];

/** /api/control-plane/reconcile 返回的是 audit 行（不是 ReconcileEntry） */
const RECONCILE = [
  {
    timestamp: '2026-10-24T14:30:00', user_id: 'system', user_name: '调和循环',
    action: 'reconcile', target: 'agent-2', target_type: 'agent',
    detail: '探针连续 3 次失败 → 退避后自动重启 → 复探通过', ip: '127.0.0.1', result: 'success',
  },
];

const DOMAIN_AGENTS = [
  {
    id: 1, name: '审查 Agent · 标准', status: 'running', runtime: 'dsh',
    model_name: 'deepseek-chat', domain_id: null,
    model_config_json: { capabilities: ['code-review', 'python'] },
  },
  {
    id: 2, name: '汇总 Agent', status: 'running', runtime: 'claude',
    model_name: 'claude-opus-4.5', domain_id: null,
    model_config_json: {},
  },
];

function mockApi(routes: Record<string, { status?: number; body: any }>) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const raw = String(url);
    const pathed = `${method} ${raw.split('?')[0]}`;
    const hit = routes[`${method} ${raw}`] ?? routes[pathed]
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

/** 页面首屏要的全部 GET */
function baseRoutes(over: Record<string, { status?: number; body: any }> = {}) {
  return {
    'GET /api/control-plane/probes': { body: PROBES },
    'GET /api/control-plane/queue': { body: QUEUE },
    'GET /api/control-plane/reconcile': { body: RECONCILE },
    'GET /api/control-plane/cluster': { body: CLUSTER },
    'GET /api/rsi/switches': { body: SWITCHES },
    'GET /api/rsi/surfaces': { body: SURFACES },
    'GET /api/domains': { body: { domains: [{ id: 7, name: '生产域', agent_count: 1 }] } },
    'GET /api/agents': { body: { agents: DOMAIN_AGENTS } },
    'GET /api/domains/7/attribution-policy': { body: { policy: { accountable: 'originator' } } },
    ...over,
  };
}

/** RSI 卡（用 aria-label 定位到这一块，避免和别处的「未接入」串门） */
function rsiCard(): HTMLElement {
  return screen.getByLabelText('自动化改进（RSI 开关）');
}

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  useControlPlane.setState({
    probes: [], queue: [], reconcile: [], cluster: null, selectedAgent: null, loading: false,
    rsiSwitches: [], rsiSurfaces: [], rsiImmutablePrefixes: [],
    rsiError: null, rsiNotice: null, rsiLoading: false,
  });
  useDomains.setState({ domains: [], loading: false, autoRoute: {}, queueCounts: {} });
});

// ── ① RSI 开关卡组 ────────────────────────────────────────
describe('① RSI 开关卡组', () => {
  it('四类目开关与总闸可见，类目标签随接口返回（不是写死的常量）', async () => {
    mockApi(baseRoutes());
    render(<AgentControlPlane />);
    const card = rsiCard();
    await waitFor(() => expect(within(card).getByRole('table', { name: 'RSI 四类产物开关' })).toBeInTheDocument());

    const table = within(card).getByRole('table', { name: 'RSI 四类产物开关' });
    const heads = within(table).getAllByRole('columnheader').map((th) => (th.textContent || '').trim());
    expect(heads).toEqual(['产物类', '开关', '状态', '最近更新']);

    // 四类产物 = 白名单本体，名字来自接口
    for (const label of ['知识记忆', '技能', '编排配置', '决策微模型权重']) {
      expect(within(table).getByText(label)).toBeInTheDocument();
    }
    expect(within(card).getByText(/白名单制（禁改区成文）/)).toBeInTheDocument();   // 四类之外禁止自动化
    expect(within(card).getByText(/永久出白名单/)).toBeInTheDocument();
    expect(within(card).getByText(/部分停用（2 关 \/ 2 开）/)).toBeInTheDocument();   // 总闸态由接口派生
  });

  it('SurfaceSpec 四列齐全：路径模式与显式排除来自接口，体量上限/结构规则标「该字段后端未提供」', async () => {
    mockApi(baseRoutes());
    render(<AgentControlPlane />);
    const card = rsiCard();
    await waitFor(() => expect(within(card).getByRole('table', { name: '可改面声明（SurfaceSpec 四列）' })).toBeInTheDocument());

    const table = within(card).getByRole('table', { name: '可改面声明（SurfaceSpec 四列）' });
    const heads = within(table).getAllByRole('columnheader').map((th) => (th.textContent || '').trim());
    expect(heads).toEqual(['产物类', '可写路径模式', '体量上限', '结构规则', '显式排除']);

    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    // ① 可写路径模式：真数据
    expect(rows[0].children[1].textContent).toContain('workspace/skills');
    // ②③ 体量上限 / 结构规则：后端没有这两列 → 必须标未接入，不许编数值
    expect(rows[0].children[2].textContent).toContain('未接入');
    expect(rows[0].children[2].textContent).toContain('该字段后端未提供');
    expect(rows[0].children[3].textContent).toContain('该字段后端未提供');
    // ④ 显式排除：真数据
    expect(rows[0].children[4].textContent).toContain('scripts/');
    // 空白名单不等于「后端没提供」——如实说「空」
    expect(rows[1].children[1].textContent).toContain('空');
  });

  it('停用类目：先二次确认，确认后 POST /api/rsi/switches/{category} 并落提示', async () => {
    const calls = mockApi(baseRoutes({
      'POST /api/rsi/switches/skill': { body: { ok: true, switch: { category: 'skill', enabled: false } } },
    }));
    render(<AgentControlPlane />);
    const card = rsiCard();
    await waitFor(() => expect(within(card).getByLabelText('停用「技能」自动改进')).toBeInTheDocument());

    fireEvent.click(within(card).getByLabelText('停用「技能」自动改进'));
    // 未确认前不许发写请求
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
    // D11：无原因不给提交（必填原因 = 人批动作留痕，状态转换层纪律）
    const confirmBtn = within(card).getByText('确认停用');
    expect(confirmBtn).toBeDisabled();
    fireEvent.change(within(card).getByLabelText('停用原因（必填）'),
                     { target: { value: '评测回流疑似污染' } });
    fireEvent.click(within(card).getByText('确认停用'));

    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1));
    const post = calls.filter((c) => c.method === 'POST')[0];
    expect(post.url).toBe('/api/rsi/switches/skill');
    expect(post.body).toEqual({ enabled: false, reason: '评测回流疑似污染' });
    await waitFor(() => expect(within(card).getByRole('status'))
      .toHaveTextContent(/已暂停「技能」自动改进/));
  });

  it('总闸一键全停 = 四类目逐个打同一个既有端点（后端无总闸端点）', async () => {
    const calls = mockApi(baseRoutes({
      'POST /api/rsi/switches/memory': { body: { ok: true } },
      'POST /api/rsi/switches/skill': { body: { ok: true } },
      'POST /api/rsi/switches/orchestration': { body: { ok: true } },
      'POST /api/rsi/switches/model': { body: { ok: true } },
    }));
    render(<AgentControlPlane />);
    const card = rsiCard();
    await waitFor(() => expect(within(card).getByLabelText('总闸 · 一键全停（四类目同时停用）')).toBeInTheDocument());

    fireEvent.click(within(card).getByLabelText('总闸 · 一键全停（四类目同时停用）'));
    fireEvent.change(within(card).getByLabelText('停用原因（必填）'),
                     { target: { value: '发布窗口冻结自动体' } });
    fireEvent.click(within(card).getByText('确认停用'));

    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(4));
    const urls = calls.filter((c) => c.method === 'POST').map((c) => c.url).sort();
    expect(urls).toEqual([
      '/api/rsi/switches/memory',
      '/api/rsi/switches/model',
      '/api/rsi/switches/orchestration',
      '/api/rsi/switches/skill',
    ]);
    expect(calls.filter((c) => c.method === 'POST').every((c) => c.body.enabled === false)).toBe(true);
    await waitFor(() => expect(within(card).getByRole('status')).toHaveTextContent(/总闸已停用/));
  });

  it('写失败：后端 detail 原样出现在 role=alert 里（不改写成成功）', async () => {
    mockApi(baseRoutes({
      'POST /api/rsi/switches/skill': { status: 403, body: { detail: '只有管理员可以暂停/恢复自动体' } },
    }));
    render(<AgentControlPlane />);
    const card = rsiCard();
    await waitFor(() => expect(within(card).getByLabelText('停用「技能」自动改进')).toBeInTheDocument());

    fireEvent.click(within(card).getByLabelText('停用「技能」自动改进'));
    // D11：先证实「无原因不给提交」，填因后再提交
    expect(within(card).getByText('确认停用')).toBeDisabled();
    fireEvent.change(within(card).getByLabelText('停用原因（必填）'),
                     { target: { value: '权限演练' } });
    fireEvent.click(within(card).getByText('确认停用'));

    await waitFor(() => expect(within(card).getByRole('alert'))
      .toHaveTextContent('只有管理员可以暂停/恢复自动体'));
  });

  it('可改面读取失败时 detail 透传，且两列仍如实标未接入', async () => {
    mockApi(baseRoutes({
      'GET /api/rsi/surfaces': { status: 403, body: { detail: '需要管理员查看可改面声明' } },
    }));
    render(<AgentControlPlane />);
    const card = rsiCard();
    await waitFor(() => expect(within(card).getByRole('alert'))
      .toHaveTextContent(/可改面读取失败：需要管理员查看可改面声明/));
    expect(within(card).getByText(/未接入 · 后端 surface_manifests 暂无声明行/)).toBeInTheDocument();
  });
});

// ── ② 调度底座卡组 ────────────────────────────────────────
describe('② 调度底座卡组', () => {
  it('五个子块都在：双通道坦白句 / 过期双条件 / reclaim / 重试政策 / 并发上限', async () => {
    mockApi(baseRoutes());
    render(<AgentControlPlane />);
    const card = screen.getByLabelText('调度底座');
    for (const title of [
      '双通道坦白句（先说清楚，别让人信错东西）',
      '排队 run 的过期判定 · 双条件（机器忙 ≠ 机器没了）',
      'Runtime 回收与清理（reclaim）',
      '重试政策（自动只给环境抖动类）',
      '并发上限（人话版）',
    ]) {
      expect(within(card).getByText(title)).toBeInTheDocument();
    }
    expect(within(card).getByText(/推送通道（WebSocket）只负责快/)).toBeInTheDocument();
    expect(within(card).getByText(/生效 = 两者取小/)).toBeInTheDocument();
  });

  it('副本事实是真数据：instance_id / 部署模式 / 队列深度 / 租约 TTL / 租约行', async () => {
    mockApi(baseRoutes());
    render(<AgentControlPlane />);
    const card = screen.getByLabelText('调度底座');
    await waitFor(() => expect(within(card).getByText('i-abc123')).toBeInTheDocument());
    expect(within(card).getByText('localhost')).toBeInTheDocument();
    expect(within(card).getByText(/4 条（执行中 1）/)).toBeInTheDocument();
    expect(within(card).getByText(/90s（过期可被其它副本重取）/)).toBeInTheDocument();
    const leaseTable = within(card).getByRole('table', { name: '单例循环租约（来自 /api/control-plane/cluster）' });
    expect(within(leaseTable).getByText('调和循环')).toBeInTheDocument();
    expect(within(leaseTable).getByText('i-abc123:4242')).toBeInTheDocument();
  });

  it('后端没给的字段一律标「该字段后端未提供」（不许拿原型演示值冒充）', async () => {
    mockApi(baseRoutes());
    render(<AgentControlPlane />);
    const card = screen.getByLabelText('调度底座');
    // 宽限期 / 队列行判定字段 / runtime_recovery / 心跳 / 离线清理 / 重试政策三项 / 两个并发上限
    expect(within(card).getAllByText(/该字段后端未提供/).length).toBeGreaterThanOrEqual(10);
    expect(within(card).getByText(/重连宽限期/)).toBeInTheDocument();
    expect(within(card).getByText(/单 daemon 上限/)).toBeInTheDocument();
    // 政策句在，但数字不在：不许出现原型里的 20 / 6 / 15s / 7 天 这组编造值
    expect(within(card).queryByText(/20 默认全机同时在跑/)).toBeNull();
    expect(within(card).queryByText(/离线 >7 天/)).toBeNull();
  });

  it('读不到 /cluster 时整块标未接入，不静默显示空数据', async () => {
    mockApi(baseRoutes({ 'GET /api/control-plane/cluster': { status: 500, body: { detail: '内部错误' } } }));
    render(<AgentControlPlane />);
    const card = screen.getByLabelText('调度底座');
    await waitFor(() => expect(within(card).getByRole('alert'))
      .toHaveTextContent(/未接入 · 未读到 \/api\/control-plane\/cluster 的副本事实/));
  });
});

// ── ③ 维护作业区 ──────────────────────────────────────────
describe('③ 维护作业区', () => {
  it('纪律成文：调和只做状态收敛、全库级批量写一律人批；入口按钮显式未接入且禁用', async () => {
    mockApi(baseRoutes());
    render(<AgentControlPlane />);
    const card = screen.getByLabelText('维护作业');
    expect(within(card).getByText(/与上方自动调和并列成文/)).toBeInTheDocument();
    expect(within(card).getByText(/自动的那一路永不写大批历史数据，写大批历史数据的那一路永不自动/)).toBeInTheDocument();
    expect(within(card).getByText(/新幂等键/)).toBeInTheDocument();
    expect(within(card).getByText(/人工担保旗标/)).toBeInTheDocument();

    expect(within(card).getByLabelText('跑一次 dry-run（未接入）')).toBeDisabled();
    expect(within(card).getByLabelText('转 apply（未接入）')).toBeDisabled();
  });

  it('最近一次调和结果读真端点（/api/control-plane/reconcile）', async () => {
    mockApi(baseRoutes());
    render(<AgentControlPlane />);
    const card = screen.getByLabelText('维护作业');
    await waitFor(() => expect(within(card).getByText(/探针连续 3 次失败 → 退避后自动重启 → 复探通过/)).toBeInTheDocument());
    expect(within(card).getByText(/调和循环/)).toBeInTheDocument();
  });

  it('没有调和记录时显示「未接入」，不放 0 条假数据', async () => {
    mockApi(baseRoutes({ 'GET /api/control-plane/reconcile': { body: [] } }));
    render(<AgentControlPlane />);
    const card = screen.getByLabelText('维护作业');
    await waitFor(() => expect(within(card).getByText(/未接入 · 未读到 reconcile 事件/)).toBeInTheDocument());
  });
});

// ── ④ 既有行为不退化 ──────────────────────────────────────
describe('④ 既有三层树不退化', () => {
  it('域 → 能力组 → Agent：同一 Agent 多标签会同时出现在两个能力组里', async () => {
    mockApi(baseRoutes());
    render(<AgentControlPlane />);
    fireEvent.click(screen.getByText('隔离域'));
    const defaultDomain = await screen.findByText('默认域');
    fireEvent.click(defaultDomain);

    await waitFor(() => expect(screen.getByText('📦 code-review')).toBeInTheDocument());
    expect(screen.getByText('📦 python')).toBeInTheDocument();     // 多标签 = 多层归属，不是重复渲染
    expect(screen.getByText('📦 未分类')).toBeInTheDocument();      // 无能力标签的 Agent 落此组
    // 展开两个能力组：同一 Agent 在两组里各出现一次（多层归属，不是重复渲染）
    fireEvent.click(screen.getByText('📦 code-review'));
    fireEvent.click(screen.getByText('📦 python'));
    await waitFor(() => expect(screen.getAllByText('审查 Agent · 标准')).toHaveLength(2));
    expect(screen.getAllByText('审查 Agent · 标准')[0]).toBeInTheDocument();
  });

  it('页面内不写页级 h1/h2（页名由壳层 .crumb 承担）', async () => {
    mockApi(baseRoutes());
    const { container } = render(<AgentControlPlane />);
    await waitFor(() => expect(screen.getByLabelText('维护作业')).toBeInTheDocument());
    expect(container.querySelectorAll('h1, h2')).toHaveLength(0);
  });
});
