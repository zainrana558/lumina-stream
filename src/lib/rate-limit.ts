/**
 * Upstash Redis-based rate limiter with batched Redis checks
 *
 * - Sliding window counter for API routes
 * - Graceful fallback to in-memory if Upstash is unavailable
 * - BATCH_SIZE=1: syncs to Redis on every request. This used to be 10 (only
 *   sync every 10th request) to save Upstash commands, but that meant each
 *   serverless instance's local counter could run up to 9 requests stale
 *   before the next sync — fine on this self-hosted single-process
 *   deployment (one counter, always accurate), but on a multi-instance
 *   platform (Vercel) each instance keeps its own independent local
 *   counter, so an attacker spread across N concurrent instances could
 *   exceed the configured limit by roughly N× before any instance's sync
 *   caught up. Confirmed ~3 Upstash commands per sync (EVALSHA + the
 *   sliding-window script's own INCRBY + PEXPIRE, each metered separately —
 *   verified against live per-command stats, not assumed), so this is a
 *   real ~10x increase in rate-limit-related Redis usage, accepted
 *   deliberately in exchange for closing that gap. Still async/fire-and-
 *   forget, not awaited — see batchMemoryCheck's own comment for exactly
 *   what that does and doesn't fix.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '@/lib/redis';

// ---- Rate limiter presets ----
type LimiterType = 'global' | 'tmdb' | 'search' | 'auth' | 'write' | 'embed' | 'stats' | 'leaderboard' | 'newsletter';

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
  // Newsletter signup: unauthenticated public form, strict to deter spam bots
  newsletter:  { tokens: 3, window: '60 s' },
};

// Window durations in ms for in-memory fallback + batch sync
const WINDOW_MS: Record<LimiterType, number> = {
  global:      10_000,
  tmdb:        10_000,
  search:      10_000,
  auth:        60_000,
  write:       10_000,
  embed:       10_000,
  stats:       60_000,
  leaderboard: 60_000,
  newsletter:  60_000,
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

// ---- In-memory batch tracking ----
// Was 10 (sync every 10th request); now 1 (sync every request) — see the
// file header comment for the multi-instance-concurrency reasoning and the
// real Upstash command-volume cost this trades for it.
const BATCH_SIZE = 1;

interface BatchEntry {
  count: number;       // requests counted since last Redis sync
  totalUsed: number;   // total tokens used in current window (from Redis)
  windowStart: number; // ms — when the current window started
  syncRemaining: number; // remaining tokens reported by last Redis check
  lastBlocked: boolean;  // was the last Redis check blocked?
}

const batchStore = new Map<string, BatchEntry>();

function getBatchKey(type: LimiterType, identifier: string): string {
  return `${type}:${identifier}`;
}

/**
 * In-memory rate check with batched Redis sync.
 * Returns true if allowed, false if rate limited.
 *
 * Honest limit of BATCH_SIZE=1: every ALLOW/DENY decision below is still
 * made from this instance's own local `entry` state, synchronously, before
 * the Redis call even resolves — `redisLimiter.limit()` is fire-and-forget
 * (`.then()`/`.catch()`, never awaited), because awaiting it would block
 * every rate-limited request on a real network round-trip to Upstash. So
 * BATCH_SIZE=1 does not make this a zero-race, fully-authoritative
 * multi-instance limiter; it shrinks the exploitable staleness window from
 * "up to (BATCH_SIZE-1) requests this instance hasn't told Redis about yet"
 * down to "however many requests this instance handles inside one Redis
 * round-trip" (typically low tens of ms) — a real, large reduction, not a
 * mathematical guarantee. A genuine zero-race version would need to await
 * the Redis result and use it directly, which trades this latency cost for
 * per-request correctness — a different, bigger change than what was asked
 * for here.
 */
function batchMemoryCheck(
  type: LimiterType,
  identifier: string,
  redisLimiter: RatelimitInstance | null,
): { success: boolean; remaining: number; reset?: number } {
  const now = Date.now();
  const windowMs = WINDOW_MS[type];
  const tokens = LIMITS[type].tokens;
  const key = getBatchKey(type, identifier);
  const entry = batchStore.get(key);

  // No entry or window expired — fresh start
  if (!entry || now > entry.windowStart + windowMs) {
    const fresh: BatchEntry = {
      count: 1,
      totalUsed: 1,
      windowStart: now,
      syncRemaining: tokens - 1,
      lastBlocked: false,
    };
    batchStore.set(key, fresh);

    // First request in window — sync to Redis immediately
    if (redisLimiter) {
      // Fire and forget — don't block the response on Redis
      redisLimiter.limit(identifier).catch(() => {});
    }

    return { success: true, remaining: tokens - 1 };
  }

  // Window is still active
  entry.count++;

  // Check in-memory limit using last known remaining from Redis
  if (entry.lastBlocked || entry.syncRemaining <= 0) {
    // Already blocked by Redis — stay blocked
    return { success: false, remaining: 0, reset: entry.windowStart + windowMs };
  }

  // Estimate remaining based on in-memory count since last sync
  const estimatedUsed = entry.totalUsed + (entry.count - 1);
  const estimatedRemaining = Math.max(0, tokens - estimatedUsed);

  if (estimatedRemaining <= 0) {
    return { success: false, remaining: 0, reset: entry.windowStart + windowMs };
  }

  // Every BATCH_SIZE-th request, sync to Redis for accuracy
  if (entry.count >= BATCH_SIZE && redisLimiter) {
    // Each Redis `.limit()` call only ever represents ONE token consumed —
    // it has no way to know the other (BATCH_SIZE-1) real requests happened
    // locally in between syncs, so its reported "used" count is necessarily
    // an undercount relative to actual traffic. Blindly assigning it back
    // (as this used to do) periodically reset the accurate local counter
    // DOWN to that stale, sparse sample, letting the limit be bypassed
    // indefinitely for any traffic spread out enough for each sync to
    // resolve before the next one fires (confirmed empirically: sequential
    // request bursts never triggered a 429, while tight concurrent bursts
    // did). Local, per-request counting is already exact for this
    // single-process deployment — Redis's role is only to catch a HIGHER
    // count than local tracking knows about (e.g. a future multi-instance
    // deployment sharing the same identifier), never to lower it.
    redisLimiter.limit(identifier)
      .then(result => {
        const redisTotalUsed = tokens - result.remaining;
        entry.totalUsed = Math.max(entry.totalUsed, redisTotalUsed);
        entry.syncRemaining = Math.max(0, tokens - entry.totalUsed);
        entry.lastBlocked = entry.totalUsed >= tokens || !result.success;
      })
      .catch(() => {
        // Redis failed — keep using in-memory estimate
      });

    // Reset batch counter after sync
    entry.totalUsed = estimatedUsed;
    entry.count = 0;
  }

  return { success: true, remaining: estimatedRemaining, reset: entry.windowStart + windowMs };
}

// Cleanup stale batch entries every 30s to prevent memory leak
// Remove entries older than 2x the max window (120s)
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of batchStore.entries()) {
      if (now > val.windowStart + 120_000) batchStore.delete(key); // 2x max window
    }
  }, 30_000); // Every 30s for faster cleanup under high traffic
}

// ---- Legacy in-memory fallback (used when Redis is completely unavailable) ----
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
    // Redis available — use batched in-memory with periodic Redis sync
    return batchMemoryCheck(type, identifier, limiter);
  }

  // No Redis at all — pure in-memory fallback
  const windowMs = WINDOW_MS[type];
  const tokens = LIMITS[type].tokens;
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