import { useEffect, useState } from 'react';
import { AlertCircle, Bot, Brain, CheckCircle2, Play, Plus, RotateCcw, Search, Square, Trash2 } from 'lucide-react';
import { useAgents } from '../stores/agents';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/ui/PageHeader';
import Toolbar from '../components/ui/Toolbar';

interface Props { onSelect?: (agent: any) => void; }
type RequestState = 'loading' | 'success' | 'error';

export default function AgentBuilder({ onSelect }: Props) {
  var { agents, fetchAgents, deleteAgent, runAgent, stopAgent, loading } = useAgents();
  var [deleteId, setDeleteId] = useState<number | null>(null);
  var [memoryLoading, setMemoryLoading] = useState<Record<number, boolean>>({});
  var [loadedMemories, setLoadedMemories] = useState<Record<number, any[]>>({});
  var [requestState, setRequestState] = useState<RequestState>('loading');
  var [query, setQuery] = useState('');
  var [statusFilter, setStatusFilter] = useState('all');

  var refreshAgents = async function() {
    setRequestState('loading');
    try {
      await fetchAgents();
      setRequestState('success');
    } catch (e) {
      console.error('加载 Agent 列表失败:', e);
      setRequestState('error');
    }
  };

  useEffect(function() { void refreshAgents(); }, []);

  var loadMemories = async function(agentId: number) {
    setMemoryLoading(function(prev) { return { ...prev, [agentId]: true }; });
    try {
      var res = await fetch('/api/agents/' + agentId + '/load-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  var normalizedQuery = query.trim().toLowerCase();
  var visibleAgents = agents.filter(function(a) {
    var matchesQuery = !normalizedQuery || [a.name, a.description, a.runtime, a.model_name].some(function(value) {
      return String(value || '').toLowerCase().includes(normalizedQuery);
    });
    var matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  var isLoading = loading || requestState === 'loading';
  var summary = requestState === 'error'
    ? 'Agent 列表请求失败，请重试。'
    : isLoading
      ? '正在请求 Agent 列表…'
      : agents.length === 0
        ? '暂无 Agent，可从右上角创建第一个 Agent。'
        : `已加载 ${agents.length} 个 Agent，支持按名称、运行时和状态筛选。`;

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <PageHeader
        title="Agent"
        context="构建 / Agent 列表"
        summary={summary}
        action={
          /* 新建默认值不再预置模型 / Provider / API Key：运行时与模型由表单从「运行时发现」里选 */
          <button onClick={function() { if (onSelect) onSelect({ name: '', description: '' }); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
            <Plus size={14} /> 创建 Agent
          </button>
        }
      />

      <div style={{ padding: '0 28px 28px' }}>
        <Toolbar>
          <label htmlFor="agent-list-search" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
            搜索 Agent
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px', minWidth: 220 }}>
            <Search size={15} color="var(--color-text-tertiary)" aria-hidden="true" />
            <input
              id="agent-list-search"
              value={query}
              onChange={function(e) { setQuery(e.target.value); }}
              placeholder="搜索名称、描述、运行时或模型"
              style={{ width: '100%', padding: '8px 10px', background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 13 }}
            />
          </div>
          <label htmlFor="agent-status-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)', fontSize: 13 }}>
            状态
            <select
              id="agent-status-filter"
              value={statusFilter}
              onChange={function(e) { setStatusFilter(e.target.value); }}
              style={{ padding: '8px 10px', background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 13 }}
            >
              <option value="all">全部</option>
              <option value="standby">待命</option>
              <option value="running">运行中</option>
              <option value="completed">已完成</option>
              <option value="error">错误</option>
              <option value="disabled">已禁用</option>
            </select>
          </label>
          <span className="grow" />
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {isLoading ? '请求中' : `${visibleAgents.length} / ${agents.length}`}
          </span>
        </Toolbar>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 280px)', gap: 28, alignItems: 'start', marginTop: 20 }}>
          <main aria-label="Agent 主列表" style={{ minWidth: 0 }}>
            {isLoading ? (
              <div role="status" aria-live="polite" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-surface)' }}>
                正在加载 Agent 列表…
              </div>
            ) : requestState === 'error' ? (
              <div role="alert" style={{ padding: 28, textAlign: 'center', color: 'var(--color-danger)', border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-surface)' }}>
                <AlertCircle size={20} aria-hidden="true" />
                <p style={{ margin: '8px 0 12px' }}>Agent 列表加载失败。</p>
                <button onClick={function() { void refreshAgents(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                  <RotateCcw size={14} /> 重试
                </button>
              </div>
            ) : agents.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-surface)' }}>
                <Bot size={24} aria-hidden="true" />
                <p style={{ margin: '8px 0 12px' }}>暂无 Agent</p>
                <button onClick={function() { if (onSelect) onSelect({ name: '', description: '' }); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                  <Plus size={14} /> 创建第一个 Agent
                </button>
              </div>
            ) : visibleAgents.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-surface)' }}>
                当前筛选条件下没有 Agent。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {visibleAgents.map(function(a) {
                  var capabilities = (a.model_config_json && a.model_config_json.capabilities) || [];
                  var mems = loadedMemories[a.id] || [];
                  return (
                    <article key={a.id} onClick={function() { if (onSelect) onSelect(a); }} className={onSelect ? 'card card-clickable' : 'card'} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
                          <Bot size={18} color="var(--color-primary)" aria-hidden="true" />
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{a.name}</span>
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: statusColor(a.status), color: '#fff' }}>{statusLabel(a.status)}</span>
                          {/* ── A4: 加载记忆 指示器 ── */}
                          {capabilities.length > 0 && (
                            <button
                              onClick={function(e) { e.stopPropagation(); void loadMemories(a.id); }}
                              disabled={memoryLoading[a.id]}
                              title="加载记忆"
                              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, border: '1px solid var(--border)', background: mems.length > 0 ? 'var(--blue-bg)' : 'var(--bg-input)', color: mems.length > 0 ? 'var(--blue)' : 'var(--text-dim)', cursor: memoryLoading[a.id] ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Brain size={10} />
                              {memoryLoading[a.id] ? '加载中...' : mems.length > 0 ? '记忆 ' + mems.length : '加载记忆'}
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={function(e) { e.stopPropagation(); }}>
                          {a.status === 'standby' && <button onClick={function() { void runAgent(a.id); }} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)' }} title="运行"><Play size={14} /></button>}
                          {a.status === 'running' && <button onClick={function() { void stopAgent(a.id); }} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="停止"><Square size={14} /></button>}
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
                        {/* 模型留空 = 用运行时自身默认；不显示成空白，免得看成「未配置」 */}
                        <span>运行时: {a.runtime || '未选'}</span><span>模型: {a.model_name || '随运行时默认'}</span>
                        <span>软限制: {a.token_soft_limit?.toLocaleString()}</span><span>硬限制: {a.token_hard_limit?.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>Token 已用: {a.total_tokens_used?.toLocaleString()} | 项目: {a.project_count}</div>
                      {capabilities.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {capabilities.map(function(cap: string) { return <span key={cap} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 2, background: 'var(--purple-bg)', color: 'var(--purple)' }}>{cap}</span>; })}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </main>

          <aside aria-label="Agent 列表辅助信息" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <section style={{ padding: 16, border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-surface)' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>请求状态</h2>
              {requestState === 'loading' || loading ? (
                <p role="status" aria-live="polite" style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 13 }}>正在加载 Agent 列表…</p>
              ) : requestState === 'error' ? (
                <p role="alert" style={{ margin: 0, color: 'var(--color-danger)', fontSize: 13 }}>加载失败，可使用主列表中的重试操作。</p>
              ) : (
                <p role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, color: 'var(--color-success)', fontSize: 13 }}>
                  <CheckCircle2 size={15} aria-hidden="true" /> 请求成功 · {agents.length} 个 Agent
                </p>
              )}
            </section>
            {requestState === 'success' && agents.length > 0 && (
              <section style={{ padding: 16, border: '1px solid var(--color-border-subtle)', borderRadius: 6, background: 'var(--color-surface)' }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>列表摘要</h2>
                <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, margin: 0, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  <dt>当前显示</dt><dd style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>{visibleAgents.length}</dd>
                  <dt>运行中</dt><dd style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>{agents.filter(function(a) { return a.status === 'running'; }).length}</dd>
                  <dt>待命</dt><dd style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>{agents.filter(function(a) { return a.status === 'standby'; }).length}</dd>
                </dl>
              </section>
            )}
          </aside>
        </div>
      </div>
      {deleteId && <ConfirmDialog open={true} title="确认删除" message="确定删除此 Agent？" onConfirm={async function() { if (deleteId !== null) await deleteAgent(deleteId); setDeleteId(null); }} onCancel={function() { setDeleteId(null); }} />}
    </div>
  );
}
