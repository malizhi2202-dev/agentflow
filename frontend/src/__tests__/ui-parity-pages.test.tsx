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

describe('决策模型目录（P4 真后端）', () => {
  const MODEL = {
    id: 1, name: 'Jev-Style-Qwen3.5-2B', track: 'local', kind: 'Q4_K_M · 1.3GB',
    health: 'unprobed', latency_p95_ms: null, threshold: 0.6, escalated: 0, fallback: 0,
    bindings: [], enabled: true,
  };

  it('渲染模型并显示「未探测」；绑定默认全关', async () => {
    mockApi({ 'GET /api/decision-models': { body: { models: [MODEL] } } });
    render(<DecisionModels />);
    await waitFor(() => expect(screen.getByText('Jev-Style-Qwen3.5-2B')).toBeInTheDocument());
    expect(screen.getByText('未探测')).toBeInTheDocument();
    const box = screen.getByLabelText('Jev-Style-Qwen3.5-2B 路由决策') as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(screen.getByText(/阈值 0.6/)).toBeInTheDocument();
  });

  it('打开绑定开关 → POST /bindings（真实端点）', async () => {
    const calls = mockApi({
      'GET /api/decision-models': { body: { models: [MODEL] } },
      'POST /api/decision-models/1/bindings': { body: { ok: true, model: MODEL } },
    });
    render(<DecisionModels />);
    await waitFor(() => expect(screen.getByLabelText('Jev-Style-Qwen3.5-2B 路由决策')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Jev-Style-Qwen3.5-2B 路由决策'));
    await waitFor(() => {
      const post = calls.find((c) => c.url === '/api/decision-models/1/bindings');
      expect(post?.body).toEqual({ binding: 'route', enabled: true });
    });
  });

  it('重探返回 unprobed 时把「未配置探测适配器」原样告诉用户', async () => {
    mockApi({
      'GET /api/decision-models': { body: { models: [MODEL] } },
      'POST /api/decision-models/1/reprobe': {
        body: { ok: true, model: MODEL, health: 'unprobed', detail: '未配置探测适配器：健康态保持 unprobed' },
      },
    });
    render(<DecisionModels />);
    await waitFor(() => expect(screen.getByText('重探')).toBeInTheDocument());
    fireEvent.click(screen.getByText('重探'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/未配置探测适配器/));
  });

  it('空列表给出「登记 ≠ 在用」的引导', async () => {
    mockApi({ 'GET /api/decision-models': { body: { models: [] } } });
    render(<DecisionModels />);
    await waitFor(() => expect(screen.getByText(/还没有登记模型/)).toBeInTheDocument());
    expect(screen.getByText(/绑定开关决定它是否真的参与路由/)).toBeInTheDocument();
  });
});

describe('微调工厂（P4 真后端 · 门禁由服务端判定）', () => {
  const BATCH = (over: any = {}) => ({
    id: 1, task_name: 'dept-router-v3-ft', base_model: 'Qwen3.5-2B · LoRA r16',
    data_sessions: 412, data_memories: 88, fingerprint: 'a91f', engine: 'llama-factory',
    hw_ok: true, status: 'done', acc: 79.4, ece: 0.061, agree: 91,
    gate_verdict: 'blocked', gate_reason: 'ECE 0.061 > 门槛 0.050 · 服务端拒绝（AC-C2）', ...over,
  });

  it('如实展示「禁止切产」与原因', async () => {
    mockApi({ 'GET /api/decision-models/finetune/batches': { body: { batches: [BATCH()] } } });
    render(<Finetune />);
    await waitFor(() => expect(screen.getByText('dept-router-v3-ft')).toBeInTheDocument());
    expect(screen.getByText('禁止切产')).toBeInTheDocument();
    expect(screen.getByText(/ECE 0.061 > 门槛 0.050/)).toBeInTheDocument();
  });

  it('过门槛显示「切生产」', async () => {
    mockApi({ 'GET /api/decision-models/finetune/batches': { body: { batches: [BATCH({ id: 2, task_name: 'v4', acc: 83.1, ece: 0.023, gate_verdict: 'promote', gate_reason: '过门槛 · 血缘可回滚' })] } } });
    render(<Finetune />);
    await waitFor(() => expect(screen.getByText('切生产')).toBeInTheDocument());
    expect(screen.getByText(/过门槛/)).toBeInTheDocument();
  });

  it('登记批次 POST 到真端点（指标留空 → 交给服务端判定）', async () => {
    const calls = mockApi({
      'GET /api/decision-models/finetune/batches': { body: { batches: [] } },
      'POST /api/decision-models/finetune/batches': { body: { ok: true, batch: BATCH({ acc: null, ece: null, gate_reason: '缺三指标自测' }) } },
    });
    render(<Finetune />);
    await waitFor(() => expect(screen.getByLabelText('任务名')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('任务名'), { target: { value: 'new-ft' } });
    fireEvent.click(screen.getByText('登记批次'));
    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST');
      expect(post?.body?.task_name).toBe('new-ft');
      expect(post?.body?.hw_ok).toBe(true);
    });
  });
});

describe('环境参谋（P4 真后端）', () => {
  const ADVISOR = {
    profile: {
      platform: 'Linux 6.8', arch: 'x86_64', cpu_count: 8, mem_total_gb: 31.2, disk_free_gb: 120.5,
      accelerator: { cuda: false, metal: false, vulkan: false },
      note: '画像只读本机信息，默认不上传；平台零执行（命令可复制，不代跑）',
    },
    plans: [{
      layer: 'L2 · 跨平台稳妥', engine: 'llama.cpp', model: 'Qwen3.5-2B · Q8_0',
      ability: { inference: true, finetune: false }, disk_gb: 2.1,
      latency_hint: '~110ms', why: 'CPU 也能跑', steps: ['安装 llama.cpp'],
    }],
  };

  it('渲染画像与方案；「为什么」与「不代执行」都可见', async () => {
    mockApi({ 'GET /api/decision-models/advisor': { body: ADVISOR } });
    render(<EnvAdvisor />);
    await waitFor(() => expect(screen.getByText(/Linux 6.8/)).toBeInTheDocument());
    expect(screen.getAllByText(/默认不上传/).length).toBeGreaterThan(0);
    expect(screen.getByText('L2 · 跨平台稳妥')).toBeInTheDocument();
    expect(screen.getByText('CPU 也能跑')).toBeInTheDocument();
    expect(screen.getByLabelText('已确认 安装 llama.cpp')).toBeInTheDocument();
  });
});
