import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef, useCallback } from 'react';
import { Activity, Zap, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import StatsTab from '../components/StatsTab';
const AGENT_ICONS = { 'claude-code': '◈', 'codex': '⬡', 'hermes': '⚚', 'xiaolongxia': '🦞' };
const STAGE_NAMES = {
    '0-change': '变更提案', '1-requirement': '需求分析', '2-design': '技术设计',
    '2a-ui-design': 'UI设计', '3-task': '任务拆分', '4-dev': '开发执行',
    '5-test': '测试验证', '6-review': '代码审查', '7-integration': '集成归档',
};
const STATUS_CONFIG = {
    success: { label: '成功', color: 'var(--green)', bg: 'var(--green-bg)' },
    error: { label: '失败', color: 'var(--red)', bg: 'var(--red-bg)' },
    running: { label: '运行中', color: 'var(--blue)', bg: 'var(--blue-bg)' },
};
export default function Runtime() {
    const [sessions, setSessions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [tab, setTab] = useState('sessions');
    const [statusFilter, setStatusFilter] = useState('all');
    const [realtime, setRealtime] = useState(false);
    const [retrying, setRetrying] = useState(new Set());
    const eventSourceRef = useRef(null);
    const fetchData = useCallback(() => {
        fetch('/api/runtime/summary').then(r => r.json()).then(setSummary);
        const url = statusFilter && statusFilter !== 'all'
            ? `/api/runtime/sessions?status=${statusFilter}`
            : '/api/runtime/sessions';
        fetch(url).then(r => r.json()).then(d => setSessions(d.sessions || []));
    }, [statusFilter]);
    useEffect(() => {
        fetchData();
        if (!realtime) {
            const t = setInterval(fetchData, 30000);
            return () => clearInterval(t);
        }
    }, [fetchData, realtime]);
    // SSE 实时订阅
    useEffect(() => {
        if (!realtime) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            return;
        }
        const es = new EventSource('/api/runtime/stream');
        eventSourceRef.current = es;
        es.addEventListener('session_started', (e) => {
            try {
                const data = JSON.parse(e.data);
                setSessions(prev => {
                    // 去重
                    if (prev.find(s => s.session_id === data.session_id))
                        return prev;
                    return [data, ...prev];
                });
            }
            catch { }
        });
        es.addEventListener('agent_status_changed', (e) => {
            try {
                const data = JSON.parse(e.data);
                setSessions(prev => prev.map(s => s.session_id === data.session_id ? { ...s, status: data.new_status } : s));
            }
            catch { }
        });
        es.addEventListener('session_completed', (e) => {
            try {
                const data = JSON.parse(e.data);
                setSessions(prev => prev.map(s => s.session_id === data.session_id ? { ...s, status: 'success' } : s));
            }
            catch { }
        });
        es.onerror = () => {
            // SSE 断连后 5s 自动重连
            es.close();
            setTimeout(() => {
                if (realtime)
                    fetchData();
            }, 5000);
        };
        return () => {
            es.close();
        };
    }, [realtime, fetchData]);
    const openDetail = async (sid) => {
        setSelected(sid);
        const res = await fetch(`/api/runtime/sessions/${sid}`);
        setDetail(await res.json());
    };
    const handleRetry = async (sid, e) => {
        e.stopPropagation();
        setRetrying(prev => new Set(prev).add(sid));
        try {
            const res = await fetch(`/api/runtime/sessions/${sid}/retry`, { method: 'POST' });
            const data = await res.json();
            if (!data.error) {
                // 刷新列表
                fetchData();
            }
        }
        catch { }
        finally {
            setRetrying(prev => {
                const next = new Set(prev);
                next.delete(sid);
                return next;
            });
        }
    };
    const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
    // 过滤后的会话列表
    const filteredSessions = sessions.filter(s => {
        if (!statusFilter || statusFilter === 'all')
            return true;
        return s.status === statusFilter;
    });
    return (_jsxs("div", { style: { padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsx("h1", { style: { fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }, children: "\u8FD0\u884C\u65F6" }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsxs("button", { className: `btn btn-sm ${realtime ? 'btn-primary' : ''}`, onClick: () => setRealtime(!realtime), style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [realtime ? _jsx(Loader2, { size: 12, style: { animation: 'spin 1s linear infinite' } }) : '🟢', realtime ? '实时' : '实时'] }), _jsxs("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), style: {
                                    padding: '4px 8px', fontSize: 12, borderRadius: 4,
                                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                                    color: 'var(--text)', cursor: 'pointer',
                                }, children: [_jsx("option", { value: "all", children: "\u5168\u90E8\u72B6\u6001" }), _jsx("option", { value: "running", children: "\uD83D\uDFE2 \u8FD0\u884C\u4E2D" }), _jsx("option", { value: "success", children: "\u2705 \u6210\u529F" }), _jsx("option", { value: "error", children: "\u274C \u5931\u8D25" })] }), _jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsx("button", { className: `btn btn-sm ${tab === 'sessions' ? 'btn-primary' : ''}`, onClick: () => setTab('sessions'), children: "\uD83D\uDCCB \u4F1A\u8BDD" }), _jsx("button", { className: `btn btn-sm ${tab === 'stats' ? 'btn-primary' : ''}`, onClick: () => setTab('stats'), children: "\uD83D\uDCCA \u7EDF\u8BA1" })] })] })] }), tab === 'stats' ? _jsx(StatsTab, {}) : (_jsxs(_Fragment, { children: [summary && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }, children: [_jsxs("div", { className: "stat", style: { borderTop: '3px solid var(--blue)' }, children: [_jsx("div", { className: "stat-value", style: { color: 'var(--blue)' }, children: summary.sessions }), _jsx("div", { className: "stat-label", children: "\u4F1A\u8BDD" })] }), _jsxs("div", { className: "stat", style: { borderTop: '3px solid var(--green)' }, children: [_jsx("div", { className: "stat-value", style: { color: 'var(--green)' }, children: fmt(summary.total_output_tokens) }), _jsx("div", { className: "stat-label", children: "Token \u6D88\u8017" })] }), _jsxs("div", { className: "stat", style: { borderTop: '3px solid var(--purple)' }, children: [_jsx("div", { className: "stat-value", style: { color: 'var(--purple)', fontSize: 14 }, children: summary.models?.join(', ') || '-' }), _jsx("div", { className: "stat-label", children: "\u6A21\u578B" })] }), _jsxs("div", { className: "stat", style: { borderTop: '3px solid var(--orange)' }, children: [_jsx("div", { className: "stat-value", style: { color: 'var(--orange)', fontSize: 14 }, children: summary.agents?.map((a) => AGENT_ICONS[a] || a).join(' ') || '-' }), _jsx("div", { className: "stat-label", children: "Agent" })] })] })), _jsxs("div", { style: { flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }, children: [_jsx("div", { style: { width: selected ? '50%' : '100%', overflow: 'auto', borderRight: selected ? '1px solid var(--border)' : 'none', transition: 'width var(--normal) var(--ease)' }, children: filteredSessions.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: 60, color: 'var(--text-muted)' }, children: [_jsx(Activity, { size: 36, style: { marginBottom: 12, opacity: 0.1 } }), _jsx("p", { children: "\u6682\u65E0\u8FD0\u884C\u65F6\u6570\u636E" }), _jsx("p", { style: { fontSize: 12, marginTop: 4 }, children: "\u8FD0\u884C @code-kit/GO.md \u5F00\u59CB\u540E\u81EA\u52A8\u91C7\u96C6" })] })) : (filteredSessions.map(s => {
                                    const statusCfg = STATUS_CONFIG[s.status || ''] || STATUS_CONFIG.running;
                                    return (_jsxs("div", { onClick: () => openDetail(s.session_id), className: "card card-clickable", style: { marginBottom: 8, padding: '12px 14px', borderLeft: selected === s.session_id ? '3px solid var(--blue)' : '3px solid transparent' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 14 }, children: s.status === 'running' ? _jsx(Loader2, { size: 12, style: { animation: 'spin 1s linear infinite', color: 'var(--blue)' } }) : AGENT_ICONS[s.agent] || '🤖' }), _jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }, children: s.session_id.slice(0, 8) }), _jsx("span", { className: "badge badge-blue", children: s.agent }), s.model && _jsx("span", { className: "badge badge-purple", children: s.model }), _jsx("span", { style: { padding: '2px 8px', borderRadius: 2, fontSize: 10, background: statusCfg.bg, color: statusCfg.color }, children: statusCfg.label })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [_jsxs("span", { children: [_jsx(Zap, { size: 11 }), " ", fmt(s.input_tokens), " \u2192 ", fmt(s.output_tokens)] }), s.status === 'error' && (_jsxs("button", { className: "btn btn-ghost btn-xs", onClick: (e) => handleRetry(s.session_id, e), disabled: retrying.has(s.session_id), style: { color: 'var(--orange)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 2 }, children: [retrying.has(s.session_id) ? _jsx(Loader2, { size: 10, style: { animation: 'spin 1s linear infinite' } }) : _jsx(RefreshCw, { size: 10 }), "\u91CD\u8BD5"] })), _jsx(ChevronRight, { size: 12 })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }, children: [s.stage && _jsx("span", { className: "badge badge-green", children: STAGE_NAMES[s.stage] || s.stage }), s.change_id && _jsx("span", { className: "badge badge-blue", children: s.change_id }), _jsx("span", { style: { fontFamily: 'var(--font-mono)' }, children: s.timestamp?.slice(0, 16) || '' })] })] }, s.session_id));
                                })) }), selected && detail && (_jsxs("div", { style: { width: '50%', overflow: 'auto', padding: '0 16px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, children: [_jsxs("h3", { style: { fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)' }, children: [selected.slice(0, 8), "..."] }), _jsx("button", { className: "btn btn-ghost btn-xs", onClick: () => setSelected(null), children: "\u2715" })] }), detail.error ? _jsx("p", { children: detail.error }) : (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }, children: [_jsx(MiniStat, { label: "Agent", value: detail.agent }), _jsx(MiniStat, { label: "\u6A21\u578B", value: detail.models?.join?.(', ') || '-' }), _jsx(MiniStat, { label: "Token", value: `${fmt(detail.input_tokens)} → ${fmt(detail.output_tokens)}` }), _jsx(MiniStat, { label: "\u9636\u6BB5", value: STAGE_NAMES[detail.stage] || detail.stage || '-' }), detail.status && (_jsx(MiniStat, { label: "\u72B6\u6001", value: (STATUS_CONFIG[detail.status] || STATUS_CONFIG.running).label }))] }), (detail.events || []).map((e, i) => (_jsxs("div", { style: { padding: '6px 10px', marginBottom: 4, borderRadius: 'var(--r-sm)', background: 'var(--bg-card)', fontSize: 11, borderLeft: '2px solid var(--border)' }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 2 }, children: [_jsx("span", { style: { color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }, children: e.timestamp?.slice(11, 19) || '' }), e.stage && _jsx("span", { className: "badge badge-green", style: { fontSize: 9 }, children: STAGE_NAMES[e.stage] || e.stage }), e.skills?.map((s, j) => _jsx("span", { className: "badge badge-blue", style: { fontSize: 9 }, children: s }, j)), e.mcps?.map((m, j) => _jsx("span", { className: "badge badge-purple", style: { fontSize: 9 }, children: m }, j)), _jsxs("span", { style: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [fmt(e.tokens_input + e.tokens_output), " tok \u00B7 ", e.source] })] }), e.summary && _jsx("div", { style: { color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: e.summary })] }, i)))] }))] }))] })] }))] }));
}
function MiniStat({ label, value }) {
    return (_jsxs("div", { className: "stat", style: { padding: '8px 12px' }, children: [_jsx("div", { className: "stat-label", children: label }), _jsx("div", { style: { fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text)' }, children: value })] }));
}
