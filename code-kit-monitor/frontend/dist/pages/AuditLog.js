import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { FileSearch, Shield, Filter, RefreshCw } from 'lucide-react';
import { useAuth, authHeaders } from '../stores/auth';
const ACTION_LABELS = {
    'user:create': '创建用户', 'user:update': '更新用户', 'user:delete': '删除用户',
    'permission:grant': '授予权限', 'permission:revoke': '撤销权限',
    'project:delete': '删除项目', 'project:write': '修改配置', 'project:read': '切换项目',
    'workflow:stop': '停止流程',
};
export default function AuditLog() {
    const { isAdmin } = useAuth();
    const [entries, setEntries] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState({ userId: '', action: '', days: '7' });
    const fetchData = useCallback(async () => {
        setLoading(true);
        const h = authHeaders();
        const params = new URLSearchParams();
        if (filter.userId)
            params.set('user_id', filter.userId);
        if (filter.action)
            params.set('action', filter.action);
        if (filter.days)
            params.set('days', filter.days);
        params.set('limit', '200');
        try {
            const [resEntries, resStats] = await Promise.all([
                fetch(`/api/audit?${params}`, { headers: h }),
                fetch(`/api/audit/stats?days=${filter.days}`, { headers: h }),
            ]);
            const d1 = await resEntries.json();
            const d2 = await resStats.json();
            setEntries(d1.entries || []);
            setStats(d2);
        }
        catch { /* ignore */ }
        setLoading(false);
    }, [filter]);
    useEffect(() => { fetchData(); }, [fetchData]);
    if (!isAdmin) {
        return (_jsxs("div", { style: { padding: 80, textAlign: 'center', color: 'var(--text-muted)' }, children: [_jsx(Shield, { size: 48, style: { marginBottom: 16, opacity: 0.2 } }), _jsx("p", { style: { fontSize: 14 }, children: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650" })] }));
    }
    return (_jsxs("div", { style: { padding: '20px 24px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("h1", { style: { fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, margin: 0 }, children: "\u5BA1\u8BA1\u65E5\u5FD7" }), _jsxs("span", { style: { fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [entries.length, " \u6761\u8BB0\u5F55"] })] }), _jsxs("button", { onClick: fetchData, className: "btn btn-ghost btn-sm", disabled: loading, children: [_jsx(RefreshCw, { size: 14, style: { animation: loading ? 'spin 0.7s linear infinite' : 'none' } }), _jsx("span", { style: { marginLeft: 4 }, children: "\u5237\u65B0" })] })] }), stats && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }, children: [_jsxs("div", { className: "stat", style: { borderTop: '3px solid var(--blue)' }, children: [_jsx("div", { className: "stat-value", style: { color: 'var(--blue)' }, children: stats.total }), _jsx("div", { className: "stat-label", children: "\u603B\u64CD\u4F5C\u6570" })] }), _jsxs("div", { className: "stat", style: { borderTop: '3px solid var(--green)' }, children: [_jsx("div", { className: "stat-value", style: { color: 'var(--green)' }, children: stats.today }), _jsx("div", { className: "stat-label", children: "\u4ECA\u65E5\u64CD\u4F5C" })] }), _jsxs("div", { className: "stat", style: { borderTop: '3px solid var(--red)' }, children: [_jsx("div", { className: "stat-value", style: { color: 'var(--red)' }, children: stats.by_action.filter(a => ['user:delete', 'project:delete', 'workflow:stop'].includes(a.action))
                                    .reduce((sum, a) => sum + a.count, 0) }), _jsx("div", { className: "stat-label", children: "\u5371\u9669\u64CD\u4F5C" })] })] })), _jsxs("div", { style: { display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx(Filter, { size: 14, style: { color: 'var(--text-muted)' } }), _jsxs("select", { value: filter.action, onChange: e => setFilter({ ...filter, action: e.target.value }), style: { minWidth: 120 }, children: [_jsx("option", { value: "", children: "\u5168\u90E8\u64CD\u4F5C" }), Object.entries(ACTION_LABELS).map(([k, v]) => (_jsx("option", { value: k, children: v }, k)))] }), _jsxs("select", { value: filter.days, onChange: e => setFilter({ ...filter, days: e.target.value }), style: { minWidth: 100 }, children: [_jsx("option", { value: "1", children: "\u4ECA\u5929" }), _jsx("option", { value: "7", children: "\u6700\u8FD1 7 \u5929" }), _jsx("option", { value: "30", children: "\u6700\u8FD1 30 \u5929" }), _jsx("option", { value: "90", children: "\u6700\u8FD1 90 \u5929" })] })] }), entries.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: 80, color: 'var(--text-muted)' }, children: [_jsx(FileSearch, { size: 40, style: { marginBottom: 16, opacity: 0.1 } }), _jsx("p", { style: { fontSize: 14, marginBottom: 4, color: 'var(--text-secondary)' }, children: "\u6682\u65E0\u5BA1\u8BA1\u8BB0\u5F55" }), _jsx("p", { style: { fontSize: 12 }, children: "\u5371\u9669\u64CD\u4F5C\u5C06\u81EA\u52A8\u8BB0\u5F55\u5230\u5BA1\u8BA1\u65E5\u5FD7" })] })) : (_jsx("div", { style: { overflow: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("th", { style: { padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }, children: "\u65F6\u95F4" }), _jsx("th", { style: { padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }, children: "\u7528\u6237" }), _jsx("th", { style: { padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }, children: "\u64CD\u4F5C" }), _jsx("th", { style: { padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }, children: "\u76EE\u6807" }), _jsx("th", { style: { padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }, children: "\u8BE6\u60C5" }), _jsx("th", { style: { padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }, children: "\u7ED3\u679C" })] }) }), _jsx("tbody", { children: entries.map((e, i) => (_jsxs("tr", { style: { borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--bg-card)' : 'transparent' }, children: [_jsx("td", { style: { padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }, children: e.timestamp?.replace('T', ' ').substring(0, 19) || '-' }), _jsx("td", { style: { padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }, children: e.user_name }), _jsx("td", { style: { padding: '6px 12px', whiteSpace: 'nowrap' }, children: _jsx("span", { className: `badge ${e.action.includes('delete') || e.action === 'workflow:stop' ? 'badge-red' : e.action.includes('permission') ? 'badge-orange' : 'badge-blue'}`, children: ACTION_LABELS[e.action] || e.action }) }), _jsx("td", { style: { padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: e.target }), _jsx("td", { style: { padding: '6px 12px', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: e.detail }), _jsx("td", { style: { padding: '6px 12px', textAlign: 'center' }, children: _jsx("span", { className: `dot ${e.result === 'success' ? 'dot-green' : 'dot-red'}`, title: e.result === 'success' ? '成功' : '失败' }) })] }, i))) })] }) }))] }));
}
