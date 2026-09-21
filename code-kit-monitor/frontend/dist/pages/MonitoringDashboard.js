import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { safeFetch } from '../utils/requestDedup';
const nameMap = (n) => n.replace('code-kit:', '').replace('code-kit:角色:', '角色·').replace('code-kit:模板:', '模板·').replace('code-kit:参考:', '参考·');
const th = { padding: '6px 8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontSize: 10, whiteSpace: 'nowrap' };
const td = { padding: '4px 8px', fontSize: 11, color: 'var(--color-text)', whiteSpace: 'nowrap' };
function EntityTable({ title, items, color }) {
    const list = items || [];
    const totalTokens = list.reduce((s, i) => s + i.tokens, 0);
    return (_jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }, children: [_jsxs("h3", { style: { fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', color }, children: [title, "\uFF08", list.length, " \u4E2A\uFF0C", totalTokens.toLocaleString(), " tokens\uFF09"] }), _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("th", { style: th, children: "\u540D\u79F0" }), _jsx("th", { style: { ...th, textAlign: 'right' }, children: "Token \u6D88\u8017" }), _jsx("th", { style: { ...th, textAlign: 'right' }, children: "\u8C03\u7528\u6B21\u6570" }), _jsx("th", { style: { ...th, textAlign: 'right' }, children: "\u5E73\u5747\u8017\u65F6" })] }) }), _jsxs("tbody", { children: [list.length === 0 && _jsx("tr", { children: _jsx("td", { colSpan: 4, style: { padding: 20, textAlign: 'center', color: 'var(--text-dim)' }, children: "\u6682\u65E0\u6570\u636E" }) }), list.map(function (item, i) {
                                    const pct = Math.min(100, item.tokens / Math.max(1, totalTokens) * 100);
                                    const avgMs = (item.total_ms / Math.max(1, item.calls) / 1000).toFixed(2);
                                    return (_jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("td", { style: td, children: nameMap(item.name) }), _jsxs("td", { style: { ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }, children: [_jsx("div", { style: { height: 4, background: 'var(--bg-input)', borderRadius: 2, marginBottom: 3 }, children: _jsx("div", { style: { height: '100%', width: pct + '%', background: color, borderRadius: 2 } }) }), item.tokens.toLocaleString()] }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }, children: item.calls }), _jsxs("td", { style: { ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }, children: [avgMs, "s"] })] }, i));
                                })] })] }) })] }));
}
// ── B8: 主机指标卡片 ──
function HostMetricsCard({ host }) {
    if (!host)
        return null;
    var m = host.metrics || {};
    var bars = [
        { label: 'CPU', pct: m.cpu_percent || 0, color: '#548cf0' },
        { label: '内存', pct: m.memory_percent || 0, color: '#5cb878' },
        { label: '磁盘', pct: m.disk_percent || 0, color: '#e8a450' },
    ];
    return (_jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', marginBottom: 16 }, children: [_jsx("h3", { style: { fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', color: 'var(--blue)' }, children: "\uD83D\uDDA5 \u4E3B\u673A\u8D44\u6E90" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }, children: bars.map(function (b) {
                    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 11, color: 'var(--text-dim)' }, children: b.label }), _jsxs("span", { style: { fontSize: 11, fontFamily: 'var(--font-mono)', color: b.color, fontWeight: 600 }, children: [b.pct, "%"] })] }), _jsx("div", { style: { height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }, children: _jsx("div", { style: { height: '100%', width: b.pct + '%', background: b.color, borderRadius: 4, transition: 'width 0.5s' } }) }), b.label === '内存' && m.memory_used_gb !== undefined && (_jsxs("div", { style: { fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }, children: [m.memory_used_gb, " / ", m.memory_total_gb, " GB"] })), b.label === '磁盘' && m.disk_used_gb !== undefined && (_jsxs("div", { style: { fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }, children: [m.disk_used_gb, " / ", m.disk_total_gb, " GB"] }))] }, b.label));
                }) })] }));
}
// ── 延迟百分位卡片 ──
function LatencyCard({ latency }) {
    if (!latency)
        return null;
    var items = [
        { label: 'P50', value: latency.p50_ms ? (latency.p50_ms / 1000).toFixed(2) + 's' : '-', color: '#5cb878' },
        { label: 'P95', value: latency.p95_ms ? (latency.p95_ms / 1000).toFixed(2) + 's' : '-', color: '#e8a450' },
        { label: 'P99', value: latency.p99_ms ? (latency.p99_ms / 1000).toFixed(2) + 's' : '-', color: '#e05555' },
        { label: '平均', value: latency.avg_ms ? (latency.avg_ms / 1000).toFixed(2) + 's' : '-', color: '#548cf0' },
    ];
    return (_jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', marginBottom: 16 }, children: [_jsxs("h3", { style: { fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', color: 'var(--blue)' }, children: ["\u23F1 \u5EF6\u8FDF\u5206\u6790\uFF08", latency.sample_count || 0, " \u6837\u672C\uFF09"] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }, children: items.map(function (item) {
                    return (_jsxs("div", { style: { background: 'var(--bg-input)', borderRadius: 6, padding: '12px 10px', textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }, children: item.label }), _jsx("div", { style: { fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: item.color }, children: item.value })] }, item.label));
                }) }), latency.p50_ms > 0 && (_jsxs("div", { style: { marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("span", { style: { fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }, children: ["\u6700\u5C0F ", latency.min_ms ? (latency.min_ms / 1000).toFixed(2) + 's' : '-'] }), _jsx("div", { style: { flex: 1, height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden', position: 'relative' }, children: latency.max_ms > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { style: { position: 'absolute', left: '50%', height: '100%', width: 2, background: '#5cb878', borderRadius: 1 }, title: "P50" }), _jsx("div", { style: { position: 'absolute', left: '95%', height: '100%', width: 2, background: '#e8a450', borderRadius: 1 }, title: "P95" }), _jsx("div", { style: { position: 'absolute', left: '99%', height: '100%', width: 2, background: '#e05555', borderRadius: 1 }, title: "P99" })] })) }), _jsxs("span", { style: { fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }, children: ["\u6700\u5927 ", latency.max_ms ? (latency.max_ms / 1000).toFixed(2) + 's' : '-'] })] }))] }));
}
export default function MonitoringDashboard() {
    const [breakdown, setBreakdown] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [live, setLive] = useState({});
    const [rankings, setRankings] = useState([]);
    const [rankDim, setRankDim] = useState('agent');
    const [statusFilter, setStatusFilter] = useState('all');
    const [latency, setLatency] = useState(null);
    const fetchAll = function () {
        var sessionUrl = statusFilter && statusFilter !== 'all'
            ? '/api/metrics/sessions?limit=200&status=' + statusFilter
            : '/api/metrics/sessions?limit=200';
        Promise.all([
            safeFetch('/api/metrics/entity-breakdown?minutes=1440').then(function (r) { return r.data; }),
            safeFetch(sessionUrl).then(function (r) { return r.data; }),
            safeFetch('/api/metrics/live?minutes=1440').then(function (r) { return r.data; }),
            safeFetch('/api/metrics/rankings?dimension=' + rankDim + '&top=10&minutes=1440').then(function (r) { return r.data; }),
            safeFetch('/api/runtime/stats?days=7').then(function (r) { return r.data; }).catch(function () { return null; }),
        ]).then(function (results) {
            setBreakdown(results[0]);
            setSessions((results[1] && results[1].sessions) || []);
            setLive(results[2] || {});
            setRankings(Array.isArray(results[3]) ? results[3] : []);
            setLatency((results[4] && results[4].latency) || null);
        }).catch(function () { });
    };
    const intervalRef = useRef(null);
    useEffect(function () {
        fetchAll();
        intervalRef.current = setInterval(fetchAll, 30000);
        return function () {
            if (intervalRef.current)
                clearInterval(intervalRef.current);
        };
    }, [statusFilter]); // rankDim 变化不重新 fetchAll（tab 切换 0 次调用）
    // 汇总计算
    var allItems = (breakdown?.tools || []).concat(breakdown?.workflows || []).concat(breakdown?.agents || []).concat(breakdown?.projects || []);
    var totalTokens = allItems.reduce(function (s, i) { return s + i.tokens; }, 0);
    var totalCalls = allItems.reduce(function (s, i) { return s + i.calls; }, 0);
    var totalMs = allItems.reduce(function (s, i) { return s + i.total_ms; }, 0);
    var avgMs = totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0;
    // 模型消耗统计（从 live.by_model）
    var modelItems = [];
    if (live.by_model) {
        var modelKeys = Object.keys(live.by_model);
        for (var mk = 0; mk < modelKeys.length; mk++) {
            var mn = modelKeys[mk];
            modelItems.push({ name: mn, tokens: live.by_model[mn], calls: 0, total_ms: 0 });
        }
    }
    for (var mi = 0; mi < modelItems.length; mi++) {
        var mc = 0;
        var mm = 0;
        for (var si = 0; si < sessions.length; si++) {
            if (sessions[si].model_name === modelItems[mi].name) {
                mc++;
                mm += sessions[si].duration_ms || 0;
            }
        }
        modelItems[mi].calls = mc;
        modelItems[mi].total_ms = mm;
    }
    // 命中率统计
    var hitItems = [];
    var toolHitMap = {};
    for (var si2 = 0; si2 < sessions.length; si2++) {
        var s = sessions[si2];
        var tn = s.tool_name || 'unknown';
        if (!toolHitMap[tn])
            toolHitMap[tn] = { hits: 0, total: 0, ms: 0 };
        toolHitMap[tn].total++;
        toolHitMap[tn].ms += s.duration_ms || 0;
        if (s.status === 'success')
            toolHitMap[tn].hits++;
    }
    var hitKeys = Object.keys(toolHitMap);
    for (var hi = 0; hi < hitKeys.length; hi++) {
        var hk = hitKeys[hi];
        var hd = toolHitMap[hk];
        hitItems.push({ name: hk, tokens: hd.total, calls: hd.hits, total_ms: hd.ms });
    }
    hitItems.sort(function (a, b) { return b.tokens - a.tokens; });
    return (_jsxs("div", { style: { padding: 24, height: '100%', overflow: 'auto' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsxs("h1", { style: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }, children: [_jsx(BarChart3, { size: 22, style: { verticalAlign: -4, marginRight: 8 } }), "\u76D1\u63A7"] }), _jsxs("button", { onClick: fetchAll, style: { padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx(RefreshCw, { size: 13 }), " \u5237\u65B0"] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }, children: [_jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }, children: "\uD83D\uDCCA \u603B Token \u6D88\u8017" }), _jsx("div", { style: { fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#548cf0' }, children: totalTokens.toLocaleString() }), _jsxs("div", { style: { fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }, children: [allItems.length, " \u4E2A\u5B9E\u4F53"] })] }), _jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }, children: "\u23F1 \u5E73\u5747\u6267\u884C\u65F6\u95F4" }), _jsxs("div", { style: { fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#5cb878' }, children: [(avgMs / 1000).toFixed(2), "s"] }), _jsxs("div", { style: { fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }, children: ["\u603B ", totalCalls.toLocaleString(), " \u6B21\u8C03\u7528"] })] }), _jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }, children: "\uD83C\uDFAF \u5DE5\u5177\u547D\u4E2D\u6570" }), _jsx("div", { style: { fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#e8a450' }, children: totalCalls.toLocaleString() }), _jsxs("div", { style: { fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }, children: [hitItems.length, " \u79CD\u5DE5\u5177"] })] }), _jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }, children: "\uD83E\uDD16 \u6D3B\u8DC3\u6A21\u578B" }), _jsx("div", { style: { fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#b47cd8' }, children: modelItems.length }), _jsxs("div", { style: { fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }, children: [sessions.length, " \u6761\u4F1A\u8BDD"] })] })] }), _jsx(LatencyCard, { latency: latency }), _jsx(EntityTable, { title: "\uD83D\uDD27 \u5DE5\u5177\u6D88\u8017\u6392\u884C", items: breakdown?.tools, color: "#548cf0" }), _jsx(EntityTable, { title: "\uD83D\uDD00 \u5DE5\u4F5C\u6D41\u6D88\u8017\u6392\u884C", items: breakdown?.workflows, color: "#5cb878" }), _jsx(EntityTable, { title: "\uD83E\uDD16 Agent \u6D88\u8017\u6392\u884C", items: breakdown?.agents, color: "#e8a450" }), _jsx(EntityTable, { title: "\uD83C\uDFAF \u6A21\u578B\u6D88\u8017\u7EDF\u8BA1", items: modelItems, color: "#b47cd8" }), _jsx(EntityTable, { title: "\uD83D\uDCC8 \u547D\u4E2D\u7387\u7EDF\u8BA1\uFF08\u6210\u529F\u6B21\u6570/\u603B\u8C03\u7528\uFF09", items: hitItems, color: "#5dade2" }), _jsx(EntityTable, { title: "\uD83D\uDCC1 \u9879\u76EE\u6D88\u8017\u6392\u884C", items: breakdown?.projects, color: "#e05555" }), _jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, children: [_jsxs("h3", { style: { fontSize: 14, fontWeight: 600, margin: 0 }, children: ["\uD83D\uDCDC \u6700\u8FD1\u4F1A\u8BDD\u5BA1\u8BA1\u65E5\u5FD7\uFF08", sessions.length, " \u6761\uFF09"] }), _jsxs("select", { value: statusFilter, onChange: function (e) { setStatusFilter(e.target.value); }, style: {
                                    padding: '4px 8px', fontSize: 11, borderRadius: 4,
                                    border: '1px solid var(--border)', background: 'var(--bg-input)',
                                    color: 'var(--text)', cursor: 'pointer',
                                }, children: [_jsx("option", { value: "all", children: "\u5168\u90E8\u72B6\u6001" }), _jsx("option", { value: "success", children: "\u2705 \u6210\u529F" }), _jsx("option", { value: "error", children: "\u274C \u5931\u8D25" })] })] }), _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("th", { style: th, children: "\u65F6\u95F4" }), _jsx("th", { style: th, children: "\u6A21\u578B" }), _jsx("th", { style: th, children: "\u5B9E\u4F53" }), _jsx("th", { style: th, children: "\u5DE5\u5177" }), _jsx("th", { style: { ...th, textAlign: 'right' }, children: "Token" }), _jsx("th", { style: { ...th, textAlign: 'right' }, children: "\u8017\u65F6(ms)" }), _jsx("th", { style: th, children: "\u72B6\u6001" })] }) }), _jsxs("tbody", { children: [sessions.length === 0 && _jsx("tr", { children: _jsx("td", { colSpan: 7, style: { padding: 30, textAlign: 'center', color: 'var(--text-dim)' }, children: "\u6682\u65E0\u4F1A\u8BDD" }) }), sessions.map(function (s, i) {
                                            return (_jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("td", { style: td, children: s.timestamp ? s.timestamp.slice(11, 19) : '-' }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)' }, children: s.model_name }), _jsx("td", { style: td, children: s.entity_type }), _jsx("td", { style: { ...td, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }, children: nameMap(s.tool_name || '-') }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }, children: s.total_tokens ? s.total_tokens.toLocaleString() : '0' }), _jsxs("td", { style: { ...td, fontFamily: 'var(--font-mono)', textAlign: 'right', color: s.duration_ms > 5000 ? 'var(--red)' : 'var(--text)' }, children: [s.duration_ms || 0, "ms"] }), _jsx("td", { style: td, children: _jsx("span", { style: { padding: '2px 6px', borderRadius: 2, fontSize: 9, background: s.status === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: s.status === 'success' ? 'var(--green)' : 'var(--red)' }, children: s.status === 'success' ? 'OK' : 'ERR' }) })] }, i));
                                        })] })] }) })] }), _jsxs("div", { style: { marginTop: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, children: [_jsx("h2", { style: { fontSize: 16, fontWeight: 600, margin: 0 }, children: "\uD83D\uDD25 \u6D88\u8017\u6392\u884C\u699C\uFF0824h\uFF09" }), _jsx("div", { style: { display: 'flex', gap: 2, background: 'var(--bg-input)', borderRadius: 4, padding: 2 }, children: ['agent', 'workflow', 'tool', 'project'].map(d => (_jsx("button", { onClick: () => setRankDim(d), style: {
                                        padding: '3px 10px', fontSize: 11, border: 'none', borderRadius: 3, cursor: 'pointer',
                                        background: rankDim === d ? 'var(--color-primary)' : 'transparent',
                                        color: rankDim === d ? '#fff' : 'var(--text-secondary)',
                                    }, children: d === 'agent' ? '🤖 Agent' : d === 'workflow' ? '🔀 工作流' : d === 'tool' ? '🔧 工具' : '📁 项目' }, d))) })] }), _jsx("div", { style: { background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }, children: [_jsx("th", { style: { ...th, width: 40, textAlign: 'center' }, children: "#" }), _jsx("th", { style: th, children: "\u540D\u79F0" }), _jsx("th", { style: { ...th, textAlign: 'right' }, children: "Token" }), _jsx("th", { style: { ...th, textAlign: 'right' }, children: "\u8C03\u7528\u6B21\u6570" })] }) }), _jsxs("tbody", { children: [rankings.map((item, i) => (_jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("td", { style: { ...td, textAlign: 'center', fontWeight: 600, color: i < 3 ? '#f59e0b' : 'var(--text-dim)' }, children: i + 1 }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)' }, children: item.name }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)', textAlign: 'right', color: '#5cb878' }, children: item.tokens?.toLocaleString() }), _jsx("td", { style: { ...td, textAlign: 'right' }, children: item.calls })] }, i))), rankings.length === 0 && _jsx("tr", { children: _jsx("td", { colSpan: 4, style: { padding: 20, textAlign: 'center', color: 'var(--text-dim)' }, children: "\u6682\u65E0\u6392\u884C\u6570\u636E" }) })] })] }) })] })] }));
}
