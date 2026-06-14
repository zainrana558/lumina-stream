/**
 * Upstash Redis cache for TMDB API responses & other expensive queries
 *
 * Reduces upstream API calls by caching responses:
 * - Trending/popular: 15 min TTL
 * - Search results: 15 min TTL
 * - Details/seasons: 3 hour TTL
 * - Discover/genre: 30 min TTL
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
// Kept short so content stays fresh and up-to-date.
// TMDB trending/discover data changes frequently (daily).
export const CACHE_TTL = {
  trending:     15 * 60,       // 15 min — trending changes rapidly
  popular:      30 * 60,       // 30 min
  search:       15 * 60,       // 15 min — search results should be fresh
  details:      3 * 60 * 60,   // 3 hours — details change less often
  season:       3 * 60 * 60,   // 3 hours
  discover:     30 * 60,       // 30 min — was 2hr, too stale
  genre:        6 * 60 * 60,   // 6 hours (genre list rarely changes)
  credits:      3 * 60 * 60,   // 3 hours
  videos:       3 * 60 * 60,   // 3 hours
  stats:        5 * 60,        // 5 min (per-user stats)
  leaderboard:  30 * 60,       // 30 min (global leaderboard, aggregated data)
  reminders:    10 * 60,       // 10 min (episode reminder checks)
  warm:         6 * 60 * 60,   // 6 hours — full genre warm lists (stable, pre-warmed catalogs)
} as const;

// Explicit type to avoid inference issues with computed values + as const
export type CacheCategory = 'trending' | 'popular' | 'search' | 'details' | 'season' | 'discover' | 'genre' | 'credits' | 'videos' | 'stats' | 'leaderboard' | 'reminders' | 'warm';

// ---- Cache helpers ----

function cacheKey(category: CacheCategory, key: string): string {
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
    // Simple fast hash using SubtleCrypto (async-safe in Node.js)
    // Fall back to truncated key in edge cases
    const encoder = new TextEncoder();
    const data = encoder.encode(full);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      hash = ((hash << 5) - hash + byte) | 0;
    }
    return `lumina:cache:${CACHE_VERSION}:${category}:h:${Math.abs(hash).toString(36)}`;
  }
  return full;
}

/**
 * Try to get a cached value from Redis
 */
export async function getCached<T>(
  category: CacheCategory,
  key: string
): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const fullKey = cacheKey(category, key);
    const result = await client.get<string>(fullKey);
    if (result) return JSON.parse(result) as T;
    return null;
  } catch {
    return null; // Cache miss = fetch from source
  }
}

/**
 * Store a value in Redis cache
 */
export async function setCache<T>(
  category: CacheCategory,
  key: string,
  data: T
): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const fullKey = cacheKey(category, key);
    const ttl = CACHE_TTL[category];
    await client.set(fullKey, JSON.stringify(data) as unknown as typeof data, {
      ex: ttl,
    });
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
  const keys = entries.map(e => cacheKey(e.category, e.key));

  // Try batch read from Redis
  let cachedValues: (string | null)[] | null = null;
  if (client) {
    try {
      cachedValues = await client.mget<string[]>(...keys);
    } catch {
      // Pipeline failed — fall through to individual fetches
    }
  }

  const results: BatchResult<T>[] = [];

  if (cachedValues) {
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

  // No Redis — fetch all individually (fallback)
  const allData = await Promise.all(entries.map(e => e.fetcher()));
  return allData.map(data => ({ data, hit: false }));
}