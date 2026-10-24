import { useEffect, useState } from 'react';
import { AlertCircle, Archive, Check, Inbox as InboxIcon, RefreshCw } from 'lucide-react';
import { useCollab, type InboxEntry } from '../stores/collab';

const EVENT_LABEL: Record<string, string> = {
  assigned: '指派给我', unassigned: '取消指派', mentioned: '被提及', comment: '新评论',
  status: '状态变化', priority: '优先级变化', date: '日期变化', reactions: '回应',
  task_failed: '运行失败', quick_create: '快速创建', automation: '自动化',
};

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 10,
  padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 12.5,
};

function Row({ entry }: { entry: InboxEntry }) {
  const readItem = useCollab((s) => s.readItem);
  const archiveItem = useCollab((s) => s.archiveItem);
  const [err, setErr] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    const out = await fn();
    if (!out.ok) setErr(out.error || '操作失败');
  };

  return (
    <div style={{ ...rowStyle, background: entry.read ? 'transparent' : 'var(--bg-selected)' }}>
      <span
        aria-hidden
        style={{
          width: 7, height: 7, borderRadius: '50%', marginTop: 6, flexShrink: 0,
          background: entry.read ? 'var(--border)' : entry.has_failure ? 'var(--red)' : 'var(--blue)',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: entry.read ? 400 : 600 }}>{entry.title || '（无标题）'}</span>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '0 6px' }}>
            {EVENT_LABEL[entry.event_type] || entry.event_type}
          </span>
          {entry.merged_count > 1 && (
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>合并 {entry.merged_count} 条</span>
          )}
          {entry.has_failure && <span style={{ fontSize: 10.5, color: 'var(--red)' }}>失败</span>}
        </div>
        {entry.body && <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{entry.body}</div>}
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
          任务 #{entry.work_item_id ?? '—'} · {entry.updated_at ? new Date(entry.updated_at).toLocaleString() : ''}
        </div>
        {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 4 }}>{err}</div>}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!entry.read && (
          <button className="btn btn-ghost btn-sm" onClick={() => run(() => readItem(entry.id))} title="标为已读（只动指针）">
            <Check size={13} />
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => run(() => archiveItem(entry.id))} title="归档（只动指针，任务本身不动）">
          <Archive size={13} />
        </button>
      </div>
    </div>
  );
}

export default function Inbox() {
  const {
    actionRequired, muted, unreadCount, inboxLoading, inboxError,
    fetchInbox, readAll, archiveRead,
  } = useCollab();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const runBatch = async (
    fn: () => Promise<{ ok: boolean; data?: any; error?: string }>, label: string,
  ) => {
    setNotice(null);
    const out = await fn();
    setNotice(out.ok ? `${label}：${out.data?.count ?? 0} 条` : (out.error || `${label}失败`));
  };

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <InboxIcon size={16} />收件箱
        </h2>
        <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>未读 {unreadCount} · 需我处理 {actionRequired.length}</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => fetchInbox()} disabled={inboxLoading}>
          <RefreshCw size={13} style={{ marginRight: 4 }} />刷新
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => runBatch(readAll, '全部标读')}>全部标读</button>
        <button className="btn btn-ghost btn-sm" onClick={() => runBatch(archiveRead, '归档已读')}>归档已读</button>
      </header>

      {inboxError && (
        <div role="alert" style={{ marginBottom: 10, color: 'var(--red)', fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}>
          <AlertCircle size={14} /> {inboxError}
        </div>
      )}
      {notice && <div role="status" style={{ marginBottom: 10, color: 'var(--text-secondary)', fontSize: 12 }}>{notice}</div>}

      <section aria-label="需我处理" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
          需我处理（{actionRequired.length}）
        </h3>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
          {actionRequired.length === 0
            ? <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>没有需要你处理的事。</div>
            : actionRequired.map((e) => <Row key={e.id} entry={e} />)}
        </div>
      </section>

      <section aria-label="其余">
        <h3 style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
          其余（{muted.length}）
        </h3>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
          {muted.length === 0
            ? <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>暂无其它通知。</div>
            : muted.map((e) => <Row key={e.id} entry={e} />)}
        </div>
      </section>
    </div>
  );
}
