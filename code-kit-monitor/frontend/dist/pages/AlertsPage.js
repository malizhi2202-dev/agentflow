import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Bell, BellOff, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
const SEVERITY_ICONS = {
    critical: _jsx(XCircle, { size: 14, style: { color: 'var(--red)' } }),
    warning: _jsx(AlertTriangle, { size: 14, style: { color: 'var(--orange)' } }),
    info: _jsx(AlertCircle, { size: 14, style: { color: 'var(--blue)' } }),
};
const ALERT_TYPE_NAMES = {
    token_exceeded: 'Token 超限',
    agent_dead: 'Agent 宕机',
    execution_failed: '执行失败',
};
export default function AlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [unackCount, setUnackCount] = useState(0);
    const [typeFilter, setTypeFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const fetchAlerts = () => {
        var url = '/api/alerts?limit=100';
        if (typeFilter !== 'all')
            url += '&alert_type=' + typeFilter;
        fetch(url)
            .then(r => r.json())
            .then(d => {
            setAlerts(d.alerts || []);
            setUnackCount(d.unacknowledged_count || 0);
            setLoading(false);
        })
            .catch(() => setLoading(false));
    };
    useEffect(() => {
        fetchAlerts();
        var t = setInterval(fetchAlerts, 15000);
        return () => clearInterval(t);
    }, [typeFilter]);
    const acknowledgeOne = (id) => {
        fetch('/api/alerts/' + id + '/acknowledge', { method: 'POST' })
            .then(r => r.json())
            .then(() => fetchAlerts());
    };
    const acknowledgeAll = () => {
        fetch('/api/alerts/acknowledge-all', { method: 'POST' })
            .then(r => r.json())
            .then(() => fetchAlerts());
    };
    if (loading) {
        return (_jsxs("div", { style: { padding: 24, textAlign: 'center', color: 'var(--text-muted)' }, children: [_jsx(Bell, { size: 36, style: { marginBottom: 12, opacity: 0.2 } }), _jsx("p", { children: "\u52A0\u8F7D\u4E2D..." })] }));
    }
    return (_jsxs("div", { style: { padding: '20px 24px', height: '100%', overflow: 'auto' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsxs("h1", { style: { fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Bell, { size: 18 }), " \u544A\u8B66\u4E2D\u5FC3", unackCount > 0 && (_jsx("span", { style: {
                                    background: 'var(--red)', color: '#fff', borderRadius: 10, padding: '1px 8px',
                                    fontSize: 11, fontWeight: 700, marginLeft: 4,
                                }, children: unackCount }))] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("select", { value: typeFilter, onChange: e => setTypeFilter(e.target.value), style: {
                                    padding: '4px 8px', fontSize: 12, borderRadius: 4,
                                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                                    color: 'var(--text)', cursor: 'pointer',
                                }, children: [_jsx("option", { value: "all", children: "\u5168\u90E8\u7C7B\u578B" }), _jsx("option", { value: "token_exceeded", children: "Token \u8D85\u9650" }), _jsx("option", { value: "agent_dead", children: "Agent \u5B95\u673A" }), _jsx("option", { value: "execution_failed", children: "\u6267\u884C\u5931\u8D25" })] }), unackCount > 0 && (_jsxs("button", { className: "btn btn-sm btn-ghost", onClick: acknowledgeAll, style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx(BellOff, { size: 12 }), " \u5168\u90E8\u786E\u8BA4"] }))] })] }), alerts.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: 60, color: 'var(--text-muted)' }, children: [_jsx(Bell, { size: 36, style: { marginBottom: 12, opacity: 0.1 } }), _jsx("p", { children: "\u6682\u65E0\u544A\u8B66" }), _jsx("p", { style: { fontSize: 12, marginTop: 4 }, children: "\u7CFB\u7EDF\u8FD0\u884C\u6B63\u5E38 \uD83C\uDF89" })] })) : (alerts.map(a => (_jsx("div", { style: {
                    background: a.acknowledged ? 'var(--bg-card)' : 'var(--bg-selected)',
                    borderRadius: 8, padding: '14px 16px', marginBottom: 8,
                    border: '1px solid ' + (a.acknowledged ? 'var(--border)' : a.severity === 'critical' ? 'var(--red)' : 'var(--orange)'),
                    opacity: a.acknowledged ? 0.7 : 1,
                }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsx("div", { style: { marginTop: 2 }, children: SEVERITY_ICONS[a.severity] || _jsx(AlertCircle, { size: 14 }) }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { style: {
                                                padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600,
                                                background: a.severity === 'critical' ? 'var(--red-bg)' : a.severity === 'warning' ? 'var(--orange-bg)' : 'var(--blue-bg)',
                                                color: a.severity === 'critical' ? 'var(--red)' : a.severity === 'warning' ? 'var(--orange)' : 'var(--blue)',
                                            }, children: a.severity === 'critical' ? '严重' : a.severity === 'warning' ? '警告' : '信息' }), _jsx("span", { className: "badge badge-purple", style: { fontSize: 9 }, children: ALERT_TYPE_NAMES[a.alert_type] || a.alert_type }), _jsx("span", { style: { fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: a.timestamp ? new Date(a.timestamp).toLocaleString('zh-CN') : '' })] }), _jsx("div", { style: { fontWeight: 600, fontSize: 13, marginBottom: 2 }, children: a.title }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }, children: a.message }), a.metadata && Object.keys(a.metadata).length > 0 && (_jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10, color: 'var(--text-dim)' }, children: Object.entries(a.metadata).slice(0, 4).map(([k, v]) => (_jsxs("span", { children: [k, ": ", _jsx("strong", { children: String(v) })] }, k))) }))] }), !a.acknowledged && (_jsx("button", { className: "btn btn-ghost btn-xs", onClick: () => acknowledgeOne(a.id), style: { whiteSpace: 'nowrap', fontSize: 10 }, children: "\u786E\u8BA4" }))] }) }, a.id))))] }));
}
