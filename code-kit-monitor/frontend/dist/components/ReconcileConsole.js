import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from 'react';
import { ScrollText, Filter, RefreshCw, AlertTriangle, CheckCircle2, Clock, Search, ChevronDown, ChevronRight, XCircle, } from 'lucide-react';
import { useControlPlane } from '../stores/controlPlane';
const LEVEL_MAP = {
    safe: {
        label: '正常',
        color: '#5cb878',
        bg: 'rgba(92,184,120,0.08)',
        border: 'rgba(92,184,120,0.3)',
        icon: _jsx(CheckCircle2, { size: 14 }),
    },
    caution: {
        label: '注意',
        color: '#e8a450',
        bg: 'rgba(232,164,80,0.08)',
        border: 'rgba(232,164,80,0.3)',
        icon: _jsx(AlertTriangle, { size: 14 }),
    },
    dangerous: {
        label: '危险',
        color: '#dc2626',
        bg: 'rgba(220,38,38,0.08)',
        border: 'rgba(220,38,38,0.3)',
        icon: _jsx(XCircle, { size: 14 }),
    },
};
/**
 * 根据对账条目判断严重级别
 */
function classifyEntry(entry) {
    if (!entry.drift_detected && entry.status === 'ok')
        return 'safe';
    if (entry.drift_detected && entry.status === 'reconciled')
        return 'caution';
    if (entry.status === 'error' || entry.status === 'failed')
        return 'dangerous';
    if (entry.drift_detected)
        return 'caution';
    return 'safe';
}
/**
 * ReconcileConsole — 对账控制台
 * - 时间线列表，每条记录按严重程度着色
 * - 绿色 = 安全，黄色 = 注意，红色 = 危险
 * - 支持筛选（级别、编排名称搜索）
 * - 统计摘要条
 */
export default function ReconcileConsole() {
    const { reconcile, loading, fetchReconcile } = useControlPlane();
    const [filterLevel, setFilterLevel] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [expanded, setExpanded] = useState(true);
    useEffect(() => {
        fetchReconcile();
    }, [fetchReconcile]);
    // ── 筛选+排序 ──
    const filteredEntries = useMemo(() => {
        let list = [...reconcile];
        // 按级别筛选
        if (filterLevel !== 'all') {
            list = list.filter((e) => classifyEntry(e) === filterLevel);
        }
        // 按搜索词筛选
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter((e) => e.orchestration_name.toLowerCase().includes(q) ||
                (e.message || '').toLowerCase().includes(q) ||
                e.status.toLowerCase().includes(q));
        }
        // 排序
        list.sort((a, b) => {
            const cmp = (a.created_at || '').localeCompare(b.created_at || '');
            return sortOrder === 'desc' ? -cmp : cmp;
        });
        return list;
    }, [reconcile, filterLevel, searchQuery, sortOrder]);
    // ── 统计 ──
    const stats = useMemo(() => {
        const counts = { safe: 0, caution: 0, dangerous: 0, total: reconcile.length };
        for (const e of reconcile) {
            counts[classifyEntry(e)]++;
        }
        return counts;
    }, [reconcile]);
    const toggleExpand = (id) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    // ── 样式 ──
    const panel = {
        background: 'var(--bg-card, #181a1f)',
        borderRadius: 8,
        padding: 16,
        border: '1px solid var(--border-normal, #2a2d35)',
        marginBottom: 12,
    };
    const sectionTitle = {
        fontSize: 13,
        fontWeight: 600,
        margin: '0 0 12px 0',
        color: 'var(--color-text)',
    };
    // ── 加载态 ──
    if (reconcile.length === 0 && loading) {
        return (_jsxs("div", { style: { padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }, children: [_jsx(RefreshCw, { size: 14, style: { animation: 'spin 1s linear infinite' } }), " \u5BF9\u8D26\u6570\u636E\u52A0\u8F7D\u4E2D..."] }));
    }
    return (_jsxs("div", { children: [_jsxs("div", { style: {
                    ...panel,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                }, children: [_jsxs("h3", { style: { ...sectionTitle, margin: 0 }, children: [_jsx(ScrollText, { size: 16, style: { verticalAlign: -3, marginRight: 6 } }), "\u5BF9\u8D26\u63A7\u5236\u53F0"] }), _jsxs("div", { style: { display: 'flex', gap: 12 }, children: [_jsx(StatPill, { icon: _jsx(CheckCircle2, { size: 12 }), label: "\u5B89\u5168", count: stats.safe, color: "#5cb878" }), _jsx(StatPill, { icon: _jsx(AlertTriangle, { size: 12 }), label: "\u6CE8\u610F", count: stats.caution, color: "#e8a450" }), _jsx(StatPill, { icon: _jsx(XCircle, { size: 12 }), label: "\u5371\u9669", count: stats.dangerous, color: "#dc2626" }), _jsx(StatPill, { icon: null, label: "\u603B\u8BA1", count: stats.total, color: "var(--text-dim)" })] })] }), _jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                    flexWrap: 'wrap',
                }, children: [_jsxs("div", { style: { position: 'relative', flex: '1 1 200px', maxWidth: 320 }, children: [_jsx(Search, { size: 12, style: {
                                    position: 'absolute',
                                    left: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-dim)',
                                } }), _jsx("input", { value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "\u641C\u7D22\u7F16\u6392\u540D\u79F0\u6216\u6D88\u606F...", style: {
                                    width: '100%',
                                    padding: '6px 8px 6px 28px',
                                    background: 'var(--bg-input, #1e2130)',
                                    color: 'var(--color-text)',
                                    border: '1px solid var(--color-border, #2a2d35)',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    boxSizing: 'border-box',
                                } })] }), _jsxs("select", { value: filterLevel, onChange: (e) => setFilterLevel(e.target.value), style: {
                            padding: '6px 10px',
                            background: 'var(--bg-input, #1e2130)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-border, #2a2d35)',
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: 'pointer',
                        }, children: [_jsx("option", { value: "all", children: "\uD83D\uDFE2\uD83D\uDFE1\uD83D\uDD34 \u5168\u90E8\u7EA7\u522B" }), _jsx("option", { value: "safe", children: "\uD83D\uDFE2 \u5B89\u5168" }), _jsx("option", { value: "caution", children: "\uD83D\uDFE1 \u6CE8\u610F" }), _jsx("option", { value: "dangerous", children: "\uD83D\uDD34 \u5371\u9669" })] }), _jsxs("button", { onClick: () => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc')), style: {
                            padding: '6px 10px',
                            fontSize: 10,
                            background: 'var(--bg-input, #1e2130)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--color-border, #2a2d35)',
                            borderRadius: 4,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }, children: [_jsx(Clock, { size: 12 }), sortOrder === 'desc' ? '最新优先' : '最早优先'] }), _jsxs("button", { onClick: () => fetchReconcile(), style: {
                            padding: '6px 10px',
                            fontSize: 10,
                            background: 'none',
                            border: '1px solid var(--color-border, #2a2d35)',
                            borderRadius: 4,
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }, children: [_jsx(RefreshCw, { size: 12 }), " \u5237\u65B0"] })] }), _jsx("div", { style: panel, children: filteredEntries.length === 0 ? (_jsxs("div", { style: {
                        padding: 30,
                        textAlign: 'center',
                        color: 'var(--text-dim)',
                        fontSize: 12,
                    }, children: [_jsx(Filter, { size: 20, style: { marginBottom: 8, display: 'block', margin: '0 auto 8px auto' } }), "\u6682\u65E0\u7B26\u5408\u6761\u4EF6\u7684\u5BF9\u8D26\u8BB0\u5F55"] })) : (_jsx("div", { style: {
                        position: 'relative',
                        paddingLeft: 28,
                        borderLeft: '2px solid var(--color-border, #2a2d35)',
                        marginLeft: 6,
                    }, children: filteredEntries.map((entry, idx) => {
                        const level = classifyEntry(entry);
                        const meta = LEVEL_MAP[level];
                        const isExpanded = expandedIds.has(entry.id);
                        const isLast = idx === filteredEntries.length - 1;
                        return (_jsxs("div", { style: {
                                position: 'relative',
                                marginBottom: isLast ? 0 : 12,
                                padding: '10px 14px',
                                background: meta.bg,
                                border: `1px solid ${meta.border}`,
                                borderRadius: 6,
                            }, children: [_jsx("div", { style: {
                                        position: 'absolute',
                                        left: -36,
                                        top: 14,
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        background: meta.color,
                                        border: '2px solid var(--bg-card, #181a1f)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    } }), _jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                    }, onClick: () => toggleExpand(entry.id), children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { color: meta.color }, children: meta.icon }), _jsx("span", { style: {
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: 'var(--color-text)',
                                                    }, children: entry.orchestration_name }), _jsx("span", { style: {
                                                        fontSize: 9,
                                                        padding: '1px 8px',
                                                        borderRadius: 8,
                                                        background: meta.bg,
                                                        color: meta.color,
                                                        border: `1px solid ${meta.border}`,
                                                        fontWeight: 500,
                                                    }, children: meta.label }), entry.drift_detected && (_jsxs("span", { style: {
                                                        fontSize: 9,
                                                        padding: '1px 6px',
                                                        borderRadius: 4,
                                                        background: 'rgba(232,164,80,0.12)',
                                                        color: '#e8a450',
                                                    }, children: [_jsx(AlertTriangle, { size: 9, style: { verticalAlign: -1 } }), " \u6F02\u79FB"] }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: {
                                                        fontSize: 9,
                                                        fontFamily: 'var(--font-mono, monospace)',
                                                        color: 'var(--text-dim)',
                                                    }, children: entry.created_at || '-' }), isExpanded ? _jsx(ChevronDown, { size: 12, color: "var(--text-dim)" }) : _jsx(ChevronRight, { size: 12, color: "var(--text-dim)" })] })] }), isExpanded && (_jsxs("div", { style: {
                                        marginTop: 8,
                                        paddingTop: 8,
                                        borderTop: `1px solid ${meta.border}`,
                                    }, children: [_jsxs("div", { style: {
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: 8,
                                                fontSize: 10,
                                            }, children: [_jsxs("div", { children: [_jsx("span", { style: { color: 'var(--text-dim)' }, children: "\u7F16\u6392 ID\uFF1A" }), _jsx("span", { style: { color: 'var(--color-text)', fontFamily: 'var(--font-mono, monospace)' }, children: entry.orchestration_id })] }), _jsxs("div", { children: [_jsx("span", { style: { color: 'var(--text-dim)' }, children: "\u72B6\u6001\uFF1A" }), _jsx("span", { style: { color: meta.color, fontWeight: 500 }, children: entry.status })] }), _jsxs("div", { children: [_jsx("span", { style: { color: 'var(--text-dim)' }, children: "\u6F02\u79FB\u68C0\u6D4B\uFF1A" }), _jsx("span", { style: {
                                                                color: entry.drift_detected ? '#e8a450' : '#5cb878',
                                                                fontWeight: 500,
                                                            }, children: entry.drift_detected ? '⚠ 检测到漂移' : '✓ 无漂移' })] }), _jsxs("div", { children: [_jsx("span", { style: { color: 'var(--text-dim)' }, children: "\u8BB0\u5F55 ID\uFF1A" }), _jsx("span", { style: { color: 'var(--color-text)', fontFamily: 'var(--font-mono, monospace)' }, children: entry.id })] })] }), entry.message && (_jsx("div", { style: {
                                                marginTop: 8,
                                                padding: '8px 10px',
                                                background: 'var(--bg-input, #1e2130)',
                                                borderRadius: 4,
                                                fontSize: 10,
                                                color: 'var(--text-secondary)',
                                                fontFamily: 'var(--font-mono, monospace)',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                maxHeight: 120,
                                                overflowY: 'auto',
                                            }, children: entry.message }))] }))] }, entry.id));
                    }) })) })] }));
}
/** 统计小药丸 */
function StatPill({ icon, label, count, color, }) {
    return (_jsxs("div", { style: {
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 14,
            background: 'var(--bg-input, #1e2130)',
            border: `1px solid ${color}`,
        }, children: [icon && _jsx("span", { style: { color }, children: icon }), _jsx("span", { style: { fontSize: 10, color: 'var(--text-dim)' }, children: label }), _jsx("span", { style: {
                    fontSize: 12,
                    fontWeight: 700,
                    color,
                    fontFamily: 'var(--font-mono, monospace)',
                }, children: count })] }));
}
