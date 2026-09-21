import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useChanges } from '../stores/changes';
export default function TopBar() {
    const { summary: s } = useChanges();
    const [tokenToday, setTokenToday] = useState(0);
    const [theme, setTheme] = useState('dark');
    useEffect(() => {
        fetch('/api/token-usage').then(r => r.json()).then(d => setTokenToday(d.total_today || 0)).catch(() => { });
        const t = setInterval(() => { fetch('/api/token-usage').then(r => r.json()).then(d => setTokenToday(d.total_today || 0)).catch(() => { }); }, 30000);
        return () => clearInterval(t);
    }, []);
    const alarms = s ? s.alerts + s.blocked : 0;
    return (_jsxs("header", { style: { height: 44, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-weak)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontSize: 13, position: 'sticky', top: 0, zIndex: 100 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 24 }, children: [_jsxs("span", { style: { fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.02em' }, children: [_jsx("span", { style: { color: 'var(--blue)' }, children: "code-kit" }), " monitor"] }), s && (_jsxs("div", { style: { display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-weak)' }, children: [_jsxs("span", { children: [_jsx("span", { className: "status-dot status-dot-green", style: { marginRight: 4 } }), s.active_changes, " active"] }), _jsxs("span", { children: [_jsx("span", { className: "status-dot status-dot-blue", style: { marginRight: 4 } }), s.done_tasks, "/", s.total_tasks, " tasks"] }), _jsxs("span", { children: [_jsx("span", { className: "status-dot", style: { background: s.gates_passed === '0/0' ? 'var(--text-weak)' : 'var(--green)', marginRight: 4 } }), s.gates_passed, " gates"] }), alarms > 0 && _jsxs("span", { style: { color: 'var(--red)' }, children: [_jsx("span", { className: "status-dot status-dot-red", style: { marginRight: 4 } }), alarms] })] }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16 }, children: [_jsxs("span", { style: { color: 'var(--text-weak)', fontSize: 12 }, children: ["Token ", _jsx("b", { style: { color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }, children: tokenToday.toLocaleString() })] }), _jsx("button", { onClick: () => { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); document.documentElement.setAttribute('data-theme', n); }, className: "btn btn-ghost btn-sm", children: theme === 'dark' ? _jsx(Sun, { size: 15 }) : _jsx(Moon, { size: 15 }) })] })] }));
}
