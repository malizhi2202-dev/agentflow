/**
 * 自动化中心（v21 T-05）——原型 `automations.html` 的形态基线
 *
 * 一张表：定时任务（Agent · cron · capability · 启停 · 上次运行）。
 * 交互：启停切换 / 删除 / 新建（必须挂到某个 Agent 名下，任务不独立存在）。
 */
import { useEffect, useState } from 'react';
import { AlertCircle, Clock, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAutomations } from '../stores/automations';
import { useAgents } from '../stores/agents';

const panel: React.CSSProperties = {
  background: 'var(--bg-panel)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', padding: 10, marginBottom: 10,
};
const inputStyle: React.CSSProperties = {
  padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 12,
};
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2, display: 'block' };

export default function Automations() {
  const { items, error, loading, fetchAll, toggle, remove, create } = useAutomations();
  const { agents, fetchAgents } = useAgents();
  const [showCreate, setShowCreate] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [name, setName] = useState('');
  const [cron, setCron] = useState('');
  const [capability, setCapability] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { fetchAll(); fetchAgents(); }, [fetchAll, fetchAgents]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setActionError(null);
    const out = await fn();
    if (!out.ok) setActionError(out.error || '操作失败');
  };

  const submit = async () => {
    setActionError(null);
    if (!agentId) return setActionError('请选择 Agent');
    if (!cron.trim()) return setActionError('cron 表达式不能为空');
    if (!capability.trim()) return setActionError('capability 不能为空');
    await run(async () => {
      const out = await create(Number(agentId), { name: name.trim(), cron_expr: cron.trim(), capability: capability.trim() });
      if (out.ok) { setName(''); setCron(''); setCapability(''); setShowCreate(false); }
      return out;
    });
  };

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>自动化中心</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
          共 {items.length} 条 · 启用 {items.filter((i) => i.enabled).length}
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => fetchAll()} title="刷新">
          <RefreshCw size={13} /> 刷新
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate((v) => !v)} aria-expanded={showCreate}>
          <Plus size={13} /> 新建定时任务
        </button>
      </header>

      {showCreate && (
        <section aria-label="新建定时任务" style={panel}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            <div>
              <label style={labelStyle} htmlFor="auto-agent">Agent</label>
              <select id="auto-agent" aria-label="Agent" style={{ ...inputStyle, width: '100%' }}
                      value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">选择 Agent</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="auto-name">名称</label>
              <input id="auto-name" aria-label="定时任务名称" style={{ ...inputStyle, width: '100%' }}
                     value={name} onChange={(e) => setName(e.target.value)} placeholder="每日巡检" />
            </div>
            <div>
              <label style={labelStyle} htmlFor="auto-cron">cron（分 时 日 月 周）</label>
              <input id="auto-cron" aria-label="cron 表达式" style={{ ...inputStyle, width: '100%' }}
                     value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 9 * * 1" />
            </div>
            <div>
              <label style={labelStyle} htmlFor="auto-cap">capability</label>
              <input id="auto-cap" aria-label="capability" style={{ ...inputStyle, width: '100%' }}
                     value={capability} onChange={(e) => setCapability(e.target.value)} placeholder="daily-report" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={submit}>创建</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>取消</button>
          </div>
        </section>
      )}

      {(actionError || error) && (
        <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
          <AlertCircle size={14} /> {actionError || error}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
          还没有定时任务。点「新建定时任务」把某个 Agent 的能力挂上 cron。
        </p>
      )}

      {items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>
              <th style={{ padding: '4px 6px' }}>名称 / capability</th>
              <th style={{ padding: '4px 6px' }}>Agent</th>
              <th style={{ padding: '4px 6px' }}>cron</th>
              <th style={{ padding: '4px 6px' }}>状态</th>
              <th style={{ padding: '4px 6px' }}>上次运行</th>
              <th style={{ padding: '4px 6px', textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '6px' }}>
                  <div style={{ fontWeight: 600 }}>{it.name || '（未命名）'}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)' }}>{it.capability}</div>
                </td>
                <td style={{ padding: '6px' }}>{it.agent_name || `#${it.agent_id}`}</td>
                <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{it.cron_expr}</td>
                <td style={{ padding: '6px' }}>
                  <span style={{ color: it.enabled ? 'var(--green)' : 'var(--text-muted)' }}>
                    {it.enabled ? '启用' : '已暂停'}
                  </span>
                </td>
                <td style={{ padding: '6px', color: 'var(--text-muted)', fontSize: 11 }}>
                  {it.last_run ? new Date(it.last_run).toLocaleString() : '从未运行'}
                </td>
                <td style={{ padding: '6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => run(() => toggle(it.id))}
                          title={it.enabled ? '暂停' : '启用'}>
                    {it.enabled ? <Clock size={12} /> : <Play size={12} />} {it.enabled ? '暂停' : '启用'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => run(() => remove(it.id))} title="删除">
                    <Trash2 size={12} /> 删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
