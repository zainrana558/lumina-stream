import { NextRequest, NextResponse } from 'next/server';
import { getValidatedEnv } from '@/lib/env';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Rate limit: 20 req / 10s per IP
    const rl = await checkRateLimit(request, 'search');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many searches. Please slow down.', results: [] },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const env = getValidatedEnv();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const params = new URLSearchParams({ query: query.trim() });

    if (env.TMDB_BEARER_TOKEN) {
      headers['Authorization'] = `Bearer ${env.TMDB_BEARER_TOKEN}`;
    } else {
      params.set('api_key', env.TMDB_API_KEY!);
    }

    const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?${params}`,
      { headers, next: { revalidate: 60 } }
    );

    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status}`);
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        ...rateLimitHeaders(rl),
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message, results: [] }, { status: 500 });
  }
}
