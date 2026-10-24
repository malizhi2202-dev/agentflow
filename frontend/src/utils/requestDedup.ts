/**
 * requestDedup.ts — 请求去重 + 短期缓存 + 安全 fetch 包装
 *
 * 三层架构：
 *   1. in-flight 去重：同一 URL 的并发请求共享一个 Promise
 *   2. 短期缓存：5s TTL，页面切换不丢失
 *   3. 手动穿透：invalidateCache() 强制刷新
 */

// ── 类型 ──────────────────────────────────────────────

interface CacheEntry {
  promise: Promise<Response>;
  timestamp: number;
  gen: number;
}

interface InFlightEntry {
  promise: Promise<Response>;
  gen: number;
}

interface SafeFetchResult {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
}

// ── 状态 ──────────────────────────────────────────────

/** in-flight 请求 Map：key=标准化 URL → 共享 Promise */
const inFlight = new Map<string, InFlightEntry>();

/**
 * 缓存代际：invalidateCache() 自增。
 *
 * 为什么需要：请求**在途中**被 invalidate 时，它 settle 后仍会把自己写回缓存，
 * 于是「创建后立刻刷新列表」拿到的是创建前的旧响应（5s 内一直错，用户看不到新团队）。
 * 用代际标记让旧代际的响应既不写缓存、也不被后续请求当作 in-flight 复用。
 */
let generation = 0;

/** 缓存 Map：key=标准化 URL → { promise, timestamp } */
const cache = new Map<string, CacheEntry>();

/** 缓存 TTL（毫秒） */
const CACHE_TTL = 5_000;

/** 缓存最大条目数 */
const MAX_CACHE_SIZE = 200;

/** 开发模式 */
const IS_DEV = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// ── URL 标准化 ────────────────────────────────────────

function canonicalUrl(url: string): string {
  // 移除尾部斜杠
  let u = url.replace(/\/+$/, '');
  // 解析 query params 并排序
  const qIdx = u.indexOf('?');
  if (qIdx === -1 || qIdx === u.length - 1) return u;
  const base = u.slice(0, qIdx);
  const raw = u.slice(qIdx + 1);
  const params = raw.split('&').filter(Boolean).sort();
  return base + '?' + params.join('&');
}

// ── LRU 淘汰 ──────────────────────────────────────────

function evictIfNeeded(): void {
  while (cache.size > MAX_CACHE_SIZE) {
    // 找到最旧的条目
    let oldest = '';
    let oldestTime = Infinity;
    for (const [k, v] of cache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldest = k;
      }
    }
    if (oldest) cache.delete(oldest);
  }
}

// ── 核心函数 ──────────────────────────────────────────

/**
 * 去重 fetch：同一 URL 的并发请求共享结果，5s 内重复请求返回缓存。
 */
export function dedupedFetch(url: string, options?: RequestInit): Promise<Response> {
  // 缓存键必须带 method：GET /api/tasks 与 POST /api/tasks 是两件事。
  // 只用 URL 做键会让「写」命中「读」的缓存 → 写请求根本没发出去却返回成功（v20-ui-collab 用例抓到）。
  const method = (options?.method || 'GET').toUpperCase();
  const key = `${method} ${canonicalUrl(url)}`;
  const cacheable = method === 'GET';

  // 1. 查缓存（未过期；只对 GET 生效；旧代际一律视为失效）
  const cached = cacheable ? cache.get(key) : undefined;
  if (cached && cached.gen === generation && Date.now() - cached.timestamp < CACHE_TTL) {
    if (IS_DEV) console.debug(`[requestDedup] cache hit: ${key}`);
    return cached.promise.then(r => r.clone());
  }
  // 过期则清除
  if (cached) cache.delete(key);

  // 2. 查 in-flight（旧代际的在途请求已作废，不能复用它的旧结果）
  const flying = inFlight.get(key);
  if (flying && flying.gen === generation) {
    if (IS_DEV) console.debug(`[requestDedup] in-flight hit: ${key}`);
    return flying.promise.then(r => r.clone());
  }
  if (flying) inFlight.delete(key);

  // 3. 新建请求
  if (IS_DEV) console.debug(`[requestDedup] new fetch: ${key}`);
  const gen = generation;
  const promise = window.fetch(url, options);

  // 存入 in-flight
  inFlight.set(key, { promise, gen });

  // 完成后：移入缓存，移出 in-flight（仅在代际未变时；被 invalidate 过的响应作废）
  promise
    .then(() => {
      if (inFlight.get(key)?.promise === promise) inFlight.delete(key);
      if (cacheable && gen === generation) {
        cache.set(key, { promise, timestamp: Date.now(), gen });
        evictIfNeeded();
      }
    })
    .catch(() => {
      if (inFlight.get(key)?.promise === promise) inFlight.delete(key);
      // 不缓存失败的请求
    });

  return promise.then(r => r.clone());
}

/**
 * 安全 fetch：包装 dedupedFetch，拦截非 200 响应返回结构化错误对象。
 * 这样不会因为 500 返回 HTML 而报 SyntaxError。
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
  opts?: { redirectOn401?: boolean },
): Promise<SafeFetchResult> {
  try {
    const res = await dedupedFetch(url, options);

    // 401：服务端会话失效 → 清缓存并回登录页。
    // 身份探针（/api/auth/me）必须传 redirectOn401:false，否则登录页会无限刷新。
    if (res.status === 401) {
      cache.clear();
      inFlight.clear();
      if (opts?.redirectOn401 !== false) {
        window.location.reload();
      }
      return { ok: false, status: 401, error: 'Unauthorized — reloading to login' };
    }

    if (!res.ok) {
      // 非 200，返回结构化错误
      return { ok: false, status: res.status, error: `Server error: ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    // 网络错误或 JSON 解析错误
    return { ok: false, status: 0, error: err.message || 'Network error' };
  }
}

/**
 * 手动穿透缓存（创建/删除/更新操作后调用）
 * @param url 要失效的 URL（不传则清空全部缓存）
 */
export function invalidateCache(url?: string): void {
  generation += 1;   // 作废所有在途请求的写缓存资格（见 generation 注释）
  if (url) {
    // 同一 URL 的读缓存与写条目一起失效（键已带 method 前缀）
    const key = canonicalUrl(url);
    cache.delete(key);
    cache.delete(`GET ${key}`);
    if (IS_DEV) console.debug(`[requestDedup] cache invalidated: ${key}`);
  } else {
    cache.clear();
    if (IS_DEV) console.debug('[requestDedup] all cache cleared');
  }
}
