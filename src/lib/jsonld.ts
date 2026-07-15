import { isAnilistId } from '@/types';
import type { MediaItem } from '@/types';
import { mediaUrl } from '@/lib/slug';
import { CANONICAL_BASE } from '@/lib/seo/constants';

/**
 * Build a Schema.org JSON-LD object for a detail page.
 *
 * Returns a `Movie` or `TVSeries` structured-data object depending on the
 * MediaItem's `media_type` / `tag`.
 */
export function buildDetailJsonLd(show: MediaItem, siteUrl: string): object {
  const isMovie = show.media_type === 'movie' || show.tag === 'Movie';
  const type = isMovie ? 'Movie' : 'TVSeries';

  // Image: prefer AniList cover for AniList-sourced items, else TMDB poster
  let image: string | undefined;
  if (isAnilistId(show.id) && show._anilistCover) {
    image = show._anilistCover;
  } else if (show.poster_path) {
    image = `https://image.tmdb.org/t/p/w780${show.poster_path}`;
  }

  // Build ImageObject for the poster
  const imageObject = image ? {
    '@type': 'ImageObject',
    url: image,
    width: isMovie ? 500 : 780,
    height: isMovie ? 750 : 1170,
  } : undefined;

  // Date: MediaItem stores the year as `yr`; format as ISO date string
  const datePublished = show.yr ? `${show.yr}-01-01` : undefined;

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    name: show.title,
    description: show.desc || 'Watch on Lumovia',
    image: imageObject || image,
    datePublished,
    url: `${siteUrl}${mediaUrl(show.id, show.title, show.media_type, show.yr, isAnilistId(show.id))}`,
    sameAs: `${siteUrl}/details/${show.id}`,

    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: show.r,
      bestRating: 10,
      ratingCount: ((show as unknown as Record<string, unknown>).votes as number) || 1,
    },
  };

  // TVSeries-specific fields
  if (!isMovie) {
    if (show.eps) ld.numberOfEpisodes = show.eps;
    const seasons = (show as unknown as Record<string, unknown>).number_of_seasons;
    if (typeof seasons === 'number') ld.numberOfSeasons = seasons;
  }

  return ld;
}