import { NextResponse } from 'next/server';
import { checkAllProviders } from '@/lib/streaming/health-check';
import { getValidatedEnv } from '@/lib/env';
import { getRedis } from '@/lib/redis';

/**
 * GET /api/embed-health-cron
 *
 * Called by Vercel Cron every 30 minutes.
 * Checks ALL third-party service URLs the app depends on:
 *   1. TMDB API — actual API call (lightweight endpoint)
 *   2. AniList GraphQL — actual query (lightweight)
 *   3. Supabase — connectivity + auth check
 *   4. Upstash Redis — PING command
 *   5. All embed providers — HEAD ping + replacement swap
 *
 * Security: Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"
 * when CRON_SECRET is set in Vercel env vars.
 */

interface ServiceCheck {
  name: string;
  alive: boolean;
  latency_ms: number;
  error?: string;
}

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

export async function GET(request: Request) {
  // Auth check
  const auth = request.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET || process.env.CACHE_WARM_SECRET;
  if (!expectedSecret || auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceResults: ServiceCheck[] = [];

  // ── 1. TMDB API ──
  const tmdbCheck = checkService('TMDB API', async () => {
    const env = getValidatedEnv();
    const headers: Record<string, string> = {};
    if (env.TMDB_BEARER_TOKEN) {
      headers['Authorization'] = `Bearer ${env.TMDB_BEARER_TOKEN}`;
    } else {
      headers['Content-Type'] = 'application/json';
    }
    // Use a lightweight endpoint — genre list
    const url = env.TMDB_BEARER_TOKEN
      ? 'https://api.themoviedb.org/3/genre/movie/list?language=en-US'
      : `https://api.themoviedb.org/3/genre/movie/list?api_key=${env.TMDB_API_KEY}&language=en-US`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.genres) throw new Error('Invalid response');
  });

  // ── 2. AniList GraphQL ──
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

  // ── 3. Supabase ──
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

  // ── 4. Upstash Redis ──
  const redisCheck = checkService('Redis', async () => {
    const client = getRedis();
    if (!client) throw new Error('Not configured');
    const result = await client.ping();
    if (result !== 'PONG') throw new Error(`Unexpected response: ${result}`);
  });

  // Run all core service checks in parallel
  const [tmdb, anilist, supabase, redis] = await Promise.all([
    tmdbCheck, anilistCheck, supabaseCheck, redisCheck,
  ]);
  serviceResults.push(tmdb, anilist, supabase, redis);

  // ── 5. Embed Providers (uses existing health check system) ──
  let embedResults: Record<string, boolean> = {};
  try {
    embedResults = await checkAllProviders();
  } catch { /* embed check failure is non-critical */ }

  const embedChecks: ServiceCheck[] = Object.entries(embedResults).map(
    ([name, alive]) => ({ name: `Embed: ${name}`, alive, latency_ms: 0 })
  );
  serviceResults.push(...embedChecks);

  // Summary
  const coreAlive = serviceResults.slice(0, 4).filter(s => s.alive).length;
  const embedAlive = embedChecks.filter(s => s.alive).length;
  const coreDead = serviceResults.slice(0, 4).filter(s => !s.alive);
  const embedDead = embedChecks.filter(s => !s.alive);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    core: {
      total: 4,
      alive: coreAlive,
      dead: coreDead.length,
      services: serviceResults.slice(0, 4),
    },
    embed: {
      total: embedChecks.length,
      alive: embedAlive,
      dead: embedDead.length,
      deadProviders: embedDead.map(s => s.name.replace('Embed: ', '')),
    },
  });
}