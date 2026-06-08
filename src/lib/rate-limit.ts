/**
 * Upstash Redis-based rate limiter
 *
 * Uses Upstash free tier (10K commands/day):
 * - Sliding window counter for API routes
 * - Token-based limiting for authenticated write operations
 * - Graceful fallback to in-memory if Upstash is unavailable
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '@/lib/redis';

// ---- Rate limiter presets ----
type LimiterType = 'global' | 'tmdb' | 'search' | 'auth' | 'write' | 'embed' | 'stats' | 'leaderboard';

// Duration strings matching Upstash's `${number} ${Unit}` type
type DurationStr = `${number} s` | `${number} m` | `${number} h`;

const LIMITS: Record<LimiterType, { tokens: number; window: DurationStr }> = {
  // 100 req per 10s per IP — protects all API routes
  global:      { tokens: 100, window: '10 s' },
  // TMDB proxy: 40 req per 10s (saves TMDB API quota)
  tmdb:        { tokens: 40, window: '10 s' },
  // Search: 20 req per 10s (prevent search abuse)
  search:      { tokens: 20, window: '10 s' },
  // Auth endpoints: 5 req per 60s (brute force protection)
  auth:        { tokens: 5, window: '60 s' },
  // Write endpoints (comment, rate, watchlist): 10 req per 10s
  write:       { tokens: 10, window: '10 s' },
  // Embed provider: 20 req per 10s
  embed:       { tokens: 20, window: '10 s' },
  // Stats: 15 req per 60s (moderate — user stats, not super expensive but 3 queries)
  stats:       { tokens: 15, window: '60 s' },
  // Leaderboard: 30 req per 60s (cached, low DB cost)
  leaderboard: { tokens: 30, window: '60 s' },
};

type RatelimitInstance = Ratelimit;
const limiterCache = new Map<string, RatelimitInstance>();

function getLimiter(type: LimiterType): RatelimitInstance | null {
  const client = getRedis();
  if (!client) return null;

  const cached = limiterCache.get(type);
  if (cached) return cached;

  const { tokens, window } = LIMITS[type];
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: `lumina:rl:${type}`,
    analytics: false, // disable analytics on free tier
  });

  limiterCache.set(type, limiter);
  return limiter;
}

// ---- In-memory fallback (single-instance, resets on deploy) ----
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryCheck(key: string, limit: number, windowMs: number): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

// Cleanup stale entries in memoryStore every 60s to prevent memory leak
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of memoryStore.entries()) {
      if (now > val.resetAt) memoryStore.delete(key);
    }
  }, 60_000);
}

// ---- Public API ----

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset?: number;
}

export async function rateLimit(
  type: LimiterType,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getLimiter(type);

  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch {
      // Upstash error — fall through to memory
    }
  }

  // Memory fallback
  const windowMap: Record<string, number> = {
    global: 10_000,
    tmdb: 10_000,
    search: 10_000,
    auth: 60_000,
    write: 10_000,
    embed: 10_000,
    stats: 60_000,
    leaderboard: 60_000,
  };
  const tokens = LIMITS[type].tokens;
  const windowMs = windowMap[type] || 10_000;
  return memoryCheck(`rl:${type}:${identifier}`, tokens, windowMs);
}

/**
 * Convenience wrapper for Next.js API routes.
 * Returns { success, remaining } — if !success, caller returns 429.
 */
export async function checkRateLimit(
  request: Request,
  type: LimiterType = 'global'
): Promise<RateLimitResult> {
  // Prefer Forwarded header (Cloudflare/Vercel), fallback to real IP, then unknown
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  return rateLimit(type, ip);
}

/**
 * Build standard 429 rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining),
  };
  if (result.reset) {
    headers['X-RateLimit-Reset'] = String(Math.ceil(result.reset / 1000));
  }
  return headers;
}
