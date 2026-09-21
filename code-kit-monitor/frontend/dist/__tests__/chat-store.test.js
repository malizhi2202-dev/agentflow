import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useChat } from '../stores/chat';
// Mock fetch
global.fetch = vi.fn();
const mockFetch = global.fetch;
describe('chat store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useChat.setState({
            conversations: [],
            currentConversationId: null,
            currentAgentId: null,
            messages: [],
            loading: false,
            error: null,
        });
        localStorage.setItem('current_user_id', 'admin');
    });
    afterEach(() => {
        localStorage.clear();
    });
    // FS-01: loadConversations
    it('loadConversations populates list', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => [
                { id: 1, agent_id: 15, owner_id: 'admin', channel_type: 'web', title: '测试会话', created_at: '2026-01-01', updated_at: '2026-01-01' },
            ],
        });
        useChat.getState().loadConversations();
        await vi.waitFor(() => {
            expect(useChat.getState().conversations.length).toBe(1);
        });
        expect(useChat.getState().conversations[0].title).toBe('测试会话');
    });
    // FS-02: selectConversation
    it('selectConversation sets current state', () => {
        mockFetch.mockResolvedValueOnce({ json: async () => [] });
        const conv = { id: 1, agent_id: 15, owner_id: 'admin', channel_type: 'web', title: '测试', created_at: '', updated_at: '' };
        useChat.getState().selectConversation(conv);
        expect(useChat.getState().currentConversationId).toBe(1);
        expect(useChat.getState().currentAgentId).toBe(15);
    });
    // FS-03: sendMessage optimistic UI
    it('sendMessage adds user message optimistically', async () => {
        useChat.setState({ currentAgentId: 15 });
        mockFetch.mockResolvedValueOnce({
            json: async () => ({
                ok: true,
                conversation_id: 1,
                user_message: { id: 1, role: 'user', content: 'hello', status: 'done', created_at: '' },
                agent_message: { id: 2, role: 'agent', content: 'hi there', status: 'done', created_at: '' },
            }),
        });
        await useChat.getState().sendMessage('hello');
        const msgs = useChat.getState().messages;
        expect(msgs.length).toBe(2);
        expect(msgs[0].role).toBe('user');
        expect(msgs[1].role).toBe('agent');
        expect(useChat.getState().loading).toBe(false);
    });
    // FS-04: sendMessage error handling
    it('sendMessage sets error on failure', async () => {
        useChat.setState({ currentAgentId: 15 });
        mockFetch.mockRejectedValueOnce(new Error('Network error'));
        await useChat.getState().sendMessage('hello');
        expect(useChat.getState().error).toContain('网络错误');
        expect(useChat.getState().loading).toBe(false);
    });
    // FS-05: clearError
    it('clearError resets error', () => {
        useChat.setState({ error: 'some error' });
        useChat.getState().clearError();
        expect(useChat.getState().error).toBeNull();
    });
    // FS-06: createConversation
    it('createConversation adds to list', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ id: 99, agent_id: 15, owner_id: 'admin', channel_type: 'web', title: '新对话', created_at: '', updated_at: '' }),
        });
        mockFetch.mockResolvedValueOnce({ json: async () => [] });
        await useChat.getState().createConversation(15);
        expect(useChat.getState().conversations.length).toBe(1);
        expect(useChat.getState().currentConversationId).toBe(99);
    });
    // FS-07: pollMessages 不崩溃
    it('pollMessages does not throw when no conversation', () => {
        expect(() => useChat.getState().pollMessages()).not.toThrow();
    });
});
