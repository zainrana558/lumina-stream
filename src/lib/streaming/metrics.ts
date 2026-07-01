/**
 * Health Metrics Collector
 *
 * Every provider selection and health check emits metrics to Redis.
 * Designed for the monitoring dashboard (Task 4B) and future alerting.
 *
 * Metrics keys:
 *   metric:selection:{providerName}    → Hash {count, totalLatency, totalScore}
 *   metric:health:{providerName}      → Hash {checks, passes, fails, lastFailAt}
 *   metric:failover:{providerName}    → Counter (INCR)
 *   metric:rollup:{hour}              → Hash of aggregated hourly stats
 *
 * Retention:
 *   Raw metrics: 24h (TTL)
 *   Hourly rollups: 7 days (TTL)
 *   Daily rollups: 30 days (TTL)
 *
 * Aggregation: Cron job (5min) rolls up raw into hourly/daily.
 * This file is designed to be called fire-and-forget — all writes are non-blocking.
 */

import { getRedis } from '@/lib/redis';

// ── Types ──

export interface SelectionMetric {
  provider: string;
  latencyMs: number;
  score: number;
  fallbackUsed: boolean;
  selectionPath: string;
  timestamp: number;
}

export interface HealthMetric {
  provider: string;
  alive: boolean;
  latencyMs: number;
  error: string | null;
  isClientReport: boolean;
  timestamp: number;
}

export interface HourlyRollup {
  hour: string; // ISO format: '2026-06-29T12:00:00Z'
  selections: Record<string, { count: number; avgLatency: number; avgScore: number }>;
  healthChecks: Record<string, { total: number; passes: number; fails: number }>;
  failovers: Record<string, number>;
}

// ── Emitters ──

/**
 * Record a provider selection event.
 * Called by /api/embed after selectProvider() returns.
 */
export async function emitSelectionMetric(metric: SelectionMetric): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const key = `metric:selection:${metric.provider}`;

    // Use pipeline for atomic multi-field update
    await Promise.all([
      // Increment selection count
      client.hincrby(key, 'count', 1),
      // Add to total latency
      client.hincrbyfloat(key, 'totalLatency', metric.latencyMs),
      // Add to total score
      client.hincrbyfloat(key, 'totalScore', metric.score),
      // Track if fallback was used
      metric.fallbackUsed ? client.hincrby(key, 'fallbacks', 1) : Promise.resolve(),
      // Set TTL (24h)
      client.expire(key, 86400),
    ]);
  } catch {
    // Metrics are non-critical — never throw
  }
}

/**
 * Record a health check event.
 * Called by health-check.ts after every ping.
 */
export async function emitHealthMetric(metric: HealthMetric): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const key = `metric:health:${metric.provider}`;

    await Promise.all([
      // Increment total checks
      client.hincrby(key, 'checks', 1),
      // Increment pass or fail
      metric.alive
        ? client.hincrby(key, 'passes', 1)
        : client.hincrby(key, 'fails', 1),
      // Track last failure time
      !metric.alive
        ? client.hset(key, { lastFailAt: String(metric.timestamp) })
        : Promise.resolve(),
      // Track last check time
      client.hset(key, { lastCheckAt: String(metric.timestamp) }),
      // Track client vs server
      metric.isClientReport
        ? client.hincrby(key, 'clientReports', 1)
        : client.hincrby(key, 'serverChecks', 1),
      // Set TTL (24h)
      client.expire(key, 86400),
    ]);
  } catch {
    // Non-critical
  }
}

/**
 * Record a failover event.
 * Called when the player switches providers.
 */
export async function emitFailoverMetric(fromProvider: string, toProvider: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const key = `metric:failover`;
    const now = new Date().toISOString();

    // Append to a capped list (keep last 100 failovers)
    const entry = JSON.stringify({
      from: fromProvider,
      to: toProvider,
      timestamp: now,
    });

    await Promise.all([
      client.lpush(key, entry),
      client.ltrim(key, 0, 99), // Keep last 100
      client.expire(key, 86400), // 24h
    ]);
  } catch {
    // Non-critical
  }
}

// ── Aggregation ──

/**
 * Aggregate raw metrics into hourly rollups.
 * Called by the cron job (Task 4C) every 5 minutes.
 * Reads all metric:* keys, computes averages, writes rollup, resets raw.
 */
export async function aggregateMetrics(): Promise<HourlyRollup | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
    const rollupKey = `metric:rollup:${hourStart.toISOString()}`;

    // Scan selection metrics
    const selectionRollup: Record<string, { count: number; totalLatency: number; totalScore: number }> = {};
    let selectionCursor = 0;

    do {
      const [nextCursor, keys] = await client.scan(selectionCursor, {
        match: 'metric:selection:*',
        count: 50,
      });
      selectionCursor = Number(nextCursor);

      for (const key of keys) {
        const data = await client.hgetall(key) as Record<string, string> | null;
        if (!data || !data.count) continue;

        const providerName = key.replace('metric:selection:', '');
        const count = parseInt(data.count, 10) || 0;
        const totalLatency = parseFloat(data.totalLatency) || 0;
        const totalScore = parseFloat(data.totalScore) || 0;

        selectionRollup[providerName] = {
          count,
          totalLatency,
          totalScore,
        };
      }
    } while (selectionCursor > 0);

    // Scan health metrics
    const healthRollup: Record<string, { total: number; passes: number; fails: number }> = {};
    let healthCursor = 0;

    do {
      const [nextCursor, keys] = await client.scan(healthCursor, {
        match: 'metric:health:*',
        count: 50,
      });
      healthCursor = Number(nextCursor);

      for (const key of keys) {
        const data = await client.hgetall(key) as Record<string, string> | null;
        if (!data || !data.checks) continue;

        const providerName = key.replace('metric:health:', '');
        healthRollup[providerName] = {
          total: parseInt(data.checks, 10) || 0,
          passes: parseInt(data.passes, 10) || 0,
          fails: parseInt(data.fails, 10) || 0,
        };
      }
    } while (healthCursor > 0);

    // Get recent failovers
    let failoverList: string[] = [];
    try {
      failoverList = await client.lrange('metric:failover', 0, -1) as string[];
    } catch {
      // Ignore
    }

    const failoverRollup: Record<string, number> = {};
    for (const entry of failoverList) {
      try {
        const parsed = JSON.parse(entry);
        const toKey = parsed.to as string;
        failoverRollup[toKey] = (failoverRollup[toKey] || 0) + 1;
      } catch {
        // Skip malformed
      }
    }

    // Build and store rollup
    const rollup: HourlyRollup = {
      hour: hourStart.toISOString(),
      selections: Object.fromEntries(
        Object.entries(selectionRollup).map(([name, data]) => [
          name,
          {
            count: data.count,
            avgLatency: data.count > 0 ? Math.round(data.totalLatency / data.count) : 0,
            avgScore: data.count > 0 ? Math.round((data.totalScore / data.count) * 100) / 100 : 0,
          },
        ])
      ),
      healthChecks: healthRollup,
      failovers: failoverRollup,
    };

    // Store rollup with 7-day TTL
    await client.set(rollupKey, JSON.stringify(rollup), { ex: 7 * 86400 });

    return rollup;
  } catch {
    return null;
  }
}

// ── Readers ──

/**
 * Get current selection metrics for all providers.
 */
export async function getSelectionMetrics(): Promise<Record<string, {
  count: number;
  avgLatency: number;
  avgScore: number;
  fallbacks: number;
}>> {
  const client = getRedis();
  if (!client) return {};

  try {
    const result: Record<string, { count: number; avgLatency: number; avgScore: number; fallbacks: number }> = {};
    let cursor = 0;

    do {
      const [nextCursor, keys] = await client.scan(cursor, {
        match: 'metric:selection:*',
        count: 50,
      });
      cursor = Number(nextCursor);

      for (const key of keys) {
        const data = await client.hgetall(key) as Record<string, string> | null;
        if (!data || !data.count) continue;

        const providerName = key.replace('metric:selection:', '');
        const count = parseInt(data.count, 10) || 0;
        result[providerName] = {
          count,
          avgLatency: count > 0 ? Math.round((parseFloat(data.totalLatency) || 0) / count) : 0,
          avgScore: count > 0 ? Math.round(((parseFloat(data.totalScore) || 0) / count) * 100) / 100 : 0,
          fallbacks: parseInt(data.fallbacks, 10) || 0,
        };
      }
    } while (cursor > 0);

    return result;
  } catch {
    return {};
  }
}

/**
 * Get current health metrics for all providers.
 */
export async function getHealthMetrics(): Promise<Record<string, {
  checks: number;
  passes: number;
  fails: number;
  passRate: number;
  lastCheckAt: string | null;
  lastFailAt: string | null;
}>> {
  const client = getRedis();
  if (!client) return {};

  try {
    const result: Record<string, { checks: number; passes: number; fails: number; passRate: number; lastCheckAt: string | null; lastFailAt: string | null }> = {};
    let cursor = 0;

    do {
      const [nextCursor, keys] = await client.scan(cursor, {
        match: 'metric:health:*',
        count: 50,
      });
      cursor = Number(nextCursor);

      for (const key of keys) {
        const data = await client.hgetall(key) as Record<string, string> | null;
        if (!data || !data.checks) continue;

        const providerName = key.replace('metric:health:', '');
        const checks = parseInt(data.checks, 10) || 0;
        const passes = parseInt(data.passes, 10) || 0;
        const fails = parseInt(data.fails, 10) || 0;

        result[providerName] = {
          checks,
          passes,
          fails,
          passRate: checks > 0 ? Math.round((passes / checks) * 1000) / 10 : 0,
          lastCheckAt: data.lastCheckAt || null,
          lastFailAt: data.lastFailAt || null,
        };
      }
    } while (cursor > 0);

    return result;
  } catch {
    return {};
  }
}

/**
 * Get recent failover events.
 */
export async function getRecentFailovers(limit: number = 20): Promise<Array<{
  from: string;
  to: string;
  timestamp: string;
}>> {
  const client = getRedis();
  if (!client) return [];

  try {
    const entries = await client.lrange('metric:failover', 0, limit - 1) as string[];
    return entries.map(entry => {
      try {
        return JSON.parse(entry);
      } catch {
        return { from: 'unknown', to: 'unknown', timestamp: '' };
      }
    });
  } catch {
    return [];
  }
}

/**
 * Get hourly rollups for the last N hours.
 */
export async function getHourlyRollups(hours: number = 24): Promise<HourlyRollup[]> {
  const client = getRedis();
  if (!client) return [];

  try {
    const rollups: HourlyRollup[] = [];
    const now = new Date();

    for (let h = 0; h < hours; h++) {
      const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - h, 0, 0);
      const key = `metric:rollup:${hourStart.toISOString()}`;
      const data = await client.get<string>(key);

      if (data) {
        try {
          rollups.push(JSON.parse(data) as HourlyRollup);
        } catch {
          // Skip malformed
        }
      }
    }

    return rollups;
  } catch {
    return [];
  }
}