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
    // Mirrors workers/cache-proxy.js's API_CATEGORY_TTL for these same
    // anilist-* categories — that's the edge worker's real per-category TTL;
    // this response's own Cache-Control was previously a flat 900s for every
    // category regardless of X-Cache-Category, so any downstream cache that
    // reads Cache-Control directly (rather than the worker's CDN-Cache-Control
    // override) saw the wrong TTL for everything except trending/airing.
    const CATEGORY_TTL: Record<string, number> = {
      'anilist-trending': 900,
      'anilist-popular': 1800,
      'anilist-seasonal': 1800,
      'anilist-airing': 900,
      'anilist-upcoming': 3600,
      'anilist-search': 600,
      'anilist-all': 1800,
    };
    const ttl = CATEGORY_TTL[cacheCategory] ?? 900;

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
        'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    // AniList itself is frequently unavailable (rate limits, or its own
    // "API temporarily disabled" 403s). That's an upstream outage, not a bug —
    // degrade to an empty result set with 200 so the client shows "no anime
    // right now" instead of an error state + retry storm. Genuine code errors
    // still surface as 500.
    const upstream =
      /AniList (API (error|rate limit)|circuit open|GraphQL error)|Jikan|temporarily disabled|rate limit reached|fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|aborted|timed out|The operation was aborted|unable to (get local issuer|verify)/i.test(
        msg,
      );
    if (upstream) {
      return NextResponse.json(
        { results: [], pageInfo: null, degraded: true },
        { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
      );
    }
    return NextResponse.json({ error: msg, results: [] }, { status: 500 });
  }
}
