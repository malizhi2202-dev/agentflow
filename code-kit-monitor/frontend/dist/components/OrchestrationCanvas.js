import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, MarkerType, Handle, Position, applyNodeChanges, applyEdgeChanges, useReactFlow, } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Bot, ArrowRight, Circle, ExternalLink } from 'lucide-react';
import { customEdgeTypes } from './edges';
const STATUS_COLORS = {
    healthy: '#5cb878', running: '#5cb878', success: '#5cb878',
    failed: '#e05555', crashed: '#e05555', error: '#e05555',
    degraded: '#e8a450', waiting: '#e8a450', pending: '#e8a450',
    not_started: '#5d6068', standby: '#5d6068',
};
const RUNTIME_ICONS = {
    langgraph: '#548cf0', langchain: '#5cb878', default: '#9699a0',
};
const RUNTIME_LABELS = {
    langgraph: 'LangGraph', langchain: 'LangChain', default: 'Agent',
};
function StartNodeComp({ data }) {
    return (_jsxs("div", { style: { width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid #5cb878', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(92,184,120,0.2)' }, children: [_jsx(ArrowRight, { size: 20, color: "#5cb878" }), _jsx(Handle, { type: "source", position: Position.Right, style: { width: 14, height: 14, background: '#5cb878', border: '3px solid var(--bg-card)', right: -7 } }), _jsx("div", { style: { position: 'absolute', bottom: -22, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }, children: data.label || 'START' })] }));
}
function EndNodeComp({ data }) {
    return (_jsxs("div", { style: { width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid #e05555', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(224,85,85,0.2)' }, children: [_jsx(Circle, { size: 20, color: "#e05555", fill: "#e05555", fillOpacity: 0.2 }), _jsx(Handle, { type: "target", position: Position.Left, style: { width: 14, height: 14, background: '#e05555', border: '3px solid var(--bg-card)', left: -7 } }), _jsx("div", { style: { position: 'absolute', bottom: -22, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }, children: data.label || 'END' })] }));
}
function AgentNodeComp({ data }) {
    const statusColor = STATUS_COLORS[data.status] || '#5d6068';
    const runtime = data.runtime || 'default';
    const accentColor = RUNTIME_ICONS[runtime] || RUNTIME_ICONS.default;
    return (_jsxs("div", { style: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${accentColor}`, borderRadius: 12, width: 220, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'box-shadow 150ms', cursor: 'pointer' }, onMouseEnter: (e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}40, 0 4px 16px rgba(0,0,0,0.3)`; e.currentTarget.style.borderColor = accentColor; }, onMouseLeave: (e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = 'var(--border)'; }, children: [_jsx(Handle, { type: "target", position: Position.Left, style: { width: 14, height: 14, background: 'var(--text-muted)', border: '3px solid var(--bg-card)', left: -7, top: '50%' } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 6px', borderBottom: '1px solid var(--border)' }, children: [_jsx(Bot, { size: 18, color: accentColor }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: data.label || 'Agent' }), _jsx("div", { style: { fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }, children: RUNTIME_LABELS[runtime] })] })] }), _jsx("div", { style: { padding: '8px 14px 10px' }, children: data.model && _jsx("span", { style: { fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-input)', color: 'var(--text-secondary)' }, children: data.model }) }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 8px', borderTop: '1px solid var(--border)' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("div", { style: { width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor } }), _jsx("span", { style: { fontSize: 9, color: 'var(--text-muted)' }, children: data.status || 'not_started' })] }), data.onDetailClick && _jsxs("button", { onClick: (e) => { e.stopPropagation(); data.onDetailClick(); }, style: { display: 'flex', alignItems: 'center', gap: 2, padding: '2px 6px', borderRadius: 4, background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 9 }, children: [_jsx(ExternalLink, { size: 10 }), " \u8BE6\u60C5"] })] }), _jsx(Handle, { type: "source", position: Position.Right, style: { width: 14, height: 14, background: accentColor, border: '3px solid var(--bg-card)', right: -7, top: '50%' } })] }));
}
// 定义在组件外
const nodeTypes = { orchestrationNode: AgentNodeComp, startNode: StartNodeComp, endNode: EndNodeComp };
const edgeTypes = { ...customEdgeTypes };
export default function OrchestrationCanvas(props) {
    return (_jsx(ReactFlowProvider, { children: _jsx(CanvasInner, { ...props }) }));
}
function CanvasInner({ nodes: initialNodes, edges: initialEdges, onNodesChange, onEdgesChange, onConnect, onNodeClick, onEdgeClick, onNodeDetailClick, onDrop, readOnly, }) {
    const { fitView } = useReactFlow();
    const initialFitDone = useRef(false);
    // 直接使用 props 作为受控组件
    const nodes = useMemo(() => initialNodes.map((n) => ({
        ...n,
        data: { ...n.data, onDetailClick: onNodeDetailClick ? () => onNodeDetailClick(n.id) : undefined },
    })), [initialNodes, onNodeDetailClick]);
    // 首次加载时自动 fitView，确保所有节点在可视范围内（仅执行一次，避免死循环）
    useEffect(() => {
        if (!initialFitDone.current && nodes.length > 0) {
            initialFitDone.current = true;
            const timer = setTimeout(() => {
                fitView({ padding: 0.2, duration: 300 });
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [nodes.length, fitView]);
    const edges = useMemo(() => initialEdges.map((e) => ({
        ...e,
        type: e.type || 'sequential',
        animated: e.type === 'pipeline',
        markerEnd: e.markerEnd || { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'rgba(84,140,240,0.6)' },
        style: e.style || { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 2 },
    })), [initialEdges]);
    const handleDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        try {
            const agent = JSON.parse(e.dataTransfer.getData('application/json'));
            const el = e.currentTarget;
            const bounds = el.getBoundingClientRect();
            onDrop?.(agent, { x: e.clientX - bounds.left, y: e.clientY - bounds.top });
        }
        catch { }
    }, [onDrop]);
    return (_jsx("div", { style: { width: '100%', height: '100%' }, onDragOver: handleDragOver, onDrop: handleDrop, children: _jsxs(ReactFlow, { nodes: nodes, edges: edges, onNodesChange: (changes) => onNodesChange?.(applyNodeChanges(changes, nodes)), onEdgesChange: (changes) => onEdgesChange?.(applyEdgeChanges(changes, edges)), onConnect: (c) => onConnect?.(c), onNodeClick: (_, node) => onNodeClick?.(node.id), onEdgeClick: (_, edge) => onEdgeClick?.(edge.id), nodeTypes: nodeTypes, edgeTypes: edgeTypes, defaultViewport: { x: 0, y: 0, zoom: 1 }, nodesDraggable: !readOnly, nodesConnectable: !readOnly, elementsSelectable: !readOnly, deleteKeyCode: readOnly ? null : 'Delete', connectionLineStyle: { stroke: '#548cf0', strokeWidth: 2 }, defaultEdgeOptions: { type: 'sequential', animated: false }, proOptions: { hideAttribution: true }, children: [_jsx(Background, { color: "rgba(255,255,255,0.04)", gap: 24, size: 2 }), _jsx(Controls, { style: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' } }), _jsx(MiniMap, { style: { background: 'var(--bg-card)', border: '1px solid var(--border)' }, nodeColor: (n) => STATUS_COLORS[n.data?.status] || '#5d6068', maskColor: "rgba(0,0,0,0.6)" })] }) }));
}
