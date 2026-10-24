/**
 * 对话中心（原型 6.8 `chat.html`，change ui-parity · P3-3/P3-4）
 *
 * 页名由壳层 `.crumb` 承担（本页不写 h1/h2）。四语义分别落在：
 *   ① 1:1 完全私密 —— 左栏底部常驻私密句 + 详情头 chip；后端 list/get 只按 owner_id 过滤，事实与文案一致。
 *   ② 一条消息 = 一个 run —— 消息行 run 标识 + run 状态（ChatWindow 内，queued/running/done/failed）。
 *   ③ 运行时离线 → queued 等待上线 —— 运行时注册表（GET /api/runtimes）判 CLI 在线性 + 排队提示条。
 *   ④ 归档 = 只读 / Agent 不可运行禁发 —— 会话 archived_at / agent.status 判定后禁用输入并写明原因。
 * 另加：不自动建任务说明、＋ 挂 Project context（后端无端点 → 只做选择器 + 未接入标）。
 *
 * 后端缺列的（conversation.archived_at、message.run_id、chat context 端点）不造假：
 * 能表达的先表达，缺的显式标未接入，缺口写进 `.specs/ui-parity/P3-chat-knowledge.md`。
 */
import { useEffect, useState } from 'react';
import { MessageSquare, Plus, Bot } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import ConversationList from '../components/chat/ConversationList';
import ProjectContextPicker from '../components/chat/ProjectContextPicker';
import ChatRulesPanel from '../components/chat/ChatRulesPanel';
import {
  PRIVACY_CHIP,
  agentNotRunnableReason,
  isAgentRunnable,
  runStateOf,
  runtimeReachability,
} from '../components/chat/chatSemantics';
import { useChat } from '../stores/chat';
import { useAgents } from '../stores/agents';
import { useRuntimes } from '../stores/runtimes';
import { useProjects } from '../stores/projects';

export default function ConversationCenter() {
  const {
    conversations, currentConversationId, currentAgentId,
    messages, loading, error,
    loadConversations, selectConversation, createConversation,
    sendMessage, pollMessages, clearError,
  } = useChat();

  const { agents, fetchAgents } = useAgents();
  const { registry, fetchRegistry } = useRuntimes();
  const { projects, fetchProjects } = useProjects();

  const [agentSearch, setAgentSearch] = useState('');
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  // 挂 Project context 只在本页生效（后端无 chat context 端点，见 ProjectContextPicker 的未接入说明）
  const [contextProjectId, setContextProjectId] = useState<number | null>(null);

  useEffect(() => {
    loadConversations();
    fetchAgents();
    fetchRegistry();
    fetchProjects();
    // 轮询新消息（既有实现：2s）
    const interval = setInterval(() => pollMessages(), 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentAgent = agents.find((a) => a.id === currentAgentId) || null;
  const currentConv = conversations.find((c) => c.id === currentConversationId) || null;
  const archived = Boolean(currentConv?.archived_at);
  const reachability = runtimeReachability(currentAgent?.runtime, registry);
  const queuedCount = messages.filter((m) => runStateOf(m.status) === 'queued').length;

  const filteredAgents = agents.filter(
    (a) => !agentSearch || a.name.toLowerCase().includes(agentSearch.toLowerCase()),
  );

  return (
    <div className="app-body" style={{ height: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--s2)', flex: 1, minHeight: 520 }}>
        {/* ── 左栏：会话列表 ───────────────────────────────── */}
        <aside
          className="panel"
          aria-label="会话列表"
          style={{ width: 300, minWidth: 260, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
        >
          <div className="toolbar" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <span className="section-title" style={{ fontSize: 13, color: 'var(--text)' }}>💬 对话中心</span>
            <span className="chip">{PRIVACY_CHIP}</span>
            <span className="grow" />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowAgentPicker((v) => !v)}
              aria-expanded={showAgentPicker}
            >
              <Plus size={13} /> 新对话
            </button>
          </div>

          {showAgentPicker && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
              <input
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                placeholder="搜索 Agent..."
                aria-label="搜索 Agent"
                style={{
                  width: '100%', padding: '6px 10px', background: 'var(--bg-input)', color: 'var(--color-text)',
                  border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, boxSizing: 'border-box',
                }}
              />
              <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 6 }}>
                {filteredAgents.map((agent) => {
                  const runnable = isAgentRunnable(agent);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      disabled={!runnable}
                      title={runnable ? undefined : agentNotRunnableReason(agent)}
                      onClick={() => {
                        if (!runnable) return;   // 归档 Agent 不可作为会话归属（与团队侧同一判定）
                        createConversation(agent.id);
                        setShowAgentPicker(false);
                        setAgentSearch('');
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
                        padding: '7px 8px', borderRadius: 4, fontSize: 12, background: 'transparent',
                        border: 'none', cursor: runnable ? 'pointer' : 'not-allowed',
                        color: runnable ? 'var(--color-text)' : 'var(--text-dim)',
                        opacity: runnable ? 1 : 0.7,
                      }}
                    >
                      <Bot size={14} style={{ color: 'var(--text-dim)' }} />
                      <span>{agent.name}</span>
                      {!runnable && <span className="chip warn">已归档 · 不可作为会话归属</span>}
                    </button>
                  );
                })}
                {filteredAgents.length === 0 && (
                  <div style={{ padding: 8, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
                    没有匹配的 Agent
                  </div>
                )}
              </div>
            </div>
          )}

          <ConversationList
            conversations={conversations.slice(0, 30)}
            agents={agents}
            currentConversationId={currentConversationId}
            onSelect={selectConversation}
          />
          {conversations.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 16px', color: 'var(--text-dim)', gap: 6 }}>
              <MessageSquare size={28} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 12 }}>暂无对话</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>点击「新对话」选择 Agent 开始</span>
            </div>
          )}
        </aside>

        {/* ── 右栏：会话详情 ───────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
          <div className="panel" style={{ padding: 'var(--s2) var(--s3)' }}>
            <div className="toolbar">
              <span className="chip">{currentAgent ? currentAgent.name : '未选会话'}</span>
              <span className={`chip ${reachability.state === 'offline' ? 'warn' : reachability.state === 'online' ? 'ok' : ''}`}>
                {reachability.label}
              </span>
              {archived && <span className="chip warn">已归档 · 只读</span>}
              <span className="grow" />
              <ProjectContextPicker
                projects={projects}
                selectedProjectId={contextProjectId}
                onSelect={setContextProjectId}
              />
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {currentAgentId && currentAgent ? (
              <ChatWindow
                agentId={currentAgentId}
                agentName={currentAgent.name}
                messages={messages}
                loading={loading}
                error={error}
                onSend={(content) => sendMessage(content)}
                onRetry={() => clearError()}
                readOnly={archived}
                agent={currentAgent}
                reachability={reachability}
                queuedCount={queuedCount}
              />
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100%', minHeight: 320, color: 'var(--text-dim)', gap: 12,
                background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)',
              }}>
                <MessageSquare size={40} style={{ opacity: 0.2 }} />
                <span style={{ fontSize: 14 }}>选择一个 Agent 开始对话</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>左侧选择已有对话，或点击「新对话」</span>
                <button
                  type="button"
                  onClick={() => setShowAgentPicker(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={13} /> 新对话
                </button>
              </div>
            )}
          </div>

          <ChatRulesPanel
            agent={currentAgent}
            conversationId={currentConversationId}
            archived={archived}
            reachability={reachability}
          />
        </div>
      </div>
    </div>
  );
}
