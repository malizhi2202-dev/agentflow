import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from '../stores/auth';
import { User, Shield, LogOut } from 'lucide-react';
export default function UserArea({ collapsed, onNavigateProfile }) {
    const { currentUser, isAdmin, logout } = useAuth();
    const curName = currentUser?.name || '...';
    const curRole = currentUser?.role || 'user';
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsxs("button", { onClick: onNavigateProfile, className: "btn btn-ghost btn-sm", style: {
                    width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6,
                }, "aria-label": "\u7528\u6237\u4E2D\u5FC3", title: "\u7528\u6237\u4E2D\u5FC3", children: [isAdmin ? _jsx(Shield, { size: 13, style: { color: 'var(--blue)', flexShrink: 0 } }) : _jsx(User, { size: 13, style: { color: 'var(--text-muted)', flexShrink: 0 } }), !collapsed && (_jsxs(_Fragment, { children: [_jsx("span", { style: {
                                    fontSize: 11, fontFamily: 'var(--font-mono)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left',
                                }, children: curName }), _jsx("span", { style: {
                                    fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 'var(--r-sm)',
                                    background: isAdmin ? 'var(--blue)' : 'var(--bg-selected)',
                                    color: isAdmin ? '#fff' : 'var(--text-muted)',
                                    flexShrink: 0,
                                }, children: isAdmin ? '管理员' : '用户' })] }))] }), _jsxs("button", { onClick: logout, className: "btn btn-ghost btn-sm", style: {
                    width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6,
                    color: 'var(--text-muted)',
                }, "aria-label": "\u767B\u51FA", title: "\u767B\u51FA", children: [_jsx(LogOut, { size: 12, style: { flexShrink: 0 } }), !collapsed && _jsx("span", { style: { fontSize: 11 }, children: "\u767B\u51FA" })] })] }));
}
