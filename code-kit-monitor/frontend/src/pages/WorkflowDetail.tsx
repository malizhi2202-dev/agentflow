import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown, BarChart3, GitMerge, ArrowRight, GitFork } from 'lucide-react';
import { useWorkflows } from '../stores/workflows';
import EntityBreakdownPanel from '../components/EntityBreakdownPanel';

const th: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontSize: 10 };
const td: React.CSSProperties = { padding: '4px 8px', fontSize: 11, color: 'var(--color-text)' };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' };

export default function WorkflowDetail({ workflowId, onBack }: { workflowId: number; onBack: () => void }) {
  var { workflows, fetchWorkflows, updateWorkflow } = useWorkflows();
  var wf = workflows.find(function(w) { return w.id === workflowId; });
  var [tab, setTab] = useState('nodes');
  var [nodes, setNodes] = useState<any[]>([]);
  var [edges, setEdges] = useState<any[]>([]);
  var [editingNode, setEditingNode] = useState<string | null>(null);
  var [editLabel, setEditLabel] = useState('');
  var [editToolId, setEditToolId] = useState(0);
  var [saved, setSaved] = useState(false);
  var [monitorData, setMonitorData] = useState<any>(null);
  var [tools, setTools] = useState<any[]>([]);
  var [newEdge, setNewEdge] = useState({ from: '', to: '', type: 'sequential' });
  var [showAddEdge, setShowAddEdge] = useState(false);
  var [nodeDetailId, setNodeDetailId] = useState<string | null>(null);
  var [nd, setNd] = useState({ label: '', tool_id: 0, gate_pre: '', gate_post: '', io_filter: 'none', token_limit: 0 });

  useEffect(function() {
    fetchWorkflows();
    var uid = localStorage.getItem('current_user_id') || 'admin';
    fetch('/api/tools', { headers: { 'X-User-Id': uid } }).then(function(r) { return r.json(); }).then(function(d) { setTools(d.tools || []); });
  }, []);

  useEffect(function() {
    if (wf) {
      setNodes(wf.spec_json?.nodes || []);
      setEdges(wf.spec_json?.edges || []);
      var uid = localStorage.getItem('current_user_id') || 'admin';
      fetch('/api/metrics/sessions?limit=200&entity_type=workflow', { headers: { 'X-User-Id': uid } })
        .then(function(r) { return r.json(); }).then(function(d) { setMonitorData(d.sessions || []); });
    }
  }, [wf]);

  if (!wf) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>加载中...</div>;

  var saveNodes = function(ns: any[], es?: any[]) {
    var e = es || edges;
    setNodes(ns); setEdges(e);
    updateWorkflow(workflowId, { spec_json: { nodes: ns, edges: e } }).then(function() {
      setSaved(true); setTimeout(function() { setSaved(false); }, 1500);
    });
  };

  var openNodeDetail = function(node: any) {
    setNodeDetailId(node.id);
    setNd({ label: node.label || node.id, tool_id: node.tool_id || 0, gate_pre: node.gate_pre || '', gate_post: node.gate_post || '', io_filter: node.io_filter || 'none', token_limit: node.token_limit || 0 });
  };

  var saveNodeDetail = function() {
    var updated = nodes.map(function(n) { return n.id === nodeDetailId ? Object.assign({}, n, { label: nd.label, tool_id: nd.tool_id, gate_pre: nd.gate_pre || null, gate_post: nd.gate_post || null, io_filter: nd.io_filter, token_limit: nd.token_limit }) : n; });
    saveNodes(updated);
    setNodeDetailId(null);
  };

  // ── 节点详情页 ──
  if (nodeDetailId) {
    var node = nodes.find(function(n) { return n.id === nodeDetailId; });
    if (!node) { setNodeDetailId(null); return null; }
    return (
      <div style={{ padding: 24, height: '100%', overflow: 'auto', maxWidth: 600 }}>
        <button onClick={function() { setNodeDetailId(null); }} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={16} /> 返回节点列表
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '0 0 20px 0' }}>节点详情: {node.label || node.id}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>节点标签</label>
            <input value={nd.label} onChange={function(e) { setNd(Object.assign({}, nd, { label: e.target.value })); }} style={inp} />
          </div>
          <div>
            <label style={lbl}>绑定工具</label>
            <select value={nd.tool_id} onChange={function(e) { setNd(Object.assign({}, nd, { tool_id: parseInt(e.target.value) })); }} style={inp}>
              <option value={0}>选择工具</option>
              {tools.map(function(t) { return <option key={t.id} value={t.id}>{t.name} ({t.type})</option>; })}
            </select>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px 0' }}>🛡️ 安全闸门</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>前置校验规则</label><input value={nd.gate_pre} onChange={function(e) { setNd(Object.assign({}, nd, { gate_pre: e.target.value })); }} placeholder="例: 输入必须包含 project_id" style={inp} /></div>
              <div><label style={lbl}>后置校验规则</label><input value={nd.gate_post} onChange={function(e) { setNd(Object.assign({}, nd, { gate_post: e.target.value })); }} placeholder="例: 输出不能为空" style={inp} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>I/O 过滤</label>
                  <select value={nd.io_filter} onChange={function(e) { setNd(Object.assign({}, nd, { io_filter: e.target.value })); }} style={inp}>
                    <option value="none">不过滤</option><option value="sanitize">基础过滤</option><option value="strict">严格过滤</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Token 限制</label>
                  <input type="number" value={nd.token_limit} onChange={function(e) { setNd(Object.assign({}, nd, { token_limit: parseInt(e.target.value) || 0 })); }} style={inp} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px 0' }}>👥 角色绑定</h3>
            <select multiple style={{ ...inp, minHeight: 80 }}>
              <option>架构师</option><option>高级产品经理</option><option>安全审计师</option>
              <option>资深用户评测员</option><option>领域专家</option><option>资深测试工程师</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
              <input type="checkbox" /> 对抗模式（两个角色互相审核）
            </label>
          </div>

          <button onClick={saveNodeDetail} style={{ padding: '10px 20px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
            <Save size={14} /> 保存节点配置
          </button>
        </div>
      </div>
    );
  }

  // ── 主页面 ──
  var monSessions = (monitorData || []).filter(function(s: any) { return s.entity_type === 'workflow'; });
  var totalTokens = monSessions.reduce(function(s: number, x: any) { return s + (x.total_tokens || 0); }, 0);
  var totalMs = monSessions.reduce(function(s: number, x: any) { return s + (x.duration_ms || 0); }, 0);
  var totalCalls = monSessions.length;
  var avgMs = totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ArrowLeft size={18} /></button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0, flex: 1 }}>{wf.name}</h1>
        {saved && <span style={{ fontSize: 11, color: 'var(--green)', padding: '4px 8px', background: 'var(--green-bg)', borderRadius: 4 }}>已保存</span>}
        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 3, background: wf.status === 'published' ? 'var(--green-bg)' : 'var(--bg-input)', color: wf.status === 'published' ? 'var(--green)' : 'var(--text-dim)' }}>{wf.status === 'published' ? '已发布' : wf.status}</span>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {['nodes', 'roles', 'monitor'].map(function(t) {
          return <button key={t} onClick={function() { setTab(t); }} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === t ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>{t === 'nodes' ? '🔀 节点编辑' : t === 'roles' ? '👥 角色绑定' : '📊 监控'}</button>;
        })}
      </div>

      {tab === 'nodes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
          {nodes.map(function(node, i) {
            var tool = tools.find(function(t) { return t.id === node.tool_id; });
            var isEditing = editingNode === node.id;
            return (
              <div key={node.id} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 14, border: isEditing ? '1px solid var(--color-primary)' : '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }} onClick={function(e) { e.stopPropagation(); }}>
                  <button onClick={function() { var ns = nodes.slice(); var t = ns[i]; ns[i] = ns[i-1]; ns[i-1] = t; saveNodes(ns); }} disabled={i === 0} style={{ padding: 2, background: 'none', border: 'none', cursor: i > 0 ? 'pointer' : 'default', color: 'var(--text-dim)', opacity: i > 0 ? 1 : 0.3 }}><ChevronUp size={12} /></button>
                  <button onClick={function() { var ns = nodes.slice(); var t = ns[i]; ns[i] = ns[i+1]; ns[i+1] = t; saveNodes(ns); }} disabled={i === nodes.length - 1} style={{ padding: 2, background: 'none', border: 'none', cursor: i < nodes.length - 1 ? 'pointer' : 'default', color: 'var(--text-dim)', opacity: i < nodes.length - 1 ? 1 : 0.3 }}><ChevronDown size={12} /></button>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', minWidth: 30 }}>{node.id}</span>
                {isEditing ? (
                  <div style={{ flex: 1, display: 'flex', gap: 8 }} onClick={function(e) { e.stopPropagation(); }}>
                    <input value={editLabel} onChange={function(e) { setEditLabel(e.target.value); }} style={{ flex: 1, padding: '6px 8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }} />
                    <select value={editToolId} onChange={function(e) { setEditToolId(parseInt(e.target.value)); }} style={{ padding: '6px 8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                      <option value={0}>选择工具</option>
                      {tools.map(function(t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}
                    </select>
                    <button onClick={function() { saveNodes(nodes.map(function(n) { return n.id === node.id ? Object.assign({}, n, { label: editLabel, tool_id: editToolId }) : n; })); setEditingNode(null); }} style={{ padding: '4px 10px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>确定</button>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{node.label || node.id}</div>
                    {tool && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>工具: {tool.name} ({tool.type})</div>}
                  </div>
                )}
                {!isEditing && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={function(e) { e.stopPropagation(); }}>
                    <button onClick={function() { openNodeDetail(node); }} style={{ padding: '4px 8px', color: 'var(--color-primary)', background: 'none', border: '1px solid var(--color-primary)', borderRadius: 4, cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>详情</button>
                    <button onClick={function() { setEditingNode(node.id); setEditLabel(node.label || node.id); setEditToolId(node.tool_id || 0); }} style={{ padding: '4px 8px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>编辑</button>
                    <button onClick={function() { saveNodes(nodes.filter(function(n) { return n.id !== node.id; }), edges.filter(function(e) { return e.from !== node.id && e.to !== node.id; })); }} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
          {nodes.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>暂无节点</div>}
          <button onClick={function() { saveNodes(nodes.concat([{ id: 'n' + (nodes.length + 1), tool_id: 0, label: '新节点' }])); }} style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> 添加节点</button>

          {/* 连线管理 */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><GitMerge size={14} /> 节点连线（{edges.length} 条）</h3>
              <button onClick={function() { setShowAddEdge(!showAddEdge); }} style={{ padding: '6px 12px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={12} /> 添加连线</button>
            </div>
            {showAddEdge && (
              <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <select value={newEdge.from} onChange={function(e) { setNewEdge(Object.assign({}, newEdge, { from: e.target.value })); }} style={{ padding: '6px 10px', background: 'var(--bg-card)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                  <option value="">从节点</option>
                  {nodes.map(function(n) { return <option key={n.id} value={n.id}>{n.label || n.id}</option>; })}
                </select>
                <ArrowRight size={14} color="var(--text-dim)" />
                <select value={newEdge.to} onChange={function(e) { setNewEdge(Object.assign({}, newEdge, { to: e.target.value })); }} style={{ padding: '6px 10px', background: 'var(--bg-card)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                  <option value="">到节点</option>
                  {nodes.map(function(n) { return <option key={n.id} value={n.id}>{n.label || n.id}</option>; })}
                </select>
                <select value={newEdge.type} onChange={function(e) { setNewEdge(Object.assign({}, newEdge, { type: e.target.value })); }} style={{ padding: '6px 10px', background: 'var(--bg-card)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                  <option value="sequential">顺序</option>
                  <option value="if-else">IF/ELSE</option>
                  <option value="parallel">并行</option>
                </select>
                <button onClick={function() { if (newEdge.from && newEdge.to) { saveNodes(nodes, edges.concat([newEdge])); setShowAddEdge(false); setNewEdge({ from: '', to: '', type: 'sequential' }); } }} disabled={!newEdge.from || !newEdge.to} style={{ padding: '6px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, opacity: newEdge.from && newEdge.to ? 1 : 0.5 }}>确认</button>
              </div>
            )}
            {edges.map(function(edge, i) {
              var fn = nodes.find(function(n) { return n.id === edge.from; });
              var tn = nodes.find(function(n) { return n.id === edge.to; });
              var typeColor = edge.type === 'if-else' ? 'var(--orange)' : edge.type === 'parallel' ? 'var(--purple)' : 'var(--blue)';
              var typeBg = edge.type === 'if-else' ? 'var(--orange-bg)' : edge.type === 'parallel' ? 'var(--purple-bg)' : 'var(--blue-bg)';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#548cf0' }}>{fn ? (fn.label || fn.id) : edge.from}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 3, fontSize: 9, background: typeBg, color: typeColor }}>
                    {edge.type === 'if-else' ? <GitFork size={10} /> : <ArrowRight size={10} />}
                    {edge.type === 'if-else' ? 'IF' : edge.type === 'parallel' ? '并行' : '顺序'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#5cb878' }}>{tn ? (tn.label || tn.id) : edge.to}</span>
                  <button onClick={function() { saveNodes(nodes, edges.filter(function(_: any, j: number) { return j !== i; })); }} style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', marginLeft: 'auto' }}><Trash2 size={12} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div style={{ maxWidth: 640 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>为每个节点绑定角色。节点执行时自动加载对应角色的审查 prompt。</p>
          {nodes.map(function(node) {
            return (
              <div key={node.id} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 14, border: '1px solid var(--border)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, minWidth: 60 }}>{node.label || node.id}</span>
                <span style={{ color: 'var(--text-dim)' }}>→</span>
                <select style={{ padding: '6px 10px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                  <option value="">选择角色</option>
                  <option>架构师</option><option>高级产品经理</option><option>安全审计师</option><option>资深用户评测员</option><option>领域专家</option><option>资深测试工程师</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" /> 对抗模式
                </label>
              </div>
            );
          })}
          {nodes.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>暂无节点</div>}
          <button onClick={function() { setSaved(true); setTimeout(function() { setSaved(false); }, 1500); }} style={{ marginTop: 12, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> 保存角色绑定</button>
        </div>
      )}

      {tab === 'monitor' && (
        <EntityBreakdownPanel entityType="workflow" entityId={workflowId} entityName={wf?.name || '工作流'} />
      )}
    </div>
  );
}

var lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
