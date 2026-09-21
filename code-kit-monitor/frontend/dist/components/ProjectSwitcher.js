import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Layers, Check } from 'lucide-react';
import { useAuth } from '../stores/auth';
export default function ProjectSwitcher({ collapsed }) {
    const { isAdmin, rolePermissions } = useAuth();
    const canRead = isAdmin || rolePermissions.includes('project:read');
    const [open, setOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const fetchProjects = () => {
        fetch('/api/admin/projects').then(r => r.json()).then(d => {
            setProjects(d.projects || []);
        });
    };
    useEffect(() => { if (canRead)
        fetchProjects(); }, [canRead]);
    // 无 project:read 权限 → 不展示
    if (!canRead)
        return null;
    const switchProject = async (root) => {
        await fetch('/api/admin/projects/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ root }) });
        setOpen(false);
        window.location.reload();
    };
    const currentProject = projects.find(p => p.is_current);
    const curName = currentProject?.name || (projects[0]?.name || '无项目');
    // 无可见项目 → 只展示文字，不可展开
    if (projects.length === 0) {
        return (_jsxs("div", { style: {
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)',
                justifyContent: collapsed ? 'center' : 'flex-start',
            }, children: [_jsx(Layers, { size: 13, style: { color: 'var(--text-muted)' } }), !collapsed && _jsx("span", { children: "\u65E0\u9879\u76EE" })] }));
    }
    return (_jsxs("div", { style: { position: 'relative' }, children: [_jsxs("button", { onClick: () => setOpen(!open), className: "btn btn-ghost btn-sm", style: { width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6 }, "aria-label": "\u5207\u6362\u9879\u76EE", children: [_jsx(Layers, { size: 13, style: { color: 'var(--text-muted)' } }), !collapsed && _jsx("span", { style: { fontSize: 11, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: curName })] }), open && (_jsxs(_Fragment, { children: [_jsx("div", { style: { position: 'fixed', inset: 0, zIndex: 99 }, onClick: () => setOpen(false) }), _jsxs("div", { style: {
                            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
                            background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
                            borderRadius: 'var(--r-md)', minWidth: 180,
                            boxShadow: 'var(--shadow-md)', padding: 4,
                        }, children: [_jsx("div", { style: { padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.04 }, children: "\u9879\u76EE" }), projects.map(p => (_jsxs("button", { onClick: () => switchProject(p.root), style: {
                                    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                                    padding: '5px 8px', border: 'none', borderRadius: 'var(--r-sm)',
                                    background: p.is_current ? 'var(--bg-selected)' : 'transparent',
                                    color: p.is_current ? 'var(--blue)' : 'var(--text-secondary)',
                                    cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)',
                                }, children: [_jsx("span", { style: { flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: p.name }), p.has_specs && _jsx("span", { className: "dot dot-green", title: "\u542B .specs/" }), p.is_current && _jsx(Check, { size: 12, style: { color: 'var(--blue)' } })] }, p.root)))] })] }))] }));
}
