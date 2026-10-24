/**
 * 对话窗口（消息流 + 输入区）。
 *
 * 三条硬语义都落在这一层，因为它们是「一次发送」的前后关系，拆到页面层就看不见闭环：
 *   ② 一条消息 = 一个 run：每条消息行挂 run 标识 + run 状态（queued/running/done/failed），
 *      失败行给出原因（后端 detail / 消息正文原样透传）。
 *   ③ 运行时离线 → queued 等待上线：顶部排队提示条 + 消息行的 queued 文案。
 *   ④ 归档 = 只读 · Agent 不可运行禁发：输入框与发送按钮同时禁用，并写明原因。
 *
 * 复用方须知：`ProjectDetail` / `AgentDetail` 也在用这个组件，所以新 prop 全部可选，
 * 默认行为与以前完全一致（未传 readOnly / agent 时输入区照旧可用）。
 */
import { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, AlertCircle, Lock } from 'lucide-react';
import type { AgentLite, Message } from './chat/types';
import {
  ONE_MESSAGE_ONE_RUN_NOTE,
  PRIVACY_CHIP,
  QUEUED_NOTE,
  RUN_ID_NOTE,
  RUN_STATE_LABEL,
  RUN_STATE_TONE,
  composeBlockReason,
  runLabel,
  runStateOf,
  type Reachability,
} from './chat/chatSemantics';
import RuntimeQueueNotice from './chat/RuntimeQueueNotice';

// 既有用例与页面都从 ChatWindow 取 Message 类型 → 继续转发（真正定义在 chat/types.ts）
export type { Message } from './chat/types';

interface ChatWindowProps {
  agentId: number;
  agentName: string;
  messages: Message[];
  loading: boolean;
  error: string | null;
  onSend: (content: string) => void;
  onRetry?: () => void;
  extraHeader?: React.ReactNode;
  /** 会话级门禁：归档 = 只读（历史可读，不能发新消息） */
  readOnly?: boolean;
  /** Agent 级门禁：status ∈ archived / disabled 时不能发新消息 */
  agent?: AgentLite | null;
  /** 运行时可达性（离线时展示 queued 等待上线） */
  reachability?: Reachability;
  /** 当前排队中的消息条数（`status === 'pending'`） */
  queuedCount?: number;
}

const META: React.CSSProperties = { fontSize: 9.5, color: 'var(--text-dim)' };

export default function ChatWindow({
  agentName,
  messages,
  loading,
  error,
  onSend,
  onRetry,
  extraHeader,
  readOnly = false,
  agent = null,
  reachability,
  queuedCount = 0,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  // 发送门禁：只由 composeBlockReason 判定（归档优先，其次 Agent 不可运行）
  const blockedReason = composeBlockReason({ archived: readOnly, agent });
  const blocking = Boolean(blockedReason);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading || blocking) return;
    onSend(trimmed);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '--:--';
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
      {/* Header：Agent + 私密标（1:1 完全私密必须在详情里也能看见，不能只在列表底部说一句） */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>🤖 {agentName}</span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', padding: '2px 8px', background: 'var(--bg-input)', borderRadius: 3 }}>对话测试</span>
          <span className="chip" title={PRIVACY_CHIP}>
            <Lock size={10} /> {PRIVACY_CHIP}
          </span>
          {blockedReason && <span className="chip warn">只读</span>}
        </div>
        {extraHeader}
      </div>

      {/* 一条消息 = 一个 run 的口径行 */}
      <p className="page-note" style={{ margin: 0, padding: '6px 14px 0' }}>{ONE_MESSAGE_ONE_RUN_NOTE}</p>

      {/* ③ 运行时离线 / 有排队消息时的提示条 */}
      {reachability && (
        <div style={{ padding: '6px 14px 0' }}>
          <RuntimeQueueNotice reachability={reachability} queuedCount={queuedCount} />
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {messages.length === 0 && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', gap: 8 }}>
            <span style={{ fontSize: 32 }}>💬</span>
            <span style={{ fontSize: 13 }}>发送消息开始与 {agentName} 对话</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>Enter 发送 · Shift+Enter 换行</span>
          </div>
        )}

        {messages.map((msg) => {
          const state = runStateOf(msg.status);
          const failureReason = msg.failure_reason || msg.content;
          return (
            <div key={msg.id} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--bg-input)',
                color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {state === 'failed' && <AlertCircle size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2, color: 'var(--red)' }} />}
                {msg.content}
              </div>

              {/* 消息行元信息：run 标识 + run 状态 + 失败原因 / 排队说明 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, padding: '0 4px', flexWrap: 'wrap', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <span style={META}>
                  {msg.role === 'user' ? '你' : agentName} · {formatTime(msg.created_at)}
                </span>
                <span className="chip mono" title={RUN_ID_NOTE}>run {runLabel(msg)}</span>
                <span className={`chip ${RUN_STATE_TONE[state]}`}>{state}</span>
                <span style={{ ...META, color: state === 'failed' ? 'var(--red)' : 'var(--text-dim)' }}>
                  {RUN_STATE_LABEL[state]}
                </span>
                {state === 'failed' && (
                  <span style={{ ...META, color: 'var(--red)' }}>原因：{failureReason}</span>
                )}
                {state === 'queued' && (
                  <span style={{ ...META, color: 'var(--orange, #c80)' }}>运行时离线，消息等待上线（不丢、不算失败）</span>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', color: 'var(--text-dim)', fontSize: 12 }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            {agentName} 思考中...
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', margin: '8px 0', background: 'rgba(255,100,100,0.1)', borderRadius: 8, border: '1px solid rgba(255,100,100,0.2)' }} role="alert">
            <AlertCircle size={14} style={{ color: 'var(--red)' }} />
            <span style={{ fontSize: 12, color: 'var(--red)', flex: 1 }}>{error}</span>
            {onRetry && (
              <button onClick={onRetry} style={{ padding: '4px 12px', fontSize: 11, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                重试
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ④ 门禁原因：禁用输入的同时必须写清为什么（只灰不说明等于让人猜） */}
      {blockedReason && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--bg-input)' }}>
          <span className="chip warn" style={{ flex: '0 0 auto' }}>不能发新消息</span>
          <span className="page-note" style={{ margin: 0 }}>{blockedReason}</span>
        </div>
      )}

      {/* ③ 离线排队口径在输入区再钉一次（原型把这条写在会话规则里，输入区要有就近提示） */}
      {reachability?.state === 'offline' && !blockedReason && (
        <p className="page-note" style={{ margin: 0, padding: '6px 14px 0', color: 'var(--orange, #c80)' }}>
          {QUEUED_NOTE}
        </p>
      )}

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={blocking}
          aria-label="消息输入"
          placeholder={blockedReason
            ? (readOnly ? '会话已归档 · 只读' : 'Agent 不可运行 · 不能发新消息')
            : '给 ' + agentName + ' 发送消息...'}
          rows={1}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--bg-input)',
            color: 'var(--color-text)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 13,
            resize: 'none',
            outline: 'none',
            fontFamily: 'var(--font-mono)',
            maxHeight: 120,
            cursor: blocking ? 'not-allowed' : 'text',
            opacity: blocking ? 0.7 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading || blocking}
          aria-label="发送"
          style={{
            padding: '10px 16px',
            background: input.trim() && !loading && !blocking ? 'var(--color-primary)' : 'var(--bg-input)',
            color: input.trim() && !loading && !blocking ? '#fff' : 'var(--text-dim)',
            border: 'none',
            borderRadius: 8,
            cursor: input.trim() && !loading && !blocking ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            transition: 'background 0.15s',
          }}
        >
          <Send size={16} />
        </button>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
