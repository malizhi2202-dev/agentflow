/**
 * 对话中心的四语义 + 门禁口径 —— 措辞与判定只在这里写一次。
 *
 * 为什么集中：原型（chat.html）把四件事写成两句「定位句」，页面里如果每块各写一套，
 * 就会出现「列表说私密、详情说管理员可见」这种自相矛盾。这里把
 * ① 1:1 完全私密 ② 一条消息 = 一个 run ③ 运行时离线 → queued 等待上线
 * ④ 归档 = 只读 / Agent 不可运行禁发
 * 的文案与判定收口，页面只做渲染；用例断言打的也是这些常量，文案改了用例会跟着红。
 *
 * 口径来源（不是自造）：
 * - 「1:1 完全私密 · 管理员也看不到」：原型 chat.html 定位句 + callout；
 *   后端 `chat_service.list_conversations/get_messages` 只按 `owner_id` 过滤，事实一致。
 * - 「Agent 不可运行」：`services/team_service.py` 的既有判定 `agent.status in ("archived", "disabled")`
 *   —— 与团队/小队侧同一口径，不另造第三套。
 * - 「运行时离线 queued 等待上线」：原型与自动化侧 `runtime_offline 暂存不丢` 同一口径。
 */
import type { AgentLite, Conversation, Message, RuntimeLite } from './types';

// ── 一条消息 = 一个 run ────────────────────────────────────────────

/** run 的四个状态（原型口径：queued / running / done / failed）。 */
export type RunState = 'queued' | 'running' | 'done' | 'failed';

/**
 * 消息状态 → run 状态。
 *
 * 为什么不是各页自判：后端唯一的状态源是 `models/message.py:MSG_STATUSES`
 * （pending / processing / done / error）。这里一一映射，未知值按 done 兜底
 * （宁可显示已完成，也不把历史消息渲染成失败）。
 */
export function runStateOf(status?: string | null): RunState {
  switch ((status || '').toLowerCase()) {
    case 'pending':
    case 'queued':
      return 'queued';
    case 'processing':
    case 'running':
      return 'running';
    case 'error':
    case 'failed':
      return 'failed';
    default:
      return 'done';
  }
}

export const RUN_STATE_LABEL: Record<RunState, string> = {
  queued: '等待上线',
  running: '运行中',
  done: '已完成',
  // 沿用旧实现的口径（原 ChatWindow 失败徽标文案就是「发送失败」），既有回归用例打的是这个字符串；
  // 失败原因单独一行给（后端 detail 原样透传），所以这里不需要再改写成「失败」。
  failed: '发送失败',
};

/** chip 的语义色类（ui.css 只有 ok/bad/warn/info 四档）。 */
export const RUN_STATE_TONE: Record<RunState, string> = {
  queued: 'warn',
  running: 'info',
  done: 'ok',
  failed: 'bad',
};

/**
 * run 标识：后端有 run_id 就用它，没有就用消息 id 承载。
 *
 * 「一条消息 = 一个 run」意味着消息 id 本身就是这次运行的唯一标识；
 * 但后端 messages 表没有独立 run_id 列，所以这里如实降级并在 UI 上标注口径（RUN_ID_NOTE）。
 */
export function runLabel(msg: Message): string {
  const raw = msg.run_id ? String(msg.run_id) : `msg-${msg.id}`;
  return raw;
}

export const RUN_ID_NOTE =
  'run 标识：一条消息就是一次运行，run 标识由消息 id 承载（后端 messages 表暂无独立 run_id 列，补齐后自动改用 run_id）。';

export const ONE_MESSAGE_ONE_RUN_NOTE =
  '一条消息 = 一个 run：你发一条它跑一次，没消息它不自己冒；消息行右侧就是这次运行的状态。';

// ── 1:1 完全私密 ──────────────────────────────────────────────────

export const PRIVACY_CHIP = '一对一 · 完全私密';

export const PRIVACY_NOTE =
  '会话完全私密：仅我与该 Agent。其他成员与管理员也看不到内容、会话不出现在任何列表（审计除外）。';

/** 右栏「会话信息 · 私密性」行（措辞与 PRIVACY_NOTE 有意不同，避免同一句话在一个页面出现两次）。 */
export const PRIVACY_ROW = '一对一 · 其他成员与管理员均不可见';

// ── 不自动建任务 ──────────────────────────────────────────────────

export const NO_AUTO_TASK_NOTE =
  '不自动建任务：聊天绝不因对话自动创建任务，也绝不把任务化（不建任务、也不回填任何任务）；' +
  '被明确要求时，Agent 会用「你的」工作区权限去查 / 动资源 —— 权限不因在聊天里而降格，也不越格，需人批的动作照旧挂审批。' +
  '要留痕请去看板手动建 / 挂靠。';

export const CONTEXT_NOTE =
  '挂项目只是给上下文：会话仍不因此绑任务、不因此自动建任务（要成为任务请去看板手动建）。';

/** 「＋ 挂 Project context」：后端没有 chat context 端点 → 只做选择器 + 显式未接入。 */
export const CONTEXT_UNWIRED_NOTE =
  '后端未接入：没有 chat context 端点，选中的项目不会进入本条消息的运行入料（项目描述 / 仓库都取不到）；' +
  '选择只留在本页，不落库、不改变任何会话归属。';

// ── 运行时离线 → queued 等待上线 ─────────────────────────────────

export const QUEUED_NOTE =
  '运行时离线 → 消息 queued 等待上线（不丢、不算失败、不占 run）；' +
  '与小队 / 自动化侧 runtime_offline「离线暂存不丢」同一口径，两页不各说一套话。';

/**
 * 队列缺口（如实标注）：chat_service 目前是同步调用，没有排队转 queued 的实现。
 * 不写这句就会让人以为「离线发出去的消息真的在排队」，实际会立刻打到 provider。
 */
export const QUEUED_GAP_NOTE =
  '缺口：后端 chat_service 仍是同步直调，「离线转 queued 并自动补发」尚未实现 —— 这里只呈现排队口径与状态位，不假装消息已在队列里。';

export const QUEUED_WAIT_TEXT = '等待上线';

// ── 归档 = 只读 / Agent 不可运行 ─────────────────────────────────

export const ARCHIVED_READONLY_REASON =
  '会话已归档 = 只读：历史随便读，不能发新消息（取消归档后恢复发送）。';

/**
 * 「Agent 不可运行」的判定口径。
 *
 * 为什么和团队侧共用一份：`services/team_service.py` 用
 * `agent.status in ("archived", "disabled")` 拦队长/成员指派；聊天这里如果自造
 * 「只看 archived」，同一个 Agent 会在两页得到两种结论。
 */
export const NOT_RUNNABLE_STATUSES = ['archived', 'disabled'] as const;

export function isAgentRunnable(agent?: AgentLite | null): boolean {
  if (!agent) return false;
  return !NOT_RUNNABLE_STATUSES.includes(
    (agent.status || '') as (typeof NOT_RUNNABLE_STATUSES)[number],
  );
}

export function agentNotRunnableReason(agent?: AgentLite | null): string {
  const status = agent?.status || 'unknown';
  return (
    `Agent 已归档或失去可运行权限（status=${status}）→ 不能发新消息；` +
    '历史与已产出的回复仍可读（与小队侧「已归档 Agent 不可指派」同一判定）'
  );
}

/**
 * 发送门禁的唯一判定：返回 null 表示可发，返回字符串表示原因。
 * 归档（会话级）优先于 Agent 级——用户看到的第一个原因应该是「这个会话不能发」。
 */
export function composeBlockReason(opts: {
  archived?: boolean;
  agent?: AgentLite | null;
}): string | null {
  if (opts.archived) return ARCHIVED_READONLY_REASON;
  if (!opts.agent) return null;
  if (!isAgentRunnable(opts.agent)) return agentNotRunnableReason(opts.agent);
  return null;
}

// ── 运行时可达性 ──────────────────────────────────────────────────

export interface Reachability {
  state: 'online' | 'offline' | 'unregistered';
  label: string;
  detail: string;
}

/**
 * Agent 的运行时是否在线。
 *
 * 口径：`GET /api/runtimes` 是「机器 × CLI」注册表（services/runtime_registry），
 * 只有 CLI 运行时（dsh / hermes / codex…）会被上报；langgraph 这类进程内 provider
 * 不在注册表里 → 判 unregistered，**不当成离线**（否则会把进程内直连误报成离线排队）。
 */
export function runtimeReachability(
  agentRuntime: string | undefined | null,
  runtimes: RuntimeLite[],
): Reachability {
  const cli = (agentRuntime || '').trim();
  if (!cli) {
    return { state: 'unregistered', label: '运行时未登记', detail: 'Agent 没有 runtime 字段，无法判定线上状态。' };
  }
  const hits = runtimes.filter((r) => (r.cli || '').trim() === cli);
  if (hits.length === 0) {
    return {
      state: 'unregistered',
      label: `运行时 ${cli} · 未登记`,
      detail: `运行时注册表里没有 ${cli}：进程内 provider 无需上线，或本机尚未上报该 CLI。此状态下不展示「离线等待上线」。`,
    };
  }
  if (hits.some((r) => r.status === 'online')) {
    const online = hits.find((r) => r.status === 'online')!;
    return {
      state: 'online',
      label: `运行时 ${cli} · 在线`,
      detail: `已连上 ${online.machine_name || '本机'}，消息直接发送（不排队）。`,
    };
  }
  return {
    state: 'offline',
    label: `运行时 ${cli} · 离线`,
    detail: QUEUED_NOTE,
  };
}

// ── 会话列表分组 ──────────────────────────────────────────────────

export interface ConversationGroup {
  key: 'running' | 'queued' | 'today' | 'earlier' | 'archived';
  title: string;
  items: Conversation[];
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * 列表分组：运行中 / queued 等待上线 / 今天 / 更早 / 已归档。
 *
 * 原型还有「置顶」，但会话表没有 pinned 列（只有 title/updated_at），
 * 造假一个「置顶」入口就会变成存不进去的假按钮 → 这里不摆置顶组，缺口写进报告。
 */
export function groupConversations(convs: Conversation[], now: Date = new Date()): ConversationGroup[] {
  const running: Conversation[] = [];
  const queued: Conversation[] = [];
  const today: Conversation[] = [];
  const earlier: Conversation[] = [];
  const archived: Conversation[] = [];
  const todayKey = dayKey(now);

  for (const c of convs) {
    if (c.archived_at) { archived.push(c); continue; }
    const state = runStateOf(c.last_message?.status);
    if (state === 'running') { running.push(c); continue; }
    if (state === 'queued') { queued.push(c); continue; }
    const stamp = c.updated_at || c.created_at;
    const d = stamp ? new Date(stamp) : null;
    if (d && !Number.isNaN(d.getTime()) && dayKey(d) === todayKey) today.push(c);
    else earlier.push(c);
  }

  return [
    { key: 'running' as const, title: '运行中', items: running },
    { key: 'queued' as const, title: '排队等待上线', items: queued },
    { key: 'today' as const, title: '今天', items: today },
    { key: 'earlier' as const, title: '更早', items: earlier },
    { key: 'archived' as const, title: '已归档', items: archived },
  ].filter((g) => g.items.length > 0);
}

// ── 会话规则（门禁）口径 ──────────────────────────────────────────

export interface RuleLine {
  key: string;
  text: string;
}

/** 右栏「会话规则（门禁）」六条：与原型第五条「唤起口径」/ 权限轴同文。 */
export const CHAT_RULES: RuleLine[] = [
  { key: 'archive', text: '归档 = 只读：历史随便读，不能发新消息；删除才不可恢复（并停未完成 run），优先选归档。' },
  { key: 'agent', text: 'Agent 归档或失去可运行权限（status=archived / disabled）→ 不能发新消息，读历史仍可用。' },
  { key: 'offline', text: '运行时离线 → 消息等待上线（queued，不丢、不算失败、不占 run），与小队侧 runtime_offline 暂存同一口径。' },
  { key: 'stop', text: '停止 → 已返回的内容保留在会话里；未处理的输入尽量回到编辑器（编辑器已被改过就不覆盖，改为留一条可复制的提示）。' },
  { key: 'invoke', text: '唤起口径：对话 = 每条消息触发一次运行 —— 你发一条它跑一次，没消息它不自己冒（入口只有你发消息这一个动作）。' },
  { key: 'perm', text: '权限轴：聊天里的读写用「你的」工作区权限，不借 Agent 身份提权；需人批的动作照旧挂审批。' },
];
