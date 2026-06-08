/**
 * Client-side request deduplication + caching hook
 *
 * Prevents duplicate concurrent fetches for the same URL
 * and adds a short in-memory cache to avoid re-fetching recent data.
 *
 * Free, no external dependencies. Works great with Next.js App Router.
 */

const cache = new Map<string, { data: unknown; timestamp: number }>();
const inflight = new Map<string, Promise<unknown>>();

// Cache TTL per route pattern (milliseconds)
const CACHE_TTL: Record<string, number> = {
  '/api/tmdb': 60_000,          // 1 min — TMDB data changes infrequently
  '/api/search': 30_000,        // 30s — search results
  '/api/comments': 15_000,      // 15s — comments
  '/api/watchlist': 10_000,     // 10s — user's watchlist
  '/api/progress': 10_000,      // 10s — watch progress
  '/api/stats': 30_000,         // 30s — stats
  '/api/embed': 5_000,          // 5s — embed providers
};

function getCacheTtl(url: string): number {
  for (const [pattern, ttl] of Object.entries(CACHE_TTL)) {
    if (url.includes(pattern)) return ttl;
  }
  return 10_000; // default 10s
}

/**
 * Deduplicated fetch: if a request to the same URL is already in-flight,
 * return the existing promise instead of making a new request.
 *
 * Usage:
 *   const data = await dedupedFetch('/api/tmdb?endpoint=/trending/all/week');
 */
export async function dedupedFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const cacheTtl = getCacheTtl(url);

  // Check cache
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < cacheTtl) {
    return cached.data as T;
  }

  // Check if same request is already in-flight
  const inflightPromise = inflight.get(url);
  if (inflightPromise) {
    return inflightPromise as Promise<T>;
  }

  // Make the request
  const fetchPromise = fetch(url, options)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
      const data = await res.json();
      return data as T;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, fetchPromise);

  const result = await fetchPromise;

  // Cache successful results
  cache.set(url, { data: result, timestamp: Date.now() });

  return result;
}

/**
 * Clear cached entries matching a URL pattern.
 * Useful for invalidating cache after mutations.
 */
export function invalidateFetchCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Cleanup old cache entries periodically (prevent memory leak)
 */
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      const ttl = getCacheTtl(key);
      if (now - entry.timestamp > ttl * 10) {
        cache.delete(key);
      }
    }
  }, 120_000); // every 2 min
}
