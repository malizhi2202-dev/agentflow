import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Edit3, X } from 'lucide-react';
import { gateDisplay } from '../hooks/useFileNames';
import { useAuth } from '../stores/auth';

interface Role { id: string; name: string; emoji: string; gates: string[]; description: string; style: string; personality: string; }
const ALL_GATES = ['G1', '需求门', 'G2', 'G2a', 'Task', 'G3', '测试门', 'G4'];

export default function Roles() {
  const { isAdmin, rolePermissions } = useAuth();
  const canWrite = isAdmin || rolePermissions.includes('project:write');
  const canDelete = isAdmin || rolePermissions.includes('project:delete');
  const [roles, setRoles] = useState<Role[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Role>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRole, setNewRole] = useState<Partial<Role>>({ name: '', emoji: '⚪', gates: [], description: '', style: '', personality: '' });

  useEffect(() => { fetch('/api/roles').then(r => r.json()).then(d => setRoles(d.roles || [])).catch(() => {}); }, []);

  const startEdit = (r: Role) => { setEditing(r.id); setEditForm({ ...r }); };
  const cancelEdit = () => { setEditing(null); setEditForm({}); };
  const saveEdit = async (id: string) => {
    await fetch(`/api/roles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...editForm } : r)); setEditing(null);
  };
  const deleteRole = async (id: string) => {
    await fetch(`/api/roles/${id}`, { method: 'DELETE' }); setRoles(prev => prev.filter(r => r.id !== id));
  };
  const addRole = async () => {
    if (!newRole.name) return;
    const res = await fetch('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRole) });
    const data = await res.json();
    if (data.ok) { setRoles(prev => [...prev, data.role]); setShowAdd(false); setNewRole({ name: '', emoji: '⚪', gates: [], description: '', style: '', personality: '' }); }
  };
  const toggleGate = (gates: string[], gate: string) => gates.includes(gate) ? gates.filter(g => g !== gate) : [...gates, gate];

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, margin: 0 }}>角色管理</h1>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{roles.length} 个角色</span>
        </div>
        {canWrite && <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm"><Plus size={14} /> 新增角色</button>}
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid var(--blue)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input placeholder="角色ID (英文)" value={newRole.id || ''} onChange={e => setNewRole({ ...newRole, id: e.target.value })} />
            <input placeholder="角色名" value={newRole.name || ''} onChange={e => setNewRole({ ...newRole, name: e.target.value })} style={{ flex: 2 }} />
            <input placeholder="emoji" value={newRole.emoji || ''} onChange={e => setNewRole({ ...newRole, emoji: e.target.value })} style={{ width: 60 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 8 }}>所属门禁:</span>
            {ALL_GATES.map(g => (
              <button key={g} onClick={() => setNewRole({ ...newRole, gates: toggleGate(newRole.gates || [], g) })}
                className={`btn btn-xs ${(newRole.gates || []).includes(g) ? 'btn-primary' : ''}`} style={{ margin: 2 }}>{gateDisplay(g)}</button>
            ))}
          </div>
          <textarea placeholder="描述" value={newRole.description || ''} onChange={e => setNewRole({ ...newRole, description: e.target.value })}
            style={{ width: '100%', minHeight: 40, marginBottom: 8 }} />
          <textarea placeholder="性情/偏好" value={newRole.personality || ''} onChange={e => setNewRole({ ...newRole, personality: e.target.value })}
            style={{ width: '100%', minHeight: 40, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addRole} className="btn btn-primary btn-sm"><Save size={12} /> 保存</button>
            <button onClick={() => setShowAdd(false)} className="btn btn-sm">取消</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
        {roles.map(role => {
          const isEditing = editing === role.id;
          return (
            <div key={role.id} className="card" style={{ borderLeft: '3px solid var(--blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{role.emoji}</span>
                  {isEditing ? (
                    <input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, width: 160 }} />
                  ) : (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600 }}>{role.name}</span>
                  )}
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{role.id}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {isEditing ? (
                    <><button onClick={() => saveEdit(role.id)} className="btn btn-ghost btn-xs"><Save size={14} /></button>
                    <button onClick={cancelEdit} className="btn btn-ghost btn-xs"><X size={14} /></button></>
                  ) : (
                    <>{canWrite && <button onClick={() => startEdit(role)} className="btn btn-ghost btn-xs"><Edit3 size={14} /></button>}
                    {canDelete && <button onClick={() => deleteRole(role.id)} className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>}</>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {isEditing ? ALL_GATES.map(g => (
                  <button key={g} onClick={() => setEditForm({ ...editForm, gates: toggleGate(editForm.gates || [], g) })}
                    className={`btn btn-xs ${(editForm.gates || []).includes(g) ? 'btn-primary' : ''}`}>{gateDisplay(g)}</button>
                )) : (role.gates || []).map(g => <span key={g} className="badge badge-blue">{gateDisplay(g)}</span>)}
              </div>
              {isEditing ? (
                <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  style={{ width: '100%', minHeight: 32, fontSize: 12, marginBottom: 6 }} />
              ) : <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{role.description}</p>}
              <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--r-sm)', padding: '8px 10px', marginTop: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>🎭 性情</div>
                {isEditing ? (
                  <textarea value={editForm.personality || ''} onChange={e => setEditForm({ ...editForm, personality: e.target.value })}
                    style={{ width: '100%', minHeight: 50, fontSize: 12 }} />
                ) : <p style={{ fontSize: 12, color: 'var(--text)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>{role.personality}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {roles.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)' }}>暂无角色，点击「新增角色」创建</div>
      )}
    </div>
  );
}
