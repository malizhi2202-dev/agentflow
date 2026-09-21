import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Edit3, X } from 'lucide-react';
import { gateDisplay } from '../hooks/useFileNames';
import { useAuth } from '../stores/auth';
const ALL_GATES = ['G1', '需求门', 'G2', 'G2a', 'Task', 'G3', '测试门', 'G4'];
export default function Roles() {
    const { isAdmin, rolePermissions } = useAuth();
    const canWrite = isAdmin || rolePermissions.includes('project:write');
    const canDelete = isAdmin || rolePermissions.includes('project:delete');
    const [roles, setRoles] = useState([]);
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newRole, setNewRole] = useState({ name: '', emoji: '⚪', gates: [], description: '', style: '', personality: '' });
    useEffect(() => { fetch('/api/roles').then(r => r.json()).then(d => setRoles(d.roles || [])).catch(() => { }); }, []);
    const startEdit = (r) => { setEditing(r.id); setEditForm({ ...r }); };
    const cancelEdit = () => { setEditing(null); setEditForm({}); };
    const saveEdit = async (id) => {
        await fetch(`/api/roles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
        setRoles(prev => prev.map(r => r.id === id ? { ...r, ...editForm } : r));
        setEditing(null);
    };
    const deleteRole = async (id) => {
        await fetch(`/api/roles/${id}`, { method: 'DELETE' });
        setRoles(prev => prev.filter(r => r.id !== id));
    };
    const addRole = async () => {
        if (!newRole.name)
            return;
        const res = await fetch('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRole) });
        const data = await res.json();
        if (data.ok) {
            setRoles(prev => [...prev, data.role]);
            setShowAdd(false);
            setNewRole({ name: '', emoji: '⚪', gates: [], description: '', style: '', personality: '' });
        }
    };
    const toggleGate = (gates, gate) => gates.includes(gate) ? gates.filter(g => g !== gate) : [...gates, gate];
    return (_jsxs("div", { style: { padding: '20px 24px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("h1", { style: { fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, margin: 0 }, children: "\u89D2\u8272\u7BA1\u7406" }), _jsxs("span", { style: { fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [roles.length, " \u4E2A\u89D2\u8272"] })] }), canWrite && _jsxs("button", { onClick: () => setShowAdd(true), className: "btn btn-primary btn-sm", children: [_jsx(Plus, { size: 14 }), " \u65B0\u589E\u89D2\u8272"] })] }), showAdd && (_jsxs("div", { className: "card", style: { marginBottom: 20, border: '1px solid var(--blue)' }, children: [_jsxs("div", { style: { display: 'flex', gap: 12, marginBottom: 12 }, children: [_jsx("input", { placeholder: "\u89D2\u8272ID (\u82F1\u6587)", value: newRole.id || '', onChange: e => setNewRole({ ...newRole, id: e.target.value }) }), _jsx("input", { placeholder: "\u89D2\u8272\u540D", value: newRole.name || '', onChange: e => setNewRole({ ...newRole, name: e.target.value }), style: { flex: 2 } }), _jsx("input", { placeholder: "emoji", value: newRole.emoji || '', onChange: e => setNewRole({ ...newRole, emoji: e.target.value }), style: { width: 60 } })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)', marginRight: 8 }, children: "\u6240\u5C5E\u95E8\u7981:" }), ALL_GATES.map(g => (_jsx("button", { onClick: () => setNewRole({ ...newRole, gates: toggleGate(newRole.gates || [], g) }), className: `btn btn-xs ${(newRole.gates || []).includes(g) ? 'btn-primary' : ''}`, style: { margin: 2 }, children: gateDisplay(g) }, g)))] }), _jsx("textarea", { placeholder: "\u63CF\u8FF0", value: newRole.description || '', onChange: e => setNewRole({ ...newRole, description: e.target.value }), style: { width: '100%', minHeight: 40, marginBottom: 8 } }), _jsx("textarea", { placeholder: "\u6027\u60C5/\u504F\u597D", value: newRole.personality || '', onChange: e => setNewRole({ ...newRole, personality: e.target.value }), style: { width: '100%', minHeight: 40, marginBottom: 12 } }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("button", { onClick: addRole, className: "btn btn-primary btn-sm", children: [_jsx(Save, { size: 12 }), " \u4FDD\u5B58"] }), _jsx("button", { onClick: () => setShowAdd(false), className: "btn btn-sm", children: "\u53D6\u6D88" })] })] })), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }, children: roles.map(role => {
                    const isEditing = editing === role.id;
                    return (_jsxs("div", { className: "card", style: { borderLeft: '3px solid var(--blue)' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 20 }, children: role.emoji }), isEditing ? (_jsx("input", { value: editForm.name || '', onChange: e => setEditForm({ ...editForm, name: e.target.value }), style: { fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, width: 160 } })) : (_jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600 }, children: role.name })), _jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: role.id })] }), _jsx("div", { style: { display: 'flex', gap: 4 }, children: isEditing ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => saveEdit(role.id), className: "btn btn-ghost btn-xs", children: _jsx(Save, { size: 14 }) }), _jsx("button", { onClick: cancelEdit, className: "btn btn-ghost btn-xs", children: _jsx(X, { size: 14 }) })] })) : (_jsxs(_Fragment, { children: [canWrite && _jsx("button", { onClick: () => startEdit(role), className: "btn btn-ghost btn-xs", children: _jsx(Edit3, { size: 14 }) }), canDelete && _jsx("button", { onClick: () => deleteRole(role.id), className: "btn btn-ghost btn-xs", style: { color: 'var(--red)' }, children: _jsx(Trash2, { size: 14 }) })] })) })] }), _jsx("div", { style: { marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }, children: isEditing ? ALL_GATES.map(g => (_jsx("button", { onClick: () => setEditForm({ ...editForm, gates: toggleGate(editForm.gates || [], g) }), className: `btn btn-xs ${(editForm.gates || []).includes(g) ? 'btn-primary' : ''}`, children: gateDisplay(g) }, g))) : (role.gates || []).map(g => _jsx("span", { className: "badge badge-blue", children: gateDisplay(g) }, g)) }), isEditing ? (_jsx("textarea", { value: editForm.description || '', onChange: e => setEditForm({ ...editForm, description: e.target.value }), style: { width: '100%', minHeight: 32, fontSize: 12, marginBottom: 6 } })) : _jsx("p", { style: { fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }, children: role.description }), _jsxs("div", { style: { background: 'var(--bg-input)', borderRadius: 'var(--r-sm)', padding: '8px 10px', marginTop: 4 }, children: [_jsx("div", { style: { fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }, children: "\uD83C\uDFAD \u6027\u60C5" }), isEditing ? (_jsx("textarea", { value: editForm.personality || '', onChange: e => setEditForm({ ...editForm, personality: e.target.value }), style: { width: '100%', minHeight: 50, fontSize: 12 } })) : _jsx("p", { style: { fontSize: 12, color: 'var(--text)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }, children: role.personality })] })] }, role.id));
                }) }), roles.length === 0 && (_jsx("div", { style: { textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)' }, children: "\u6682\u65E0\u89D2\u8272\uFF0C\u70B9\u51FB\u300C\u65B0\u589E\u89D2\u8272\u300D\u521B\u5EFA" }))] }));
}
