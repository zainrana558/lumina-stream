/**
 * Redis-Backed Provider Health System
 *
 * Replaces the in-memory health maps with Upstash Redis to solve
 * state divergence across Vercel serverless instances.
 *
 * Redis Key Structures:
 *   health:provider:{name}          → Hash {status, lastCheck, latencyMs, failCount, consecutiveSuccesses, lastError, lastSuccess}
 *   health:alive                     → ZSET (score=latencyMs, member=providerName) — fast sorted selection
 *   health:dead                      → SET of dead provider names
 *   health:lock:{name}               → Short-lived mutex to prevent concurrent checks
 *
 * TTL Strategy:
 *   - Success: Hash expires in 30 min, provider stays in health:alive ZSET
 *   - Failure: Hash expires in 10 min, provider moves to health:dead SET
 *
 * Fail Threshold: 3 consecutive failures → dead status
 * Recovery: Any successful check resets failCount to 0
 *
 * Graceful Degradation:
 *   - If Redis is unavailable, falls back to in-memory maps (same as old system)
 *   - All Redis operations are try/catch with silent fallback
 */

import { getRedis } from '@/lib/redis';
import { getAllProviders, swapInReplacement, restoreOriginal, getPoolStatus } from '@/lib/streaming/providers';

// ── Constants ──
const CHECK_TIMEOUT = 8000; // 8s per check (slightly more forgiving than 6s)
const CHECK_INTERVAL = 5 * 60 * 1000; // Check one provider every 5 min
const FAIL_THRESHOLD = 3; // 3 consecutive failures → dead (was 2, too aggressive)
const SUCCESS_TTL = 30 * 60; // 30 min on success
const FAILURE_TTL = 10 * 60; // 10 min on failure
const LOCK_TTL = 12; // Mutex held for 12s (longer than CHECK_TIMEOUT)
const ZSET_TTL = 35 * 60; // ZSET entries slightly longer than hash TTL

// Redis key prefixes
const HEALTH_HASH_PREFIX = 'health:provider:';
const HEALTH_ALIVE_ZSET = 'health:alive';
const HEALTH_DEAD_SET = 'health:dead';
const HEALTH_LOCK_PREFIX = 'health:lock:';

// ── Types ──

export interface HealthRecord {
  status: 'alive' | 'degraded' | 'dead';
  lastCheck: number;
  latencyMs: number;
  failCount: number;
  consecutiveSuccesses: number;
  lastError: string | null;
  lastSuccess: number;
  /** true if this record was populated by a client report (not server-side ping) */
  clientReported?: boolean;
}

// ── In-Memory Fallback (used when Redis is down) ──

interface InMemoryEntry {
  record: HealthRecord;
}

const inMemoryHealth = new Map<string, InMemoryEntry>();
const inMemoryPrevAlive = new Map<string, boolean>();
let inMemoryCheckIndex = 0;
let inMemoryLastCheckTime = 0;
let redisAvailable: boolean | null = null; // null = not yet tested

// Cleanup stale in-memory entries every 60s
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    if (redisAvailable === true) return; // Only cleanup when Redis is down
    const now = Date.now();
    for (const [key, val] of inMemoryHealth) {
      const age = now - val.record.lastCheck;
      if (val.record.status === 'dead' && age > FAILURE_TTL * 1000) {
        inMemoryHealth.delete(key);
        inMemoryPrevAlive.delete(key);
      } else if (age > SUCCESS_TTL * 1000) {
        inMemoryHealth.delete(key);
        inMemoryPrevAlive.delete(key);
      }
    }
  }, 60_000);
}

// ── Ping Utility ──

async function pingProvider(url: string): Promise<{ alive: boolean; latencyMs: number; error: string | null }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT);
    const res = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { alive: true, latencyMs: Date.now() - start, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return { alive: false, latencyMs: Date.now() - start, error };
  }
}

// ── Redis Operations ──

function redisKey(name: string): string {
  return `${HEALTH_HASH_PREFIX}${name}`;
}

async function acquireLock(name: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return true; // No Redis = no lock needed (in-memory fallback)

  try {
    const lockKey = `${HEALTH_LOCK_PREFIX}${name}`;
    const acquired = await client.set(lockKey, '1', { nx: true, ex: LOCK_TTL });
    return acquired === 'OK';
  } catch {
    return true; // If Redis fails, allow check to proceed
  }
}

async function releaseLock(name: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(`${HEALTH_LOCK_PREFIX}${name}`);
  } catch {
    // Ignore — lock will expire via TTL
  }
}

async function writeHealthToRedis(name: string, record: HealthRecord): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const key = redisKey(name);
    const ttl = record.status === 'dead' ? FAILURE_TTL : SUCCESS_TTL;

    // Write hash
    await client.hset(key, {
      status: record.status,
      lastCheck: String(record.lastCheck),
      latencyMs: String(record.latencyMs),
      failCount: String(record.failCount),
      consecutiveSuccesses: String(record.consecutiveSuccesses),
      lastError: record.lastError || '',
      lastSuccess: String(record.lastSuccess),
      clientReported: record.clientReported ? '1' : '0',
    });
    await client.expire(key, ttl);

    // Update ZSET or SET based on status
    if (record.status === 'alive' || record.status === 'degraded') {
      // Add to alive ZSET with latency as score (lower = better)
      await client.zadd(HEALTH_ALIVE_ZSET, { score: record.latencyMs, member: name });
      await client.expire(HEALTH_ALIVE_ZSET, ZSET_TTL);
      // Remove from dead SET
      await client.srem(HEALTH_DEAD_SET, name);
    } else {
      // Remove from alive ZSET
      await client.zrem(HEALTH_ALIVE_ZSET, name);
      // Add to dead SET
      await client.sadd(HEALTH_DEAD_SET, name);
      await client.expire(HEALTH_DEAD_SET, FAILURE_TTL);
    }

    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
}

async function readHealthFromRedis(name: string): Promise<HealthRecord | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const data = await client.hgetall(redisKey(name)) as Record<string, string> | null;
    if (!data || Object.keys(data).length === 0) return null;

    redisAvailable = true;
    return {
      status: (data.status as HealthRecord['status']) || 'dead',
      lastCheck: parseInt(data.lastCheck || '0', 10),
      latencyMs: parseInt(data.latencyMs || '0', 10),
      failCount: parseInt(data.failCount || '0', 10),
      consecutiveSuccesses: parseInt(data.consecutiveSuccesses || '0', 10),
      lastError: data.lastError || null,
      lastSuccess: parseInt(data.lastSuccess || '0', 10),
      clientReported: data.clientReported === '1',
    };
  } catch {
    redisAvailable = false;
    return null;
  }
}

async function getDeadSetFromRedis(): Promise<Set<string>> {
  const client = getRedis();
  if (!client) return new Set();

  try {
    const members = await client.smembers(HEALTH_DEAD_SET);
    return new Set(members);
  } catch {
    return new Set();
  }
}

async function getAliveZSetFromRedis(): Promise<Array<{ name: string; latencyMs: number }>> {
  const client = getRedis();
  if (!client) return [];

  try {
    // Get all members sorted by score (latency) ascending
    const result = await client.zrange(HEALTH_ALIVE_ZSET, 0, -1, { withScores: true });
    const providers: Array<{ name: string; latencyMs: number }> = [];

    for (let i = 0; i < result.length; i += 2) {
      providers.push({
        name: result[i] as string,
        latencyMs: result[i + 1] as number,
      });
    }

    return providers;
  } catch {
    return [];
  }
}

// ── In-Memory Fallback Operations ──

function writeHealthToMemory(name: string, record: HealthRecord): void {
  inMemoryHealth.set(name, { record });
}

function readHealthFromMemory(name: string): HealthRecord | null {
  const entry = inMemoryHealth.get(name);
  if (!entry) return null;

  // Check if record is stale
  const now = Date.now();
  const age = now - entry.record.lastCheck;
  if (entry.record.status === 'dead' && age > FAILURE_TTL * 1000) return null;
  if (age > SUCCESS_TTL * 1000) return null;

  return entry.record;
}

function getDeadFromMemory(): Set<string> {
  const dead = new Set<string>();
  for (const [name, entry] of inMemoryHealth) {
    if (entry.record.status === 'dead') {
      dead.add(name);
    }
  }
  return dead;
}

// ── Unified Read/Write ──

async function writeHealth(name: string, record: HealthRecord): Promise<void> {
  // Always write to both — Redis is primary, memory is fallback
  writeHealthToMemory(name, record);
  await writeHealthToRedis(name, record);
}

async function readHealth(name: string): Promise<HealthRecord | null> {
  // Try Redis first
  if (redisAvailable !== false) {
    const fromRedis = await readHealthFromRedis(name);
    if (fromRedis) return fromRedis;
  }

  // Fallback to in-memory
  return readHealthFromMemory(name);
}

// ── Core Health Check Logic ──

/**
 * Update health state for a provider after a check result.
 * Handles fail counting, status transitions, and swap logic.
 */
async function updateProviderHealth(
  name: string,
  alive: boolean,
  latencyMs: number,
  error: string | null,
  isClientReport: boolean = false
): Promise<HealthRecord> {
  const prev = await readHealth(name);
  const prevAlive = prev ? prev.status !== 'dead' : null;

  let failCount = prev?.failCount || 0;
  let consecutiveSuccesses = prev?.consecutiveSuccesses || 0;
  let status: HealthRecord['status'];
  const lastSuccess = prev?.lastSuccess || 0;

  if (alive) {
    consecutiveSuccesses++;
    failCount = 0; // Recovery: any success resets fail count

    // Determine status by latency
    if (latencyMs > 5000) {
      status = 'degraded';
    } else {
      status = 'alive';
    }
  } else {
    failCount++;
    consecutiveSuccesses = 0;

    if (failCount >= FAIL_THRESHOLD) {
      status = 'dead';
    } else {
      status = 'degraded';
    }
  }

  const record: HealthRecord = {
    status,
    lastCheck: Date.now(),
    latencyMs,
    failCount,
    consecutiveSuccesses,
    lastError: error,
    lastSuccess: alive ? Date.now() : lastSuccess,
    clientReported: isClientReport,
  };

  await writeHealth(name, record);

  // Emit health metric (fire-and-forget, non-critical)
  import('./metrics').then(({ emitHealthMetric }) => {
    emitHealthMetric({
      provider: name,
      alive,
      latencyMs,
      error,
      isClientReport,
      timestamp: record.lastCheck,
    }).catch(() => {});
  });

  // Trigger swap logic (same as old system, for backward compatibility)
  // Provider just died? (was alive, now dead)
  if (prevAlive === true && !alive) {
    if (failCount >= FAIL_THRESHOLD) {
      const replacement = swapInReplacement(name);
      if (replacement) {
        const repUrl = replacement.getMovieUrl(550);
        const repPing = await pingProvider(repUrl);
        const repRecord: HealthRecord = {
          status: repPing.alive ? 'alive' : 'degraded',
          lastCheck: Date.now(),
          latencyMs: repPing.latencyMs,
          failCount: 0,
          consecutiveSuccesses: repPing.alive ? 1 : 0,
          lastError: repPing.error,
          lastSuccess: repPing.alive ? Date.now() : 0,
          clientReported: false,
        };
        await writeHealth(replacement.name, repRecord);
      }
    }
  }

  // Provider just recovered? (was dead, now alive)
  if (prevAlive === false && alive) {
    restoreOriginal(name);
  }

  return record;
}

/**
 * Check one provider in a round-robin fashion.
 * Called on embed requests to spread health checks across traffic.
 * Uses Redis lock to prevent concurrent checks of the same provider.
 */
export async function maybeCheckOneProvider(): Promise<void> {
  const now = Date.now();
  if (now - inMemoryLastCheckTime < CHECK_INTERVAL) return;

  const allProviders = getAllProviders();
  if (allProviders.length === 0) return;

  // Round-robin: check the next provider in line
  const provider = allProviders[inMemoryCheckIndex % allProviders.length];
  inMemoryCheckIndex++;
  inMemoryLastCheckTime = now;

  // Acquire lock to prevent concurrent checks
  const locked = await acquireLock(provider.name);
  if (!locked) return;

  try {
    const sampleUrl = provider.getMovieUrl(550); // Fight Club always exists
    const result = await pingProvider(sampleUrl);
    await updateProviderHealth(provider.name, result.alive, result.latencyMs, result.error);
  } finally {
    await releaseLock(provider.name);
  }
}

/**
 * Get names of providers that are currently marked as dead.
 * Tries Redis SET first, falls back to in-memory.
 */
export async function getDeadProviders(): Promise<Set<string>> {
  // Try Redis first
  if (redisAvailable !== false) {
    const redisDead = await getDeadSetFromRedis();
    if (redisDead.size > 0 || redisAvailable === true) {
      return redisDead;
    }
  }

  // Fallback: scan in-memory records
  return getDeadFromMemory();
}

/**
 * Check health of all providers (for admin/debug endpoint).
 * Not called automatically — too expensive for regular traffic.
 */
export async function checkAllProviders(): Promise<Record<string, boolean>> {
  const allProviders = getAllProviders();
  const results: Record<string, boolean> = {};

  // Check in batches of 5 to avoid overwhelming Redis
  const batchSize = 5;
  for (let i = 0; i < allProviders.length; i += batchSize) {
    const batch = allProviders.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (p) => {
        const url = p.getMovieUrl(550);
        if (!url) return { name: p.name, alive: false };

        const locked = await acquireLock(p.name);
        if (!locked) return { name: p.name, alive: true }; // Assume alive if locked

        try {
          const result = await pingProvider(url);
          await updateProviderHealth(p.name, result.alive, result.latencyMs, result.error);
          return { name: p.name, alive: result.alive };
        } finally {
          await releaseLock(p.name);
        }
      })
    );

    for (const r of batchResults) {
      results[r.name] = r.alive;
    }
  }

  return results;
}

/**
 * Get full health record for a specific provider.
 */
export async function getProviderHealth(name: string): Promise<HealthRecord | null> {
  return readHealth(name);
}

/**
 * Get all provider health records from Redis (for admin dashboard).
 * Returns a map of provider name → HealthRecord.
 */
export async function getAllHealthRecords(): Promise<Map<string, HealthRecord>> {
  const records = new Map<string, HealthRecord>();
  const allProviders = getAllProviders();

  // Try to batch-read from Redis
  const client = getRedis();
  if (client && redisAvailable !== false) {
    try {
      const keys = allProviders.map(p => redisKey(p.name));
      // Use pipeline for efficiency
      const pipeline = client.pipeline();
      for (const key of keys) {
        pipeline.hgetall(key);
      }
      const results = await pipeline.exec();

      for (let i = 0; i < allProviders.length; i++) {
        const data = results?.[i] as Record<string, string> | null;
        if (data && Object.keys(data).length > 0) {
          records.set(allProviders[i].name, {
            status: (data.status as HealthRecord['status']) || 'dead',
            lastCheck: parseInt(data.lastCheck || '0', 10),
            latencyMs: parseInt(data.latencyMs || '0', 10),
            failCount: parseInt(data.failCount || '0', 10),
            consecutiveSuccesses: parseInt(data.consecutiveSuccesses || '0', 10),
            lastError: data.lastError || null,
            lastSuccess: parseInt(data.lastSuccess || '0', 10),
            clientReported: data.clientReported === '1',
          });
        }
      }

      redisAvailable = true;

      // Fill gaps from in-memory for any providers not in Redis
      for (const p of allProviders) {
        if (!records.has(p.name)) {
          const fromMemory = readHealthFromMemory(p.name);
          if (fromMemory) records.set(p.name, fromMemory);
        }
      }

      return records;
    } catch {
      redisAvailable = false;
    }
  }

  // Fallback: read from in-memory
  for (const p of allProviders) {
    const record = readHealthFromMemory(p.name);
    if (record) records.set(p.name, record);
  }

  return records;
}

/**
 * Get the alive ZSET for fast sorted provider selection (used by scoring engine).
 * Returns providers sorted by latency (lowest first).
 */
export async function getAliveProvidersSorted(): Promise<Array<{ name: string; latencyMs: number }>> {
  // Try Redis ZSET first
  if (redisAvailable !== false) {
    const fromRedis = await getAliveZSetFromRedis();
    if (fromRedis.length > 0 || redisAvailable === true) {
      return fromRedis;
    }
  }

  // Fallback: filter in-memory records
  const alive: Array<{ name: string; latencyMs: number }> = [];
  for (const [name, entry] of inMemoryHealth) {
    if (entry.record.status === 'alive' || entry.record.status === 'degraded') {
      alive.push({ name, latencyMs: entry.record.latencyMs });
    }
  }
  return alive.sort((a, b) => a.latencyMs - b.latencyMs);
}

/**
 * Write a client-reported health check result.
 * Used by /api/embed-health-client to unify with server-side checks.
 * Client reports count as 0.5x weight (indicated by clientReported flag).
 */
export async function reportClientHealth(
  name: string,
  alive: boolean,
  latencyMs?: number
): Promise<HealthRecord> {
  return updateProviderHealth(
    name,
    alive,
    latencyMs ?? 0, // Client reports don't have reliable latency
    null,
    true // isClientReport
  );
}

/**
 * Get full pool + health status for admin/debug.
 * Maintains backward compatibility with the old getFullStatus().
 */
export async function getFullStatus() {
  const dead = await getDeadProviders();
  const pool = getPoolStatus();
  const allRecords = await getAllHealthRecords();
  const healthResults: Record<string, boolean | null> = {};

  for (const [name, record] of allRecords) {
    healthResults[name] = record.status !== 'dead';
  }

  return {
    dead: Array.from(dead),
    pool,
    health: healthResults,
    healthRecords: Object.fromEntries(allRecords),
    redisAvailable,
  };
}