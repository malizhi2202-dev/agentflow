/**
 * 看板卡片（原型 board.html 列内卡片）
 *
 * 每条卡片上按**两根轴分开**显示，不许混成一个标签：
 * - 状态（到哪一步）：四类生命周期之一，`status_category` 直属；
 * - 受理（这算不算活）：`triage_state`（待受理 / 已受理）。
 *
 * 行为纪律：
 * - 状态标签不授予行为——`→ 进行中` 只是挪位置，不会启动任何 Agent；
 * - `→ 完成` 走「附证据」表单（变体 board__mark-done）：证据可空，空了后端回警告文案，
 *   界面记成「可疑完成」并给「补证据 + 请同伴复核」提示——**不硬拦**；
 * - 写操作失败一律把后端 detail 原样显示，不改写、不吞。
 */
import { useState } from 'react';

import { NEXT_STATUS, STATUS_LABEL, useCollab, type Task } from '../../stores/collab';
import AssigneePicker, { type AssigneeKind } from './AssigneePicker';
import MarkDoneForm from './MarkDoneForm';
import {
  ASSIGNEE_KIND_LABEL, EVIDENCE_ADVISORY, LIFECYCLE_LABEL, TRIAGE_LABEL, evidenceLabel,
  hasEvidence, isMissingEvidence, statusNote,
} from './axis';

function AssigneeChip({ task }: { task: Task }) {
  if (!task.assignee_kind || !task.assignee_id) {
    return <span className="chip" title="负责人可空；未指派不等于不受理">未指派</span>;
  }
  return (
    <span className="chip" title={`负责人轨：${ASSIGNEE_KIND_LABEL[task.assignee_kind]}`}>
      {ASSIGNEE_KIND_LABEL[task.assignee_kind]} · {task.assignee_id}
    </span>
  );
}

export default function TaskCard({ task }: { task: Task }) {
  const moveStatus = useCollab((s) => s.moveStatus);
  const triage = useCollab((s) => s.triage);
  const assign = useCollab((s) => s.assign);

  const [err, setErr] = useState<string | null>(null);
  /** 后端回来的「缺证据完成」警告文案（警告式，不是拒绝） */
  const [warn, setWarn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [kind, setKind] = useState<AssigneeKind>('member');
  const [assigneeId, setAssigneeId] = useState('');
  const [doneOpen, setDoneOpen] = useState(false);

  const missingEvidence = isMissingEvidence(task);
  const evidenceChips = task.evidence || [];

  const move = async (next: Task['status']) => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    const out = await moveStatus(task.id, next);
    setBusy(false);
    if (!out.ok) {
      setErr(out.error || '操作失败');
      return;
    }
    const warning = (out.data?.evidence_warning as string | null) || null;
    setWarn(warning);
  };

  const submitDone = async (evidence?: { label: string; ref: string }[]) => {
    setErr(null);
    setWarn(null);
    setBusy(true);
    const out = await moveStatus(task.id, 'done', evidence);
    setBusy(false);
    if (!out.ok) return { ok: false, error: out.error };
    const warning = (out.data?.evidence_warning as string | null) || null;
    setDoneOpen(false);
    setWarn(warning);
    return { ok: true, warning };
  };

  // v25 R25-8：确认层两个决定——start=true「开始」（当场建 run）/ false「先不开工」只登记
  const submitAssign = async (start = false) => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    const out = await assign(task.id, kind, assigneeId.trim(), start);
    setBusy(false);
    if (!out.ok) {
      setErr(out.error || (start ? '指派已入账，开跑被拒' : '指派失败'));
      return;
    }
    setAssigning(false);
  };

  return (
    <article className="panel" style={{ marginBottom: 8, padding: '8px 10px' }} aria-label={`任务 ${task.title}`} aria-busy={busy}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontWeight: 600, lineHeight: 1.35 }}>{task.title}</span>
        <span className="chip mono" style={{ flexShrink: 0 }} title="优先级不授予任何行为">
          P{task.priority}
        </span>
      </div>

      <div className="toolbar" style={{ marginTop: 6 }}>
        <span
          className="chip info"
          title={`状态（到哪一步）· 生命周期：${LIFECYCLE_LABEL[task.status_category]} · ${statusNote(task.status)}`}
        >
          状态 · {STATUS_LABEL[task.status]}
          <span className="mono" style={{ marginLeft: 4 }}>({task.status_category})</span>
        </span>
        <span
          className={`chip ${task.triage_state === 'triaged' ? 'ok' : 'warn'}`}
          title="受理（这算不算活）：与状态正交，改状态不动这一轴"
        >
          受理 · {TRIAGE_LABEL[task.triage_state]}
        </span>
        <AssigneeChip task={task} />
        {task.is_leader_task && (
          <span className="chip warn" title="小队指派产生的 leader 任务：只给 leader 入队，成员不抢单">
            leader 任务
          </span>
        )}
        {task.triage_state === 'needs_triage' && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ cursor: 'pointer' }}
              disabled={busy}
              onClick={async () => {
                if (busy) return;
                setErr(null);
                setBusy(true);
                const out = await triage(task.id);
                setBusy(false);
                if (!out.ok) setErr(out.error || '操作失败');
              }}
            title="标记为已分诊（triage 与 status 正交）"
          >
            待分诊
          </button>
        )}
      </div>

      {task.status === 'done' && (
        <div className="toolbar" style={{ marginTop: 6 }}>
          {evidenceChips.length > 0 && evidenceChips.map((e, i) => (
            <span key={i} className="chip ok" title="done 证据（label · ref）">
              证据 · {evidenceLabel(e)}
            </span>
          ))}
          {missingEvidence && (
            <>
              <span className="chip warn" title="done 缺证据：建议层，不阻断——补证据 + 请同伴复核">
                缺证据
              </span>
              <span className="page-note">可疑完成：{EVIDENCE_ADVISORY}</span>
            </>
          )}
        </div>
      )}

      {warn && (
        <div role="alert" className="chip warn" style={{ marginTop: 6, height: 'auto' }}>
          {warn} · {EVIDENCE_ADVISORY}
        </div>
      )}

      <div className="toolbar" style={{ marginTop: 8 }}>
        {NEXT_STATUS[task.status].map((next) => (
          next === 'done' ? (
            <button
              key={next}
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => setDoneOpen(true)}
              title="完成需证据（建议层）：空证据也能完成，但会记成可疑完成并给补证据提醒"
            >
              → 完成（需证据）
            </button>
          ) : (
            <button
              key={next}
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => move(next)}
              title={`把状态改为 ${STATUS_LABEL[next]}（合法性由后端判定；不会启动任何 Agent）`}
            >
              → {STATUS_LABEL[next]}
            </button>
          )
        ))}
          <button
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={() => setAssigning((v) => !v)}
          aria-expanded={assigning}
          title="指派（三轨）：人 / Agent / 小队——指派 ≠ 开工"
        >
          指派
        </button>
      </div>

      {assigning && (
        <AssigneePicker
          kind={kind}
          assigneeId={assigneeId}
          onKindChange={setKind}
          onIdChange={setAssigneeId}
          onSubmit={submitAssign}
          onCancel={() => setAssigning(false)}
          busy={busy}
          // 停车闸 = backlog/未开始（原型「backlog / 未开始 = 唯一停车闸」）：「开始」灰置
          parked={task.status === 'backlog' || task.status === 'todo'}
        />
      )}

      {doneOpen && (
        <MarkDoneForm
          taskTitle={task.title}
          onSubmit={submitDone}
          onCancel={() => setDoneOpen(false)}
        />
      )}

      {err && (
        <div role="alert" style={{ marginTop: 6, color: 'var(--red)', fontSize: 11.5 }}>
          {err}
        </div>
      )}
    </article>
  );
}
