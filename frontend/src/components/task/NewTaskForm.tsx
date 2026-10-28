/**
 * 新建任务表单（原型变体 `board__task-new`）
 *
 * 要落的口径：
 * - **必填 / 可空**逐字段标明：标题 = 必填；其余可空（负责人空 = 未指派）；
 * - **负责人三轨**：人 / Agent / 小队，选小队时写明「给 leader 入队，成员不抢单」；
 * - **创建 ≠ 派单**：保存只写 work_item 行（状态 = 未开始 unstarted / 受理 = 待受理 untriaged），
 *   要跑 Agent 需另外产生运行请求（受理门 + 四道门）；停在「未开始」= 停车闸，闸内不入队；
 * - v25 R25-8（原型 board__task-new:19-23）：创建成功且负责人 = Agent/小队 → **紧接弹
 *   「即将开跑谁」确认层**（复用 `AssignConfirm`，确认层只做一份、本页不复制第二套弹层）；
 *   新任务必停 backlog = 停车闸内，「开始」灰置、只登记；
 * - 校验失败与后端拒绝都显示 detail（写操作失败透传）。
 */
import { useState } from 'react';

import AssigneePicker, { AssignConfirm, type AssigneeKind } from './AssigneePicker';

export default function NewTaskForm({
  onCreate,
  onAssign,
  onCancel,
}: {
  onCreate: (payload: {
    title: string; priority?: number;
    assignee_kind?: AssigneeKind; assignee_id?: string;
  }) => Promise<{ ok: boolean; error?: string; data?: any }>;
  /** 确认层「开始」用（新建流里被停车闸灰置；签名沿卡片 assign）。 */
  onAssign?: (taskId: number, kind: AssigneeKind, assigneeId: string, start: boolean) =>
    Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(50);
  const [kind, setKind] = useState<AssigneeKind>('member');
  const [assigneeId, setAssigneeId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // v25 R25-8：创建成功 → 待确认开跑的任务 id（Agent/小队轨才有；人轨不弹）
  const [confirmTaskId, setConfirmTaskId] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setNote(null);
    if (!title.trim()) {
      setErr('标题不能为空（必填）');
      return;
    }
    setBusy(true);
    const payload: {
      title: string; priority?: number;
      assignee_kind?: AssigneeKind; assignee_id?: string;
    } = { title: title.trim(), priority };
    if (assigneeId.trim()) {
      payload.assignee_kind = kind;
      payload.assignee_id = assigneeId.trim();
    }
    const out = await onCreate(payload);
    setBusy(false);
    if (!out.ok) {
      setErr(out.error || '创建失败');
      return;
    }
    const createdId = (out.data?.task?.id ?? out.data?.id) as number | undefined;
    setTitle(''); setPriority(50);
    if (assigneeId.trim() && kind !== 'member' && createdId) {
      // 负责人 = Agent/小队：保留选择器状态给确认层用，弹「即将开跑谁」
      setConfirmTaskId(createdId);
      setNote(`已创建任务 #${createdId}，负责人=${kind}:${assigneeId.trim()} → 紧接确认「开跑谁」`);
    } else {
      setAssigneeId('');
      setNote('已创建（负责人只登记，不产生 run）。');
    }
  };

  const closeConfirm = () => { setConfirmTaskId(null); setAssigneeId(''); };

  return (
    <section className="panel" aria-label="新建任务">
      <p className="section-title">新建任务 · POST /api/tasks</p>
      <p className="page-note" style={{ marginBottom: 8 }}>
        创建 ≠ 派单：保存只写 work_item 行（状态 = 未开始 unstarted · 受理 = 待受理 untriaged）；
        要跑 Agent 需另外产生运行请求，且要过受理门与四道门。停在「未开始」= 停车闸，闸内不入队。
      </p>

      <div className="toolbar">
        <label htmlFor="new-task-title" className="chip mono">标题 · 必填</label>
        <input
          id="new-task-title"
          aria-label="任务标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="任务标题（必填）"
          style={{ flex: '1 1 220px', fontSize: 13, padding: '5px 8px' }}
        />
        <span className="chip" title="优先级只影响派单池排序与通知，不授予任何行为">
          优先级 · 可空（默认 50，不授予行为）
        </span>
        <input
          aria-label="优先级"
          type="number"
          min={0}
          max={100}
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          style={{ fontSize: 12, padding: '5px 8px', width: 72 }}
        />
      </div>

      <AssigneePicker
        kind={kind}
        assigneeId={assigneeId}
        onKindChange={setKind}
        onIdChange={setAssigneeId}
      />

      <p className="page-note">
        负责人可空（空 = 未指派）。创建后若负责人 = Agent / 小队，弹「即将开跑谁」确认层——
        本项停在停车闸内，「开始」灰置、只登记（深链复用 board.html#md-assign-confirm，不复制第二套弹层）。
        复核人 / 证据要求（done 需证据 + 同伴复核）后端未接入字段，本页只作提示。
      </p>

      <div className="toolbar" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={submit}>
          创建
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          取消
        </button>
        <span className="grow" />
        <span className="chip mono">状态 未开始 / 受理 待受理（服务端写入）</span>
      </div>

      {confirmTaskId !== null && (
        <AssignConfirm
          parked
          busy={busy}
          note="（新建流：负责人已随创建落库，这里只回答「要不要现在起跑」。）"
          onStart={() => {
            // 停车闸内「开始」恒灰置不可达；留接线防复用场景静默
            if (onAssign) void onAssign(confirmTaskId, kind, assigneeId.trim(), true);
          }}
          onRegister={() => { setNote('负责人已登记 · 不建 run（移出停车态时会再问一次）'); closeConfirm(); }}
          onCancel={closeConfirm}
        />
      )}

      {note && <div role="status" style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12 }}>{note}</div>}
      {err && (
        <div role="alert" style={{ marginTop: 8, color: 'var(--red)', fontSize: 12 }}>{err}</div>
      )}
    </section>
  );
}
