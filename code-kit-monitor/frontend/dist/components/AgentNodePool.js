import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Agent 节点池侧边栏 — 可拖拽 Agent 到画布，可折叠. */
import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
export default function AgentNodePool({ agents, existingNames, onDragStart, onAddAgent }) {
    const [collapsed, setCollapsed] = useState(false);
    const available = agents.filter((a) => !existingNames.includes(a.name));
    if (collapsed) {
        return (_jsx("div", { style: {
                width: 32, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8,
            }, children: _jsx("button", { onClick: () => setCollapsed(false), style: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }, children: _jsx(ChevronRight, { size: 14 }) }) }));
    }
    return (_jsxs("div", { style: {
            width: 220, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', height: '100%',
        }, children: [_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderBottom: '1px solid var(--border)',
                }, children: [_jsx("span", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: "Agent \u8282\u70B9\u6C60" }), _jsx("button", { onClick: () => setCollapsed(true), style: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }, children: _jsx(ChevronLeft, { size: 14 }) })] }), _jsxs("div", { style: { flex: 1, overflow: 'auto', padding: 6 }, children: [available.length === 0 && (_jsx("p", { style: { fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }, children: "\u6240\u6709 Agent \u5DF2\u5728\u753B\u5E03\u4E0A" })), available.map((agent) => (_jsxs("div", { draggable: true, onDragStart: (e) => { e.dataTransfer.setData('application/json', JSON.stringify(agent)); onDragStart(agent); }, style: {
                            padding: '8px 10px', marginBottom: 4, borderRadius: 'var(--r-sm)',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            cursor: 'grab', transition: 'background var(--fast), border-color var(--fast)',
                            borderLeft: '2px solid var(--blue)',
                        }, onMouseEnter: (e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }, onMouseLeave: (e) => { e.currentTarget.style.background = 'var(--bg-card)'; }, children: [_jsx("div", { style: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600 }, children: agent.name }), _jsxs("div", { style: { display: 'flex', gap: 6, marginTop: 2 }, children: [_jsx("span", { style: { fontSize: 9, padding: '1px 5px', borderRadius: 2, background: 'var(--blue-bg)', color: 'var(--blue)' }, children: agent.runtime }), _jsx("span", { style: { fontSize: 10, color: 'var(--text-secondary)' }, children: agent.model_name })] })] }, agent.id)))] }), _jsx("div", { style: { padding: 8, borderTop: '1px solid var(--border)' }, children: _jsxs("button", { onClick: onAddAgent, style: {
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        padding: '8px', background: 'var(--bg-card)', color: 'var(--text-secondary)',
                        border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 11,
                    }, children: [_jsx(Plus, { size: 12 }), " \u6DFB\u52A0 Agent"] }) })] }));
}
