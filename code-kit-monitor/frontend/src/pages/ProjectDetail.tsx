import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Square, RefreshCw, BarChart3, FileText, GitBranch, Bot, Clock, MessageSquare, ExternalLink, ChevronDown, ChevronRight, Network } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useProjects } from '../stores/projects';
import { useAgents } from '../stores/agents';
import { useWorkflows } from '../stores/workflows';
import { useMetrics } from '../stores/metrics';
import ChatWindow from '../components/ChatWindow';
import EntityBreakdownPanel from '../components/EntityBreakdownPanel';

interface Props { projectId: number; onBack: () => void; onNavigateAgent?: (agent: any) => void; }

export default function ProjectDetail({ projectId, onBack, onNavigateAgent }: Props) {
  const { projects, fetchProjects, executeProject, stopProject } = useProjects();
  const { agents, fetchAgents } = useAgents();
  const { workflows, fetchWorkflows } = useWorkflows();
  const { data: metrics, fetchMetrics } = useMetrics();

  const [tab, setTab] = useState<'overview' | 'chat' | 'agent' | 'orchestration' | 'monitor' | 'history'>('overview');

  // 衍生：项目 + 绑定 Agent（提前计算，供 useEffect 使用）
  const project = projects.find(p => p.id === projectId);
  const boundAgent = project ? agents.find(a => a.id === project.agent_id) : undefined;

  // Agent tab: 消耗数据 + 会话
  const [breakdown, setBreakdown] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [orchInfo, setOrchInfo] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sessPage, setSessPage] = useState(1);

  const toggleExpand = (key: string) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  useEffect(() => {
    if (tab === 'agent' && boundAgent) {
      const uid = localStorage.getItem('current_user_id') || 'admin';
      fetch('/api/metrics/project/' + projectId + '/breakdown?minutes=60', { headers: { 'X-User-Id': uid } })
        .then(r => r.json()).then(d => setBreakdown(d)).catch(() => setBreakdown(null));
      // 编排组信息
      if (project?.orchestration_id) {
        fetch('/api/orchestration', { headers: { 'X-User-Id': uid } })
          .then(r => r.json()).then(d => {
            const orch = (Array.isArray(d) ? d : (d.instances || [])).find((o: any) => o.id === project.orchestration_id);
            setOrchInfo(orch || null);
          }).catch(() => setOrchInfo(null));
      }
      fetch('/api/metrics/sessions?entity_type=agent&limit=50&minutes=1440', { headers: { 'X-User-Id': uid } })
        .then(r => r.json()).then(d => {
          const all = (d.sessions || []).filter((s: any) => s.entity_type === 'agent' && s.owner_id === (project?.owner_id));
          setSessions(all);
        }).catch(() => setSessions([]));
    }
  }, [tab, boundAgent, projectId]);

  // 项目对话
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatConversationId, setChatConversationId] = useState<number | null>(null);

  useEffect(() => { fetchProjects(); fetchAgents(); fetchWorkflows(); }, []);
  useEffect(() => { if (projectId) fetchMetrics('project', projectId, 60); }, [projectId, tab]);

  const uid = () => localStorage.getItem('current_user_id') || 'admin';

  const sendChatMessage = (content: string) => {
    if (!boundAgent) { setChatError('请先绑定 Agent'); return; }
    setChatLoading(true); setChatError(null);
    const tempMsg = { id: Date.now(), role: 'user', content, status: 'done', created_at: new Date().toISOString() };
    setChatMessages(prev => [...prev, tempMsg]);
    fetch('/api/agents/' + boundAgent.id + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ content, conversation_id: chatConversationId, project_id: projectId }),
    }).then(r => r.json()).then(d => {
      if (d.ok) {
        setChatMessages(prev => prev.filter(m => m.id !== tempMsg.id).concat([d.user_message, d.agent_message]));
        setChatConversationId(d.conversation_id);
        if (d.agent_message?.status === 'error') setChatError(d.agent_message.content);
      } else {
        setChatMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        setChatError(d.detail || '发送失败');
      }
      setChatLoading(false);
    }).catch(() => { setChatLoading(false); setChatError('网络错误'); });
  };

  if (!project) return <div style={{ padding: 40, color: 'var(--text-weak)' }}>加载中...</div>;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><ArrowLeft size={18} /></button>
        <FileText size={20} color="var(--color-primary)" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0, flex: 1 }}>{project.name}</h1>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: project.status === 'running' ? 'var(--color-warning)' : project.status === 'completed' ? 'var(--color-success)' : 'var(--color-text-dim)', color: '#fff' }}>{project.status}</span>
        {project.status === 'pending' && <button onClick={() => executeProject(project.id)} style={btn1}><Play size={12} /> 执行</button>}
        {project.status === 'running' && <button onClick={() => stopProject(project.id)} style={btnDanger}><Square size={12} /> 停止</button>}
      </div>

      {/* Tab 导航 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border-normal, #2a2d35)', overflowX: 'auto' }}>
        {(['overview','chat','agent','orchestration','monitor','history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
            {t === 'overview' ? '📋 概览' : t === 'chat' ? '💬 对话' : t === 'agent' ? '🤖 Agent' : t === 'orchestration' ? '🔀 编排组' : t === 'monitor' ? '📊 监控' : '📜 历史'}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
          {/* 需求 */}
          <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> 需求文档</h3>
            <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
              {project.parsed_summary || project.requirement_raw || '暂无需求'}
            </div>
          </div>

          {/* 绑定 Agent（创建时已选定，此处只读展示） */}
          <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}><Bot size={14} /> 绑定 Agent</h3>
            {boundAgent ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Bot size={16} color="var(--color-primary)" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{boundAgent.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{boundAgent.model_name} · {boundAgent.runtime} · token 上限: {(boundAgent.token_hard_limit || 0).toLocaleString()}</div>
                  </div>
                </div>

                {/* Agent 绑定的工作流（只读） */}
                <div style={{ borderTop: '1px solid var(--border-normal, #2a2d35)', paddingTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}><GitBranch size={12} /> 工作流</div>
                  {(() => {
                    const wfIds: number[] = boundAgent.workflow_ids || (boundAgent.workflow_id ? [boundAgent.workflow_id] : []);
                    const wfs = wfIds.map((id: number) => workflows.find(w => w.id === id)).filter(Boolean);
                    return wfs.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {wfs.map((wf: any) => (
                          <span key={wf.id} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, background: 'var(--bg-input)', border: '1px solid var(--border-normal, #2a2d35)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <GitBranch size={11} /> {wf.name}
                            <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{(wf.spec_json?.nodes || []).length} 节点</span>
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>未绑定工作流</span>;
                  })()}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: 12 }}>创建项目时未选择 Agent · <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} style={{ color: 'var(--color-primary)' }}>返回列表重新创建</a></div>
            )}
          </div>

          {/* 时间 */}
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> 创建于 {project.created_at?.slice(0, 19)}</div>
        </div>
      )}

      {tab === 'chat' && (
        <div style={{ height: 'calc(100vh - 200px)', minHeight: 400 }}>
          {boundAgent ? (
            <ChatWindow
              agentId={boundAgent.id}
              agentName={boundAgent.name}
              messages={chatMessages}
              loading={chatLoading}
              error={chatError}
              onSend={sendChatMessage}
              onRetry={() => setChatError(null)}
              extraHeader={
                <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MessageSquare size={12} /> 项目专属对话 · Agent: {boundAgent.name}
                </span>
              }
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
              <MessageSquare size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: '0 0 8px' }}>暂未绑定 Agent</p>
              <p style={{ fontSize: 12, margin: 0 }}>请先在「📋 概览」中绑定一个 Agent，再使用对话功能</p>
            </div>
          )}
        </div>
      )}

      {tab === 'agent' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
          {boundAgent ? (<>
            {/* Agent 基本信息 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bot size={20} color="var(--color-primary)" />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{boundAgent.name}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: 2 }}>
                      {boundAgent.model_name} · {boundAgent.runtime} · token 上限: {(boundAgent.token_hard_limit || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button onClick={() => { if (onNavigateAgent) onNavigateAgent(boundAgent); }} style={{ padding: '6px 14px', fontSize: 11, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={12} /> 查看详情
                </button>
              </div>
              {boundAgent.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 }}>
                {boundAgent.description}
              </div>}
              {/* 工作流/角色标签 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {(() => {
                  const wfIds: number[] = boundAgent.workflow_ids || (boundAgent.workflow_id ? [boundAgent.workflow_id] : []);
                  const wfs = wfIds.map((id: number) => workflows.find(w => w.id === id)).filter(Boolean);
                  return wfs.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 50 }}>🔀 工作流</span>
                      {wfs.map((wf: any) => <span key={wf.id} style={tag}>{wf.name}</span>)}
                    </div>
                  );
                })()}
                {boundAgent.role_def && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 50 }}>👥 角色</span>
                    <span style={tag}>{boundAgent.role_def.slice(0, 80)}{boundAgent.role_def.length > 80 ? '...' : ''}</span>
                  </div>
                )}
                {boundAgent.system_prompt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 50 }}>🔧 工具</span>
                    <span style={tag}>系统 Prompt 已配置 ({boundAgent.system_prompt.length} 字符)</span>
                  </div>
                )}
              </div>
            </div>

            {/* 消耗监控 */}
            <div style={panel}>
              <h3 style={sectionTitle}>💰 本项目消耗（最近 60 分钟）</h3>
              {breakdown ? (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><span style={metricLabel}>总消耗</span><span style={metricVal}>{breakdown.total_tokens?.toLocaleString()} tokens</span></div>
                  <div><span style={metricLabel}>平均/min</span><span style={metricVal}>{breakdown.avg_tokens_per_min?.toLocaleString()}</span></div>
                </div>

                {/* 主 Agent 柱状图 */}
                {breakdown.agents?.map((ag: any, i: number) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div onClick={() => toggleExpand('agent-' + ag.entity_id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bot size={14} color="#5cb878" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{ag.name}</span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#5cb878' }}>{ag.total_tokens?.toLocaleString()} tokens</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)' }}>
                        {expanded.has('agent-' + ag.entity_id) ? <><ChevronDown size={14} /> 收起</> : <><ChevronRight size={14} /> 展开</>}
                      </div>
                    </div>
                    {expanded.has('agent-' + ag.entity_id) && ag.buckets?.length > 0 && (
                      <div style={{ marginTop: 8, height: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ag.buckets.map((b: any) => ({ time: new Date(b.ts * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), tokens: b.tokens }))}>
                            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                            <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 12, color: '#f1f5f9' }} />
                            <Bar dataKey="tokens" fill="#5cb878" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ))}

                {/* 工作流消耗 */}
                {breakdown.workflows?.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>🔀 工作流消耗</div>
                    {breakdown.workflows.map((wf: any) => (
                      <div key={wf.entity_id} style={{ marginBottom: 8 }}>
                        <div onClick={() => toggleExpand('wf-' + wf.entity_id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <GitBranch size={14} color="#3b82f6" />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{wf.name}</span>
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#3b82f6' }}>{wf.total_tokens?.toLocaleString()} tokens</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)' }}>
                            {expanded.has('wf-' + wf.entity_id) ? <><ChevronDown size={14} /> 收起</> : <><ChevronRight size={14} /> 展开</>}
                          </div>
                        </div>
                        {expanded.has('wf-' + wf.entity_id) && (
                          <>
                            {wf.buckets?.length > 0 && (
                              <div style={{ marginTop: 8, height: 140 }}>
                                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>📈 Token 消耗趋势</div>
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={wf.buckets.map((b: any) => ({ time: new Date(b.ts * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), tokens: b.tokens }))}>
                                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 12, color: '#f1f5f9' }} />
                                    <Bar dataKey="tokens" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            {/* 工具命中 + Token 消耗 */}
                            {wf.tools?.length > 0 && (
                              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>🎯 工具命中次数</div>
                                  <div style={{ height: 120 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={wf.tools.map((t: any) => ({ name: t.name, hits: t.hits }))} layout="vertical">
                                        <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#aaa' }} width={80} />
                                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 11, color: '#f1f5f9' }} />
                                        <Bar dataKey="hits" fill="#a78bfa" radius={[0, 3, 3, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>💰 工具 Token 消耗</div>
                                  <div style={{ height: 120 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={wf.tools.map((t: any) => ({ name: t.name, tokens: t.tokens }))} layout="vertical">
                                        <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#aaa' }} width={80} />
                                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 11, color: '#f1f5f9' }} formatter={(val: any) => [val.toLocaleString(), 'tokens']} />
                                        <Bar dataKey="tokens" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 子 Agent 消耗 */}
                {breakdown.agents?.length > 1 && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>🤖 其他 Agent 消耗（本项目内）</div>
                    {breakdown.agents.filter((ag: any) => ag.entity_id !== boundAgent.id).map((ag: any) => (
                      <div key={ag.entity_id} style={{ marginBottom: 8 }}>
                        <div onClick={() => toggleExpand('subagent-' + ag.entity_id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Bot size={14} color="#f59e0b" />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{ag.name}</span>
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>{ag.total_tokens?.toLocaleString()} tokens</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)' }}>
                            {expanded.has('subagent-' + ag.entity_id) ? <><ChevronDown size={14} /> 收起</> : <><ChevronRight size={14} /> 展开</>}
                          </div>
                        </div>
                        {expanded.has('subagent-' + ag.entity_id) && ag.buckets?.length > 0 && (
                          <div style={{ marginTop: 8, height: 140 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={ag.buckets.map((b: any) => ({ time: new Date(b.ts * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), tokens: b.tokens }))}>
                                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 12, color: '#f1f5f9' }} />
                                <Bar dataKey="tokens" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>) : (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 12 }}>暂无消耗数据</div>
              )}
            </div>

            {/* 会话记录 */}
            <div style={panel}>
              <h3 style={sectionTitle}>📜 本项目会话记录（{sessions.length} 条）</h3>
              {sessions.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={th}>时间</th><th style={th}>模型</th><th style={{ ...th, textAlign: 'right' }}>Token</th><th style={th}>状态</th>
                  </tr></thead>
                  <tbody>
                    {sessions.slice(0, sessPage * 20).map((s: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={td}>{s.timestamp?.slice(5, 19) || '-'}</td>
                        <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{s.model_name}</td>
                        <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{s.total_tokens?.toLocaleString()}</td>
                        <td style={td}><span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 9, background: s.status === 'success' ? 'rgba(92,184,120,0.15)' : 'rgba(220,38,38,0.15)', color: s.status === 'success' ? '#5cb878' : '#dc2626' }}>{s.status === 'success' ? 'OK' : 'ERR'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 12 }}>暂无会话记录</div>
              )}
              {sessions.length > sessPage * 20 && (
                <div style={{ textAlign: 'center', marginTop: 10 }}>
                  <button onClick={() => setSessPage(p => p + 1)} style={{ padding: '6px 16px', fontSize: 11, background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer' }}>
                    加载更多（{sessions.length - sessPage * 20} 条剩余）
                  </button>
                </div>
              )}
            </div>
          </>) : (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
              <Bot size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: '0 0 8px' }}>项目未绑定 Agent</p>
              <p style={{ fontSize: 12, margin: 0 }}>Agent 在创建项目时选择，不可在此更改</p>
            </div>
          )}
        </div>
      )}

      {tab === 'orchestration' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
          {project?.orchestration_id ? (
            <>
              {orchInfo && (
                <div style={panel}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ ...sectionTitle, margin: 0 }}>
                      <Network size={14} color="#a855f7" style={{ marginRight: 6 }} />
                      {orchInfo.name}
                    </h3>
                    <a href={`/orchestration/${project.orchestration_id}/edit`} style={{ padding: '6px 14px', fontSize: 11, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ExternalLink size={12} /> 查看详情
                    </a>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                    {orchInfo.status} · {orchInfo.agent_count} Agents · 优先级 {orchInfo.priority}
                  </div>
                </div>
              )}
              <EntityBreakdownPanel entityType="orchestration" entityId={project.orchestration_id} entityName={orchInfo?.name || '编排组'} />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
              <Network size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: '0 0 8px' }}>项目未绑定编排组</p>
              <p style={{ fontSize: 12, margin: 0 }}>创建项目时可选择绑定编排组，或联系管理员绑定</p>
            </div>
          )}
        </div>
      )}

      {tab === 'monitor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
          <EntityBreakdownPanel entityType="project" entityId={projectId} entityName={project?.name || '项目'} />
        </div>
      )}

      {tab === 'monitor' && false && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div style={card}><span style={cardVal}>{(metrics?.total_tokens || 0).toLocaleString()}</span><span style={cardLbl}>Token 消耗</span></div>
            <div style={card}><span style={cardVal}>{(metrics?.total_hits || 0).toLocaleString()}</span><span style={cardLbl}>工具命中</span></div>
            <div style={card}><span style={cardVal}>{((metrics?.total_time_ms || 0) / 1000).toFixed(1)}s</span><span style={cardLbl}>执行时间</span></div>
            <div style={card}><span style={cardVal}>{Object.keys(metrics?.model_totals || {}).length}</span><span style={cardLbl}>使用模型</span></div>
          </div>
          {metrics?.model_totals && Object.keys(metrics.model_totals).length > 0 && (
            <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> 模型 Token 分布</h3>
              {Object.entries(metrics.model_totals).map(([name, val], i) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text)', width: 130 }}>{name}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((val as number) / (metrics.total_tokens || 1) * 100)}%`, background: 'var(--color-primary)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)', width: 80, textAlign: 'right' }}>{(val as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => fetchMetrics('project', projectId, 60)} style={{ padding: '6px 12px', background: 'var(--bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, cursor: 'pointer', fontSize: 11, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw size={12} /> 刷新</button>
        </div>
      )}

      {tab === 'history' && (
        <div style={{ color: 'var(--color-text-dim)', fontSize: 13, padding: 20, textAlign: 'center' }}>
          执行历史将在 Agent 运行后自动记录
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 };
const cardVal: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center' };
const cardLbl: React.CSSProperties = { fontSize: 11, color: 'var(--color-text-dim)' };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, fontSize: 13 };
const btn1: React.CSSProperties = { padding: '6px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 };
const btnDanger: React.CSSProperties = { padding: '6px 14px', background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 };

// Agent tab styles
const panel: React.CSSProperties = { background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)' };
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, margin: '0 0 12px 0', color: 'var(--color-text)' };
const metricLabel: React.CSSProperties = { fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2 };
const metricVal: React.CSSProperties = { fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)', display: 'block' };
const tag: React.CSSProperties = { fontSize: 10, padding: '3px 8px', borderRadius: 3, background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--color-border)' };
const th: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontSize: 10 };
const td: React.CSSProperties = { padding: '4px 8px', fontSize: 11, color: 'var(--text-secondary)' };
