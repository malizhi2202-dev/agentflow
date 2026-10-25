/**
 * 任务看板 P3-3 的前端验收（原型 6.20 board.html + 5 个变体）
 *
 * 断言的是「变体态真的分支了」而不是「页面渲染出来了」：
 * 1. 两轴分开显示 + 「状态标签不授予行为」+ 受理门未接入如实标注；
 * 2. 指派三轨：选小队出现「给 leader 入队 / 成员不抢单」，提交打三轨端点，失败 detail 透传；
 * 3. 标记完成（board__mark-done）：证据 label + ref 随请求发出；**空证据仍可完成**，
 *    并把后端 warning 文案显示出来（警告式，不是 400）；
 * 4. 视图过滤（board__af-109 / af-116）：需我处理 → mine+triage_state；负责人含 Agent →
 *    assignee_kind；过滤状态可见、可清、可一键清空；
 * 5. done 列表：有证据显示证据 chip，无证据显示「缺证据」警告 chip + 补证据提示。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

import Tasks from '../pages/Tasks';
import { useCollab } from '../stores/collab';
import { invalidateCache } from '../utils/requestDedup';

const TASK = (over: Partial<any> = {}) => ({
  id: 1, title: '修构建', description: '', status: 'in_progress',
  status_category: 'started', triage_state: 'triaged',
  assignee_kind: 'member', assignee_id: 'bob', priority: 60,
  due_date: null, squad_id: null, is_leader_task: false, evidence: [],
  evidence_warned: false, originator_id: 'alice', accountable_id: 'alice',
  parent_id: null, created_at: '2026-10-24T00:00:00', updated_at: '2026-10-24T00:00:00',
  ...over,
});

type Call = { url: string; method: string; body?: any };

function mockApi(routes: Record<string, { status?: number; body: any }>) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const key = `${method} ${String(url).split('?')[0]}`;
    const hit = routes[key] ?? { status: 404, body: { detail: `no mock for ${key}` } };
    const res: any = {
      ok: (hit.status ?? 200) < 400,
      status: hit.status ?? 200,
      headers: new Map(),
      json: async () => hit.body,
      text: async () => JSON.stringify(hit.body),
    };
    res.clone = () => res;
    return res as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

/** 卡片按 aria-label 定位（卡片内文本断言用 textContent，避免 getByText 命中祖先）。 */
function card(title: string): HTMLElement {
  const el = document.querySelector(`[aria-label="任务 ${title}"]`);
  if (!el) throw new Error(`找不到卡片：${title}`);
  return el as HTMLElement;
}

function picker(): HTMLElement {
  const el = document.querySelector('[aria-label="指派负责人"]');
  if (!el) throw new Error('指派选择器没打开');
  return el as HTMLElement;
}

const lastGet = (calls: Call[]) => [...calls].reverse().find((c) => c.method === 'GET');
const lastPost = (calls: Call[], suffix: string) =>
  [...calls].reverse().find((c) => c.method === 'POST' && c.url.endsWith(suffix));

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  useCollab.setState({
    tasks: [], tasksError: null, tasksLoading: false,
    actionRequired: [], muted: [], unreadCount: 0, inboxError: null, inboxLoading: false,
  });
});

describe('任务看板 · 两轴与状态标签不授予行为', () => {
  it('状态轴与受理轴分开显示，并如实标注受理门「后端未接入」', async () => {
    mockApi({
      'GET /api/tasks': {
        body: { tasks: [TASK({ triage_state: 'needs_triage' })], total: 1 },
      },
    });
    const { container } = render(<Tasks />);
    await waitFor(() => expect(card('修构建')).toBeInTheDocument());

    // 两轴分开：状态 chip 带生命周期值，受理 chip 独立
    const text = card('修构建').textContent || '';
    expect(text).toContain('状态 · 进行中');
    expect(text).toContain('(started)');
    expect(text).toContain('受理 · 待受理');

    // 状态标签不授予行为 + 受理门口径写在页面上
    const pageText = container.textContent || '';
    expect(pageText).toContain('状态标签不授予行为');
    expect(pageText).toContain('进「进行中」≠ 自动启动 Agent'.replace('≠', '≠'));
    expect(pageText).toContain('不拦人点名派发');
    // 后端没有派生执行入口 → 不造门，标未接入
    expect(screen.getByText('受理门 · 后端未接入')).toBeInTheDocument();

    // 两根轴各自可点，互不改：triage 按钮仍在（与 status 正交）
    expect(screen.getByTitle('标记为已分诊（triage 与 status 正交）')).toBeInTheDocument();
  });
});

describe('任务看板 · 指派三轨（board__assign-* / pp-assignee）', () => {
  it('选「小队」显示给 leader 入队语义，提交先弹两决定，「先不开工」按三轨打端点', async () => {
    const calls = mockApi({
      'GET /api/tasks': { body: { tasks: [TASK()], total: 1 } },
      'POST /api/tasks/1/assign': { body: { ok: true, task: TASK({ assignee_kind: 'squad', assignee_id: 'code-review' }) } },
    });
    render(<Tasks />);
    await waitFor(() => expect(card('修构建')).toBeInTheDocument());

    fireEvent.click(within(card('修构建')).getByRole('button', { name: '指派' }));
    expect(picker()).toBeInTheDocument();
    // 三轨都在
    for (const label of ['人', 'Agent', '小队']) {
      expect(within(picker()).getByRole('button', { name: label })).toBeInTheDocument();
    }
    // 人轨默认文案：不产生 run
    expect(picker().textContent).toContain('不产生 run');

    fireEvent.click(within(picker()).getByRole('button', { name: '小队' }));
    expect(picker().textContent).toContain('给 leader 入队');
    expect(picker().textContent).toContain('成员不抢单');

    fireEvent.change(within(picker()).getByLabelText('负责人 ID'), { target: { value: 'code-review' } });
    fireEvent.click(within(picker()).getByRole('button', { name: '确定指派' }));

    // v25 R25-8（board#md-assign-confirm）：点提交不直接开跑——先弹两决定
    await waitFor(() => expect(screen.getByText('指派确认 · 这次真的开跑谁？')).toBeInTheDocument());
    expect(lastPost(calls, '/assign')).toBeUndefined();   // 未点决定前不发写请求
    fireEvent.click(screen.getByRole('button', { name: '先不开工' }));

    await waitFor(() => {
      expect(lastPost(calls, '/assign')?.body).toMatchObject({
        assignee_kind: 'squad', assignee_id: 'code-review',
      });
    });
    expect(lastPost(calls, '/assign')?.body).not.toHaveProperty('start');  // 先不开工 = 不带 start
  });

  it('确认层「开始」= 显式运行请求：body 带 start:true', async () => {
    const calls = mockApi({
      'GET /api/tasks': { body: { tasks: [TASK()], total: 1 } },
      'POST /api/tasks/1/assign': {
        body: { ok: true, task: TASK({ assignee_kind: 'agent', assignee_id: '5' }),
                run: { id: 9, run_id: 'assign-x', status: 'queued', agent_id: 5 } },
      },
    });
    render(<Tasks />);
    await waitFor(() => expect(card('修构建')).toBeInTheDocument());
    fireEvent.click(within(card('修构建')).getByRole('button', { name: '指派' }));
    fireEvent.click(within(picker()).getByRole('button', { name: 'Agent' }));
    fireEvent.change(within(picker()).getByLabelText('负责人 ID'), { target: { value: '5' } });
    fireEvent.click(within(picker()).getByRole('button', { name: '确定指派' }));
    await waitFor(() => expect(screen.getByText('指派确认 · 这次真的开跑谁？')).toBeInTheDocument());
    // 已出停车闸（in_progress）→「开始」可点
    const startBtn = screen.getByRole('button', { name: '开始' });
    expect(startBtn).toBeEnabled();
    fireEvent.click(startBtn);
    await waitFor(() => expect(lastPost(calls, '/assign')?.body).toMatchObject({
      assignee_kind: 'agent', assignee_id: '5', start: true,
    }));
  });

  it('停车闸内（backlog）「开始」灰置，只留「先不开工」登记', async () => {
    const calls = mockApi({
      'GET /api/tasks': { body: { tasks: [TASK({ status: 'backlog', status_category: 'unstarted' })], total: 1 } },
      'POST /api/tasks/1/assign': { body: { ok: true, task: TASK({ status: 'backlog' }) } },
    });
    render(<Tasks />);
    await waitFor(() => expect(card('修构建')).toBeInTheDocument());
    fireEvent.click(within(card('修构建')).getByRole('button', { name: '指派' }));
    fireEvent.click(within(picker()).getByRole('button', { name: 'Agent' }));
    fireEvent.change(within(picker()).getByLabelText('负责人 ID'), { target: { value: '5' } });
    fireEvent.click(within(picker()).getByRole('button', { name: '确定指派' }));
    await waitFor(() => expect(screen.getByText('指派确认 · 这次真的开跑谁？')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '开始' })).toBeDisabled();   // 闸内不入队
    fireEvent.click(screen.getByRole('button', { name: '先不开工' }));      // 登记仍可以
    await waitFor(() => expect(lastPost(calls, '/assign')).toBeTruthy());
    expect(lastPost(calls, '/assign')?.body).not.toHaveProperty('start');
  });

  it('人轨不弹确认层（人不产生 run），提交即登记', async () => {
    const calls = mockApi({
      'GET /api/tasks': { body: { tasks: [TASK()], total: 1 } },
      'POST /api/tasks/1/assign': { body: { ok: true, task: TASK({ assignee_kind: 'member', assignee_id: 'bob' }) } },
    });
    render(<Tasks />);
    await waitFor(() => expect(card('修构建')).toBeInTheDocument());
    fireEvent.click(within(card('修构建')).getByRole('button', { name: '指派' }));
    fireEvent.click(within(picker()).getByRole('button', { name: '人' }));
    fireEvent.change(within(picker()).getByLabelText('负责人 ID'), { target: { value: 'bob' } });
    fireEvent.click(within(picker()).getByRole('button', { name: '确定指派' }));
    await waitFor(() => expect(lastPost(calls, '/assign')).toBeTruthy());
    expect(screen.queryByText('指派确认 · 这次真的开跑谁？')).not.toBeInTheDocument();
  });

  it('指派失败把后端 detail 原样显示', async () => {
    mockApi({
      'GET /api/tasks': { body: { tasks: [TASK()], total: 1 } },
      'POST /api/tasks/1/assign': {
        status: 400, body: { detail: 'runtime offline（心跳 > 75s）' },
      },
    });
    render(<Tasks />);
    await waitFor(() => expect(card('修构建')).toBeInTheDocument());

    fireEvent.click(within(card('修构建')).getByRole('button', { name: '指派' }));
    fireEvent.click(within(picker()).getByRole('button', { name: 'Agent' }));
    fireEvent.change(within(picker()).getByLabelText('负责人 ID'), { target: { value: 'repo-hygiene' } });
    fireEvent.click(within(picker()).getByRole('button', { name: '确定指派' }));
    // v25 R25-8：Agent 轨先弹确认层；这里走「先不开工」仍打同一端点、detail 原样透传
    await waitFor(() => expect(screen.getByText('指派确认 · 这次真的开跑谁？')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '先不开工' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('runtime offline（心跳 > 75s）');
    });
  });
});

describe('任务看板 · 标记完成（board__mark-done）', () => {
  it('空证据仍可完成，但显示后端 warning 文案（警告式，不是 400）', async () => {
    const warning = '缺证据：done 建议补证据 + 请同伴复核（仅提醒，未阻断完成）';
    const calls = mockApi({
      'GET /api/tasks': { body: { tasks: [TASK({ status: 'in_review', status_category: 'started' })], total: 1 } },
      'POST /api/tasks/1/status': {
        body: {
          ok: true, task: TASK({ status: 'done', status_category: 'done', evidence_warned: true }),
          warnings: ['done_without_evidence'], evidence_warned: true, evidence_warning: warning,
        },
      },
    });
    render(<Tasks />);
    await waitFor(() => expect(card('修构建')).toBeInTheDocument());

    fireEvent.click(within(card('修构建')).getByRole('button', { name: '→ 完成（需证据）' }));
    const form = document.querySelector('[aria-label="标记完成（附证据）"]') as HTMLElement;
    expect(form).toBeInTheDocument();
    expect(form.textContent).toContain('需证据 + 同伴复核');

    fireEvent.click(within(form).getByRole('button', { name: '确认完成' }));

    await waitFor(() => {
      // 空证据也发出完成请求（不硬拦）
      expect(lastPost(calls, '/status')?.body).toEqual({ status: 'done' });
    });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('缺证据：done 建议补证据 + 请同伴复核');
    });
  });

  it('有证据时 label + ref 随请求发出，且不出现缺证据警告', async () => {
    const calls = mockApi({
      'GET /api/tasks': { body: { tasks: [TASK({ status: 'in_review', status_category: 'started' })], total: 1 } },
      'POST /api/tasks/1/status': {
        body: {
          ok: true,
          task: TASK({ status: 'done', status_category: 'done', evidence: [{ label: 'npx tsc --noEmit → 0 errors', ref: 'run-8849' }] }),
          warnings: [], evidence_warned: false, evidence_warning: null,
        },
      },
    });
    render(<Tasks />);
    await waitFor(() => expect(card('修构建')).toBeInTheDocument());

    fireEvent.click(within(card('修构建')).getByRole('button', { name: '→ 完成（需证据）' }));
    const form = document.querySelector('[aria-label="标记完成（附证据）"]') as HTMLElement;
    fireEvent.change(within(form).getByLabelText('证据 1 描述'), { target: { value: 'npx tsc --noEmit → 0 errors' } });
    fireEvent.change(within(form).getByLabelText('证据 1 引用'), { target: { value: 'run-8849' } });
    fireEvent.click(within(form).getByRole('button', { name: '确认完成' }));

    await waitFor(() => {
      expect(lastPost(calls, '/status')?.body).toEqual({
        status: 'done',
        evidence: [{ label: 'npx tsc --noEmit → 0 errors', ref: 'run-8849' }],
      });
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect((card('修构建').textContent || '')).not.toContain('缺证据');
  });

  it('「无证据提交」显式提交时不带 evidence（由后端按已存证据判定）', async () => {
    const calls = mockApi({
      'GET /api/tasks': { body: { tasks: [TASK({ status: 'in_review' })], total: 1 } },
      'POST /api/tasks/1/status': {
        body: {
          ok: true, task: TASK({ status: 'done', status_category: 'done' }),
          warnings: ['done_without_evidence'], evidence_warned: true,
          evidence_warning: '缺证据：done 建议补证据 + 请同伴复核（仅提醒，未阻断完成）',
        },
      },
    });
    render(<Tasks />);
    await waitFor(() => expect(card('修构建')).toBeInTheDocument());

    fireEvent.click(within(card('修构建')).getByRole('button', { name: '→ 完成（需证据）' }));
    const form = document.querySelector('[aria-label="标记完成（附证据）"]') as HTMLElement;
    fireEvent.click(within(form).getByRole('button', { name: '无证据提交（记为可疑完成）' }));

    await waitFor(() => {
      expect(lastPost(calls, '/status')?.body).toEqual({ status: 'done' });
    });
  });
});

describe('任务看板 · 视图过滤（board__af-109 / af-116）', () => {
  it('需我处理 / 负责人含 Agent 真打端点，且过滤状态可见可清', async () => {
    const calls = mockApi({
      'GET /api/tasks': { body: { tasks: [TASK()], total: 1 } },
    });
    const { container } = render(<Tasks />);
    await waitFor(() => expect(card('修构建')).toBeInTheDocument());
    expect(lastGet(calls)?.url).toBe('/api/tasks');

    // 需我处理 = 与我有关 + 已受理
    fireEvent.click(screen.getByRole('button', { name: '需我处理' }));
    await waitFor(() => {
      const url = lastGet(calls)?.url || '';
      expect(url).toContain('mine=true');
      expect(url).toContain('triage_state=triaged');
    });
    expect(container.textContent).toContain('视图已收窄 · 1 项');
    expect(screen.getByRole('button', { name: '清除过滤：需我处理' })).toBeInTheDocument();

    // 负责人含 Agent
    fireEvent.click(screen.getByRole('button', { name: '负责人含 Agent' }));
    await waitFor(() => {
      const url = lastGet(calls)?.url || '';
      expect(url).toContain('assignee_kind=agent');
      expect(url).toContain('mine=true');
    });

    // 逐条清除
    fireEvent.click(screen.getByRole('button', { name: '清除过滤：需我处理' }));
    await waitFor(() => {
      const url = lastGet(calls)?.url || '';
      expect(url).not.toContain('mine=true');
      expect(url).toContain('assignee_kind=agent');
    });

    // 一键清除（先失效 5s 缓存，否则「回到全量」命中挂载时的同 URL 缓存、看不到新请求）
    invalidateCache();
    fireEvent.click(screen.getByRole('button', { name: '清除全部过滤' }));
    await waitFor(() => expect(lastGet(calls)?.url).toBe('/api/tasks'));
    expect(container.textContent).not.toContain('视图已收窄');
  });
});

describe('任务看板 · done 列证据 chip', () => {
  it('有证据显示证据 chip，无证据显示「缺证据」警告 chip + 补证据提示', async () => {
    mockApi({
      'GET /api/tasks': {
        body: {
          tasks: [
            TASK({
              id: 21, title: '能力分组三层树', status: 'done', status_category: 'done',
              evidence: [{ label: 'npx tsc --noEmit → 0 errors', ref: 'run-8849' }],
            }),
            TASK({
              id: 22, title: '可疑完成的任务', status: 'done', status_category: 'done',
              evidence: [], evidence_warned: true,
            }),
          ],
          total: 2,
        },
      },
    });
    render(<Tasks />);
    await waitFor(() => expect(card('能力分组三层树')).toBeInTheDocument());

    const withEvidence = card('能力分组三层树').textContent || '';
    expect(withEvidence).toContain('证据 · npx tsc --noEmit → 0 errors · run-8849');
    expect(withEvidence).not.toContain('缺证据');

    const withoutEvidence = card('可疑完成的任务').textContent || '';
    expect(withoutEvidence).toContain('缺证据');
    expect(withoutEvidence).toContain('补证据 + 请同伴复核');
    expect(withoutEvidence).not.toContain('证据 ·');
  });
});
