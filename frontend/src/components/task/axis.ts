/**
 * 任务看板两轴口径（原型 6.20 / board.html 顶注）
 *
 * - `status`（四类生命周期：未开始 / 进行中 / 完成 / 关闭）答「到哪一步」；
 * - `triage_state`（待受理 / 已受理）答「这算不算活」——**与状态正交**，改状态不动受理态；
 * - 状态标签**不授予行为**：进「进行中」≠ 自动启动 Agent；启动只能由显式运行请求或触发规则产生。
 *
 * 判定永远在后端（`collab_service.TRANSITIONS`），这里只做文案与展示分组。
 */
import type { Task, TaskStatus } from '../../stores/collab';

/** 四类生命周期（status_category）的中文名——列头之外的第二处展示，别只靠颜色。 */
export const LIFECYCLE_LABEL: Record<Task['status_category'], string> = {
  unstarted: '未开始',
  started: '进行中',
  done: '完成',
  closed: '关闭',
};

/** 受理轴（triage_state）的中文名：待受理 = 这活还没被认领。 */
export const TRIAGE_LABEL: Record<Task['triage_state'], string> = {
  needs_triage: '待受理',
  triaged: '已受理',
};

/** 负责人三轨（member / agent / squad）的中文名。 */
export const ASSIGNEE_KIND_LABEL: Record<'member' | 'agent' | 'squad', string> = {
  member: '人',
  agent: 'Agent',
  squad: '小队',
};

/** 小队指派语义（原型 v14 扩三轨的原话）：给 leader 入队，成员不抢单。 */
export const SQUAD_ASSIGN_NOTE =
  '指派小队 = 平台给 leader 入队一条 leader 任务，成员不抢单（成员由 leader 在评论流点名委派）';

/**
 * 受理门口径（原型同构实证）：只拦「自动推导执行者」的运行，不拦人点名派发。
 *
 * 后端当前**没有**派生执行入口（work_item 的唯一创建路径是 POST /api/tasks），
 * 所以这道门本身未接入——界面如实标注，不造一个假的拦截。
 */
export const TRIAGE_GATE_NOTE =
  '受理门：只拦「自动推导执行者」的运行，不拦人点名派发（@点名直通）。'
  + '后端当前未接入该门（无派生执行入口）——本页按「未接入」如实标注。';

/** 状态标签与行为解耦的两条硬规矩（原型 §1.5.2 差距⑤）。 */
export const STATUS_BEHAVIOR_NOTE =
  '状态标签不授予行为：进「进行中」≠ 自动启动 Agent——启动只能由显式运行请求或触发规则产生；'
  + '改状态不停已在跑的 run（打断=显式「停止运行」）。';

/** done 的「需证据 + 同伴复核」是**建议层**：缺证据仍可完成，但要亮警告。 */
export const EVIDENCE_ADVISORY = '补证据 + 请同伴复核';

/** 证据条目：正常是 `{label, ref}`；老数据里可能有裸字符串，展示时一并兼容。 */
type EvidenceEntry = { label?: string; ref?: string } | string;

/** 证据是否「真的附上了」（label / ref 至少一项非空，空壳不算）。 */
export function hasEvidence(task: Task): boolean {
  const entries = (task.evidence || []) as EvidenceEntry[];
  return entries.some((e) => {
    if (typeof e === 'string') return e.trim().length > 0;
    return Boolean((e?.label || '').trim() || (e?.ref || '').trim());
  });
}

/** 缺证据标记：done 且没有任何有效证据（`evidence_warned` 是后端留痕，只作补充）。 */
export function isMissingEvidence(task: Task): boolean {
  return task.status === 'done' && (task.evidence_warned || !hasEvidence(task));
}

/** 证据 chip 的展示文案：优先 label，其次是 ref（两者都可能缺，兜底成「证据」）。 */
export function evidenceLabel(e: EvidenceEntry): string {
  if (typeof e === 'string') return e.trim() || '证据';
  const label = (e?.label || '').trim();
  const ref = (e?.ref || '').trim();
  if (label && ref) return `${label} · ${ref}`;
  return label || ref || '证据';
}

/** 该状态下「状态标签」的说明（列头注 + 卡片 title 共用）。 */
export function statusNote(status: TaskStatus): string {
  switch (status) {
    case 'backlog': return '唯一停车态：停在 backlog 永不出队、不派生执行';
    case 'in_progress': return '本态内 run 失败按回收路径处理，升收件箱不静默吞';
    case 'in_review': return '进入评审即停自动化推进，done 留人';
    case 'blocked': return '失败/受阻挂 wait_reason，唤醒只由人解除';
    default: return '语义锚：只表达位置，不授予任何行为';
  }
}
