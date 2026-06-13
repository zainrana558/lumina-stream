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
    const page = searchParams.get('page') || '1';
    const language = searchParams.get('language') || '';

    // Build TMDB discover params
    const baseParams: Record<string, string> = { sort_by: sortBy, page };
    if (genre) baseParams.with_genres = genre;
    if (minRating) baseParams['vote_average.gte'] = minRating;
    if (minRating) baseParams['vote_count.gte'] = '10';
    if (language && language !== 'all') baseParams.with_original_language = language;

    const fetchMedia = async (mt: 'movie' | 'tv') => {
      const p = { ...baseParams };
      if (yearFrom) {
        p[mt === 'tv' ? 'first_air_date.gte' : 'primary_release_date.gte'] = `${yearFrom}-01-01`;
      }
      if (yearTo) {
        p[mt === 'tv' ? 'first_air_date.lte' : 'primary_release_date.lte'] = `${yearTo}-12-31`;
      }
      const data = await tmdbFetch<{ results?: TMDBShow[]; total_pages: number; total_results: number }>(
        `/discover/${mt}`, p
      );
      return (data.results || []).map(r => ({ ...r, media_type: mt }));
    };

    let results: TMDBShow[];

    if (mediaType === 'all') {
      const [movies, tv] = await Promise.all([fetchMedia('movie'), fetchMedia('tv')]);
      results = [...movies, ...tv];
      results.sort((a, b) => b.popularity - a.popularity);
    } else {
      results = await fetchMedia(mediaType as 'movie' | 'tv');
    }

    const totalResults = results.length;

    const data = { results, total_results: totalResults, total_pages: 500, page: Number(page) };

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
