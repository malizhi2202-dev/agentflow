/**
 * 附 · 定时任务（不占 16 分区里的锚点）
 *
 * 为什么不塞进 16 分区：原型 `agent-detail__config.html` 的 sec1…sec16 里没有「定时任务」，
 * 它是 Agent 详情原有的真实能力（`/api/agents/{id}/scheduled-tasks` CRUD）。删掉等于功能退化，
 * 硬编号又会破坏「16 个分区 / 16 条直达链接」的口径 —— 所以保留为页尾一节、不编号、不进锚点条，
 * 并在这里写明原因（见 `.specs/ui-parity/P3-agent-config.md`）。
 */
import { useEffect, useState } from 'react';
import { Plus, X, Clock } from 'lucide-react';
import { Section } from './Section';
import { F } from './fields';

export function ScheduledTasksSection({ agentId, isNew }: { agentId?: number; isNew: boolean }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: '', cron_expr: '0 9 * * *', capability: '', enabled: true });
  const [error, setError] = useState<string | null>(null);

  useEffect(function () {
    if (!agentId) return;
    fetch('/api/agents/' + agentId + '/scheduled-tasks')
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d)) setTasks(d); })
      .catch(function (e) { setError('定时任务读取失败：' + ((e && e.message) || String(e))); });
  }, [agentId]);

  function saveTask() {
    if (!agentId) return;
    const url = '/api/agents/' + agentId + '/scheduled-tasks';
    const method = form.id ? 'PUT' : 'POST';
    const apiUrl = form.id ? url + '/' + form.id : url;
    fetch(apiUrl, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok || d.task) {
          const t = d.task || form;
          if (form.id) setTasks(tasks.map(function (st: any) { return st.id === t.id ? t : st; }));
          else setTasks([t].concat(tasks));
          setShowForm(false);
          setForm({ name: '', cron_expr: '0 9 * * *', capability: '', enabled: true });
        } else {
          setError(d.detail || '定时任务保存失败');
        }
      })
      .catch(function (e) { setError('定时任务保存失败：' + ((e && e.message) || String(e))); });
  }

  function deleteTask(id: number) {
    if (!agentId) return;
    fetch('/api/agents/' + agentId + '/scheduled-tasks/' + id, { method: 'DELETE' })
      .then(function () { setTasks(tasks.filter(function (t: any) { return t.id !== id; })); });
  }

  function toggleTask(id: number, enabled: boolean) {
    if (!agentId) return;
    fetch('/api/agents/' + agentId + '/scheduled-tasks/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: enabled }),
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok || d.task) {
        setTasks(tasks.map(function (t: any) {
          return t.id === id ? (d.task || Object.assign({}, t, { enabled: enabled })) : t;
        }));
      }
    });
  }

  return (
    <Section
      id="sec-scheduled" no={0} title="定时任务（附 · 不计入 16 分区）"
      note="cron 触发的 capability 派发；启用/禁用是即时请求，不进「保存全部」。"
      extra={<span className="chip mono">{tasks.length + ' 条'}</span>}
    >
      {error ? <p role="alert" style={F.err}>{error}</p> : null}
      {isNew ? <p style={F.hint}>Agent 保存后才能加定时任务。</p> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map(function (t: any) {
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <span className={t.enabled ? 'chip ok' : 'chip'}>{t.enabled ? '启用' : '禁用'}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{t.name || t.capability}</span>
              <code style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 3 }}>{t.cron_expr}</code>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.capability}</span>
              {t.last_run ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>上次: {new Date(t.last_run).toLocaleString('zh-CN')}</span> : null}
              <button type="button" className="btn btn-ghost btn-sm" aria-label={'切换 ' + (t.name || t.id)}
                onClick={function () { toggleTask(t.id, !t.enabled); }}>{t.enabled ? '禁用' : '启用'}</button>
              <button type="button" className="btn btn-ghost btn-sm" aria-label={'编辑定时任务 ' + (t.name || t.id)}
                onClick={function () { setForm(t); setShowForm(true); }}>✏️</button>
              <button type="button" className="btn btn-ghost btn-sm" aria-label={'删除定时任务 ' + (t.name || t.id)}
                onClick={function () { deleteTask(t.id); }} style={{ color: 'var(--red)' }}><X size={12} /></button>
            </div>
          );
        })}
        {!showForm && !isNew ? (
          <div>
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={function () { setShowForm(true); setForm({ name: '', cron_expr: '0 9 * * *', capability: '', enabled: true }); }}>
              <Plus size={12} /> 添加定时任务
            </button>
          </div>
        ) : null}
      </div>

      {showForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, marginTop: 8, background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={F.grid2}>
            <div>
              <label style={F.label} htmlFor="task-name">任务名称</label>
              <input id="task-name" value={form.name} placeholder="例如：每日代码审查"
                onChange={function (e) { setForm(Object.assign({}, form, { name: e.target.value })); }} style={F.full} />
            </div>
            <div>
              <label style={F.label} htmlFor="task-cap">能力 (capability)</label>
              <input id="task-cap" value={form.capability} placeholder="例如：code_review"
                onChange={function (e) { setForm(Object.assign({}, form, { capability: e.target.value })); }} style={F.full} />
            </div>
          </div>
          <div style={F.grid2}>
            <div>
              <label style={F.label} htmlFor="task-cron">Cron 表达式</label>
              <input id="task-cron" value={form.cron_expr} placeholder="分 时 日 月 周，例如：0 9 * * 1"
                onChange={function (e) { setForm(Object.assign({}, form, { cron_expr: e.target.value })); }} style={F.full} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={!!form.enabled}
                  onChange={function (e) { setForm(Object.assign({}, form, { enabled: e.target.checked })); }} />
                启用
              </label>
            </div>
          </div>
          <div className="toolbar">
            <button type="button" className="btn btn-primary btn-sm" onClick={saveTask}>保存</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={function () { setShowForm(false); }}>取消</button>
          </div>
        </div>
      ) : null}
      {tasks.length === 0 && !showForm ? (
        <p style={F.hint}><Clock size={11} style={{ verticalAlign: -1 }} /> 暂无定时任务。</p>
      ) : null}
    </Section>
  );
}
