import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { maybeCheckOneProvider } from '@/lib/streaming/health-check';
import { selectProvider, getFilteredEmbedResults } from '@/lib/streaming/selection';
import { getRedis } from '@/lib/redis';

/**
 * GET /api/embed — Smart provider selection
 *
 * Query params:
 *   tmdb       — TMDB ID (required for non-anime)
 *   mal        — MyAnimeList ID (optional, enables anime-specific providers)
 *   type       — "movie" or "tv" (default: "tv")
 *   season     — Season number for TV (default: 1)
 *   episode    — Episode number for TV (default: 1)
 *   isAnime    — "true" to use anime provider mix
 *   mode       — "smart" (default) | "legacy" — smart uses scoring engine, legacy returns all
 *   provider   — Force a specific provider name (skip scoring)
 *
 * Returns:
 *   mode=smart (default):
 *     { url, provider, score, tier, chain[], selectionPath, fallbackUsed, debug? }
 *   mode=legacy:
 *     { providers: [{ name, url, tier, category, replaced }], total }
 *
 * Both modes share the same rate limit (20 req / 10s per IP).
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 20 req / 10s per IP
    const rl = await checkRateLimit(request, 'embed');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
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
    const mode = searchParams.get('mode') || 'smart';
    const forceProvider = searchParams.get('provider') || undefined;

    if (!tmdbId && !malId) {
      return NextResponse.json({ error: 'Missing tmdb or mal parameter' }, { status: 400 });
    }

    // NexStream proxy handling
    const applyNexStreamProxy = (url: string): string => {
      if (process.env.NEXSTREAM_API_KEY && url.includes('codespecters.com')) {
        return `/api/embed-proxy?url=${encodeURIComponent(url)}`;
      }
      return url;
    };

    // ── Mode: Legacy (backward compatible) ──
    if (mode === 'legacy') {
      let providers = await getFilteredEmbedResults(type, tmdbId, season, episode, isAnime, malId);

      // Apply NexStream proxy
      providers = providers.map(p => ({ ...p, url: applyNexStreamProxy(p.url) }));

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
          mode: 'legacy',
        },
        { headers: rateLimitHeaders(rl) }
      );
    }

    // ── Mode: Smart (new default) ──
    const contentType = isAnime ? 'anime' : type;

    // Check result cache first
    const cacheKey = `embed:result:${tmdbId}:${contentType}:${season}:${episode}`;
    const client = getRedis();
    if (client) {
      try {
        const cached = await client.get<string>(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Apply NexStream proxy to cached URLs
          if (parsed.url) parsed.url = applyNexStreamProxy(parsed.url);
          if (parsed.chain) {
            for (const item of parsed.chain) {
              item.url = applyNexStreamProxy(item.url);
            }
          }
          return NextResponse.json(
            { ...parsed, cached: true, mode: 'smart' },
            { headers: rateLimitHeaders(rl) }
          );
        }
      } catch {
        // Cache miss — proceed with selection
      }
    }

    // Run smart selection
    const result = await selectProvider({
      contentId: String(tmdbId || malId),
      contentType,
      tmdbId,
      season,
      episode,
      malId,
      forceProvider,
    });

    // Apply NexStream proxy
    result.url = applyNexStreamProxy(result.url);
    for (const item of result.chain) {
      item.url = applyNexStreamProxy(item.url);
    }

    // Cache result for 10 minutes
    if (client && result.url) {
      try {
        await client.set(cacheKey, JSON.stringify(result), { ex: 600 });
      } catch {
        // Ignore cache write failure
      }
    }

    // Emit selection metric (fire-and-forget)
    if (result.provider && result.provider !== 'none') {
      import('@/lib/streaming/metrics').then(({ emitSelectionMetric }) => {
        emitSelectionMetric({
          provider: result.provider,
          latencyMs: result.validationTimeMs,
          score: result.score,
          fallbackUsed: result.fallbackUsed,
          selectionPath: result.selectionPath,
          timestamp: Date.now(),
        }).catch(() => {});
      });
    }

    return NextResponse.json(
      {
        url: result.url,
        provider: result.provider,
        score: result.score,
        tier: result.tier,
        chain: result.chain,
        selectionPath: result.selectionPath,
        fallbackUsed: result.fallbackUsed,
        totalTimeMs: result.totalTimeMs,
        validationTimeMs: result.validationTimeMs,
        mode: 'smart',
        ...result.debug,
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/embed — Force a specific provider
 *
 * Body: { contentId, contentType, tmdb, season, episode, providerId }
 * Skips scoring, uses the specified provider directly.
 */
export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'embed');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const { tmdb, contentType: bodyType, season, episode, providerId, mal } = body;

    const tmdbId = parseInt(tmdb || '0');
    const malId = mal ? parseInt(mal) : undefined;
    const contentType = (bodyType || 'tv') as 'movie' | 'tv' | 'anime';

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId' }, { status: 400 });
    }

    const result = await selectProvider({
      contentId: String(tmdbId || malId),
      contentType,
      tmdbId,
      season: season ? parseInt(season) : undefined,
      episode: episode ? parseInt(episode) : undefined,
      malId,
      forceProvider: providerId,
    });

    // Apply NexStream proxy
    const applyNexStreamProxy = (url: string): string => {
      if (process.env.NEXSTREAM_API_KEY && url.includes('codespecters.com')) {
        return `/api/embed-proxy?url=${encodeURIComponent(url)}`;
      }
      return url;
    };
    result.url = applyNexStreamProxy(result.url);
    for (const item of result.chain) {
      item.url = applyNexStreamProxy(item.url);
    }

    return NextResponse.json(
      {
        url: result.url,
        provider: result.provider,
        score: result.score,
        tier: result.tier,
        chain: result.chain,
        selectionPath: result.selectionPath,
        fallbackUsed: result.fallbackUsed,
        mode: 'smart',
        forced: true,
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}