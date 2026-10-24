/**
 * TS：多文件技能包（v23 · multica 迁移）——技能详情能看/能改附带文件，工具库卡片显示文件数。
 *
 * 契约：列表 `GET /api/tools` 只给 `files_count`；详情 `GET /api/tools/{id}` 给 `files_json` 全文；
 * `PUT /api/tools/{id}` 接受 `content_md` + `files_json`（整体替换）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ToolDetail from '../pages/ToolDetail';
import ToolMarket from '../pages/ToolMarket';
import { invalidateCache } from '../utils/requestDedup';
import { useTools } from '../stores/tools';
import { useAuth } from '../stores/auth';

const FILES = [
  { path: 'SKILL.md', content: '# 主体' },
  { path: 'references/checklist.md', content: '- 输入校验' },
];

const SKILL = (over: Partial<any> = {}) => ({
  id: 3, name: 'bmad-prd', type: 'skill', description: '产品与需求',
  content_md: '# BMad PRD\n正文', token_soft_limit: 80000, token_hard_limit: 100000,
  permissions: ['read'], gate_pre: '', gate_post: '', io_filter: 'none', files_count: 2,
  ...over,
});

function mockApi(routes: Record<string, { status?: number; body: any }>) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const exact = `${method} ${String(url).split('?')[0]}`;
    const hit = routes[exact] ?? routes[`${method} ${String(url)}`] ?? { status: 404, body: { detail: `no mock ${exact}` } };
    const res: any = {
      ok: (hit.status ?? 200) < 400, status: hit.status ?? 200, headers: new Map(),
      json: async () => hit.body, text: async () => JSON.stringify(hit.body),
    };
    res.clone = () => res;
    return res as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  useAuth.setState({ currentUser: { id: 'alice', name: 'alice', role: 'admin' } as any });
});

describe('技能文件包', () => {
  // TS-01：已有技能 → 挂载后按 id 拉详情，把文件渲染出来
  it('TS-01 打开已有技能会拉详情并展示附带文件', async () => {
    const calls = mockApi({
      'GET /api/tools/3': { body: { ...SKILL(), files_json: FILES } },
    });
    render(<ToolDetail tool={SKILL() as any} onBack={() => {}} onSave={() => {}} />);
    await waitFor(() => expect(screen.getByText(/references\/checklist\.md/)).toBeTruthy());
    expect(calls.some((c) => c.method === 'GET' && c.url === '/api/tools/3')).toBe(true);
    expect(screen.getByRole('region', { name: '技能文件' })).toBeTruthy();
    expect(screen.getByText(/技能文件（2）/)).toBeTruthy();
  });

  // TS-02：新增 / 删除文件行
  it('TS-02 可以新增文件行并删除', async () => {
    mockApi({ 'GET /api/tools/3': { body: { ...SKILL(), files_json: FILES } } });
    render(<ToolDetail tool={SKILL() as any} onBack={() => {}} onSave={() => {}} />);
    await waitFor(() => expect(screen.getAllByText(/SKILL\.md/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: /新增文件/ }));
    await waitFor(() => expect(screen.getByText(/技能文件（3）/)).toBeTruthy());
    fireEvent.click(screen.getAllByRole('button', { name: '删除该文件' })[0]);
    await waitFor(() => expect(screen.getByText(/技能文件（2）/)).toBeTruthy());
  });

  // TS-03：编辑后的文件随保存一起提交（整体替换）
  it('TS-03 保存载荷带上编辑后的 files_json 与 content_md', async () => {
    mockApi({ 'GET /api/tools/3': { body: { ...SKILL(), files_json: FILES } } });
    const onSave = vi.fn();
    render(<ToolDetail tool={SKILL() as any} onBack={() => {}} onSave={onSave} />);
    await waitFor(() => expect(screen.getAllByText(/SKILL\.md/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: /新增文件/ }));
    const pathInput = screen.getByLabelText('文件路径 3') as HTMLInputElement;
    fireEvent.change(pathInput, { target: { value: 'assets/data.json' } });
    const contentInput = screen.getByLabelText('文件内容 3') as HTMLTextAreaElement;
    fireEvent.change(contentInput, { target: { value: '{"a":1}' } });
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.content_md).toBe('# BMad PRD\n正文');
    expect(payload.files_json).toHaveLength(3);
    expect(payload.files_json[2]).toEqual({ path: 'assets/data.json', content: '{"a":1}' });
  });

  // TS-04：path 为空 → 不提交，给出具体原因
  it('TS-04 path 为空时不保存并提示', async () => {
    mockApi({ 'GET /api/tools/3': { body: { ...SKILL(), files_json: FILES } } });
    const onSave = vi.fn();
    render(<ToolDetail tool={SKILL() as any} onBack={() => {}} onSave={onSave} />);
    await waitFor(() => expect(screen.getAllByText(/SKILL\.md/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: /新增文件/ }));
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/path/);
    expect(onSave).not.toHaveBeenCalled();
  });

  // TS-05：path 重复 → 不提交
  it('TS-05 path 重复时不保存并提示', async () => {
    mockApi({ 'GET /api/tools/3': { body: { ...SKILL(), files_json: FILES } } });
    const onSave = vi.fn();
    render(<ToolDetail tool={SKILL() as any} onBack={() => {}} onSave={onSave} />);
    await waitFor(() => expect(screen.getAllByText(/SKILL\.md/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: /新增文件/ }));
    fireEvent.change(screen.getByLabelText('文件路径 3'), { target: { value: 'SKILL.md' } });
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/重复/));
    expect(onSave).not.toHaveBeenCalled();
  });

  // TS-06：非 skill 类型不渲染技能文件区，也不发详情请求
  it('TS-06 plugin 不显示技能文件区', async () => {
    const calls = mockApi({});
    render(<ToolDetail tool={{ ...SKILL(), type: 'plugin', id: 9, files_count: 0 } as any} onBack={() => {}} onSave={() => {}} />);
    expect(screen.queryByRole('region', { name: '技能文件' })).toBeNull();
    expect(calls.some((c) => c.url === '/api/tools/9')).toBe(false);
  });

  // TS-07：详情拉取失败要显式报错，不静默当「没有文件」
  it('TS-07 详情拉取失败给出 alert', async () => {
    mockApi({ 'GET /api/tools/3': { status: 500, body: { detail: 'boom' } } });
    render(<ToolDetail tool={SKILL() as any} onBack={() => {}} onSave={() => {}} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/技能文件加载失败/));
  });
});

describe('工具库卡片', () => {
  // TS-08：列表只给 files_count 时卡片显示 N 文件
  it('TS-08 卡片显示文件数，无文件不显示', async () => {
    const rows = [
      { ...SKILL(), id: 1, name: '有文件的技能', files_count: 3 },
      { ...SKILL(), id: 2, name: '没文件的技能', files_count: 0 },
    ];
    // 组件挂载会 fetchTools 重拉：mock 必须返回这两行，否则列表被清空
    mockApi({ 'GET /api/tools': { body: { tools: rows, total: rows.length } } });
    useTools.setState({ tools: rows as any, loading: false });
    render(<ToolMarket onSelect={() => {}} />);
    await waitFor(() => expect(screen.getByText('有文件的技能')).toBeTruthy());
    expect(screen.getByText('3 文件')).toBeTruthy();
    expect(screen.queryByText('0 文件')).toBeNull();
  });
});
