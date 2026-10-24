/**
 * 知识库四节（change ui-parity · P3-4 / 原型 6.9 `knowledge.html`）
 *
 * 纪律：
 *  - 每节至少一条断言，断言打「页面上真有的字」而不是组件结构；
 *  - **不造数据**这件事要有反向断言：公共知识不出现示例文档（规范.pdf / api-schema.json），
 *    外部源不出现 config_json 里的凭据值（凭据只写不读）；
 *  - 写失败必须把后端 detail 原样显示（测试连接 / 上传 / 创建三处各一条）。
 *
 * 数据来源（本节唯一有后端的层 = §3 外部源）：
 *   GET  /api/agents/{id}/knowledge-sources
 *   POST /api/agents/{id}/knowledge-sources/{sid}/test
 *   POST /api/agents/{id}/knowledge-sources/upload
 *   POST /api/agents/{id}/knowledge-sources
 *   GET  /api/agents/knowledge/tags · GET /api/projects（§2 空间 1:1 归属映射）
 * §0 权限矩阵与 §1 公共知识是**产品口径**（无端点），页面已标「口径 / 未接入」。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import KnowledgeBase from '../pages/KnowledgeBase';
import { useKnowledge } from '../stores/knowledge';
import { useAgents } from '../stores/agents';
import { useProjects } from '../stores/projects';
import { invalidateCache } from '../utils/requestDedup';
import {
  CREDENTIAL_GAP_NOTE,
  CREDENTIAL_WRITE_ONLY_NOTE,
  EXTERNAL_READONLY_NOTE,
  EXTERNAL_UNWIRED,
  MATRIX_UNWIRED,
  NOT_FOUND_SAME_CODE,
  PUBLIC_UNWIRED,
  SPACE_MEMBER_NOTE,
  SPACE_PROJECT_1TO1,
  SPACE_UNWIRED,
  SPACE_UNVISIBILITY_WORDING,
} from '../components/knowledge/policy';

// ── 夹具 ────────────────────────────────────────────────
const TAG = { id: 1, name: '规范', color: '#3b82f6', owner_id: 'alice', created_at: '' };

const SOURCE = {
  id: 1, agent_id: 5, owner_id: 'alice', name: 'Confluence · 架构决策记录',
  source_type: 'http_api', url: 'https://confluence.example/adr',
  // 注意 workspace 键**不会**被打码（后端只打码 password / api_key）→ 页面必须整体不渲染它
  config_json: { api_key: '***', workspace: 'super-secret-workspace-token' },
  enabled: true, description: '', status: 'indexed', file_path: null,
  last_test_at: null, last_test_ok: null, created_at: '', updated_at: '', tags: [TAG],
};

const PROJECTS = { projects: [
  { id: 1, name: 'agentflow', owner_id: 'alice', status: 'active', description: '' },
  { id: 2, name: 'infra-scripts', owner_id: 'alice', status: 'active', description: '' },
] };

function mockApi(routes: Record<string, { status?: number; body: any }>) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    let body: any;
    if (init?.body) {
      try { body = JSON.parse(String(init.body)); } catch { body = init.body; }
    }
    calls.push({ url: String(url), method, body });
    const raw = String(url);
    const pathed = `${method} ${raw.split('?')[0]}`;
    const hit = routes[`${method} ${raw}`] ?? routes[pathed]
      ?? { status: 404, body: { detail: `no mock ${pathed}` } };
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

function baseRoutes(over: Record<string, { status?: number; body: any }> = {}) {
  return {
    'GET /api/agents': { body: { agents: [{ id: 5, name: '审查 Agent' }] } },
    'GET /api/projects': { body: PROJECTS },
    'GET /api/agents/knowledge/tags': { body: [TAG] },
    'GET /api/agents/5/knowledge-sources': { body: [SOURCE] },
    ...over,
  };
}

/** 选 Agent（§3 外部源按 Agent 绑定）+ 等表出来 */
async function pickAgent() {
  // 必须先等 /api/agents 回来把 <option> 渲染出来，否则 change 到不存在的 option 会被丢弃（select 值留在 ''）
  await screen.findByRole('option', { name: '审查 Agent' });
  const select = screen.getByLabelText('外部源所属 Agent');
  fireEvent.change(select, { target: { value: '5' } });
  await waitFor(() => expect(screen.getByText('Confluence · 架构决策记录')).toBeInTheDocument());
}

beforeEach(() => {
  invalidateCache();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  useKnowledge.setState({ sources: [], loading: false, tags: [], tagsLoading: false });
  useAgents.setState({ agents: [], loading: false });
  useProjects.setState({ projects: [], loading: false });
});

// ── §0 权限矩阵 ─────────────────────────────────────────
describe('§0 权限矩阵：一屏定死读 / 写 / 可见性', () => {
  it('四层 × 四列的表齐全，并写明越权与不存在同码 404', async () => {
    mockApi(baseRoutes());
    render(<KnowledgeBase />);

    const table = await screen.findByRole('table', { name: '知识库权限矩阵' });
    const heads = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    expect(heads).toEqual(['层', '全体用户 / 全体 Agent', '空间成员（用户 · Agent）', '平台管理员', '写入路径']);

    for (const layer of ['公共知识', '知识空间', '跨空间引用', '外部源']) {
      expect(within(table).getByText(layer)).toBeInTheDocument();
    }
    // 「越权与不存在同码 404」必须可见（口径句，不是提示）
    expect(screen.getByText(/越权与「资源不存在」统一返回 404/)).toBeInTheDocument();
    expect(NOT_FOUND_SAME_CODE).toContain('404');
    // 矩阵是口径而不是后端数据 → 必须自证
    expect(screen.getByText(MATRIX_UNWIRED)).toBeInTheDocument();
    expect(screen.getByText('口径')).toBeInTheDocument();
  });
});

// ── §1 公共知识 ─────────────────────────────────────────
describe('§1 公共知识：全局只读 · 管理员维护 · 四分类', () => {
  it('四分类齐全，且写明「全局只读 / 平台管理员维护」', async () => {
    mockApi(baseRoutes());
    render(<KnowledgeBase />);

    const table = await screen.findByRole('table', { name: '公共知识四分类' });
    for (const name of ['公司规范', 'API 契约', '安全基线', '入职引导']) {
      expect(within(table).getByText(name)).toBeInTheDocument();
    }
    expect(within(table).getAllByText('平台管理员').length).toBe(4);
    expect(screen.getByText(/公共知识全局可用、只读/)).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_UNWIRED)).toBeInTheDocument();
  });

  it('不摆示例文档：原型里的假文档行一个都不能出现', async () => {
    mockApi(baseRoutes());
    render(<KnowledgeBase />);
    await screen.findByRole('table', { name: '公共知识四分类' });
    for (const fake of ['规范.pdf', 'api-schema.json', '安全基线.md', 'onboarding.md']) {
      expect(screen.queryByText(new RegExp(fake.replace('.', '\\.')))).toBeNull();
    }
  });
});

// ── §2 知识空间 ─────────────────────────────────────────
describe('§2 知识空间：与项目 1:1 · 成员（用户与 Agent）读写 · 非成员不可见', () => {
  it('用真实项目做 1:1 归属映射，成员/文档列如实标未接入', async () => {
    mockApi(baseRoutes());
    render(<KnowledgeBase />);

    const table = await screen.findByRole('table', { name: '知识空间清单' });
    expect(within(table).getByText('agentflow 空间')).toBeInTheDocument();
    expect(within(table).getByText('infra-scripts 空间')).toBeInTheDocument();
    // 非成员不可见 + 成员读写 的口径句（「非成员不可见」在 §0 矩阵里也出现一次 → 用 getAllByText）
    expect(screen.getAllByText(new RegExp(SPACE_UNVISIBILITY_WORDING.split('：')[0])).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(SPACE_MEMBER_NOTE)).toBeInTheDocument();
    expect(SPACE_PROJECT_1TO1).toContain('空间与项目一一对应');
    // 成员 / 文档数 / 最近写入 三列 = 未接入（不伪造）
    expect(within(table).getAllByText('未接入').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(SPACE_UNWIRED)).toBeInTheDocument();
  });
});

// ── §3 外部源 ───────────────────────────────────────────
describe('§3 外部源：关联进空间后只读 · 凭据只写不读 · 关联空间未接入', () => {
  it('列出真实外部源，并写明「关联进空间后只读」与「凭据只写不读」', async () => {
    mockApi(baseRoutes());
    render(<KnowledgeBase />);
    await pickAgent();

    const table = screen.getByRole('table', { name: '外部源清单' });
    expect(within(table).getByText('Confluence · 架构决策记录')).toBeInTheDocument();
    expect(within(table).getByText('HTTP API')).toBeInTheDocument();
    expect(within(table).getByText('已索引')).toBeInTheDocument();
    // 关联空间 = 未接入；凭据 = 已配置（只写不读）
    expect(within(table).getByText('未接入')).toBeInTheDocument();
    expect(within(table).getByText('已配置（只写不读）')).toBeInTheDocument();
    expect(screen.getByText(EXTERNAL_READONLY_NOTE)).toBeInTheDocument();
    expect(screen.getByText(CREDENTIAL_WRITE_ONLY_NOTE)).toBeInTheDocument();
    expect(screen.getByText(CREDENTIAL_GAP_NOTE)).toBeInTheDocument();
    expect(screen.getByText(EXTERNAL_UNWIRED)).toBeInTheDocument();
  });

  it('凭据只写不读：config_json 的值（含未被打码的键）在页面上一处都不渲染', async () => {
    mockApi(baseRoutes());
    render(<KnowledgeBase />);
    await pickAgent();
    expect(screen.queryByText(/super-secret-workspace-token/)).toBeNull();
    expect(screen.queryByText(/"api_key"/)).toBeNull();
  });

  it('测试连接成功 → 显示后端返回的结论', async () => {
    mockApi(baseRoutes({
      'POST /api/agents/5/knowledge-sources/1/test': { body: { ok: true, detail: '连接成功 · 214 chunks' } },
    }));
    render(<KnowledgeBase />);
    await pickAgent();
    fireEvent.click(screen.getByRole('button', { name: /测试连接/ }));
    expect(await screen.findByText('连接成功 · 214 chunks')).toBeInTheDocument();
  });

  it('测试连接失败 → 后端 detail 原样显示（不压成「测试失败」）', async () => {
    mockApi(baseRoutes({
      'POST /api/agents/5/knowledge-sources/1/test': { status: 400, body: { detail: 'Notion 401 · 令牌过期' } },
    }));
    render(<KnowledgeBase />);
    await pickAgent();
    fireEvent.click(screen.getByRole('button', { name: /测试连接/ }));
    expect(await screen.findByText('Notion 401 · 令牌过期')).toBeInTheDocument();
  });

  it('上传被拒 → 400 的 detail 原样显示（含后端的具体原因）', async () => {
    mockApi(baseRoutes({
      'POST /api/agents/5/knowledge-sources/upload': {
        status: 400, body: { detail: '文件过大: 11534336 bytes，最大允许 10485760 bytes (10MB)' },
      },
    }));
    const { container } = render(<KnowledgeBase />);
    await pickAgent();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'.repeat(16)], 'big.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '文件过大: 11534336 bytes，最大允许 10485760 bytes (10MB)',
    );
  });

  it('创建外部源失败 → detail 原样显示在弹层里', async () => {
    mockApi(baseRoutes({
      'POST /api/agents/5/knowledge-sources': { status: 400, body: { detail: 'source_type 不支持: ftp' } },
    }));
    render(<KnowledgeBase />);
    await pickAgent();

    fireEvent.click(screen.getAllByRole('button', { name: /添加外部源/ })[0]);
    fireEvent.change(screen.getByLabelText('外部源名称'), { target: { value: '内部 FTP' } });
    fireEvent.change(screen.getByLabelText('外部源 URL'), { target: { value: 'ftp://x/y' } });
    fireEvent.click(screen.getByRole('button', { name: '确认添加' }));

    expect(await screen.findByText('source_type 不支持: ftp')).toBeInTheDocument();
  });
});

// ── 顶部筛选 / 空态 ─────────────────────────────────────
describe('筛选与空态：搜索 / 范围跨节生效，空就是空', () => {
  it('搜索命中才留下，未命中说没命中（不补假行）', async () => {
    mockApi(baseRoutes());
    render(<KnowledgeBase />);
    const search = screen.getByLabelText('搜索知识');

    await screen.findByText('infra-scripts 空间');
    fireEvent.change(search, { target: { value: 'agentflow' } });
    expect(screen.getByText('agentflow 空间')).toBeInTheDocument();
    expect(screen.queryByText('infra-scripts 空间')).toBeNull();

    fireEvent.change(search, { target: { value: 'zzz-nothing' } });
    expect(screen.getByText('搜索没有命中任何项目空间。')).toBeInTheDocument();
  });

  it('范围 = 仅公共知识时，空间与外部源两节不渲染', async () => {
    mockApi(baseRoutes());
    render(<KnowledgeBase />);
    fireEvent.change(screen.getByLabelText('范围'), { target: { value: 'public' } });
    expect(screen.queryByRole('table', { name: '知识空间清单' })).toBeNull();
    expect(screen.queryByRole('table', { name: '外部源清单' })).toBeNull();
    expect(screen.getByRole('table', { name: '公共知识四分类' })).toBeInTheDocument();
    // 权限矩阵常驻（它不是数据层）
    expect(screen.getByRole('table', { name: '知识库权限矩阵' })).toBeInTheDocument();
  });

  it('没选 Agent 时外部源给指引而不是假数据', async () => {
    mockApi(baseRoutes());
    render(<KnowledgeBase />);
    const table = await screen.findByRole('table', { name: '外部源清单' });
    expect(within(table).getByText(/先在上方选择 Agent/)).toBeInTheDocument();
    expect(within(table).queryByText('Confluence · 架构决策记录')).toBeNull();
  });
});
