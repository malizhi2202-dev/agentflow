/**
 * 会话列表（左栏）：分组 + 私密性说明 + 归档/排队态。
 *
 * 分组口径来自 `groupConversations`（运行中 / 排队等待上线 / 今天 / 更早 / 已归档），
 * 不在这里另判一次状态 —— 两处判定必然漂移。
 *
 * 私密性说明放在列表底部常驻：这是「1:1 完全私密」最容易被后人删掉的一块，
 * 用例断言也打在这里（PRIVACY_NOTE 里含「管理员也看不到」）。
 */
import type { AgentLite, Conversation } from './types';
import { PRIVACY_NOTE, groupConversations, runStateOf } from './chatSemantics';
import RunStatusChip from './RunStatusChip';

export default function ConversationList({
  conversations,
  agents,
  currentConversationId,
  onSelect,
}: {
  conversations: Conversation[];
  agents: AgentLite[];
  currentConversationId: number | null;
  onSelect: (conv: Conversation) => void;
}) {
  const groups = groupConversations(conversations);
  const agentName = (id: number) => agents.find((a) => a.id === id)?.name || `Agent #${id}`;

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {groups.map((group) => (
        <div key={group.key} role="group" aria-label={`会话分组：${group.title}`}>
          <div
            style={{
              fontSize: 10.5, color: 'var(--text-muted)', padding: '8px 12px 4px',
              letterSpacing: 0.4, textTransform: 'none',
            }}
          >
            {group.title}（{group.items.length}）
          </div>
          {group.items.map((conv) => {
            const isActive = conv.id === currentConversationId;
            const archived = Boolean(conv.archived_at);
            const state = runStateOf(conv.last_message?.status);
            const preview = conv.last_message?.content?.slice(0, 60) || '';
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelect(conv)}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`打开会话 ${conv.title}`}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 12px', cursor: 'pointer',
                  background: isActive ? 'var(--bg-selected)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  color: 'var(--color-text)', opacity: archived ? 0.75 : 1,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.title || '新对话'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                  {agentName(conv.agent_id)} · {(conv.updated_at || conv.created_at || '').slice(0, 16).replace('T', ' ')}
                </div>
                {preview && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preview}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {archived && <span className="chip warn">已归档 · 只读</span>}
                  {conv.last_message && <RunStatusChip state={state} />}
                </div>
              </button>
            );
          })}
        </div>
      ))}

      <p
        className="page-note"
        style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}
      >
        🔒 {PRIVACY_NOTE}
      </p>
    </div>
  );
}
