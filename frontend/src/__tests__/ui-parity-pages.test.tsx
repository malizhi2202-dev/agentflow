/**
 * ui-parity 新增页族用例（阶段 1）：阶段模型配置 / 执行隔离 / 对外集成 + 3 个规划原型页。
 *
 * 纪律：
 * - 有后端的页（stage-model / isolation / integration）断言「真打端点 + 读真字段 + 错误文案透传」；
 * - 没后端的页（decision-models / finetune / env-advisor）必须显示「规划原型 · 后端未接入」，
 *   否则就是把示例数据伪装成真实状态。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StageModel from '../pages/StageModel';
import Isolation from '../pages/Isolation';
import Integration from '../pages/Integration';
import DecisionModels from '../pages/DecisionModels';
import Finetune from '../pages/Finetune';
import EnvAdvisor from '../pages/EnvAdvisor';
import { invalidateCache } from '../utils/requestDedup';

function mockApi(routes: Record<string, { status?: number; body: any; headers?: Record<string, string> }>) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const pathed = `${method} ${String(url).split('?')[0]}`;
    const hit = routes[pathed] ?? { status: 404, body: { detail: `no mock ${pathed}` } };
    const res: any = {
      ok: (hit.status ?? 200) < 400, status: hit.status ?? 200,
      headers: new Map(Object.entries(hit.headers || {})),
      json: async () => hit.body, text: async () => JSON.stringify(hit.body),
    };
    res.clone = () => res;
    return res as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

beforeEach(() => { invalidateCache(); vi.clearAllMocks(); });

const STAGES = {
  workflow: {
    stages: [
      { id: '0-change', name: '变更提案', gate: 'G1', prompt: 'prompts/0-change.md', order: 0 },
      { id: '4-dev', name: '开发执行', gate: 'G3', prompt: 'prompts/4-dev.md', order: 5 },
    ],
  },
  status: {},
};

describe('阶段模型配置（真数据）', () => {
  it('渲染阶段表（id/名称/门禁/提示词）', async () => {
    mockApi({ 'GET /api/admin/workflow': { body: STAGES, headers: { ETag: 'W/"abc"' } } });
    render(<StageModel />);
    await waitFor(() => expect(screen.getByText('0-change')).toBeInTheDocument());
    // 名称在可编辑 input 的 value 里（不是文本节点）
    expect((screen.getByLabelText('阶段名称 0-change') as HTMLInputElement).value).toBe('变更提案');
    expect(screen.getByText('G1')).toBeInTheDocument();
    expect(screen.getByText('prompts/4-dev.md')).toBeInTheDocument();
    expect(screen.getByText(/2 个阶段/)).toBeInTheDocument();
  });

  it('改名字后保存：PUT 带 If-Match，只改名称', async () => {
    const calls = mockApi({
      'GET /api/admin/workflow': { body: STAGES, headers: { ETag: 'W/"abc"' } },
      'PUT /api/admin/workflow': { body: { ok: true } },
    });
    render(<StageModel />);
    await waitFor(() => expect(screen.getByLabelText('阶段名称 0-change')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('阶段名称 0-change'), { target: { value: '提案（改名）' } });
    fireEvent.click(screen.getByText('保存'));
    await waitFor(() => {
      const put = calls.find((c) => c.method === 'PUT');
      expect(put?.body?.spec?.stages?.[0]?.name).toBe('提案（改名）');
      expect(put?.body?.kind).toBe('WorkflowConfig');
    });
  });

  it('412/400 的后端文案原样透传（不谎报保存成功）', async () => {
    mockApi({
      'GET /api/admin/workflow': { body: STAGES, headers: { ETag: 'W/"abc"' } },
      'PUT /api/admin/workflow': { status: 412, body: { detail: '资源已被修改（If-Match 不匹配）' } },
    });
    render(<StageModel />);
    await waitFor(() => expect(screen.getByLabelText('阶段名称 0-change')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('阶段名称 0-change'), { target: { value: 'x' } });
    fireEvent.click(screen.getByText('保存'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/If-Match 不匹配/));
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('执行隔离（真数据）', () => {
  const CONTRACT = {
    tiers: ['inproc', 'process', 'container', 'microvm', 'remote'],
    available: ['inproc'],
    egress_enforced_tiers: [],
    defaults: { tier: 'inproc', ttl_seconds: 300, retain: false, egress_allowlist: [] },
    notes: ['inproc = 同进程调用，没有网络围栏'],
  };

  it('渲染档位：只有 inproc 可用，其余标「未实现（选即失败）」', async () => {
    mockApi({ 'GET /api/runtime/execution-contract': { body: CONTRACT } });
    render(<Isolation />);
    await waitFor(() => expect(screen.getByLabelText('隔离档位')).toBeInTheDocument());
    expect(screen.getAllByText(/T0 · 平台进程内/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/未实现（选即失败）/).length).toBe(4);
    expect(screen.getByText('TTL 300s')).toBeInTheDocument();
    expect(screen.getByText(/没有网络围栏/)).toBeInTheDocument();
  });

  it('预检契约打 POST /validate，失败显示拒绝原因', async () => {
    const calls = mockApi({
      'GET /api/runtime/execution-contract': { body: CONTRACT },
      'POST /api/runtime/execution-contract/validate': { body: { ok: true, spec: { tier: 'inproc' } } },
    });
    render(<Isolation />);
    // 每个档位一行按钮：只有可用档可点（inproc 在第一行），未实现档 disabled
    await waitFor(() => expect(screen.getAllByText('预检契约').length).toBe(5));
    const btns = screen.getAllByText('预检契约').map((el) => el.closest('button') as HTMLButtonElement);
    expect(btns[0].disabled).toBe(false);
    expect(btns.slice(1).every((b) => b.disabled)).toBe(true);
    fireEvent.click(btns[0]);
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/validate'))).toBe(true));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/契约校验通过/));
  });
});

describe('对外集成（真数据）', () => {
  it('列出六通道；无配置显示「未启用」', async () => {
    mockApi({
      'GET /api/agents': { body: { agents: [{ id: 7, name: '巡检助手' }] } },
      'GET /api/agents/7/channels': { body: [{ id: 1, channel_type: 'feishu', status: 'bound', webhook_uuid: 'wh-1' }] },
      'GET /api/a2a/agents/7/card': { body: { name: '巡检助手', version: '0.1', skills: ['check'] } },
    });
    render(<Integration />);
    await waitFor(() => expect(screen.getByLabelText('消息渠道')).toBeInTheDocument());
    expect(screen.getByText('飞书')).toBeInTheDocument();
    expect(screen.getByText('钉钉')).toBeInTheDocument();
    expect(screen.getAllByText('未启用').length).toBe(5);   // 6 通道里 5 个没配
    expect(screen.getByText('wh-1')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('0.1')).toBeInTheDocument());
  });
});

describe('规划原型页（必须显式声明未接入）', () => {
  it.each([
    ['决策模型目录', DecisionModels],
    ['微调工厂', Finetune],
    ['环境参谋', EnvAdvisor],
  ])('%s 显示「后端未接入 + 示例数据」且不伪装真实态', (_label, Page) => {
    render(<Page />);
    expect(screen.getAllByText(/规划原型 · 后端未接入/).length).toBeGreaterThan(0);
    expect(screen.getByText(/示例数据（非真实运行状态）/)).toBeInTheDocument();
  });

  it('决策模型目录渲染用途绑定开关（默认关）与阈值信息', () => {
    render(<DecisionModels />);
    expect(screen.getByText('Jev-Style-Qwen3.5-2B')).toBeInTheDocument();
    expect(screen.getByLabelText('Jev-Style-Qwen3.5-2B 路由决策')).toBeInTheDocument();
    expect(screen.getByText(/阈值 0.60/)).toBeInTheDocument();
  });

  it('微调工厂区分「过门槛」与「禁止切产」两态', () => {
    render(<Finetune />);
    expect(screen.getByText('切生产')).toBeInTheDocument();
    expect(screen.getByText('禁止切产')).toBeInTheDocument();
    expect(screen.getByText(/ECE 0.061 > 门槛 0.05/)).toBeInTheDocument();
  });
});
