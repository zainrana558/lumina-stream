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
const CACHE_VERSION = 'v3';

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
  // Normalize: strip api_key, bearer tokens from key
  const clean = key
    .replace(/api_key=[^&]+/g, '')
    .replace(/&+/g, '&')
    .replace(/&$/, '');
  return `lumina:cache:${CACHE_VERSION}:${category}:${clean}`;
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

