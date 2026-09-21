/** 编排列表页 — 展示所有已部署的编排实例. */
import { useEffect, useState } from 'react';
import { Plus, FileText, FileCode, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { useOrchestration } from '../stores/orchestration';
import ConfirmDialog from '../components/ConfirmDialog';
import EntityBreakdownPanel from '../components/EntityBreakdownPanel';

export default function OrchestrationListPage() {
  const { orchestrations, fetchOrchestrations } = useOrchestration();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [monitorOrchId, setMonitorOrchId] = useState<number | null>(null);

  useEffect(() => { fetchOrchestrations(); }, []);

  const handleDelete = async (id: number) => {
    await fetch(`/api/orchestration/${id}`, { method: 'DELETE', headers: { 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' } });
    setDeleteId(null);
    fetchOrchestrations();
  };

  const bg = 'var(--bg-card)';
  const bd = '1px solid var(--border)';

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, margin: 0 }}>Agent 编排</h1>
        <a href="/orchestration/new" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
          <Plus size={14} /> 新建编排
        </a>
      </div>

      {orchestrations.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 15, marginBottom: 12 }}>暂无编排实例</p>
          <a href="/orchestration/new" style={{ color: 'var(--color-primary)', fontSize: 13 }}>新建第一个编排 →</a>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {orchestrations.map((orch) => (
          <div key={orch.id} style={{ padding: '14px 16px', background: bg, border: bd, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 14, transition: 'background var(--fast)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: orch.status_color || '#5d6068', flexShrink: 0 }} title={orch.status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{orch.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {orch.status} · {orch.agent_count} Agents · 更新于 {orch.updated_at ? new Date(orch.updated_at).toLocaleString() : '-'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <a href={`/orchestration/${orch.id}/md`} title="查看 MD" style={{ padding: '4px 8px', background: 'none', border: bd, borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}><FileText size={12} /> MD</a>
              <a href={`/orchestration/${orch.id}/yaml`} title="查看 YAML" style={{ padding: '4px 8px', background: 'none', border: bd, borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}><FileCode size={12} /> YAML</a>
              <button onClick={() => setMonitorOrchId(monitorOrchId === orch.id ? null : orch.id)} style={{ padding: '4px 10px', background: monitorOrchId === orch.id ? 'rgba(168,85,247,0.1)' : 'none', border: monitorOrchId === orch.id ? '1px solid #a855f7' : '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: monitorOrchId === orch.id ? '#a855f7' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}><BarChart3 size={12} /> 监控</button>
              <a href={`/orchestration/${orch.id}/edit`} style={{ padding: '4px 10px', background: 'none', border: '1px solid var(--color-primary)', borderRadius: 'var(--r-sm)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}><Pencil size={12} /> 编辑画布</a>
              <button onClick={() => setDeleteId(orch.id)} style={{ padding: '4px 6px', background: 'none', border: '1px solid transparent', borderRadius: 'var(--r-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {monitorOrchId && (
        <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, margin: 0 }}>
              📊 {orchestrations.find(o => o.id === monitorOrchId)?.name || '编排'} 监控
            </h2>
            <button onClick={() => setMonitorOrchId(null)} style={{ padding: '4px 10px', fontSize: 11, background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-secondary)' }}>关闭</button>
          </div>
          <EntityBreakdownPanel entityType="orchestration" entityId={monitorOrchId} entityName={orchestrations.find(o => o.id === monitorOrchId)?.name || '编排组'} />
        </div>
      )}

      {deleteId && <ConfirmDialog open={true} title="确认删除" message="确定删除此编排实例？" onConfirm={() => handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
