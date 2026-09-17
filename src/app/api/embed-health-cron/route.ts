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
      // The worker rejects everything with 403 Unauthorized without this —
      // it's a separate abuse-prevention secret from the TMDB token itself.
      // tmdb/server.ts's real fetch path already sends it; this check was
      // never updated to match, so it always 403'd here despite the app's
      // real TMDB traffic working the entire time. Confirmed by reproducing
      // this exact request by hand: 403 without the header, 200 with it.
      const workerKey = process.env.WORKER_KEY;
      if (workerKey) headers['X-Worker-Key'] = workerKey;
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
    // PostgREST's bare /rest/v1/ root serves the OpenAPI schema, which
    // requires the service_role key — the anon key always gets 401 there
    // ("Only the `service_role` API key can be used for this endpoint"),
    // regardless of whether the project/key are actually fine. Query a real
    // table instead, same as every other authenticated request the app
    // makes — confirmed by hand: 401 on /rest/v1/, 200 on this.
    const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
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
  // This tier gate only controls the granular per-tier pingProviderForCron +
  // emitHealthMetric pass below — it is NOT the thing providing coverage.
  // checkAllProviders() a little further down runs unconditionally, every
  // single invocation, and already checks every active provider regardless
  // of what minuteOfDay comes out to. So even under Vercel's daily cron
  // (vercel.json currently has this route on `0 6 * * *`), every provider
  // still gets a real reachability + X-Frame-Options/CSP check once a day —
  // the tier math below just stops producing its own separate, more
  // granular metrics between invocations spaced further apart than 5-30
  // min, it doesn't leave anything unchecked. (Previously documented here
  // as "the staggered-tier design collapses" under infrequent invocation —
  // that overstated it; re-verified against the actual call order below.)
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

  // ── 2b. Real browser render-check — rotating batch ──
  // Everything above is a fetch(): reachable + no X-Frame-Options/CSP block.
  // That's necessary but not sufficient — several providers return 200 OK
  // with no blocking header and still refuse to play, because their own JS
  // only checks "am I inside a sandboxed iframe" once real browser code
  // runs, which a server-side fetch never triggers. This step actually
  // renders each provider the way a visitor would (real Chromium, the same
  // sandbox attribute IntelligentPlayer.tsx sets) and reads back the
  // result. Expensive relative to a fetch, so only a small rotating batch
  // runs per tick — full registry coverage over a few hours, not every 30
  // min. Only high-confidence verdicts ('alive' | 'dead') touch the health
  // store; 'unknown' (a blank frame with no rejection message — several
  // genuinely-working providers render almost no text) leaves the existing
  // signal untouched rather than guessing.
  let renderChecked: { name: string; verdict: string }[] = [];
  const { isRenderCheckAvailable } = await import('@/lib/streaming/render-check');
  const renderCheckAvailable = isRenderCheckAvailable();
  // Explicit and visible instead of silently trying, failing, and reporting
  // 'unknown' for every provider forever — see isRenderCheckAvailable()'s
  // own doc comment for why this can't work on Vercel today. Surfaced in
  // the response below so a Vercel deployment shows this in its cron logs
  // instead of a mysteriously permanently-stale render-check signal.
  const renderCheckSkipped = renderCheckAvailable
    ? null
    : 'Serverless environment (process.env.VERCEL set) — no serverless-Chromium build installed, skipping.';
  try {
    if (renderCheckAvailable) {
      const RENDER_BATCH_SIZE = 3;
      const RENDER_ROTATION_MINUTES = 30; // matches the actual cron cadence
      const slot = Math.floor(Date.now() / (RENDER_ROTATION_MINUTES * 60 * 1000));
      const rotationTargets = allProviders.filter((p) => !!p.getMovieUrl);
      if (rotationTargets.length > 0) {
        const startIdx = (slot * RENDER_BATCH_SIZE) % rotationTargets.length;
        const batch = Array.from({ length: Math.min(RENDER_BATCH_SIZE, rotationTargets.length) }, (_, i) =>
          rotationTargets[(startIdx + i) % rotationTargets.length],
        );
        const { renderCheckBatch } = await import('@/lib/streaming/render-check');
        const { reportClientHealth } = await import('@/lib/streaming/health-check');
        const verdicts = await renderCheckBatch(
          batch.map((p) => ({ name: p.name, url: p.getMovieUrl(550), noSandbox: p.noSandbox, proxied: (p as { useProxy?: boolean }).useProxy })),
        );
        for (const [name, verdict] of verdicts) {
          renderChecked.push({ name, verdict });
          if (verdict === 'alive' || verdict === 'dead') {
            await reportClientHealth(name, verdict === 'alive');
          }
        }
      }
    }
  } catch {
    // Playwright unavailable or crashed — the cheap fetch-based checks above
    // already ran, so provider health still has a signal either way.
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
    renderCheck: {
      note: 'Real headless-browser render check — the only layer that catches client-side sandbox-rejection. Small rotating batch per tick, not the whole registry.',
      skipped: renderCheckSkipped,
      checked: renderChecked,
    },
  });
}