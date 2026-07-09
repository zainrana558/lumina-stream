/**
 * Embed provider health checker with replacement pool integration
 *
 * Pings each provider periodically and caches alive/dead status IN-MEMORY.
 * When a provider is detected as dead:
 *   1. It gets swapped with a replacement from the stash
 *   2. The replacement takes its place in the active lineup
 *   3. When the original recovers, it swaps back in
 *
 * Frame-blocking detection:
 *   Checks both X-Frame-Options AND CSP frame-ancestors headers.
 *   Providers that block framing are treated as dead for selection purposes,
 *   since they can't be embedded in iframes.
 *
 * - Health TTL: 5 minutes (in-memory, per-serverless-instance)
 * - Ping timeout: 6 seconds
 * - Economy: checks 1 provider per request (round-robin)
 * - Zero Redis commands — all state is in-memory
 *
 * v2 CHANGES (2026-07-06):
 *   - Added triggerBatchHealthCheck(): checks multiple providers in parallel
 *   - Added startup burst: on first request, quickly probe top providers
 *   - Reduced CHECK_INTERVAL to 2 min for faster convergence
 *   - Probe uses redirect:'follow' (not 'manual') to get real embed page
 *   - Batch size: 3 providers per 30s window for fast full-rotation
 */

import { getAllProviders, getReplacementPool, swapInReplacement, restoreOriginal, getPoolStatus } from '@/lib/streaming/providers';

const HEALTH_TTL = 5 * 60 * 1000; // 5 minutes in ms
const CHECK_TIMEOUT = 3000; // 3 seconds — fast enough for embed selection, catches dead providers
const CHECK_INTERVAL = 2 * 60 * 1000; // Check one provider every 2 min (was 5 min)
const BATCH_INTERVAL = 30 * 1000; // Batch check every 30s (up to 3 providers)
const BATCH_SIZE = 3; // How many providers to check per batch
const BURST_SIZE = 5; // How many to check on cold start

// ── In-memory state (no Redis) ──
interface HealthEntry {
  alive: boolean;
  framesBlocked: boolean;
  checkedAt: number;
}

const healthStore = new Map<string, HealthEntry>();
const prevHealthStore = new Map<string, boolean>();
const failCountStore = new Map<string, number>();
let lastCheckTime = 0;
let lastBatchCheckTime = 0;
let startupBurstDone = false;

// Time-based offset so different serverless instances check different providers
function getNextCheckIndex(total: number, offset: number = 0): number {
  const now = Date.now();
  const slot = Math.floor(now / CHECK_INTERVAL) + offset;
  return slot % total;
}

// Well-known TMDB IDs for health check pings (rotated to avoid single-point dependency)
const HEALTH_CHECK_MOVIE_IDS = [550, 12, 155]; // Fight Club, The Dark Knight, The Lord of the Rings

function getHealthCheckMovieId(): number {
  const idx = Math.floor(Date.now() / (5 * 60 * 1000)) % HEALTH_CHECK_MOVIE_IDS.length; // Rotate every 5 min
  return HEALTH_CHECK_MOVIE_IDS[idx];
}
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
 * Check if a single provider is reachable AND allows iframe embedding.
 * Uses GET with redirect:'follow' (NOT manual) because:
 *   - Many embed providers return 302/301 to the actual embed page
 *   - With redirect:'manual', we'd see a 3xx opaque response and falsely mark it dead
 *   - Following redirects lets us reach the real embed page and check its headers
 */
async function pingProvider(url: string): Promise<{ alive: boolean; latencyMs: number; framesBlocked: boolean }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT);
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow', // Follow redirects to reach the actual embed page
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    // A 2xx/3xx that ultimately resolved means the server is reachable
    // 4xx/5xx after following redirects means the embed failed
    const isReachable = res.status >= 200 && res.status < 400;

    // Check X-Frame-Options header
    const xfo = res.headers.get('x-frame-options') || res.headers.get('X-Frame-Options') || '';
    const xfoBlocked = xfo.includes('DENY') || xfo.includes('SAMEORIGIN');

    // Check CSP frame-ancestors directive
    const csp = res.headers.get('content-security-policy') || '';
    const faMatch = csp.match(/frame-ancestors\s+([^;]+)/i);
    const frameAncestors = faMatch ? faMatch[1].trim() : '';
    // Blocked if frame-ancestors is 'none' or doesn't include * or our origin
    const faBlocked = frameAncestors === "'none'" || (frameAncestors !== '' && !frameAncestors.includes('*'));

    const framesBlocked = xfoBlocked || faBlocked;

    return { alive: isReachable, latencyMs, framesBlocked };
  } catch {
    const latencyMs = Date.now() - start;
    return { alive: false, latencyMs, framesBlocked: false };
  }
}

function setHealth(name: string, alive: boolean, framesBlocked: boolean = false): void {
  healthStore.set(name, { alive, framesBlocked, checkedAt: Date.now() });
}

/**
 * Get whether a provider is effectively usable.
 * Returns false if the provider blocks iframe embedding (framesBlocked),
 * even if the server itself is reachable.
 */
export function getHealth(name: string): boolean | null {
  const entry = healthStore.get(name);
  if (entry && Date.now() - entry.checkedAt < HEALTH_TTL) {
    // A provider that blocks framing is effectively dead for our use case
    return entry.alive && !entry.framesBlocked;
  }
  return null;
}

/**
 * Check if a provider blocks iframe embedding via X-Frame-Options or
 * CSP frame-ancestors. For admin/debug display.
 */
export function isFramesBlocked(name: string): boolean {
  const entry = healthStore.get(name);
  if (entry && Date.now() - entry.checkedAt < HEALTH_TTL) {
    return entry.framesBlocked;
  }
  return false;
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
 * Process health check result for a single provider — handles swap logic.
 */
async function processHealthResult(
  provider: { name: string; useProxy?: boolean; getMovieUrl: (id: number) => string },
  alive: boolean,
  latencyMs: number,
  framesBlocked: boolean,
): Promise<void> {
  const prevAlive = getPrevHealth(provider.name);

  // Providers with useProxy bypass X-Frame-Options via server-side proxy,
  // so frame-blocking is irrelevant — treat as not blocked.
  const effectiveFramesBlocked = provider.useProxy ? false : framesBlocked;

  // Effective alive = reachable AND doesn't block framing (unless proxied)
  const effectiveAlive = alive && !effectiveFramesBlocked;

  // Feed latency to Provider Intelligence speed cache
  try {
    const { updateSpeedCache, updateHistoricalCache } = await import('@/lib/streaming/provider-intelligence');
    updateSpeedCache(provider.name, latencyMs);
    updateHistoricalCache(provider.name, effectiveAlive);
  } catch { /* non-critical */ }

  // Save current health
  setHealth(provider.name, alive, effectiveFramesBlocked);
  setPrevHealth(provider.name, effectiveAlive);

  // Provider just died? (was alive, now dead or frame-blocked)
  if (prevAlive !== null && prevAlive && !effectiveAlive) {
    incrementFailCount(provider.name);
    const failCount = getFailCount(provider.name);

    // After 2 consecutive failures, swap in a replacement
    if (failCount >= 2) {
      const replacement = swapInReplacement(provider.name);
      if (replacement) {
        // Also pre-health-check the replacement
        const { alive: repAlive, framesBlocked: repBlocked } = await pingProvider(replacement.getMovieUrl(getHealthCheckMovieId()));
        const repEffectiveBlocked = replacement.useProxy ? false : repBlocked;
        setHealth(replacement.name, repAlive, repEffectiveBlocked);
      }
    }
  }

  // Provider just recovered? (was dead, now alive and not frame-blocked)
  if (prevAlive !== null && !prevAlive && effectiveAlive) {
    resetFailCount(provider.name);
    restoreOriginal(provider.name);
  }
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

  // Time-based rotation: spreads checks across serverless instances
  const idx = getNextCheckIndex(allProviders.length);
  const provider = allProviders[idx];
  lastCheckTime = now;

  const sampleUrl = provider.getMovieUrl(getHealthCheckMovieId()); // Well-known movie for health ping
  const { alive, latencyMs, framesBlocked } = await pingProvider(sampleUrl);

  await processHealthResult(provider, alive, latencyMs, framesBlocked);
}

/**
 * NEW: Trigger a batch health check — probes multiple providers in parallel.
 * Called on every /api/embed request (non-blocking, rate-limited to every 30s).
 * This ensures health data converges FAST instead of taking 75+ minutes.
 *
 * With ~15 providers and batch_size=3 every 30s:
 *   - Full rotation in ~2.5 minutes (vs 75+ minutes before)
 *   - All providers checked within HEALTH_TTL (5 min)
 */
export async function triggerBatchHealthCheck(): Promise<void> {
  const now = Date.now();
  if (now - lastBatchCheckTime < BATCH_INTERVAL) return;

  const allProviders = getAllProviders();
  if (allProviders.length === 0) return;

  lastBatchCheckTime = now;

  // Pick providers that haven't been checked recently (or at all)
  const unchecked = allProviders.filter(p => {
    const entry = healthStore.get(p.name);
    return !entry || (now - entry.checkedAt > HEALTH_TTL);
  });

  if (unchecked.length === 0) return; // All checked recently

  // Sort: prioritize unchecked (no entry at all), then stale
  unchecked.sort((a, b) => {
    const aEntry = healthStore.get(a.name);
    const bEntry = healthStore.get(b.name);
    const aAge = aEntry ? (now - aEntry.checkedAt) : Infinity;
    const bAge = bEntry ? (now - bEntry.checkedAt) : Infinity;
    return bAge - aAge; // Most stale first
  });

  // Check up to BATCH_SIZE providers in parallel
  const batch = unchecked.slice(0, BATCH_SIZE);

  await Promise.all(
    batch.map(async (provider) => {
      const sampleUrl = provider.getMovieUrl(getHealthCheckMovieId());
      const { alive, latencyMs, framesBlocked } = await pingProvider(sampleUrl);
      await processHealthResult(provider, alive, latencyMs, framesBlocked);
    })
  );
}

/**
 * NEW: Startup burst — on first request after cold start, quickly probe
 * the top providers so the intelligence system has real data immediately.
 * Without this, every serverless cold start means all providers are "unknown"
 * (50% score) and the intelligence layer can't distinguish good from bad.
 */
export async function startupBurstCheck(): Promise<void> {
  if (startupBurstDone) return;
  startupBurstDone = true;

  const allProviders = getAllProviders();
  if (allProviders.length === 0) return;

  // Check top-tier providers first (they appear first in the array)
  const topProviders = allProviders
    .filter(p => p.tier === 1)
    .slice(0, BURST_SIZE);

  if (topProviders.length === 0) return;

  // Probe all in parallel (fire-and-forget, non-blocking)
  Promise.all(
    topProviders.map(async (provider) => {
      const sampleUrl = provider.getMovieUrl(getHealthCheckMovieId());
      const { alive, latencyMs, framesBlocked } = await pingProvider(sampleUrl);
      await processHealthResult(provider, alive, latencyMs, framesBlocked);
    })
  ).catch(() => {}); // Non-blocking
}

/**
 * Get names of providers that are currently marked as dead
 * (unreachable OR blocking iframe embedding).
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
      const sampleUrl = p.getMovieUrl ? p.getMovieUrl(getHealthCheckMovieId()) : '';
      if (!sampleUrl) return;
      const { alive, latencyMs, framesBlocked } = await pingProvider(sampleUrl);
      const effectiveFramesBlocked = p.useProxy ? false : framesBlocked;
      const effectiveAlive = alive && !effectiveFramesBlocked;
      results[p.name] = effectiveAlive;
      setHealth(p.name, alive, effectiveFramesBlocked);
      // Feed speed cache
      try {
        const { updateSpeedCache, updateHistoricalCache } = await import('@/lib/streaming/provider-intelligence');
        updateSpeedCache(p.name, latencyMs);
        updateHistoricalCache(p.name, effectiveAlive);
      } catch { /* non-critical */ }
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

// ---- Types for admin dashboard ----

export interface HealthRecord {
  status: 'alive' | 'dead' | 'unknown';
  latencyMs: number;
  failCount: number;
  consecutiveSuccesses: number;
  lastCheck: number;
  lastError: string | null;
  clientReported: boolean;
}

/**
 * Get all health records as a Map for the admin dashboard.
 */
export function getAllHealthRecords(): Map<string, HealthRecord> {
  const records = new Map<string, HealthRecord>();

  for (const [name, entry] of healthStore) {
    const failCount = failCountStore.get(name) || 0;
    records.set(name, {
      status: entry.alive && !entry.framesBlocked ? 'alive' : 'dead',
      latencyMs: 0,
      failCount,
      consecutiveSuccesses: entry.alive && !entry.framesBlocked ? Math.max(0, 3 - failCount) : 0,
      lastCheck: entry.checkedAt,
      lastError: !entry.alive ? 'Connection failed' : entry.framesBlocked ? 'Blocks iframe (X-Frame-Options or CSP frame-ancestors)' : null,
      clientReported: false,
    });
  }

  return records;
}

/**
 * Report client-side health check result.
 * Used by /api/embed-health-client to feed browser ping results
 * into the unified health system.
 */
export async function reportClientHealth(
  provider: string,
  alive: boolean,
): Promise<{ status: string; failCount: number }> {
  const now = Date.now();

  if (alive) {
    // Check wasDead BEFORE updating health (ordering bug fix)
    const wasDead = getPrevHealth(provider) === false;
    setHealth(provider, true);
    setPrevHealth(provider, true);
    const prevFailCount = getFailCount(provider);
    if (prevFailCount > 0) {
      resetFailCount(provider);
    }

    if (wasDead) {
      restoreOriginal(provider);
    }

    return { status: 'alive', failCount: 0 };
  } else {
    setHealth(provider, false);
    setPrevHealth(provider, false);
    incrementFailCount(provider);
    const failCount = getFailCount(provider);

    // Swap after 2+ failures
    if (failCount >= 2) {
      swapInReplacement(provider);
    }

    return { status: 'dead', failCount };
  }
}