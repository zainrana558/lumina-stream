import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { fetchWithCache, CACHE_TTL } from '@/lib/cache';
import { tmdbFetchRaw } from '@/lib/tmdb/server';
import { tmdbToMedia, type TMDBShow } from '@/types';
import { becauseYouWatchedSchema } from '@/lib/schemas';

/**
 * POST /api/recommendations/because-you-watched
 *
 * Replaces a client-driven 2-stage fetch waterfall (Home.tsx used to: fetch
 * genres for up to 5 continue-watching items from the browser, wait for all
 * of them, THEN fetch a discover query from the browser) with a single
 * request. Same TMDB calls, but orchestrated server-side so there's one
 * browser round-trip instead of two, and the per-item genre lookups run
 * through the same Redis-backed cache every other TMDB call on this site
 * uses instead of bypassing it.
 */
export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'tmdb');
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const body = await request.json().catch(() => null);
    const parsed = becauseYouWatchedSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 },
      );
    }
    const { items } = parsed.data;

    const genreLists = await Promise.all(
      items.map(async ({ id, mediaType }) => {
        try {
          const data = await fetchWithCache('details', `${mediaType}:${id}:genres`, () =>
            tmdbFetchRaw<{ genres?: { id: number }[] }>(`/${mediaType}/${id}`, {}),
          );
          return (data.genres || []).map(g => g.id);
        } catch {
          return [];
        }
      }),
    );

    const genreCount: Record<number, number> = {};
    for (const ids of genreLists) {
      for (const id of ids) genreCount[id] = (genreCount[id] || 0) + 1;
    }
    const sortedGenres = Object.entries(genreCount).sort(([, a], [, b]) => b - a);
    if (sortedGenres.length === 0) {
      return NextResponse.json({ items: [] }, { headers: rateLimitHeaders(rl) });
    }

    const topGenreId = sortedGenres[0][0];
    const tvCount = items.filter(i => i.mediaType === 'tv').length;
    const mediaType = tvCount >= items.length / 2 ? 'tv' : 'movie';

    const discoverKey = `discover:${mediaType}:genre:${topGenreId}`;
    const data = await fetchWithCache('discover', discoverKey, () =>
      tmdbFetchRaw<{ results?: TMDBShow[] }>(`/discover/${mediaType}`, {
        with_genres: topGenreId,
        sort_by: 'popularity.desc',
      }),
    );

    const recommended = (data.results || [])
      .filter(r => r.poster_path)
      .slice(0, 12)
      .map(r => tmdbToMedia({ ...r, media_type: mediaType }));

    return NextResponse.json({ items: recommended }, {
      headers: { ...rateLimitHeaders(rl), 'Cache-Control': `private, max-age=${CACHE_TTL.discover}` },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
