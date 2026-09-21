import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft, Shield, User, Calendar, Circle, Key, FolderOpen } from 'lucide-react';
import { useAuth } from '../stores/auth';
const PERM_LABELS = {
    'project:read': '查看项目', 'project:write': '编辑项目',
    'project:delete': '删除产物', 'workflow:stop': '停止流程',
    'user:manage': '管理用户', 'audit:view': '查看审计',
};
const DANGEROUS_PERMS = new Set(['project:delete', 'workflow:stop', 'user:manage', 'audit:view']);
export default function UserCenter({ onBack }) {
    const { currentUser, isAdmin, rolePermissions } = useAuth();
    if (!currentUser) {
        return (_jsx("div", { style: { padding: 40, color: 'var(--text-muted)', textAlign: 'center' }, children: "\u52A0\u8F7D\u4E2D..." }));
    }
    const u = currentUser;
    const basePerms = rolePermissions.filter(p => !DANGEROUS_PERMS.has(p));
    const dangerPerms = rolePermissions.filter(p => DANGEROUS_PERMS.has(p));
    const createdAt = u.created_at ? new Date(u.created_at).toLocaleString('zh-CN') : '—';
    const sectionStyle = {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: '20px 24px',
    };
    const labelStyle = {
        fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 8,
    };
    return (_jsxs("div", { style: { padding: '24px 32px', maxWidth: 720, margin: '0 auto' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }, children: [_jsx("button", { onClick: onBack, className: "btn btn-ghost btn-sm", "aria-label": "\u8FD4\u56DE", children: _jsx(ArrowLeft, { size: 18 }) }), _jsx("h1", { style: { fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)' }, children: "\u7528\u6237\u4E2D\u5FC3" })] }), _jsxs("div", { style: { ...sectionStyle, marginBottom: 16 }, children: [_jsx("div", { style: labelStyle, children: "\u57FA\u672C\u4FE1\u606F" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }, children: [_jsx("div", { style: {
                                    width: 56, height: 56, borderRadius: '50%',
                                    background: isAdmin ? 'var(--blue)' : 'var(--bg-selected)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }, children: isAdmin
                                    ? _jsx(Shield, { size: 28, style: { color: '#fff' } })
                                    : _jsx(User, { size: 28, style: { color: 'var(--text-secondary)' } }) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 18, fontWeight: 700, color: 'var(--text)' }, children: u.name }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }, children: [_jsxs("span", { style: { fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }, children: ["@", u.id] }), _jsx("span", { style: {
                                                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--r-sm)',
                                                    background: isAdmin ? 'var(--blue)' : 'var(--bg-selected)',
                                                    color: isAdmin ? '#fff' : 'var(--text-muted)',
                                                }, children: isAdmin ? '管理员' : '用户' }), _jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: u.active ? 'var(--green)' : 'var(--text-muted)' }, children: [_jsx(Circle, { size: 6, fill: u.active ? 'var(--green)' : 'var(--text-muted)' }), u.active ? '活跃' : '已禁用'] })] })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [_jsx(InfoRow, { icon: _jsx(Key, { size: 12 }), label: "\u7528\u6237 ID", value: u.id, mono: true }), _jsx(InfoRow, { icon: _jsx(Calendar, { size: 12 }), label: "\u521B\u5EFA\u65F6\u95F4", value: createdAt })] })] }), _jsxs("div", { style: { ...sectionStyle, marginBottom: 16 }, children: [_jsx("div", { style: labelStyle, children: "\u6743\u9650\u4FE1\u606F" }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }, children: "\u57FA\u7840\u6743\u9650\uFF08\u89D2\u8272\u81EA\u5E26\uFF09" }), basePerms.length > 0 ? (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: basePerms.map(p => (_jsx("span", { style: {
                                        fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-sm)',
                                        background: 'var(--bg-selected)', color: 'var(--text-secondary)',
                                        fontFamily: 'var(--font-mono)',
                                    }, children: PERM_LABELS[p] || p }, p))) })) : (_jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: "\u65E0" }))] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }, children: "\u5371\u9669\u6743\u9650\uFF08\u663E\u5F0F\u6388\u4E88\uFF09" }), dangerPerms.length > 0 ? (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: dangerPerms.map(p => (_jsx("span", { style: {
                                        fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-sm)',
                                        background: 'rgba(239,68,68,0.1)', color: 'var(--red)',
                                        border: '1px solid rgba(239,68,68,0.25)',
                                        fontFamily: 'var(--font-mono)',
                                    }, children: PERM_LABELS[p] || p }, p))) })) : (_jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: "\u65E0\u989D\u5916\u5371\u9669\u6743\u9650" }))] })] }), _jsxs("div", { style: sectionStyle, children: [_jsx("div", { style: labelStyle, children: "\u5F52\u5C5E\u9879\u76EE" }), isAdmin && (!u.project_ids || u.project_ids.length === 0) ? (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(FolderOpen, { size: 14, style: { color: 'var(--blue)' } }), _jsx("span", { style: { fontSize: 13, color: 'var(--blue)', fontWeight: 600 }, children: "\u5168\u90E8\u9879\u76EE" }), _jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: "\uFF08\u7BA1\u7406\u5458\u53EF\u8BBF\u95EE\u6240\u6709\u9879\u76EE\uFF09" })] })) : (u.project_ids || []).length > 0 ? (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: u.project_ids.map(p => (_jsx("span", { style: {
                                fontSize: 11, padding: '4px 12px', borderRadius: 'var(--r-sm)',
                                background: 'var(--bg-selected)', color: 'var(--text)',
                                fontFamily: 'var(--font-mono)',
                            }, children: p }, p))) })) : (_jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: "\u672A\u5206\u914D\u4EFB\u4F55\u9879\u76EE" }))] })] }));
}
function InfoRow({ icon, label, value, mono }) {
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { color: 'var(--text-muted)', flexShrink: 0 }, children: icon }), _jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }, children: label }), _jsx("span", { style: {
                    fontSize: 12, color: 'var(--text)', fontWeight: 500,
                    fontFamily: mono ? 'var(--font-mono)' : undefined,
                }, children: value })] }));
}
