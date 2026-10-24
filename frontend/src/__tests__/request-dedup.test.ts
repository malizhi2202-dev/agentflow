/**
 * requestDedup：写后读一致性（v21 T-04 回归）
 *
 * 真实缺陷（MySQL + 真实浏览器 E2E 抓到）：创建团队后立刻 fetchTeams，
 * 若「页面挂载时的 GET /api/teams」仍在途（或刚被 invalidate 却在途），
 * 它在 settle 后又把自己写回缓存 → 列表 5s 内一直是创建前的旧数据。
 * 修法：缓存代际（invalidateCache 自增，旧代际响应不写缓存、不被复用）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dedupedFetch, invalidateCache } from '../utils/requestDedup';

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('requestDedup', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    invalidateCache(); // 每个用例从干净代际开始
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET 在 TTL 内命中缓存，不重复打网络', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ n: 1 }));
    await dedupedFetch('/api/x');
    await dedupedFetch('/api/x');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('POST 后 GET 必须拿到新结果（缓存被写操作失效）', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ teams: [] }))          // 挂载时读
      .mockResolvedValueOnce(jsonResponse({ ok: true }))           // 写
      .mockResolvedValueOnce(jsonResponse({ teams: [{ id: 1 }] })); // 写后读
    await dedupedFetch('/api/teams');
    await dedupedFetch('/api/teams', { method: 'POST', body: '{}' });
    invalidateCache();
    const res = await dedupedFetch('/api/teams');
    expect(await res.json()).toEqual({ teams: [{ id: 1 }] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('在途的读请求被 invalidate 后，不得把旧响应写回缓存', async () => {
    let releaseOld: (r: Response) => void = () => {};
    const oldGate = new Promise<Response>((resolve) => { releaseOld = resolve; });
    fetchMock
      .mockImplementationOnce(() => oldGate)                       // 挂载读：故意挂起
      .mockResolvedValueOnce(jsonResponse({ teams: [{ id: 2 }] }));// 写后读：新数据

    const pendingOld = dedupedFetch('/api/teams');                  // 在途旧读
    await Promise.resolve();                                        // 让 fetch 真正发起
    invalidateCache();                                             // 创建成功后失效
    const fresh = await dedupedFetch('/api/teams');                 // 写后读 → 新请求
    expect(await fresh.json()).toEqual({ teams: [{ id: 2 }] });

    releaseOld(jsonResponse({ teams: [] }));                        // 旧读这时候才回来
    await pendingOld;
    // 旧响应不得污染缓存：再读一次仍是新数据，且不再打网络（命中新数据的缓存）
    const again = await dedupedFetch('/api/teams');
    expect(await again.json()).toEqual({ teams: [{ id: 2 }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('并发同 URL 只发一次请求（in-flight 去重）', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ n: 1 }));
    const [a, b] = await Promise.all([dedupedFetch('/api/y'), dedupedFetch('/api/y')]);
    expect(await a.json()).toEqual({ n: 1 });
    expect(await b.json()).toEqual({ n: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
