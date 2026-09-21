import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** 编排画布编辑页 — 三栏布局 + YAML/MD↔画布 双向同步. */
import { useState, useEffect, useCallback, useRef } from 'react';
import YamlEditor from '../components/YamlEditor';
import OrchestrationCanvas from '../components/OrchestrationCanvas';
import EdgeEditor from '../components/EdgeEditor';
import AgentNodePool from '../components/AgentNodePool';
import { useOrchestration } from '../stores/orchestration';
import { yamlToTopology, topologyToYaml, defaultEdgeConfig, agentNameToId } from '../lib/orchestration-sync';
import { Save, RotateCcw, Eye, FileCode } from 'lucide-react';
const DEFAULT_YAML = `apiVersion: ai-platform/v1
kind: AgentOrchestration
metadata:
  name: my-orchestration
spec:
  agents:
    - name: reviewer
      kind: Agent
      spec:
        runtime: langgraph
        model:
          provider: openai
          name: gpt-4o
        workflow_id: 1
  routes:
    - from: reviewer
      to: reviewer
      type: sequential
`;
const uid = () => localStorage.getItem('current_user_id') || 'admin';
export default function OrchestrationPage() {
    const store = useOrchestration();
    const { yamlContent, setYamlContent, applyYaml, validateYaml, topologyState, setTopologyState, edgeConfigs, setEdgeConfig, removeEdgeConfig, nodePool, fetchNodePool, selectedEdgeId, setSelectedEdge, } = store;
    const [showYaml, setShowYaml] = useState(true); // true=yaml, false=md
    const [yamlHeight, setYamlHeight] = useState(280); // YAML 面板高度（可拖拽调整）
    const [applyResult, setApplyResult] = useState(null);
    const [validateResult, setValidateResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeOrchId, setActiveOrchId] = useState(null);
    const [orchName, setOrchName] = useState('my-orchestration');
    const [syncMsg, setSyncMsg] = useState(''); // 同步/保存反馈
    const canvasDirtyRef = useRef(false);
    const yamlDirtyRef = useRef(false);
    const debounceRef = useRef();
    const splitDragging = useRef(false);
    const splitStartY = useRef(0);
    const splitStartH = useRef(0);
    // Load existing orchestration or init default
    useEffect(() => {
        const path = window.location.pathname;
        const match = path.match(/\/orchestration\/(\d+)\/edit/);
        if (match) {
            const id = parseInt(match[1]);
            fetch(`/api/orchestration/${id}`, { headers: { 'X-User-Id': uid() } })
                .then((r) => r.json())
                .then((d) => {
                setYamlContent(d.yaml_raw || '');
                setActiveOrchId(id);
                setOrchName(d.name || 'my-orchestration');
                if (d.edges_json) {
                    d.edges_json.forEach((ec) => setEdgeConfig(ec.id, ec));
                }
            });
        }
        else if (!yamlContent) {
            setYamlContent(DEFAULT_YAML);
        }
        fetchNodePool();
    }, []);
    // YAML → Canvas sync
    useEffect(() => {
        if (canvasDirtyRef.current) {
            canvasDirtyRef.current = false;
            return;
        }
        yamlDirtyRef.current = true;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const text = showYaml ? yamlContent : '';
            if (!text)
                return;
            const { nodes: agentNodes, edges, edgeConfigs: ecs } = yamlToTopology(text);
            // Prepend Start + append End（跳过yaml里已经叫start/end的）
            const hasStart = agentNodes.some((n) => n.id === 'start');
            const hasEnd = agentNodes.some((n) => n.id === 'end');
            const allNodes = [
                ...(hasStart ? [] : [{ id: 'start', type: 'startNode', position: { x: 80, y: 250 }, data: { label: 'START' } }]),
                ...agentNodes.filter((n) => n.id !== 'start' && n.id !== 'end'),
                ...(hasEnd ? [] : [{ id: 'end', type: 'endNode', position: { x: 80 + agentNodes.length * 260 + 200, y: 250 }, data: { label: 'END' } }]),
            ];
            setTopologyState({ nodes: allNodes, edges });
            ecs.forEach((ec, id) => setEdgeConfig(id, ec));
            yamlDirtyRef.current = false;
        }, 300);
    }, [yamlContent, showYaml]);
    // Editor mode toggle → regenerate YAML from canvas if switching to YAML
    const handleToggleMode = () => {
        if (!showYaml) {
            // switching from MD to YAML → regenerate
            const yaml = topologyToYaml(topologyState.nodes, topologyState.edges, edgeConfigs, orchName);
            setYamlContent(yaml);
        }
        setShowYaml(!showYaml);
    };
    // Canvas handlers — 仅本地更新状态，不自动回写YAML（避免死循环）
    const handleNodesChange = useCallback((nodes) => {
        setTopologyState({ nodes, edges: topologyState.edges });
    }, [topologyState.edges]);
    const handleEdgesChange = useCallback((edges) => {
        setTopologyState({ nodes: topologyState.nodes, edges });
    }, [topologyState.nodes]);
    // 手动同步：画布 → YAML（设置脏标记阻止反向覆盖）
    const syncToYaml = () => {
        try {
            canvasDirtyRef.current = true;
            const yaml = topologyToYaml(topologyState.nodes, topologyState.edges, edgeConfigs, orchName);
            setYamlContent(yaml);
            // 确保 YAML 面板可见
            if (!showYaml)
                setShowYaml(true);
            setSyncMsg('✅ 已同步到 YAML');
            setTimeout(() => setSyncMsg(''), 2000);
        }
        catch (e) {
            console.error('[syncToYaml]', e);
            setSyncMsg('❌ 同步失败: ' + (e.message || e));
            setTimeout(() => setSyncMsg(''), 3000);
        }
    };
    const handleConnect = useCallback((connection) => {
        if (!connection.source || !connection.target)
            return;
        const sourceNode = topologyState.nodes.find((n) => n.id === connection.source);
        const targetNode = topologyState.nodes.find((n) => n.id === connection.target);
        const sourceName = sourceNode?.data?.label || connection.source;
        const targetName = targetNode?.data?.label || connection.target;
        // 稳定 edge ID：基于源/目标名称
        const baseEdgeId = `edge-${sourceName}-${targetName}`;
        const existingCount = topologyState.edges.filter((e) => e.id.startsWith(baseEdgeId)).length;
        const edgeId = existingCount === 0 ? baseEdgeId : `${baseEdgeId}-${existingCount + 1}`;
        const newEdge = {
            id: edgeId, source: connection.source, target: connection.target,
            type: 'sequential', label: '顺序',
            markerEnd: { type: 'arrowclosed', width: 14, height: 14, color: 'rgba(84,140,240,0.5)' },
            style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
        };
        setTopologyState({ nodes: topologyState.nodes, edges: [...topologyState.edges, newEdge] });
        setEdgeConfig(edgeId, defaultEdgeConfig(edgeId, sourceName, targetName));
        setSelectedEdge(edgeId);
    }, [topologyState.nodes, topologyState.edges]);
    const handleEdgeClick = useCallback((edgeId) => {
        setSelectedEdge(edgeId);
    }, []);
    const handleEdgeSave = useCallback((config) => {
        setEdgeConfig(config.id, config);
        setSelectedEdge(null); // 保存后关闭面板
        setSyncMsg('✅ 连线配置已保存');
        setTimeout(() => setSyncMsg(''), 2000);
    }, [setEdgeConfig, setSelectedEdge]);
    const handleEdgeDelete = useCallback((edgeId) => {
        removeEdgeConfig(edgeId);
        const newEdges = topologyState.edges.filter((e) => e.id !== edgeId);
        setTopologyState({ nodes: topologyState.nodes, edges: newEdges });
    }, [topologyState]);
    const handleNodeDetailClick = useCallback((nodeId) => {
        const node = topologyState.nodes.find((n) => n.id === nodeId);
        const agentId = node?.data?.agentId;
        if (agentId)
            window.open(`/agents/${agentId}`, '_blank');
    }, [topologyState]);
    const handleDrop = useCallback((agent, position) => {
        let nodeId = agentNameToId(agent.name);
        // 同名节点去重
        const exists = topologyState.nodes.some((n) => n.id === nodeId);
        if (exists) {
            let i = 2;
            while (topologyState.nodes.some((n) => n.id === `${nodeId}-${i}`))
                i++;
            nodeId = `${nodeId}-${i}`;
        }
        const newNode = {
            id: nodeId, type: 'orchestrationNode', position,
            data: { label: agent.name, model: agent.model_name, runtime: agent.runtime, badge: agent.runtime, status: 'not_started', agentId: agent.id },
        };
        const newNodes = [...topologyState.nodes, newNode];
        setTopologyState({ nodes: newNodes, edges: topologyState.edges });
    }, [topologyState, edgeConfigs, orchName]);
    const handleApply = async () => {
        setLoading(true);
        // 先同步画布 → YAML 确保提交最新状态，设置脏标记阻止反向覆盖
        const yaml = topologyToYaml(topologyState.nodes, topologyState.edges, edgeConfigs, orchName);
        canvasDirtyRef.current = true;
        setYamlContent(yaml);
        const ecArr = [];
        edgeConfigs.forEach((v) => ecArr.push(v));
        const result = await applyYaml(yaml, ecArr);
        setApplyResult(result);
        setLoading(false);
        if (result?.orchestration_id)
            setActiveOrchId(result.orchestration_id);
    };
    const handleValidate = async () => {
        const result = await validateYaml(yamlContent);
        setValidateResult(result);
    };
    // 分割线拖拽
    const handleSplitMouseDown = useCallback((e) => {
        e.preventDefault();
        splitDragging.current = true;
        splitStartY.current = e.clientY;
        splitStartH.current = yamlHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }, [yamlHeight]);
    useEffect(() => {
        const onMove = (e) => {
            if (!splitDragging.current)
                return;
            const dy = splitStartY.current - e.clientY;
            const newH = Math.max(80, Math.min(600, splitStartH.current + dy));
            setYamlHeight(newH);
        };
        const onUp = () => {
            if (!splitDragging.current)
                return;
            splitDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);
    const selectedEdge = selectedEdgeId ? edgeConfigs.get(selectedEdgeId) : null;
    const selectedEdgeObj = selectedEdgeId ? topologyState.edges.find((e) => e.id === selectedEdgeId) : null;
    const agentNames = topologyState.nodes.map((n) => n.data?.label || '');
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                    borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
                }, children: [_jsx("a", { href: "/orchestration", style: { fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none' }, children: "\u2190 \u5217\u8868" }), _jsx("span", { style: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14 }, children: "Agent \u7F16\u6392" }), _jsx("input", { style: { width: 180, padding: '4px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 12 }, value: orchName, onChange: (e) => setOrchName(e.target.value), placeholder: "\u7F16\u6392\u540D\u79F0" }), _jsx("div", { style: { flex: 1 } }), syncMsg && _jsx("span", { style: { fontSize: 11, color: syncMsg.startsWith('✅') ? '#5cb878' : '#e05555', fontWeight: 500 }, children: syncMsg }), _jsxs("button", { onClick: syncToYaml, className: "btn", style: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }, title: "\u753B\u5E03\u6539\u52A8\u540C\u6B65\u5230YAML", children: [_jsx(Save, { size: 12 }), " \u540C\u6B65"] }), _jsxs("button", { onClick: () => setShowYaml(!showYaml), className: "btn", style: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: showYaml ? 'var(--blue-bg)' : 'var(--bg-card)', border: `1px solid ${showYaml ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 'var(--r-sm)', color: showYaml ? 'var(--blue)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }, children: [_jsx(FileCode, { size: 12 }), " YAML"] }), _jsxs("button", { className: "btn", onClick: handleValidate, disabled: loading, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }, children: [_jsx(Eye, { size: 12 }), " Validate"] }), _jsx("button", { className: "btn btn-primary", onClick: handleApply, disabled: loading, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 11 }, children: loading ? 'Deploying...' : _jsxs(_Fragment, { children: [_jsx(RotateCcw, { size: 12 }), " Apply"] }) })] }), _jsxs("div", { style: { flex: 1, display: 'flex', overflow: 'hidden' }, children: [_jsx(AgentNodePool, { agents: nodePool, existingNames: agentNames, onDragStart: () => { }, onAddAgent: () => window.open('/agents/new', '_blank') }), _jsxs("div", { style: { flex: 1, position: 'relative', overflow: 'hidden' }, children: [topologyState.nodes.length === 0 && (_jsxs("div", { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10, color: 'var(--text-muted)', textAlign: 'center' }, children: [_jsx("p", { style: { fontSize: 14 }, children: "\u23F3 \u6B63\u5728\u52A0\u8F7D\u7F16\u6392\u62D3\u6251..." }), _jsx("p", { style: { fontSize: 10 }, children: "\u5982\u679C\u6301\u7EED\u663E\u793A\uFF0C\u8BF7\u68C0\u67E5 YAML \u4E2D\u662F\u5426\u6709 agents \u5B9A\u4E49" })] })), _jsx(OrchestrationCanvas, { nodes: topologyState.nodes, edges: topologyState.edges, onNodesChange: handleNodesChange, onEdgesChange: handleEdgesChange, onConnect: handleConnect, onEdgeClick: handleEdgeClick, onNodeDetailClick: handleNodeDetailClick, onDrop: handleDrop }), selectedEdgeId && selectedEdgeObj && (_jsx(EdgeEditor, { edgeId: selectedEdgeId, source: selectedEdgeObj.source, target: selectedEdgeObj.target, config: selectedEdge || null, onSave: handleEdgeSave, onDelete: handleEdgeDelete, onClose: () => setSelectedEdge(null), agentNames: agentNames })), (validateResult || applyResult) && (_jsxs("div", { style: { position: 'absolute', top: 10, right: 10, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }, children: [validateResult && (_jsx("div", { style: { padding: '6px 12px', borderRadius: 'var(--r-sm)', background: validateResult.valid ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${validateResult.valid ? '#5cb878' : '#e05555'}`, fontSize: 10, color: validateResult.valid ? '#5cb878' : '#e05555' }, children: validateResult.valid ? '✅ 校验通过' : `❌ ${validateResult.errors?.[0]?.message || '校验失败'}` })), applyResult && (_jsx("div", { style: { padding: '6px 12px', borderRadius: 'var(--r-sm)', background: applyResult.ok ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${applyResult.ok ? '#5cb878' : '#e05555'}`, fontSize: 10, color: applyResult.ok ? '#5cb878' : '#e05555' }, children: applyResult.ok ? `✅ 部署成功 — ID: ${applyResult.orchestration_id}` : `❌ ${applyResult.detail || '部署失败'}` }))] }))] })] }), _jsx("div", { onMouseDown: handleSplitMouseDown, onDoubleClick: () => { if (showYaml) {
                    setShowYaml(false);
                }
                else {
                    setShowYaml(true);
                    if (yamlHeight < 80)
                        setYamlHeight(240);
                } }, style: {
                    height: 6, cursor: 'ns-resize',
                    background: showYaml ? 'var(--border)' : 'var(--bg-card)',
                    borderTop: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }, title: "\u62D6\u62FD\u8C03\u6574\u9AD8\u5EA6 \u00B7 \u53CC\u51FB\u6298\u53E0/\u5C55\u5F00", children: _jsx("div", { style: { width: 40, height: 3, borderRadius: 2, background: 'var(--text-muted)', opacity: showYaml ? 0.4 : 0.15 } }) }), _jsxs("div", { style: {
                    height: showYaml ? yamlHeight : 0,
                    overflow: showYaml ? 'auto' : 'hidden',
                    transition: splitDragging.current ? 'none' : 'height 150ms var(--ease)',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    flexShrink: 0,
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', borderBottom: '1px solid var(--border)' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: "\uD83D\uDCDD YAML \u914D\u7F6E" }), _jsx("button", { onClick: handleToggleMode, style: { fontSize: 9, padding: '1px 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }, children: showYaml ? 'MD' : 'YAML' })] }), _jsx("button", { onClick: () => setShowYaml(false), style: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }, children: "\u2715" })] }), _jsx("div", { style: { height: 200, padding: 8 }, children: showYaml ? (_jsx(YamlEditor, { value: yamlContent, onChange: setYamlContent, minHeight: "100%" })) : (_jsx("textarea", { value: yamlContent, onChange: (e) => setYamlContent(e.target.value), style: { width: '100%', height: '100%', background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", resize: 'none', boxSizing: 'border-box' } })) })] })] }));
}
