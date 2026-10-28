/**
 * 对话栏（v26-agent-ui · 从 AgentDetail 壳层搬家）
 *
 * 一条消息 = 一个 run（POST /api/agents/{id}/chat，回复写回同一会话）。
 * **messages/conversationId 状态留在壳层**——切到别的栏再切回来，会话显示不丢（改造前即如此）。
 * 「发布到渠道」不再是跳「编辑标签」的裸保存条，而是直达 能力→集成 子栏（IM 通道绑定所在）。
 */
import { ExternalLink } from 'lucide-react';
import ChatWindow from '../ChatWindow';

export default function ChatPane({ agentId, agentName, messages, loading, error, onSend, onRetry, onGoChannel }: {
  agentId: number;
  agentName: string;
  messages: any[];
  loading: boolean;
  error: string | null;
  onSend: (content: string) => void;
  onRetry: () => void;
  onGoChannel: () => void;
}) {
  return (
    <main aria-label="对话主工作区" style={{ height: 'calc(100vh - 200px)', minHeight: 400 }}>
      <ChatWindow
        agentId={agentId}
        agentName={agentName}
        messages={messages}
        loading={loading}
        error={error}
        onSend={onSend}
        onRetry={onRetry}
        extraHeader={
          <button type="button" onClick={onGoChannel}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            <ExternalLink size={12} /> 发布到渠道
          </button>
        }
      />
    </main>
  );
}
