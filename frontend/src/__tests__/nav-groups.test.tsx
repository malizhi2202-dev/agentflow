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
      : path.endsWith('/api/audit?') || path.includes('/api/audit?') ? { entries: [] }
      : path.includes('/api/audit/stats') ? { total: 0, today: 0, by_action: [], by_user: [] }
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

async function expectTargetList(label: string, title: string) {
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: label })).toHaveStyle({ background: 'var(--bg-selected)' });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  invalidateCache();
});

describe('一级入口切换会清理详情/编辑/创建覆盖态', () => {
  it('agents → projects：Agent 详情不可见且项目列表激活', async () => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    fireEvent.click(await screen.findByRole('button', { name: '创建 Agent' }));
    await screen.findByLabelText('Agent 详情标签');

    fireEvent.click(screen.getByRole('button', { name: '项目' }));
    await expectTargetList('项目', '项目');
    expect(screen.queryByLabelText('Agent 详情标签')).toBeNull();
  });

  it('projects → agents：项目创建态不可见且 Agent 列表激活', async () => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: '项目' }));
    fireEvent.click(await screen.findByRole('button', { name: '创建项目' }));
    await screen.findByRole('heading', { name: /创建项目/ });

    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    await expectTargetList('Agent', 'Agent');
    expect(screen.queryByRole('heading', { name: /创建项目/ })).toBeNull();
  });

  it('automations → tasks：自动化创建态不可见且任务列表激活', async () => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: '自动化' }));
    fireEvent.click(await screen.findByRole('button', { name: '新建自动化' }));
    await screen.findByRole('region', { name: '新建自动化' });

    fireEvent.click(screen.getByRole('button', { name: '任务' }));
    await expectTargetList('任务', '任务');
    expect(screen.queryByRole('region', { name: '新建自动化' })).toBeNull();
  });

  it('tasks → automations：任务创建态不可见且自动化列表激活', async () => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: '任务' }));
    fireEvent.click(await screen.findByRole('button', { name: '新建任务' }));
    await screen.findByRole('region', { name: '新建任务' });

    fireEvent.click(screen.getByRole('button', { name: '自动化' }));
    await expectTargetList('自动化', '自动化');
    expect(screen.queryByRole('region', { name: '新建任务' })).toBeNull();
  });

  it('tasks → orchestration：任务创建态不可见且编排列表激活', async () => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: '任务' }));
    fireEvent.click(await screen.findByRole('button', { name: '新建任务' }));
    await screen.findByRole('region', { name: '新建任务' });

    fireEvent.click(screen.getByRole('button', { name: '编排' }));
    await expectTargetList('编排', '编排');
    expect(screen.queryByRole('region', { name: '新建任务' })).toBeNull();
  });

  it('orchestration → tasks：先进入编排列表再回任务列表，目标 active 保持正确', async () => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: '编排' }));
    await expectTargetList('编排', '编排');

    fireEvent.click(screen.getByRole('button', { name: '任务' }));
    await expectTargetList('任务', '任务');
  });

  it('orchestration → agents：工作流创建态切换后旧创建内容不可见', async () => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: '工作流' }));
    fireEvent.click(await screen.findByRole('button', { name: '创建工作流' }));
    await screen.findByRole('heading', { name: '创建工作流' });

    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    await expectTargetList('Agent', 'Agent');
    expect(screen.queryByRole('heading', { name: '创建工作流' })).toBeNull();
  });

  it('agents → orchestration：Agent 创建态不可见且编排列表激活', async () => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    fireEvent.click(await screen.findByRole('button', { name: '创建 Agent' }));
    await screen.findByLabelText('Agent 详情标签');

    fireEvent.click(screen.getByRole('button', { name: '编排' }));
    await expectTargetList('编排', '编排');
    expect(screen.queryByLabelText('Agent 详情标签')).toBeNull();
  });

  it('projects → automations：项目创建态不可见且自动化列表激活', async () => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: '项目' }));
    fireEvent.click(await screen.findByRole('button', { name: '创建项目' }));
    await screen.findByRole('heading', { name: /创建项目/ });

    fireEvent.click(screen.getByRole('button', { name: '自动化' }));
    await expectTargetList('自动化', '自动化');
    expect(screen.queryByRole('heading', { name: /创建项目/ })).toBeNull();
  });

  it('automations → projects：自动化创建态不可见且项目列表激活', async () => {
    await renderApp('admin');
    fireEvent.click(screen.getByRole('button', { name: '自动化' }));
    fireEvent.click(await screen.findByRole('button', { name: '新建自动化' }));
    await screen.findByRole('region', { name: '新建自动化' });

    fireEvent.click(screen.getByRole('button', { name: '项目' }));
    await expectTargetList('项目', '项目');
    expect(screen.queryByRole('region', { name: '新建自动化' })).toBeNull();
  });
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
    expect(names('协作')).toEqual(['项目', '任务', '收件箱', '团队与小队', '💬 对话中心']);
    // v27-A：「小队中心」独立页与 Teams·squads tab 是同实体双入口，侧栏项已删（功能并入 团队与小队）
    expect(names('协作')).not.toContain('小队中心');
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
      const pageHeadings = Array.from(document.querySelectorAll('h2'))
        .map((el) => (el.textContent || '').trim());
      expect(pageHeadings.filter((t) => t === label)).toHaveLength(0);
    });
  });
});
