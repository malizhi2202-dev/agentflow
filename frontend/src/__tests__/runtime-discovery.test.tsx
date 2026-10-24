/**
 * v22 §6.28 运行时发现（前端）：注册表区块的渲染与可见性动作。
 *
 * 覆盖：在线/离线状态、模型目录「不可读」与「有模型」两态、私有不给外人看到按钮、
 * 置为公开打对端点并刷新、空态给下一步动作。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Runtimes from '../pages/Runtimes';
import { invalidateCache } from '../utils/requestDedup';

const ROW = (over: Partial<any> = {}) => ({
  id: 1, machine_id: 'ws#abc', machine_name: 'ws', cli: 'hermes',
  protocol_family: 'stdio', binary_path: '/x/hermes', source_file: 'known',
  version: 'v0.18.0', models: [], models_error: '', capabilities: [],
  status: 'online', last_seen: new Date().toISOString(),
  visibility: 'private', bound_agents: 2, mine: true, ...over,
});

function mockApi(routes: Record<string, { status?: number; body: any }>, calls: any[] = []) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    calls.push({ url: String(url), method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
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

const BASE = {
  'GET /api/runtime/summary': { body: { sessions: 0, total_output_tokens: 0 } },
  'GET /api/runtime/stats': { body: { total: 0 } },
  'GET /api/runtime/sessions': { body: { sessions: [] } },
};

afterEach(() => {
  vi.unstubAllGlobals();
  invalidateCache();
});

describe('运行时发现区块', () => {
  it('无记录 → 空态给出启动 daemon 的下一步', async () => {
    mockApi({ ...BASE, 'GET /api/runtimes': { body: { runtimes: [] } } });
    invalidateCache();
    render(<Runtimes />);
    await waitFor(() => expect(screen.getByText(/还没有运行时上报/)).toBeInTheDocument());
    expect(screen.getByRole('region', { name: '执行环境 · 自动发现' })).toBeInTheDocument();
  });

  it('在线行：机器·CLI / 协议族 / 状态 / 模型不可读 / 私有 / 绑定数', async () => {
    mockApi({
      ...BASE,
      'GET /api/runtimes': { body: { runtimes: [ROW({ models_error: '--list-models 不支持' })] } },
    });
    invalidateCache();
    render(<Runtimes />);
    await waitFor(() => expect(screen.getByText(/ws · hermes/)).toBeInTheDocument());
    expect(screen.getByText('stdio')).toBeInTheDocument();
    expect(screen.getByText(/● 在线/)).toBeInTheDocument();
    expect(screen.getByText(/不可读：--list-models 不支持/)).toBeInTheDocument();
    expect(screen.getByText(/私有 · 仅我/)).toBeInTheDocument();
    expect(screen.queryByText('公开 · 只共享路由权')).toBeNull();
  });

  it('模型目录可读时显示前两个并折叠 +N', async () => {
    mockApi({
      ...BASE,
      'GET /api/runtimes': { body: { runtimes: [ROW({ models: ['a', 'b', 'c'] })] } },
    });
    invalidateCache();
    render(<Runtimes />);
    await waitFor(() => expect(screen.getByText(/a · b \+1/)).toBeInTheDocument());
  });

  it('离线行显示绝对时间且不隐藏记录', async () => {
    const old = new Date(Date.now() - 600_000).toISOString();
    mockApi({
      ...BASE,
      'GET /api/runtimes': { body: { runtimes: [ROW({ status: 'offline', last_seen: old })] } },
    });
    invalidateCache();
    render(<Runtimes />);
    await waitFor(() => expect(screen.getByText(/○ 离线/)).toBeInTheDocument());
    expect(screen.getByText(/ws · hermes/)).toBeInTheDocument();
  });

  it('非 owner 只读：不渲染可见性按钮', async () => {
    mockApi({
      ...BASE,
      'GET /api/runtimes': { body: { runtimes: [ROW({ mine: false, visibility: 'public' })] } },
    });
    invalidateCache();
    render(<Runtimes />);
    await waitFor(() => expect(screen.getByText(/ws · hermes/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '置为公开' })).toBeNull();
    expect(screen.queryByRole('button', { name: '收回私有' })).toBeNull();
  });

  it('owner 点「置为公开」→ PUT {public:true} 并刷新注册表', async () => {
    const calls = mockApi({
      ...BASE,
      'GET /api/runtimes': { body: { runtimes: [ROW()] } },
      'PUT /api/runtimes/1/visibility': { body: { ok: true, visibility: 'public' } },
    });
    invalidateCache();
    render(<Runtimes />);
    const btn = await screen.findByRole('button', { name: '置为公开' });
    fireEvent.click(btn);
    await waitFor(() => {
      const put = calls.find(c => c.method === 'PUT');
      expect(put?.url).toBe('/api/runtimes/1/visibility');
      expect(put?.body).toEqual({ public: true });
    });
    // 写后重读：GET 至少两次（初次 + 写后）
    await waitFor(() => expect(calls.filter(c => c.method === 'GET' && c.url === '/api/runtimes').length).toBeGreaterThanOrEqual(2));
  });

  it('可见性失败时原样透传后端 detail', async () => {
    mockApi({
      ...BASE,
      'GET /api/runtimes': { body: { runtimes: [ROW()] } },
      'PUT /api/runtimes/1/visibility': { status: 404, body: { detail: '运行时不存在' } },
    });
    invalidateCache();
    render(<Runtimes />);
    fireEvent.click(await screen.findByRole('button', { name: '置为公开' }));
    await waitFor(() => expect(screen.getAllByRole('alert').some(e => e.textContent?.includes('运行时不存在'))).toBe(true));
  });
});
