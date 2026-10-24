/**
 * Agent 详情（原型 6.4 · 独立页形态）
 *
 * 为什么需要它：此前详情只是 Agent 列表里的一个「抽屉/整页替换」，导航上没有 6.4 这一项，
 * 深链也回不到某只 Agent。这里把它做成**独立视图**：先选 Agent（列表），选中后渲染完整详情
 * （四标签：编辑 / 记忆 / 对话 / 监控，由 AgentDetail 本体提供，不重复实现一份）。
 */
import { useCallback, useEffect, useState } from 'react';
import { Bot, RefreshCw } from 'lucide-react';
import AgentDetail from './AgentDetail';
import { safeFetch } from '../utils/requestDedup';

interface AgentRow { id: number; name: string; status?: string }

export default function AgentDetailPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [agent, setAgent] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadList = useCallback(async () => {
    setErr(null);
    const out = await safeFetch('/api/agents');
    if (!out.ok) { setErr(out.error || '读取 Agent 列表失败'); return; }
    setAgents(out.data?.agents || []);
  }, []);

  const open = useCallback(async (id: number) => {
    setLoading(true); setErr(null);
    const out = await safeFetch(`/api/agents/${id}`);
    if (!out.ok) { setErr(out.error || '读取 Agent 失败'); setLoading(false); return; }
    setAgent(out.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  if (agent) {
    return <AgentDetail agent={agent} onBack={() => setAgent(null)} onSave={() => { /* 保存走 Agent 列表同一入口 */ }} />;
  }

  return (
    <div className="panel">
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <span className="section-title">选一只 Agent 看详情</span>
        <span className="chip mono">{agents.length} 只</span>
        <span className="grow" />
        <button className="btn btn-ghost btn-sm" onClick={loadList} disabled={loading}>
          <RefreshCw size={13} /> 刷新
        </button>
      </div>
      <p className="page-note">
        详情四标签：编辑 / 记忆 / 对话 / 监控。资料源、渠道集成、调度任务、记忆写入都在详情内完成，
        这里只负责「选中哪一只」——不再从列表弹抽屉，避免深链回不去。
      </p>
      {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, margin: '6px 0' }}>{err}</div>}
      <table className="tbl compact" aria-label="Agent 列表">
        <thead><tr><th>Agent</th><th>状态</th><th style={{ textAlign: 'right' }}>操作</th></tr></thead>
        <tbody>
          {agents.map((a) => (
            <tr key={a.id}>
              <td><Bot size={12} style={{ marginRight: 4, verticalAlign: -2 }} />{a.name}</td>
              <td><span className="chip">{a.status || 'standby'}</span></td>
              <td style={{ textAlign: 'right' }}>
                <button className="btn btn-ghost btn-sm" aria-label={`查看详情 ${a.name}`} onClick={() => open(a.id)}>
                  查看详情
                </button>
              </td>
            </tr>
          ))}
          {agents.length === 0 && !err && (
            <tr><td colSpan={3} style={{ color: 'var(--text-muted)' }}>还没有 Agent。</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
