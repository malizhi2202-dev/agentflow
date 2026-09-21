import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import WorkflowTab from '../components/WorkflowTab';
import TaskTab from '../components/TaskTab';
import GateTab from '../components/GateTab';
import ArtifactTab from '../components/ArtifactTab';
import HealthTab from '../components/HealthTab';

const TABS = ['工作流', 'Task', '门禁', '产物', '健康'];

export default function Detail({ changeId, onBack }: { changeId: string; onBack: () => void }) {
  const [tab, setTab] = useState('工作流');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/changes/${changeId}`).then(r => r.json()).then(setData).catch(() => setData(null));
  }, [changeId]);

  return (
    
      <div style={{ padding: '20px 24px' }}>
        <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
          <ArrowLeft size={14} /> 返回
        </button>

        {data && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }}>{changeId}</h1>
              <span className={`badge ${data.progress_pct === 100 ? 'badge-green' : data.interrupted ? 'badge-red' : 'badge-blue'}`}>{data.phase_name}</span>
              {data.progress_pct === 100 && <span className="badge badge-green">完成</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
              <MiniStat label="进度" value={`${data.progress_pct}%`} sub={data.progress} color="var(--blue)" />
              <MiniStat label="门禁" value={`${data.gate_stats.passed}/${data.gate_stats.total}`} color={data.gate_stats.passed === data.gate_stats.total && data.gate_stats.total > 0 ? 'var(--green)' : 'var(--text-secondary)'} />
              <MiniStat label="自动化" value={`${data.task_stats.auto}🤖 ${data.task_stats.manual}👤`} color="var(--purple)" />
              <MiniStat label="风险" value={data.risks.length} color={data.risks.length > 0 ? 'var(--orange)' : 'var(--text-weak)'} />
              <MiniStat label="周期" value={`${data.total_days ?? '?'}d`} color="var(--text-weak)" />
            </div>
          </>
        )}

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-weak)', marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t} className={`btn btn-ghost btn-sm`} style={{
              borderRadius: 0, borderBottom: tab === t ? '2px solid var(--blue)' : '2px solid transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-weak)', fontWeight: tab === t ? 600 : 400,
              marginBottom: -1, padding: '8px 16px',
            }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        <div>
          {!data ? <p style={{ color: 'var(--text-weak)' }}>加载中...</p> : (
            <>
              {tab === '工作流' && <WorkflowTab data={data} />}
              {tab === 'Task' && <TaskTab tasks={data.tasks || []} />}
              {tab === '门禁' && <GateTab gates={data.gates || []} />}
              {tab === '产物' && <ArtifactTab changeId={changeId} artifacts={data.artifacts || []} />}
              {tab === '健康' && <HealthTab changeId={changeId} />}
            </>
          )}
        </div>
      </div>
  );
}

function MiniStat({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="stat-panel" style={{ padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-weak)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.03 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-weak)', fontFamily: 'var(--font-mono)' }}>{sub}</div>}
    </div>
  );
}
