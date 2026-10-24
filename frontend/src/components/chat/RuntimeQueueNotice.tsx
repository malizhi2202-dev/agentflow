/**
 * 运行时排队提示条（语义 ③：运行时离线 → queued 等待上线）。
 *
 * 只在两种情况下出现：
 *   1. 运行时确实离线（`GET /api/runtimes` 里该 CLI 全部 offline）；
 *   2. 会话里已经有 queued 消息（`messages.status === 'pending'`）。
 * 其余情况一律不渲染 —— 没有离线证据就不摆「等待上线」，避免吓人。
 */
import type { Reachability } from './chatSemantics';
import { QUEUED_GAP_NOTE, QUEUED_NOTE } from './chatSemantics';

export default function RuntimeQueueNotice({
  reachability,
  queuedCount,
}: {
  reachability: Reachability;
  queuedCount: number;
}) {
  const offline = reachability.state === 'offline';
  if (!offline && queuedCount === 0) return null;

  return (
    <div
      className="panel"
      role="note"
      aria-label="运行时排队提示"
      style={{ borderStyle: 'dashed', background: 'transparent', padding: 'var(--s2) var(--s3)' }}
    >
      <div className="toolbar" style={{ marginBottom: 4 }}>
        <span className="chip warn">queued · 等待上线</span>
        <span className="chip">{offline ? reachability.label : '有消息在排队'}</span>
        {queuedCount > 0 && <span className="chip mono">排队 {queuedCount} 条</span>}
      </div>
      <p className="page-note">{QUEUED_NOTE}</p>
      <p className="page-note" style={{ color: 'var(--text-dim)' }}>{QUEUED_GAP_NOTE}</p>
    </div>
  );
}
