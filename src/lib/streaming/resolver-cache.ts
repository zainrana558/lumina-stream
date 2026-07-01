/**
 * Stream Resolver Cache
 *
 * Caches resolved stream URLs to avoid re-resolving on every page visit.
 *
 * Two-layer cache:
 *   L1: Redis (shared across users, 30min TTL)
 *   L2: Client sessionStorage (per-browser, 30min TTL)
 *
 * Key format: resolve:{contentId}:{contentType}:{season}:{episode}:{providerId}
 *
 * Invalidation:
 *   - On provider death → batch-delete keys matching resolve:*:{providerId}
 *   - TTL auto-expires stale entries
 *
 * Hit rate target: >60% within TTL window.
 */

import { getRedis } from '@/lib/redis';

// ── Types ──

export interface ResolvedStream {
  url: string;
  provider: string;
  resolvedAt: number;
  /** The selection score at time of resolution */
  score: number;
}

const CACHE_TTL = 30 * 60; // 30 minutes

// ── Key Generation ──

export function resolverCacheKey(
  contentId: string,
  contentType: string,
  season?: number,
  episode?: number,
  providerId?: string
): string {
  return [
    'resolve',
    contentId,
    contentType,
    season ?? '_',
    episode ?? '_',
    providerId ?? '_',
  ].join(':');
}

// ── Server-Side (Redis L1) ──

export async function getResolvedStream(
  contentId: string,
  contentType: string,
  season?: number,
  episode?: number,
  providerId?: string
): Promise<ResolvedStream | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const key = resolverCacheKey(contentId, contentType, season, episode, providerId);
    const data = await client.get<string>(key);
    if (!data) return null;

    const parsed = JSON.parse(data) as ResolvedStream;

    // Verify not expired locally (in case Redis TTL failed)
    const age = Date.now() - parsed.resolvedAt;
    if (age > CACHE_TTL * 1000) {
      await client.del(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function setResolvedStream(
  contentId: string,
  contentType: string,
  url: string,
  provider: string,
  score: number,
  season?: number,
  episode?: number,
  providerId?: string
): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const key = resolverCacheKey(contentId, contentType, season, episode, providerId);
    const value: ResolvedStream = {
      url,
      provider,
      resolvedAt: Date.now(),
      score,
    };
    await client.set(key, JSON.stringify(value), { ex: CACHE_TTL });
  } catch {
    // Ignore — will re-resolve on next request
  }
}

/**
 * Invalidate all cached streams for a specific provider.
 * Called when a provider is marked as dead.
 */
export async function invalidateProviderStreams(providerId: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;

  try {
    // Scan for keys matching resolve:*:*:*:*:providerId
    let cursor = 0;
    let deleted = 0;
    const pattern = `resolve:*:*:*:*:${providerId}`;

    do {
      const [nextCursor, keys] = await client.scan(cursor, {
        match: pattern,
        count: 20,
      });
      cursor = Number(nextCursor);

      if (keys.length > 0) {
        await client.del(...keys);
        deleted += keys.length;
      }
    } while (cursor > 0);

    return deleted;
  } catch {
    return 0;
  }
}

// ── Client-Side (sessionStorage L2) ──

const SESSION_PREFIX = 'lumina_resolve_';

export function getResolvedStreamClient(
  contentId: string,
  contentType: string,
  season?: number,
  episode?: number,
  providerId?: string
): ResolvedStream | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = SESSION_PREFIX + resolverCacheKey(contentId, contentType, season, episode, providerId);
    const data = sessionStorage.getItem(key);
    if (!data) return null;

    const parsed = JSON.parse(data) as ResolvedStream;

    // Verify not expired
    const age = Date.now() - parsed.resolvedAt;
    if (age > CACHE_TTL * 1000) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setResolvedStreamClient(
  contentId: string,
  contentType: string,
  url: string,
  provider: string,
  score: number,
  season?: number,
  episode?: number,
  providerId?: string
): void {
  if (typeof window === 'undefined') return;

  try {
    const key = SESSION_PREFIX + resolverCacheKey(contentId, contentType, season, episode, providerId);
    const value: ResolvedStream = {
      url,
      provider,
      resolvedAt: Date.now(),
      score,
    };
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage might be full or unavailable
  }
}