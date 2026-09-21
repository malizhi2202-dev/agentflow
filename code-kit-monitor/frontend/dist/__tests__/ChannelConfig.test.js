import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChannelConfigComponent from '../components/ChannelConfig';
global.fetch = vi.fn();
const mockFetch = global.fetch;
describe('ChannelConfig', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockResolvedValue({ json: async () => [] });
    });
    // FT-17: 渲染标题
    it('renders channel config title', () => {
        render(_jsx(ChannelConfigComponent, { agentId: 1 }));
        expect(screen.getByText('📡 渠道接入')).toBeInTheDocument();
    });
    // FT-18: 添加渠道按钮
    it('has add channel button', () => {
        render(_jsx(ChannelConfigComponent, { agentId: 1 }));
        expect(screen.getByText('添加渠道')).toBeInTheDocument();
    });
    // FT-19: 展开渠道表单
    it('opens form when clicking add channel', () => {
        render(_jsx(ChannelConfigComponent, { agentId: 1 }));
        fireEvent.click(screen.getByText('添加渠道'));
        expect(screen.getByText('渠道类型')).toBeInTheDocument();
        expect(screen.getByText('保存')).toBeInTheDocument();
        expect(screen.getByText('取消')).toBeInTheDocument();
    });
    // FT-20: 渠道类型选择器包含所有 5 种
    it('shows all 5 channel types in selector', () => {
        render(_jsx(ChannelConfigComponent, { agentId: 1 }));
        fireEvent.click(screen.getByText('添加渠道'));
        const select = screen.getByRole('combobox');
        const options = Array.from(select.options).map(o => o.value);
        expect(options).toContain('feishu');
        expect(options).toContain('dingtalk');
        expect(options).toContain('slack');
        expect(options).toContain('telegram');
        expect(options).toContain('smtp_email');
        expect(options.length).toBe(5);
    });
    // FT-21: 飞书表单字段
    it('shows feishu form fields', () => {
        render(_jsx(ChannelConfigComponent, { agentId: 1 }));
        fireEvent.click(screen.getByText('添加渠道'));
        expect(screen.getByText('App ID')).toBeInTheDocument();
        expect(screen.getByText('App Secret')).toBeInTheDocument();
    });
    // FT-22: 切换渠道类型 → 表单字段变化
    it('shows SMTP fields when switching to email', () => {
        render(_jsx(ChannelConfigComponent, { agentId: 1 }));
        fireEvent.click(screen.getByText('添加渠道'));
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'smtp_email' } });
        expect(screen.getByText('SMTP 服务器')).toBeInTheDocument();
        expect(screen.getByText('端口')).toBeInTheDocument();
        expect(screen.getByText('发件地址')).toBeInTheDocument();
    });
    // FT-23: 取消按钮关闭表单
    it('closes form on cancel', () => {
        render(_jsx(ChannelConfigComponent, { agentId: 1 }));
        fireEvent.click(screen.getByText('添加渠道'));
        expect(screen.getByText('保存')).toBeInTheDocument();
        fireEvent.click(screen.getByText('取消'));
        expect(screen.queryByText('保存')).toBeNull();
    });
    // FT-24: 显示已有渠道列表
    it('renders existing channels', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => [
                { id: 1, channel_type: 'telegram', status: 'active', webhook_uuid: 'abc' },
                { id: 2, channel_type: 'feishu', status: 'draft', webhook_uuid: 'def' },
            ],
        });
        render(_jsx(ChannelConfigComponent, { agentId: 1 }));
        await vi.waitFor(() => {
            expect(screen.getByText('Telegram')).toBeInTheDocument();
            expect(screen.getByText('飞书')).toBeInTheDocument();
        });
        expect(screen.getByText('已连接')).toBeInTheDocument();
        expect(screen.getByText('草稿')).toBeInTheDocument();
    });
    // FT-25: 保存渠道
    it('saves channel and closes form', async () => {
        mockFetch
            .mockResolvedValueOnce({ json: async () => [] }) // load channels
            .mockResolvedValueOnce({ json: async () => ({ ok: true, channel: { id: 1, channel_type: 'telegram', status: 'draft', webhook_uuid: 'abc' } }) })
            .mockResolvedValueOnce({ json: async () => [] }); // reload
        render(_jsx(ChannelConfigComponent, { agentId: 1 }));
        fireEvent.click(screen.getByText('添加渠道'));
        fireEvent.click(screen.getByText('保存'));
        await vi.waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(2); // load + save
        });
    });
});
