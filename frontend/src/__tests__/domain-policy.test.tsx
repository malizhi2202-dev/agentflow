/**
 * 域归因策略卡（v21 T-08）用例：
 * 读当前策略 → 选择三档之一 → PUT 落库；后端拒绝时把 detail 原样给用户。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DomainPolicyCard from '../components/DomainPolicyCard';
import { invalidateCache } from '../utils/requestDedup';

function mockApi(routes: Record<string, { status?: number; body: any }>) {
  const calls: { url: string; method: string; body?: any }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: String(url), method, body });
    const hit = routes[`${method} ${String(url)}`] ?? { status: 404, body: { detail: 'no mock' } };
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

beforeEach(() => { invalidateCache(); vi.clearAllMocks(); });

describe('DomainPolicyCard', () => {
  it('读到已有策略时下拉显示该档', async () => {
    mockApi({
      'GET /api/domains/7/attribution-policy': { body: { domain_id: 7, policy: { accountable: 'team_owner' } } },
    });
    render(<DomainPolicyCard domainId={7} />);
    await waitFor(() => expect((screen.getByLabelText('accountable 策略') as HTMLSelectElement).value).toBe('team_owner'));
  });

  it('选择 member 时 PUT 该值并回显已保存', async () => {
    const calls = mockApi({
      'GET /api/domains/7/attribution-policy': { body: { domain_id: 7, policy: null } },
      'PUT /api/domains/7/attribution-policy': { body: { ok: true } },
    });
    render(<DomainPolicyCard domainId={7} />);
    await waitFor(() => expect(screen.getByLabelText('accountable 策略')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('accountable 策略'), { target: { value: 'member' } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/已保存：member/));
    const put = calls.find((c) => c.method === 'PUT');
    expect(put?.body).toEqual({ accountable: 'member' });
  });

  it('后端拒绝时展示 detail，不谎报成功', async () => {
    mockApi({
      'GET /api/domains/7/attribution-policy': { body: { domain_id: 7, policy: null } },
      'PUT /api/domains/7/attribution-policy': { status: 400, body: { detail: 'accountable 必须是 member/team_owner/originator' } },
    });
    render(<DomainPolicyCard domainId={7} />);
    await waitFor(() => expect(screen.getByLabelText('accountable 策略')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('accountable 策略'), { target: { value: 'team_owner' } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/accountable 必须是/));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
