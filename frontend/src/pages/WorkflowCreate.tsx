import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Download, Upload, ShieldAlert, ChevronDown, ChevronRight, ArrowRight, GitFork } from 'lucide-react';
import { useWorkflows } from '../stores/workflows';

var lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
var inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' };
var btn1: React.CSSProperties = { padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 };
var btn2: React.CSSProperties = { padding: '10px 16px', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 };

var DEMO_MD = '# 我的工作流\n\n**描述**: 工作流用途描述\n\n## 节点\n- n1: 天气查询 (plugin)\n- n2: 代码审查 (skill)\n- n3: 报告生成 (plugin)\n\n## 连线\n- n1 → n2 (顺序)\n- n2 → n3 (IF/ELSE: 风险等级>3)\n\n## 安全闸门\n- 前置校验: 输入必须包含 project_id\n- 后置校验: 输出不能为空\n- I/O过滤: 基础过滤\n\n## Token限制\n- 软限制: 800000\n- 硬限制: 1000000\n';

export default function WorkflowCreate({ onBack, onCreated }: { onBack: () => void; onCreated: (id: number) => void }) {
  var { createWorkflow } = useWorkflows();
  var [name, setName] = useState('');
  var [description, setDescription] = useState('');
  var [md, setMd] = useState(DEMO_MD);
  var [tools, setTools] = useState<any[]>([]);
  var [nodes, setNodes] = useState<any[]>([]);
  var [edges, setEdges] = useState<any[]>([]);
  var [showSecurity, setShowSecurity] = useState(false);
  var [gate, setGate] = useState({ pre: '', post: '', io: 'none' });
  var [token, setToken] = useState({ soft: 800000, hard: 1000000 });
  var [saved, setSaved] = useState(false);
  var [newEdge, setNewEdge] = useState({ from: '', to: '', type: 'sequential' });
  var [mode, setMode] = useState<'md'|'upload'|'visual'>('md');

  useEffect(function() {
    var uid = localStorage.getItem('current_user_id') || 'admin';
    fetch('/api/tools', { headers: { 'X-User-Id': uid } }).then(function(r) { return r.json(); }).then(function(d) { setTools(d.tools || []); });
  }, []);

  // 从 MD 解析节点和连线
  var parseMd = function(content: string) {
    var ns: any[] = []; var es: any[] = [];
    var lines = content.split('\n');
    var inNodes = false, inEdges = false;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (l === '## 节点' || l === '## Nodes') { inNodes = true; inEdges = false; continue; }
      if (l === '## 连线' || l === '## Edges') { inEdges = true; inNodes = false; continue; }
      if (l.startsWith('##') && l !== '## 节点' && l !== '## 连线') { inNodes = false; inEdges = false; continue; }
      if (inNodes && l.startsWith('- ')) {
        var m = l.match(/-\s*(\w+):\s*(.+?)\s*\((\w+)\)/);
        if (m) ns.push({ id: m[1], label: m[2].trim(), tool_id: 0, tool_type: m[3], tool_name: m[2].trim() });
      }
      if (inEdges && l.startsWith('- ')) {
        var em = l.match(/-\s*(\w+)\s*→\s*(\w+)\s*\((\S+?)\)/);
        if (em) es.push({ from: em[1], to: em[2], type: em[3] === 'IF/ELSE' ? 'if-else' : em[3] === '并行' ? 'parallel' : 'sequential' });
      }
    }
    setNodes(ns); setEdges(es);
    // 从第一行提取名称
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].startsWith('# ') && !lines[j].startsWith('## ')) { setName(lines[j].replace('# ', '').trim()); break; }
    }
  };

  useEffect(function() { parseMd(md); }, []);

  var handleSave = async function() {
    var wf = await createWorkflow({
      name: name || '未命名工作流', description: description,
      definition_mode: 'visual',
      spec_json: { nodes: nodes, edges: edges },
      token_soft_limit: token.soft, token_hard_limit: token.hard,
    });
    if (wf) { setSaved(true); setTimeout(function() { onCreated(wf.id); }, 800); }
  };

  var addToolToNode = function(tool: any) {
    var id = 'n' + (nodes.length + 1);
    setNodes(nodes.concat([{ id: id, label: tool.name, tool_id: tool.id, tool_type: tool.type, tool_name: tool.name }]));
    // 更新 MD
    var newMd = md + '\n- ' + id + ': ' + tool.name + ' (' + tool.type + ')';
    setMd(newMd);
  };

  var removeNode = function(nodeId: string) {
    setNodes(nodes.filter(function(n) { return n.id !== nodeId; }));
    setEdges(edges.filter(function(e) { return e.from !== nodeId && e.to !== nodeId; }));
  };

  var addEdge = function() {
    if (!newEdge.from || !newEdge.to) return;
    setEdges(edges.concat([newEdge]));
    setNewEdge({ from: '', to: '', type: 'sequential' });
  };

  var handleUpload = function(e: any) {
    var f = e.target.files?.[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function() { setMd(reader.result as string); parseMd(reader.result as string); };
    reader.readAsText(f);
  };

  var downloadDemo = function() {
    var blob = new Blob([DEMO_MD], { type: 'text/markdown' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'workflow-template.md'; a.click();
  };

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ArrowLeft size={18} /></button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0, flex: 1 }}>创建工作流</h1>
        {saved && <span style={{ fontSize: 11, color: 'var(--green)', padding: '4px 10px', background: 'var(--green-bg)', borderRadius: 4 }}>已创建</span>}
        <button onClick={downloadDemo} style={btn2}><Download size={14} /> 下载 Demo</button>
      </div>

      {/* 模式切换 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[{ id: 'md', label: '📝 Markdown' }, { id: 'upload', label: '📤 上传 MD' }, { id: 'visual', label: '🔀 可视化节点' }].map(function(m) {
          return <button key={m.id} onClick={function() { setMode(m.id as any); }} style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid var(--border)', background: mode === m.id ? 'var(--color-primary)' : 'var(--bg-card)', color: mode === m.id ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>{m.label}</button>;
        })}
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* 左侧：Markdown 编辑器 */}
        {(mode === 'md' || mode === 'upload') && (
          <div style={{ flex: '1 1 450px', maxWidth: 600 }}>
            {mode === 'upload' && (
              <div style={{ marginBottom: 12, padding: 16, border: '2px dashed var(--border)', borderRadius: 8, textAlign: 'center' }}>
                <Upload size={24} color="var(--text-dim)" />
                <p style={{ fontSize: 13, marginTop: 8 }}>上传 Markdown 工作流定义文件</p>
                <input type="file" accept=".md,.markdown" onChange={handleUpload} style={{ marginTop: 8 }} />
                <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>或先下载 Demo 模板：<button onClick={downloadDemo} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: 10 }}>workflow-template.md</button></p>
              </div>
            )}
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>📝 Markdown 编辑器</span>
                <button onClick={function() { parseMd(md); }} style={{ padding: '2px 8px', background: 'var(--bg-card)', color: 'var(--color-primary)', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', fontSize: 10 }}>解析 →</button>
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ width: 36, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', paddingTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textAlign: 'right', userSelect: 'none', flexShrink: 0 }}>
                  {md.split('\n').map(function(_, i) { return <div key={i} style={{ lineHeight: '20px', height: 20, paddingRight: 8 }}>{i + 1}</div>; })}
                </div>
                <textarea value={md} onChange={function(e) { setMd(e.target.value); }} style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-input)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: '20px', border: 'none', outline: 'none', resize: 'none', minHeight: 500, tabSize: 2 }} />
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><label style={lbl}>名称</label><input value={name} onChange={function(e) { setName(e.target.value); }} style={inp} /></div>
              <div><label style={lbl}>描述</label><input value={description} onChange={function(e) { setDescription(e.target.value); }} style={inp} /></div>
            </div>
          </div>
        )}

        {/* 右侧：可视化节点编辑 */}
        <div style={{ flex: '1 1 350px' }}>
          {mode === 'visual' && (
            <div style={{ padding: 12, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px 0' }}>📋 可用工具（点击添加）</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {tools.map(function(t) {
                  return (
                    <div key={t.id} onClick={function() { addToolToNode(t); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12 }}>{t.name}</span>
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: t.type === 'plugin' ? 'var(--blue-bg)' : t.type === 'skill' ? 'var(--green-bg)' : 'var(--purple-bg)', color: t.type === 'plugin' ? 'var(--blue)' : t.type === 'skill' ? 'var(--green)' : 'var(--purple)' }}>{t.type}</span>
                    </div>
                  );
                })}
                {tools.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>请先在工具库创建工具</p>}
              </div>
            </div>
          )}

          {/* 当前节点 */}
          <div style={{ padding: 12, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>🔀 当前节点（{nodes.length}）</h3>
            {nodes.map(function(n) {
              return (
                <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'var(--bg-input)', borderRadius: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', minWidth: 30 }}>{n.id}</span>
                  <span style={{ fontSize: 12, flex: 1 }}>{n.label || n.id}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{n.tool_type || '-'}</span>
                  <button onClick={function() { removeNode(n.id); }} style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}><Trash2 size={12} /></button>
                </div>
              );
            })}
            {nodes.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>点击左侧工具添加或写 Markdown 自动解析</p>}
          </div>

          {/* 连线 */}
          <div style={{ padding: 12, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>🔗 连线（{edges.length}）</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <select value={newEdge.from} onChange={function(e) { setNewEdge({ from: e.target.value, to: newEdge.to, type: newEdge.type }); }} style={{ ...inp, flex: 1 }}>
                <option value="">从</option>
                {nodes.map(function(n) { return <option key={n.id} value={n.id}>{n.label || n.id}</option>; })}
              </select>
              <select value={newEdge.to} onChange={function(e) { setNewEdge({ from: newEdge.from, to: e.target.value, type: newEdge.type }); }} style={{ ...inp, flex: 1 }}>
                <option value="">到</option>
                {nodes.map(function(n) { return <option key={n.id} value={n.id}>{n.label || n.id}</option>; })}
              </select>
              <select value={newEdge.type} onChange={function(e) { setNewEdge({ from: newEdge.from, to: newEdge.to, type: e.target.value }); }} style={{ ...inp, width: 80 }}>
                <option value="sequential">顺序</option><option value="if-else">IF</option><option value="parallel">并行</option>
              </select>
              <button onClick={addEdge} disabled={!newEdge.from || !newEdge.to} style={{ padding: '8px 12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, opacity: newEdge.from && newEdge.to ? 1 : 0.5 }}>+</button>
            </div>
            {edges.map(function(e, i) {
              var fn = nodes.find(function(n) { return n.id === e.from; }); var tn = nodes.find(function(n) { return n.id === e.to; });
              return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', background: 'var(--bg-input)', borderRadius: 3, marginBottom: 3, fontSize: 11 }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{(fn?.label || e.from)}</span>
                <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 2, background: e.type === 'if-else' ? 'var(--orange-bg)' : e.type === 'parallel' ? 'var(--purple-bg)' : 'var(--blue-bg)', color: e.type === 'if-else' ? 'var(--orange)' : e.type === 'parallel' ? 'var(--purple)' : 'var(--blue)' }}>{e.type === 'if-else' ? <GitFork size={9} /> : <ArrowRight size={9} />}{e.type === 'if-else' ? 'IF' : e.type === 'parallel' ? '||' : '→'}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{(tn?.label || e.to)}</span>
                <button onClick={function() { setEdges(edges.filter(function(_, j) { return j !== i; })); }} style={{ padding: 1, marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}><Trash2 size={10} /></button>
              </div>;
            })}
          </div>

          {/* 安全闸门 + Token */}
          <div style={{ padding: 12, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
            <button onClick={function() { setShowSecurity(!showSecurity); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', padding: 0 }}>
              {showSecurity ? <ChevronDown size={12} /> : <ChevronRight size={12} />}<ShieldAlert size={14} /> 🛡️ 安全闸门
              {!showSecurity && <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 400 }}>（默认: 软800k, 硬1M, I/O-none）</span>}
            </button>
            {showSecurity && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input value={gate.pre} onChange={function(e) { setGate({ ...gate, pre: e.target.value }); }} style={inp} placeholder="前置校验规则（默认: 无）" />
                <input value={gate.post} onChange={function(e) { setGate({ ...gate, post: e.target.value }); }} style={inp} placeholder="后置校验规则（默认: 无）" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <select value={gate.io} onChange={function(e) { setGate({ ...gate, io: e.target.value }); }} style={inp}>
                    <option value="none">I/O不过滤</option><option value="sanitize">基础</option><option value="strict">严格</option>
                  </select>
                  <input type="number" value={token.soft} onChange={function(e) { setToken({ ...token, soft: parseInt(e.target.value) || 0 }); }} style={inp} placeholder="软限制" />
                  <input type="number" value={token.hard} onChange={function(e) { setToken({ ...token, hard: parseInt(e.target.value) || 0 }); }} style={inp} placeholder="硬限制" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={handleSave} disabled={nodes.length === 0} style={{ ...btn1, opacity: nodes.length > 0 ? 1 : 0.5 }}><Save size={14} /> 创建工作流</button>
        <button onClick={onBack} style={btn2}>取消</button>
      </div>
    </div>
  );
}
