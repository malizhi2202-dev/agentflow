/**
 * 运行时发现（v21 T-05）——原型 `runtimes.html` 的形态基线
 *
 * 只读为主：summary / stats / sessions 三个既有端点；唯一的写操作是失败会话的**重试**。
 * 口径：runtime 三词分立（Agent 运行时 / 进程内 provider / 执行隔离档位），本页只看第一个。
 */
import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { useRuntimes } from '../stores/runtimes';

const panel: React.CSSProperties = {
  background: 'var(--bg-panel)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', padding: 10,
};

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ ...panel, minWidth: 120 }}>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{value ?? '—'}</div>
    </div>
  );
}

export default function Runtimes() {
  const { summary, stats, sessions, error, loading, fetchAll, retry } = useRuntimes();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const failed = sessions.filter((s) => s.status === 'failed' || s.error);
  const summaryRows = Object.entries(summary || {}).filter(([, v]) => typeof v !== 'object');

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>运行时</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
          会话 {sessions.length} 条 · 失败 {failed.length}
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => fetchAll()} title="刷新">
          <RefreshCw size={13} /> 刷新
        </button>
      </header>

      {(error || actionError) && (
        <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
          <AlertCircle size={14} /> {actionError || error}
        </div>
      )}

      <section aria-label="运行时概览" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {summaryRows.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
            还没有运行时数据（未触发过执行时 summary 为空）。
          </p>
        )}
        {summaryRows.map(([k, v]) => <Stat key={k} label={k} value={String(v)} />)}
        {stats && Object.entries(stats).filter(([, v]) => typeof v !== 'object').slice(0, 4).map(([k, v]) => (
          <Stat key={`stats-${k}`} label={k} value={String(v)} />
        ))}
      </section>

      <section aria-label="运行时会话">
        <h3 style={{ fontSize: 12.5, margin: '0 0 6px', color: 'var(--text-secondary)' }}>会话</h3>
        {!loading && sessions.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>暂无运行时会话。</p>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          {sessions.length > 0 && (
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>
                <th style={{ padding: '4px 6px' }}>会话</th>
                <th style={{ padding: '4px 6px' }}>运行时</th>
                <th style={{ padding: '4px 6px' }}>状态</th>
                <th style={{ padding: '4px 6px' }}>错误</th>
                <th style={{ padding: '4px 6px', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
          )}
          <tbody>
            {sessions.map((s) => (
              <tr key={s.session_id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{s.session_id}</td>
                <td style={{ padding: '6px' }}>{s.runtime || '—'}</td>
                <td style={{ padding: '6px', color: s.status === 'failed' ? 'var(--red)' : 'var(--text)' }}>{s.status || '—'}</td>
                <td style={{ padding: '6px', color: 'var(--text-muted)', fontSize: 11 }}>{s.error || '—'}</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-sm" title="重试该会话"
                          onClick={async () => {
                            setActionError(null);
                            const out = await retry(s.session_id);
                            if (!out.ok) setActionError(out.error || '重试失败');
                          }}>
                    <RotateCcw size={12} /> 重试
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
