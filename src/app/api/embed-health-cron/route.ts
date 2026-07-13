import { NextResponse } from 'next/server';
import { checkAllProviders, getDeadProviders } from '@/lib/streaming/health-check';
import { emitHealthMetric, aggregateMetrics } from '@/lib/streaming/metrics';
import { getValidatedEnv } from '@/lib/env';
import { getRedis } from '@/lib/redis';
import { Semaphore } from '@/lib/utils/retry';
import { getAllProviders } from '@/lib/streaming/providers';

/**
 * GET /api/embed-health-cron
 *
 * Called by Vercel Cron. Staggered health checks by tier:
 *   Tier 1 — every 5 min (fastest check interval)
 *   Tier 2 — every 15 min
 *   Dead providers — probation check every 10 min
 *
 * Also checks core services (TMDB, AniList, Supabase, Redis).
 * Emits metrics after each check for dashboard consumption.
 * Max 5 concurrent checks via semaphore.
 *
 * Security: Bearer token auth (CRON_SECRET or CACHE_WARM_SECRET).
 */

interface ServiceCheck {
  name: string;
  alive: boolean;
  latency_ms: number;
  error?: string;
}

const CHECK_TIMEOUT = 8000; // 8s per check
const MAX_CONCURRENT = 5;
const semaphore = new Semaphore(MAX_CONCURRENT);

async function checkService(name: string, fn: () => Promise<void>): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    await fn();
    return { name, alive: true, latency_ms: Date.now() - start };
  } catch (err) {
    return {
      name,
      alive: false,
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function pingProviderForCron(url: string, name: string): Promise<{
  alive: boolean;
  latencyMs: number;
  error: string | null;
}> {
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

export async function GET(request: Request) {
  // Auth check
  const auth = request.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET || process.env.CACHE_WARM_SECRET;
  if (!expectedSecret || auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceResults: ServiceCheck[] = [];

  // ── 1. Core Services (always checked) ──

  // TMDB API — route through Cloudflare Worker to leverage edge cache
  const tmdbCheck = checkService('TMDB API', async () => {
    const env = getValidatedEnv();
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    const cacheUrl = process.env.API_CACHE_URL;
    let url: string;
    if (cacheUrl) {
      url = `${cacheUrl}/tmdb/genre/movie/list?language=en-US`;
      if (env.TMDB_BEARER_TOKEN) headers['X-TMDB-Auth'] = env.TMDB_BEARER_TOKEN;
      else if (env.TMDB_API_KEY) headers['X-TMDB-Key'] = env.TMDB_API_KEY;
    } else {
      if (env.TMDB_BEARER_TOKEN) {
        headers['Authorization'] = `Bearer ${env.TMDB_BEARER_TOKEN}`;
      } else {
        headers['Content-Type'] = 'application/json';
      }
      url = env.TMDB_BEARER_TOKEN
        ? 'https://api.themoviedb.org/3/genre/movie/list?language=en-US'
        : `https://api.themoviedb.org/3/genre/movie/list?api_key=${env.TMDB_API_KEY}&language=en-US`;
    }
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.genres) throw new Error('Invalid response');
  });

  // AniList GraphQL
  const anilistCheck = checkService('AniList', async () => {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ Page(perPage: 1) { media(sort: TRENDING_DESC) { id title { romaji } } } }',
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
  });

  // Supabase
  const supabaseCheck = checkService('Supabase', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) throw new Error('Not configured');
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok && res.status !== 200 && res.status !== 404) {
      throw new Error(`HTTP ${res.status}`);
    }
  });

  // Redis
  const redisCheck = checkService('Redis', async () => {
    const client = getRedis();
    if (!client) throw new Error('Not configured');
    const result = await client.ping();
    if (result !== 'PONG') throw new Error(`Unexpected response: ${result}`);
  });

  // Run core checks in parallel
  const [tmdb, anilist, supabase, redis] = await Promise.all([
    tmdbCheck, anilistCheck, supabaseCheck, redisCheck,
  ]);
  serviceResults.push(tmdb, anilist, supabase, redis);

  // ── 2. Staggered Provider Health Checks ──

  const allProviders = getAllProviders();
  const now = new Date();
  const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();

  // Determine which tiers to check this cycle
  const checkTier1 = minuteOfDay % 5 === 0;  // Every 5 min
  const checkTier2 = minuteOfDay % 15 === 0;  // Every 15 min
  const checkDead = minuteOfDay % 10 === 0;   // Every 10 min (probation)

  let embedResults: Record<string, { alive: boolean; latencyMs: number }> = {};

  // Filter providers to check based on tier schedule
  const providersToCheck = allProviders.filter(p => {
    if (p.tier === 1 && checkTier1) return true;
    if (p.tier === 2 && checkTier2) return true;
    return false;
  });

  // Check dead providers on probation schedule
  if (checkDead) {
    const deadProviders = await (await import('@/lib/streaming/health-check')).getDeadProviders();
    for (const p of allProviders) {
      if (deadProviders.has(p.name) && !providersToCheck.find(pc => pc.name === p.name)) {
        providersToCheck.push(p);
      }
    }
  }

  // Run provider checks with concurrency limit
  if (providersToCheck.length > 0) {
    const checkPromises = providersToCheck.map(async (p) => {
      return semaphore.withLock(async () => {
        const url = p.getMovieUrl(550);
        if (!url) return null;

        const result = await pingProviderForCron(url, p.name);

        // Emit health metric
        await emitHealthMetric({
          provider: p.name,
          alive: result.alive,
          latencyMs: result.latencyMs,
          error: result.error,
          isClientReport: false,
          timestamp: Date.now(),
        });

        return { name: p.name, ...result };
      });
    });

    const results = await Promise.all(checkPromises);
    for (const r of results) {
      if (r) {
        embedResults[r.name] = { alive: r.alive, latencyMs: r.latencyMs };
      }
    }
  }

  // Also use the batch checkAllProviders for the response (updates in-memory + Redis state)
  let batchResults: Record<string, boolean> = {};
  try {
    batchResults = await checkAllProviders();
  } catch { /* non-critical */ }

  // Merge batch results into embed results
  for (const [name, alive] of Object.entries(batchResults)) {
    if (!embedResults[name]) {
      embedResults[name] = { alive, latencyMs: 0 };
    }
  }

  // ── 3. Aggregate Metrics (if this is a 5-min boundary) ──

  if (minuteOfDay % 5 === 0) {
    aggregateMetrics().catch(() => {}); // Fire-and-forget
  }

  // ── 4. Summary ──

  const coreAlive = serviceResults.slice(0, 4).filter(s => s.alive).length;
  const embedChecks: ServiceCheck[] = Object.entries(embedResults).map(
    ([name, r]) => ({ name: `Embed: ${name}`, alive: r.alive, latency_ms: r.latencyMs })
  );
  serviceResults.push(...embedChecks);

  const embedAlive = embedChecks.filter(s => s.alive).length;
  const embedDead = embedChecks.filter(s => !s.alive);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    schedule: {
      tier1Checked: checkTier1,
      tier2Checked: checkTier2,
      deadChecked: checkDead,
      providersChecked: providersToCheck.length,
    },
    core: {
      total: 4,
      alive: coreAlive,
      dead: 4 - coreAlive,
      services: serviceResults.slice(0, 4),
    },
    embed: {
      total: embedChecks.length,
      alive: embedAlive,
      dead: embedDead.length,
      deadProviders: embedDead.map(s => s.name.replace('Embed: ', '')),
      providers: embedChecks.map(s => ({
        name: s.name.replace('Embed: ', ''),
        alive: s.alive,
        latency_ms: s.latency_ms,
      })),
    },
  });
}