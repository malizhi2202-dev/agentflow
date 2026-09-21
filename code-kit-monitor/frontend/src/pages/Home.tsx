import { useEffect, useRef } from 'react';
import { useChanges, filteredChanges } from '../stores/changes';
import ChangeCard from '../components/ChangeCard';
import { Search, PanelTop } from 'lucide-react';

export default function Home({ onSelect }: { onSelect: (id: string) => void }) {
  const { changes, summary: s, loading, filter, fetchChanges } = useChanges();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    fetchChanges();
    intervalRef.current = setInterval(fetchChanges, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchChanges]);
  const list = filteredChanges(changes, filter);

  if (loading && list.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--blue)', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>扫描 .specs/ ...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* 统计 */}
      {s && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
          <Stat v={s.total_changes} label="活跃 Change" color="var(--blue)" sub={`${s.done_tasks}/${s.total_tasks} tasks`} />
          <Stat v={`${s.overall_progress_pct}%`} label="整体进度" color="var(--green)" sub={`${s.gates_passed} gates`} />
          <Stat v={s.alerts + s.blocked} label="需关注" color={s.alerts + s.blocked > 0 ? 'var(--red)' : 'var(--text-muted)'} sub={`${s.alerts}a ${s.blocked}b`} />
          <Stat v={`${s.avg_days}d`} label="平均周期" color="var(--text-secondary)" />
        </div>
      )}

      {/* 操作栏 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="搜索 change-id..." value={filter.q} onChange={e => useChanges.getState().setFilter({ q: e.target.value })} style={{ width: '100%', paddingLeft: 30 }} />
        </div>
        <select value={filter.status} onChange={e => useChanges.getState().setFilter({ status: e.target.value })}>
          <option value="all">全部状态</option><option value="normal">正常</option><option value="interrupted">中断</option><option value="blocked">阻塞</option>
        </select>
        <select value={filter.phase} onChange={e => useChanges.getState().setFilter({ phase: e.target.value })}>
          <option value="all">全部阶段</option>
          {['0-change','1-requirement','2-design','2a-ui-design','3-task','4-dev','5-test','6-review','7-integration'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{list.length}/{changes.length}</span>
      </div>

      {/* 卡片 */}
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <PanelTop size={40} style={{ marginBottom: 16, opacity: 0.1 }} />
          <p style={{ fontSize: 14, marginBottom: 4, color: 'var(--text-secondary)' }}>暂无活跃 Change</p>
          <p style={{ fontSize: 12 }}>运行 <code className="badge badge-blue">@code-kit/GO.md 新需求</code></p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))', gap: 10 }}>
          {list.map(c => <ChangeCard key={c.id} change={c} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
}

function Stat({ v, label, color, sub }: { v: string | number; label: string; color: string; sub?: string }) {
  return (
    <div className="stat" style={{ borderTop: `3px solid ${color}` }}>
      <div className="stat-value" style={{ color }}>{v}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
