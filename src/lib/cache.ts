/**
 * Upstash Redis cache for TMDB API responses & other expensive queries
 *
 * Reduces upstream API calls by caching responses:
 * - Trending/popular/discover: 24h TTL (TMDB updates daily at most)
 * - Details/seasons/credits/videos: 24h TTL
 * - Search results: 1h TTL (users expect fresh results)
 * - Stats (per-user): 5 min TTL
 *
 * Uses Upstash free tier (10K commands/day).
 * Graceful fallback to passthrough if Upstash unavailable.
 *
 * CACHE_VERSION: Bump this to instantly invalidate ALL cached data
 * (e.g. after schema changes, bug fixes in tmdbToMedia, etc.)
 */

import { getRedis } from '@/lib/redis';

// Bump this to invalidate all cached data on deploy
const CACHE_VERSION = 'v4';

// ---- TTL presets (in seconds) ----
// TMDB data changes at most once daily. Long TTLs dramatically reduce
// Worker/TMDB calls while keeping content fresh enough for users.
// Search stays shorter so users see fresh results.
export const CACHE_TTL = {
  trending:     24 * 60 * 60,  // 24h — TMDB trending updates once daily
  popular:      24 * 60 * 60,  // 24h — popular lists barely change
  search:       6 * 60 * 60,   // 6h — search results don't change minute-to-minute
  details:      24 * 60 * 60,  // 24h — movie/show details are stable
  season:       24 * 60 * 60,  // 24h — season data rarely changes
  discover:     24 * 60 * 60,  // 24h — discover results update slowly
  genre:        24 * 60 * 60,  // 24h — genre list is essentially static
  credits:      24 * 60 * 60,  // 24h — cast/crew don't change
  videos:       24 * 60 * 60,  // 24h — trailer links are stable
  stats:        5 * 60,        // 5 min (per-user stats — keep short)
  leaderboard:  2 * 60 * 60,   // 2h — global leaderboard
  reminders:    10 * 60,       // 10 min (episode reminder checks)
  warm:         24 * 60 * 60,  // 24h — pre-warmed catalogs
} as const;

// Explicit type to avoid inference issues with computed values + as const
export type CacheCategory = 'trending' | 'popular' | 'search' | 'details' | 'season' | 'discover' | 'genre' | 'credits' | 'videos' | 'stats' | 'leaderboard' | 'reminders' | 'warm';

// ---- Cache helpers ----

async function cacheKey(category: CacheCategory, key: string): Promise<string> {
  // Normalize: strip sensitive params from key to prevent credential leakage
  const clean = key
    .replace(/api_key=[^&]+/gi, '')
    .replace(/bearer_token=[^&]+/gi, '')
    .replace(/token=[^&]+/gi, '')
    .replace(/secret=[^&]+/gi, '')
    .replace(/&+/g, '&')
    .replace(/&$/, '')
    .replace(/^\?/, '');
  const full = `lumina:cache:${CACHE_VERSION}:${category}:${clean}`;
  // Hash keys longer than 200 chars to prevent excessive Redis memory usage
  // from maliciously crafted long query strings (Finding #38)
  if (full.length > 200) {
    // Use SHA-256 for collision-resistant hashing (crypto.subtle is available in Node.js 18+)
    const encoder = new TextEncoder();
    const data = encoder.encode(full);
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `lumina:cache:${CACHE_VERSION}:${category}:h:${hashHex.substring(0, 16)}`;
    } catch {
      // Fallback: truncated key (rare — only if crypto.subtle unavailable)
      return `lumina:cache:${CACHE_VERSION}:${category}:t:${full.slice(0, 64)}`;
    }
  }
  return full;
}

// ─── L1: in-process memory cache ─────────────────────────────────────────
// This deployment is a single long-lived Node process (not Vercel's many
// ephemeral isolates), so a plain module-level Map stays warm and serves
// repeat reads in ~0ms — no Upstash round-trip (which is ~140ms from this
// box) and no command spend. Redis stays as the L2 that survives a restart
// and (if it ever scales out) is shared. Bounded by entry count; a restart
// or CACHE_VERSION bump clears it.
interface L1Entry { v: unknown; exp: number }
const L1 = new Map<string, L1Entry>();
const L1_MAX = 6000;
const L1_TTL_CAP = 6 * 60 * 60; // don't hold anything in RAM longer than 6h

function l1Get(k: string): unknown | undefined {
  const e = L1.get(k);
  if (!e) return undefined;
  if (Date.now() > e.exp) { L1.delete(k); return undefined; }
  // refresh LRU position
  L1.delete(k); L1.set(k, e);
  return e.v;
}

function l1Set(k: string, v: unknown, ttlSec: number): void {
  if (L1.size >= L1_MAX) {
    // evict ~2% oldest
    let n = Math.ceil(L1_MAX * 0.02);
    for (const key of L1.keys()) { L1.delete(key); if (--n <= 0) break; }
  }
  L1.set(k, { v, exp: Date.now() + Math.min(ttlSec, L1_TTL_CAP) * 1000 });
}

export function l1Stats() { return { size: L1.size, max: L1_MAX }; }

/**
 * Try to get a cached value: L1 memory first, then Redis (populating L1).
 */
export async function getCached<T>(
  category: CacheCategory,
  key: string
): Promise<T | null> {
  const fullKey = await cacheKey(category, key);

  const hot = l1Get(fullKey);
  if (hot !== undefined) return hot as T;

  const client = getRedis();
  if (!client) return null;
  try {
    const result = await client.get<string>(fullKey);
    if (result) {
      const parsed = JSON.parse(result) as T;
      l1Set(fullKey, parsed, CACHE_TTL[category]);
      return parsed;
    }
    return null;
  } catch {
    return null; // Cache miss = fetch from source
  }
}

/**
 * Store a value in both L1 memory and Redis.
 */
export async function setCache<T>(
  category: CacheCategory,
  key: string,
  data: T
): Promise<void> {
  const fullKey = await cacheKey(category, key);
  const ttl = CACHE_TTL[category];
  l1Set(fullKey, data, ttl);

  const client = getRedis();
  if (!client) return;
  try {
    await client.set(fullKey, JSON.stringify(data) as unknown as typeof data, { ex: ttl });
  } catch {
    // Cache write failure = non-critical, ignore
  }
}

/**
 * Fetch with cache: try Redis first, fallback to fetcher, then cache result.
 */
export async function fetchWithCache<T>(
  category: CacheCategory,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await getCached<T>(category, key);
  if (cached) return cached;

  // Fetch from source
  const data = await fetcher();

  // Cache the result (fire-and-forget)
  setCache(category, key, data).catch(() => {});

  return data;
}

// ── Batch reads: MGET for multiple cache keys in one Redis round-trip ──

interface BatchEntry<T> {
  category: CacheCategory;
  key: string;
  fetcher: () => Promise<T>;
}

interface BatchResult<T> {
  data: T;
  hit: boolean;
}

/**
 * Batch fetch multiple cache entries in a single Redis pipeline.
 * On cache miss for individual entries, calls the corresponding fetcher.
 * Returns results in the same order as the input entries.
 *
 * Redis commands: 1 MGET (vs N individual GETs) on full hit.
 */
export async function fetchBatchWithCache<T>(
  entries: BatchEntry<T>[]
): Promise<BatchResult<T>[]> {
  if (entries.length === 0) return [];

  const client = getRedis();
  const keys = await Promise.all(entries.map(e => cacheKey(e.category, e.key)));

  // L1 memory first — pull what we can from RAM, only MGET the rest.
  const cachedValues: (string | null)[] = new Array(entries.length).fill(null);
  const need: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    const hot = l1Get(keys[i]);
    if (hot !== undefined) cachedValues[i] = JSON.stringify(hot);
    else need.push(i);
  }

  if (client && need.length > 0) {
    try {
      const got = await client.mget<string[]>(...need.map(i => keys[i]));
      need.forEach((i, j) => {
        const raw = got[j];
        if (raw) {
          cachedValues[i] = raw;
          try { l1Set(keys[i], JSON.parse(raw), CACHE_TTL[entries[i].category]); } catch { /* */ }
        }
      });
    } catch {
      // Pipeline failed — misses just get fetched below
    }
  }

  const results: BatchResult<T>[] = [];

  {
    // Process results: parse hits, queue misses for fetching
    const misses: number[] = [];
    const missFetchers: Array<() => Promise<T>> = [];

    for (let i = 0; i < entries.length; i++) {
      const raw = cachedValues[i];
      if (raw) {
        try {
          results[i] = { data: JSON.parse(raw) as T, hit: true };
          continue;
        } catch {
          // Parse error — treat as miss
        }
      }
      misses.push(i);
      missFetchers.push(entries[i].fetcher);
    }

    // Fetch all misses in parallel
    if (misses.length > 0) {
      const fetched = await Promise.all(missFetchers.map(f => f()));
      // Cache miss results (fire-and-forget) + fill results
      for (let j = 0; j < misses.length; j++) {
        const idx = misses[j];
        results[idx] = { data: fetched[j], hit: false };
        // Fire-and-forget cache write
        setCache(entries[idx].category, entries[idx].key, fetched[j]).catch(() => {});
      }
    }

    return results;
  }
}