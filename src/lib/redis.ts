/**
 * Centralized Upstash Redis singleton
 *
 * Shared by rate-limit.ts, cache.ts, and any other lib that needs Redis.
 * Free tier: 10,000 commands/day — be economical.
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let disabled = false;

export function getRedis(): Redis | null {
  if (disabled) return null;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    disabled = true;
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis({ url, token });
    } catch {
      disabled = true;
      return null;
    }
  }

  return redis;
}

/**
 * Generic cache-through helper for external API data.
 *
 * Checks Redis first; on miss, calls the fetcher and stores the result
 * with the specified TTL. Falls back to the fetcher directly if Redis
 * is unavailable, ensuring no hard dependency on the cache.
 *
 * This is the convenience wrapper referenced in the multi-tier caching
 * strategy (Cloudflare Edge → Upstash Redis → External API).
 */
interface CacheOptions {
  ttl: number; // Time to live in seconds
}

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = { ttl: 3600 }
): Promise<T> {
  const client = getRedis();

  if (client) {
    try {
      const cached = await client.get<T>(key);
      if (cached) {
        console.log(`[Redis Cache] HIT for key: ${key}`);
        return cached;
      }
      console.log(`[Redis Cache] MISS for key: ${key}, fetching from origin`);
    } catch (error) {
      console.error(`[Redis Cache] Error reading key ${key}:`, error);
      // Fall through to fetcher
    }
  }

  // Cache miss or Redis unavailable — fetch from origin
  const data = await fetcher();

  // Store in Redis (fire-and-forget)
  if (client && data) {
    try {
      await client.set(key, data as unknown as string, { ex: options.ttl });
    } catch (error) {
      console.error(`[Redis Cache] Error writing key ${key}:`, error);
    }
  }

  return data;
}
