import { useEffect, useState, useRef, useCallback } from 'react';
import { Activity, Zap, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import StatsTab from '../components/StatsTab';

interface Session {
  session_id: string; agent: string; model: string; timestamp: string;
  project: string; stage: string; change_id: string; status?: string;
  input_tokens: number; output_tokens: number; message_count: number; summary: string;
}

const AGENT_ICONS: Record<string, string> = { 'claude-code': '◈', 'codex': '⬡', 'hermes': '⚚', 'xiaolongxia': '🦞' };
const STAGE_NAMES: Record<string, string> = {
  '0-change': '变更提案', '1-requirement': '需求分析', '2-design': '技术设计',
  '2a-ui-design': 'UI设计', '3-task': '任务拆分', '4-dev': '开发执行',
  '5-test': '测试验证', '6-review': '代码审查', '7-integration': '集成归档',
};
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  success: { label: '成功', color: 'var(--green)', bg: 'var(--green-bg)' },
  error: { label: '失败', color: 'var(--red)', bg: 'var(--red-bg)' },
  running: { label: '运行中', color: 'var(--blue)', bg: 'var(--blue-bg)' },
};

export default function Runtime() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [tab, setTab] = useState<'sessions' | 'stats'>('sessions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [realtime, setRealtime] = useState(false);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchData = useCallback(() => {
    fetch('/api/runtime/summary').then(r => r.json()).then(setSummary);
    const url = statusFilter && statusFilter !== 'all'
      ? `/api/runtime/sessions?status=${statusFilter}`
      : '/api/runtime/sessions';
    fetch(url).then(r => r.json()).then(d => setSessions(d.sessions || []));
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
    if (!realtime) {
      const t = setInterval(fetchData, 30000);
      return () => clearInterval(t);
    }
  }, [fetchData, realtime]);

  // SSE 实时订阅
  useEffect(() => {
    if (!realtime) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const es = new EventSource('/api/runtime/stream');
    eventSourceRef.current = es;

    es.addEventListener('session_started', (e) => {
      try {
        const data = JSON.parse(e.data);
        setSessions(prev => {
          // 去重
          if (prev.find(s => s.session_id === data.session_id)) return prev;
          return [data, ...prev];
        });
      } catch {}
    });

    es.addEventListener('agent_status_changed', (e) => {
      try {
        const data = JSON.parse(e.data);
        setSessions(prev => prev.map(s =>
          s.session_id === data.session_id ? { ...s, status: data.new_status } : s
        ));
      } catch {}
    });

    es.addEventListener('session_completed', (e) => {
      try {
        const data = JSON.parse(e.data);
        setSessions(prev => prev.map(s =>
          s.session_id === data.session_id ? { ...s, status: 'success' } : s
        ));
      } catch {}
    });

    es.onerror = () => {
      // SSE 断连后 5s 自动重连
      es.close();
      setTimeout(() => {
        if (realtime) fetchData();
      }, 5000);
    };

    return () => {
      es.close();
    };
  }, [realtime, fetchData]);

  const openDetail = async (sid: string) => {
    setSelected(sid);
    const res = await fetch(`/api/runtime/sessions/${sid}`);
    setDetail(await res.json());
  };

  const handleRetry = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRetrying(prev => new Set(prev).add(sid));
    try {
      const res = await fetch(`/api/runtime/sessions/${sid}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!data.error) {
        // 刷新列表
        fetchData();
      }
    } catch {} finally {
      setRetrying(prev => {
        const next = new Set(prev);
        next.delete(sid);
        return next;
      });
    }
  };

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  // 过滤后的会话列表
  const filteredSessions = sessions.filter(s => {
    if (!statusFilter || statusFilter === 'all') return true;
    return s.status === statusFilter;
  });

  return (
    <div style={{ padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }}>运行时</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* 实时开关 */}
          <button
            className={`btn btn-sm ${realtime ? 'btn-primary' : ''}`}
            onClick={() => setRealtime(!realtime)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {realtime ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : '🟢'}
            {realtime ? '实时' : '实时'}
          </button>
          {/* 状态过滤 */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '4px 8px', fontSize: 12, borderRadius: 4,
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            <option value="all">全部状态</option>
            <option value="running">🟢 运行中</option>
            <option value="success">✅ 成功</option>
            <option value="error">❌ 失败</option>
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn btn-sm ${tab === 'sessions' ? 'btn-primary' : ''}`} onClick={() => setTab('sessions')}>📋 会话</button>
            <button className={`btn btn-sm ${tab === 'stats' ? 'btn-primary' : ''}`} onClick={() => setTab('stats')}>📊 统计</button>
          </div>
        </div>
      </div>

      {tab === 'stats' ? <StatsTab /> : (
        <>
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
              <div className="stat" style={{ borderTop: '3px solid var(--blue)' }}><div className="stat-value" style={{ color: 'var(--blue)' }}>{summary.sessions}</div><div className="stat-label">会话</div></div>
              <div className="stat" style={{ borderTop: '3px solid var(--green)' }}><div className="stat-value" style={{ color: 'var(--green)' }}>{fmt(summary.total_output_tokens)}</div><div className="stat-label">Token 消耗</div></div>
              <div className="stat" style={{ borderTop: '3px solid var(--purple)' }}><div className="stat-value" style={{ color: 'var(--purple)', fontSize: 14 }}>{summary.models?.join(', ') || '-'}</div><div className="stat-label">模型</div></div>
              <div className="stat" style={{ borderTop: '3px solid var(--orange)' }}><div className="stat-value" style={{ color: 'var(--orange)', fontSize: 14 }}>{summary.agents?.map((a: string) => AGENT_ICONS[a] || a).join(' ') || '-'}</div><div className="stat-label">Agent</div></div>
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>
            <div style={{ width: selected ? '50%' : '100%', overflow: 'auto', borderRight: selected ? '1px solid var(--border)' : 'none', transition: 'width var(--normal) var(--ease)' }}>
              {filteredSessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                  <Activity size={36} style={{ marginBottom: 12, opacity: 0.1 }} />
                  <p>暂无运行时数据</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>运行 @code-kit/GO.md 开始后自动采集</p>
                </div>
              ) : (
                filteredSessions.map(s => {
                  const statusCfg = STATUS_CONFIG[s.status || ''] || STATUS_CONFIG.running;
                  return (
                    <div key={s.session_id} onClick={() => openDetail(s.session_id)} className="card card-clickable"
                      style={{ marginBottom: 8, padding: '12px 14px', borderLeft: selected === s.session_id ? '3px solid var(--blue)' : '3px solid transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>
                            {s.status === 'running' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} /> : AGENT_ICONS[s.agent] || '🤖'}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{s.session_id.slice(0, 8)}</span>
                          <span className="badge badge-blue">{s.agent}</span>
                          {s.model && <span className="badge badge-purple">{s.model}</span>}
                          <span style={{ padding: '2px 8px', borderRadius: 2, fontSize: 10, background: statusCfg.bg, color: statusCfg.color }}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          <span><Zap size={11} /> {fmt(s.input_tokens)} → {fmt(s.output_tokens)}</span>
                          {/* 重试按钮 */}
                          {s.status === 'error' && (
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={(e) => handleRetry(s.session_id, e)}
                              disabled={retrying.has(s.session_id)}
                              style={{ color: 'var(--orange)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 2 }}
                            >
                              {retrying.has(s.session_id) ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={10} />}
                              重试
                            </button>
                          )}
                          <ChevronRight size={12} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        {s.stage && <span className="badge badge-green">{STAGE_NAMES[s.stage] || s.stage}</span>}
                        {s.change_id && <span className="badge badge-blue">{s.change_id}</span>}
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{s.timestamp?.slice(0, 16) || ''}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {selected && detail && (
              <div style={{ width: '50%', overflow: 'auto', padding: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{selected.slice(0, 8)}...</h3>
                  <button className="btn btn-ghost btn-xs" onClick={() => setSelected(null)}>✕</button>
                </div>
                {detail.error ? <p>{detail.error}</p> : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                      <MiniStat label="Agent" value={detail.agent} />
                      <MiniStat label="模型" value={detail.models?.join?.(', ') || '-'} />
                      <MiniStat label="Token" value={`${fmt(detail.input_tokens)} → ${fmt(detail.output_tokens)}`} />
                      <MiniStat label="阶段" value={STAGE_NAMES[detail.stage] || detail.stage || '-'} />
                      {detail.status && (
                        <MiniStat label="状态" value={(STATUS_CONFIG[detail.status] || STATUS_CONFIG.running).label} />
                      )}
                    </div>
                    {(detail.events || []).map((e: any, i: number) => (
                      <div key={i} style={{ padding: '6px 10px', marginBottom: 4, borderRadius: 'var(--r-sm)', background: 'var(--bg-card)', fontSize: 11, borderLeft: '2px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{e.timestamp?.slice(11, 19) || ''}</span>
                          {e.stage && <span className="badge badge-green" style={{ fontSize: 9 }}>{STAGE_NAMES[e.stage] || e.stage}</span>}
                          {e.skills?.map((s: string, j: number) => <span key={j} className="badge badge-blue" style={{ fontSize: 9 }}>{s}</span>)}
                          {e.mcps?.map((m: string, j: number) => <span key={j} className="badge badge-purple" style={{ fontSize: 9 }}>{m}</span>)}
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{fmt(e.tokens_input + e.tokens_output)} tok · {e.source}</span>
                        </div>
                        {e.summary && <div style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.summary}</div>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat" style={{ padding: '8px 12px' }}>
      <div className="stat-label">{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{value}</div>
    </div>
  );
}
