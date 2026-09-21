import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { BarChart3, TrendingUp, Clock, AlertCircle } from 'lucide-react';

interface Stats {
  summary: { today: number; week: number; total: number };
  by_stage: { stage: string; name: string; tokens: number }[];
  by_skill: { skill: string; tokens: number }[];
  by_mcp: { mcp: string; tokens: number }[];
  by_model: { model: string; tokens: number }[];
  timeline: { time: string; tokens: number }[];
}

export default function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [gran, setGran] = useState('hour');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    fetch(`/api/runtime/stats?granularity=${gran}&days=7`).then(r => r.json()).then(setStats);
  }, [gran]);

  if (!stats) return <div style={{ padding: 20, color: 'var(--text-muted)' }}>加载中...</div>;

  const fmt = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
  const stageData = stats.by_stage.map(d => ({ name: d.name || d.stage, tokens: d.tokens }));

  return (
    <div>
      {/* 控制栏 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <select value={gran} onChange={e => setGran(e.target.value)}>
          <option value="minute">按分钟</option><option value="hour">按小时</option><option value="day">按天</option>
        </select>
        <button className={`btn btn-sm ${chartType === 'bar' ? 'btn-primary' : ''}`} onClick={() => setChartType('bar')}><BarChart3 size={13} /> 柱状图</button>
        <button className={`btn btn-sm ${chartType === 'line' ? 'btn-primary' : ''}`} onClick={() => setChartType('line')}><TrendingUp size={13} /> 折线图</button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> 最近 7 天</span>
      </div>

      {/* 统计卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        <StatCard label="今日" value={fmt(stats.summary.today)} color="var(--blue)" />
        <StatCard label="本周" value={fmt(stats.summary.week)} color="var(--green)" />
        <StatCard label="总计" value={fmt(stats.summary.total)} color="var(--purple)" />
        <StatCard label="模型" value={stats.by_model.map(m => m.model).join(', ') || '-'} color="var(--orange)" small />
      </div>

      {/* 阶段消耗 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <ChartPanel title="按阶段消耗" data={stageData} chartType={chartType} color="var(--blue)" empty={stageData.length === 0} />
        <ChartPanel title="按工具消耗（适配器）" data={[
          ...(stats.by_skill || []).map(d => ({ name: d.skill, tokens: d.tokens })),
          ...(stats.by_mcp || []).map(d => ({ name: d.mcp, tokens: d.tokens })),
        ]} chartType={chartType} color="var(--purple)" empty={!stats.by_skill?.length && !stats.by_mcp?.length}
          emptyMsg="暂无 Skill/MCP 数据（v2 埋点后可用）" />
      </div>

      {/* 时间趋势 */}
      <ChartPanel title="时间趋势" data={(stats.timeline || []).map(d => ({ name: d.time, tokens: d.tokens }))} chartType={chartType} color="var(--green)" tall empty={!stats.timeline?.length} />

      {/* 数据来源 */}
      <div style={{ marginTop: 16, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--r-md)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
        <span><AlertCircle size={11} /> 数据来源：</span>
        <span>埋点数据(runtime.jsonl)：所有 Agent 通用 · Skill/MCP 统计</span>
        <span>|</span>
        <span>适配器数据(JSONL)：Token 精确值 · 仅 Claude Code/Codex</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="stat" style={{ borderTop: `3px solid ${color}` }}>
      <div className="stat-value" style={{ color, fontSize: small ? 14 : 24 }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ChartPanel({ title, data, chartType, color, tall, empty, emptyMsg }: { title: string; data: any[]; chartType: 'bar' | 'line'; color: string; tall?: boolean; empty?: boolean; emptyMsg?: string }) {
  const h = tall ? 300 : 200;
  if (empty) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
          {emptyMsg || '暂无数据'}
        </div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <ResponsiveContainer width="100%" height={h}>
        {chartType === 'bar' ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="tokens" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="tokens" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
