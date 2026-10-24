/**
 * 对话中心四语义（change ui-parity · P3-3 / 原型 6.8 `chat.html`）
 *
 * 每条语义至少一条断言，且断言打的是「页面上真有的字 + 真禁用的控件 + 真透传的 detail」：
 *   ① 1:1 完全私密（管理员也看不到）—— 不能出现「管理员可查看全部会话」这类反向暗示
 *   ② 一条消息 = 一个 run —— 消息行有 run 标识与 queued/running/done/failed 状态，失败给原因
 *   ③ 运行时离线 → queued 等待上线 —— 队列文案 + 缺口如实标注
 *   ④ 归档 = 只读 / Agent 不可运行禁发 —— 输入框 disabled + 原因 + 发送按钮 disabled
 * 另加：不自动建任务、＋挂 Project context（未接入）、写失败 detail 原样显示。
 *
 * 关于夹具的口径（不是造假数据）：queued 用后端真实存在的 `messages.status = 'pending'`
 * （models/message.py:MSG_STATUSES）；归档用 `conversation.archived_at`（后端会话表暂无该列 →
 * 页面标未接入、列补齐后自动生效，来源见 P3-chat-knowledge.md 的缺口清单）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConversationCenter from '../pages/ConversationCenter';
import { useChat } from '../stores/chat';
import { useAgents } from '../stores/agents';
import { useRuntimes } from '../stores/runtimes';
import { useProjects } from '../stores/projects';
import { invalidateCache } from '../utils/requestDedup';
import {
  CHAT_RULES,
  CONTEXT_UNWIRED_NOTE,
  NOT_RUNNABLE_STATUSES,
  PRIVACY_NOTE,
  QUEUED_GAP_NOTE,
  QUEUED_NOTE,
  composeBlockReason,
  groupConversations,
  isAgentRunnable,
  runLabel,
  runStateOf,
  runtimeReachability,
} from '../components/chat/chatSemantics';

// ── 夹具 ────────────────────────────────────────────────
const NOW = new Date().toISOString();

const AGENT_OK = { id: 5, name: '审查 Agent', status: 'standby', runtime: 'dsh', model_name: 'dsh · deepseek-chat' };
const AGENT_ARCHIVED = { id: 7, name: '旧版审查 Agent', status: 'archived', runtime: 'claude' };

const MSG_DONE = { id: 12, role: 'agent', content: '都在「审核中」，明细如下…', status: 'done', created_at: NOW };
const MSG_QUEUED = { id: 13, role: 'user', content: '帮我把这批日志归档', status: 'pending', created_at: NOW };
const MSG_FAILED = {
  id: 14, role: 'agent', content: 'Agent 暂时无法回复，请稍后重试', status: 'error', created_at: NOW,
};

const CONV_RUNNING = {
  id: 1, agent_id: 5, owner_id: 'alice', channel_type: 'web', title: '审查 agent-domains 的变更',
  created_at: NOW, updated_at: NOW,
  last_message: { id: 20, role: 'agent', content: '跑着呢', status: 'processing', created_at: NOW },
};
const CONV_QUEUED = {
  id: 2, agent_id: 5, owner_id: 'alice', channel_type: 'web', title: '帮我把这批日志归档',
  created_at: NOW, updated_at: NOW, last_message: MSG_QUEUED,
};
const CONV_ARCHIVED = {
  id: 3, agent_id: 5, owner_id: 'alice', channel_type: 'web', title: '迁移旧审查清单',
  created_at: '2026-09-20T09:00:00', updated_at: '2026-09-20T09:00:00',
  archived_at: '2026-09-21T10:00:00', last_message: { id: 30, role: 'agent', content: '旧结论', status: 'done', created_at: NOW },
};

const RUNTIME_OFFLINE = { id: 1, cli: 'dsh', status: 'offline', machine_name: 'rt-1' };
const PROJECT = { id: 1, name: 'agentflow' };

/** 最小 fetch 桩：与方法+路径匹配的假响应，记录每次调用（含 method / body）。 */
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

function baseRoutes(over: Record<string, { status?: number; body: any }> = {}) {
  return {
    'GET /api/agents': { body: { agents: [AGENT_OK, AGENT_ARCHIVED] } },
    'GET /api/runtimes': { body: { runtimes: [RUNTIME_OFFLINE] } },
    'GET /api/projects': { body: { projects: [PROJECT] } },
    'GET /api/chat/conversations': { body: [CONV_RUNNING, CONV_QUEUED] },
    'GET /api/chat/1/messages': { body: [MSG_DONE, MSG_QUEUED, MSG_FAILED] },
    ...over,
  };
}

async function renderAndOpen(title: string) {
  render(<ConversationCenter />);
  const row = await screen.findByLabelText(`打开会话 ${title}`);
  fireEvent.click(row);
  await waitFor(() => expect(screen.getByText('run msg-12')).toBeInTheDocument());
}

beforeEach(() => {
  // 5s 读缓存会跨用例串数据 → 每个用例前清一次
  invalidateCache();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  useChat.setState({
    conversations: [], currentConversationId: null, currentAgentId: null,
    messages: [], loading: false, error: null,
  });
  useAgents.setState({ agents: [], loading: false });
  useRuntimes.setState({ registry: [], registryError: null, registryLoading: false });
  useProjects.setState({ projects: [], loading: false });
});

// ── ① 1:1 完全私密 ──────────────────────────────────────
describe('语义 ①：1:1 完全私密（管理员也看不到）', () => {
  it('列表与详情都写明「管理员也看不到」，且不出现「管理员可查看全部会话」', async () => {
    mockApi(baseRoutes());
    await renderAndOpen(CONV_RUNNING.title);

    // 私密句在左栏常驻（PRIVACY_NOTE 含「管理员也看不到」；行首带 🔒，故用子串断言）
    expect(screen.getByText(/会话完全私密：仅我与该 Agent/)).toBeInTheDocument();
    expect(screen.getByText(/管理员也看不到/)).toBeInTheDocument();
    expect(PRIVACY_NOTE).toContain('管理员也看不到');
    // 详情头也有私密 chip（不止列表说一次）
    expect(screen.getAllByText(/一对一 · 完全私密/).length).toBeGreaterThanOrEqual(1);
    // 反向暗示必须不存在
    expect(screen.queryByText(/管理员可查看全部/)).toBeNull();
    expect(screen.queryByText(/管理员可见/)).toBeNull();
  });
});

// ── ② 一条消息 = 一个 run ───────────────────────────────
describe('语义 ②：一条消息 = 一个 run', () => {
  it('每条消息都有 run 标识与 run 状态（queued/running/done/failed）', async () => {
    mockApi(baseRoutes());
    await renderAndOpen(CONV_RUNNING.title);

    // run 标识：后端无 run_id 列 → 由消息 id 承载（runLabel 口径）
    expect(screen.getByText('run msg-12')).toBeInTheDocument();
    expect(screen.getByText('run msg-13')).toBeInTheDocument();
    expect(screen.getByText('run msg-14')).toBeInTheDocument();

    // 状态 token 全部可见
    expect(screen.getAllByText('done').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('queued').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('failed').length).toBeGreaterThanOrEqual(1);
  });

  it('失败消息给出原因（消息正文原样透传，不改写成「成功」）', async () => {
    mockApi(baseRoutes());
    await renderAndOpen(CONV_RUNNING.title);
    expect(screen.getAllByText('发送失败').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/原因：Agent 暂时无法回复，请稍后重试/)).toBeInTheDocument();
  });

  it('runStateOf / runLabel 映射与后端状态值一一对应', () => {
    expect(runStateOf('pending')).toBe('queued');
    expect(runStateOf('processing')).toBe('running');
    expect(runStateOf('done')).toBe('done');
    expect(runStateOf('error')).toBe('failed');
    expect(runLabel({ id: 9, role: 'user', content: '', status: 'done', created_at: '' })).toBe('msg-9');
    expect(runLabel({ id: 9, role: 'user', content: '', status: 'done', created_at: '', run_id: 'r-131' })).toBe('r-131');
  });
});

// ── ③ 运行时离线 → queued 等待上线 ──────────────────────
describe('语义 ③：运行时离线 → queued 等待上线', () => {
  it('会话/消息显示 queued 与「等待上线」，并给「不丢、不算失败」口径', async () => {
    mockApi(baseRoutes());
    await renderAndOpen(CONV_RUNNING.title);

    // 列表的排队分组 + 消息行的 queued 文案
    expect(screen.getByText(/排队等待上线/)).toBeInTheDocument();
    expect(screen.getAllByText(/等待上线/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/不丢、不算失败/).length).toBeGreaterThanOrEqual(1);
    // 与小队 / 自动化侧同一口径（同一句话，不许两页各说一套）
    expect(screen.getAllByText(/runtime_offline/).length).toBeGreaterThanOrEqual(1);
    expect(QUEUED_NOTE).toContain('离线暂存不丢');
  });

  it('离线时把「排队尚未实现」的缺口如实标出来，不假装消息已在队列', async () => {
    mockApi(baseRoutes());
    await renderAndOpen(CONV_RUNNING.title);
    expect(screen.getAllByText(QUEUED_GAP_NOTE).length).toBeGreaterThanOrEqual(1);
    expect(QUEUED_GAP_NOTE).toContain('尚未实现');
  });

  it('运行时注册表说离线 → reachability=offline；进程内 provider 未登记不算离线', () => {
    expect(runtimeReachability('dsh', [RUNTIME_OFFLINE as any]).state).toBe('offline');
    expect(runtimeReachability('dsh', [{ ...RUNTIME_OFFLINE, status: 'online' } as any]).state).toBe('online');
    expect(runtimeReachability('langgraph', [RUNTIME_OFFLINE as any]).state).toBe('unregistered');
  });
});

// ── ④ 归档 = 只读 · Agent 不可运行禁发 ─────────────────
describe('语义 ④：归档 = 只读 · Agent 不可运行不能发新消息', () => {
  it('归档会话：输入框与发送按钮都禁用，并写明原因', async () => {
    mockApi(baseRoutes({
      'GET /api/chat/conversations': { body: [CONV_ARCHIVED, CONV_RUNNING] },
    }));
    render(<ConversationCenter />);
    fireEvent.click(await screen.findByLabelText(`打开会话 ${CONV_ARCHIVED.title}`));

    const input = await screen.findByLabelText('消息输入');
    await waitFor(() => expect(input).toBeDisabled());
    expect(screen.getByPlaceholderText('会话已归档 · 只读')).toBeInTheDocument();
    expect(screen.getAllByText(/会话已归档 = 只读/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled();
    // 列表也标出「已归档 · 只读」
    expect(screen.getAllByText(/已归档 · 只读/).length).toBeGreaterThanOrEqual(1);
    // 分组里单独一档
    expect(screen.getByText(/已归档（1）/)).toBeInTheDocument();
  });

  it('Agent 已归档：发送按钮禁用，原因里点名 status=archived', async () => {
    mockApi(baseRoutes({
      'GET /api/agents': { body: { agents: [AGENT_ARCHIVED] } },
      'GET /api/chat/conversations': { body: [{ ...CONV_RUNNING, agent_id: AGENT_ARCHIVED.id }] },
    }));
    render(<ConversationCenter />);
    fireEvent.click(await screen.findByLabelText(`打开会话 ${CONV_RUNNING.title}`));

    const input = await screen.findByLabelText('消息输入');
    await waitFor(() => expect(input).toBeDisabled());
    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled();
    expect(screen.getAllByText(/status=archived/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/不能发新消息/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText('Agent 不可运行 · 不能发新消息')).toBeInTheDocument();
  });

  it('归档 Agent 不可作为会话归属：选择器里禁用、点了也不会建会话', async () => {
    const calls = mockApi(baseRoutes());
    render(<ConversationCenter />);
    fireEvent.click(screen.getAllByRole('button', { name: /新对话/ })[0]);
    const pick = await screen.findByText('旧版审查 Agent');
    const btn = pick.closest('button')!;
    expect(btn).toBeDisabled();
    expect(screen.getByText('已归档 · 不可作为会话归属')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/chat/conversations')).toBe(false);
  });

  it('门禁判定单点：归档优先于 Agent 级，且 archived/disabled 两值同罪', () => {
    for (const status of NOT_RUNNABLE_STATUSES) {
      expect(isAgentRunnable({ id: 1, name: 'A', status })).toBe(false);
      expect(composeBlockReason({ agent: { id: 1, name: 'A', status } })).toContain(`status=${status}`);
    }
    expect(composeBlockReason({ archived: true, agent: AGENT_ARCHIVED })).toContain('归档 = 只读');
    expect(composeBlockReason({ agent: AGENT_OK })).toBeNull();
  });
});

// ── 补充项：不自动建任务 / ＋挂 Project context / 写失败透传 ──
describe('补充口径：不自动建任务 · Project context · 失败 detail 透传', () => {
  it('写明「不自动建任务」，且整页不向任何任务端点发写请求', async () => {
    const calls = mockApi(baseRoutes());
    await renderAndOpen(CONV_RUNNING.title);
    expect(screen.getAllByText(/不自动建任务/).length).toBeGreaterThanOrEqual(1);
    expect(calls.some((c) => c.method === 'POST' && /task/i.test(c.url))).toBe(false);
  });

  it('＋ 挂 Project context：能选项目，但显式标未接入且不发任何写请求', async () => {
    const calls = mockApi(baseRoutes());
    await renderAndOpen(CONV_RUNNING.title);

    fireEvent.click(screen.getByRole('button', { name: /＋ 挂 Project context/ }));
    const projectBtn = await screen.findByLabelText('挂载项目 agentflow');
    fireEvent.click(projectBtn);

    expect(await screen.findByText(CONTEXT_UNWIRED_NOTE)).toBeInTheDocument();
    expect(screen.getByText('context agentflow')).toBeInTheDocument();
    expect(screen.getAllByText('未接入').length).toBeGreaterThanOrEqual(1);
    expect(calls.filter((c) => c.method !== 'GET')).toEqual([]);
  });

  it('写操作失败：后端 detail 原样显示（不压成「发送失败」这类模糊文案）', async () => {
    mockApi(baseRoutes({
      'POST /api/agents/5/chat': { status: 400, body: { detail: '会话 1 已归档，不能发新消息' } },
    }));
    await renderAndOpen(CONV_RUNNING.title);

    const input = screen.getByLabelText('消息输入');
    fireEvent.change(input, { target: { value: '再发一条' } });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('会话 1 已归档，不能发新消息');
  });

  it('会话规则（门禁）六条口径在页面上可见', async () => {
    mockApi(baseRoutes());
    await renderAndOpen(CONV_RUNNING.title);
    for (const rule of CHAT_RULES) {
      expect(screen.getByText(rule.text)).toBeInTheDocument();
    }
    // 分组口径也在
    const groups = groupConversations([CONV_RUNNING, CONV_QUEUED, CONV_ARCHIVED] as any, new Date());
    expect(groups.map((g) => g.key)).toEqual(['running', 'queued', 'archived']);
  });
});
