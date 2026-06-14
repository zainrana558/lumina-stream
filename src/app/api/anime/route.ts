import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import {
  searchAnime,
  getSeasonalAnime,
  getTrendingAnime,
  getPopularAnime,
  getUpcomingAnime,
  getAiringAnime,
  getTopRatedAnime,
  browseAllAnime,
  browseAnimeByGenre,
  anilistToMediaItem,
} from '@/lib/anilist/client';

export async function GET(request: NextRequest) {
  try {
    // Rate limit: 20 req / 10s per IP
    const rl = await checkRateLimit(request, 'search');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.', results: [] },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'search';
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const season = searchParams.get('season') as 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

    // Map AniList query types to edge cache categories
    const typeToCategory: Record<string, string> = {
      trending: 'anilist-trending',
      popular: 'anilist-popular',
      seasonal: 'anilist-seasonal',
      top: 'anilist-popular',
      airing: 'anilist-airing',
      upcoming: 'anilist-upcoming',
      all: 'anilist-all',
      search: 'anilist-search',
    };
    const cacheCategory = typeToCategory[type] || 'anilist-search';

    let results;

    switch (type) {
      case 'seasonal':
        results = await getSeasonalAnime(season, year, page, perPage);
        break;
      case 'trending':
        results = await getTrendingAnime(page, perPage);
        break;
      case 'popular':
        results = await getPopularAnime(page, perPage);
        break;
      case 'upcoming':
        results = await getUpcomingAnime(season, year, page, perPage);
        break;
      case 'airing':
        results = await getAiringAnime(page, perPage);
        break;
      case 'top':
        results = await getTopRatedAnime(page, perPage);
        break;
      case 'all':
        results = await browseAllAnime(page, perPage);
        break;
      case 'genre': {
        const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
        if (genres.length === 0) {
          return NextResponse.json({ results: [], pageInfo: null }, { headers: rateLimitHeaders(rl) });
        }
        results = await browseAnimeByGenre(genres, page, perPage);
        break;
      }
      case 'search':
      default:
        if (!q || q.length < 2) {
          return NextResponse.json({ results: [], pageInfo: null }, { headers: rateLimitHeaders(rl) });
        }
        results = await searchAnime(q, page, perPage);
        break;
    }

    const mediaItems = results.media.map(m => anilistToMediaItem(m));

    return NextResponse.json({
      results: mediaItems,
      pageInfo: results.pageInfo,
    }, {
      headers: {
        ...rateLimitHeaders(rl),
        'X-Cache-Category': cacheCategory,
        'Cache-Control': `public, s-maxage=900, stale-while-revalidate=1800`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg, results: [] }, { status: 500 });
  }
}
