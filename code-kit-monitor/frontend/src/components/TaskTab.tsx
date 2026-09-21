import { Bot, UserCheck, RotateCcw } from 'lucide-react';

const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  done: { text: '✅ done', color: 'var(--color-success)', bg: 'oklch(0.65 0.16 150 / 0.1)' },
  in_progress: { text: '● 进行中', color: 'var(--color-primary)', bg: 'oklch(0.65 0.18 230 / 0.1)' },
  pending: { text: '○ pending', color: 'var(--color-text-dim)', bg: 'transparent' },
  blocked: { text: '🚫 blocked', color: 'var(--color-danger)', bg: 'oklch(0.55 0.22 25 / 0.1)' },
};

export default function TaskTab({ tasks }: { tasks: any[] }) {
  if (!tasks.length) return <p style={{ color: 'var(--color-text-dim)' }}>暂无 task 数据</p>;

  const doneCount = tasks.filter((t: any) => t.status === 'done').length;
  const autoCount = tasks.filter((t: any) => t.auto !== false).length;
  const manualCount = tasks.filter((t: any) => t.auto === false).length;
  const retryCount = tasks.filter((t: any) => (t.retries || 0) > 0).length;

  return (
    <div aria-live="polite">
      {/* 自动化策略总览 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'center', border: '1px solid var(--color-grid)' }}>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-primary)' }}>{doneCount}/{tasks.length}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>完成</div>
        </div>
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'center', border: '1px solid var(--color-info)', borderLeft: '3px solid var(--color-info)' }}>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Bot size={20} /> {autoCount}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>🤖 自动执行</div>
        </div>
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'center', border: '1px solid var(--color-warning)', borderLeft: '3px solid var(--color-warning)' }}>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><UserCheck size={20} /> {manualCount}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>👤 需人工确认</div>
        </div>
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'center', border: '1px solid var(--color-grid)' }}>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600, color: retryCount > 0 ? 'var(--color-danger)' : 'var(--color-text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><RotateCcw size={20} /> {retryCount}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>重试</div>
        </div>
      </div>

      {/* 自动化策略说明 */}
      <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 16, fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>🤖 <b style={{ color: 'var(--color-info)' }}>自动</b>：专家团全票/多数通过 → 4-dev 自动执行，不暂停</span>
        <span>👤 <b style={{ color: 'var(--color-warning)' }}>人工</b>：专家团投票或平票 → 4-dev 执行前暂停，等人工确认</span>
      </div>

      {/* 任务列表 */}
      {tasks.map((t: any) => {
        const status = STATUS_LABEL[t.status] || STATUS_LABEL.pending;
        const isAuto = t.auto !== false;
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 2,
            borderLeft: `3px solid ${isAuto ? 'var(--color-info)' : 'var(--color-warning)'}`,
            background: status.bg, borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            fontFamily: 'var(--font-body)', fontSize: 13,
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--color-text-dim)', minWidth: 36 }}>{t.id}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 'var(--radius-sm)',
              fontSize: 11, fontWeight: 600,
              background: isAuto ? 'oklch(0.60 0.10 200 / 0.15)' : 'oklch(0.70 0.15 85 / 0.2)',
              color: isAuto ? 'var(--color-info)' : 'var(--color-warning)',
            }}>
              {isAuto ? <><Bot size={12} /> 自动</> : <><UserCheck size={12} /> 人工确认</>}
            </span>
            <span style={{ flex: 1, color: 'var(--color-text)' }}>{t.name}</span>
            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 'var(--radius-sm)', color: status.color, background: status.bg }}>{status.text}</span>
            {(t.retries || 0) > 0 && (
              <span style={{ fontSize: 11, color: 'var(--color-danger)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <RotateCcw size={12} /> {t.retries}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
