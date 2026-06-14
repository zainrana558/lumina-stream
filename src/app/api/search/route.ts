import { NextRequest, NextResponse } from 'next/server';
import { getValidatedEnv } from '@/lib/env';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { searchAnime, anilistToMediaItem } from '@/lib/anilist/client';
import { tmdbToMedia } from '@/types';
import type { TMDBShow } from '@/types';

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
    const page = parseInt(searchParams.get('page') || '1');
    const source = searchParams.get('source') || 'all'; // 'all', 'tmdb', 'anilist'

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [], total_results: 0, total_pages: 0, has_more: false });
    }

    const trimmed = query.trim();

    // Fire TMDB + AniList searches in parallel
    const [tmdbResults, anilistResults] = await Promise.all([
      // TMDB search
      (source === 'all' || source === 'tmdb')
        ? fetchTmdbSearch(trimmed, page)
        : Promise.resolve({ items: [], totalPages: 0, totalResults: 0 }),

      // AniList search
      (source === 'all' || source === 'anilist')
        ? fetchAnilistSearch(trimmed, page)
        : Promise.resolve({ items: [], totalPages: 0, totalResults: 0 }),
    ]);

    // Merge results: TMDB first, then AniList (dedup by title match)
    const tmdbTitles = new Set(
      tmdbResults.items.map(i => i.title.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );

    const merged = [
      ...tmdbResults.items,
      ...anilistResults.items.filter(
        a => !tmdbTitles.has(a.title.toLowerCase().replace(/[^a-z0-9]/g, ''))
      ),
    ];

    const totalPages = Math.max(tmdbResults.totalPages, anilistResults.totalPages);
    const totalResults = tmdbResults.totalResults + anilistResults.totalResults;

    return NextResponse.json({
      results: merged,
      total_results: totalResults,
      total_pages: totalPages,
      page,
      has_more: page < totalPages,
    }, {
      headers: {
        ...rateLimitHeaders(rl),
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'X-Cache-Category': 'tmdb-search',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message, results: [], total_results: 0, total_pages: 0, has_more: false }, { status: 500 });
  }
}

async function fetchTmdbSearch(query: string, page: number) {
  try {
    const env = getValidatedEnv();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const params = new URLSearchParams({ query, page: String(page) });

    if (env.TMDB_BEARER_TOKEN) {
      headers['Authorization'] = `Bearer ${env.TMDB_BEARER_TOKEN}`;
    } else {
      params.set('api_key', env.TMDB_API_KEY!);
    }

    const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?${params}`,
      { headers, next: { revalidate: 60 } }
    );

    if (!res.ok) return { items: [], totalPages: 0, totalResults: 0 };

    const data = await res.json();
    const items = (data.results || [])
      .filter((r: TMDBShow) => r.poster_path && (r.media_type === 'movie' || r.media_type === 'tv'))
      .map((r: TMDBShow) => tmdbToMedia({ ...r, media_type: r.media_type || 'movie' }));

    return {
      items,
      totalPages: data.total_pages || 0,
      totalResults: data.total_results || 0,
    };
  } catch {
    return { items: [], totalPages: 0, totalResults: 0 };
  }
}

async function fetchAnilistSearch(query: string, page: number) {
  try {
    const data = await searchAnime(query, page, 15);
    const items = data.media.map(m => anilistToMediaItem(m));

    return {
      items,
      totalPages: data.pageInfo?.lastPage || 0,
      totalResults: data.pageInfo?.total || 0,
    };
  } catch {
    return { items: [], totalPages: 0, totalResults: 0 };
  }
}