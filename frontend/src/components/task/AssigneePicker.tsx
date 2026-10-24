/**
 * 指派三轨选择器（原型 board.html「指派 ▾」pop = `pp-assignee` · v14 扩三轨）
 *
 * 三轨 = 人 / Agent / 小队（同一「负责人」列，三种轨）：
 * - 人轨：只登记负责人，**不产生 run**（人不产生 run）；
 * - Agent 轨：移交所有权；要跑需一次显式运行请求（指派 ≠ 开工）；
 * - 小队轨：平台给 **leader 入队一条 leader 任务**，成员不抢单（成员由 leader 在评论流点名委派）。
 *
 * 受控组件：选择状态由调用方持有（新建表单要随创建一次性落库，卡片指派要单独打端点）。
 * 失败文案不在本组件内消化——`onSubmit` 把后端 detail 交回调用方，由调用方一处 display。
 */
import { ASSIGNEE_KIND_LABEL, SQUAD_ASSIGN_NOTE } from './axis';

export type AssigneeKind = 'member' | 'agent' | 'squad';

const KIND_HINT: Record<AssigneeKind, string> = {
  member: '人轨：只登记负责人，不产生 run（人不产生 run）',
  agent: 'Agent 轨：移交所有权；要跑需显式运行请求（指派 ≠ 开工）',
  squad: '小队轨：给 leader 入队 leader 任务，成员不抢单',
};

const KIND_NOTE: Record<AssigneeKind, string> = {
  member: '人轨：只登记负责人，不产生 run。',
  agent: 'Agent 轨：这里只移交所有权；要它真开跑需一次「显式运行请求」（指派 ≠ 开工）。',
  squad: SQUAD_ASSIGN_NOTE,
};

export default function AssigneePicker({
  kind,
  assigneeId,
  onKindChange,
  onIdChange,
  onSubmit,
  submitLabel = '确定指派',
  busy = false,
  onCancel,
}: {
  kind: AssigneeKind;
  assigneeId: string;
  onKindChange: (kind: AssigneeKind) => void;
  onIdChange: (assigneeId: string) => void;
  /** 给了才渲染提交按钮（新建表单只借这个选择器登记负责人，不在这里打端点）。 */
  onSubmit?: () => void;
  submitLabel?: string;
  busy?: boolean;
  onCancel?: () => void;
}) {
  return (
    <div
      className="panel"
      style={{ marginTop: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}
      aria-label="指派负责人"
    >
      <div className="toolbar">
        <span className="section-title" style={{ margin: 0 }}>指派（三轨）</span>
        {(Object.keys(ASSIGNEE_KIND_LABEL) as AssigneeKind[]).map((k) => (
          <button
            key={k}
            type="button"
            className={`chip${kind === k ? ' info' : ''}`}
            style={{ cursor: 'pointer' }}
            aria-pressed={kind === k}
            onClick={() => onKindChange(k)}
            title={KIND_HINT[k]}
          >
            {ASSIGNEE_KIND_LABEL[k]}
          </button>
        ))}
        <input
          aria-label="负责人 ID"
          value={assigneeId}
          onChange={(e) => onIdChange(e.target.value)}
          placeholder={kind === 'squad' ? '小队 slug（例 code-review）' : '负责人 ID'}
          style={{ fontSize: 12, padding: '3px 6px', width: 160 }}
        />
        {onSubmit && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy || !assigneeId.trim()}
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            取消
          </button>
        )}
      </div>
      <p className="page-note">{KIND_NOTE[kind]}</p>
    </div>
  );
}
