/**
 * 小队中心（原型 6.29 · 独立页）
 *
 * Team = 资源容器（谁的资产），Squad = 可指派编组（这次谁一起干）——两层不同实体。
 * 真实数据：`/api/squads`（列表/成员/归档/指派任务）。原型里 squads__code-review 的
 * 「12 节点协议时间线」需要运行事件后端（未接入），这里用 PlanningNotice 如实标注，不造假时间线。
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { useTeams, type Squad } from '../stores/teams';
import PlanningNotice from '../components/ui/PlanningNotice';
import { safeFetch } from '../utils/requestDedup';

export default function SquadsPage() {
  const { squads, squadsError, squadsLoading, fetchSquads, addSquadMember, removeSquadMember,
    archiveSquad, createSquad } = useTeams();
  const [selected, setSelected] = useState<string | null>(null);
  const [memberKind, setMemberKind] = useState<'agent' | 'member'>('agent');
  const [memberId, setMemberId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', leader_agent_id: '', instructions: '' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => { fetchSquads(); }, [fetchSquads]);
  useEffect(() => {
    safeFetch('/api/tasks').then((out) => { if (out.ok) setTasks(out.data?.tasks || []); });
  }, []);

  const current: Squad | undefined = squads.find((s) => s.slug === selected || String(s.id) === selected);
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setActionError(null);
    const out = await fn();
    if (!out.ok) setActionError(out.error || '操作失败');
  };

  const submitCreate = async () => {
    setActionError(null);
    if (!form.slug.trim() || !form.name.trim()) return setActionError('slug 与名称必填');
    if (!form.leader_agent_id.trim()) return setActionError('leader Agent ID 必填');
    await run(async () => {
      const out = await createSquad({
        slug: form.slug.trim(), name: form.name.trim(),
        leader_agent_id: Number(form.leader_agent_id), instructions: form.instructions,
      });
      if (out.ok) { setShowCreate(false); setForm({ slug: '', name: '', leader_agent_id: '', instructions: '' }); }
      return out;
    });
  };

  return (
    <div>
      <div className="panel">
        <div className="toolbar">
          <span className="section-title">小队（可指派编组）</span>
          <span className="chip mono">{squads.length} 支</span>
          <span className="grow" />
          <button className="btn btn-ghost btn-sm" onClick={fetchSquads} disabled={squadsLoading}>
            <RefreshCw size={13} /> 刷新
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate((v) => !v)} aria-expanded={showCreate}>
            <Plus size={13} /> 新建小队
          </button>
        </div>
        <p className="page-note">
          Team 是「谁的资产」的容器，Squad 是「这次谁一起干」的编组：1 个 leader Agent + 混编成员，
          **不拥有资产**、与 Team 无外键。指派任务 = 给 leader 入队一条 leader 任务（成员不抢单）。
        </p>
        {(squadsError || actionError) && (
          <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 6, display: 'flex', gap: 6 }}>
            <AlertCircle size={14} /> {actionError || squadsError}
          </div>
        )}
        {showCreate && (
          <div className="panel" style={{ marginTop: 8 }}>
            <div className="toolbar">
              <input aria-label="小队 slug" placeholder="slug" className="input" value={form.slug}
                     onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              <input aria-label="小队名称" placeholder="名称" className="input" value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input aria-label="leader Agent ID" placeholder="leader Agent ID" className="input" value={form.leader_agent_id}
                     onChange={(e) => setForm({ ...form, leader_agent_id: e.target.value })} />
              <input aria-label="小队指令" placeholder="instructions" className="input" value={form.instructions}
                     onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
              <button className="btn btn-primary btn-sm" onClick={submitCreate}>创建</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>取消</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: 12, marginTop: 8 }}>
        <div className="panel">
          <span className="section-title">小队列表</span>
          {squads.map((s) => (
            <button key={s.id} onClick={() => setSelected(s.slug)}
                    aria-label={`打开小队 ${s.name}`} aria-pressed={selected === s.slug}
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'block', width: '100%', textAlign: 'left', marginTop: 4,
                             background: selected === s.slug ? 'var(--bg-selected)' : 'transparent' }}>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div className="chip mono">{s.slug}</div>{' '}
              <span className="chip">{s.status}</span>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                leader #{s.leader_agent_id}{s.created_by ? ` · 创建者 ${s.created_by}` : ''}
              </div>
            </button>
          ))}
          {!squadsLoading && squads.length === 0 && !squadsError && (
            <p className="page-note">还没有小队。点「新建小队」把 leader 和成员编起来。</p>
          )}
        </div>

        <div className="panel">
          {!current && <p className="page-note">选左边一支小队，看成员、指令与指派。</p>}
          {current && (
            <>
              <div className="toolbar" style={{ marginBottom: 6 }}>
                <span className="section-title">{current.name}</span>
                <span className="chip mono">{current.slug}</span>
                <span className={`chip ${current.status === 'archived' ? 'warn' : 'ok'}`}>{current.status}</span>
                <span className="grow" />
                <button className="btn btn-ghost btn-sm" disabled={current.status === 'archived'}
                        onClick={() => run(() => archiveSquad(current.slug, '页面归档'))}>
                  <Trash2 size={12} /> 归档
                </button>
              </div>
              {current.instructions && <p className="page-note">{current.instructions}</p>}

              <span className="section-title">成员</span>
              <table className="tbl compact" aria-label="小队成员">
                <thead><tr><th>类型</th><th>ID</th><th style={{ textAlign: 'right' }}>操作</th></tr></thead>
                <tbody>
                  {(current.members || []).map((m) => (
                    <tr key={m.id}>
                      <td><Users size={11} style={{ marginRight: 4, verticalAlign: -1 }} />{m.member_kind}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{m.member_id}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" disabled={current.status === 'archived'}
                                onClick={() => run(() => removeSquadMember(current.slug, m.member_kind, m.member_id))}>
                          移除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(current.members || []).length === 0 && (
                    <tr><td colSpan={3} style={{ color: 'var(--text-muted)' }}>还没有成员。</td></tr>
                  )}
                </tbody>
              </table>
              <div className="toolbar" style={{ marginTop: 6 }}>
                <select aria-label="成员类型" value={memberKind} onChange={(e) => setMemberKind(e.target.value as any)}>
                  <option value="agent">agent</option>
                  <option value="member">member</option>
                </select>
                <input aria-label="成员 ID" placeholder="成员 ID" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
                <button className="btn btn-ghost btn-sm" disabled={!memberId.trim() || current.status === 'archived'}
                        onClick={() => run(() => addSquadMember(current.slug, memberKind, memberId.trim()))}>
                  加成员
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <span className="section-title">指派任务（给 leader 入队）</span>
                <div className="toolbar" style={{ marginTop: 4 }}>
                  <select aria-label="选择任务" value="" onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id) run(async () => {
                      const res = await fetch(`/api/squads/${current.slug}/assign`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_id: id }),
                      });
                      const data = await res.json().catch(() => ({}));
                      return res.ok ? { ok: true } : { ok: false, error: data?.detail || `指派失败 (${res.status})` };
                    });
                  }}>
                    <option value="">选一条任务…</option>
                    {tasks.map((t) => <option key={t.id} value={t.id}>#{t.id} {t.title}</option>)}
                  </select>
                  <span className="chip">成员不抢单：委派只在 leader 评论流里</span>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <PlanningNotice note="原型 squads__code-review 的「12 节点协议时间线」需要运行事件后端（未接入）；本页只呈现真实的成员/指令/指派。" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
