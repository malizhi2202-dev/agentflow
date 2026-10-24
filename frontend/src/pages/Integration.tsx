/**
 * 对外集成面（原型 6.27 · `/admin/integration`）
 *
 * 真实数据：`GET /api/agents/{id}/channels`（IM 六通道配置）+ `GET /api/a2a/agents/{id}/card`（A2A M0 静态卡）。
 * 三区口径（原型）：协议区（A2A M0 静态卡）/ 契约区（声明式四件组）/ 可观测区（三档）。
 * 本页只读：绑定与凭据管理在「Agent 详情 · 能力 · 集成」六卡，这里不重复写入口（一份口径）。
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { safeFetch } from '../utils/requestDedup';

interface Agent { id: number; name: string }
interface Channel { id: number; channel_type: string; status?: string; enabled?: boolean; webhook_uuid?: string }

const CHANNEL_LABEL: Record<string, string> = {
  feishu: '飞书', dingtalk: '钉钉', wecom: '企业微信', slack: 'Slack', telegram: 'Telegram', webhook: 'Webhook',
};

export default function Integration() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [card, setCard] = useState<any>(null);
  const [cardErr, setCardErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAgents = useCallback(async () => {
    setErr(null);
    const out = await safeFetch('/api/agents');
    if (!out.ok) { setErr(out.error || '读取 Agent 失败'); return; }
    const list: Agent[] = out.data?.agents || [];
    setAgents(list);
    if (list.length && agentId === null) setAgentId(list[0].id);
  }, [agentId]);

  const loadDetail = useCallback(async (id: number) => {
    setLoading(true); setErr(null); setCardErr(null); setCard(null);
    const [ch, a2a] = await Promise.all([
      safeFetch(`/api/agents/${id}/channels`),
      safeFetch(`/api/a2a/agents/${id}/card`),
    ]);
    setChannels(ch.ok ? (Array.isArray(ch.data) ? ch.data : ch.data?.channels || []) : []);
    if (ch.ok) setErr(null); else setErr(ch.error || '读取渠道失败');
    if (a2a.ok) setCard(a2a.data); else setCardErr(a2a.error || '读取 A2A 卡失败');
    setLoading(false);
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);
  useEffect(() => { if (agentId !== null) loadDetail(agentId); }, [agentId, loadDetail]);

  return (
    <div>
      <div className="panel">
        <div className="toolbar">
          <span className="section-title">对外集成面</span>
          <label style={{ fontSize: 11.5, color: 'var(--text-secondary)' }} htmlFor="itg-agent">Agent</label>
          <select id="itg-agent" aria-label="选择 Agent" className="input"
                  value={agentId ?? ''} onChange={(e) => setAgentId(e.target.value ? Number(e.target.value) : null)}
                  style={{ padding: '3px 6px', fontSize: 12, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4 }}>
            {agents.length === 0 && <option value="">（无 Agent）</option>}
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <span className="grow" />
          <button className="btn btn-ghost btn-sm" onClick={() => { loadAgents(); if (agentId !== null) loadDetail(agentId); }} disabled={loading}>
            <RefreshCw size={13} /> 刷新
          </button>
        </div>
        <p className="page-note">
          三区各带「未启用」如实灰态：**协议区** A2A M0 静态卡 / **契约区** 声明式四件组 / **可观测区** 三档。
          凭据与连接管理不在本页——见 Agent 详情「能力 · 集成」六卡；本页只呈现「对外承诺了什么」。
        </p>
        {err && (
          <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 6, display: 'flex', gap: 6 }}>
            <AlertCircle size={14} /> {err}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 8 }}>
        <span className="section-title">消息渠道（六通道）</span>
        <table className="tbl compact" aria-label="消息渠道">
          <thead><tr><th>通道</th><th>状态</th><th>Webhook</th></tr></thead>
          <tbody>
            {Object.keys(CHANNEL_LABEL).map((k) => {
              const rows = channels.filter((c) => c.channel_type === k);
              return (
                <tr key={k}>
                  <td>{CHANNEL_LABEL[k]}<div className="chip mono" style={{ marginTop: 2 }}>{k}</div></td>
                  <td>{rows.length === 0
                    ? <span className="chip">未启用</span>
                    : rows.map((r) => (
                      <span key={r.id} className={`chip ${r.enabled === false ? 'warn' : 'ok'}`} style={{ marginRight: 4 }}>
                        {r.status || (r.enabled === false ? '已停用' : '已配置')}
                      </span>
                    ))}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {rows.map((r) => r.webhook_uuid).filter(Boolean).join(', ') || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: 8 }}>
        <span className="section-title">协议区 · A2A M0 静态卡</span>
        {cardErr && <p className="page-note" role="alert" style={{ color: 'var(--red)' }}>{cardErr}</p>}
        {!cardErr && !card && <p className="page-note">选择 Agent 后读取该 Agent 的 A2A 静态卡。</p>}
        {card && (
          <table className="tbl compact" aria-label="A2A 静态卡">
            <tbody>
              {Object.entries(card).filter(([, v]) => typeof v !== 'object' || v === null).map(([k, v]) => (
                <tr key={k}><td style={{ width: 180, color: 'var(--text-muted)' }}>{k}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{String(v)}</td></tr>
              ))}
              {Object.entries(card).filter(([, v]) => typeof v === 'object' && v !== null).map(([k, v]) => (
                <tr key={k}><td style={{ color: 'var(--text-muted)' }}>{k}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{JSON.stringify(v)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
