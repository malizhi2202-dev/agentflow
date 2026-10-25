/**
 * 概览栏（v26-agent-ui · 原型 agent-detail.html `v-overview` 的实现落点）
 *
 * 只读工作台：**不放任何可编辑控件**——编辑口唯一（各卡只给「去编辑 ▸」跳到能力/设置的目标子栏），
 * 否则同一端点两处可写必漂移。监控并入本栏（原顶层「监控」标签 = EntityBreakdownPanel，v26 裁定）。
 *
 * v1 差异登记（RULINGS §五点六 R26-4，无端点支撑不造假）：
 * - 原型「最近工作」= run 一等实体表（活跃/排队/取消/等待位）——本仓**无 per-agent runs 端点**，
 *   以模型会话表（/api/metrics/sessions）代替，显式标注；
 * - 来源徽标 6 类 / Cost($) / transcript 深链：SessionMetric 无来源列、无单价表，不造；
 * - 「同域共 M 条」跨 Agent 聚合不可得，只显本 Agent 条数。
 */
import { useEffect, useState } from 'react';
import { safeFetch } from '../../utils/requestDedup';
import EntityBreakdownPanel from '../EntityBreakdownPanel';

var card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 };
var cardTitle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' };
var tiny: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0' };
var monoCell: React.CSSProperties = { fontSize: 11, fontFamily: 'var(--font-mono)' };

export default function OverviewPane({ agent, goto }: {
  agent: any;
  /** 跳编辑口：goto(顶层栏, 子栏)——概览卡唯一允许的「编辑动作」 */
  goto: (top: 'cap' | 'set', pane: string) => void;
}) {
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [skillNames, setSkillNames] = useState<string[]>([]);
  const [memTotal, setMemTotal] = useState<number | null>(null);
  const [probeStatus, setProbeStatus] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<any | null>(null);

  useEffect(function () {
    if (!agent?.id) return;
    const id = agent.id;
    safeFetch('/api/metrics/sessions?entity_type=agent&entity_id=' + id + '&limit=10&minutes=1440')
      .then(function (r) { if (r.ok && Array.isArray(r.data?.sessions)) setSessions(r.data.sessions); else setSessions([]); });
    safeFetch('/api/agents/' + id + '/tools')
      .then(function (r) { if (r.ok && Array.isArray(r.data?.tools)) setSkillNames(r.data.tools.map(function (t: any) { return t.name; })); });
    safeFetch('/api/agents/' + id + '/memory/channels')
      .then(function (r) {
        if (r.ok && r.data?.channels) {
          var sum = 0;
          Object.keys(r.data.channels).forEach(function (ch) { sum += (r.data.channels[ch].total || 0); });
          setMemTotal(sum);
        } else { setMemTotal(0); }
      });
    safeFetch('/api/control-plane/probes')
      .then(function (r) {
        var rows = Array.isArray(r.data) ? r.data : (r.data?.probes || []);
        var mine = rows.find(function (p: any) { return p.agent_id === id; });
        setProbeStatus(mine ? (mine.status || 'unknown') : null);
      });
    safeFetch('/api/metrics/agent/' + id)
      .then(function (r) { if (r.ok) setTokenUsage(r.data?.limits || null); });
  }, [agent?.id]);

  function gotoLink(top: 'cap' | 'set', pane: string, label: string) {
    return (
      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 4, display: 'block' }}
        onClick={function () { goto(top, pane); }}>
        {label}
      </button>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.1fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }} aria-label="概览">
      {/* ── 左列：最近模型会话 + 消耗统计（监控并入）── */}
      <div>
        <div className="panel" style={{ marginBottom: 12 }}>
          <div className="toolbar" style={{ marginBottom: 6 }}>
            <span className="section-title" style={{ fontSize: 13 }}>最近模型会话 · 24h</span>
            <span className="chip mono">{sessions === null ? '读取中…' : sessions.length + ' 条'}</span>
            <span className="grow" />
          </div>
          <p className="page-note" style={{ margin: '0 0 8px' }}>
            代替口径（未接入）：原型此表是 run 一等实体（活跃/排队/取消/等待位）——本仓无 per-agent runs 端点，
            这里显的是模型会话（/api/metrics/sessions）；来源徽标与 Cost($) 无数据列，不造。
          </p>
          <table className="tbl compact">
            <thead><tr><th>时间</th><th>模型</th><th>tokens</th><th>耗时</th><th>状态</th></tr></thead>
            <tbody>
              {(sessions || []).map(function (s: any) {
                return (
                  <tr key={s.id}>
                    <td style={monoCell}>{s.timestamp ? new Date(s.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td style={monoCell}>{s.model_name || '—'}</td>
                    <td style={monoCell}>{s.total_tokens ?? '—'}</td>
                    <td style={monoCell}>{s.duration_ms != null ? (s.duration_ms / 1000).toFixed(1) + 's' : '—'}</td>
                    <td><span className={'chip ' + (s.status === 'success' ? 'ok' : s.status === 'error' ? 'bad' : '')}>{s.status || '—'}</span></td>
                  </tr>
                );
              })}
              {sessions !== null && sessions.length === 0 && (
                <tr><td colSpan={5} style={{ color: 'var(--text-muted)' }}>近 24h 无模型会话。</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <EntityBreakdownPanel entityType="agent" entityId={agent.id} entityName={agent.name || 'Agent'} />
      </div>

      {/* ── 右列：只读卡群（各带「去编辑 ▸」，编辑口唯一）── */}
      <div>
        <div style={card}>
          <p style={cardTitle}>标识与状态</p>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{agent.name || '—'}</p>
          <p style={tiny}><span className="chip">{agent.status || 'standby'}</span> <span className="chip mono">{agent.runtime || '未绑定运行时'}</span></p>
          <p style={tiny}>模型：<span style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>{agent.model_name || '（运行时默认）'}</span></p>
          {gotoLink('set', 'gen', '去设置 → 通用 ▸')}
        </div>

        <div style={card}>
          <p style={cardTitle}>Owner 与 Access</p>
          <p style={tiny}>owner：<span style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>{agent.owner_id || '—'}</span></p>
          <p style={tiny}>可见：<span className="chip mono">{agent.visibility || 'private'}</span></p>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0' }}>两轴编辑未接入（PUT 白名单不收 visibility/gate 列）。</p>
          {gotoLink('set', 'acc', '去设置 → Access ▸')}
        </div>

        <div style={card}>
          <p style={cardTitle}>技能（绑定后注入运行时）</p>
          {skillNames.length > 0
            ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{skillNames.map(function (n) { return <span key={n} className="chip mono" style={{ fontSize: 11 }}>{n}</span>; })}</div>
            : <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>未绑定技能。</p>}
          {gotoLink('cap', 'skill', '去能力 → 技能：管理绑定 ▸')}
        </div>

        <div style={card}>
          <p style={cardTitle}>域归属</p>
          {agent.domain_id
            ? <p style={tiny}><span className="chip info mono">domain #{agent.domain_id}</span></p>
            : <p style={tiny}><span className="chip warn">未分类</span> <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>创建时未选域</span></p>}
          {gotoLink('set', 'gen', '去设置 → 通用 ▸')}
        </div>

        <div style={card}>
          <p style={cardTitle}>探活（AgentFlow 侧服务）</p>
          {probeStatus
            ? <p style={tiny}><span className={'chip ' + (probeStatus === 'healthy' || probeStatus === 'ok' ? 'ok' : probeStatus === 'error' || probeStatus === 'unhealthy' ? 'bad' : 'warn')}>{probeStatus}</span></p>
            : <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>暂无探活记录。</p>}
          <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0' }}>口径：AgentFlow 侧服务健康，与模型 API Key 无关。</p>
          {gotoLink('set', 'probe', '去设置 → 探活 ▸')}
        </div>

        <div style={card}>
          <p style={cardTitle}>跨渠道记忆</p>
          <p style={tiny}>本 Agent 已存 <b>{memTotal === null ? '…' : memTotal}</b> 条</p>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0' }}>「同域共 M 条」聚合端点未接入（按单 Agent 过滤），只显本 Agent。</p>
        </div>

        {tokenUsage ? (
          <div style={card}>
            <p style={cardTitle}>Token 用量</p>
            <p style={{ ...tiny, fontFamily: "var(--font-mono)" }}>{tokenUsage.total_tokens_used} / {tokenUsage.token_hard_limit} · {tokenUsage.usage_percent}%</p>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0' }}>Cost($) 无单价表，不造。软/硬上限在 设置→通用 的「5 · 执行设置」。</p>
            {gotoLink('set', 'gen', '去设置 → 通用 ▸')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
