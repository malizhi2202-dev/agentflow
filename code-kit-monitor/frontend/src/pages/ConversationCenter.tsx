import { useEffect, useState } from 'react';
import { MessageSquare, Plus, Search, Bot } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import { useChat } from '../stores/chat';

export default function ConversationCenter() {
  const {
    conversations, currentConversationId, currentAgentId,
    messages, loading, error,
    loadConversations, selectConversation, createConversation,
    sendMessage, pollMessages, clearError,
  } = useChat();

  const [agents, setAgents] = useState<any[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const uid = () => localStorage.getItem('current_user_id') || 'admin';

  useEffect(() => {
    loadConversations();
    fetch('/api/agents', { headers: { 'X-User-Id': uid() } })
      .then(r => r.json())
      .then(d => setAgents(d.agents || []))
      .catch(() => {});
    // Poll every 2s for new messages
    const interval = setInterval(() => pollMessages(), 2000);
    return () => clearInterval(interval);
  }, []);

  const currentAgent = agents.find(a => a.id === currentAgentId);
  const filteredAgents = agents.filter(a =>
    !agentSearch || a.name.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const recentConvs = conversations.slice(0, 20);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 80px)', gap: 1 }}>
      {/* Left: Conversation List */}
      <div style={{
        width: 280, minWidth: 280, background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>💬 对话中心</span>
          <button
            onClick={() => setShowAgentPicker(!showAgentPicker)}
            style={{
              padding: '4px 10px', fontSize: 11, background: 'var(--color-primary)', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Plus size={14} /> 新对话
          </button>
        </div>

        {/* Agent Picker */}
        {showAgentPicker && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <input
              value={agentSearch}
              onChange={e => setAgentSearch(e.target.value)}
              placeholder="搜索 Agent..."
              style={{
                width: '100%', padding: '6px 10px', background: 'var(--bg-input)', color: 'var(--color-text)',
                border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, boxSizing: 'border-box',
              }}
            />
            <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
              {filteredAgents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => { createConversation(agent.id); setShowAgentPicker(false); setAgentSearch(''); }}
                  style={{
                    padding: '8px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 12,
                    color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-input)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Bot size={14} style={{ color: 'var(--text-dim)' }} />
                  {agent.name}
                </div>
              ))}
              {filteredAgents.length === 0 && (
                <div style={{ padding: 8, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
                  没有匹配的 Agent
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {recentConvs.map(conv => {
            const agent = agents.find(a => a.id === conv.agent_id);
            const isActive = conv.id === currentConversationId;
            const preview = conv.last_message?.content?.slice(0, 50) || '';
            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  background: isActive ? 'var(--bg-input)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-input)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>
                  {agent?.name || 'Agent #' + conv.agent_id}
                </div>
                {preview && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {preview}
                  </div>
                )}
                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
                  {conv.channel_type === 'web' ? '🌐 Web' : conv.channel_type} · {new Date(conv.updated_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}

          {recentConvs.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, color: 'var(--text-dim)', gap: 8 }}>
              <MessageSquare size={32} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 12 }}>暂无对话</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>点击「新对话」选择 Agent 开始</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat Window */}
      <div style={{ flex: 1 }}>
        {currentAgentId && currentAgent ? (
          <ChatWindow
            agentId={currentAgentId}
            agentName={currentAgent.name}
            messages={messages}
            loading={loading}
            error={error}
            onSend={content => sendMessage(content)}
            onRetry={() => clearError()}
          />
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: 'var(--text-dim)', gap: 12,
            background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)',
          }}>
            <MessageSquare size={48} style={{ opacity: 0.2 }} />
            <span style={{ fontSize: 14 }}>选择一个 Agent 开始对话</span>
            <span style={{ fontSize: 11, opacity: 0.5 }}>左侧选择已有对话，或点击「新对话」</span>
            <button
              onClick={() => setShowAgentPicker(true)}
              style={{
                marginTop: 8, padding: '8px 20px', fontSize: 12,
                background: 'var(--color-primary)', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer',
              }}
            >
              <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
              新对话
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
