import { useEffect, useState } from 'react';
import { Plus, Play, Square, Trash2, FolderKanban, Upload, FileText, Bot, Workflow, Check } from 'lucide-react';
import { useProjects } from '../stores/projects';
import { useAgents } from '../stores/agents';
import { useWorkflows } from '../stores/workflows';
import ConfirmDialog from '../components/ConfirmDialog';

interface Props { onSelect?: (id: number) => void; }

export default function ProjectManager({ onSelect }: Props) {
  const { projects, fetchProjects, createProject, deleteProject, executeProject, stopProject, loading } = useProjects();
  const { agents, fetchAgents } = useAgents();
  const { workflows, fetchWorkflows } = useWorkflows();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [orchInstances, setOrchInstances] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', requirement_raw: '', requirement_type: 'text', agent_id: 0, orchestration_id: 0 });

  useEffect(() => {
    fetchProjects(); fetchAgents(); fetchWorkflows();
    fetch('/api/orchestration', { headers: { 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' } })
      .then(r => r.json()).then(d => setOrchInstances(Array.isArray(d) ? d : (d.instances || []))).catch(() => {});
  }, []);

  const handleCreate = async () => {
    const agent = agents.find(a => a.id === form.agent_id);
    await createProject({
      ...form,
      workflow_id: agent?.workflow_ids?.[0] || agent?.workflow_id || 0,
      orchestration_id: form.orchestration_id || undefined,
    });
    setShowCreate(false);
    setForm({ name: '', requirement_raw: '', requirement_type: 'text', agent_id: 0, orchestration_id: 0 });
  };

  // 获取 Agent 绑定的工作流
  const getAgentWorkflows = (agent: any) => {
    const ids: number[] = agent.workflow_ids || (agent.workflow_id ? [agent.workflow_id] : []);
    return ids.map((id: number) => workflows.find(w => w.id === id)).filter(Boolean);
  };

  const statusColor = (s: string) => s === 'pending' ? 'var(--color-warning)' : s === 'running' ? 'var(--color-primary)' : s === 'completed' ? 'var(--color-success)' : s === 'error' ? 'var(--color-danger)' : 'var(--color-text-dim)';
  const statusLabel = (s: string) => ({ pending: '待开始', running: '执行中', completed: '已完成', error: '错误', stopped: '已停止', cancelled: '已取消' } as Record<string, string>)[s] || s;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>项目管理</h1>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          <Plus size={14} /> 创建项目
        </button>
      </div>
      {loading ? <p style={{ color: 'var(--color-text-dim)' }}>加载中...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
          {projects.map((p) => (
            <div key={p.id} onClick={() => onSelect?.(p.id)} style={{ background: 'var(--color-surface)', borderRadius: 8, padding: 16, border: '1px solid var(--color-border)', cursor: onSelect ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FolderKanban size={18} color="var(--color-primary)" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{p.name}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: statusColor(p.status), color: '#fff' }}>{statusLabel(p.status)}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  {p.status === 'pending' && <button onClick={() => executeProject(p.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)' }} title="执行"><Play size={14} /></button>}
                  {p.status === 'running' && <button onClick={() => stopProject(p.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="停止"><Square size={14} /></button>}
                  {p.status !== 'running' && <button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="删除"><Trash2 size={14} /></button>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8, maxHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <FileText size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                {p.parsed_summary || p.requirement_raw?.slice(0, 150) || '暂无需求描述'}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}>
                <span>Agent: {agents.find(a => a.id === p.agent_id)?.name || '未绑定'}</span>
                <span>创建: {p.created_at?.slice(0, 10)}</span>
              </div>
            </div>
          ))}
          {projects.length === 0 && <p style={{ color: 'var(--color-text-dim)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>暂无项目，点击「创建项目」开始</p>}
        </div>
      )}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--color-elevated)', borderRadius: 8, padding: 24, width: 520, maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 0 }}>📁 创建项目</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>项目名称</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} placeholder="我的项目" /></div>
              <div><label style={lbl}>需求描述</label><textarea value={form.requirement_raw} onChange={(e) => setForm({ ...form, requirement_raw: e.target.value })} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder="一句话需求 / API 文档 URL / Markdown 需求文档..." /></div>

              {/* Agent 卡片选择 */}
              <div>
                <label style={lbl}>🤖 选择 Agent（工作流自动关联）</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflow: 'auto' }}>
                  {agents.filter(a => a.status === 'standby').map(a => {
                    const wfs = getAgentWorkflows(a);
                    const selected = form.agent_id === a.id;
                    return (
                      <div
                        key={a.id}
                        onClick={() => setForm({ ...form, agent_id: a.id })}
                        style={{
                          padding: '10px 12px',
                          background: selected ? 'rgba(59,130,246,0.1)' : 'var(--bg-input)',
                          border: selected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                      >
                        <div style={{ marginTop: 2, color: selected ? 'var(--color-primary)' : 'var(--text-dim)' }}>
                          {selected ? <Check size={16} /> : <Bot size={16} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{a.name}</div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: 2 }}>
                            {a.model_name} · {a.runtime} · token: {(a.token_hard_limit || 0).toLocaleString()}
                          </div>
                          {wfs.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {wfs.map((wf: any) => (
                                <span key={wf.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 8px', borderRadius: 3, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--color-border)' }}>
                                  <Workflow size={10} /> {wf.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {wfs.length === 0 && (
                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>⚠️ 未绑定工作流</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {agents.filter(a => a.status === 'standby').length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: 12, textAlign: 'center' }}>暂无可用的 Agent，请先创建 Agent</div>
                  )}
                </div>
              </div>

              {/* 编排组选择 */}
              {orchInstances.length > 0 && (
                <div>
                  <label style={lbl}>🔀 绑定编排组（可选）</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {orchInstances.map((oi: any) => {
                      const selected = form.orchestration_id === oi.id;
                      return (
                        <div key={oi.id} onClick={() => setForm({ ...form, orchestration_id: selected ? 0 : oi.id })}
                          style={{
                            padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                            background: selected ? 'rgba(168,85,247,0.1)' : 'var(--bg-input)',
                            border: selected ? '1px solid #a855f7' : '1px solid var(--color-border)',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                          {selected ? <Check size={14} color="#a855f7" /> : <span style={{ fontSize: 14 }}>🔀</span>}
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{oi.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
                              {(oi.agent_ids || []).length} Agent · {oi.status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', background: 'var(--color-bg)', borderRadius: 4 }}>
                <Upload size={14} color="var(--color-text-secondary)" />
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>老旧项目接入？创建后可在项目详情上传 Git 仓库 URL</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={btn2}>取消</button>
              <button onClick={handleCreate} disabled={!form.name} style={{ ...btn1, opacity: form.name ? 1 : 0.5 }}>创建项目</button>
            </div>
          </div>
        </div>
      )}
      {deleteId && <ConfirmDialog open={true} title="确认删除" message="确定删除此项目？执行中的项目不可删除。" onConfirm={async () => { await deleteProject(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
const btn1: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btn2: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
