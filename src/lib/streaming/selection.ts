/**
 * L3 — Content-Type-Aware Provider Selection
 *
 * Now delegates to the Provider Intelligence Layer for scoring and routing.
 * Maintains backward compatibility with the selectProviders() API.
 */

import { selectWithIntelligence, type ScoredProvider } from '@/lib/streaming/provider-intelligence';
import type { EmbedResult } from '@/lib/streaming/providers';
import type { MediaType } from '@/types';

export interface SelectionOptions {
  id?: number;
  mediaType?: MediaType | string;
  genres?: string[];
  genreIds?: number[];
  isAnime?: boolean;
  malId?: number;
  tag?: string;
  season?: number;
  episode?: number;
}

/**
 * Select the best providers for a given content item.
 * Delegates to the Provider Intelligence Layer for intelligent scoring.
 * Returns providers ordered by intelligence score (highest first).
 */
export async function selectProviders(options: SelectionOptions): Promise<EmbedResult[]> {
  const result = await selectWithIntelligence({
    tmdbId: options.id,
    malId: options.malId,
    mediaType: (options.mediaType as 'movie' | 'tv') || undefined,
    season: options.season,
    episode: options.episode,
    isAnime: options.isAnime,
    genres: options.genres,
    genreIds: options.genreIds,
  });

  // Convert chain back to EmbedResult format
  return result.chain.map(item => ({
    name: item.provider,
    url: item.url,
    tier: item.tier as EmbedResult['tier'],
    category: (item.category === 'anime' ? 'anime' : 'all') as EmbedResult['category'],
  }));
}

/**
 * Select providers and return full scoring details.
 * Used by admin/debug endpoints.
 */
export async function selectProvidersWithScores(options: SelectionOptions): Promise<ScoredProvider[]> {
  const result = await selectWithIntelligence({
    tmdbId: options.id,
    malId: options.malId,
    mediaType: (options.mediaType as 'movie' | 'tv') || undefined,
    season: options.season,
    episode: options.episode,
    isAnime: options.isAnime,
    genres: options.genres,
    genreIds: options.genreIds,
  });

  return result.chain.map(item => ({
    name: item.provider,
    url: item.url,
    tier: item.tier as EmbedResult['tier'],
    category: (item.category === 'anime' ? 'anime' : 'all') as EmbedResult['category'],
    score: item.score,
    signals: {
      availability: 0,
      responseSpeed: 0,
      subtitleSupport: 0,
      quality: 0,
      historicalSuccess: 0,
      learnedBonus: 0,
    },
  }));
}