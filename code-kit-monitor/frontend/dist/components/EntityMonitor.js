import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';
const COLORS = ['#548cf0', '#5cb878', '#e8a450', '#e05555', '#b47cd8', '#5dade2'];
function Panel({ title, data, dataKey, mode, setMode }) {
    if (!data || data.length === 0)
        return _jsx("div", { style: { padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }, children: "\u6682\u65E0\u6570\u636E" });
    return (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsx("h4", { style: { fontSize: 12, fontWeight: 600, margin: 0 }, children: title }), _jsx("div", { style: { display: 'flex', gap: 2 }, children: ['bar', 'line', 'pie'].map(m => (_jsx("button", { onClick: () => setMode(m), style: {
                                padding: '2px 6px', borderRadius: 2, border: '1px solid var(--border)',
                                background: mode === m ? 'var(--color-primary)' : 'transparent',
                                color: mode === m ? '#fff' : 'var(--text-dim)', cursor: 'pointer', fontSize: 9,
                            }, children: m === 'bar' ? '柱' : m === 'line' ? '折' : '饼' }, m))) })] }), _jsx(ResponsiveContainer, { width: "100%", height: 180, children: mode === 'bar' ? (_jsxs(BarChart, { data: data, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), _jsx(XAxis, { dataKey: "time", tick: { fontSize: 8, fill: 'var(--text-dim)' }, interval: Math.max(0, Math.floor(data.length / 8)) }), _jsx(YAxis, { tick: { fontSize: 8, fill: 'var(--text-dim)' } }), _jsx(Tooltip, { contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 } }), _jsx(Bar, { dataKey: dataKey, fill: "var(--color-primary)", radius: [1, 1, 0, 0] })] })) : mode === 'line' ? (_jsxs(LineChart, { data: data, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), _jsx(XAxis, { dataKey: "time", tick: { fontSize: 8, fill: 'var(--text-dim)' }, interval: Math.max(0, Math.floor(data.length / 8)) }), _jsx(YAxis, { tick: { fontSize: 8, fill: 'var(--text-dim)' } }), _jsx(Tooltip, { contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 } }), _jsx(Line, { type: "monotone", dataKey: dataKey, stroke: "var(--color-primary)", strokeWidth: 1.5, dot: false })] })) : (_jsxs(PieChart, { children: [_jsx(Pie, { data: data, dataKey: dataKey, nameKey: "time", cx: "50%", cy: "50%", outerRadius: 70, label: ({ time, percent }) => time ? `${time} ${(percent * 100).toFixed(0)}%` : '', children: data.map((_, i) => _jsx(Cell, { fill: COLORS[i % COLORS.length] }, i)) }), _jsx(Tooltip, { contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 } })] })) })] }));
}
export default function EntityMonitor({ entityType, entityId, entityName, onClose }) {
    const [sessions, setSessions] = useState([]);
    const [buckets, setBuckets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modes, setModes] = useState({ token: 'bar', hit: 'bar', freq: 'bar' });
    useEffect(() => {
        const uid = localStorage.getItem('current_user_id') || 'admin';
        fetch(`/api/metrics/sessions?limit=500&entity_type=${entityType}`, { headers: { 'X-User-Id': uid } })
            .then(r => r.json())
            .then(d => {
            const all = (d.sessions || []).filter((s) => s.entity_id === entityId);
            setSessions(all.slice(0, 30));
            const bm = {};
            all.forEach((s) => {
                const d = new Date(s.timestamp);
                const ts = Math.floor(d.getTime() / 1000 / 300) * 300;
                if (!bm[ts])
                    bm[ts] = { ts, time: d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'), token_count: 0, hit_count: 0, freq_count: 0 };
                bm[ts].token_count += s.total_tokens || 0;
                bm[ts].hit_count += s.tool_calls || 0;
                bm[ts].freq_count += 1;
            });
            setBuckets(Object.values(bm).sort((a, b) => a.ts - b.ts));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [entityType, entityId]);
    const totalTokens = sessions.reduce((s, x) => s + (x.total_tokens || 0), 0);
    const totalMs = sessions.reduce((s, x) => s + (x.duration_ms || 0), 0);
    const avgMs = sessions.length > 0 ? Math.round(totalMs / sessions.length) : 0;
    return (_jsx("div", { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }, children: _jsxs("div", { style: { background: 'var(--bg-elevated, #1a1d24)', borderRadius: 12, padding: 24, width: '85vw', maxWidth: 900, maxHeight: '85vh', overflow: 'auto' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsxs("h2", { style: { fontFamily: 'var(--font-display)', fontSize: 18, margin: 0 }, children: ["\uD83D\uDCCA ", entityName, " \u2014 \u76D1\u63A7"] }), _jsx("button", { onClick: onClose, style: { padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }, children: _jsx(X, { size: 20 }) })] }), loading ? _jsx("div", { style: { textAlign: 'center', padding: 40, color: 'var(--text-dim)' }, children: "\u52A0\u8F7D\u4E2D..." }) : (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }, children: [
                                { v: totalTokens.toLocaleString(), l: 'Token 消耗' },
                                { v: sessions.length.toString(), l: '调用次数' },
                                { v: (totalMs / 1000).toFixed(1) + 's', l: '总执行时间' },
                                { v: (avgMs / 1000).toFixed(2) + 's', l: '平均执行时间' },
                            ].map((c, i) => (_jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 6, padding: 10, border: '1px solid var(--border)', textAlign: 'center' }, children: [_jsx("div", { style: { fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }, children: c.v }), _jsx("div", { style: { fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }, children: c.l })] }, i))) }), _jsx(Panel, { title: "\uD83D\uDCC8 Token \u6D88\u8017\uFF085\u5206\u949F\u7C92\u5EA6\uFF09", data: buckets, dataKey: "token_count", mode: modes.token, setMode: (m) => setModes({ ...modes, token: m }) }), _jsx(Panel, { title: "\uD83D\uDD27 \u5DE5\u5177\u547D\u4E2D\u6B21\u6570\uFF085\u5206\u949F\u7C92\u5EA6\uFF09", data: buckets, dataKey: "hit_count", mode: modes.hit, setMode: (m) => setModes({ ...modes, hit: m }) }), _jsx(Panel, { title: "\uD83D\uDCCA \u88AB\u4F7F\u7528\u9891\u6B21\uFF085\u5206\u949F\u7C92\u5EA6\uFF09", data: buckets, dataKey: "freq_count", mode: modes.freq, setMode: (m) => setModes({ ...modes, freq: m }) }), _jsxs("div", { children: [_jsx("h4", { style: { fontSize: 12, fontWeight: 600, margin: '0 0 8px 0' }, children: "\uD83D\uDCDC \u6267\u884C\u5BA1\u8BA1\u65E5\u5FD7" }), _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 10 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("th", { style: th, children: "\u65F6\u95F4" }), _jsx("th", { style: th, children: "\u6A21\u578B" }), _jsx("th", { style: th, children: "\u5DE5\u5177" }), _jsx("th", { style: th, children: "Token" }), _jsx("th", { style: th, children: "\u8017\u65F6" }), _jsx("th", { style: th, children: "\u72B6\u6001" })] }) }), _jsx("tbody", { children: sessions.map((s, i) => (_jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("td", { style: td, children: s.timestamp?.slice(11, 19) }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)' }, children: s.model_name }), _jsx("td", { style: td, children: s.tool_name || '-' }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }, children: s.total_tokens?.toLocaleString() }), _jsxs("td", { style: { ...td, fontFamily: 'var(--font-mono)' }, children: [(s.duration_ms / 1000).toFixed(1), "s"] }), _jsx("td", { style: td, children: _jsx("span", { style: { padding: '1px 4px', borderRadius: 2, fontSize: 9, background: s.status === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: s.status === 'success' ? 'var(--green)' : 'var(--red)' }, children: s.status === 'success' ? 'OK' : 'ERR' }) })] }, i))) })] })] })] }))] }) }));
}
const th = { padding: '4px 6px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontSize: 9 };
const td = { padding: '3px 6px', fontSize: 10, color: 'var(--color-text)' };
