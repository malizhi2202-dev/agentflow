import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, X, Save, Shield, User, AlertTriangle } from 'lucide-react';
import { useAuth, UserInfo, authHeaders } from '../stores/auth';
import ConfirmDialog from '../components/ConfirmDialog';

interface Project { name: string; root: string; has_specs: boolean; is_current: boolean; }

// 全部可分配权限（admin 可对任意用户勾选/取消）
const ALL_PERMISSIONS = [
  { key: 'project:read', label: '查看项目', desc: '查看项目列表、变更、文档内容', icon: '👁️', dangerous: false },
  { key: 'project:write', label: '编辑项目', desc: '修改配置、文件、门禁、工作流', icon: '✏️', dangerous: false },
  { key: 'project:delete', label: '删除产物/角色', desc: '允许删除变更、产物文件和专家角色', icon: '🗑️', dangerous: true },
  { key: 'workflow:stop', label: '停止流程', desc: '允许中断正在执行的工作流', icon: '⏹️', dangerous: true },
  { key: 'user:manage', label: '管理用户', desc: '允许创建、编辑、删除其他用户', icon: '👥', dangerous: true },
  { key: 'audit:view', label: '查看审计日志', desc: '允许查看所有操作的审计记录', icon: '📋', dangerous: true },
];

export default function UserManagement() {
  const { userList, fetchUsers, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({
    id: '', name: '', role: 'user', password: '123456',
    project_ids: [] as string[],
    custom_permissions: [] as string[],
  });
  const [deleteTarget, setDeleteTarget] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetchUsers();
    fetch('/api/admin/projects', { headers: authHeaders() })
      .then(r => r.json()).then(d => setProjects(d.projects || []));
  }, []);

  const startEdit = (u: UserInfo) => {
    setEditing(u.id);
    setEditForm({
      name: u.name, role: u.role,
      project_ids: [...(u.project_ids || [])],
      custom_permissions: [...((u as any).custom_permissions || [])],
      active: u.active,
    });
  };
  const cancelEdit = () => { setEditing(null); setEditForm({}); };

  const saveEdit = async (id: string) => {
    const h = authHeaders();
    await fetch(`/api/auth/users/${id}`, { method: 'PUT', headers: h, body: JSON.stringify(editForm) });
    await fetchUsers();
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/auth/users/${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() });
    setDeleteTarget(null);
    await fetchUsers();
  };

  const addUser = async () => {
    if (!newUser.id || !newUser.name) return;
    const h = authHeaders();
    const res = await fetch('/api/auth/users', {
      method: 'POST', headers: h,
      body: JSON.stringify({ ...newUser, active: true }),
    });
    const data = await res.json();
    if (data.ok) {
      setShowAdd(false);
      setNewUser({ id: '', name: '', role: 'user', password: '123456', project_ids: [], custom_permissions: [] });
      await fetchUsers();
    } else {
      alert(data.detail || '创建失败');
    }
  };

  const toggleProject = (ids: string[], name: string) =>
    ids.includes(name) ? ids.filter(p => p !== name) : [...ids, name];

  const togglePerm = (perms: string[], key: string) =>
    perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key];

  if (!isAdmin) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>
        <Shield size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
        <p style={{ fontSize: 14 }}>需要管理员权限</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, margin: 0 }}>用户管理</h1>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {userList.length} 个用户
          </span>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">
          <Plus size={14} /> 新增用户
        </button>
      </div>

      {/* ── 新增用户表单 ── */}
      {showAdd && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid var(--blue)', padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>新增用户</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <input placeholder="用户ID (英文)" value={newUser.id}
              onChange={e => setNewUser({ ...newUser, id: e.target.value })} style={{ minWidth: 140 }} />
            <input placeholder="显示名称" value={newUser.name}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })} style={{ minWidth: 140, flex: 1 }} />
            <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ minWidth: 100 }}>
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
            <input type="password" placeholder="密码 (默认123456)" value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={{ minWidth: 140 }} />
          </div>

          {/* 项目分配 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>归属项目</div>
            {projects.map(p => (
              <button key={p.name}
                onClick={() => setNewUser({ ...newUser, project_ids: toggleProject(newUser.project_ids, p.name) })}
                className={`btn btn-xs ${newUser.project_ids.includes(p.name) ? 'btn-primary' : ''}`}
                style={{ margin: 2 }}>{p.name}</button>
            ))}
            {newUser.role === 'admin' && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>admin 默认可见全部项目</span>
            )}
          </div>

          {/* 权限分配（admin 豁免，其他角色显示全部权限勾选框） */}
          {newUser.role !== 'admin' && (
            <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
                权限分配（显式勾选，无默认权限）
              </div>
              {ALL_PERMISSIONS.map(perm => (
                <label key={perm.key} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0',
                  cursor: 'pointer', borderBottom: '1px solid var(--border)',
                }}>
                  <input type="checkbox"
                    checked={newUser.custom_permissions.includes(perm.key)}
                    onChange={() => setNewUser({
                      ...newUser,
                      custom_permissions: togglePerm(newUser.custom_permissions, perm.key),
                    })}
                    style={{ marginTop: 2, accentColor: perm.dangerous ? 'var(--red)' : 'var(--blue)' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      <span style={{ marginRight: 4 }}>{perm.icon}</span>
                      {perm.label}
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>
                        {perm.key}
                      </span>
                      {perm.dangerous && <span style={{ fontSize: 9, color: 'var(--red)', marginLeft: 6 }}>⚠ 危险</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{perm.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addUser} className="btn btn-primary btn-sm"><Save size={12} /> 创建用户</button>
            <button onClick={() => setShowAdd(false)} className="btn btn-sm">取消</button>
          </div>
        </div>
      )}

      {/* ── 用户列表 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
        {userList.map(u => {
          const isEditing = editing === u.id;
          const customPerms = (u as any).custom_permissions || [];
          return (
            <div key={u.id} className="card" style={{
              borderLeft: `3px solid ${u.role === 'admin' ? 'var(--blue)' : 'var(--green)'}`,
              opacity: u.active ? 1 : 0.6,
            }}>
              {/* 头部 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {u.role === 'admin'
                    ? <Shield size={18} style={{ color: 'var(--blue)' }} />
                    : <User size={18} style={{ color: customPerms.length > 0 ? 'var(--orange)' : 'var(--green)' }} />}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600 }}>{u.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.id}</span>
                  <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>
                    {u.role === 'admin' ? '管理员' : '用户'}
                  </span>
                  {!u.active && <span className="badge badge-red">已禁用</span>}
                  {customPerms.length > 0 && u.role === 'user' && (
                    <span className="badge badge-orange" title="拥有危险权限">
                      {customPerms.length} 危险权限
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => startEdit(u)} className="btn btn-ghost btn-xs"><Edit3 size={14} /></button>
                  {u.id !== 'admin' && (
                    <button onClick={() => setDeleteTarget(u)} className="btn btn-ghost btn-xs"
                      style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>

              {/* 编辑模式 */}
              {isEditing && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input value={editForm.name || ''}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ minWidth: 120, fontSize: 12 }} placeholder="名称" />
                    <select value={editForm.role || 'user'}
                      onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                      style={{ minWidth: 100, fontSize: 12 }}>
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </select>
                    <input type="password" placeholder="新密码 (留空不修改)"
                      value={editForm.password || ''}
                      onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                      style={{ minWidth: 120, fontSize: 12 }} />
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="checkbox" checked={editForm.active !== false}
                        onChange={e => setEditForm({ ...editForm, active: e.target.checked })} />
                      活跃
                    </label>
                  </div>

                  {/* 项目编辑 */}
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>归属项目: </span>
                    <div style={{ marginTop: 4 }}>
                      {projects.map(p => (
                        <button key={p.name}
                          onClick={() => setEditForm({
                            ...editForm,
                            project_ids: toggleProject(editForm.project_ids || [], p.name),
                          })}
                          className={`btn btn-xs ${(editForm.project_ids || []).includes(p.name) ? 'btn-primary' : ''}`}
                          style={{ margin: 2 }}>{p.name}</button>
                      ))}
                    </div>
                  </div>

                  {/* 权限编辑（admin 豁免，其他角色显示全部权限） */}
                  {editForm.role !== 'admin' && (
                    <div style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--r-md)', marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6 }}>
                        权限分配（全部显式勾选，无默认权限）
                      </div>
                      {ALL_PERMISSIONS.map(perm => (
                        <label key={perm.key} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '3px 0', cursor: 'pointer', fontSize: 11,
                        }}>
                          <input type="checkbox"
                            checked={(editForm.custom_permissions || []).includes(perm.key)}
                            onChange={() => setEditForm({
                              ...editForm,
                              custom_permissions: togglePerm(editForm.custom_permissions || [], perm.key),
                            })}
                            style={{ accentColor: perm.dangerous ? 'var(--red)' : 'var(--blue)' }} />
                          {perm.icon} {perm.label}
                          <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                            {perm.key}
                          </span>
                          {perm.dangerous && <span style={{ fontSize: 9, color: 'var(--red)', marginLeft: 4 }}>⚠</span>}
                        </label>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => saveEdit(u.id)} className="btn btn-primary btn-xs"><Save size={12} /> 保存</button>
                    <button onClick={cancelEdit} className="btn btn-xs"><X size={12} /> 取消</button>
                  </div>
                </div>
              )}

              {/* 查看模式：项目标签 + 权限标签 */}
              {!isEditing && (
                <>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>项目: </span>
                    {u.role === 'admin' ? (
                      <span className="badge badge-blue">全部</span>
                    ) : (u.project_ids || []).length > 0 ? (
                      u.project_ids.map(p => <span key={p} className="badge badge-purple" style={{ marginRight: 3 }}>{p}</span>)
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>未分配</span>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>权限: </span>
                    {u.role === 'admin' ? (
                      <span className="badge badge-blue">全部权限</span>
                    ) : customPerms.length > 0 ? (
                      customPerms.map((p: string) => {
                        const permDef = ALL_PERMISSIONS.find(ap => ap.key === p);
                        return (
                          <span key={p} className={`badge ${permDef?.dangerous ? 'badge-red' : 'badge-green'}`} style={{ marginRight: 3 }}>
                            {permDef?.label || p}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--red)' }}>无权限</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {userList.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)' }}>
          暂无用户，点击「新增用户」创建
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除用户"
        message={`确定要删除用户「${deleteTarget?.name}」吗？此操作不可撤销，已记录审计日志。`}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
