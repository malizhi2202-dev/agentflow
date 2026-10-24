import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, Clock, Plus, RefreshCw } from 'lucide-react';
import {
  useCollab, COLUMNS, NEXT_STATUS, STATUS_LABEL, type Task, type TaskStatus,
} from '../stores/collab';

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  padding: '8px 10px',
  marginBottom: 8,
  fontSize: 12.5,
};

const chipStyle: React.CSSProperties = {
  display: 'inline-block', padding: '1px 6px', borderRadius: 10,
  fontSize: 10.5, border: '1px solid var(--border)', color: 'var(--text-secondary)',
  marginRight: 4,
};

function AssigneeChip({ task }: { task: Task }) {
  if (!task.assignee_kind || !task.assignee_id) {
    return <span style={{ ...chipStyle, color: 'var(--text-muted)' }}>未指派</span>;
  }
  const label = task.assignee_kind === 'member' ? '人' : task.assignee_kind === 'squad' ? '小队' : 'Agent';
  return <span style={chipStyle}>{label} · {task.assignee_id}</span>;
}

function TaskCard({ task }: { task: Task }) {
  const moveStatus = useCollab((s) => s.moveStatus);
  const triage = useCollab((s) => s.triage);
  const assign = useCollab((s) => s.assign);
  const [err, setErr] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [kind, setKind] = useState<'member' | 'agent' | 'squad'>('member');
  const [assigneeId, setAssigneeId] = useState('');

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    const out = await fn();
    if (!out.ok) setErr(out.error || '操作失败');
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontWeight: 600, lineHeight: 1.35 }}>{task.title}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>P{task.priority}</span>
      </div>

      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ ...chipStyle, color: 'var(--blue)' }}>{STATUS_LABEL[task.status]}</span>
        <AssigneeChip task={task} />
        {task.is_leader_task && <span style={{ ...chipStyle, color: 'var(--orange)' }}>leader 任务</span>}
        {task.triage_state === 'needs_triage' && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ ...chipStyle, cursor: 'pointer', color: 'var(--orange)' }}
            onClick={() => run(() => triage(task.id))}
            title="标记为已分诊（triage 与 status 正交）"
          >
            待分诊
          </button>
        )}
        {task.evidence_warned && (
          <span style={{ ...chipStyle, color: 'var(--orange)' }} title="done 缺证据（建议层，不阻断）">
            缺证据
          </span>
        )}
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {NEXT_STATUS[task.status].map((next) => (
          <button
            key={next}
            className="btn btn-ghost btn-sm"
            onClick={() => run(() => moveStatus(task.id, next))}
            title={`把状态改为 ${STATUS_LABEL[next]}（合法性由后端判定）`}
          >
            → {STATUS_LABEL[next]}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setAssigning((v) => !v)}
          aria-expanded={assigning}
        >
          指派
        </button>
      </div>

      {assigning && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            aria-label="负责人类型"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            style={{ fontSize: 12, padding: '3px 6px' }}
          >
            <option value="member">人</option>
            <option value="agent">Agent</option>
            <option value="squad">小队</option>
          </select>
          <input
            aria-label="负责人 ID"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            placeholder="负责人 ID"
            style={{ fontSize: 12, padding: '3px 6px', width: 120 }}
          />
          <button
            className="btn btn-ghost btn-sm"
            disabled={!assigneeId.trim()}
            onClick={() => run(() => assign(task.id, kind, assigneeId.trim()))}
          >
            确定
          </button>
        </div>
      )}

      {err && (
        <div role="alert" style={{ marginTop: 6, color: 'var(--red)', fontSize: 11.5 }}>
          {err}
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const {
    tasks, tasksLoading, tasksError, fetchTasks, createTask,
  } = useCollab();
  const [mine, setMine] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'member' | 'agent' | 'squad'>('member');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState(50);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { fetchTasks({ mine }); }, [mine, fetchTasks]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    for (const task of tasks) {
      const col = COLUMNS.find((c) => c.statuses.includes(task.status));
      (map[col ? col.key : 'unstarted'] ||= []).push(task);
    }
    return map;
  }, [tasks]);

  const submit = async () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError('标题不能为空');
      return;
    }
    const payload: any = { title: title.trim(), priority };
    if (assigneeId.trim()) {
      payload.assignee_kind = kind;
      payload.assignee_id = assigneeId.trim();
    }
    const out = await createTask(payload);
    if (!out.ok) {
      setFormError(out.error || '创建失败');
      return;
    }
    setTitle(''); setAssigneeId(''); setPriority(50); setShowCreate(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <header className="toolbar" style={{ marginBottom: 12 }}>
        <span className="chip mono">共 {tasks.length} 条</span>
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          只看与我有关
        </label>
        <button className="btn btn-ghost btn-sm" onClick={() => fetchTasks({ mine })} disabled={tasksLoading}>
          <RefreshCw size={13} style={{ marginRight: 4 }} />刷新
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate((v) => !v)} aria-expanded={showCreate}>
          <Plus size={13} style={{ marginRight: 4 }} />新建任务
        </button>
      </header>

      {showCreate && (
        <section
          aria-label="新建任务"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 10, marginBottom: 12 }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              aria-label="任务标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="任务标题（必填）"
              style={{ flex: '1 1 220px', fontSize: 13, padding: '5px 8px' }}
            />
            <select aria-label="负责人类型" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} style={{ fontSize: 12, padding: '5px 6px' }}>
              <option value="member">人</option>
              <option value="agent">Agent</option>
              <option value="squad">小队</option>
            </select>
            <input
              aria-label="负责人 ID"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              placeholder="负责人 ID（空=未指派）"
              style={{ fontSize: 12, padding: '5px 8px', width: 160 }}
            />
            <input
              aria-label="优先级"
              type="number"
              min={0}
              max={100}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              style={{ fontSize: 12, padding: '5px 8px', width: 72 }}
            />
            <button className="btn btn-primary btn-sm" onClick={submit}>创建</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowCreate(false); setFormError(null); }}>取消</button>
          </div>
          {formError && <div role="alert" style={{ marginTop: 8, color: 'var(--red)', fontSize: 12 }}>{formError}</div>}
        </section>
      )}

      {tasksError && (
        <div role="alert" style={{ marginBottom: 10, color: 'var(--red)', fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}>
          <AlertCircle size={14} /> {tasksError}
        </div>
      )}

      {!tasksLoading && tasks.length === 0 && !tasksError && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>还没有任务。点「新建任务」开始。</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {COLUMNS.map((col) => (
          <section key={col.key} aria-label={col.label}>
            <h3 style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
              {col.key === 'done' ? <CheckCircle2 size={13} /> : col.key === 'started' ? <Clock size={13} /> : <Circle size={13} />}
              {col.label}
              <span style={{ color: 'var(--text-muted)' }}>({(grouped[col.key] || []).length})</span>
            </h3>
            {(grouped[col.key] || []).map((task) => <TaskCard key={task.id} task={task} />)}
          </section>
        ))}
      </div>
    </div>
  );
}
