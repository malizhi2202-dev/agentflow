import { useEffect, useState } from 'react';
import { Plus, Trash2, Bot, Play, Square, Brain } from 'lucide-react';
import { useAgents } from '../stores/agents';
import ConfirmDialog from '../components/ConfirmDialog';

interface Props { onSelect?: (agent: any) => void; }

export default function AgentBuilder({ onSelect }: Props) {
  var { agents, fetchAgents, deleteAgent, runAgent, stopAgent, loading } = useAgents();
  var [deleteId, setDeleteId] = useState<number | null>(null);
  var [memoryLoading, setMemoryLoading] = useState<Record<number, boolean>>({});
  var [loadedMemories, setLoadedMemories] = useState<Record<number, any[]>>({});

  useEffect(function() { fetchAgents(); }, []);

  var loadMemories = async function(agentId: number) {
    setMemoryLoading(function(prev) { return { ...prev, [agentId]: true }; });
    try {
      var uid = localStorage.getItem('current_user_id') || 'admin';
      var res = await fetch('/api/agents/' + agentId + '/load-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
        body: JSON.stringify({ limit: 20, days: 7 }),
      });
      var data = await res.json();
      setLoadedMemories(function(prev) { return { ...prev, [agentId]: data.memories || [] }; });
    } catch (e) {
      console.error('加载记忆失败:', e);
    } finally {
      setMemoryLoading(function(prev) { return { ...prev, [agentId]: false }; });
    }
  };

  var statusColor = function(s: string) { return s === 'standby' ? 'var(--color-success)' : s === 'running' ? 'var(--color-warning)' : s === 'error' ? 'var(--color-danger)' : 'var(--text-dim)'; };
  var statusLabel = function(s: string) { var m: Record<string, string> = { standby: '待命', running: '运行中', completed: '已完成', error: '错误', disabled: '已禁用' }; return m[s] || s; };

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>Agent</h1>
        <button onClick={function() { if (onSelect) onSelect({ name: '', description: '', runtime: 'langgraph', model_provider: 'ollama', model_name: 'qwen2:0.5b', api_key: '', workflow_id: 0, token_soft_limit: 800000, token_hard_limit: 1000000, gate_pre: '', gate_post: '', io_filter: 'none', system_prompt: '', role_def: '', sop: '' }); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          <Plus size={14} /> 创建 Agent
        </button>
      </div>
      {loading ? <p style={{ color: 'var(--text-dim)' }}>加载中...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {agents.map(function(a) {
            var capabilities = (a.model_config_json && a.model_config_json.capabilities) || [];
            var mems = loadedMemories[a.id] || [];
            return (
              <div key={a.id} onClick={function() { if (onSelect) onSelect(a); }} style={{ background: 'var(--color-surface)', borderRadius: 8, padding: 16, border: '1px solid var(--color-border)', cursor: onSelect ? 'pointer' : 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bot size={18} color="var(--color-primary)" />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{a.name}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: statusColor(a.status), color: '#fff' }}>{statusLabel(a.status)}</span>
                    {/* ── A4: 加载记忆 指示器 ── */}
                    {capabilities.length > 0 && (
                      <button
                        onClick={function(e) { e.stopPropagation(); loadMemories(a.id); }}
                        disabled={memoryLoading[a.id]}
                        title="加载记忆"
                        style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 3,
                          border: '1px solid var(--border)',
                          background: mems.length > 0 ? 'var(--blue-bg)' : 'var(--bg-input)',
                          color: mems.length > 0 ? 'var(--blue)' : 'var(--text-dim)',
                          cursor: memoryLoading[a.id] ? 'wait' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                        <Brain size={10} />
                        {memoryLoading[a.id] ? '加载中...' : mems.length > 0 ? '记忆 ' + mems.length : '加载记忆'}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }} onClick={function(e) { e.stopPropagation(); }}>
                    {a.status === 'standby' && <button onClick={function() { runAgent(a.id); }} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)' }} title="运行"><Play size={14} /></button>}
                    {a.status === 'running' && <button onClick={function() { stopAgent(a.id); }} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="停止"><Square size={14} /></button>}
                    {a.status !== 'running' && <button onClick={function() { setDeleteId(a.id); }} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="删除"><Trash2 size={14} /></button>}
                  </div>
                </div>
                {/* 已加载记忆预览 */}
                {mems.length > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, maxHeight: 60, overflow: 'auto', background: 'var(--bg-input)', borderRadius: 4, padding: '4px 8px' }}>
                    {mems.slice(0, 3).map(function(m: any, i: number) {
                      return <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📝 {m.key}</div>;
                    })}
                    {mems.length > 3 && <div style={{ color: 'var(--blue)' }}>...还有 {mems.length - 3} 条</div>}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <span>运行时: {a.runtime}</span><span>模型: {a.model_name}</span>
                  <span>软限制: {a.token_soft_limit?.toLocaleString()}</span><span>硬限制: {a.token_hard_limit?.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>Token 已用: {a.total_tokens_used?.toLocaleString()} | 项目: {a.project_count}</div>
                {capabilities.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {capabilities.map(function(cap: string) { return <span key={cap} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 2, background: 'var(--purple-bg)', color: 'var(--purple)' }}>{cap}</span>; })}
                  </div>
                )}
              </div>
            );
          })}
          {agents.length === 0 && <p style={{ color: 'var(--text-dim)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>暂无 Agent，点击「创建 Agent」开始</p>}
        </div>
      )}
      {deleteId && <ConfirmDialog open={true} title="确认删除" message="确定删除此 Agent？" onConfirm={async function() { await deleteAgent(deleteId); setDeleteId(null); }} onCancel={function() { setDeleteId(null); }} />}
    </div>
  );
}
