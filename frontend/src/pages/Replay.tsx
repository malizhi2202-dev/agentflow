/**
 * 任务回放（v21 T-05）——原型 `replay*.html` 的形态基线
 *
 * 左侧任务列表（复用协作层 tasks），右侧是被选任务的**运行时间线**（`/api/tasks/{id}/runs`）。
 * 只读：回放不回滚、不重跑；重跑入口在任务卡/运行时页。
 */
import { useEffect } from 'react';
import { AlertCircle, History, RefreshCw } from 'lucide-react';
import { useCollab, STATUS_LABEL } from '../stores/collab';
import { useReplay } from '../stores/replay';

const panel: React.CSSProperties = {
  background: 'var(--bg-panel)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', padding: 10,
};

export default function Replay() {
  const { tasks, tasksError, fetchTasks } = useCollab();
  const { taskId, runs, error, loading, openTask } = useReplay();

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const current = tasks.find((t) => t.id === taskId) || null;

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>回放</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
          选一条任务看它的运行时间线（只读）
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => fetchTasks()} title="刷新任务">
          <RefreshCw size={13} /> 刷新
        </button>
      </header>

      {(tasksError || error) && (
        <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
          <AlertCircle size={14} /> {error || tasksError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: 12 }}>
        <section aria-label="任务列表" style={panel}>
          <h3 style={{ fontSize: 12.5, margin: '0 0 6px', color: 'var(--text-secondary)' }}>任务</h3>
          {tasks.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>还没有任务。</p>
          )}
          {tasks.map((t) => (
            <button key={t.id} onClick={() => openTask(t.id)}
                    aria-label={`回放任务 ${t.title}`}
                    aria-pressed={taskId === t.id}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                      background: taskId === t.id ? 'var(--bg-selected)' : 'transparent',
                      border: `1px solid ${taskId === t.id ? 'var(--blue-border)' : 'transparent'}`,
                      borderRadius: 'var(--r-sm)', padding: '6px 8px', marginBottom: 4,
                      color: 'var(--text)',
                    }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                #{t.id} · {STATUS_LABEL[t.status]}
              </div>
            </button>
          ))}
        </section>

        <section aria-label="运行时间线" style={panel}>
          {!current && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>选左边一条任务，查看它的运行记录。</p>
          )}
          {current && (
            <>
              <h3 style={{ fontSize: 13, margin: '0 0 2px' }}>{current.title}</h3>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                任务 #{current.id} · {STATUS_LABEL[current.status]}
                {current.assignee_id ? ` · 负责人 ${current.assignee_kind}:${current.assignee_id}` : ''}
              </div>
              {loading && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>加载中…</p>}
              {!loading && runs.length === 0 && !error && (
                <p style={{ color: 'var(--text-muted)', fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <History size={13} /> 这条任务还没有运行记录。
                </p>
              )}
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {runs.map((r) => (
                  <li key={r.id} style={{ borderLeft: '2px solid var(--border)', padding: '4px 0 10px 10px', marginLeft: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      run #{r.id}{r.run_id ? ` · ${r.run_id}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {r.status || '—'}
                      {r.started_at ? ` · ${new Date(r.started_at).toLocaleString()}` : ''}
                      {r.finished_at ? ` → ${new Date(r.finished_at).toLocaleTimeString()}` : ''}
                    </div>
                    {r.summary && <div style={{ fontSize: 12, marginTop: 2 }}>{r.summary}</div>}
                    {r.error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 2 }}>{r.error}</div>}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
