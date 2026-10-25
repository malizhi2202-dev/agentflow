/**
 * 指派三轨选择器（原型 board.html「指派 ▾」pop = `pp-assignee` · v14 扩三轨）
 *
 * 三轨 = 人 / Agent / 小队（同一「负责人」列，三种轨）：
 * - 人轨：只登记负责人，**不产生 run**（人不产生 run）；**不弹确认层**；
 * - Agent 轨：移交所有权；要真开跑走确认层「开始」（v25 R25-8：指派 ≠ 开工）；
 * - 小队轨：平台给 **leader 入队一条 leader 任务**，成员不抢单。
 *
 * v25 R25-8（原型 board.html#md-assign-confirm 硬口径）：选 Agent/小队后提交**不直接开跑**——
 * 弹「指派确认」层，两个决定：
 * - 「开始」= 显式运行请求（onSubmit(true) → 后端 `assign?start=true` 当场建 run 回时间线）；
 * - 「先不开工」= 只登记负责人（onSubmit(false)，行为与旧版一致）；
 * - 「取消」= 收回确认层，什么都不提交。
 * 终态不豁免（done/closed 也弹）；无权/不可用目标在选轨处已置灰给拒因，本层不做二次兜底；
 * 停车闸（backlog/未开始）由调用方传 `parked`，此时「开始」灰置、只留「先不开工」。
 *
 * 受控组件：选择状态由调用方持有。失败文案不在本组件内消化——`onSubmit` 把后端 detail
 * 交回调用方一处 display。确认层本体只做这一份（`board__task-new` 深链复用 AssignConfirm，
 * 不复制第二套弹层）。
 */
import { useState } from 'react';
import { ASSIGNEE_KIND_LABEL, SQUAD_ASSIGN_NOTE } from './axis';

export type AssigneeKind = 'member' | 'agent' | 'squad';

const KIND_HINT: Record<AssigneeKind, string> = {
  member: '人轨：只登记负责人，不产生 run（人不产生 run）',
  agent: 'Agent 轨：移交所有权；要跑走确认层「开始」（指派 ≠ 开工）',
  squad: '小队轨：给 leader 入队 leader 任务，成员不抢单',
};

const KIND_NOTE: Record<AssigneeKind, string> = {
  member: '人轨：只登记负责人，不产生 run，也不弹确认层。',
  agent: 'Agent 轨：这里只移交所有权；要它真开跑走「指派确认」层的『开始』（指派 ≠ 开工）。',
  squad: SQUAD_ASSIGN_NOTE,
};

/** 确认层（原型 #md-assign-confirm）：只做一份，卡片与新建流共用。 */
export function AssignConfirm({ parked = false, busy = false, onStart, onRegister, onCancel,
  note }: {
  parked?: boolean; busy?: boolean;
  onStart: () => void; onRegister: () => void; onCancel: () => void;
  note?: string;
}) {
  return (
    <div className="panel" aria-label="指派确认"
         style={{ marginTop: 6, padding: '8px 10px', border: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 600, fontSize: 12.5 }}>指派确认 · 这次真的开跑谁？</div>
      <p className="page-note" style={{ margin: '4px 0' }}>
        两个决定：「开始」= 当场建 run；「先不开工」= 只登记负责人。本层不改状态、不改优先级——它只回答「要不要现在起跑」。
        {parked && <b> 任务停在停车闸内（backlog/未开始）：「开始」灰置、只留「先不开工」；移出停车态时还会再问一次。</b>}
        {note && <span> {note}</span>}
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={parked || busy}
                title={parked ? '停车闸内不入队：先出闸，或选「先不开工」' : '当场建 run（这一次就是「显式运行请求」）'}
                onClick={onStart}>
          开始
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onRegister}>
          先不开工
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}

export default function AssigneePicker({
  kind,
  assigneeId,
  onKindChange,
  onIdChange,
  onSubmit,
  submitLabel = '确定指派',
  busy = false,
  onCancel,
  parked = false,
}: {
  kind: AssigneeKind;
  assigneeId: string;
  onKindChange: (kind: AssigneeKind) => void;
  onIdChange: (assigneeId: string) => void;
  /** 给了才渲染提交按钮；`start=true` = 确认层「开始」，`false` = 「先不开工」/人轨登记。 */
  onSubmit?: (start: boolean) => void;
  submitLabel?: string;
  busy?: boolean;
  onCancel?: () => void;
  /** 任务停在停车闸（backlog/未开始）：确认层里「开始」灰置。 */
  parked?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  const activate = () => {
    if (!onSubmit) return;
    if (kind === 'member') { onSubmit(false); return; } // 人轨不弹确认、不产生 run
    setConfirming(true);
  };

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
            onClick={() => { setConfirming(false); onKindChange(k); }}
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
            onClick={activate}
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
      {confirming && onSubmit && kind !== 'member' && (
        <AssignConfirm
          parked={parked}
          busy={busy}
          onStart={() => { setConfirming(false); onSubmit(true); }}
          onRegister={() => { setConfirming(false); onSubmit(false); }}
          onCancel={() => setConfirming(false)}
        />
      )}
      <p className="page-note">{KIND_NOTE[kind]}</p>
    </div>
  );
}
