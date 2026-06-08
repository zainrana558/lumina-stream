/**
 * Embed provider health checker with replacement pool integration
 *
 * Pings each provider periodically and caches alive/dead status in Redis.
 * When a provider is detected as dead:
 *   1. It gets swapped with a replacement from the stash
 *   2. The replacement takes its place in the active lineup
 *   3. When the original recovers, it swaps back in
 *
 * - Health TTL: 5 minutes
 * - Ping timeout: 6 seconds
 * - Economy: checks 1 provider per request (round-robin)
 * - Graceful: if Redis is down, skip filtering
 */

import { getRedis } from '@/lib/redis';
import { getAllProviders, getReplacementPool, swapInReplacement, restoreOriginal, getPoolStatus } from '@/lib/streaming/providers';

const HEALTH_PREFIX = 'lumina:provider:health:';
const HEALTH_TTL = 5 * 60; // 5 minutes
const CHECK_TIMEOUT = 6000; // 6 seconds
const CHECK_INTERVAL = 5 * 60 * 1000; // Check one provider every 5 min

// Track providers that were previously dead (for swap-in logic)
const PREV_HEALTH_PREFIX = 'lumina:provider:prev_health:';
// Track how many consecutive times a provider has been dead
const FAIL_COUNT_PREFIX = 'lumina:provider:fail_count:';

// In-memory cache (fallback if Redis is unavailable)
const memoryHealth = new Map<string, { alive: boolean; checkedAt: number }>();
const memoryPrev = new Map<string, boolean>();
const memoryFailCount = new Map<string, number>();
let lastCheckTime = 0;
let checkIndex = 0;

// Cleanup stale entries in all in-memory stores every 60s to prevent memory leak
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of memoryHealth.entries()) {
      if (now - val.checkedAt > HEALTH_TTL * 1000) memoryHealth.delete(key);
    }
    for (const [key, val] of memoryFailCount.entries()) {
      if (now - val > HEALTH_TTL * 1000) memoryFailCount.delete(key);
    }
    for (const [key] of memoryPrev) {
      // Clean up stale prev_health entries that have no corresponding health entry
      if (!memoryHealth.has(key)) memoryPrev.delete(key);
    }
  }, 60_000);
}

/**
 * Check if a single provider is reachable.
 */
async function pingProvider(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT);
    const res = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write health status to Redis (or memory fallback)
 */
async function setHealth(name: string, alive: boolean): Promise<void> {
  const client = getRedis();
  if (client) {
    try {
      await client.set(`${HEALTH_PREFIX}${name}`, alive ? '1' : '0', { ex: HEALTH_TTL });
    } catch {
      // Redis failure — fall through to memory
    }
  }
  memoryHealth.set(name, { alive, checkedAt: Date.now() });
}

/**
 * Read health status from Redis (or memory fallback)
 */
async function getHealth(name: string): Promise<boolean | null> {
  const client = getRedis();
  if (client) {
    try {
      const val = await client.get<string>(`${HEALTH_PREFIX}${name}`);
      if (val !== null) return val === '1';
    } catch {
      // Redis failure — try memory
    }
  }

  const mem = memoryHealth.get(name);
  if (mem && Date.now() - mem.checkedAt < HEALTH_TTL * 1000) {
    return mem.alive;
  }
  return null;
}

async function getPrevHealth(name: string): Promise<boolean | null> {
  const client = getRedis();
  if (client) {
    try {
      const val = await client.get<string>(`${PREV_HEALTH_PREFIX}${name}`);
      if (val !== null) return val === '1';
    } catch { /* fall through */ }
  }
  return memoryPrev.get(name) ?? null;
}

async function setPrevHealth(name: string, alive: boolean): Promise<void> {
  const client = getRedis();
  if (client) {
    try { await client.set(`${PREV_HEALTH_PREFIX}${name}`, alive ? '1' : '0', { ex: HEALTH_TTL }); } catch { /* ok */ }
  }
  memoryPrev.set(name, alive);
}

async function getFailCount(name: string): Promise<number> {
  const client = getRedis();
  if (client) {
    try {
      const val = await client.get<string>(`${FAIL_COUNT_PREFIX}${name}`);
      if (val !== null) return parseInt(val, 10);
    } catch { /* fall through */ }
  }
  return memoryFailCount.get(name) || 0;
}

async function incrementFailCount(name: string): Promise<void> {
  const count = (await getFailCount(name)) + 1;
  const client = getRedis();
  if (client) {
    try { await client.set(`${FAIL_COUNT_PREFIX}${name}`, String(count), { ex: HEALTH_TTL }); } catch { /* ok */ }
  }
  memoryFailCount.set(name, count);
}

async function resetFailCount(name: string): Promise<void> {
  const client = getRedis();
  if (client) {
    try { await client.del(`${FAIL_COUNT_PREFIX}${name}`); } catch { /* ok */ }
  }
  memoryFailCount.delete(name);
}

/**
 * Check one provider in a round-robin fashion.
 * Called on embed requests to spread health checks across traffic.
 * Triggers swap-in/swap-out when provider status changes.
 */
export async function maybeCheckOneProvider(): Promise<void> {
  const now = Date.now();
  if (now - lastCheckTime < CHECK_INTERVAL) return;

  const allProviders = getAllProviders();
  if (allProviders.length === 0) return;

  // Round-robin: check the next provider in line
  const provider = allProviders[checkIndex % allProviders.length];
  checkIndex++;
  lastCheckTime = now;

  const sampleUrl = provider.getMovieUrl(550); // Fight Club always exists
  const prevAlive = await getPrevHealth(provider.name);
  const alive = await pingProvider(sampleUrl);

  // Save current health
  await setHealth(provider.name, alive);
  await setPrevHealth(provider.name, alive);

  // Provider just died? (was alive, now dead)
  if (prevAlive !== null && prevAlive && !alive) {
    await incrementFailCount(provider.name);
    const failCount = await getFailCount(provider.name);

    // After 2 consecutive failures, swap in a replacement
    if (failCount >= 2) {
      const replacement = swapInReplacement(provider.name);
      if (replacement) {
        // Also pre-health-check the replacement
        const repAlive = await pingProvider(replacement.getMovieUrl(550));
        await setHealth(replacement.name, repAlive);
      }
    }
  }

  // Provider just recovered? (was dead, now alive)
  if (prevAlive !== null && !prevAlive && alive) {
    await resetFailCount(provider.name);
    restoreOriginal(provider.name);
  }
}

/**
 * Get names of providers that are currently marked as dead.
 * Dead providers that have been swapped out are NOT included (they're
 * already replaced). Only unswapped dead providers are here.
 */
export async function getDeadProviders(): Promise<Set<string>> {
  const allProviders = getAllProviders();
  const dead = new Set<string>();

  for (const p of allProviders) {
    const alive = await getHealth(p.name);
    if (alive === false) {
      dead.add(p.name);
    }
  }

  return dead;
}

/**
 * Check health of all providers (for admin/debug endpoint).
 * Not called automatically — too expensive for regular traffic.
 */
export async function checkAllProviders(): Promise<Record<string, boolean>> {
  const allProviders = getAllProviders();
  const replacements = getReplacementPool();
  const all = [...allProviders, ...replacements];
  const results: Record<string, boolean> = {};

  await Promise.all(
    all.map(async (p) => {
      const url = p.getMovieUrl ? p.getMovieUrl(550) : '';
      if (!url) return;
      const alive = await pingProvider(url);
      results[p.name] = alive;
      await setHealth(p.name, alive);
    })
  );

  return results;
}

/**
 * Get full pool status for admin/debug.
 */
export async function getFullStatus() {
  const dead = await getDeadProviders();
  const pool = getPoolStatus();
  const healthResults: Record<string, boolean | null> = {};

  for (const p of getAllProviders()) {
    healthResults[p.name] = await getHealth(p.name);
  }

  return { dead: Array.from(dead), pool, health: healthResults };
}
