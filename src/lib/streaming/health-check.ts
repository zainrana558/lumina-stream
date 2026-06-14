/**
 * Embed provider health checker with replacement pool integration
 *
 * Pings each provider periodically and caches alive/dead status IN-MEMORY.
 * When a provider is detected as dead:
 *   1. It gets swapped with a replacement from the stash
 *   2. The replacement takes its place in the active lineup
 *   3. When the original recovers, it swaps back in
 *
 * - Health TTL: 5 minutes (in-memory, per-serverless-instance)
 * - Ping timeout: 6 seconds
 * - Economy: checks 1 provider per request (round-robin)
 * - Zero Redis commands — all state is in-memory
 */

import { getAllProviders, getReplacementPool, swapInReplacement, restoreOriginal, getPoolStatus } from '@/lib/streaming/providers';

const HEALTH_TTL = 5 * 60 * 1000; // 5 minutes in ms
const CHECK_TIMEOUT = 6000; // 6 seconds
const CHECK_INTERVAL = 5 * 60 * 1000; // Check one provider every 5 min

// ── In-memory state (no Redis) ──
interface HealthEntry {
  alive: boolean;
  checkedAt: number;
}

const healthStore = new Map<string, HealthEntry>();
const prevHealthStore = new Map<string, boolean>();
const failCountStore = new Map<string, number>();
let lastCheckTime = 0;
let checkIndex = 0;

// Cleanup stale entries every 60s to prevent memory leak
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of healthStore) {
      if (now - val.checkedAt > HEALTH_TTL) {
        healthStore.delete(key);
        prevHealthStore.delete(key);
        failCountStore.delete(key);
      }
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

function setHealth(name: string, alive: boolean): void {
  healthStore.set(name, { alive, checkedAt: Date.now() });
}

function getHealth(name: string): boolean | null {
  const entry = healthStore.get(name);
  if (entry && Date.now() - entry.checkedAt < HEALTH_TTL) {
    return entry.alive;
  }
  return null;
}

function getPrevHealth(name: string): boolean | null {
  return prevHealthStore.get(name) ?? null;
}

function setPrevHealth(name: string, alive: boolean): void {
  prevHealthStore.set(name, alive);
}

function getFailCount(name: string): number {
  return failCountStore.get(name) || 0;
}

function incrementFailCount(name: string): void {
  failCountStore.set(name, getFailCount(name) + 1);
}

function resetFailCount(name: string): void {
  failCountStore.delete(name);
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
  const prevAlive = getPrevHealth(provider.name);
  const alive = await pingProvider(sampleUrl);

  // Save current health
  setHealth(provider.name, alive);
  setPrevHealth(provider.name, alive);

  // Provider just died? (was alive, now dead)
  if (prevAlive !== null && prevAlive && !alive) {
    incrementFailCount(provider.name);
    const failCount = getFailCount(provider.name);

    // After 2 consecutive failures, swap in a replacement
    if (failCount >= 2) {
      const replacement = swapInReplacement(provider.name);
      if (replacement) {
        // Also pre-health-check the replacement
        const repAlive = await pingProvider(replacement.getMovieUrl(550));
        setHealth(replacement.name, repAlive);
      }
    }
  }

  // Provider just recovered? (was dead, now alive)
  if (prevAlive !== null && !prevAlive && alive) {
    resetFailCount(provider.name);
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
    const alive = getHealth(p.name);
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
      setHealth(p.name, alive);
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
    healthResults[p.name] = getHealth(p.name);
  }

  return { dead: Array.from(dead), pool, health: healthResults };
}