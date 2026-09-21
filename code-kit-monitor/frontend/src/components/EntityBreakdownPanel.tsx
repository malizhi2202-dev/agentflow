import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Bot, GitBranch, Wrench, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  entityType: string;
  entityId: number;
  entityName?: string;
  toolName?: string;
}

const COLORS: Record<string, string> = {
  agent: '#5cb878',
  workflow: '#3b82f6',
  tool: '#f59e0b',
  orchestration: '#a855f7',
};

const TIME_RANGES = [
  { label: '15min', minutes: 15 },
  { label: '60min', minutes: 60 },
  { label: '6h', minutes: 360 },
  { label: '24h', minutes: 1440 },
];

export default function EntityBreakdownPanel({ entityType, entityId, entityName, toolName }: Props) {
  const [data, setData] = useState<any>(null);
  const [minutes, setMinutes] = useState(60);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const uid = () => localStorage.getItem('current_user_id') || 'admin';
  const mainColor = COLORS[entityType] || '#5cb878';

  useEffect(() => {
    let url = `/api/metrics/entity/${entityType}/${entityId}/breakdown?minutes=${minutes}`;
    if (entityType === 'tool' && toolName) url += `&tool_name=${encodeURIComponent(toolName)}`;
    fetch(url, {
      headers: { 'X-User-Id': uid() },
    }).then(r => r.json()).then(d => setData(d)).catch(() => setData(null));
  }, [entityType, entityId, minutes, toolName]);

  if (!data) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>加载中...</div>;
  if (data.total_tokens === 0 && data.total_calls === 0) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>暂无消耗数据</div>;

  const panel: React.CSSProperties = { background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 16, border: '1px solid var(--border-normal, #2a2d35)', marginBottom: 12 };
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, margin: '0 0 12px 0', color: 'var(--color-text)' };
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-border)', marginBottom: 6 };

  return (
    <div>
      {/* 自身消耗总览 */}
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ ...sectionTitle, margin: 0 }}>
            {entityType === 'agent' ? '🤖' : entityType === 'workflow' ? '🔀' : entityType === 'orchestration' ? '🔀' : '🔧'}
            {' '}{entityName || entityType} 消耗
          </h3>
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg-input)', borderRadius: 4, padding: 2 }}>
            {TIME_RANGES.map(tr => (
              <button key={tr.minutes} onClick={() => setMinutes(tr.minutes)}
                style={{
                  padding: '3px 10px', fontSize: 11, border: 'none', borderRadius: 3, cursor: 'pointer',
                  background: minutes === tr.minutes ? 'var(--color-primary)' : 'transparent',
                  color: minutes === tr.minutes ? '#fff' : 'var(--text-secondary)',
                }}>{tr.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>总消耗</div>
            <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>{data.total_tokens?.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>平均/min</div>
            <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>{data.avg_tokens_per_min?.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>成功率</div>
            <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: data.success_rate >= 90 ? '#5cb878' : data.success_rate >= 70 ? '#e8a450' : '#dc2626' }}>{data.success_rate}%</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>平均耗时</div>
            <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>{data.avg_duration_ms ? (data.avg_duration_ms / 1000).toFixed(1) + 's' : '-'}</div>
          </div>
        </div>

        {/* 自身柱状图 */}
        {data.buckets?.length > 0 && (
          <div>
            <div onClick={() => toggle('self')} style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>📈 消耗趋势</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)' }}>
                {expanded.has('self') ? <><ChevronDown size={14} /> 收起</> : <><ChevronRight size={14} /> 展开</>}
              </div>
            </div>
            {expanded.has('self') && (
              <div style={{ height: 150, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.buckets.map((b: any) => ({ time: new Date(b.ts * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), tokens: b.tokens }))}>
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 12, color: '#f1f5f9' }} />
                    <Bar dataKey="tokens" fill={mainColor} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 工作流 或 Agent 子项 */}
      {(data.workflows?.length > 0 || data.agents?.length > 0) && (
        <div style={panel}>
          <h3 style={sectionTitle}>{data.agents ? '🤖 子 Agent 消耗' : '🔀 工作流消耗'}</h3>
          {(data.agents || data.workflows).map((item: any) => {
            const isAgent = !!data.agents;
            const key = (isAgent ? 'agent-' : 'wf-') + item.entity_id;
            const color = isAgent ? '#f59e0b' : '#3b82f6';
            const Icon = isAgent ? Bot : GitBranch;
            return (
              <div key={item.entity_id} style={{ marginBottom: 8 }}>
                <div onClick={() => toggle(key)} style={rowStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={14} color={color} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color }}>{item.total_tokens?.toLocaleString()} tokens</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)' }}>
                    {expanded.has(key) ? <><ChevronDown size={14} /> 收起</> : <><ChevronRight size={14} /> 展开</>}
                  </div>
                </div>
                {expanded.has(key) && (
                  <div style={{ marginTop: 8, paddingLeft: 8 }}>
                    {/* 子项趋势 */}
                    {item.buckets?.length > 0 && (
                      <div style={{ height: 120, marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>📈 Token 消耗趋势</div>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={item.buckets.map((b: any) => ({ time: new Date(b.ts * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), tokens: b.tokens }))}>
                            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#888' }} />
                            <YAxis tick={{ fontSize: 9, fill: '#888' }} />
                            <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 11, color: '#f1f5f9' }} />
                            <Bar dataKey="tokens" fill={color} radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {/* 工具分拆 */}
                    {item.tools?.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>🎯 工具命中</div>
                          <div style={{ height: 100 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={item.tools.map((t: any) => ({ name: t.name, hits: t.hits }))} layout="vertical">
                                <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#aaa' }} width={80} />
                                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 11, color: '#f1f5f9' }} />
                                <Bar dataKey="hits" fill="#a78bfa" radius={[0, 3, 3, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>💰 Token 消耗</div>
                          <div style={{ height: 100 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={item.tools.map((t: any) => ({ name: t.name, tokens: t.tokens }))} layout="vertical">
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
                    {/* Agent 内的工作流 + 工具嵌套（编排组场景） */}
                    {item.workflows?.length > 0 && (
                      <div style={{ marginTop: 8, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>🔀 工作流消耗</div>
                        {item.workflows.map((wf: any) => {
                          const wfKey = key + '-wf-' + wf.entity_id;
                          return (
                            <div key={wf.entity_id} style={{ marginBottom: 4 }}>
                              <div onClick={() => toggle(wfKey)} style={{ ...rowStyle, marginBottom: 2, padding: '6px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <GitBranch size={12} color="#3b82f6" />
                                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)' }}>{wf.name}</span>
                                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#3b82f6' }}>{wf.total_tokens?.toLocaleString()} tokens</span>
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                                  {expanded.has(wfKey) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </div>
                              </div>
                              {expanded.has(wfKey) && wf.tools?.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '4px 0 8px 16px' }}>
                                  <div style={{ height: Math.min(80, wf.tools.length * 20 + 10) }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2 }}>🎯 命中</div>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={wf.tools.map((t: any) => ({ name: t.name, hits: t.hits }))} layout="vertical">
                                        <XAxis type="number" tick={{ fontSize: 8, fill: '#888' }} hide />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: '#aaa' }} width={70} />
                                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 4, fontSize: 10, color: '#f1f5f9' }} />
                                        <Bar dataKey="hits" fill="#a78bfa" radius={[0, 2, 2, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                  <div style={{ height: Math.min(80, wf.tools.length * 20 + 10) }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2 }}>💰 Token</div>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={wf.tools.map((t: any) => ({ name: t.name, tokens: t.tokens }))} layout="vertical">
                                        <XAxis type="number" tick={{ fontSize: 8, fill: '#888' }} hide />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: '#aaa' }} width={70} />
                                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 4, fontSize: 10, color: '#f1f5f9' }} formatter={(val: any) => [val.toLocaleString(), 'tokens']} />
                                        <Bar dataKey="tokens" fill="#f59e0b" radius={[0, 2, 2, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 模型分布 */}
      {data.model_totals && Object.keys(data.model_totals).length > 0 && (
        <div style={panel}>
          <h3 style={sectionTitle}>🧠 模型分布</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(data.model_totals).map(([model, tokens]: [string, any]) => (
              <span key={model} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, background: 'var(--bg-input)', border: '1px solid var(--color-border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {model}
                <span style={{ color: mainColor, fontWeight: 600 }}>{(tokens as number).toLocaleString()}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 工具分拆 */}
      {data.tools?.length > 0 && (
        <div style={panel}>
          <h3 style={sectionTitle}>🔧 工具消耗</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>🎯 命中次数</div>
              <div style={{ height: Math.min(300, data.tools.length * 28 + 20) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.tools} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#aaa' }} width={80} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 11, color: '#f1f5f9' }} />
                    <Bar dataKey="hits" fill="#a78bfa" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>💰 Token 消耗</div>
              <div style={{ height: Math.min(300, data.tools.length * 28 + 20) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.tools} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#aaa' }} width={80} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 11, color: '#f1f5f9' }} formatter={(val: any) => [val.toLocaleString(), 'tokens']} />
                    <Bar dataKey="tokens" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
