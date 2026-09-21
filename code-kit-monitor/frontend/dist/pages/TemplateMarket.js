import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useOrchestration } from '../stores/orchestration';
import { Rocket } from 'lucide-react';
export default function TemplateMarket() {
    const { templates, fetchTemplates, deployTemplate } = useOrchestration();
    const [deployId, setDeployId] = useState(null);
    const [deployValues, setDeployValues] = useState({});
    const [deployResult, setDeployResult] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        fetchTemplates();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const handleDeploy = async (id) => {
        setLoading(true);
        const result = await deployTemplate(id, deployValues);
        setDeployResult(result);
        setLoading(false);
        if (result.ok) {
            setDeployId(null);
            setDeployValues({});
            fetchTemplates();
        }
    };
    if (templates.length === 0) {
        return (_jsxs("div", { style: { padding: 40, textAlign: 'center', color: 'var(--text-muted)' }, children: [_jsx("p", { style: { fontSize: 14 }, children: "\u6682\u65E0\u6A21\u677F" }), _jsx("p", { style: { fontSize: 11 }, children: "\u4ECE\u7F16\u6392\u9875\u4FDD\u5B58\u7B2C\u4E00\u4E2A\u6A21\u677F" })] }));
    }
    return (_jsxs("div", { style: { padding: 20 }, children: [_jsx("h2", { style: { fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, marginBottom: 16 }, children: "\u6A21\u677F\u5E02\u573A" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }, children: templates.map((tpl) => (_jsxs("div", { className: "card card-clickable", style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 14, fontWeight: 600 }, children: tpl.name }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-secondary)' }, children: tpl.description || '-' })] }), tpl.published && (_jsx("span", { className: "badge badge-green", children: "\u5DF2\u53D1\u5E03" }))] }), _jsxs("div", { style: { display: 'flex', gap: 16, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }, children: [_jsxs("span", { children: [tpl.params?.length || 0, " \u53C2\u6570"] }), _jsxs("span", { children: [tpl.deploy_count || 0, " \u6B21\u90E8\u7F72"] })] }), _jsxs("button", { className: "btn btn-primary", style: { alignSelf: 'flex-start', marginTop: 4 }, onClick: () => setDeployId(tpl.id), children: [_jsx(Rocket, { size: 12 }), " \u4E00\u952E\u90E8\u7F72"] }), deployId === tpl.id && (_jsxs("div", { style: { marginTop: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("div", { style: { fontSize: 12, fontWeight: 600 }, children: "\u586B\u5199\u53C2\u6570" }), (tpl.params || []).map((p) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("label", { style: { fontSize: 11, fontFamily: "'JetBrains Mono', monospace", minWidth: 120, color: 'var(--text-secondary)' }, children: p }), _jsx("input", { style: { flex: 1 }, value: deployValues[p] || '', onChange: (e) => setDeployValues({ ...deployValues, [p]: e.target.value }), placeholder: `输入 ${p}` })] }, p))), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("button", { className: "btn btn-primary", disabled: loading, onClick: () => handleDeploy(tpl.id), children: loading ? '部署中...' : '确认部署' }), _jsx("button", { className: "btn", onClick: () => { setDeployId(null); setDeployValues({}); }, children: "\u53D6\u6D88" })] })] })), deployResult && deployResult.ok && deployId !== tpl.id && (_jsxs("div", { style: { fontSize: 11, color: '#5cb878', marginTop: 4 }, children: ["\u2705 \u90E8\u7F72\u6210\u529F\uFF01\u7F16\u6392 ID: ", deployResult.orchestration_id] }))] }, tpl.id))) })] }));
}
