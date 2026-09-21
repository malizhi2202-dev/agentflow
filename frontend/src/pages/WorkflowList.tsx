import { useEffect, useState } from 'react';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { useWorkflows } from '../stores/workflows';
import { useTools } from '../stores/tools';
import ConfirmDialog from '../components/ConfirmDialog';

interface Props { onSelect?: (id: number) => void; onCreate?: () => void; }

export default function WorkflowList({ onSelect, onCreate }: Props) {
  const { workflows, fetchWorkflows, createWorkflow, deleteWorkflow, publishWorkflow, executeWorkflow, loading } = useWorkflows();
  const { tools, fetchTools } = useTools();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => { fetchWorkflows(); fetchTools(); }, []);

  const handleCreate = async () => {
    await createWorkflow({ name: form.name, description: form.description, definition_mode: 'visual', spec_json: { nodes: [], edges: [] }, token_soft_limit: 800000, token_hard_limit: 1000000 });
    setShowCreate(false);
    setForm({ name: '', description: '' });
  };

  const statusColor = (s: string) => s === 'published' ? 'var(--color-success)' : s === 'running' ? 'var(--color-warning)' : s === 'draft' ? 'var(--color-text-dim)' : 'var(--color-text-dim)';
  const statusLabel = (s: string) => ({ draft: '草稿', published: '已发布', running: '运行中', completed: '已完成', failed: '失败', stopped: '已停止' } as Record<string, string>)[s] || s;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>工作流</h1>
        <button onClick={function() { if (onCreate) onCreate(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          <Plus size={14} /> 创建工作流
        </button>
      </div>
      {loading ? <p style={{ color: 'var(--color-text-dim)' }}>加载中...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {workflows.map((wf) => (
            <div key={wf.id} onClick={function() { if (onSelect) onSelect(wf.id); }} style={{ background: 'var(--surface, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)', cursor: onSelect ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GitBranch size={18} color="var(--color-primary)" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{wf.name}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: statusColor(wf.status), color: '#fff' }}>{statusLabel(wf.status)}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {wf.status === 'draft' && <button onClick={function(e) { e.stopPropagation(); publishWorkflow(wf.id); }} style={{ padding: '4px 8px', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>发布</button>}
                  {wf.status === 'published' && <span style={{ fontSize: 10, color: 'var(--text-dim)', padding: '2px 6px', background: 'var(--bg-input)', borderRadius: 3 }}>点击进入详情</span>}
                  {wf.status !== 'running' && <button onClick={function(e) { e.stopPropagation(); setDeleteId(wf.id); }} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="删除"><Trash2 size={14} /></button>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{wf.description || '暂无描述'}</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}>
                <span>节点: {(wf.spec_json?.nodes || []).length}</span>
                <span>模式: {wf.definition_mode === 'visual' ? '可视化' : '文本'}</span>
                <span>token: {wf.token_hard_limit?.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {workflows.length === 0 && <p style={{ color: 'var(--color-text-dim)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>暂无工作流，点击「新建工作流」开始</p>}
        </div>
      )}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--color-elevated)', borderRadius: 8, padding: 24, width: 420 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 0 }}>新建工作流</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>名称</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} placeholder="我的工作流" /></div>
              <div><label style={lbl}>描述</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="工作流用途描述" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={b2}>取消</button>
              <button onClick={handleCreate} disabled={!form.name} style={{ ...b1, opacity: form.name ? 1 : 0.5 }}>创建</button>
            </div>
          </div>
        </div>
      )}
      {deleteId && <ConfirmDialog open={true} title="确认删除" message="确定删除此工作流？运行中的工作流不可删除。" onConfirm={async () => { await deleteWorkflow(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
const b1: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const b2: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
