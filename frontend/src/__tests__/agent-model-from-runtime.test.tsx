/**
 * AG：创建 Agent 不再选「模型 Provider / API Key」——运行时决定模型通道，模型目录由运行时上报。
 *
 * 口径（RULINGS 2026-10-15「Provider / Base URL / Agent 级 API Key 旧宇宙已裁撤」）：
 * - 表单里没有 Provider / API Key 字段，也没有任何密码框；
 * - 运行时可选项 = `GET /api/runtimes` 发现的运行时（离线置灰）；
 * - 模型可选项 = 该运行时上报的 `models`；`models_error` 非空要显式说「不可读」；
 * - 保存时请求体不带 model_provider / api_key（服务端按运行时推导）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgentDetail from '../pages/AgentDetail';
import { useRuntimes } from '../stores/runtimes';
import { invalidateCache } from '../utils/requestDedup';

const RT = (over: Partial<any> = {}) => ({
  id: 1, machine_id: 'ubntu#39f1c6c6', machine_name: 'ubntu', cli: 'dsh',
  protocol_family: 'stdio', binary_path: 'node dsh', source_file: 'known',
  version: '0.1.3-alpha.2', models: ['local-anthropic/deepseek-flash'],
  models_error: '', capabilities: ['model_list'], status: 'online',
  last_seen: '2026-10-24T23:00:00Z', visibility: 'private', bound_agents: 0, mine: true,
  ...over,
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

const BASE_ROUTES = {
  'GET /api/workflows': { body: { workflows: [] } },
};

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  useRuntimes.setState({ registry: [], registryLoading: false, registryError: null });
});

describe('创建 Agent：模型相关字段的形态', () => {
  // AG-01：Provider / API Key 两个字段彻底消失，且没有任何密码输入框
  it('AG-01 表单不再出现「模型 Provider」「API Key」，也没有密码框', async () => {
    mockApi({ ...BASE_ROUTES, 'GET /api/runtimes': { body: { runtimes: [RT()] } } });
    const { container } = render(<AgentDetail agent={{ name: '', description: '' }} onBack={() => {}} onSave={() => {}} />);
    await waitFor(() => expect(screen.getByRole('region', { name: /运行时 \+ 模型/ })).toBeTruthy());
    expect(screen.queryByText('模型 Provider')).toBeNull();
    expect(screen.queryByText('API Key')).toBeNull();
    expect(container.querySelectorAll('input[type="password"]').length).toBe(0);
  });

  // AG-02：运行时可选项来自 /api/runtimes；离线运行时置灰不可选
  it('AG-02 运行时选项来自运行时发现，离线项禁用', async () => {
    mockApi({
      ...BASE_ROUTES,
      'GET /api/runtimes': {
        body: { runtimes: [RT(), RT({ id: 2, cli: 'hermes', status: 'offline', models: [] })] },
      },
    });
    render(<AgentDetail agent={{ name: '', description: '' }} onBack={() => {}} onSave={() => {}} />);
    const select = await screen.findByLabelText('运行时') as HTMLSelectElement;
    await waitFor(() => expect(select.querySelectorAll('option').length).toBeGreaterThanOrEqual(2));
    const dsh = Array.from(select.options).find((o) => o.value === 'dsh');
    const hermes = Array.from(select.options).find((o) => o.value === 'hermes');
    expect(dsh?.disabled).toBe(false);
    expect(hermes?.disabled).toBe(true);
    expect(hermes?.textContent).toContain('离线');
  });

  // AG-03：模型可选项 = 该运行时上报的 models（不再手填模型名）
  it('AG-03 模型下拉选项来自运行时上报的模型目录', async () => {
    mockApi({
      ...BASE_ROUTES,
      'GET /api/runtimes': {
        body: { runtimes: [RT({ models: ['local-anthropic/deepseek-flash', 'local-anthropic/deepseek-reasoner'] })] },
      },
    });
    render(<AgentDetail agent={{ name: '', description: '' }} onBack={() => {}} onSave={() => {}} />);
    const modelSelect = await screen.findByLabelText('模型') as HTMLSelectElement;
    await waitFor(() => expect(modelSelect.disabled).toBe(false));
    const values = Array.from(modelSelect.options).map((o) => o.value);
    expect(values).toContain('local-anthropic/deepseek-flash');
    expect(values).toContain('local-anthropic/deepseek-reasoner');
    expect(values).toContain('');   // 留空 = 用运行时自身默认
  });

  // AG-04：目录不可读 ≠ 没有模型 —— 必须显式说不可读，并把选择器降级为「留空」
  it('AG-04 目录不可读时显式提示，且模型选择器不可选', async () => {
    mockApi({
      ...BASE_ROUTES,
      'GET /api/runtimes': {
        body: { runtimes: [RT({ models: [], models_error: "error: --profile <name> is required" })] },
      },
    });
    render(<AgentDetail agent={{ name: '', description: '' }} onBack={() => {}} onSave={() => {}} />);
    await waitFor(() => expect(screen.getByText(/模型目录不可读/)).toBeTruthy());
    expect(screen.getByText(/--profile/)).toBeTruthy();
    expect((screen.getByLabelText('模型') as HTMLSelectElement).disabled).toBe(true);
  });

  // AG-05：一个运行时都没发现 → 空态要给出可执行的下一步
  it('AG-05 没有发现任何运行时给出空态提示', async () => {
    mockApi({ ...BASE_ROUTES, 'GET /api/runtimes': { body: { runtimes: [] } } });
    render(<AgentDetail agent={{ name: '', description: '' }} onBack={() => {}} onSave={() => {}} />);
    await waitFor(() => expect(screen.getByText(/尚未发现任何运行时/)).toBeTruthy());
  });

  // AG-06：切换运行时 → 旧模型不在新目录里就清空（不存一个跑不动的模型）
  it('AG-06 切换运行时后旧模型失效需重选', async () => {
    mockApi({
      ...BASE_ROUTES,
      'GET /api/runtimes': {
        body: {
          runtimes: [
            RT({ id: 1, cli: 'dsh', models: ['local-anthropic/deepseek-flash'] }),
            RT({ id: 2, cli: 'hermes', models: ['deepseek/deepseek-chat'] }),
          ],
        },
      },
    });
    render(<AgentDetail agent={{ id: 7, name: 'a', runtime: 'dsh', model_name: 'local-anthropic/deepseek-flash' }} onBack={() => {}} onSave={() => {}} />);
    const runtimeSelect = await screen.findByLabelText('运行时') as HTMLSelectElement;
    await waitFor(() => expect(runtimeSelect.value).toBe('dsh'));
    expect((screen.getByLabelText('模型') as HTMLSelectElement).value).toBe('local-anthropic/deepseek-flash');
    fireEvent.change(runtimeSelect, { target: { value: 'hermes' } });
    await waitFor(() => expect((screen.getByLabelText('模型') as HTMLSelectElement).value).toBe(''));
  });

  // AG-07：保存的请求体里没有 model_provider / api_key，运行时 = 所选项，模型 = 所选项
  it('AG-07 保存载荷不带 model_provider / api_key', async () => {
    mockApi({
      ...BASE_ROUTES,
      'GET /api/runtimes': { body: { runtimes: [RT({ models: ['local-anthropic/deepseek-flash'] })] } },
    });
    const onSave = vi.fn();
    render(<AgentDetail agent={{ name: '审查助手', description: '' }} onBack={() => {}} onSave={onSave} />);
    const modelSelect = await screen.findByLabelText('模型') as HTMLSelectElement;
    await waitFor(() => expect(modelSelect.disabled).toBe(false));
    fireEvent.change(modelSelect, { target: { value: 'local-anthropic/deepseek-flash' } });
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.runtime).toBe('dsh');
    expect(payload.model_name).toBe('local-anthropic/deepseek-flash');
    expect('model_provider' in payload).toBe(false);
    expect('api_key' in payload).toBe(false);
  });
});
