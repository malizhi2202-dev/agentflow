import { useEffect, useState } from 'react';
import { Link2, Plus, Trash2, GitBranch, Users, Shield } from 'lucide-react';

interface Binding { id: number; workflow_id: number; workflow_name: string; node_id: string; role_id: number; role_name: string; mode: string; }

export default function AssemblyView() {
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ workflow_id: 0, node_id: '', role_id: 0, mode: 'review' });
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const uid = () => localStorage.getItem('current_user_id') || 'admin';

  useEffect(() => {
    fetch('/api/assembly/list', { headers: { 'X-User-Id': uid() } }).then(r => r.json()).then(d => {
      setBindings(d.bindings || d.assemblies || []);
    }).catch(() => {
      setBindings([]);
    }).finally(() => setLoading(false));

    fetch('/api/workflows', { headers: { 'X-User-Id': uid() } }).then(r => r.json()).then(d => setWorkflows(d.workflows || [])).catch(() => {});
    fetch('/api/roles/custom', { headers: { 'X-User-Id': uid() } }).then(r => r.json()).then(d => setRoles(d.roles || [])).catch(() => {
      // 回退到内置角色
      setRoles([
        { id: 1, name: '架构师' }, { id: 2, name: '高级产品经理' }, { id: 3, name: '安全审计师' },
        { id: 4, name: '资深用户评测员' }, { id: 5, name: '领域专家' }, { id: 6, name: '资深测试工程师' },
      ]);
    });
  }, []);

  const handleBind = async () => {
    await fetch('/api/assembly/bind', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() }, body: JSON.stringify(form) });
    setShowCreate(false);
    setBindings([...bindings, { id: Date.now(), workflow_id: form.workflow_id, workflow_name: workflows.find(w => w.id === form.workflow_id)?.name || '', node_id: form.node_id, role_id: form.role_id, role_name: roles.find(r => r.id === form.role_id)?.name || '', mode: form.mode }]);
  };

  const handleUnbind = async (id: number) => {
    await fetch(`/api/assembly/unbind/${id}`, { method: 'DELETE', headers: { 'X-User-Id': uid() } });
    setBindings(bindings.filter(b => b.id !== id));
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text-weak)' }}>加载中...</div>;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Link2 size={22} color="var(--color-primary)" /> 角色×工作流 组装</h1>
        <button onClick={() => { setShowCreate(true); setForm({ workflow_id: 0, node_id: '', role_id: 0, mode: 'review' }); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          <Plus size={14} /> 新建绑定
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20 }}>将角色绑定到工作流的指定节点。节点执行时自动加载对应角色的审查 prompt。支持对抗模式（两个角色互相审核）。</p>

      {bindings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
          <Link2 size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>暂无绑定关系</p>
          <p style={{ fontSize: 11 }}>点击「新建绑定」将角色关联到工作流节点</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bindings.map(b => (
            <div key={b.id} style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 14, border: '1px solid var(--border-normal, #2a2d35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} color="var(--color-primary)" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{b.role_name}</span>
                </div>
                <span style={{ color: 'var(--text-dim)' }}>→</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GitBranch size={14} color="var(--text-secondary)" />
                  <span style={{ fontSize: 13 }}>{b.workflow_name || `工作流#${b.workflow_id}`}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>节点 {b.node_id}</span>
                </div>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: b.mode === 'adversarial' ? 'var(--red-bg)' : 'var(--blue-bg)', color: b.mode === 'adversarial' ? 'var(--red)' : 'var(--blue)' }}>
                  {b.mode === 'adversarial' ? <><Shield size={10} style={{ verticalAlign: -1 }} /> 对抗</> : '审核'}
                </span>
              </div>
              <button onClick={() => handleUnbind(b.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-elevated, #22242a)', borderRadius: 8, padding: 24, width: 440 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 0 }}>新建绑定</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>角色</label><select value={form.role_id} onChange={e => setForm({ ...form, role_id: +e.target.value })} style={inp}><option value={0}>-- 选择角色 --</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              <div><label style={lbl}>工作流</label><select value={form.workflow_id} onChange={e => setForm({ ...form, workflow_id: +e.target.value })} style={inp}><option value={0}>-- 选择工作流 --</option>{workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
              <div><label style={lbl}>节点 ID</label><input value={form.node_id} onChange={e => setForm({ ...form, node_id: e.target.value })} style={inp} placeholder="例: n1, review-node" /></div>
              <div><label style={lbl}>模式</label><select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })} style={inp}><option value="review">审核模式</option><option value="adversarial">对抗模式</option></select></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={btn2}>取消</button>
              <button onClick={handleBind} disabled={!form.role_id || !form.workflow_id || !form.node_id} style={{ ...btn1, opacity: form.role_id && form.workflow_id && form.node_id ? 1 : 0.5 }}>绑定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
const btn1: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btn2: React.CSSProperties = { padding: '8px 16px', background: 'var(--bg-card)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
