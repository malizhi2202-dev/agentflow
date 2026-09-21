import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
export default function HealthTab({ changeId: _changeId }) {
    const [issues, setIssues] = useState([]);
    const [securityAlerts, setSecurityAlerts] = useState([]);
    useEffect(() => {
        fetch('/api/health').then((r) => r.json()).then((d) => {
            setIssues(d.issues || []);
        }).catch(() => { });
        // 安全告警模拟（扫描 TEST.md 安全轮次）
        fetch(`/api/changes/${_changeId}/TEST`).then((r) => r.json()).then((d) => {
            if (d.content && (d.content.includes('trufflehog') || d.content.includes('gitleaks'))) {
                setSecurityAlerts(['安全扫描命中，请检查 TEST.md 第 3 轮详情']);
            }
        }).catch(() => { });
    }, [_changeId]);
    const changeIssues = issues.filter((i) => i.change_id === _changeId);
    const allGood = changeIssues.length === 0 && securityAlerts.length === 0;
    return (_jsxs("div", { "aria-live": "polite", children: [allGood && (_jsxs("div", { style: { background: 'var(--color-surface)', border: '2px solid var(--color-success)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { color: 'var(--color-success)', fontSize: 20 }, children: "\u2705" }), _jsx("span", { style: { fontFamily: 'var(--font-display)', fontSize: 14 }, children: "\u6570\u636E\u4E00\u81F4\u6027\u6821\u9A8C\u901A\u8FC7\uFF0C\u65E0\u5B89\u5168\u544A\u8B66" })] })), securityAlerts.map((a, i) => (_jsxs("div", { style: { background: 'var(--color-surface)', borderLeft: '3px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Shield, { size: 16, color: "var(--color-danger)" }), _jsxs("span", { style: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text)' }, children: ["\uD83D\uDD34 ", a] })] }, `sec-${i}`))), changeIssues.map((issue, i) => {
                const icon = issue.type === 'missing_summary' ? '📄' : issue.type === 'missing_ui_design' ? '🎨' : '📋';
                return (_jsxs("div", { style: { background: 'var(--color-surface)', borderLeft: '3px solid var(--color-warning)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(AlertTriangle, { size: 14, color: "var(--color-warning)" }), _jsx("span", { style: { fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer' }, onClick: () => window.open(`/api/changes/${issue.change_id}`, '_blank'), children: issue.change_id }), _jsxs("span", { style: { fontSize: 13, color: 'var(--color-text-secondary)' }, children: [icon, " ", issue.type, ": ", issue.detail] })] }, i));
            })] }));
}
