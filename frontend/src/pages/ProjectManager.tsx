import { useEffect, useState } from 'react';
import { Plus, Play, Square, Trash2, FolderKanban, Upload, FileText, Bot, Workflow, Check, RefreshCw } from 'lucide-react';
import { useProjects } from '../stores/projects';
import { useAgents } from '../stores/agents';
import { useWorkflows } from '../stores/workflows';
import { safeFetch } from '../utils/requestDedup';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/ui/PageHeader';
import Toolbar from '../components/ui/Toolbar';

interface Props { onSelect?: (id: number) => void; }

const INITIAL_FORM = { name: '', requirement_raw: '', requirement_type: 'text', agent_id: 0, orchestration_id: 0 };

export default function ProjectManager({ onSelect }: Props) {
  const { projects, createProject, deleteProject, executeProject, stopProject, loading } = useProjects();
  const { agents, fetchAgents } = useAgents();
  const { workflows, fetchWorkflows } = useWorkflows();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [orchInstances, setOrchInstances] = useState<any[]>([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadProjects = async () => {
    useProjects.setState({ loading: true });
    setProjectError(null);
    const result = await safeFetch('/api/projects');
    if (result.ok) {
      useProjects.setState({ projects: (result.data?.projects || []) as any[], loading: false });
    } else {
      useProjects.setState({ loading: false });
      setProjectError('项目加载失败，请重试。');
    }
  };

  useEffect(() => {
    loadProjects();
    fetchAgents();
    fetchWorkflows();
    fetch('/api/orchestration')
      .then(async (r) => {
        if (!r.ok) throw new Error('orchestration');
        return r.json();
      })
      .then(d => setOrchInstances(Array.isArray(d) ? d : (d.instances || [])))
      .catch(() => setSupportError('编排组信息暂时不可用。'));
  }, []);

  const handleCreate = async () => {
    setCreateSubmitting(true);
    setCreateError(null);
    const agent = agents.find(a => a.id === form.agent_id);
    try {
      const created = await createProject({
        ...form,
        workflow_id: agent?.workflow_ids?.[0] || agent?.workflow_id || 0,
        orchestration_id: form.orchestration_id || undefined,
      });
      if (!created) {
        setCreateError('项目创建失败，请检查权限或稍后重试。');
        return;
      }
      setShowCreate(false);
      setForm(INITIAL_FORM);
      setNotice('项目已创建');
    } catch {
      setCreateError('项目创建失败，请稍后重试。');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const getAgentWorkflows = (agent: any) => {
    const ids: number[] = agent.workflow_ids || (agent.workflow_id ? [agent.workflow_id] : []);
    return ids.map((id: number) => workflows.find(w => w.id === id)).filter(Boolean);
  };

  const statusColor = (s: string) => s === 'pending' ? 'var(--color-warning)' : s === 'running' ? 'var(--color-primary)' : s === 'completed' ? 'var(--color-success)' : s === 'error' ? 'var(--color-danger)' : 'var(--color-text-dim)';
  const statusLabel = (s: string) => ({ pending: '待开始', running: '执行中', completed: '已完成', error: '错误', stopped: '已停止', cancelled: '已取消' } as Record<string, string>)[s] || s;

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <PageHeader
        title="项目"
        context="协作 · 项目工作区"
        summary={notice || `${projects.length} 个项目 · 项目状态与执行入口集中在此`}
        action={(
          <button className="btn btn-primary" onClick={() => { setCreateError(null); setShowCreate(true); }}>
            <Plus size={14} /> 创建项目
          </button>
        )}
      />

      <div style={{ padding: '0 28px 28px' }}>
        <Toolbar>
          <span className="page-note" role="status">{loading ? '正在加载项目…' : projectError ? '项目列表加载失败' : `共 ${projects.length} 个项目`}</span>
          <span className="grow" />
          <button className="btn btn-ghost" onClick={loadProjects} disabled={loading} aria-label="刷新项目列表">
            <RefreshCw size={14} /> 刷新
          </button>
        </Toolbar>

        {projectError && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', color: 'var(--color-danger)' }}>
            <span>{projectError}</span>
            <button className="btn btn-ghost" onClick={loadProjects}>重试</button>
          </div>
        )}

        <main aria-label="项目主工作区" style={{ marginTop: 20 }}>
          {loading ? (
            <p className="page-note" role="status">正在加载项目…</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
              {projects.map((p) => (
                <article
                  key={p.id}
                  className={onSelect ? 'card card-clickable' : 'card'}
                  data-project-id={p.id}
                  tabIndex={onSelect ? 0 : -1}
                  onClick={() => onSelect?.(p.id)}
                  onKeyDown={(e) => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(p.id); } }}
                  aria-label={onSelect ? `打开项目 ${p.name}` : undefined}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <FolderKanban size={18} color="var(--color-primary)" aria-hidden="true" />
                      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: statusColor(p.status), color: 'var(--color-action-primary-fg)' }}>{statusLabel(p.status)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      {p.status === 'pending' && <button onClick={() => executeProject(p.id)} aria-label={`执行项目 ${p.name}`} title="执行"><Play size={14} /></button>}
                      {p.status === 'running' && <button onClick={() => stopProject(p.id)} aria-label={`停止项目 ${p.name}`} title="停止"><Square size={14} /></button>}
                      {p.status !== 'running' && <button onClick={() => setDeleteId(p.id)} aria-label={`删除项目 ${p.name}`} title="删除"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8, maxHeight: 42, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <FileText size={12} style={{ marginRight: 4, verticalAlign: -2 }} aria-hidden="true" />
                    {p.parsed_summary || p.requirement_raw?.slice(0, 150) || '暂无需求描述'}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)' }}>
                    <span>Agent: {agents.find(a => a.id === p.agent_id)?.name || '未绑定'}</span>
                    <span>创建: {p.created_at?.slice(0, 10)}</span>
                  </div>
                </article>
              ))}
              {projects.length === 0 && !projectError && (
                <div className="panel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>
                  <p style={{ marginBottom: 12 }}>暂无项目</p>
                  <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> 创建第一个项目</button>
                </div>
              )}
            </div>
          )}
        </main>

        <aside aria-label="项目辅助信息" className="panel" style={{ marginTop: 20 }}>
          <strong style={{ fontSize: 13 }}>辅助信息</strong>
          <p className="page-note" style={{ marginTop: 6 }}>项目详情中可查看需求、绑定 Agent、编排组和执行监控。</p>
          {supportError && <p role="alert" className="page-note" style={{ color: 'var(--color-danger)', marginTop: 6 }}>{supportError}</p>}
        </aside>
      </div>

      {showCreate && (
        <div role="presentation" style={{ position: 'fixed', inset: 0, background: 'color-mix(in oklch, var(--color-text-primary) 55%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="create-project-title" style={{ background: 'var(--color-elevated)', borderRadius: 8, padding: 24, width: 520, maxHeight: '85vh', overflow: 'auto' }}>
            <h2 id="create-project-title" style={{ fontSize: 20, marginTop: 0 }}>创建项目</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label htmlFor="project-name" style={lbl}>项目名称</label><input id="project-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} placeholder="我的项目" /></div>
              <div><label htmlFor="project-requirement" style={lbl}>需求描述</label><textarea id="project-requirement" value={form.requirement_raw} onChange={(e) => setForm({ ...form, requirement_raw: e.target.value })} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder="一句话需求 / API 文档 URL / Markdown 需求文档..." /></div>

              <div>
                <label style={lbl}>选择 Agent（工作流自动关联）</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflow: 'auto' }}>
                  {agents.filter(a => a.status === 'standby').map(a => {
                    const wfs = getAgentWorkflows(a);
                    const selected = form.agent_id === a.id;
                    return (
                      <button key={a.id} type="button" onClick={() => setForm({ ...form, agent_id: a.id })} aria-pressed={selected} style={{ padding: '10px 12px', background: selected ? 'var(--color-brand-soft)' : 'var(--color-surface)', border: selected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}>
                        <div style={{ marginTop: 2, color: selected ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>{selected ? <Check size={16} /> : <Bot size={16} />}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{a.name}</div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>{a.model_name} · {a.runtime} · token: {(a.token_hard_limit || 0).toLocaleString()}</div>
                          {wfs.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>{wfs.map((wf: any) => <span key={wf.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 8px', borderRadius: 3, background: 'var(--color-surface-muted)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}><Workflow size={10} /> {wf.name}</span>)}</div>}
                          {wfs.length === 0 && <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>未绑定工作流</div>}
                        </div>
                      </button>
                    );
                  })}
                  {agents.filter(a => a.status === 'standby').length === 0 && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: 12, textAlign: 'center' }}>暂无可用的 Agent，请先创建 Agent</div>}
                </div>
              </div>

              {orchInstances.length > 0 && (
                <div>
                  <label style={lbl}>绑定编排组（可选）</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {orchInstances.map((oi: any) => {
                      const selected = form.orchestration_id === oi.id;
                      return <button key={oi.id} type="button" onClick={() => setForm({ ...form, orchestration_id: selected ? 0 : oi.id })} aria-pressed={selected} style={{ padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: selected ? 'var(--color-brand-soft)' : 'var(--color-surface)', border: selected ? '1px solid var(--color-brand)' : '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left' }}><Check size={14} style={{ opacity: selected ? 1 : 0 }} /><div><div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{oi.name}</div><div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{(oi.agent_ids || []).length} Agent · {oi.status}</div></div></button>;
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--color-surface-muted)', borderRadius: 4 }}><Upload size={14} color="var(--color-text-secondary)" /><span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>老旧项目接入？创建后可在项目详情上传 Git 仓库 URL</span></div>
              {createError && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: 12 }}>{createError}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)} disabled={createSubmitting}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!form.name || createSubmitting}>{createSubmitting ? '创建中…' : '创建项目'}</button>
            </div>
          </div>
        </div>
      )}
      {deleteId && <ConfirmDialog open={true} title="确认删除" message="确定删除此项目？执行中的项目不可删除。" onConfirm={async () => { await deleteProject(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
