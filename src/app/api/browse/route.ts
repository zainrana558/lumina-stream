import { NextRequest, NextResponse } from 'next/server';
import { tmdbFetch } from '@/lib/tmdb/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import type { TMDBShow } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'search');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.', results: [] },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const mediaType = searchParams.get('mediaType') || 'all';
    const genre = searchParams.get('genre') || '';
    const yearFrom = searchParams.get('yearFrom') || '';
    const yearTo = searchParams.get('yearTo') || '';
    const minRating = searchParams.get('minRating') || '';
    const sortBy = searchParams.get('sortBy') || 'popularity.desc';
    // TMDB rejects page 0, negative, non-numeric, or over its 500-page cap
    // with a 400 — clamp instead of forwarding whatever the client sent
    // verbatim (was surfacing as an unhandled 500 for any of those).
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const page = String(Number.isFinite(rawPage) ? Math.min(500, Math.max(1, rawPage)) : 1);
    const language = searchParams.get('language') || '';
    const country = searchParams.get('country') || '';

    // Build TMDB discover params
    const baseParams: Record<string, string> = { sort_by: sortBy, page };
    if (genre) baseParams.with_genres = genre;
    if (minRating) baseParams['vote_average.gte'] = minRating;
    if (minRating) baseParams['vote_count.gte'] = '10';
    if (language && language !== 'all') baseParams.with_original_language = language;
    // `watch_region` only affects TMDB watch-provider annotations — it does NOT
    // filter discover results by itself (confirmed live: identical result sets
    // with and without it). `with_origin_country` is the actual "content
    // produced in country X" filter.
    if (country && country !== 'all') baseParams.with_origin_country = country;

    const fetchMedia = async (mt: 'movie' | 'tv') => {
      const p = { ...baseParams };
      if (yearFrom) {
        p[mt === 'tv' ? 'first_air_date.gte' : 'primary_release_date.gte'] = `${yearFrom}-01-01`;
      }
      if (yearTo) {
        p[mt === 'tv' ? 'first_air_date.lte' : 'primary_release_date.lte'] = `${yearTo}-12-31`;
      }
      const data = await tmdbFetch<{ results?: TMDBShow[]; total_pages?: number; total_results?: number }>(
        `/discover/${mt}`, p
      );
      return {
        results: (data.results || []).map(r => ({ ...r, media_type: mt })),
        // TMDB itself caps discover pagination at 500
        totalPages: Math.min(data.total_pages || 1, 500),
        totalResults: data.total_results || 0,
      };
    };

    let results: TMDBShow[];
    let totalPages: number;
    let totalResults: number;

    if (mediaType === 'all') {
      const [movies, tv] = await Promise.all([fetchMedia('movie'), fetchMedia('tv')]);
      results = [...movies.results, ...tv.results];
      results.sort((a, b) => b.popularity - a.popularity);
      totalPages = Math.max(movies.totalPages, tv.totalPages);
      totalResults = movies.totalResults + tv.totalResults;
    } else {
      const r = await fetchMedia(mediaType as 'movie' | 'tv');
      results = r.results;
      totalPages = r.totalPages;
      totalResults = r.totalResults;
    }

    const data = { results, total_results: totalResults, total_pages: totalPages, page: Number(page) };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache-Category': 'tmdb-discover',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
