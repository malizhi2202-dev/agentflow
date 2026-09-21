import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useOrchestration } from '../stores/orchestration';
export default function TopologyMonitor({ instanceId, collapsed }) {
    const { metricData, reconcileStatus, fetchMetrics, fetchDetail } = useOrchestration();
    useEffect(() => {
        fetchMetrics(instanceId, 60);
        const interval = setInterval(() => fetchMetrics(instanceId, 60), 5000);
        return () => clearInterval(interval);
    }, [instanceId]); // eslint-disable-line react-hooks/exhaustive-deps
    const m = metricData || {};
    const healthy = m.total_calls ? Math.round(m.total_calls * (m.success_rate || 0) / 100) : 0;
    const failed = (m.total_calls || 0) - healthy;
    if (collapsed) {
        return (_jsxs("div", { style: { display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }, children: [_jsxs("span", { style: { color: '#5cb878' }, children: ["\uD83D\uDFE2 ", healthy] }), _jsxs("span", { style: { color: '#e05555' }, children: ["\uD83D\uDD34 ", failed] }), _jsxs("span", { style: { color: 'var(--text-muted)' }, children: [m.total_tokens?.toLocaleString() || 0, " tokens"] })] }));
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', gap: 12 }, children: [_jsxs("div", { className: "stat", style: { flex: 1 }, children: [_jsx("span", { className: "stat-value", style: { color: '#5cb878', fontSize: 20 }, children: healthy }), _jsx("span", { className: "stat-label", children: "\u5065\u5EB7" })] }), _jsxs("div", { className: "stat", style: { flex: 1 }, children: [_jsx("span", { className: "stat-value", style: { color: '#e05555', fontSize: 20 }, children: failed }), _jsx("span", { className: "stat-label", children: "\u5F02\u5E38" })] }), _jsxs("div", { className: "stat", style: { flex: 1 }, children: [_jsx("span", { className: "stat-value", style: { color: '#e8a450', fontSize: 20 }, children: m.total_calls || 0 }), _jsx("span", { className: "stat-label", children: "\u603B\u8C03\u7528" })] }), _jsxs("div", { className: "stat", style: { flex: 1 }, children: [_jsx("span", { className: "stat-value", style: { color: 'var(--text)', fontSize: 20 }, children: (m.total_tokens || 0).toLocaleString() }), _jsx("span", { className: "stat-label", children: "Tokens" })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }, children: [_jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 4 }, children: [_jsx("span", { style: { width: 7, height: 7, borderRadius: '50%', backgroundColor: '#5cb878', display: 'inline-block' } }), "\u5065\u5EB7"] }), _jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 4 }, children: [_jsx("span", { style: { width: 7, height: 7, borderRadius: '50%', backgroundColor: '#e05555', display: 'inline-block' } }), "\u5F02\u5E38"] }), _jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 4 }, children: [_jsx("span", { style: { width: 7, height: 7, borderRadius: '50%', backgroundColor: '#e8a450', display: 'inline-block' } }), "\u7B49\u5F85"] }), _jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 4 }, children: [_jsx("span", { style: { width: 7, height: 7, borderRadius: '50%', backgroundColor: '#5d6068', display: 'inline-block' } }), "\u672A\u542F\u52A8"] })] })] }));
}
