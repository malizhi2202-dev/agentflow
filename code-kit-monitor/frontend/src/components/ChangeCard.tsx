import { AlertTriangle, Clock, Shield, Bot, UserCheck, ArrowRight, FileText } from 'lucide-react';
import type { ChangeItem } from '../stores/changes';

export default function ChangeCard({ change: c, onSelect }: { change: ChangeItem; onSelect: (id: string) => void }) {
  const isInterrupted = c.status === 'interrupted';
  const isBlocked = c.status === 'blocked';
  const isDone = c.progress_pct === 100;
  const gs = c.gate_stats;
  const ts = c.task_stats;

  return (
    <div
      onClick={() => onSelect(c.id)}
      className="card card-clickable"
      style={{
        ...(isInterrupted ? { borderLeft: '3px solid var(--red)', animation: 'pulse-red 2s ease-in-out infinite' } : {}),
        ...(isBlocked && !isInterrupted ? { borderLeft: '3px solid var(--orange)' } : {}),
      }}
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onSelect(c.id); }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {isInterrupted && <AlertTriangle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />}
          <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.id}</span>
        </div>
        <span className={`badge ${isDone ? 'badge-green' : isInterrupted ? 'badge-red' : isBlocked ? 'badge-orange' : 'badge-blue'}`} style={{ flexShrink: 0, marginLeft: 8 }}>
          {c.phase_name}
        </span>
      </div>

      {/* 进度条 */}
      {ts.total > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-weak)' }}>{c.progress}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: isDone ? 'var(--green)' : 'var(--blue)' }}>{c.progress_pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${c.progress_pct}%`, background: isDone ? 'var(--green)' : isInterrupted ? 'var(--red)' : 'var(--blue)' }} />
          </div>
        </div>
      )}

      {/* 指标 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, marginBottom: 8 }}>
        <Metric icon={<Clock size={12} />} text={`${c.total_days ?? '?'}d`} />
        <Metric icon={<Shield size={12} />} text={`${gs.passed}/${gs.total}`} active={gs.passed === gs.total && gs.total > 0} />
        <Metric icon={<Bot size={12} />} text={`${ts.auto}`} />
        {ts.manual > 0 && <Metric icon={<UserCheck size={12} />} text={`${ts.manual}`} warn />}
        {c.v1_count > 0 && <Metric icon={<FileText size={12} />} text={`${c.v1_count}`} />}
        {c.risk_count > 0 && <Metric icon={<AlertTriangle size={12} />} text={`${c.risk_count}`} warn />}
      </div>

      {/* 下一步 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-weak)', borderTop: '1px solid var(--border-weak)', paddingTop: 8 }}>
        <ArrowRight size={11} style={{ color: 'var(--blue)', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.next_action}</span>
      </div>
    </div>
  );
}

function Metric({ icon, text, active, warn }: { icon: React.ReactNode; text: string; active?: boolean; warn?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: warn ? 'var(--orange)' : active ? 'var(--green)' : 'var(--text-weak)', fontFamily: 'var(--font-mono)' }}>
      {icon} {text}
    </span>
  );
}
