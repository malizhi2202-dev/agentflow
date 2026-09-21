import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConversationCenter from '../pages/ConversationCenter';
import { useChat } from '../stores/chat';
// Mock fetch
global.fetch = vi.fn();
const mockFetch = global.fetch;
// Mock ChatWindow to simplify testing
vi.mock('../components/ChatWindow', () => ({
    default: ({ agentName, error, onSend }) => (_jsxs("div", { "data-testid": "chat-window", children: [_jsx("span", { children: agentName }), error && _jsx("span", { "data-testid": "chat-error", children: error }), _jsx("button", { onClick: () => onSend('test-msg'), children: "Send" })] })),
}));
describe('ConversationCenter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store
        useChat.setState({
            conversations: [],
            currentConversationId: null,
            currentAgentId: null,
            messages: [],
            loading: false,
            error: null,
        });
        // Default mock responses
        mockFetch.mockImplementation((url) => {
            if (url.includes('/api/agents')) {
                return Promise.resolve({
                    json: async () => ({ agents: [{ id: 1, name: '测试Agent' }, { id: 2, name: '审查助手' }] }),
                });
            }
            if (url.includes('/api/chat/conversations')) {
                return Promise.resolve({ json: async () => [] });
            }
            return Promise.resolve({ json: async () => [] });
        });
    });
    // FT-12: 渲染标题
    it('renders conversation center title', () => {
        render(_jsx(ConversationCenter, {}));
        expect(screen.getByText('💬 对话中心')).toBeInTheDocument();
    });
    // FT-13: 新对话按钮（有多个"新对话"按钮，用 getAllByText）
    it('has new conversation button', () => {
        render(_jsx(ConversationCenter, {}));
        const buttons = screen.getAllByText('新对话');
        expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
    // FT-14: 空状态引导
    it('shows empty state guidance when no agent selected', () => {
        render(_jsx(ConversationCenter, {}));
        expect(screen.getByText('选择一个 Agent 开始对话')).toBeInTheDocument();
        expect(screen.getByText(/左侧选择已有对话/)).toBeInTheDocument();
    });
    // FT-15: 点击新对话 → 展开 Agent 选择器
    it('opens agent picker when clicking new conversation', () => {
        render(_jsx(ConversationCenter, {}));
        const newBtn = screen.getAllByText('新对话')[0];
        fireEvent.click(newBtn);
        // Agent picker should be visible
        expect(screen.getByPlaceholderText('搜索 Agent...')).toBeInTheDocument();
    });
    // FT-16: 空 Agent 列表时的提示
    it('shows no agents message when search has no results', async () => {
        mockFetch.mockImplementation((url) => {
            if (url.includes('/api/agents')) {
                return Promise.resolve({ json: async () => ({ agents: [] }) });
            }
            if (url.includes('/api/chat/conversations')) {
                return Promise.resolve({ json: async () => [] });
            }
            return Promise.resolve({ json: async () => [] });
        });
        render(_jsx(ConversationCenter, {}));
        const newBtn = screen.getAllByText('新对话')[0];
        fireEvent.click(newBtn);
        // Wait for render
        await vi.waitFor(() => {
            expect(screen.getByText('没有匹配的 Agent')).toBeInTheDocument();
        });
    });
});
