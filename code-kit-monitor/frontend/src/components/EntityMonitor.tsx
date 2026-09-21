import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, X } from 'lucide-react';

const COLORS = ['#548cf0','#5cb878','#e8a450','#e05555','#b47cd8','#5dade2'];

interface Props { entityType: string; entityId: number; entityName: string; onClose: () => void; }

type ChartMode = 'bar' | 'line' | 'pie';

function Panel({ title, data, dataKey, mode, setMode }: { title: string; data: any[]; dataKey: string; mode: ChartMode; setMode: (m: ChartMode) => void }) {
  if (!data || data.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>暂无数据</div>;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{title}</h4>
        <div style={{ display: 'flex', gap: 2 }}>
          {(['bar','line','pie'] as ChartMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '2px 6px', borderRadius: 2, border: '1px solid var(--border)',
              background: mode === m ? 'var(--color-primary)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--text-dim)', cursor: 'pointer', fontSize: 9,
            }}>{m === 'bar' ? '柱' : m === 'line' ? '折' : '饼'}</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        {mode === 'bar' ? (
          <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="time" tick={{ fontSize: 8, fill: 'var(--text-dim)' }} interval={Math.max(0, Math.floor(data.length / 8))} /><YAxis tick={{ fontSize: 8, fill: 'var(--text-dim)' }} /><Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }} /><Bar dataKey={dataKey} fill="var(--color-primary)" radius={[1,1,0,0]} /></BarChart>
        ) : mode === 'line' ? (
          <LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="time" tick={{ fontSize: 8, fill: 'var(--text-dim)' }} interval={Math.max(0, Math.floor(data.length / 8))} /><YAxis tick={{ fontSize: 8, fill: 'var(--text-dim)' }} /><Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }} /><Line type="monotone" dataKey={dataKey} stroke="var(--color-primary)" strokeWidth={1.5} dot={false} /></LineChart>
        ) : (
          <PieChart><Pie data={data} dataKey={dataKey} nameKey="time" cx="50%" cy="50%" outerRadius={70} label={({ time, percent }: any) => time ? `${time} ${(percent*100).toFixed(0)}%` : ''}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }} /></PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function EntityMonitor({ entityType, entityId, entityName, onClose }: Props) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState<Record<string, ChartMode>>({ token: 'bar', hit: 'bar', freq: 'bar' });

  useEffect(() => {
    const uid = localStorage.getItem('current_user_id') || 'admin';
    fetch(`/api/metrics/sessions?limit=500&entity_type=${entityType}`, { headers: { 'X-User-Id': uid } })
      .then(r => r.json())
      .then(d => {
        const all = (d.sessions || []).filter((s: any) => s.entity_id === entityId);
        setSessions(all.slice(0, 30));
        const bm: Record<number, any> = {};
        all.forEach((s: any) => {
          const d = new Date(s.timestamp);
          const ts = Math.floor(d.getTime() / 1000 / 300) * 300;
          if (!bm[ts]) bm[ts] = { ts, time: d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'), token_count: 0, hit_count: 0, freq_count: 0 };
          bm[ts].token_count += s.total_tokens || 0;
          bm[ts].hit_count += s.tool_calls || 0;
          bm[ts].freq_count += 1;
        });
        setBuckets(Object.values(bm).sort((a: any, b: any) => a.ts - b.ts));
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [entityType, entityId]);

  const totalTokens = sessions.reduce((s: number, x: any) => s + (x.total_tokens || 0), 0);
  const totalMs = sessions.reduce((s: number, x: any) => s + (x.duration_ms || 0), 0);
  const avgMs = sessions.length > 0 ? Math.round(totalMs / sessions.length) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'var(--bg-elevated, #1a1d24)', borderRadius: 12, padding: 24, width: '85vw', maxWidth: 900, maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: 0 }}>
            📊 {entityName} — 监控
          </h2>
          <button onClick={onClose} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>加载中...</div> : (
          <>
            {/* 总览 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { v: totalTokens.toLocaleString(), l: 'Token 消耗' },
                { v: sessions.length.toString(), l: '调用次数' },
                { v: (totalMs / 1000).toFixed(1) + 's', l: '总执行时间' },
                { v: (avgMs / 1000).toFixed(2) + 's', l: '平均执行时间' },
              ].map((c, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 6, padding: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>{c.v}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>{c.l}</div>
                </div>
              ))}
            </div>

            {/* Token 消耗 */}
            <Panel title="📈 Token 消耗（5分钟粒度）" data={buckets} dataKey="token_count" mode={modes.token} setMode={(m) => setModes({ ...modes, token: m })} />

            {/* 工具命中 */}
            <Panel title="🔧 工具命中次数（5分钟粒度）" data={buckets} dataKey="hit_count" mode={modes.hit} setMode={(m) => setModes({ ...modes, hit: m })} />

            {/* 使用频次 */}
            <Panel title="📊 被使用频次（5分钟粒度）" data={buckets} dataKey="freq_count" mode={modes.freq} setMode={(m) => setModes({ ...modes, freq: m })} />

            {/* 会话日志 */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 600, margin: '0 0 8px 0' }}>📜 执行审计日志</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={th}>时间</th><th style={th}>模型</th><th style={th}>工具</th><th style={th}>Token</th><th style={th}>耗时</th><th style={th}>状态</th>
                </tr></thead>
                <tbody>
                  {sessions.map((s: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={td}>{s.timestamp?.slice(11, 19)}</td>
                      <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{s.model_name}</td>
                      <td style={td}>{s.tool_name || '-'}</td>
                      <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{s.total_tokens?.toLocaleString()}</td>
                      <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{(s.duration_ms / 1000).toFixed(1)}s</td>
                      <td style={td}><span style={{ padding: '1px 4px', borderRadius: 2, fontSize: 9, background: s.status === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: s.status === 'success' ? 'var(--green)' : 'var(--red)' }}>{s.status === 'success' ? 'OK' : 'ERR'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '4px 6px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontSize: 9 };
const td: React.CSSProperties = { padding: '3px 6px', fontSize: 10, color: 'var(--color-text)' };
