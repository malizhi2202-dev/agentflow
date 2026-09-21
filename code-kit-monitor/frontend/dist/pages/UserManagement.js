import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, X, Save, Shield, User } from 'lucide-react';
import { useAuth, authHeaders } from '../stores/auth';
import ConfirmDialog from '../components/ConfirmDialog';
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
    const [projects, setProjects] = useState([]);
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newUser, setNewUser] = useState({
        id: '', name: '', role: 'user', password: '123456',
        project_ids: [],
        custom_permissions: [],
    });
    const [deleteTarget, setDeleteTarget] = useState(null);
    useEffect(() => {
        fetchUsers();
        fetch('/api/admin/projects', { headers: authHeaders() })
            .then(r => r.json()).then(d => setProjects(d.projects || []));
    }, []);
    const startEdit = (u) => {
        setEditing(u.id);
        setEditForm({
            name: u.name, role: u.role,
            project_ids: [...(u.project_ids || [])],
            custom_permissions: [...(u.custom_permissions || [])],
            active: u.active,
        });
    };
    const cancelEdit = () => { setEditing(null); setEditForm({}); };
    const saveEdit = async (id) => {
        const h = authHeaders();
        await fetch(`/api/auth/users/${id}`, { method: 'PUT', headers: h, body: JSON.stringify(editForm) });
        await fetchUsers();
        setEditing(null);
    };
    const confirmDelete = async () => {
        if (!deleteTarget)
            return;
        await fetch(`/api/auth/users/${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() });
        setDeleteTarget(null);
        await fetchUsers();
    };
    const addUser = async () => {
        if (!newUser.id || !newUser.name)
            return;
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
        }
        else {
            alert(data.detail || '创建失败');
        }
    };
    const toggleProject = (ids, name) => ids.includes(name) ? ids.filter(p => p !== name) : [...ids, name];
    const togglePerm = (perms, key) => perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key];
    if (!isAdmin) {
        return (_jsxs("div", { style: { padding: 80, textAlign: 'center', color: 'var(--text-muted)' }, children: [_jsx(Shield, { size: 48, style: { marginBottom: 16, opacity: 0.2 } }), _jsx("p", { style: { fontSize: 14 }, children: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650" })] }));
    }
    return (_jsxs("div", { style: { padding: '20px 24px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("h1", { style: { fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, margin: 0 }, children: "\u7528\u6237\u7BA1\u7406" }), _jsxs("span", { style: { fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [userList.length, " \u4E2A\u7528\u6237"] })] }), _jsxs("button", { onClick: () => setShowAdd(true), className: "btn btn-primary btn-sm", children: [_jsx(Plus, { size: 14 }), " \u65B0\u589E\u7528\u6237"] })] }), showAdd && (_jsxs("div", { className: "card", style: { marginBottom: 20, border: '1px solid var(--blue)', padding: 16 }, children: [_jsx("h3", { style: { fontSize: 14, fontWeight: 600, marginBottom: 12 }, children: "\u65B0\u589E\u7528\u6237" }), _jsxs("div", { style: { display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }, children: [_jsx("input", { placeholder: "\u7528\u6237ID (\u82F1\u6587)", value: newUser.id, onChange: e => setNewUser({ ...newUser, id: e.target.value }), style: { minWidth: 140 } }), _jsx("input", { placeholder: "\u663E\u793A\u540D\u79F0", value: newUser.name, onChange: e => setNewUser({ ...newUser, name: e.target.value }), style: { minWidth: 140, flex: 1 } }), _jsxs("select", { value: newUser.role, onChange: e => setNewUser({ ...newUser, role: e.target.value }), style: { minWidth: 100 }, children: [_jsx("option", { value: "user", children: "\u666E\u901A\u7528\u6237" }), _jsx("option", { value: "admin", children: "\u7BA1\u7406\u5458" })] }), _jsx("input", { type: "password", placeholder: "\u5BC6\u7801 (\u9ED8\u8BA4123456)", value: newUser.password, onChange: e => setNewUser({ ...newUser, password: e.target.value }), style: { minWidth: 140 } })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }, children: "\u5F52\u5C5E\u9879\u76EE" }), projects.map(p => (_jsx("button", { onClick: () => setNewUser({ ...newUser, project_ids: toggleProject(newUser.project_ids, p.name) }), className: `btn btn-xs ${newUser.project_ids.includes(p.name) ? 'btn-primary' : ''}`, style: { margin: 2 }, children: p.name }, p.name))), newUser.role === 'admin' && (_jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }, children: "admin \u9ED8\u8BA4\u53EF\u89C1\u5168\u90E8\u9879\u76EE" }))] }), newUser.role !== 'admin' && (_jsxs("div", { style: { marginBottom: 12, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--r-md)' }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }, children: "\u6743\u9650\u5206\u914D\uFF08\u663E\u5F0F\u52FE\u9009\uFF0C\u65E0\u9ED8\u8BA4\u6743\u9650\uFF09" }), ALL_PERMISSIONS.map(perm => (_jsxs("label", { style: {
                                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0',
                                    cursor: 'pointer', borderBottom: '1px solid var(--border)',
                                }, children: [_jsx("input", { type: "checkbox", checked: newUser.custom_permissions.includes(perm.key), onChange: () => setNewUser({
                                            ...newUser,
                                            custom_permissions: togglePerm(newUser.custom_permissions, perm.key),
                                        }), style: { marginTop: 2, accentColor: perm.dangerous ? 'var(--red)' : 'var(--blue)' } }), _jsxs("div", { children: [_jsxs("div", { style: { fontSize: 12, fontWeight: 600 }, children: [_jsx("span", { style: { marginRight: 4 }, children: perm.icon }), perm.label, _jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontFamily: 'var(--font-mono)' }, children: perm.key }), perm.dangerous && _jsx("span", { style: { fontSize: 9, color: 'var(--red)', marginLeft: 6 }, children: "\u26A0 \u5371\u9669" })] }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: perm.desc })] })] }, perm.key)))] })), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("button", { onClick: addUser, className: "btn btn-primary btn-sm", children: [_jsx(Save, { size: 12 }), " \u521B\u5EFA\u7528\u6237"] }), _jsx("button", { onClick: () => setShowAdd(false), className: "btn btn-sm", children: "\u53D6\u6D88" })] })] })), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }, children: userList.map(u => {
                    const isEditing = editing === u.id;
                    const customPerms = u.custom_permissions || [];
                    return (_jsxs("div", { className: "card", style: {
                            borderLeft: `3px solid ${u.role === 'admin' ? 'var(--blue)' : 'var(--green)'}`,
                            opacity: u.active ? 1 : 0.6,
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [u.role === 'admin'
                                                ? _jsx(Shield, { size: 18, style: { color: 'var(--blue)' } })
                                                : _jsx(User, { size: 18, style: { color: customPerms.length > 0 ? 'var(--orange)' : 'var(--green)' } }), _jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600 }, children: u.name }), _jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: u.id }), _jsx("span", { className: `badge ${u.role === 'admin' ? 'badge-blue' : 'badge-green'}`, children: u.role === 'admin' ? '管理员' : '用户' }), !u.active && _jsx("span", { className: "badge badge-red", children: "\u5DF2\u7981\u7528" }), customPerms.length > 0 && u.role === 'user' && (_jsxs("span", { className: "badge badge-orange", title: "\u62E5\u6709\u5371\u9669\u6743\u9650", children: [customPerms.length, " \u5371\u9669\u6743\u9650"] }))] }), _jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsx("button", { onClick: () => startEdit(u), className: "btn btn-ghost btn-xs", children: _jsx(Edit3, { size: 14 }) }), u.id !== 'admin' && (_jsx("button", { onClick: () => setDeleteTarget(u), className: "btn btn-ghost btn-xs", style: { color: 'var(--red)' }, children: _jsx(Trash2, { size: 14 }) }))] })] }), isEditing && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("input", { value: editForm.name || '', onChange: e => setEditForm({ ...editForm, name: e.target.value }), style: { minWidth: 120, fontSize: 12 }, placeholder: "\u540D\u79F0" }), _jsxs("select", { value: editForm.role || 'user', onChange: e => setEditForm({ ...editForm, role: e.target.value }), style: { minWidth: 100, fontSize: 12 }, children: [_jsx("option", { value: "user", children: "\u666E\u901A\u7528\u6237" }), _jsx("option", { value: "admin", children: "\u7BA1\u7406\u5458" })] }), _jsx("input", { type: "password", placeholder: "\u65B0\u5BC6\u7801 (\u7559\u7A7A\u4E0D\u4FEE\u6539)", value: editForm.password || '', onChange: e => setEditForm({ ...editForm, password: e.target.value }), style: { minWidth: 120, fontSize: 12 } }), _jsxs("label", { style: { fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("input", { type: "checkbox", checked: editForm.active !== false, onChange: e => setEditForm({ ...editForm, active: e.target.checked }) }), "\u6D3B\u8DC3"] })] }), _jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: "\u5F52\u5C5E\u9879\u76EE: " }), _jsx("div", { style: { marginTop: 4 }, children: projects.map(p => (_jsx("button", { onClick: () => setEditForm({
                                                        ...editForm,
                                                        project_ids: toggleProject(editForm.project_ids || [], p.name),
                                                    }), className: `btn btn-xs ${(editForm.project_ids || []).includes(p.name) ? 'btn-primary' : ''}`, style: { margin: 2 }, children: p.name }, p.name))) })] }), editForm.role !== 'admin' && (_jsxs("div", { style: { padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--r-md)', marginBottom: 8 }, children: [_jsx("div", { style: { fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6 }, children: "\u6743\u9650\u5206\u914D\uFF08\u5168\u90E8\u663E\u5F0F\u52FE\u9009\uFF0C\u65E0\u9ED8\u8BA4\u6743\u9650\uFF09" }), ALL_PERMISSIONS.map(perm => (_jsxs("label", { style: {
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    padding: '3px 0', cursor: 'pointer', fontSize: 11,
                                                }, children: [_jsx("input", { type: "checkbox", checked: (editForm.custom_permissions || []).includes(perm.key), onChange: () => setEditForm({
                                                            ...editForm,
                                                            custom_permissions: togglePerm(editForm.custom_permissions || [], perm.key),
                                                        }), style: { accentColor: perm.dangerous ? 'var(--red)' : 'var(--blue)' } }), perm.icon, " ", perm.label, _jsx("span", { style: { color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }, children: perm.key }), perm.dangerous && _jsx("span", { style: { fontSize: 9, color: 'var(--red)', marginLeft: 4 }, children: "\u26A0" })] }, perm.key)))] })), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsxs("button", { onClick: () => saveEdit(u.id), className: "btn btn-primary btn-xs", children: [_jsx(Save, { size: 12 }), " \u4FDD\u5B58"] }), _jsxs("button", { onClick: cancelEdit, className: "btn btn-xs", children: [_jsx(X, { size: 12 }), " \u53D6\u6D88"] })] })] })), !isEditing && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)' }, children: "\u9879\u76EE: " }), u.role === 'admin' ? (_jsx("span", { className: "badge badge-blue", children: "\u5168\u90E8" })) : (u.project_ids || []).length > 0 ? (u.project_ids.map(p => _jsx("span", { className: "badge badge-purple", style: { marginRight: 3 }, children: p }, p))) : (_jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)' }, children: "\u672A\u5206\u914D" }))] }), _jsxs("div", { children: [_jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)' }, children: "\u6743\u9650: " }), u.role === 'admin' ? (_jsx("span", { className: "badge badge-blue", children: "\u5168\u90E8\u6743\u9650" })) : customPerms.length > 0 ? (customPerms.map((p) => {
                                                const permDef = ALL_PERMISSIONS.find(ap => ap.key === p);
                                                return (_jsx("span", { className: `badge ${permDef?.dangerous ? 'badge-red' : 'badge-green'}`, style: { marginRight: 3 }, children: permDef?.label || p }, p));
                                            })) : (_jsx("span", { style: { fontSize: 10, color: 'var(--red)' }, children: "\u65E0\u6743\u9650" }))] })] }))] }, u.id));
                }) }), userList.length === 0 && (_jsx("div", { style: { textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)' }, children: "\u6682\u65E0\u7528\u6237\uFF0C\u70B9\u51FB\u300C\u65B0\u589E\u7528\u6237\u300D\u521B\u5EFA" })), _jsx(ConfirmDialog, { open: !!deleteTarget, title: "\u5220\u9664\u7528\u6237", message: `确定要删除用户「${deleteTarget?.name}」吗？此操作不可撤销，已记录审计日志。`, danger: true, onConfirm: confirmDelete, onCancel: () => setDeleteTarget(null) })] }));
}
