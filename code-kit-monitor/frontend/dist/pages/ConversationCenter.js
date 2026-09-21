import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { MessageSquare, Plus, Bot } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import { useChat } from '../stores/chat';
export default function ConversationCenter() {
    const { conversations, currentConversationId, currentAgentId, messages, loading, error, loadConversations, selectConversation, createConversation, sendMessage, pollMessages, clearError, } = useChat();
    const [agents, setAgents] = useState([]);
    const [agentSearch, setAgentSearch] = useState('');
    const [showAgentPicker, setShowAgentPicker] = useState(false);
    const uid = () => localStorage.getItem('current_user_id') || 'admin';
    useEffect(() => {
        loadConversations();
        fetch('/api/agents', { headers: { 'X-User-Id': uid() } })
            .then(r => r.json())
            .then(d => setAgents(d.agents || []))
            .catch(() => { });
        // Poll every 2s for new messages
        const interval = setInterval(() => pollMessages(), 2000);
        return () => clearInterval(interval);
    }, []);
    const currentAgent = agents.find(a => a.id === currentAgentId);
    const filteredAgents = agents.filter(a => !agentSearch || a.name.toLowerCase().includes(agentSearch.toLowerCase()));
    const recentConvs = conversations.slice(0, 20);
    return (_jsxs("div", { style: { display: 'flex', height: '100%', minHeight: 'calc(100vh - 80px)', gap: 1 }, children: [_jsxs("div", { style: {
                    width: 280, minWidth: 280, background: 'var(--bg-card)',
                    borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
                }, children: [_jsxs("div", { style: { padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { style: { fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }, children: "\uD83D\uDCAC \u5BF9\u8BDD\u4E2D\u5FC3" }), _jsxs("button", { onClick: () => setShowAgentPicker(!showAgentPicker), style: {
                                    padding: '4px 10px', fontSize: 11, background: 'var(--color-primary)', color: '#fff',
                                    border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                }, children: [_jsx(Plus, { size: 14 }), " \u65B0\u5BF9\u8BDD"] })] }), showAgentPicker && (_jsxs("div", { style: { padding: '8px 12px', borderBottom: '1px solid var(--border)' }, children: [_jsx("input", { value: agentSearch, onChange: e => setAgentSearch(e.target.value), placeholder: "\u641C\u7D22 Agent...", style: {
                                    width: '100%', padding: '6px 10px', background: 'var(--bg-input)', color: 'var(--color-text)',
                                    border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, boxSizing: 'border-box',
                                } }), _jsxs("div", { style: { maxHeight: 200, overflowY: 'auto', marginTop: 6 }, children: [filteredAgents.map(agent => (_jsxs("div", { onClick: () => { createConversation(agent.id); setShowAgentPicker(false); setAgentSearch(''); }, style: {
                                            padding: '8px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 12,
                                            color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6,
                                        }, onMouseEnter: e => (e.currentTarget.style.background = 'var(--bg-input)'), onMouseLeave: e => (e.currentTarget.style.background = 'none'), children: [_jsx(Bot, { size: 14, style: { color: 'var(--text-dim)' } }), agent.name] }, agent.id))), filteredAgents.length === 0 && (_jsx("div", { style: { padding: 8, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }, children: "\u6CA1\u6709\u5339\u914D\u7684 Agent" }))] })] })), _jsxs("div", { style: { flex: 1, overflowY: 'auto' }, children: [recentConvs.map(conv => {
                                const agent = agents.find(a => a.id === conv.agent_id);
                                const isActive = conv.id === currentConversationId;
                                const preview = conv.last_message?.content?.slice(0, 50) || '';
                                return (_jsxs("div", { onClick: () => selectConversation(conv), style: {
                                        padding: '12px 16px', cursor: 'pointer',
                                        background: isActive ? 'var(--bg-input)' : 'transparent',
                                        borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                                    }, onMouseEnter: e => { if (!isActive)
                                        e.currentTarget.style.background = 'var(--bg-input)'; }, onMouseLeave: e => { if (!isActive)
                                        e.currentTarget.style.background = 'transparent'; }, children: [_jsx("div", { style: { fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }, children: agent?.name || 'Agent #' + conv.agent_id }), preview && (_jsx("div", { style: { fontSize: 10, color: 'var(--text-dim)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: preview })), _jsxs("div", { style: { fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }, children: [conv.channel_type === 'web' ? '🌐 Web' : conv.channel_type, " \u00B7 ", new Date(conv.updated_at).toLocaleDateString()] })] }, conv.id));
                            }), recentConvs.length === 0 && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, color: 'var(--text-dim)', gap: 8 }, children: [_jsx(MessageSquare, { size: 32, style: { opacity: 0.3 } }), _jsx("span", { style: { fontSize: 12 }, children: "\u6682\u65E0\u5BF9\u8BDD" }), _jsx("span", { style: { fontSize: 10, opacity: 0.6 }, children: "\u70B9\u51FB\u300C\u65B0\u5BF9\u8BDD\u300D\u9009\u62E9 Agent \u5F00\u59CB" })] }))] })] }), _jsx("div", { style: { flex: 1 }, children: currentAgentId && currentAgent ? (_jsx(ChatWindow, { agentId: currentAgentId, agentName: currentAgent.name, messages: messages, loading: loading, error: error, onSend: content => sendMessage(content), onRetry: () => clearError() })) : (_jsxs("div", { style: {
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        height: '100%', color: 'var(--text-dim)', gap: 12,
                        background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)',
                    }, children: [_jsx(MessageSquare, { size: 48, style: { opacity: 0.2 } }), _jsx("span", { style: { fontSize: 14 }, children: "\u9009\u62E9\u4E00\u4E2A Agent \u5F00\u59CB\u5BF9\u8BDD" }), _jsx("span", { style: { fontSize: 11, opacity: 0.5 }, children: "\u5DE6\u4FA7\u9009\u62E9\u5DF2\u6709\u5BF9\u8BDD\uFF0C\u6216\u70B9\u51FB\u300C\u65B0\u5BF9\u8BDD\u300D" }), _jsxs("button", { onClick: () => setShowAgentPicker(true), style: {
                                marginTop: 8, padding: '8px 20px', fontSize: 12,
                                background: 'var(--color-primary)', color: '#fff',
                                border: 'none', borderRadius: 6, cursor: 'pointer',
                            }, children: [_jsx(Plus, { size: 14, style: { marginRight: 4, verticalAlign: -2 } }), "\u65B0\u5BF9\u8BDD"] })] })) })] }));
}
