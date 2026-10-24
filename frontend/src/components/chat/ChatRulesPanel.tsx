/**
 * 右栏「会话信息 + 会话规则（门禁）」。
 *
 * 为什么这块必须常驻：四条门禁（归档只读 / Agent 不可运行禁发 / 离线 queued /
 * 停止保留已返回内容）只有在**当前状态命中时**才会以禁用态体现，平时看不见；
 * 把口径本身列出来，才不会出现「页面看起来什么都能点」的错觉。
 *
 * 动态行（当前会话/当前 Agent 的真实状态）只读真实字段，缺字段就写缺字段，
 * 不摆示例值（原型里那几行是演示数据）。
 */
import type { AgentLite } from './types';
import {
  CHAT_RULES,
  NO_AUTO_TASK_NOTE,
  PRIVACY_ROW,
  RUN_ID_NOTE,
  agentNotRunnableReason,
  isAgentRunnable,
  type Reachability,
} from './chatSemantics';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 8, alignItems: 'baseline', padding: '3px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 12 }}>{children}</span>
    </div>
  );
}

export default function ChatRulesPanel({
  agent,
  conversationId,
  archived,
  reachability,
}: {
  agent: AgentLite | null;
  conversationId: number | null;
  archived: boolean;
  reachability: Reachability;
}) {
  return (
    <section className="panel" aria-label="会话信息与规则">
      <div className="toolbar" style={{ marginBottom: 4 }}>
        <span className="section-title">会话信息</span>
        <span className="chip">{archived ? '只读' : '可读写'}</span>
      </div>

      <Row label="归属">
        {agent ? (
          <>
            {agent.name}
            {agent.status ? ` · status=${agent.status}` : ' · status 未返回'}
          </>
        ) : '未选择 Agent'}
      </Row>
      <Row label="会话">
        {conversationId ? `#${conversationId}` : '尚未创建（发第一条消息时创建）'}
      </Row>
      <Row label="私密性">🔒 {PRIVACY_ROW}</Row>
      <Row label="运行时">
        <span className={`chip ${reachability.state === 'offline' ? 'warn' : reachability.state === 'online' ? 'ok' : ''}`}>
          {reachability.label}
        </span>
        <div className="page-note" style={{ marginTop: 2 }}>{reachability.detail}</div>
      </Row>
      {agent && !isAgentRunnable(agent) && (
        <Row label="可运行">
          <span className="chip bad">否</span>{' '}
          <span className="page-note">{agentNotRunnableReason(agent)}</span>
        </Row>
      )}

      <div className="toolbar" style={{ margin: '8px 0 4px' }}>
        <span className="section-title">会话规则（门禁）</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, lineHeight: 1.75, color: 'var(--text-secondary)' }}>
        {CHAT_RULES.map((r) => (
          <li key={r.key}>{r.text}</li>
        ))}
      </ul>

      <p className="page-note" style={{ marginTop: 6 }}>🏷 {NO_AUTO_TASK_NOTE}</p>
      <p className="page-note" style={{ color: 'var(--text-dim)' }}>{RUN_ID_NOTE}</p>
    </section>
  );
}
