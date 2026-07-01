/**
 * L3 — Content Intelligence Engine
 *
 * Analyzes content metadata to determine:
 *   1. Content type (anime / movie / tv)
 *   2. Provider pool hint (anime vs general)
 *   3. Enrichment data from local catalog
 *   4. Batch anime detection
 *
 * Detection priority:
 *   explicit flag > ID namespace > ID presence > genre heuristic > default
 */

import { isAnilistId, ANILIST_ID_OFFSET } from '@/types';
import type { MediaItem, MediaType } from '@/types';

// ---- Types ----

export interface ContentTypeResult {
  type: 'anime' | 'movie' | 'tv';
  confidence: 'high' | 'medium' | 'low';
  method: 'explicit' | 'id-namespace' | 'id-presence' | 'genre' | 'default';
}

export interface ProviderPoolHint {
  pool: 'anime' | 'general';
  reason: string;
}

export interface ContentEnrichment {
  malId?: number;
  anilistId?: number;
  isAnime: boolean;
  localMetadata?: {
    episodesPerSeason: Record<number, number>;
    totalEpisodes: number;
    status: string;
  };
}

// ---- TMDB Anime Genre IDs ----
// These genre IDs from TMDB are strong anime indicators
// NOTE: 'Animation' (TMDB ID 16) is NOT included — it matches Pixar/Disney/etc.
const ANIME_GENRE_NAMES = new Set([
  'Anime', 'Sci-Fi & Anime',
]);

// TMDB genre IDs that strongly suggest anime (used by isAnimeByGenreIds)
const TMDB_ANIME_GENRE_IDS = new Set([
  210783, // (no official anime genre ID in TMDB; reserved for future use)
]);

/**
 * Resolve the content type from available metadata signals.
 * Detection priority: explicit > ID namespace > ID presence > genre > default.
 */
export function resolveContentType(options: {
  id?: number;
  mediaType?: MediaType | string;
  genres?: string[];
  genreIds?: number[];
  isAnime?: boolean;
  malId?: number;
  tag?: string;
}): ContentTypeResult {
  const { id, mediaType, genres = [], genreIds = [], isAnime, malId, tag } = options;

  // 1. Explicit flag (highest confidence)
  if (isAnime === true || tag === 'Anime') {
    return { type: 'anime', confidence: 'high', method: 'explicit' };
  }

  // 2. ID namespace check (AniList IDs are >= ANILIST_ID_OFFSET)
  if (id && isAnilistId(id)) {
    return { type: 'anime', confidence: 'high', method: 'id-namespace' };
  }

  // 3. MAL ID presence strongly suggests anime
  if (malId) {
    return { type: 'anime', confidence: 'high', method: 'id-presence' };
  }

  // 4. Genre-based heuristic
  if (isAnimeByGenres(genres, genreIds)) {
    return { type: 'anime', confidence: 'medium', method: 'genre' };
  }

  // 5. Default: use media_type from metadata
  if (mediaType === 'movie') {
    return { type: 'movie', confidence: 'high', method: 'default' };
  }

  return { type: 'tv', confidence: 'medium', method: 'default' };
}

/**
 * Determine which provider pool to use based on content type.
 */
export function getProviderPoolHint(contentType: ContentTypeResult): ProviderPoolHint {
  if (contentType.type === 'anime') {
    return {
      pool: 'anime',
      reason: `Detected as anime via ${contentType.method}`,
    };
  }
  return {
    pool: 'general',
    reason: `Detected as ${contentType.type} via ${contentType.method}`,
  };
}

/**
 * Check if content is anime based on genre names or TMDB genre IDs.
 */
export function isAnimeByGenres(
  genres: string[],
  genreIds?: number[],
): boolean {
  // Check genre names — 'Anime' is a strong signal
  if (genres.some(g => ANIME_GENRE_NAMES.has(g))) {
    return true;
  }

  // TMDB genre ID 16 (Animation) alone is too broad — includes Pixar, Disney, etc.
  // Only consider it a weak signal; don't trigger anime routing from genre ID alone.
  return false;
}

/**
 * Check if content is anime based on genre IDs only.
 */
export function isAnimeByGenreIds(genreIds: number[]): boolean {
  return genreIds.some(id => TMDB_ANIME_GENRE_IDS.has(id));
}

/**
 * Enrich a content item with local catalog data if available.
 * This is a stub that returns minimal data; real implementation
 * would query the local `content` table via Supabase.
 */
export async function enrichFromCatalog(
  _mediaId: number,
  _contentType: ContentTypeResult,
): Promise<ContentEnrichment> {
  // Placeholder: real implementation queries Supabase content table
  return {
    isAnime: _contentType.type === 'anime',
  };
}

/**
 * Get content metadata for provider selection.
 * Combines ID-based and type-based signals.
 */
export function getContentForSelection(options: {
  id?: number;
  mediaType?: MediaType | string;
  genres?: string[];
  genreIds?: number[];
  isAnime?: boolean;
  malId?: number;
  tag?: string;
}): { contentType: ContentTypeResult; poolHint: ProviderPoolHint } {
  const contentType = resolveContentType(options);
  const poolHint = getProviderPoolHint(contentType);
  return { contentType, poolHint };
}

/**
 * Batch detect anime from a list of media items.
 * Returns a Map of media ID → boolean (true = anime).
 */
export function batchDetectAnime(items: Array<{ id: number; media_type?: string; genres?: string[]; tag?: string }>): Map<number, boolean> {
  const results = new Map<number, boolean>();
  for (const item of items) {
    const ct = resolveContentType({
      id: item.id,
      mediaType: item.media_type,
      genres: item.genres,
      tag: item.tag,
    });
    results.set(item.id, ct.type === 'anime');
  }
  return results;
}

/**
 * Convert a content row from the local catalog DB to a MediaItem.
 */
export function contentRowToMediaItem(row: Record<string, unknown>): MediaItem {
  const episodesPerSeason = (row.episodes_per_season as Record<string, number>) || {};
  const totalEpisodes = Object.entries(episodesPerSeason).reduce(
    (sum, [, v]) => sum + (v as number),
    0,
  );

  return {
    id: row.id as number,
    title: (row.title as string) || 'Untitled',
    sub: (row.tagline as string) || '',
    genre: ((row.genres as string[]) || []).map((g: string) =>
      g === 'Science Fiction' ? 'Sci-Fi' : g,
    ),
    r: (row.rating as number) || 0,
    yr: (row.year as number) || new Date().getFullYear(),
    eps: totalEpisodes || 1,
    st: (row.status as string) || 'Unknown',
    tag: (row.content_type as string) || 'Series',
    cs: Math.abs((row.id as number)) % 8,
    featured: ((row.rating as number) || 0) > 7.5,
    progress: 0,
    desc: (row.overview as string) || '',
    cast: ((row.cast as string[]) || []).slice(0, 8),
    epList: [],
    poster_path: (row.poster_path as string) || null,
    backdrop_path: (row.backdrop_path as string) || null,
    media_type: ((row.content_type as string) === 'movie' ? 'movie' : 'tv') as MediaType,
    _isAnilist: (row.id as number) >= ANILIST_ID_OFFSET,
    _malId: (row.mal_id as number) || undefined,
    _anilistId: (row.anilist_id as number) || undefined,
  };
}