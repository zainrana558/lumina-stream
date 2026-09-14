import { NextRequest, NextResponse } from 'next/server';
import { getValidatedEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  // Audit finding F-15: this endpoint's detailed `checks` breakdown leaked the
  // exact Supabase project host and Redis host to any anonymous caller (plus
  // live embed-provider uptime ratios) — concrete, previously-unguessable
  // targets for further probing. Gate the detail behind the same admin key
  // used elsewhere; anonymous/public callers now get only the aggregate
  // status. Internal monitoring (deploy.sh) only reads `.status`, so it needs
  // no changes.
  const adminKey = process.env.ADMIN_API_KEY;
  const isAdmin = !!adminKey && request.headers.get('x-admin-key') === adminKey;

  const startTime = Date.now();
  const checks: Record<string, { ok: boolean; detail: string; latencyMs?: number }> = {};

  // TMDB credential check + live API test
  try {
    const env = getValidatedEnv();
    const hasCredentials = !!(env.TMDB_BEARER_TOKEN || env.TMDB_API_KEY);
    checks.tmdb_credentials = {
      ok: hasCredentials,
      detail: hasCredentials ? 'Configured' : 'Not configured',
    };

    // Test TMDB API through the same path the app uses (Cloudflare Worker or direct)
    if (hasCredentials) {
      const cacheUrl = process.env.API_CACHE_URL;
      let testUrl: string = cacheUrl
        ? `${cacheUrl}/tmdb/trending/all/week?language=en-US`
        : 'https://api.themoviedb.org/3/trending/all/week?language=en-US';

      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (cacheUrl) {
        // Route through Cloudflare Worker (sends auth via header)
        if (env.TMDB_BEARER_TOKEN) headers['X-TMDB-Auth'] = env.TMDB_BEARER_TOKEN;
        else if (env.TMDB_API_KEY) headers['X-TMDB-Key'] = env.TMDB_API_KEY;
        // Worker abuse guard — same header src/lib/tmdb/server.ts sends
        if (process.env.WORKER_KEY) headers['X-Worker-Key'] = process.env.WORKER_KEY;
      } else {
        // Direct TMDB call
        if (env.TMDB_BEARER_TOKEN) headers['Authorization'] = `Bearer ${env.TMDB_BEARER_TOKEN}`;
        else if (env.TMDB_API_KEY) testUrl += `&api_key=${env.TMDB_API_KEY}`;
      }

      const t0 = Date.now();
      const res = await fetch(testUrl, { headers, signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - t0;
      const data = await res.json();
      const cacheStatus = res.headers.get('x-cache-status') || 'direct';
      checks.tmdb_api = {
        ok: res.ok && !!data.results,
        detail: res.ok
          ? `OK via ${cacheUrl ? `Worker (${cacheStatus})` : 'direct'} in ${latency}ms — ${data.total_results || data.results?.length || 0} results`
          : `API returned ${res.status}: ${JSON.stringify(data).slice(0, 200)}`,
        latencyMs: latency,
      };
    }
  } catch (error: unknown) {
    checks.tmdb_credentials = {
      ok: false,
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Supabase check
  try {
    const env = getValidatedEnv();
    checks.supabase = {
      ok: !!env.NEXT_PUBLIC_SUPABASE_URL && !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      detail: env.NEXT_PUBLIC_SUPABASE_URL
        ? `URL configured: ${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '').split('//')[1]?.split('/')[0] || 'set'}`
        : 'No Supabase URL configured',
    };
  } catch {
    checks.supabase = { ok: false, detail: 'Error checking Supabase' };
  }

  // Redis check
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    checks.redis = {
      ok: !!(redisUrl && redisToken),
      detail: redisUrl
        ? `URL configured: ${redisUrl.replace(/\/$/, '').split('//')[1]?.split('/')[0] || 'set'}`
        : 'No Redis configured (caching disabled)',
    };
  } catch {
    checks.redis = { ok: false, detail: 'Error checking Redis' };
  }

  // Embed providers health — read the in-process health map directly. The old
  // version did a full HTTP round-trip to $SITE_URL/api/embed-health (out
  // through Cloudflare and back, always 401), which was pure noise.
  try {
    const { getAllHealthRecords } = await import('@/lib/streaming/health-check');
    const records = getAllHealthRecords();
    const checked = records.size;
    let alive = 0;
    for (const r of records.values()) if (r.status !== 'dead') alive++;
    checks.embed_providers = {
      // Before any health check has run the map is empty — that's fine, not a
      // failure. Only flag if we've checked providers and all are dead.
      ok: checked === 0 || alive > 0,
      detail: checked === 0
        ? 'No provider checks recorded yet'
        : `${alive}/${checked} providers alive`,
    };
  } catch {
    checks.embed_providers = { ok: true, detail: 'Provider health map unavailable (non-critical)' };
  }

  const totalLatency = Date.now() - startTime;
  const allOk = Object.values(checks).every(c => c.ok);

  const body = isAdmin
    ? {
        status: allOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime_ms: totalLatency,
        checks,
      }
    : {
        // Public shape: aggregate only, no hostnames / latencies / provider
        // uptime ratios. `X-Admin-Key: $ADMIN_API_KEY` gets the full breakdown.
        status: allOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
      };

  return NextResponse.json(body, {
    status: allOk ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
