import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatWindow from '../components/ChatWindow';
const defaultProps = {
    agentId: 1,
    agentName: '测试Agent',
    messages: [],
    loading: false,
    error: null,
    onSend: vi.fn(),
};
describe('ChatWindow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    // FT-01: 基本渲染
    it('renders agent name and input area', () => {
        render(_jsx(ChatWindow, { ...defaultProps }));
        expect(screen.getByText('🤖 测试Agent')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('给 测试Agent 发送消息...')).toBeInTheDocument();
    });
    // FT-02: 空状态引导
    it('shows empty state when no messages', () => {
        render(_jsx(ChatWindow, { ...defaultProps }));
        expect(screen.getByText(/发送消息开始与 测试Agent 对话/)).toBeInTheDocument();
        expect(screen.getByText('Enter 发送 · Shift+Enter 换行')).toBeInTheDocument();
    });
    // FT-03: 消息列表渲染（user + agent 消息）
    it('renders user and agent messages', () => {
        const messages = [
            { id: 1, role: 'user', content: '你好', status: 'done', created_at: new Date().toISOString() },
            { id: 2, role: 'agent', content: '你好！有什么可以帮你的？', status: 'done', created_at: new Date().toISOString() },
        ];
        render(_jsx(ChatWindow, { ...defaultProps, messages: messages }));
        expect(screen.getByText('你好')).toBeInTheDocument();
        expect(screen.getByText('你好！有什么可以帮你的？')).toBeInTheDocument();
    });
    // FT-04: 点击发送按钮 → onSend 调用
    it('calls onSend when clicking send button', () => {
        const onSend = vi.fn();
        render(_jsx(ChatWindow, { ...defaultProps, onSend: onSend }));
        const input = screen.getByPlaceholderText('给 测试Agent 发送消息...');
        fireEvent.change(input, { target: { value: '测试消息' } });
        const sendBtn = screen.getByRole('button');
        fireEvent.click(sendBtn);
        expect(onSend).toHaveBeenCalledWith('测试消息');
    });
    // FT-05: Enter 键发送
    it('sends on Enter key', () => {
        const onSend = vi.fn();
        render(_jsx(ChatWindow, { ...defaultProps, onSend: onSend }));
        const input = screen.getByPlaceholderText('给 测试Agent 发送消息...');
        fireEvent.change(input, { target: { value: 'Enter发送' } });
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
        expect(onSend).toHaveBeenCalledWith('Enter发送');
    });
    // FT-06: Shift+Enter 不发送（换行）
    it('does not send on Shift+Enter', () => {
        const onSend = vi.fn();
        render(_jsx(ChatWindow, { ...defaultProps, onSend: onSend }));
        const input = screen.getByPlaceholderText('给 测试Agent 发送消息...');
        fireEvent.change(input, { target: { value: '不发送' } });
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
        expect(onSend).not.toHaveBeenCalled();
    });
    // FT-07: 空消息不能发送
    it('disables send when input is empty', () => {
        render(_jsx(ChatWindow, { ...defaultProps }));
        const sendBtn = screen.getByRole('button');
        expect(sendBtn).toBeDisabled();
    });
    // FT-08: loading 状态
    it('shows loading indicator when loading', () => {
        render(_jsx(ChatWindow, { ...defaultProps, loading: true }));
        expect(screen.getByText(/思考中/)).toBeInTheDocument();
    });
    // FT-09: 错误提示 + 重试按钮
    it('shows error with retry button', () => {
        const onRetry = vi.fn();
        render(_jsx(ChatWindow, { ...defaultProps, error: "Agent \u6682\u65F6\u65E0\u6CD5\u56DE\u590D", onRetry: onRetry }));
        expect(screen.getByText('Agent 暂时无法回复')).toBeInTheDocument();
        const retryBtn = screen.getByText('重试');
        fireEvent.click(retryBtn);
        expect(onRetry).toHaveBeenCalled();
    });
    // FT-10: error 消息状态
    it('shows error badge on failed messages', () => {
        const messages = [
            { id: 1, role: 'agent', content: '回复失败', status: 'error', created_at: new Date().toISOString() },
        ];
        render(_jsx(ChatWindow, { ...defaultProps, messages: messages }));
        expect(screen.getByText('发送失败')).toBeInTheDocument();
    });
    // FT-11: extraHeader 渲染
    it('renders extraHeader when provided', () => {
        render(_jsx(ChatWindow, { ...defaultProps, extraHeader: _jsx("button", { children: "\u53D1\u5E03\u5230\u6E20\u9053" }) }));
        expect(screen.getByText('发布到渠道')).toBeInTheDocument();
    });
});
