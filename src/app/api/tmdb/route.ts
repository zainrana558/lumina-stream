import { NextRequest, NextResponse } from 'next/server';
import { getValidatedEnv } from '@/lib/env';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { fetchWithCache, CACHE_TTL } from '@/lib/cache';

const BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export { TMDB_IMAGE_BASE };

const ALLOWED_PREFIXES = [
  '/trending/', '/movie/', '/tv/', '/genre/',
  '/search/', '/discover/', '/person/',
];

// Map TMDB endpoints to cache categories
function getCacheCategory(endpoint: string): keyof typeof CACHE_TTL {
  const path = endpoint.split('?')[0];
  if (path.includes('/trending')) return 'trending';
  if (path.includes('/search/')) return 'search';
  if (path.match(/\/(movie|tv)\/\d+$/)) return 'details';
  if (path.includes('/season/')) return 'season';
  if (path.includes('/credits') || path.includes('/similar') || path.includes('/videos')) return 'credits';
  if (path.includes('/discover/')) return 'discover';
  if (path.includes('/genre/')) return 'genre';
  if (path.includes('/popular') || path.includes('/top_rated') || path.includes('/now_playing') || path.includes('/upcoming') || path.includes('/airing_today') || path.includes('/on_the_air')) return 'popular';
  return 'popular';
}

async function tmdbProxyFetch(endpoint: string, params: URLSearchParams) {
  const env = getValidatedEnv();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (env.TMDB_BEARER_TOKEN) {
    headers['Authorization'] = `Bearer ${env.TMDB_BEARER_TOKEN}`;
  } else {
    params.set('api_key', env.TMDB_API_KEY!);
  }

  const res = await fetch(`${BASE_URL}${endpoint}?${params}`, {
    headers,
    // ISR cache for static pages (server-side rendering)
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status}`);
  }

  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    // ---- Per-route rate limiting (Upstash sliding window) ----
    const rl = await checkRateLimit(request, 'tmdb');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before making more requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }

    // Validate endpoint against allowed prefixes
    const path = endpoint.split('?')[0];
    if (!ALLOWED_PREFIXES.some(p => path.startsWith(p))) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }

    // Collect all extra query params
    const params = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'endpoint') {
        params.set(key, value);
      }
    }

    // Parse extra params embedded in endpoint
    if (endpoint.includes('?')) {
      const [, qs] = endpoint.split('?');
      const extraParams = new URLSearchParams(qs);
      for (const [key, value] of extraParams.entries()) {
        params.set(key, value);
      }
    }

    // Build cache key from full path + params
    const paramsString = params.toString();
    const category = getCacheCategory(endpoint);
    const cacheKey = `${path}?${paramsString}`;

    // ---- Redis-cached fetch ----
    const data = await fetchWithCache(
      category,
      cacheKey,
      () => tmdbProxyFetch(path, params)
    );

    // Cache-Control: s-maxage for Vercel Edge / Cloudflare CDN
    const ttl = CACHE_TTL[category];
    return NextResponse.json(data, {
      headers: {
        ...rateLimitHeaders(rl),
        'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
        'X-Cache-Category': category,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
