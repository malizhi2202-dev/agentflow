/** 编排列表页 — 展示所有已部署的编排实例. */
import { useEffect, useState } from 'react';
import { Plus, FileText, FileCode, Pencil, Trash2, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import { useOrchestration } from '../stores/orchestration';
import ConfirmDialog from '../components/ConfirmDialog';
import EntityBreakdownPanel from '../components/EntityBreakdownPanel';
import PageHeader from '../components/ui/PageHeader';
import Toolbar from '../components/ui/Toolbar';

export default function OrchestrationListPage() {
  const { orchestrations, loading, fetchOrchestrations } = useOrchestration();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [monitorOrchId, setMonitorOrchId] = useState<number | null>(null);
  const [listReady, setListReady] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadList = async () => {
    setRequestError('');
    try {
      await fetchOrchestrations();
    } catch {
      setRequestError('编排列表加载失败，请重试。');
    } finally {
      setListReady(true);
    }
  };

  useEffect(() => { loadList(); }, []);

  const handleDelete = async (id: number) => {
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/orchestration/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete failed');
      setDeleteId(null);
      await loadList();
    } catch {
      setDeleteError('删除失败，编排内容未改变。请重试。');
    } finally {
      setDeleting(false);
    }
  };

  const monitorOrchestration = monitorOrchId
    ? orchestrations.find((orchestration) => orchestration.id === monitorOrchId)
    : undefined;

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="编排"
        context="运行 · Agent 编排"
        summary={loading || !listReady ? '正在读取编排实例…' : `共 ${orchestrations.length} 个编排实例`}
        action={(
          <a href="/orchestration/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={14} /> 新建编排
          </a>
        )}
      />

      <div className="app-body" style={{ flex: 1, minHeight: 0 }}>
        <Toolbar>
          <span className="chip mono">实例列表</span>
          <span className="page-note">查看文档、打开画布或进入监控</span>
          <span className="grow" />
          <button className="btn btn-ghost btn-sm" onClick={loadList} disabled={loading}>
            <RefreshCw size={13} /> 刷新
          </button>
        </Toolbar>

        {requestError && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12 }}>
            <AlertCircle size={14} />
            <span>{requestError}</span>
            <button className="btn btn-ghost btn-xs" onClick={loadList}>重试</button>
          </div>
        )}

        {!requestError && (loading || !listReady) && (
          <section aria-label="编排列表加载中" style={{ padding: 'var(--space-5) 0', color: 'var(--text-secondary)' }}>
            正在加载编排列表…
          </section>
        )}

        {!requestError && listReady && !loading && orchestrations.length === 0 && (
          <section aria-label="编排列表为空" style={{ padding: 'var(--space-5) 0', color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: 12 }}>还没有编排实例。</p>
            <a href="/orchestration/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <Plus size={14} /> 新建第一个编排
            </a>
          </section>
        )}

        {!requestError && listReady && orchestrations.length > 0 && (
          <section aria-label="编排实例列表" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orchestrations.map((orch) => (
              <article key={orch.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="dot" style={{ background: orch.status_color || 'var(--text-tertiary)' }} title={orch.status} aria-label={`状态：${orch.status}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{orch.name}</div>
                  <div className="page-note" style={{ fontSize: 11 }}>
                    {orch.status} · {orch.agent_count} Agents · 更新于 {orch.updated_at ? new Date(orch.updated_at).toLocaleString() : '-'}
                  </div>
                </div>
                <div className="toolbar" aria-label={`${orch.name} 操作`}>
                  <a href={`/orchestration/${orch.id}/md`} className="btn btn-ghost btn-xs" title="查看 Markdown">
                    <FileText size={12} /> MD
                  </a>
                  <a href={`/orchestration/${orch.id}/yaml`} className="btn btn-ghost btn-xs" title="查看 YAML">
                    <FileCode size={12} /> YAML
                  </a>
                  <button
                    className={`btn btn-xs ${monitorOrchId === orch.id ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setMonitorOrchId(monitorOrchId === orch.id ? null : orch.id)}
                  >
                    <BarChart3 size={12} /> 监控
                  </button>
                  <a href={`/orchestration/${orch.id}/edit`} className="btn btn-xs" style={{ textDecoration: 'none', color: 'var(--color-brand)' }}>
                    <Pencil size={12} /> 编辑画布
                  </a>
                  <button className="btn btn-ghost btn-xs" onClick={() => { setDeleteError(''); setDeleteId(orch.id); }} aria-label={`删除 ${orch.name}`}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {deleteError && (
          <div role="alert" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12 }}>
            <AlertCircle size={14} /> {deleteError}
            <button className="btn btn-ghost btn-xs" onClick={() => deleteId !== null && handleDelete(deleteId)} disabled={deleting}>重试删除</button>
          </div>
        )}

        {monitorOrchId && monitorOrchestration && (
          <aside aria-label="编排监控" className="panel" style={{ marginTop: 'var(--space-3)' }}>
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, flex: 1 }}>{monitorOrchestration.name} 监控</h2>
              <button className="btn btn-ghost btn-xs" onClick={() => setMonitorOrchId(null)}>关闭</button>
            </div>
            <EntityBreakdownPanel entityType="orchestration" entityId={monitorOrchId} entityName={monitorOrchestration.name} />
          </aside>
        )}
      </div>

      {deleteId && (
        <ConfirmDialog
          open={true}
          title="确认删除"
          message="确定删除此编排实例？"
          onConfirm={() => { if (!deleting) void handleDelete(deleteId); }}
          onCancel={() => { if (!deleting) setDeleteId(null); }}
        />
      )}
      {deleting && <div role="status" aria-live="polite" style={{ position: 'fixed', right: 20, bottom: 20 }} className="chip info">正在删除…</div>}
    </div>
  );
}
