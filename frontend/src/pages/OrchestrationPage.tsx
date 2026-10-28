/** 编排画布编辑页 — 三栏布局 + YAML/MD↔画布 双向同步. */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import YamlEditor from '../components/YamlEditor';
import OrchestrationCanvas from '../components/OrchestrationCanvas';
import EdgeEditor from '../components/EdgeEditor';
import AgentNodePool from '../components/AgentNodePool';
import { useOrchestration, AgentPoolItem } from '../stores/orchestration';
import { yamlToTopology, topologyToYaml, defaultEdgeConfig, EdgeConfig, agentNameToId } from '../lib/orchestration-sync';
import { Save, RotateCcw, Eye, FileCode, AlertCircle, RefreshCw } from 'lucide-react';
import type { Connection } from '@xyflow/react';
import PageHeader from '../components/ui/PageHeader';
import Toolbar from '../components/ui/Toolbar';

const DEFAULT_YAML = `apiVersion: ai-platform/v1
kind: AgentOrchestration
metadata:
  name: my-orchestration
spec:
  agents:
    - name: reviewer
      kind: Agent
      spec:
        runtime: hermes
        model:
          provider: cli
          name: runtime-default
        workflow_id: 1
  routes:
    - from: reviewer
      to: reviewer
      type: sequential
`;

export default function OrchestrationPage() {
  const store = useOrchestration();
  const {
    yamlContent, setYamlContent, applyYaml, validateYaml,
    topologyState, setTopologyState, edgeConfigs, setEdgeConfig, removeEdgeConfig,
    nodePool, fetchNodePool, selectedEdgeId, setSelectedEdge,
  } = store;

  const [showYaml, setShowYaml] = useState(true);
  const [yamlHeight, setYamlHeight] = useState(280);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [validateResult, setValidateResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeOrchId, setActiveOrchId] = useState<number | null>(null);
  const [orchName, setOrchName] = useState('my-orchestration');
  const [syncMsg, setSyncMsg] = useState('');

  const canvasDirtyRef = useRef(false);
  const yamlDirtyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const splitDragging = useRef(false);
  const splitStartY = useRef(0);
  const splitStartH = useRef(0);

  useEffect(() => {
    let active = true;
    const path = window.location.pathname;
    const match = path.match(/\/orchestration\/(\d+)\/edit/);

    const load = async () => {
      setPageLoading(true);
      setLoadError('');
      try {
        if (match) {
          const id = parseInt(match[1], 10);
          const response = await fetch(`/api/orchestration/${id}`);
          if (!response.ok) throw new Error('detail load failed');
          const detail = await response.json();
          if (!active) return;
          setYamlContent(detail.yaml_raw || '');
          setActiveOrchId(id);
          setOrchName(detail.name || 'my-orchestration');
          if (detail.edges_json) {
            detail.edges_json.forEach((edgeConfig: EdgeConfig) => setEdgeConfig(edgeConfig.id, edgeConfig));
          }
        } else if (!yamlContent) {
          setYamlContent(DEFAULT_YAML);
        }
        await fetchNodePool();
        if (active) setPageLoading(false);
      } catch {
        if (active) {
          setLoadError('编排编辑器加载失败，请重试。');
          setPageLoading(false);
        }
      }
    };

    void load();
    return () => { active = false; };
  }, []);

  // YAML → Canvas sync
  useEffect(() => {
    if (canvasDirtyRef.current) { canvasDirtyRef.current = false; return; }
    yamlDirtyRef.current = true;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const text = showYaml ? yamlContent : '';
      if (!text) return;
      const { nodes: agentNodes, edges, edgeConfigs: ecs } = yamlToTopology(text);
      const hasStart = agentNodes.some((node: any) => node.id === 'start');
      const hasEnd = agentNodes.some((node: any) => node.id === 'end');
      const allNodes = [
        ...(hasStart ? [] : [{ id: 'start', type: 'startNode', position: { x: 80, y: 250 }, data: { label: 'START' } }]),
        ...agentNodes.filter((node: any) => node.id !== 'start' && node.id !== 'end'),
        ...(hasEnd ? [] : [{ id: 'end', type: 'endNode', position: { x: 80 + agentNodes.length * 260 + 200, y: 250 }, data: { label: 'END' } }]),
      ];
      setTopologyState({ nodes: allNodes as any, edges });
      ecs.forEach((edgeConfig, id) => setEdgeConfig(id, edgeConfig));
      yamlDirtyRef.current = false;
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [yamlContent, showYaml]);

  const handleToggleMode = () => {
    if (!showYaml) {
      const yaml = topologyToYaml(topologyState.nodes, topologyState.edges, edgeConfigs, orchName);
      setYamlContent(yaml);
    }
    setShowYaml(!showYaml);
  };

  const handleNodesChange = useCallback((nodes: any[]) => {
    setTopologyState({ nodes, edges: topologyState.edges });
  }, [setTopologyState, topologyState.edges]);

  const handleEdgesChange = useCallback((edges: any[]) => {
    setTopologyState({ nodes: topologyState.nodes, edges });
  }, [setTopologyState, topologyState.nodes]);

  const syncToYaml = () => {
    try {
      canvasDirtyRef.current = true;
      const yaml = topologyToYaml(topologyState.nodes, topologyState.edges, edgeConfigs, orchName);
      setYamlContent(yaml);
      if (!showYaml) setShowYaml(true);
      setSyncMsg('已同步到 YAML');
      window.setTimeout(() => setSyncMsg(''), 2000);
    } catch {
      setSyncMsg('同步失败，请检查画布内容。');
      window.setTimeout(() => setSyncMsg(''), 3000);
    }
  };

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const sourceNode = topologyState.nodes.find((node: any) => node.id === connection.source);
    const targetNode = topologyState.nodes.find((node: any) => node.id === connection.target);
    const sourceName = sourceNode?.data?.label || connection.source;
    const targetName = targetNode?.data?.label || connection.target;
    const baseEdgeId = `edge-${sourceName}-${targetName}`;
    const existingCount = topologyState.edges.filter((edge: any) => edge.id.startsWith(baseEdgeId)).length;
    const edgeId = existingCount === 0 ? baseEdgeId : `${baseEdgeId}-${existingCount + 1}`;
    const newEdge = {
      id: edgeId, source: connection.source, target: connection.target,
      type: 'sequential', label: '顺序',
      markerEnd: { type: 'arrowclosed' as const, width: 14, height: 14, color: 'rgba(84,140,240,0.5)' },
      style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
    };
    setTopologyState({ nodes: topologyState.nodes, edges: [...topologyState.edges, newEdge] });
    setEdgeConfig(edgeId, defaultEdgeConfig(edgeId, sourceName, targetName));
    setSelectedEdge(edgeId);
  }, [setEdgeConfig, setSelectedEdge, setTopologyState, topologyState.edges, topologyState.nodes]);

  const handleEdgeClick = useCallback((edgeId: string) => setSelectedEdge(edgeId), [setSelectedEdge]);

  const handleEdgeSave = useCallback((config: EdgeConfig) => {
    setEdgeConfig(config.id, config);
    setSelectedEdge(null);
    setSyncMsg('连线配置已保存');
    window.setTimeout(() => setSyncMsg(''), 2000);
  }, [setEdgeConfig, setSelectedEdge]);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    removeEdgeConfig(edgeId);
    setTopologyState({ nodes: topologyState.nodes, edges: topologyState.edges.filter((edge: any) => edge.id !== edgeId) });
  }, [removeEdgeConfig, setTopologyState, topologyState.edges, topologyState.nodes]);

  const handleNodeDetailClick = useCallback((nodeId: string) => {
    const node = topologyState.nodes.find((item) => item.id === nodeId);
    const agentId = node?.data?.agentId;
    if (agentId) window.open(`/agents/${agentId}`, '_blank');
  }, [topologyState.nodes]);

  const handleDrop = useCallback((agent: AgentPoolItem, position: { x: number; y: number }) => {
    let nodeId = agentNameToId(agent.name);
    if (topologyState.nodes.some((node: any) => node.id === nodeId)) {
      let i = 2;
      while (topologyState.nodes.some((node: any) => node.id === `${nodeId}-${i}`)) i++;
      nodeId = `${nodeId}-${i}`;
    }
    const newNode = {
      id: nodeId, type: 'orchestrationNode', position,
      data: { label: agent.name, model: agent.model_name, runtime: agent.runtime, badge: agent.runtime, status: 'not_started', agentId: agent.id },
    };
    setTopologyState({ nodes: [...topologyState.nodes, newNode], edges: topologyState.edges });
  }, [setTopologyState, topologyState.edges, topologyState.nodes]);

  const handleApply = async () => {
    setLoading(true);
    setApplyResult(null);
    try {
      const yaml = topologyToYaml(topologyState.nodes, topologyState.edges, edgeConfigs, orchName);
      canvasDirtyRef.current = true;
      setYamlContent(yaml);
      const ecArr: EdgeConfig[] = [];
      edgeConfigs.forEach((value) => ecArr.push(value));
      const result = await applyYaml(yaml, ecArr);
      setApplyResult(result?.ok === false ? result : { ...result, ok: result?.ok !== false });
      if (result?.orchestration_id) setActiveOrchId(result.orchestration_id);
    } catch {
      setApplyResult({ ok: false, detail: '部署失败，请重试。' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setValidateResult(null);
    try {
      setValidateResult(await validateYaml(yamlContent));
    } catch {
      setValidateResult({ valid: false, errors: [{ message: '校验请求失败，请重试。' }] });
    }
  };

  const handleSplitMouseDown = useCallback((event: ReactMouseEvent) => {
    event.preventDefault();
    splitDragging.current = true;
    splitStartY.current = event.clientY;
    splitStartH.current = yamlHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [yamlHeight]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!splitDragging.current) return;
      const dy = splitStartY.current - event.clientY;
      setYamlHeight(Math.max(80, Math.min(600, splitStartH.current + dy)));
    };
    const onUp = () => {
      if (!splitDragging.current) return;
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
  const selectedEdgeObj = selectedEdgeId ? topologyState.edges.find((edge) => edge.id === selectedEdgeId) : null;
  const agentNames = topologyState.nodes.map((node) => node.data?.label || '');
  const editorSummary = pageLoading
    ? '正在读取画布与 Agent 节点池…'
    : `${topologyState.nodes.length} 个节点 · ${topologyState.edges.length} 条连线${activeOrchId ? ` · 实例 #${activeOrchId}` : ' · 新建实例'}`;

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Agent 编排"
        context={activeOrchId ? `编辑编排实例 #${activeOrchId}` : '新建编排实例'}
        summary={editorSummary}
        autoFocus
        action={(
          <button className="btn btn-primary" onClick={() => void handleApply()} disabled={loading || pageLoading}>
            <RotateCcw size={13} /> {loading ? '部署中…' : '保存并部署'}
          </button>
        )}
      />

      <div className="app-body" style={{ flex: 1, minHeight: 0, paddingTop: 0 }}>
        <Toolbar>
          <a href="/orchestration" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>← 列表</a>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            名称
            <input
              aria-label="编排名称"
              style={{ width: 190 }}
              value={orchName}
              onChange={(event) => setOrchName(event.target.value)}
              placeholder="编排名称"
            />
          </label>
          <span className="grow" />
          {syncMsg && <span role="status" aria-live="polite" className="chip ok">{syncMsg}</span>}
          <button className="btn btn-ghost btn-sm" onClick={syncToYaml} title="画布改动同步到 YAML">
            <Save size={13} /> 同步
          </button>
          <button className={`btn btn-sm ${showYaml ? 'btn-primary' : ''}`} onClick={() => setShowYaml(!showYaml)}>
            <FileCode size={13} /> {showYaml ? '收起 YAML' : '展开 YAML'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => void handleValidate()} disabled={loading}>
            <Eye size={13} /> 校验
          </button>
        </Toolbar>

        {loadError && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12 }}>
            <AlertCircle size={14} /> {loadError}
            <button className="btn btn-ghost btn-xs" onClick={() => window.location.reload()}><RefreshCw size={12} /> 重试</button>
          </div>
        )}
        {loading && <div role="status" aria-live="polite" className="chip info">正在保存编排…</div>}

        <main aria-label="编排主工作区" style={{ flex: 1, minHeight: 360, display: 'flex', overflow: 'hidden', border: '1px solid var(--color-border-subtle)', background: 'var(--color-surface)' }}>
          <AgentNodePool
            agents={nodePool}
            existingNames={agentNames}
            onDragStart={() => {}}
            onAddAgent={() => window.open('/agents/new', '_blank')}
          />
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {pageLoading && (
              <div role="status" aria-live="polite" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: 'var(--text-secondary)', background: 'color-mix(in oklch, var(--color-surface) 88%, transparent)' }}>
                正在加载编排拓扑…
              </div>
            )}
            {!pageLoading && topologyState.nodes.length === 0 && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10, color: 'var(--text-secondary)', textAlign: 'center' }}>
                <p style={{ fontSize: 14 }}>画布还是空的</p>
                <p className="page-note">从左侧拖入 Agent，或先编辑 YAML 配置。</p>
              </div>
            )}
            <OrchestrationCanvas
              nodes={topologyState.nodes}
              edges={topologyState.edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={handleConnect}
              onEdgeClick={handleEdgeClick}
              onNodeDetailClick={handleNodeDetailClick}
              onDrop={handleDrop}
            />
            {selectedEdgeId && selectedEdgeObj && (
              <EdgeEditor
                edgeId={selectedEdgeId}
                source={selectedEdgeObj.source}
                target={selectedEdgeObj.target}
                config={selectedEdge || null}
                onSave={handleEdgeSave}
                onDelete={handleEdgeDelete}
                onClose={() => setSelectedEdge(null)}
                agentNames={agentNames}
              />
            )}
            {(validateResult || applyResult) && (
              <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
                {validateResult && (
                  <div role={validateResult.valid ? 'status' : 'alert'} aria-live="polite" className={`chip ${validateResult.valid ? 'ok' : 'bad'}`}>
                    {validateResult.valid ? '校验通过' : `校验失败：${validateResult.errors?.[0]?.message || '请检查配置'}`}
                  </div>
                )}
                {applyResult && (
                  <div role={applyResult.ok ? 'status' : 'alert'} aria-live="polite" className={`chip ${applyResult.ok ? 'ok' : 'bad'}`}>
                    {applyResult.ok ? `部署成功${applyResult.orchestration_id ? ` · 实例 #${applyResult.orchestration_id}` : ''}` : `部署失败：${applyResult.detail || '请重试'}`}
                    {!applyResult.ok && <button className="btn btn-ghost btn-xs" onClick={() => void handleApply()} disabled={loading}>重试</button>}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <div
          role="separator"
          aria-label="调整 YAML 面板高度"
          aria-orientation="horizontal"
          onMouseDown={handleSplitMouseDown}
          onDoubleClick={() => setShowYaml(!showYaml)}
          style={{ height: 6, cursor: 'ns-resize', background: showYaml ? 'var(--color-border-subtle)' : 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <div style={{ width: 40, height: 3, borderRadius: 2, background: 'var(--color-text-tertiary)', opacity: showYaml ? 0.5 : 0.2 }} />
        </div>

        <section aria-label="YAML 配置辅助区" style={{ height: showYaml ? yamlHeight : 0, overflow: showYaml ? 'auto' : 'hidden', border: showYaml ? '1px solid var(--color-border-subtle)' : 'none', background: 'var(--color-surface)', flexShrink: 0 }}>
          <div className="toolbar" style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <strong style={{ fontSize: 12 }}>YAML 配置</strong>
            <span className="page-note">画布与文本配置可手动同步</span>
            <span className="grow" />
            <button className="btn btn-ghost btn-xs" onClick={() => setShowYaml(false)}>关闭</button>
          </div>
          <div style={{ height: Math.max(180, yamlHeight - 44), padding: 8 }}>
            <YamlEditor value={yamlContent} onChange={setYamlContent} minHeight="100%" />
          </div>
        </section>
      </div>
    </div>
  );
}
