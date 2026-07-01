import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { maybeCheckOneProvider } from '@/lib/streaming/health-check';
import { selectWithIntelligence, recordProviderResult } from '@/lib/streaming/provider-intelligence';
import { getAllEmbedUrls, getAnimeEmbedUrls } from '@/lib/streaming/providers';
import { resolveContentType } from '@/lib/content/content-intelligence';
import { getDeadProviders } from '@/lib/streaming/health-check';

/**
 * GET /api/embed
 *
 * Provider Intelligence Layer endpoint.
 *
 * Query params:
 *   tmdb    — TMDB ID (required for non-anime)
 *   mal     — MyAnimeList ID (optional, enables anime-specific providers)
 *   type    — "movie" or "tv" (default: "tv")
 *   season  — Season number for TV (default: 1)
 *   episode — Episode number for TV (default: 1)
 *   isAnime — "true" to use anime provider mix
 *   mode    — "smart" (default) returns scored chain; "legacy" returns tier-sorted list
 *
 * Smart mode (default):
 *   Returns { chain: [{ provider, url, score, tier, category }], ... }
 *   The chain is pre-scored and ordered by the Provider Intelligence Layer.
 *   Client uses chain[0] as primary, advances on failover.
 *
 * Legacy mode:
 *   Returns { providers: [{ name, url, tier, category }], total }
 *   Simple tier-sorted list (original behavior).
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 20 req / 10s per IP
    const rl = await checkRateLimit(request, 'embed');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.', providers: [], chain: [] },
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

    if (!tmdbId && !malId) {
      return NextResponse.json({ error: 'Missing tmdb or mal parameter' }, { status: 400 });
    }

    // ── Smart Mode: Provider Intelligence Layer ──
    if (mode === 'smart') {
      try {
        const result = await selectWithIntelligence({
          tmdbId: tmdbId || undefined,
          malId,
          mediaType: type,
          season,
          episode,
          isAnime: isAnime || undefined,
          fastMode: true, // Skip per-request probing (health-check handles it)
        });

        // NexStream proxy rewriting
        if (process.env.NEXSTREAM_API_KEY) {
          for (const item of result.chain) {
            if (item.url.includes('codespecters.com')) {
              item.url = `/api/embed-proxy?url=${encodeURIComponent(item.url)}`;
            }
          }
        }

        return NextResponse.json(result, { headers: rateLimitHeaders(rl) });
      } catch (intelligenceError) {
        // Intelligence layer failed — fall through to legacy mode
        console.error('[Embed] Intelligence layer failed, falling back to legacy:', intelligenceError);
      }
    }

    // ── Legacy Mode: Tier-sorted provider list ──
    const contentType = resolveContentType({
      id: tmdbId || undefined,
      mediaType: type,
      isAnime: isAnime || undefined,
      malId,
    });
    const useAnimePool = contentType.type === 'anime' || !!malId;

    let providers;
    if (useAnimePool) {
      const effectiveTmdbId = tmdbId || 0;
      providers = getAnimeEmbedUrls(effectiveTmdbId, season, episode, malId);
    } else {
      providers = getAllEmbedUrls(type, tmdbId, season, episode);
    }

    // NexStream proxy rewriting
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
      { error: msg, providers: [], chain: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/embed
 *
 * Record a provider playback result for the learning system.
 * Body: { provider: string, success: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, success } = body as { provider?: string; success?: boolean };

    if (!provider || typeof success !== 'boolean') {
      return NextResponse.json({ error: 'Missing provider or success field' }, { status: 400 });
    }

    recordProviderResult(provider, success);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}