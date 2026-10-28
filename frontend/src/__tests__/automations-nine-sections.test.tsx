/**
 * 自动化中心九节（P3-1）用例：每节至少一条断言，含空态与写失败文案透传。
 *
 * 纪律：断言打的是「页面上真有的节与文案」，不是组件结构；写操作必须打对端点，
 * 失败时后端 `detail` 要原样出现在 role=alert 里（不许改写成「保存成功」）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Automations from '../pages/Automations';
import { useAutomations } from '../stores/automations';
import { invalidateCache } from '../utils/requestDedup';

// ── 夹具 ────────────────────────────────────────────────
const RUNBOOK = {
  goal: '部署完成后跑冒烟集并产出 pass/fail 摘要',
  background: 'v14 之后冒烟靠人手动点，夜间发布常漏',
  constraints: '只读环境；禁改代码、禁碰 prod 域',
  steps: '1) 取部署回执 2) 跑 12 项冒烟 3) 写摘要',
};

const FAILURE = {
  window_days: 7, completed: 4, failed: 47, skipped: 0, cancelled: 0,
  sample: 51, rate: 47 / 51, breaker_gate: true,
  breaker_rule: '近 7 天 ≥50 次完结且失败率 ≥90% → 自动暂停并通知创建者（止损非自愈）',
};

const SCHED_TRIGGER = {
  id: 22, kind: 'schedule', enabled: true, cron: '0 2 * * *', timezone: 'Asia/Shanghai',
  secret_preview: '', payload_limit: 65536, payload_limit_human: '65536 字节（64 KiB）',
  event_filter: [], created_at: null,
  next_runs: ['2026-09-24T02:00:00+08:00', '2026-09-25T02:00:00+08:00', '2026-09-26T02:00:00+08:00'],
  next_runs_note: null,
};

const HOOK_TRIGGER = {
  id: 21, kind: 'webhook', enabled: false, cron: '', timezone: 'Asia/Shanghai',
  secret_preview: 'af_wh_9f4c…e21', payload_limit: 65536,
  payload_limit_human: '65536 字节（64 KiB）',
  event_filter: [{ event: 'push', actions: ['opened'] }],
  webhook_path: '/api/webhooks/automations/af_wh_9f4c…e21', created_at: null,
};

const AUTO = (over: Record<string, any> = {}) => ({
  id: 1, name: '发布冒烟', runbook: RUNBOOK,
  owner_track: 'agent', owner_id_ref: 'agent-5', owner_ref_name: '汇总 Agent',
  exec_mode: 'run_only', status: 'enabled', enabled: true,
  breaker_open: false, breaker_reason: '', paused_reason: '', spec_version: 4,
  owner_id: 'alice', created_at: '2026-10-24T00:00:00', updated_at: '2026-10-24T00:00:00',
  permissions: {
    manage: { allowed: true, reason: null, detail: '创建者 + 平台管理员可编辑 / 启停 / 归档 / Rotate 触发器' },
    run: { allowed: false, reason: 'breaker_open', detail: '失败率熔断已打开：修好后必须人点恢复（止损非自愈）' },
  },
  failure_7d: FAILURE,
  trigger_summary: 'schedule 0 2 * * * Asia/Shanghai · webhook',
  trigger_count: 2, triggers: [],
  next_runs: SCHED_TRIGGER.next_runs, next_runs_trigger_id: 22,
  ...over,
});

const DETAIL = (over: Record<string, any> = {}) =>
  AUTO({ triggers: [HOOK_TRIGGER, SCHED_TRIGGER], ...over });

const RUN = {
  id: 130, trigger_id: 22, trigger_label: 'schedule#22', status: 'failed',
  summary: '12 项冒烟 3 项失败', error: 'exit 1', error_kind: 'work',
  spec_version: 4, started_at: '2026-09-23T02:00:00', finished_at: '2026-09-23T02:03:00',
};

const DELIVERY = {
  id: 88, trigger_id: 21, external_id: 'gh-1', event: 'push.opened',
  payload_bytes: 812, status: 'accepted', response_code: 202, dedup_key: 'k-1',
  error: '', replayed_from: null, replayable: true, replay_block_reason: null,
  received_at: '2026-09-23T02:00:00',
};

const META = { total: 1, enabled: 1, paused: 0, archived: 0, breaker_open: 0 };

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

/** v25 R25-4：规则版本账夹具（GET /api/automations/1/rule-versions 的真实形状） */
const RV = (v: number, over: Record<string, any> = {}) => ({
  id: 100 + v, automation_id: 1, version: v,
  spec: { exec_mode: 'run_only', runbook: { goal: `目标 v${v}` }, triggers: [`t${v}`] },
  reason: v === 1 ? '新增 run_only 触发器' : `第 ${v} 次改动`,
  created_by: 'alice', created_at: `2026-09-2${v}T00:00:00`, ...over,
});
const RULE_VERSIONS = [RV(1), RV(2), RV(3), RV(4)];

/** 常用 GET 路由：清单 + 详情 + 两级账本 + 规则版本账 */
function baseRoutes(over: Record<string, { status?: number; body: any }> = {}) {
  return {
    'GET /api/automations': {
      body: {
        automations: [AUTO()], meta: META,
        breaker_rule: FAILURE.breaker_rule, webhook_payload_limit: 65536,
      },
    },
    'GET /api/automations/1': { body: { automation: DETAIL() } },
    'GET /api/automations/1/runs': { body: { runs: [RUN], note: '第一级账本' } },
    'GET /api/automations/1/deliveries': { body: { deliveries: [DELIVERY], note: '第二级账本' } },
    'GET /api/automations/1/rule-versions': { body: { rule_versions: RULE_VERSIONS } },
    ...over,
  };
}

/** 打开页面并选中第一行（右侧分节全部依赖选中态） */
async function openAndSelect() {
  render(<Automations />);
  await waitFor(() => expect(screen.getByText('发布冒烟')).toBeInTheDocument());
  fireEvent.click(screen.getByLabelText('选中 发布冒烟'));
  await waitFor(() => expect(screen.getByText(/② 三段构成/)).toBeInTheDocument());
}

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  useAutomations.setState({
    items: [], meta: { total: 0, enabled: 0, paused: 0, archived: 0, breaker_open: 0 },
    breakerRule: '', payloadLimit: 65536, selectedId: null, detail: null, triggers: [],
    runs: [], deliveries: [], ruleVersions: [], ruleVersionsError: null,
    error: null, loading: false, notice: null, secretOnce: null,
  });
});

describe('自动化中心 ① 清单', () => {
  it('七列齐全：名称 / 负责人轨 / 触发器摘要 / 执行模式 / 状态 / 近 7d 失败率 / 操作', async () => {
    mockApi(baseRoutes());
    render(<Automations />);
    const table = await screen.findByRole('table', { name: '自动化规则清单' });
    const heads = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    expect(heads).toEqual(['名称', '负责人轨', '触发器摘要', '执行模式', '状态', '近 7d 失败率', '操作']);
    expect(within(table).getByText('发布冒烟')).toBeInTheDocument();
    expect(within(table).getByText('92.2%')).toBeInTheDocument();   // 47/51 的真实派生
    expect(within(table).getByText(/47 败 \/ 51 完结/)).toBeInTheDocument();
    expect(within(table).getByText(/Next runs: 09-24 02:00/)).toBeInTheDocument();
    expect(within(table).getByText('run_only · 只运行')).toBeInTheDocument();
  });

  it('空态：没有自动化时给引导，且不渲染假数据', async () => {
    mockApi(baseRoutes({
      'GET /api/automations': { body: { automations: [], meta: META, breaker_rule: 'x', webhook_payload_limit: 65536 } },
    }));
    render(<Automations />);
    await waitFor(() => expect(screen.getByText(/还没有自动化/)).toBeInTheDocument());
    expect(screen.getByText(/从上面清单选一条自动化/)).toBeInTheDocument();
  });
});

describe('自动化中心 ② 三段构成', () => {
  it('Runbook 段只提交 runbook（不覆盖负责人与触发器）', async () => {
    const calls = mockApi(baseRoutes({
      'PUT /api/automations/1': { body: { ok: true, automation: DETAIL() } },
    }));
    await openAndSelect();
    const goal = screen.getByLabelText('Runbook 目标（做成什么 · 可判成败）');
    fireEvent.change(goal, { target: { value: '换成新目标' } });
    fireEvent.click(screen.getByText('保存 Runbook'));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(Object.keys(put.body)).toEqual(['runbook']);
    expect(put.body.runbook.goal).toBe('换成新目标');
  });

  it('负责人段只提交负责人两字段', async () => {
    const calls = mockApi(baseRoutes({
      'PUT /api/automations/1': { body: { ok: true, automation: DETAIL() } },
    }));
    await openAndSelect();
    fireEvent.change(screen.getByLabelText('负责人引用（编辑）'), { target: { value: 'sq-1' } });
    fireEvent.click(screen.getByText('保存负责人'));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(Object.keys(put.body).sort()).toEqual(['owner_id_ref', 'owner_track']);
    expect(put.body.owner_id_ref).toBe('sq-1');
  });

  it('写失败时后端 detail 原样出现在 alert 里', async () => {
    mockApi(baseRoutes({
      'PUT /api/automations/1': {
        status: 400, body: { detail: 'Runbook 目标不能为空：一句话说清要达成什么（可判成败）' },
      },
    }));
    await openAndSelect();
    fireEvent.click(screen.getByText('保存 Runbook'));
    await waitFor(() => expect(screen.getByRole('alert'))
      .toHaveTextContent('Runbook 目标不能为空：一句话说清要达成什么（可判成败）'));
  });
});

describe('自动化中心 ③ schedule 触发器', () => {
  it('Next runs 必显：未预览不给保存，预览后才可提交', async () => {
    const calls = mockApi(baseRoutes({
      'GET /api/automations/1/triggers/preview': {
        body: { cron: '30 8 * * 1-5', timezone: 'Asia/Shanghai',
                next_runs: ['2026-09-28T08:30:00+08:00', '2026-09-29T08:30:00+08:00', '2026-09-30T08:30:00+08:00'] },
      },
      'POST /api/automations/1/triggers': {
        body: { ok: true, trigger: SCHED_TRIGGER, secret: null, automation: DETAIL() },
      },
    }));
    await openAndSelect();

    const save = screen.getByText('保存 schedule');
    expect(save).toBeDisabled();                       // 不预览不给保存
    expect(screen.getByText(/Next runs 预览（必显）/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('预览 Next runs'));
    await waitFor(() => expect(screen.getByText(/接下来 3 次：09-28 08:30/)).toBeInTheDocument());
    expect(save).not.toBeDisabled();

    fireEvent.click(save);
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    const post = calls.find((c) => c.method === 'POST')!;
    expect(post.url).toBe('/api/automations/1/triggers');
    expect(post.body.kind).toBe('schedule');
    expect(post.body.cron).toBe('30 8 * * 1-5');
    expect(post.body.timezone).toBe('Asia/Shanghai');
  });

  it('展示既有 schedule 的 cron/时区/Next runs/token 遮蔽，且非法 cron 的 422 透传', async () => {
    mockApi(baseRoutes({
      'GET /api/automations/1/triggers/preview': {
        status: 422, body: { detail: 'cron 只能是 5 段（分 时 日 月 周）：本仓不支持秒位，最小粒度 1 分钟' },
      },
    }));
    await openAndSelect();
    const table = screen.getByRole('table', { name: 'schedule 触发器列表' });
    expect(within(table).getByText('0 2 * * *')).toBeInTheDocument();
    expect(within(table).getByText('Asia/Shanghai')).toBeInTheDocument();
    expect(within(table).getByText('09-24 02:00 · 09-25 02:00 · 09-26 02:00')).toBeInTheDocument();

    fireEvent.click(screen.getByText('预览 Next runs'));
    await waitFor(() => expect(screen.getAllByRole('alert').some((el) => /秒位/.test(el.textContent || ''))).toBe(true));
  });
});

describe('自动化中心 ④ webhook 触发器', () => {
  it('遮蔽 token / 载荷字节 / 六步推断 / 响应语义 都在页面上', async () => {
    mockApi(baseRoutes());
    await openAndSelect();
    const table = screen.getByRole('table', { name: 'webhook 触发器列表' });
    expect(within(table).getByText('af_wh_9f4c…e21')).toBeInTheDocument();
    expect(within(table).getByText('65536 字节（64 KiB）')).toBeInTheDocument();
    expect(within(table).getByText('push:opened')).toBeInTheDocument();

    expect(screen.getByText('X-GitHub-Event', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('X-Gitlab-Event', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('webhook.received', { exact: false })).toBeInTheDocument();

    const semantics = screen.getByRole('table', { name: 'webhook 响应语义' });
    expect(within(semantics).getByText(/ignored/)).toBeInTheDocument();
    expect(within(semantics).getByText(/duplicate/)).toBeInTheDocument();
    expect(within(semantics).getByText(/400 \/ 401 \/ 404 \/ 413/)).toBeInTheDocument();
  });

  it('Rotate 打端点并把一次性 URL 显示出来', async () => {
    const calls = mockApi(baseRoutes({
      'POST /api/automations/1/triggers/21/rotate': {
        body: {
          ok: true, trigger: { ...HOOK_TRIGGER, secret_preview: 'af_wh_1111…999' },
          secret: { token: 'af_wh_new', webhook_url: '/api/webhooks/automations/af_wh_new', note: 'token 写-only：明文只在本响应出现一次' },
          automation: DETAIL(),
        },
      },
    }));
    await openAndSelect();
    fireEvent.click(screen.getByLabelText('Rotate webhook af_wh_9f4c…e21'));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/automations/1/triggers/21/rotate')).toBe(true));
    await waitFor(() => expect(screen.getByText(/webhook URL（写-only · 只此一次）/, { exact: false }))
      .toBeInTheDocument());
  });
});

describe('自动化中心 ⑤ 执行模式', () => {
  it('两档取舍句写在选择器旁边，切换后提交 exec_mode', async () => {
    const calls = mockApi(baseRoutes({
      'PUT /api/automations/1': { body: { ok: true, automation: DETAIL({ exec_mode: 'create_issue' }) } },
    }));
    await openAndSelect();
    expect(screen.getByText(/需要人看或跟人干/)).toBeInTheDocument();
    expect(screen.getByText(/只要结果、不留协作记录/)).toBeInTheDocument();
    expect(screen.getByText(/订阅者字段灰显/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('执行模式 create_issue'));
    fireEvent.click(screen.getByText('保存执行模式'));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ exec_mode: 'create_issue' });
  });
});

describe('自动化中心 ⑥ 两级账本 + Replay', () => {
  it('运行史与投递记录两个表 + 选中运行的只读回放', async () => {
    mockApi(baseRoutes());
    await openAndSelect();

    const runs = screen.getByRole('table', { name: '自动化运行史' });
    expect(within(runs).getByText('schedule#22')).toBeInTheDocument();
    expect(within(runs).getByText('[活] exit 1')).toBeInTheDocument();
    expect(within(runs).getByText('v4')).toBeInTheDocument();

    const delivs = screen.getByRole('table', { name: 'webhook 投递记录' });
    expect(within(delivs).getByText('d-88')).toBeInTheDocument();
    expect(within(delivs).getByText('202 accepted')).toBeInTheDocument();
    expect(within(delivs).getByText('812 B')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('查看回放 run 130'));
    await waitFor(() => expect(screen.getByText(/只读回放/)).toBeInTheDocument());
    expect(screen.getAllByText(/执行器未接入/).length).toBeGreaterThan(0);
  });

  it('两级账本空态：各自写清「空」而不是放 0 条假数据', async () => {
    mockApi(baseRoutes({
      'GET /api/automations/1/runs': { body: { runs: [], note: '' } },
      'GET /api/automations/1/deliveries': { body: { deliveries: [], note: '' } },
    }));
    await openAndSelect();
    expect(screen.getByText(/这条规则还没有运行记录/)).toBeInTheDocument();
    expect(screen.getByText(/没有投递记录/)).toBeInTheDocument();
    expect(screen.getByText(/在运行史里点「回放」/)).toBeInTheDocument();
  });

  it('触发器空态：③④ 各自说明「不会被定时触发 / 外部没有入口」', async () => {
    mockApi(baseRoutes({
      'GET /api/automations/1': { body: { automation: AUTO({ triggers: [], trigger_summary: '无触发器（只能 Run now）', trigger_count: 0 }) } },
    }));
    await openAndSelect();
    expect(screen.getByText(/还没有 schedule 触发器/)).toBeInTheDocument();
    expect(screen.getByText(/还没有 webhook 触发器/)).toBeInTheDocument();
  });
});

describe('自动化中心 ⑦ 失败治理', () => {
  it('三态三种后果各写一句，归档要二次确认并落端点', async () => {
    const calls = mockApi(baseRoutes({
      'POST /api/automations/1/archive': { body: { ok: true, automation: DETAIL({ status: 'archived', enabled: false }) } },
    }));
    await openAndSelect();
    expect(screen.getByText(/没有「恢复触发」/)).toBeInTheDocument();
    expect(screen.getAllByText(/止损非自愈/).length).toBeGreaterThan(0);
    expect(screen.getByText(/历史保留/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('归档…'));
    fireEvent.click(screen.getByText('确认归档'));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/automations/1/archive')).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/archive'))!.method).toBe('POST');
  });

  it('暂停 / 熔断分别打自己的端点', async () => {
    const calls = mockApi(baseRoutes({
      'POST /api/automations/1/pause': { body: { ok: true, automation: DETAIL({ enabled: false, status: 'paused' }) } },
      'POST /api/automations/1/breaker': { body: { ok: true, automation: DETAIL({ breaker_open: true }) } },
    }));
    await openAndSelect();
    fireEvent.click(screen.getAllByText('暂停')[0]);
    await waitFor(() => expect(calls.some((c) => c.url === '/api/automations/1/pause')).toBe(true));
    fireEvent.click(screen.getByText('打开熔断'));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/automations/1/breaker')).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/breaker'))!.body).toEqual({ open: true, reason: '人工演练熔断门' });
  });
});

describe('自动化中心 ⑧ 权限两本账', () => {
  it('能管（allowed）与能真跑（breaker_open）分开显示', async () => {
    mockApi(baseRoutes());
    await openAndSelect();
    expect(screen.getByText('这本账：谁能管这条（编辑 / 启停 / 归档 / Rotate）')).toBeInTheDocument();
    expect(screen.getByText('那本账：这条能不能真跑（enabled + breaker）')).toBeInTheDocument();
    expect(screen.getByText('allowed')).toBeInTheDocument();
    expect(screen.getByText('不能真跑 · breaker_open')).toBeInTheDocument();
    expect(screen.getByText(/enabled=true · breaker_open=false/)).toBeInTheDocument();
    expect(screen.getByText(/能管自动化 ≠ 能跑它的 Agent/)).toBeInTheDocument();
  });
});

describe('自动化中心 ⑨ 基线对照', () => {
  it('multica 口径 ⟂ agentflow 自扩展 分行写', async () => {
    mockApi(baseRoutes());
    await openAndSelect();
    expect(screen.getByText(/⑨ multica 文档基线 ⟂ agentflow 自扩展/)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: '基线对照表' });
    expect(within(table).getByText(/只有 schedule 与 webhook 两类/)).toBeInTheDocument();
    expect(within(table).getAllByText(/agentflow 自扩展/).length).toBeGreaterThan(0);
    expect(within(table).getByText(/近 7 天 ≥50 次完结且失败率 ≥90%/)).toBeInTheDocument();
  });
});

describe('自动化中心 页名纪律', () => {
  it('页级标题由 PageHeader 承担，九节仍使用分节标题', async () => {
    mockApi(baseRoutes());
    await openAndSelect();
    expect(document.querySelectorAll('h1').length).toBe(1);
    expect(document.querySelectorAll('h2').length).toBe(0);
    expect(screen.getByRole('heading', { level: 1, name: '自动化' })).toBeInTheDocument();
  });
});
