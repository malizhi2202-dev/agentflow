import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import WorkflowTab from '../components/WorkflowTab';
import TaskTab from '../components/TaskTab';
import GateTab from '../components/GateTab';
import ArtifactTab from '../components/ArtifactTab';
import HealthTab from '../components/HealthTab';
const TABS = ['工作流', 'Task', '门禁', '产物', '健康'];
export default function Detail({ changeId, onBack }) {
    const [tab, setTab] = useState('工作流');
    const [data, setData] = useState(null);
    useEffect(() => {
        fetch(`/api/changes/${changeId}`).then(r => r.json()).then(setData).catch(() => setData(null));
    }, [changeId]);
    return (_jsxs("div", { style: { padding: '20px 24px' }, children: [_jsxs("button", { onClick: onBack, className: "btn btn-ghost btn-sm", style: { marginBottom: 12 }, children: [_jsx(ArrowLeft, { size: 14 }), " \u8FD4\u56DE"] }), data && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }, children: [_jsx("h1", { style: { fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }, children: changeId }), _jsx("span", { className: `badge ${data.progress_pct === 100 ? 'badge-green' : data.interrupted ? 'badge-red' : 'badge-blue'}`, children: data.phase_name }), data.progress_pct === 100 && _jsx("span", { className: "badge badge-green", children: "\u5B8C\u6210" })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }, children: [_jsx(MiniStat, { label: "\u8FDB\u5EA6", value: `${data.progress_pct}%`, sub: data.progress, color: "var(--blue)" }), _jsx(MiniStat, { label: "\u95E8\u7981", value: `${data.gate_stats.passed}/${data.gate_stats.total}`, color: data.gate_stats.passed === data.gate_stats.total && data.gate_stats.total > 0 ? 'var(--green)' : 'var(--text-secondary)' }), _jsx(MiniStat, { label: "\u81EA\u52A8\u5316", value: `${data.task_stats.auto}🤖 ${data.task_stats.manual}👤`, color: "var(--purple)" }), _jsx(MiniStat, { label: "\u98CE\u9669", value: data.risks.length, color: data.risks.length > 0 ? 'var(--orange)' : 'var(--text-weak)' }), _jsx(MiniStat, { label: "\u5468\u671F", value: `${data.total_days ?? '?'}d`, color: "var(--text-weak)" })] })] })), _jsx("div", { style: { display: 'flex', borderBottom: '1px solid var(--border-weak)', marginBottom: 16 }, children: TABS.map(t => (_jsx("button", { className: `btn btn-ghost btn-sm`, style: {
                        borderRadius: 0, borderBottom: tab === t ? '2px solid var(--blue)' : '2px solid transparent',
                        color: tab === t ? 'var(--text-primary)' : 'var(--text-weak)', fontWeight: tab === t ? 600 : 400,
                        marginBottom: -1, padding: '8px 16px',
                    }, onClick: () => setTab(t), children: t }, t))) }), _jsx("div", { children: !data ? _jsx("p", { style: { color: 'var(--text-weak)' }, children: "\u52A0\u8F7D\u4E2D..." }) : (_jsxs(_Fragment, { children: [tab === '工作流' && _jsx(WorkflowTab, { data: data }), tab === 'Task' && _jsx(TaskTab, { tasks: data.tasks || [] }), tab === '门禁' && _jsx(GateTab, { gates: data.gates || [] }), tab === '产物' && _jsx(ArtifactTab, { changeId: changeId, artifacts: data.artifacts || [] }), tab === '健康' && _jsx(HealthTab, { changeId: changeId })] })) })] }));
}
function MiniStat({ label, value, sub, color }) {
    return (_jsxs("div", { className: "stat-panel", style: { padding: '10px 14px' }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-weak)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.03 }, children: label }), _jsx("div", { style: { fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }, children: value }), sub && _jsx("div", { style: { fontSize: 11, color: 'var(--text-weak)', fontFamily: 'var(--font-mono)' }, children: sub })] }));
}
