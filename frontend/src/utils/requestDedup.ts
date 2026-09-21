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
}

interface SafeFetchResult {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
}

// ── 状态 ──────────────────────────────────────────────

/** in-flight 请求 Map：key=标准化 URL → 共享 Promise */
const inFlight = new Map<string, Promise<Response>>();

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
  const key = canonicalUrl(url);

  // 1. 查缓存（未过期）
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    if (IS_DEV) console.debug(`[requestDedup] cache hit: ${key}`);
    return cached.promise.then(r => r.clone());
  }
  // 过期则清除
  if (cached) cache.delete(key);

  // 2. 查 in-flight
  const flying = inFlight.get(key);
  if (flying) {
    if (IS_DEV) console.debug(`[requestDedup] in-flight hit: ${key}`);
    return flying.then(r => r.clone());
  }

  // 3. 新建请求
  if (IS_DEV) console.debug(`[requestDedup] new fetch: ${key}`);
  const promise = window.fetch(url, options);

  // 存入 in-flight
  inFlight.set(key, promise);

  // 完成后：移入缓存，移出 in-flight
  promise
    .then(() => {
      inFlight.delete(key);
      cache.set(key, { promise, timestamp: Date.now() });
      evictIfNeeded();
    })
    .catch(() => {
      inFlight.delete(key);
      // 不缓存失败的请求
    });

  return promise.then(r => r.clone());
}

/**
 * 安全 fetch：包装 dedupedFetch，拦截非 200 响应返回结构化错误对象。
 * 这样不会因为 500 返回 HTML 而报 SyntaxError。
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<SafeFetchResult> {
  try {
    const res = await dedupedFetch(url, options);

    // 401 特殊处理：清除 localStorage 并 reload
    if (res.status === 401) {
      localStorage.removeItem('current_user_id');
      window.location.reload();
      return { ok: false, status: 401, error: 'Unauthorized — redirecting to login' };
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
  if (url) {
    const key = canonicalUrl(url);
    cache.delete(key);
    if (IS_DEV) console.debug(`[requestDedup] cache invalidated: ${key}`);
  } else {
    cache.clear();
    if (IS_DEV) console.debug('[requestDedup] all cache cleared');
  }
}
