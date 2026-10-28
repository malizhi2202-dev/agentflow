import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/ui/PageHeader';

describe('v27 UI 跨页面无障碍回归', () => {
  it('PageHeader 只提供一个可聚焦 h1，并在详情挂载时接收焦点', () => {
    render(<PageHeader title="项目" context="协作 · 项目" summary="项目列表" autoFocus action={<button>创建</button>} />);
    const heading = screen.getByRole('heading', { level: 1, name: '项目' });
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement).toBe(heading);
    expect(screen.getByRole('button', { name: '创建' })).toBeInTheDocument();
  });

  it('ConfirmDialog 具备可关联名称，Escape 关闭，并在关闭后回收焦点', () => {
    const onCancel = vi.fn();
    const trigger = document.createElement('button');
    trigger.textContent = '删除';
    document.body.appendChild(trigger);
    trigger.focus();
    const view = render(<ConfirmDialog open title="删除项目" message="不可撤销" onConfirm={vi.fn()} onCancel={onCancel} />);
    const dialog = screen.getByRole('dialog', { name: '删除项目' });
    expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-message');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    view.rerender(<ConfirmDialog open={false} title="删除项目" message="不可撤销" onConfirm={vi.fn()} onCancel={onCancel} />);
    expect(document.activeElement?.textContent).toContain('删除');
    view.unmount();
  });

  it('ConfirmDialog 的 Tab 在取消与确认按钮之间循环', () => {
    render(<ConfirmDialog open title="归档" message="确认归档" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const cancel = screen.getByRole('button', { name: '取消' });
    const confirm = screen.getByRole('button', { name: '确定' });
    confirm.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });
});
