/**
 * L3 — Content-Type-Aware Provider Selection
 *
 * Uses Content Intelligence (L3) to determine the content type
 * and selects the appropriate provider pool before scoring.
 */

import { getContentForSelection } from '@/lib/content/content-intelligence';
import { getAllEmbedUrls, getAnimeEmbedUrls } from '@/lib/streaming/providers';
import { scoreAndSortProviders } from '@/lib/streaming/scoring';
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
 * Uses content intelligence for pool routing, then scores within the pool.
 */
export async function selectProviders(options: SelectionOptions): Promise<EmbedResult[]> {
  const { contentType, poolHint } = getContentForSelection(options);

  let providers: EmbedResult[];

  if (poolHint.pool === 'anime') {
    const effectiveTmdbId = options.id || 0;
    providers = getAnimeEmbedUrls(
      effectiveTmdbId,
      options.season || 1,
      options.episode || 1,
      options.malId,
    );
  } else {
    const type = contentType.type === 'movie' ? 'movie' : 'tv';
    providers = getAllEmbedUrls(
      type,
      options.id || 0,
      options.season,
      options.episode,
    );
  }

  // Score and sort providers
  return scoreAndSortProviders(providers);
}