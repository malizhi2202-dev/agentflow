import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Edit3, X, Users, GitBranch } from 'lucide-react';
import { cn, gateDisplay, useFileNames } from '../hooks/useFileNames';
import { useAuth } from '../stores/auth';
export default function WorkflowEditor() {
    const { isAdmin, rolePermissions } = useAuth();
    const canWrite = isAdmin || rolePermissions.includes('project:write');
    const [wf, setWf] = useState(null);
    const [allRoles, setAllRoles] = useState([]);
    const [editingGate, setEditingGate] = useState(null);
    const [editingStage, setEditingStage] = useState(null);
    const [showAddStage, setShowAddStage] = useState(false);
    const [newStage, setNewStage] = useState({ id: '', name: '', gate: '', prompt: '' });
    const [saved, setSaved] = useState(false);
    const { map: nameMap, fetch: fetchNames } = useFileNames();
    useEffect(() => {
        fetchNames();
        fetch('/api/admin/workflow').then(r => r.json()).then(d => {
            setWf(d.workflow);
            setAllRoles(d.all_roles || []);
        });
    }, []);
    const save = async (updated) => {
        await fetch('/api/admin/workflow', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    if (!wf)
        return _jsx("div", { style: { padding: 40, color: 'var(--text-weak)' }, children: "\u52A0\u8F7D\u4E2D..." });
    const updateStages = (stages) => { const u = { ...wf, stages }; setWf(u); save(u); };
    const updateGates = (gates) => { const u = { ...wf, gates }; setWf(u); save(u); };
    const moveStage = (idx, dir) => {
        const stages = [...wf.stages];
        const target = idx + dir;
        if (target < 0 || target >= stages.length)
            return;
        [stages[idx], stages[target]] = [stages[target], stages[idx]];
        stages.forEach((s, i) => s.order = i);
        updateStages(stages);
    };
    const deleteStage = (idx) => {
        updateStages(wf.stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
    };
    const addStage = () => {
        if (!newStage.id || !newStage.name)
            return;
        const stages = [...wf.stages];
        stages.push({ id: newStage.id, name: newStage.name, gate: newStage.gate || null, prompt: newStage.prompt || `prompts/${newStage.id}.md`, order: stages.length });
        updateStages(stages);
        setShowAddStage(false);
        setNewStage({ id: '', name: '', gate: '', prompt: '' });
    };
    const insertStage = (afterIdx) => {
        if (!newStage.id || !newStage.name)
            return;
        const stages = [...wf.stages];
        stages.splice(afterIdx + 1, 0, { id: newStage.id, name: newStage.name, gate: newStage.gate || null, prompt: newStage.prompt || `prompts/${newStage.id}.md`, order: 0 });
        stages.forEach((s, i) => s.order = i);
        updateStages(stages);
        setShowAddStage(false);
        setNewStage({ id: '', name: '', gate: '', prompt: '' });
    };
    const toggleExpert = (gateId, expert) => {
        const gates = wf.gates.map(g => {
            if (g.id !== gateId)
                return g;
            const experts = g.experts.includes(expert) ? g.experts.filter(e => e !== expert) : [...g.experts, expert];
            return { ...g, experts };
        });
        updateGates(gates);
    };
    return (_jsxs("div", { style: { padding: '20px 24px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("h1", { style: { fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }, children: "\u5DE5\u4F5C\u6D41\u7F16\u8F91\u5668" }), saved && _jsx("span", { className: "badge badge-green", children: "\u5DF2\u4FDD\u5B58" })] }), canWrite && _jsxs("button", { className: "btn btn-primary btn-sm", onClick: () => setShowAddStage(true), children: [_jsx(Plus, { size: 14 }), " \u65B0\u589E\u9636\u6BB5"] })] }), showAddStage && (_jsx("div", { className: "card", style: { marginBottom: 16, border: '1px solid var(--blue)', background: 'var(--bg-panel)' }, children: _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }, children: [_jsxs("div", { children: [_jsx("label", { style: { fontSize: 11, color: 'var(--text-weak)' }, children: "\u9636\u6BB5 ID" }), _jsx("br", {}), _jsx("input", { placeholder: "\u5982: 8-deploy", value: newStage.id, onChange: e => setNewStage({ ...newStage, id: e.target.value }), style: { width: 160, marginTop: 2 } })] }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: 11, color: 'var(--text-weak)' }, children: "\u540D\u79F0" }), _jsx("br", {}), _jsx("input", { placeholder: "\u5982: \u90E8\u7F72\u4E0A\u7EBF", value: newStage.name, onChange: e => setNewStage({ ...newStage, name: e.target.value }), style: { width: 140, marginTop: 2 } })] }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: 11, color: 'var(--text-weak)' }, children: "\u5173\u8054 Gate" }), _jsx("br", {}), _jsxs("select", { value: newStage.gate, onChange: e => setNewStage({ ...newStage, gate: e.target.value }), style: { width: 140, marginTop: 2 }, children: [_jsx("option", { value: "", children: "\u65E0" }), wf.gates.map(g => _jsx("option", { value: g.id, children: gateDisplay(g.name) }, g.id))] })] }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: 11, color: 'var(--text-weak)' }, children: "Prompt \u6587\u4EF6" }), _jsx("br", {}), _jsx("input", { placeholder: "prompts/xxx.md", value: newStage.prompt, onChange: e => setNewStage({ ...newStage, prompt: e.target.value }), style: { width: 180, marginTop: 2 } })] }), _jsxs("button", { className: "btn btn-primary btn-sm", onClick: addStage, children: [_jsx(Plus, { size: 12 }), " \u8FFD\u52A0\u5230\u672B\u5C3E"] }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setShowAddStage(false), children: _jsx(X, { size: 12 }) })] }) })), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }, children: [_jsxs("div", { children: [_jsxs("h2", { style: { fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(GitBranch, { size: 14 }), " \u6D41\u7A0B\u9636\u6BB5 (", wf.stages.length, ")"] }), wf.stages.map((stage, i) => (_jsx("div", { className: "card", style: { marginBottom: 8, padding: '10px 12px' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-weak)', minWidth: 22, textAlign: 'center' }, children: i }), _jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }, children: stage.id }), _jsx("span", { style: { fontSize: 13, color: 'var(--text-secondary)' }, children: stage.name }), stage.gate && _jsx("span", { className: "badge badge-purple", children: stage.gate }), _jsx("span", { style: { fontSize: 11, color: 'var(--text-weak)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }, children: cn(stage.prompt, nameMap) }), canWrite && _jsxs("div", { style: { display: 'flex', gap: 2, marginLeft: 4 }, children: [_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => moveStage(i, -1), disabled: i === 0, children: _jsx(ChevronUp, { size: 12 }) }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => moveStage(i, 1), disabled: i === wf.stages.length - 1, children: _jsx(ChevronDown, { size: 12 }) }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => { setNewStage({ id: '', name: '', gate: '', prompt: '' }); setShowAddStage(true); }, title: "\u5728\u6B64\u540E\u63D2\u5165", children: _jsx(Plus, { size: 12 }) }), _jsx("button", { className: "btn btn-ghost btn-sm", style: { color: 'var(--red)' }, onClick: () => deleteStage(i), children: _jsx(Trash2, { size: 12 }) })] })] }) }, stage.id)))] }), _jsxs("div", { children: [_jsxs("h2", { style: { fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Users, { size: 14 }), " \u95E8\u7981\u4E13\u5BB6\u56E2 (", wf.gates.length, ")"] }), wf.gates.map(gate => {
                                const isOpen = editingGate === gate.id;
                                return (_jsxs("div", { className: "card", style: { marginBottom: 8, padding: '10px 12px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }, onClick: () => setEditingGate(isOpen ? null : gate.id), children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { className: "badge badge-purple", children: gate.id }), _jsx("span", { style: { fontWeight: 600, fontSize: 13 }, children: gateDisplay(gate.name) }), _jsxs("span", { style: { fontSize: 11, color: 'var(--text-weak)' }, children: ["(", gate.experts.length, "\u4EBA)"] })] }), _jsx(Edit3, { size: 12, style: { color: 'var(--text-weak)' } })] }), isOpen && (_jsxs("div", { style: { marginTop: 10, borderTop: '1px solid var(--border-weak)', paddingTop: 10 }, children: [_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4 }, children: allRoles.map(role => {
                                                        const inGate = gate.experts.includes(role);
                                                        return (_jsxs("button", { onClick: () => toggleExpert(gate.id, role), style: {
                                                                padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, cursor: 'pointer', border: '1px solid',
                                                                background: inGate ? 'var(--blue-bg)' : 'transparent',
                                                                borderColor: inGate ? 'var(--blue)' : 'var(--border-normal)',
                                                                color: inGate ? 'var(--blue)' : 'var(--text-weak)',
                                                            }, children: [inGate ? '✓ ' : '+ ', role] }, role));
                                                    }) }), _jsxs("div", { style: { marginTop: 8, fontSize: 11, color: 'var(--text-weak)' }, children: ["\u5F53\u524D\uFF1A", gate.experts.map((e, i) => _jsx("span", { className: "badge badge-blue", style: { marginRight: 4 }, children: e }, i))] })] }))] }, gate.id));
                            })] })] })] }));
}
