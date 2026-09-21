import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useOrchestration } from '../stores/orchestration';
import { ChevronDown, ChevronRight } from 'lucide-react';
export default function TraceViewer({ instanceId }) {
    const { traceSpans, fetchTrace } = useOrchestration();
    const [expandedId, setExpandedId] = useState(null);
    useEffect(() => {
        fetchTrace(instanceId);
    }, [instanceId]); // eslint-disable-line react-hooks/exhaustive-deps
    if (traceSpans.length === 0) {
        return _jsx("p", { style: { fontSize: 12, color: 'var(--text-muted)', padding: 16, textAlign: 'center' }, children: "\u6682\u65E0\u8C03\u7528\u94FE\u6570\u636E" });
    }
    const maxDuration = Math.max(...traceSpans.map((s) => s.duration_ms), 1);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4, padding: 12 }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }, children: "\u8C03\u7528\u94FE\u8FFD\u8E2A" }), traceSpans.map((span) => {
                const widthPct = Math.max((span.duration_ms / maxDuration) * 100, 3);
                const isExpanded = expandedId === span.id;
                return (_jsxs("div", { children: [_jsxs("div", { onClick: () => setExpandedId(isExpanded ? null : span.id), style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }, children: [isExpanded ? _jsx(ChevronDown, { size: 10 }) : _jsx(ChevronRight, { size: 10 }), _jsxs("span", { style: { fontSize: 11, fontFamily: "'JetBrains Mono', monospace", minWidth: 28 }, children: ["A", span.from_agent_id || 'in'] }), _jsx("span", { style: { color: 'var(--text-muted)' }, children: "\u2192" }), _jsxs("span", { style: { fontSize: 11, fontFamily: "'JetBrains Mono', monospace", minWidth: 28 }, children: ["A", span.to_agent_id] }), _jsxs("div", { style: {
                                        width: `${widthPct}%`,
                                        minWidth: 20,
                                        height: 18,
                                        background: 'rgba(84,140,240,0.2)',
                                        border: '1px solid rgba(84,140,240,0.5)',
                                        borderRadius: 'var(--r-sm)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        paddingLeft: 4,
                                        fontSize: 10,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: 'var(--blue)',
                                    }, children: [span.duration_ms, "ms"] }), _jsxs("span", { style: { fontSize: 10, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }, children: [span.tokens?.toLocaleString(), " tk"] }), _jsx("span", { style: {
                                        fontSize: 9, padding: '1px 4px', borderRadius: 3,
                                        background: span.span_type === 'retry' ? 'var(--orange-bg)' : 'var(--blue-bg)',
                                        color: span.span_type === 'retry' ? 'var(--orange)' : 'var(--blue)',
                                    }, children: span.span_type || 'call' })] }), isExpanded && (_jsxs("div", { style: { marginLeft: 36, padding: '6px 8px', background: 'var(--bg-input)', borderRadius: 'var(--r-sm)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)', maxHeight: 80, overflow: 'auto', marginBottom: 4 }, children: [_jsxs("div", { children: ["duration: ", span.duration_ms, "ms"] }), _jsxs("div", { children: ["tokens: ", span.tokens] }), _jsxs("div", { children: ["input_hash: ", span.input_hash || '-'] }), _jsxs("div", { children: ["output_hash: ", span.output_hash || '-'] })] }))] }, span.id));
            })] }));
}
