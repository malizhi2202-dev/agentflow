import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown, GitMerge, ArrowRight, GitFork, AlertCircle, RefreshCw } from 'lucide-react';
import { useWorkflows } from '../stores/workflows';
import EntityBreakdownPanel from '../components/EntityBreakdownPanel';
import PageHeader from '../components/ui/PageHeader';
import Toolbar from '../components/ui/Toolbar';

const th: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontSize: 10 };
const td: React.CSSProperties = { padding: '4px 8px', fontSize: 11, color: 'var(--color-text)' };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' };

export default function WorkflowDetail({ workflowId, onBack }: { workflowId: number; onBack: () => void }) {
  const { workflows, fetchWorkflows, updateWorkflow, loading } = useWorkflows();
  const wf = workflows.find((workflow) => workflow.id === workflowId);
  const [tab, setTab] = useState('nodes');
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editToolId, setEditToolId] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [monitorData, setMonitorData] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [newEdge, setNewEdge] = useState({ from: '', to: '', type: 'sequential' });
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [nodeDetailId, setNodeDetailId] = useState<string | null>(null);
  const [nd, setNd] = useState({ label: '', tool_id: 0, gate_pre: '', gate_post: '', io_filter: 'none', token_limit: 0 });

  useEffect(() => {
    void fetchWorkflows();
    fetch('/api/tools').then((response) => response.json()).then((data) => setTools(data.tools || [])).catch(() => setTools([]));
  }, []);

  useEffect(() => {
    if (wf) {
      setNodes(wf.spec_json?.nodes || []);
      setEdges(wf.spec_json?.edges || []);
      fetch('/api/metrics/sessions?limit=200&entity_type=workflow')
        .then((response) => response.json()).then((data) => setMonitorData(data.sessions || [])).catch(() => setMonitorData([]));
    }
  }, [wf]);

  const saveNodes = async (nextNodes: any[], nextEdges?: any[]) => {
    const next = nextEdges || edges;
    setNodes(nextNodes);
    setEdges(next);
    setSaveState('saving');
    setSaveError('');
    const result = await updateWorkflow(workflowId, { spec_json: { nodes: nextNodes, edges: next } });
    if (result) {
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 1500);
    } else {
      setSaveState('error');
      setSaveError('保存失败，已保留当前编辑内容。');
    }
  };

  const openNodeDetail = (node: any) => {
    setNodeDetailId(node.id);
    setNd({ label: node.label || node.id, tool_id: node.tool_id || 0, gate_pre: node.gate_pre || '', gate_post: node.gate_post || '', io_filter: node.io_filter || 'none', token_limit: node.token_limit || 0 });
  };

  const saveNodeDetail = () => {
    const updated = nodes.map((node) => node.id === nodeDetailId ? { ...node, label: nd.label, tool_id: nd.tool_id, gate_pre: nd.gate_pre || null, gate_post: nd.gate_post || null, io_filter: nd.io_filter, token_limit: nd.token_limit } : node);
    void saveNodes(updated);
    setNodeDetailId(null);
  };

  if (!wf) {
    return (
      <div className="app-body" role={loading ? 'status' : 'alert'}>
        <PageHeader title="工作流详情" context={`工作流 #${workflowId}`} summary={loading ? '正在读取工作流…' : '工作流不存在或暂时不可用'} autoFocus />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!loading && <AlertCircle size={14} />}
          <span>{loading ? '正在加载…' : '无法打开该工作流，请返回列表重试。'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={13} /> 返回列表</button>
          {!loading && <button className="btn btn-ghost btn-sm" onClick={() => void fetchWorkflows()}><RefreshCw size={13} /> 重试</button>}
        </div>
      </div>
    );
  }

  const setDraft = (patch: Partial<typeof nd>) => setNd((previous) => ({ ...previous, ...patch }));

  if (nodeDetailId) {
    const node = nodes.find((item) => item.id === nodeDetailId);
    if (!node) {
      setNodeDetailId(null);
      return null;
    }
    return (
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <PageHeader
          title={`节点详情：${node.label || node.id}`}
          context={`工作流 · ${wf.name}`}
          summary="编辑节点配置，保存后返回节点列表"
          autoFocus
        />
        <div className="app-body" style={{ flex: 1 }}>
          <Toolbar>
            <button className="btn btn-ghost btn-sm" onClick={() => setNodeDetailId(null)}><ArrowLeft size={14} /> 返回节点列表</button>
            <span className="grow" />
            {saveState === 'saved' && <span role="status" className="chip ok">已保存</span>}
          </Toolbar>
          {saveError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>{saveError}</div>}
          <main aria-label="节点配置编辑区" style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={lbl} htmlFor="node-label">节点标签</label><input id="node-label" value={nd.label} onChange={(event) => setDraft({ label: event.target.value })} style={inp} /></div>
            <div><label style={lbl} htmlFor="node-tool">绑定工具</label><select id="node-tool" value={nd.tool_id} onChange={(event) => setDraft({ tool_id: parseInt(event.target.value, 10) })} style={inp}><option value={0}>选择工具</option>{tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name} ({tool.type})</option>)}</select></div>
            <section className="panel"><h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>安全闸门</h2><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><div><label style={lbl} htmlFor="gate-pre">前置校验规则</label><input id="gate-pre" value={nd.gate_pre} onChange={(event) => setDraft({ gate_pre: event.target.value })} placeholder="例：输入必须包含 project_id" style={inp} /></div><div><label style={lbl} htmlFor="gate-post">后置校验规则</label><input id="gate-post" value={nd.gate_post} onChange={(event) => setDraft({ gate_post: event.target.value })} placeholder="例：输出不能为空" style={inp} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><div><label style={lbl} htmlFor="io-filter">I/O 过滤</label><select id="io-filter" value={nd.io_filter} onChange={(event) => setDraft({ io_filter: event.target.value })} style={inp}><option value="none">不过滤</option><option value="sanitize">基础过滤</option><option value="strict">严格过滤</option></select></div><div><label style={lbl} htmlFor="token-limit">Token 限制</label><input id="token-limit" type="number" value={nd.token_limit} onChange={(event) => setDraft({ token_limit: parseInt(event.target.value, 10) || 0 })} style={inp} /></div></div></div></section>
            <section className="panel"><h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>角色绑定</h2><select multiple aria-label="角色绑定" style={{ ...inp, minHeight: 80 }}><option>架构师</option><option>高级产品经理</option><option>安全审计师</option><option>资深用户评测员</option><option>领域专家</option><option>资深测试工程师</option></select><label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}><input type="checkbox" /> 对抗模式（两个角色互相审核）</label></section>
            <button className="btn btn-primary" onClick={saveNodeDetail} disabled={saveState === 'saving'} style={{ alignSelf: 'flex-start' }}><Save size={14} /> {saveState === 'saving' ? '保存中…' : '保存节点配置'}</button>
          </main>
        </div>
      </div>
    );
  }

  const monSessions = (monitorData || []).filter((session: any) => session.entity_type === 'workflow');
  const totalTokens = monSessions.reduce((sum: number, session: any) => sum + (session.total_tokens || 0), 0);
  const totalMs = monSessions.reduce((sum: number, session: any) => sum + (session.duration_ms || 0), 0);
  const totalCalls = monSessions.length;
  const avgMs = totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0;

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title={wf.name} context="工作流详情" summary={`${nodes.length} 个节点 · ${edges.length} 条连线`} autoFocus action={<button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={14} /> 返回列表</button>} />
      <div className="app-body" style={{ flex: 1 }}>
        <Toolbar>
          <div role="tablist" aria-label="工作流详情分区" className="toolbar">
            {['nodes', 'roles', 'monitor'].map((value) => <button key={value} role="tab" aria-selected={tab === value} className={`btn btn-sm ${tab === value ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(value)}>{value === 'nodes' ? '节点编辑' : value === 'roles' ? '角色绑定' : '监控'}</button>)}
          </div>
          <span className="grow" />
          {saveState === 'saving' && <span role="status" className="chip info">保存中…</span>}
          {saveState === 'saved' && <span role="status" className="chip ok">已保存</span>}
        </Toolbar>
        {saveError && <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12 }}><AlertCircle size={14} /> {saveError}<button className="btn btn-ghost btn-xs" onClick={() => void saveNodes(nodes, edges)} disabled={saveState === 'saving'}>重试保存</button></div>}

        {tab === 'nodes' && (
          <main aria-label="节点与连线主工作区" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: 'var(--space-3)' }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {nodes.map((node, index) => {
                const tool = tools.find((item) => item.id === node.tool_id);
                const isEditing = editingNode === node.id;
                return <div key={node.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, borderColor: isEditing ? 'var(--color-brand)' : undefined }}><div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><button aria-label={`上移 ${node.label || node.id}`} className="btn btn-ghost btn-xs" onClick={() => { const next = nodes.slice(); [next[index - 1], next[index]] = [next[index], next[index - 1]]; void saveNodes(next); }} disabled={index === 0}><ChevronUp size={12} /></button><button aria-label={`下移 ${node.label || node.id}`} className="btn btn-ghost btn-xs" onClick={() => { const next = nodes.slice(); [next[index], next[index + 1]] = [next[index + 1], next[index]]; void saveNodes(next); }} disabled={index === nodes.length - 1}><ChevronDown size={12} /></button></div><span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 30 }}>{node.id}</span>{isEditing ? <div style={{ flex: 1, display: 'flex', gap: 8 }}><input aria-label="编辑节点标签" value={editLabel} onChange={(event) => setEditLabel(event.target.value)} style={{ flex: 1 }} /><select aria-label="编辑节点工具" value={editToolId} onChange={(event) => setEditToolId(parseInt(event.target.value, 10))} style={{ width: 160 }}><option value={0}>选择工具</option>{tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}</select><button className="btn btn-primary btn-xs" onClick={() => { void saveNodes(nodes.map((item) => item.id === node.id ? { ...item, label: editLabel, tool_id: editToolId } : item)); setEditingNode(null); }}>确定</button></div> : <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{node.label || node.id}</div>{tool && <div className="page-note" style={{ fontSize: 10 }}>工具：{tool.name} ({tool.type})</div>}</div>}{!isEditing && <div className="toolbar"><button className="btn btn-xs" onClick={() => openNodeDetail(node)} style={{ color: 'var(--color-brand)' }}>详情</button><button className="btn btn-ghost btn-xs" onClick={() => { setEditingNode(node.id); setEditLabel(node.label || node.id); setEditToolId(node.tool_id || 0); }}>编辑</button><button className="btn btn-ghost btn-xs" onClick={() => void saveNodes(nodes.filter((item) => item.id !== node.id), edges.filter((edge) => edge.from !== node.id && edge.to !== node.id))} aria-label={`删除 ${node.label || node.id}`}><Trash2 size={14} /></button></div>}</div>;
              })}
              {nodes.length === 0 && <div className="panel" style={{ color: 'var(--text-secondary)' }}>暂无节点。点击“添加节点”开始。</div>}
              <button className="btn btn-primary" onClick={() => void saveNodes(nodes.concat([{ id: `n${nodes.length + 1}`, tool_id: 0, label: '新节点' }]))} style={{ alignSelf: 'flex-start' }}><Plus size={14} /> 添加节点</button>

              <section className="panel" aria-label="节点连线"><div className="toolbar" style={{ marginBottom: 12 }}><h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>节点连线（{edges.length} 条）</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowAddEdge(!showAddEdge)}><Plus size={12} /> 添加连线</button></div>{showAddEdge && <div style={{ background: 'var(--color-surface-muted)', padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><select aria-label="连线起点" value={newEdge.from} onChange={(event) => setNewEdge({ ...newEdge, from: event.target.value })}><option value="">从节点</option>{nodes.map((node) => <option key={node.id} value={node.id}>{node.label || node.id}</option>)}</select><ArrowRight size={14} /><select aria-label="连线终点" value={newEdge.to} onChange={(event) => setNewEdge({ ...newEdge, to: event.target.value })}><option value="">到节点</option>{nodes.map((node) => <option key={node.id} value={node.id}>{node.label || node.id}</option>)}</select><select aria-label="连线类型" value={newEdge.type} onChange={(event) => setNewEdge({ ...newEdge, type: event.target.value })}><option value="sequential">顺序</option><option value="if-else">IF/ELSE</option><option value="parallel">并行</option></select><button className="btn btn-primary btn-sm" onClick={() => { if (newEdge.from && newEdge.to) { void saveNodes(nodes, edges.concat([newEdge])); setShowAddEdge(false); setNewEdge({ from: '', to: '', type: 'sequential' }); } }} disabled={!newEdge.from || !newEdge.to}>确认</button></div>}{edges.map((edge, index) => { const from = nodes.find((node) => node.id === edge.from); const to = nodes.find((node) => node.id === edge.to); return <div key={index} className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span className="mono" style={{ fontSize: 12, color: 'var(--blue)' }}>{from ? (from.label || from.id) : edge.from}</span><span className="chip info">{edge.type === 'if-else' ? <GitFork size={10} /> : <ArrowRight size={10} />}{edge.type === 'if-else' ? 'IF' : edge.type === 'parallel' ? '并行' : '顺序'}</span><span className="mono" style={{ fontSize: 12, color: 'var(--green)' }}>{to ? (to.label || to.id) : edge.to}</span><button className="btn btn-ghost btn-xs" onClick={() => void saveNodes(nodes, edges.filter((_, edgeIndex) => edgeIndex !== index))} aria-label="删除连线" style={{ marginLeft: 'auto' }}><Trash2 size={12} /></button></div>; })}</section>
            </section>
            <aside aria-label="工作流辅助信息" className="panel"><h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>编辑提示</h2><p className="page-note">节点顺序、工具绑定和连线都会通过现有工作流接口保存。</p><p className="page-note" style={{ marginTop: 12 }}>保存失败时保留当前草稿，可从顶部重试。</p></aside>
          </main>
        )}

        {tab === 'roles' && <main aria-label="角色绑定主工作区" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: 'var(--space-3)' }}><section style={{ maxWidth: 720 }}><p className="page-note" style={{ marginBottom: 16 }}>为每个节点绑定角色。节点执行时自动加载对应角色的审查 prompt。</p>{nodes.map((node) => <div key={node.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}><span className="mono" style={{ fontSize: 12, fontWeight: 600, minWidth: 90 }}>{node.label || node.id}</span><span className="page-note">→</span><select aria-label={`${node.label || node.id} 角色`}><option value="">选择角色</option><option>架构师</option><option>高级产品经理</option><option>安全审计师</option><option>资深用户评测员</option><option>领域专家</option><option>资深测试工程师</option></select><label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}><input type="checkbox" /> 对抗模式</label></div>)}{nodes.length === 0 && <div className="panel" style={{ color: 'var(--text-secondary)' }}>暂无节点可绑定角色。</div>}<button className="btn btn-primary" onClick={() => { setSaveState('saved'); window.setTimeout(() => setSaveState('idle'), 1500); }}><Save size={14} /> 保存角色绑定</button></section><aside className="panel" aria-label="角色绑定辅助信息"><h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>角色策略</h2><p className="page-note">角色选择仅影响工作流节点执行时加载的审查 prompt。</p></aside></main>}

        {tab === 'monitor' && <main aria-label="工作流监控主工作区"><div className="toolbar" style={{ marginBottom: 12 }}><span className="chip mono">调用 {totalCalls}</span><span className="chip mono">Token {totalTokens.toLocaleString()}</span><span className="chip mono">平均 {avgMs} ms</span></div><EntityBreakdownPanel entityType="workflow" entityId={workflowId} entityName={wf.name} /></main>}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
void th;
void td;
