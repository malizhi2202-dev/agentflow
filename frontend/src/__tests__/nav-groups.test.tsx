/**
 * v22-nav-groups 回归：侧栏按业务大类分组（父级标题 + 组内条目）。
 *
 * 覆盖点：
 * ① 6 个 `role="group"` 按顺序出现，`aria-label` = 组名；
 * ② 组内条目标签集合正确（分组只改呈现，条目不能掉）；
 * ③ 治理组按权限过滤：member 只剩「审批」，admin 有「用户管理 / 审计日志」；
 * ④ 告警中心在「观测」组内，且未确认角标显示数量；
 * ⑤ 折叠态（48px）隐藏组标题但保留全部条目（`aria-label` 可查）。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import App from '../App';
import { invalidateCache } from '../utils/requestDedup';

const ADMIN_PERMS = ['project:read', 'project:write', 'project:delete', 'workflow:stop', 'user:manage', 'audit:view'];

function mePayload(role: 'admin' | 'member') {
  return {
    user: {
      id: role === 'admin' ? 'admin' : 'bob',
      name: role === 'admin' ? '管理员' : 'bob',
      role, must_change_password: false, project_ids: [], custom_permissions: [],
      active: true, created_at: '2026-10-24T00:00:00',
    },
    permissions: {},
    role_permissions: role === 'admin' ? ADMIN_PERMS : [],
    must_change_password: false,
  };
}

function mockApi(role: 'admin' | 'member') {
  const fetchMock = vi.fn(async (url: string) => {
    const path = String(url).split('?')[0];
    const body =
      path.endsWith('/api/auth/me') ? mePayload(role)
      : path.endsWith('/api/auth/users') ? { users: [] }
      : path.endsWith('/api/alerts/count') ? { unacknowledged: 3 }
      : path.endsWith('/api/admin/workflow') ? { stages: [] }
      : path.endsWith('/api/projects') ? { projects: [] }
      : path.endsWith('/api/agents') ? { agents: [] }
      : {};
    const res: any = {
      ok: true, status: 200, headers: new Map(),
      json: async () => body, text: async () => JSON.stringify(body),
    };
    res.clone = () => res;
    return res as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
}

async function renderApp(role: 'admin' | 'member') {
  mockApi(role);
  invalidateCache();
  const utils = render(<App />);
  await waitFor(() => expect(screen.getAllByRole('group').length).toBe(6));
  return utils;
}

afterEach(() => {
  vi.unstubAllGlobals();
  invalidateCache();
});

describe('侧栏分组', () => {
  it('6 个父级分组按业务链顺序出现', async () => {
    await renderApp('admin');
    const labels = screen.getAllByRole('group').map(g => g.getAttribute('aria-label'));
    expect(labels).toEqual(['构建', '运行', '协作', '知识', '观测', '治理']);
  });

  it('每个组的条目集合正确（分组不丢条目）', async () => {
    await renderApp('admin');
    const group = (name: string) => within(screen.getByRole('group', { name }));
    const names = (name: string) =>
      group(name).getAllByRole('button').map(b => b.getAttribute('aria-label'));

    expect(names('构建')).toEqual(['工具库', '工作流', '角色', 'Agent', '阶段模型配置', '决策模型目录', '微调工厂']);
    // v26：侧栏「Agent 详情」二级入口已移除（列表点卡片即进详情），这里锁死不再回来
    expect(names('构建')).not.toContain('Agent 详情');
    expect(names('运行')).toEqual(['编排', 'Agent 管控', '运行时', '回放', '自动化', '执行隔离', '对外集成', '环境参谋']);
    expect(names('协作')).toEqual(['项目', '任务', '收件箱', '团队与小队', '小队中心', '💬 对话中心']);
    expect(names('知识')).toEqual(['知识库', '记忆中心']);
    expect(names('观测')).toEqual(['监控', '告警中心']);
    expect(names('治理')).toEqual(['审批', '用户管理', '审计日志']);
  });

  it('治理组按权限过滤：member 只剩审批', async () => {
    await renderApp('member');
    const govern = within(screen.getByRole('group', { name: '治理' }));
    expect(govern.getAllByRole('button').map(b => b.getAttribute('aria-label'))).toEqual(['审批']);
    expect(screen.queryByRole('button', { name: '用户管理' })).toBeNull();
    expect(screen.queryByRole('button', { name: '审计日志' })).toBeNull();
  });

  it('告警中心落在观测组，且显示未确认角标', async () => {
    await renderApp('admin');
    const alertsBtn = within(screen.getByRole('group', { name: '观测' }))
      .getByRole('button', { name: '告警中心' });
    expect(alertsBtn.textContent).toContain('3');
  });

  it('折叠态隐藏组标题，但条目仍可通过 aria-label 定位', async () => {
    await renderApp('admin');
    expect(screen.queryByText('构建')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /收起/ }));
    await waitFor(() => expect(screen.queryByText('构建')).toBeNull());
    // 条目仍在（图标按钮，aria-label 不变）
    expect(screen.getByRole('button', { name: '用户管理' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '团队与小队' })).toBeInTheDocument();
  });
});

describe('文档资料 · 原型入口仅管理员可见', () => {
  const LINK_NAME = /文档资料/;

  it('admin 能看到原型链接', async () => {
    await renderApp('admin');
    expect(screen.getByRole('link', { name: LINK_NAME })).toHaveAttribute('href', '/prototype/index.html');
  });

  it('普通成员看不到（不是隐藏，是不渲染）', async () => {
    await renderApp('member');
    expect(screen.queryByRole('link', { name: LINK_NAME })).toBeNull();
    expect(screen.queryByText(/原型/)).toBeNull();
  });
});

describe('页内不再重复页名（壳层 .crumb 唯一）', () => {
  // W2 批 2 已迁移的 13 个视图；Agent 列表页因并行 change（v22-agent-runtime-model）暂未迁移
  const MIGRATED = ['工具库', '工作流', '角色', '编排', '回放', '自动化', '项目', '任务', '收件箱',
    '团队与小队', '知识库', '记忆中心', '监控', '告警中心', '审批', '用户管理', '审计日志'];

  it.each(MIGRATED)('%s 页内没有与页名相同的大字标题', async (label) => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => {
      // 壳层顶栏的 .crumb 现在用 h1 承载（a11y），它不属于「页内标题」，要排除
      const headings = Array.from(document.querySelectorAll('main h1, main h2'))
        .filter((el) => !el.closest('.app-top'))
        .map((el) => (el.textContent || '').trim());
      const dup = headings.filter((t) => t === label || t.endsWith(label));
      expect(dup).toEqual([]);
    });
  });
});
