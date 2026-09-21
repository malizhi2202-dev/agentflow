import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useChanges, filteredChanges } from '../stores/changes';
import ChangeCard from '../components/ChangeCard';
import { Search, PanelTop } from 'lucide-react';
export default function Home({ onSelect }) {
    const { changes, summary: s, loading, filter, fetchChanges } = useChanges();
    const intervalRef = useRef(null);
    useEffect(() => {
        fetchChanges();
        intervalRef.current = setInterval(fetchChanges, 5000);
        return () => {
            if (intervalRef.current)
                clearInterval(intervalRef.current);
        };
    }, [fetchChanges]);
    const list = filteredChanges(changes, filter);
    if (loading && list.length === 0) {
        return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }, children: _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--blue)', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' } }), _jsx("p", { style: { color: 'var(--text-muted)', fontSize: 13 }, children: "\u626B\u63CF .specs/ ..." })] }) }));
    }
    return (_jsxs("div", { style: { padding: '20px 24px' }, children: [s && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }, children: [_jsx(Stat, { v: s.total_changes, label: "\u6D3B\u8DC3 Change", color: "var(--blue)", sub: `${s.done_tasks}/${s.total_tasks} tasks` }), _jsx(Stat, { v: `${s.overall_progress_pct}%`, label: "\u6574\u4F53\u8FDB\u5EA6", color: "var(--green)", sub: `${s.gates_passed} gates` }), _jsx(Stat, { v: s.alerts + s.blocked, label: "\u9700\u5173\u6CE8", color: s.alerts + s.blocked > 0 ? 'var(--red)' : 'var(--text-muted)', sub: `${s.alerts}a ${s.blocked}b` }), _jsx(Stat, { v: `${s.avg_days}d`, label: "\u5E73\u5747\u5468\u671F", color: "var(--text-secondary)" })] })), _jsxs("div", { style: { display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }, children: [_jsxs("div", { style: { position: 'relative', flex: 1, maxWidth: 300 }, children: [_jsx(Search, { size: 14, style: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' } }), _jsx("input", { placeholder: "\u641C\u7D22 change-id...", value: filter.q, onChange: e => useChanges.getState().setFilter({ q: e.target.value }), style: { width: '100%', paddingLeft: 30 } })] }), _jsxs("select", { value: filter.status, onChange: e => useChanges.getState().setFilter({ status: e.target.value }), children: [_jsx("option", { value: "all", children: "\u5168\u90E8\u72B6\u6001" }), _jsx("option", { value: "normal", children: "\u6B63\u5E38" }), _jsx("option", { value: "interrupted", children: "\u4E2D\u65AD" }), _jsx("option", { value: "blocked", children: "\u963B\u585E" })] }), _jsxs("select", { value: filter.phase, onChange: e => useChanges.getState().setFilter({ phase: e.target.value }), children: [_jsx("option", { value: "all", children: "\u5168\u90E8\u9636\u6BB5" }), ['0-change', '1-requirement', '2-design', '2a-ui-design', '3-task', '4-dev', '5-test', '6-review', '7-integration'].map(p => _jsx("option", { value: p, children: p }, p))] }), _jsxs("span", { style: { marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [list.length, "/", changes.length] })] }), list.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: 80, color: 'var(--text-muted)' }, children: [_jsx(PanelTop, { size: 40, style: { marginBottom: 16, opacity: 0.1 } }), _jsx("p", { style: { fontSize: 14, marginBottom: 4, color: 'var(--text-secondary)' }, children: "\u6682\u65E0\u6D3B\u8DC3 Change" }), _jsxs("p", { style: { fontSize: 12 }, children: ["\u8FD0\u884C ", _jsx("code", { className: "badge badge-blue", children: "@code-kit/GO.md \u65B0\u9700\u6C42" })] })] })) : (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))', gap: 10 }, children: list.map(c => _jsx(ChangeCard, { change: c, onSelect: onSelect }, c.id)) }))] }));
}
function Stat({ v, label, color, sub }) {
    return (_jsxs("div", { className: "stat", style: { borderTop: `3px solid ${color}` }, children: [_jsx("div", { className: "stat-value", style: { color }, children: v }), _jsx("div", { className: "stat-label", children: label }), sub && _jsx("div", { className: "stat-sub", children: sub })] }));
}
