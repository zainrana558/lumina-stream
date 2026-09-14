/**
 * Movie/TVSeries ItemList structured data for listing pages.
 *
 * Google's structured-data docs for Movie markup: wrap multiple titles in
 * an ItemList (itemListElement of ListItems, each holding a Movie/TVSeries
 * at `item`) to become eligible for the movie-list carousel rich result.
 * Distinct from BreadcrumbList, which also uses itemListElement but for
 * page navigation — pages need both, not one instead of the other.
 */

import { mediaUrl } from '@/lib/slug';
import { getPosterUrl } from '@/lib/images';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import type { MediaItem } from '@/types';

export function buildMovieItemListJsonLd(shows: MediaItem[], limit = 20) {
  const items = shows.slice(0, limit).filter((s) => s.poster_path || s._anilistCover);
  if (items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((show, i) => {
      const mediaType = show.media_type === 'tv' ? 'tv' : 'movie';
      const url = `${CANONICAL_BASE}${mediaUrl(show.id, show.title, mediaType, show.yr, show._isAnilist)}`;
      const poster = getPosterUrl(show, 'w500');
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': mediaType === 'tv' ? 'TVSeries' : 'Movie',
          name: show.title,
          url,
          ...(poster ? { image: poster } : {}),
          ...(show.yr ? { dateCreated: String(show.yr) } : {}),
          ...(show.r > 0 ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: show.r,
              bestRating: '10',
            },
          } : {}),
        },
      };
    }),
  };
}
