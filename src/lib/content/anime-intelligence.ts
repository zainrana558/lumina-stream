/**
 * L13 — Anime Intelligence
 *
 * Cross-provider ID resolution between AniList ↔ TMDB ↔ MAL.
 * Uses Redis caching (1hr TTL) to minimize API calls.
 * Falls back gracefully when Redis or external APIs are unavailable.
 */

import { getRedis } from '@/lib/redis';
import { searchAnime } from '@/lib/anilist/client';
import type { AniListMedia } from '@/lib/anilist/client';
import { ANILIST_ID_OFFSET } from '@/types';

// ---- Types ----

export interface AnimeIdMapping {
  anilistId: number;
  tmdbId: number | null;
  malId: number | null;
  title: string;
  updatedAt: string;
}

interface CachedMapping {
  data: AnimeIdMapping;
  cachedAt: number;
}

const CACHE_TTL_SECONDS = 3600; // 1 hour
const CACHE_PREFIX = 'lumina:anime:idmap:';

// ---- Cache helpers ----

function mappingCacheKey(sourceType: string, sourceId: number): string {
  return `${CACHE_PREFIX}${sourceType}:${sourceId}`;
}

async function getCachedMapping(sourceType: string, sourceId: number): Promise<AnimeIdMapping | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get<string>(mappingCacheKey(sourceType, sourceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedMapping;
    // Check TTL
    if (Date.now() - parsed.cachedAt > CACHE_TTL_SECONDS * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

async function setCachedMapping(
  sourceType: string,
  sourceId: number,
  mapping: AnimeIdMapping,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const entry: CachedMapping = { data: mapping, cachedAt: Date.now() };
    await redis.set(
      mappingCacheKey(sourceType, sourceId),
      JSON.stringify(entry) as unknown as typeof entry,
      { ex: CACHE_TTL_SECONDS },
    );
  } catch {
    // Cache write failure is non-critical
  }
}

// ---- Resolution functions ----

/**
 * Resolve anime IDs from any known identifier.
 * Given one of: anilistId, tmdbId, or malId, attempts to find the others.
 */
export async function resolveAnimeIds(options: {
  anilistId?: number;
  tmdbId?: number;
  malId?: number;
  title?: string;
}): Promise<AnimeIdMapping | null> {
  // 1. Try AniList ID directly
  if (options.anilistId) {
    const cached = await getCachedMapping('anilist', options.anilistId);
    if (cached) return cached;
  }

  // 2. Try MAL ID
  if (options.malId) {
    const cached = await getCachedMapping('mal', options.malId);
    if (cached) return cached;
  }

  // 3. Try TMDB ID
  if (options.tmdbId) {
    const cached = await getCachedMapping('tmdb', options.tmdbId);
    if (cached) return cached;
  }

  // 4. Try title-based resolution
  if (options.title) {
    const byTitle = await resolveByTitle(options.title);
    if (byTitle) return byTitle;
  }

  return null;
}

/**
 * Resolve anime by title via AniList search.
 */
export async function resolveByTitle(title: string): Promise<AnimeIdMapping | null> {
  try {
    const page = await searchAnime(title, 1, 5);
    if (!page || !page.media || page.media.length === 0) return null;

    const best = page.media[0];
    const mapping: AnimeIdMapping = {
      anilistId: best.id,
      tmdbId: null, // AniList doesn't provide TMDB ID directly
      malId: best.idMal ?? null,
      title: best.title.english || best.title.romaji || title,
      updatedAt: new Date().toISOString(),
    };

    // Cache the mapping
    await setCachedMapping('anilist', best.id, mapping);
    if (best.idMal) {
      await setCachedMapping('mal', best.idMal, mapping);
    }

    return mapping;
  } catch {
    return null;
  }
}

/**
 * Get MAL ID for a provider's content.
 * Tries cached mapping first, then AniList lookup.
 */
export async function getMalIdForProvider(options: {
  anilistId?: number;
  tmdbId?: number;
  title?: string;
}): Promise<number | null> {
  const mapping = await resolveAnimeIds(options);
  return mapping?.malId ?? null;
}

/**
 * Batch resolve multiple anime ID mappings.
 * Returns a Map of sourceId → AnimeIdMapping.
 */
export async function batchResolveMappings(
  items: Array<{ anilistId?: number; tmdbId?: number; malId?: number; title?: string }>,
): Promise<Map<string, AnimeIdMapping>> {
  const results = new Map<string, AnimeIdMapping>();

  // Process in parallel with a concurrency limit of 5
  const batchSize = 5;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const key = item.anilistId
          ? `anilist:${item.anilistId}`
          : item.tmdbId
            ? `tmdb:${item.tmdbId}`
            : item.malId
              ? `mal:${item.malId}`
              : `title:${item.title}`;

        const mapping = await resolveAnimeIds(item);
        return { key, mapping };
      }),
    );

    for (const { key, mapping } of batchResults) {
      if (mapping) results.set(key, mapping);
    }
  }

  return results;
}

/**
 * Suggest a mapping that can be stored in the anime_id_mapping DB table.
 */
export function suggestMapping(
  anilistMedia: AniListMedia,
): Omit<AnimeIdMapping, 'updatedAt'> {
  return {
    anilistId: anilistMedia.id,
    tmdbId: null,
    malId: anilistMedia.idMal ?? null,
    title: anilistMedia.title.english || anilistMedia.title.romaji || 'Unknown',
  };
}