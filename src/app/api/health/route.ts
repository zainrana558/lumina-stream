import { NextResponse } from 'next/server';
import { getValidatedEnv } from '@/lib/env';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { ok: boolean; detail: string; latencyMs?: number }> = {};

  // TMDB credential check + live API test
  try {
    const env = getValidatedEnv();
    const hasCredentials = !!(env.TMDB_BEARER_TOKEN || env.TMDB_API_KEY);
    checks.tmdb_credentials = {
      ok: hasCredentials,
      detail: hasCredentials
        ? env.TMDB_BEARER_TOKEN ? 'Using Bearer token' : 'Using API key'
        : 'No TMDB credentials configured',
    };

    // Test actual TMDB API call
    if (hasCredentials) {
      const headers: Record<string, string> = {};
      if (env.TMDB_BEARER_TOKEN) {
        headers['Authorization'] = `Bearer ${env.TMDB_BEARER_TOKEN}`;
      }
      const url = 'https://api.themoviedb.org/3/trending/all/week';
      const t0 = Date.now();
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - t0;
      const data = await res.json();
      checks.tmdb_api = {
        ok: res.ok && !!data.results,
        detail: res.ok
          ? `API responding in ${latency}ms — trending has ${data.total_results || data.results?.length || 0} results`
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

  // Embed providers health
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://luminaa2-vum6.vercel.app';
    const embedRes = await fetch(
      `${siteUrl}/api/embed-health`,
      { signal: AbortSignal.timeout(3000) }
    ).catch(() => null);
    checks.embed_providers = {
      ok: embedRes !== null,
      detail: embedRes ? `Embed health check responded (${embedRes.status})` : 'Embed health check unreachable',
    };
  } catch {
    checks.embed_providers = { ok: false, detail: 'Error checking embed providers' };
  }

  const totalLatency = Date.now() - startTime;
  const allOk = Object.values(checks).every(c => c.ok);

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_ms: totalLatency,
      checks,
    },
    {
      status: allOk ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
