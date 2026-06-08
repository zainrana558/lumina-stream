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
