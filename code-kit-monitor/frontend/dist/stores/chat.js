import { create } from 'zustand';
const uid = () => localStorage.getItem('current_user_id') || 'admin';
export const useChat = create((set, get) => ({
    conversations: [],
    currentConversationId: null,
    currentAgentId: null,
    messages: [],
    loading: false,
    error: null,
    loadConversations: () => {
        fetch('/api/chat/conversations', { headers: { 'X-User-Id': uid() } })
            .then(r => r.json())
            .then(data => {
            set({ conversations: Array.isArray(data) ? data : [] });
        })
            .catch(() => { });
    },
    selectConversation: (conv) => {
        set({
            currentConversationId: conv.id,
            currentAgentId: conv.agent_id,
            messages: [],
            error: null,
        });
        get().loadMessages();
    },
    createConversation: async (agentId) => {
        try {
            const r = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
                body: JSON.stringify({ agent_id: agentId }),
            });
            const conv = await r.json();
            if (conv.id) {
                const newConv = {
                    id: conv.id,
                    agent_id: conv.agent_id,
                    owner_id: conv.owner_id,
                    channel_type: conv.channel_type || 'web',
                    title: conv.title || '新对话',
                    created_at: conv.created_at,
                    updated_at: conv.updated_at,
                };
                set(s => ({ conversations: [newConv, ...s.conversations] }));
                get().selectConversation(newConv);
                return newConv;
            }
            return null;
        }
        catch {
            return null;
        }
    },
    sendMessage: async (content) => {
        const { currentAgentId, currentConversationId } = get();
        if (!currentAgentId)
            return;
        set({ loading: true, error: null });
        // optimistic UI: add user message
        const tempUserMsg = {
            id: Date.now(),
            role: 'user',
            content,
            status: 'done',
            created_at: new Date().toISOString(),
        };
        set(s => ({ messages: [...s.messages, tempUserMsg] }));
        try {
            const r = await fetch('/api/agents/' + currentAgentId + '/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
                body: JSON.stringify({ content, conversation_id: currentConversationId }),
            });
            const data = await r.json();
            if (data.ok) {
                const newMsgs = [data.user_message, data.agent_message].filter(Boolean);
                set(s => ({
                    messages: [...s.messages.filter(m => m.id !== tempUserMsg.id), ...newMsgs],
                    loading: false,
                    currentConversationId: data.conversation_id,
                }));
                if (data.agent_message?.status === 'error') {
                    set({ error: data.agent_message.content });
                }
                // refresh conversation list
                get().loadConversations();
            }
            else {
                set({
                    loading: false,
                    error: data.detail || '发送失败',
                });
            }
        }
        catch (e) {
            set({ loading: false, error: '网络错误: ' + (e.message || '') });
        }
    },
    loadMessages: (sinceId) => {
        const { currentConversationId } = get();
        if (!currentConversationId)
            return;
        let url = '/api/chat/' + currentConversationId + '/messages?limit=100';
        if (sinceId)
            url += '&since_id=' + sinceId;
        fetch(url, { headers: { 'X-User-Id': uid() } })
            .then(r => r.json())
            .then(data => {
            if (Array.isArray(data)) {
                set(s => sinceId ? { messages: [...s.messages, ...data] } : { messages: data });
            }
        })
            .catch(() => { });
    },
    pollMessages: () => {
        const { currentConversationId, messages } = get();
        if (!currentConversationId)
            return;
        const lastId = messages.length > 0 ? messages[messages.length - 1].id : 0;
        get().loadMessages(lastId);
    },
    clearError: () => set({ error: null }),
}));
