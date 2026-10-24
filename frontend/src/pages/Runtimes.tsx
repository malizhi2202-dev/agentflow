/**
 * 运行时（v21 T-05 观测 + v22 §6.28 发现）
 *
 * 两块口径不混（DESIGN §6.10 ⟂ §6.28）：
 * - 「执行环境 · 自动发现」= daemon 上报的注册表（机器 × CLI × 协议族），本页新增；
 * - 「概览 / 会话」= 机器与会话的**观测**（summary / stats / sessions）。
 * 写操作只有两个：失败会话重试、运行时可见性（仅 owner；凭据始终留成员本机）。
 */
import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { useRuntimes, type RuntimeRegistryRow } from '../stores/runtimes';

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

function ago(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const secs = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (secs < 60) return `${secs}s 前`;
  if (secs < 3600) return `${Math.round(secs / 60)}min 前`;
  const d = new Date(t);
  return `${d.toLocaleString('zh-CN', { hour12: false })}（>3 分钟）`;
}

function modelCell(row: RuntimeRegistryRow) {
  if (row.models.length === 0) {
    return row.models_error
      ? <span style={{ color: 'var(--orange, #c80)' }}>不可读：{row.models_error}</span>
      : <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }
  const head = row.models.slice(0, 2).join(' · ');
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
    {head}{row.models.length > 2 ? ` +${row.models.length - 2}` : ''}
  </span>;
}

function statusCell(row: RuntimeRegistryRow) {
  const online = row.status === 'online';
  return <span style={{ color: online ? 'var(--green)' : 'var(--red)', fontSize: 12 }}>
    {online ? '● 在线' : '○ 离线'}
    <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{ago(row.last_seen)}</span>
  </span>;
}

export default function Runtimes() {
  const {
    summary, stats, sessions, error, loading, fetchAll, retry,
    registry, registryError, registryLoading, fetchRegistry, setVisibility,
  } = useRuntimes();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { fetchAll(); fetchRegistry(); }, [fetchAll, fetchRegistry]);

  const failed = sessions.filter((s) => s.status === 'failed' || s.error);
  const summaryRows = Object.entries(summary || {}).filter(([, v]) => typeof v !== 'object');

  return (
    <div style={{ padding: 16 }}>
      <header className="toolbar" style={{ marginBottom: 12 }}>
        <span className="chip mono">会话 {sessions.length} 条 · 失败 {failed.length}</span>
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

      {/* v22 §6.28：执行环境 · 自动发现（daemon 注册表）——与上面的会话观测不是同一件事 */}
      <section aria-label="执行环境 · 自动发现" style={{ ...panel, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <h3 style={{ fontSize: 12.5, margin: 0, color: 'var(--text-secondary)' }}>执行环境 · 自动发现</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>daemon 心跳 15s</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={() => fetchRegistry()} title="重新读取注册表">
            <RefreshCw size={12} /> 刷新
          </button>
        </div>

        {registryError && (
          <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 6 }}>{registryError}</div>
        )}

        {!registryLoading && registry.length === 0 && !registryError && (
          <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
            还没有运行时上报。在要接入的机器上启动 daemon（<code>scripts/runtime-daemon.py</code>），
            它每 15s 自动上报本机 PATH / 已知位置上的 AI 编码 CLI（只报路径与版本，凭据留在本机）。
          </p>
        )}

        {registry.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>
                <th scope="col" style={{ padding: '4px 6px' }}>机器 · CLI</th>
                <th scope="col" style={{ padding: '4px 6px' }}>协议族</th>
                <th scope="col" style={{ padding: '4px 6px' }}>状态 · 心跳</th>
                <th scope="col" style={{ padding: '4px 6px' }}>模型目录</th>
                <th scope="col" style={{ padding: '4px 6px' }}>可见性</th>
                <th scope="col" style={{ padding: '4px 6px' }}>绑定 Agent</th>
                <th scope="col" style={{ padding: '4px 6px', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {registry.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{row.machine_name || row.machine_id} · {row.cli}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>
                      {row.version || '版本未知'} · {row.source_file || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{row.protocol_family}</td>
                  <td style={{ padding: '6px' }}>{statusCell(row)}</td>
                  <td style={{ padding: '6px' }}>{modelCell(row)}</td>
                  <td style={{ padding: '6px', fontSize: 11 }}>
                    {row.visibility === 'public'
                      ? <span style={{ color: 'var(--blue)' }}>公开 · 只共享路由权</span>
                      : <span style={{ color: 'var(--text-muted)' }}>私有 · 仅我</span>}
                  </td>
                  <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{row.bound_agents}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>
                    {row.mine ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        aria-pressed={row.visibility === 'public'}
                        onClick={async () => {
                          setActionError(null);
                          const out = await setVisibility(row.id, row.visibility !== 'public');
                          if (!out.ok) setActionError(out.error || '可见性更新失败');
                        }}
                      >
                        {row.visibility === 'public' ? '收回私有' : '置为公开'}
                      </button>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
