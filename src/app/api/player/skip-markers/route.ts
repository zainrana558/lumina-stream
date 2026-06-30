/**
 * Skip Markers API
 *
 * GET /api/player/skip-markers?mediaId=...&season=...&episode=...
 *
 * Returns heuristic skip markers (intro/credits timestamps).
 * Results are cached in Redis for 6 hours.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getRedis } from '@/lib/redis';

interface SkipMarker {
  type: 'intro' | 'credits';
  startTime: number;
  endTime: number;
}

const SKIP_MARKERS_CACHE_PREFIX = 'lumina:skip:';
const SKIP_MARKERS_CACHE_TTL = 6 * 60 * 60; // 6 hours

function getCacheKey(mediaId: number, season: number, episode: number): string {
  return `${SKIP_MARKERS_CACHE_PREFIX}${mediaId}:${season}:${episode}`;
}

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'stats');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const { searchParams } = new URL(request.url);
    const mediaId = parseInt(searchParams.get('mediaId') || '0');
    const season = parseInt(searchParams.get('season') || '1');
    const episode = parseInt(searchParams.get('episode') || '1');

    if (!mediaId) {
      return NextResponse.json({ error: 'Missing mediaId' }, { status: 400 });
    }

    // Check Redis cache
    const redis = getRedis();
    if (redis) {
      try {
        const cacheKey = getCacheKey(mediaId, season, episode);
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
          const markers = JSON.parse(cached) as SkipMarker[];
          return NextResponse.json({ markers }, { headers: rateLimitHeaders(rl) });
        }
      } catch {
        // Fall through
      }
    }

    // Heuristic skip markers based on common TV show patterns
    // These are rough estimates — real implementation would use
    // a skip-intro database or ML detection
    const markers: SkipMarker[] = [];

    // TV shows typically have intros in the first 60-120 seconds
    if (season > 0 && episode > 0) {
      // Intro heuristic: 20s - 90s mark (common for most TV shows)
      markers.push({
        type: 'intro',
        startTime: 20,
        endTime: 90,
      });

      // Credits heuristic: last 30-60 seconds
      // (We don't know duration here, so skip credit heuristic)
    }

    // Cache the result
    if (redis) {
      try {
        const cacheKey = getCacheKey(mediaId, season, episode);
        await redis.set(
          cacheKey,
          JSON.stringify(markers) as unknown as string,
          { ex: SKIP_MARKERS_CACHE_TTL },
        );
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({ markers }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}