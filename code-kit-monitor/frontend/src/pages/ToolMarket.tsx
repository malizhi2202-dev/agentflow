import { useEffect, useState } from 'react';
import { Plus, Download, Trash2, Wrench, Zap, Link, Search, BarChart3, Upload, TrendingUp } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import { useTools, Tool } from '../stores/tools';
import ConfirmDialog from '../components/ConfirmDialog';
import EntityBreakdownPanel from '../components/EntityBreakdownPanel';

var TYPE_ICONS: Record<string, any> = { plugin: <Wrench size={16} />, skill: <Zap size={16} />, mcp: <Link size={16} /> };
var TYPE_LABELS: Record<string, string> = { plugin: 'Plugin', skill: 'Skill', mcp: 'MCP' };

interface Props { onSelect?: (tool: any) => void; }

export default function ToolMarket({ onSelect }: Props) {
  var { tools, fetchTools, deleteTool, loading } = useTools();
  var [typeFilter, setTypeFilter] = useState('');
  var [search, setSearch] = useState('');
  var [deleteId, setDeleteId] = useState<number | null>(null);
  var [monitorTool, setMonitorTool] = useState<Tool | null>(null);
  var [toolStats, setToolStats] = useState<Record<string, {tokens: number, calls: number}>>({});

  useEffect(function() { fetchTools(typeFilter || undefined); }, [typeFilter]);
  useEffect(function() {
    fetch('/api/metrics/rankings?dimension=tool&top=50&minutes=1440', {
      headers: { 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' }
    }).then(r => r.json()).then(d => {
      var map: Record<string, any> = {};
      (Array.isArray(d) ? d : []).forEach(function(item: any) { map[item.name] = item; });
      setToolStats(map);
    }).catch(() => {});
  }, [tools]);

  var filtered = tools.filter(function(t) { return !search || t.name.toLowerCase().indexOf(search.toLowerCase()) >= 0; });

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>工具库</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            <Upload size={13} /> 上传 MD
            <input type="file" accept=".md,.markdown" onChange={function(e) { var f = e.target.files?.[0]; if (f) { var r = new FileReader(); r.onload = function() { if (onSelect) onSelect({ name: f.name.replace('.md',''), type: 'plugin', description: '', content_md: r.result as string, token_soft_limit: 80000, token_hard_limit: 100000, permissions: ['read'], gate_pre: '', gate_post: '', io_filter: 'none' }); }; r.readAsText(f); } }} style={{ display: 'none' }} />
          </label>
<button onClick={function() { if (onSelect) onSelect({ name: '', type: 'plugin', description: '', content_md: '', token_soft_limit: 80000, token_hard_limit: 100000, permissions: ['read'], gate_pre: '', gate_post: '', io_filter: 'none' }); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
            <Plus size={14} /> 创建工具
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'plugin', 'skill', 'mcp'].map(function(t) {
          return <button key={t} onClick={function() { setTypeFilter(t); }} style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid var(--border)', background: typeFilter === t ? 'var(--color-primary)' : 'var(--bg-card)', color: typeFilter === t ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>{t || '全部'}</button>;
        })}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', borderRadius: 4, padding: '0 8px', border: '1px solid var(--border)' }}>
          <Search size={14} color="var(--text-dim)" />
          <input placeholder="搜索..." value={search} onChange={function(e) { setSearch(e.target.value); }} style={{ border: 'none', background: 'none', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 0', outline: 'none', width: 160 }} />
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--text-dim)' }}>加载中...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {filtered.map(function(tool) {
            return (
              <div key={tool.id} onClick={function() { if (onSelect) onSelect(tool); }} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--color-primary)' }}>{TYPE_ICONS[tool.type]}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{TYPE_LABELS[tool.type]}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: tool.status === 'active' ? 'var(--green-bg)' : 'var(--red-bg)', color: tool.status === 'active' ? 'var(--green)' : 'var(--red)' }}>{tool.status === 'active' ? '已发布' : '已禁用'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={function(e: any) { e.stopPropagation(); setMonitorTool(tool); }} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="监控"><BarChart3 size={14} /></button>
                    <button onClick={function(e: any) { e.stopPropagation(); window.open('/api/tools/' + tool.id + '/demo'); }} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="下载 demo"><Download size={14} /></button>
                    <button onClick={function(e: any) { e.stopPropagation(); setDeleteId(tool.id); }} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="删除"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{tool.name}</div>
                {tool.content_md ? (
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', maxHeight: 60, overflow: 'hidden', whiteSpace: 'pre-wrap', lineHeight: 1.5, opacity: 0.7, marginBottom: 8 }}>{tool.content_md.slice(0, 200)}{tool.content_md.length > 200 ? '...' : ''}</div>
                ) : <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{tool.description || '点击进入详情编辑'}</div>}
                <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  <span>软: {tool.token_soft_limit?.toLocaleString()}</span>
                  <span>硬: {tool.token_hard_limit?.toLocaleString()}</span>
                  <span>权限: {(function(p: any) { if (Array.isArray(p)) return p.join(', '); try { return JSON.parse(p || '[]').join(', '); } catch(e) { return 'read'; } })(tool.permissions)}</span>
                </div>
                {toolStats[tool.name] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 8px', background: 'var(--bg-input)', borderRadius: 4 }}>
                    <TrendingUp size={12} color="#f59e0b" />
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>{(toolStats[tool.name].tokens || 0).toLocaleString()} tokens</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{toolStats[tool.name].calls} calls</span>
                    <div style={{ flex: 1, height: 16, maxWidth: 80 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[{ tokens: toolStats[tool.name].tokens }]}>
                          <ReTooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 4, fontSize: 10, color: '#f1f5f9' }} />
                          <Bar dataKey="tokens" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p style={{ color: 'var(--text-dim)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>暂无工具，点击「创建工具」开始</p>}
        </div>
      )}
{deleteId && <ConfirmDialog open={true} title="确认删除" message="确定删除此工具？" onConfirm={async function() { await deleteTool(deleteId); setDeleteId(null); }} onCancel={function() { setDeleteId(null); }} />}
      {monitorTool && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, width: '90vw', maxWidth: 800, maxHeight: '85vh', overflow: 'auto', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>📊 {monitorTool.name} 监控</h2>
              <button onClick={() => setMonitorTool(null)} style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-secondary)' }}>关闭</button>
            </div>
            <EntityBreakdownPanel entityType="tool" entityId={0} entityName={monitorTool.name} toolName={monitorTool.name} />
          </div>
        </div>
      )}
    </div>
  );
}

var lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
var inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
var btn1: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
var btn2: React.CSSProperties = { padding: '8px 16px', background: 'var(--bg-card)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
