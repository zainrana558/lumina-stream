import { NextRequest, NextResponse } from 'next/server';
import { getAllEmbedUrls, getAnimeEmbedUrls } from '@/lib/streaming/providers';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { maybeCheckOneProvider, getDeadProviders } from '@/lib/streaming/health-check';

/**
 * GET /api/embed
 *
 * Query params:
 *   tmdb    — TMDB ID (required for non-anime)
 *   mal     — MyAnimeList ID (optional, enables anime-specific providers)
 *   type    — "movie" or "tv" (default: "tv")
 *   season  — Season number for TV (default: 1)
 *   episode — Episode number for TV (default: 1)
 *   isAnime — "true" to use anime provider mix
 *
 * Returns providers sorted by tier, with dead providers filtered out.
 * Replaced providers (from the pool) are flagged with "replaced": true.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 20 req / 10s per IP
    const rl = await checkRateLimit(request, 'embed');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.', providers: [] },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // Background: check one provider health (round-robin, non-blocking)
    maybeCheckOneProvider().catch(() => {});

    // Parse params
    const { searchParams } = new URL(request.url);
    const tmdbId = parseInt(searchParams.get('tmdb') || '0');
    const malId = searchParams.get('mal') ? parseInt(searchParams.get('mal')!) : undefined;
    const type = (searchParams.get('type') || 'tv') as 'movie' | 'tv';
    const season = parseInt(searchParams.get('season') || '1');
    const episode = parseInt(searchParams.get('episode') || '1');
    const isAnime = searchParams.get('isAnime') === 'true';

    if (!tmdbId && !malId) {
      return NextResponse.json({ error: 'Missing tmdb or mal parameter' }, { status: 400 });
    }

    // Get providers based on content type
    let providers;

    if (isAnime || malId) {
      const effectiveTmdbId = tmdbId || 0;
      providers = getAnimeEmbedUrls(effectiveTmdbId, season, episode, malId);
    } else {
      providers = getAllEmbedUrls(type, tmdbId, season, episode);
    }

    // NexStream requires an API key — route through server-side proxy.
    // The key is read from env inside embed-proxy; never passed in the URL.
    if (process.env.NEXSTREAM_API_KEY) {
      for (const p of providers) {
        if (p.url.includes('codespecters.com')) {
          p.url = `/api/embed-proxy?url=${encodeURIComponent(p.url)}`;
        }
      }
    }

    // Filter out dead providers
    try {
      const deadProviders = await getDeadProviders();
      if (deadProviders.size > 0) {
        providers = providers.filter((p) => !deadProviders.has(p.name));
      }
    } catch {
      // Health check failed — show all providers (safe fallback)
    }

    return NextResponse.json(
      {
        providers: providers.map(({ name, url, tier, category, replaced }) => ({
          name,
          url,
          tier,
          category,
          replaced: replaced || false,
        })),
        total: providers.length,
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, providers: [] },
      { status: 500 }
    );
  }
}
