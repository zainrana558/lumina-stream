import type { MetadataRoute } from 'next';
import { PORTAL_SLUGS, BROWSE_ONLY_GENRES, TMDB_GENRE_NAME_MAP } from '@/config/genres';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem, type TMDBPerson } from '@/lib/tmdb/server';
import { getTrendingAnime, getPopularAnime } from '@/lib/anilist/client';
import { ANILIST_ID_OFFSET } from '@/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app';
  const now = new Date();

  // ── Static / semi-static routes ──────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/browse`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/watchlist`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/seasonal`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/release-calendar`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    // Genre portal pages (themed)
    ...PORTAL_SLUGS.map(slug => ({
      url: `${baseUrl}/genre/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // Browse-only genre pages (query-param based, but still indexable)
    ...BROWSE_ONLY_GENRES.map(name => {
      const slug = name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
      return {
        url: `${baseUrl}/browse?genre=${encodeURIComponent(name)}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      };
    }),
  ];

  // ── Fetch dynamic IDs ────────────────────────────────────────────────
  const tmdbDetailIds = new Set<number>();
  const personIds = new Set<number>();
  const anilistDetailIds = new Set<number>();

  // TMDB: trending, popular, top_rated (movies + TV) — multiple pages each
  const tmdbEndpoints = [
    '/trending/movie/week',
    '/trending/movie/day',
    '/trending/tv/week',
    '/trending/tv/day',
    '/movie/popular',
    '/movie/top_rated',
    '/movie/now_playing',
    '/movie/upcoming',
    '/tv/popular',
    '/tv/top_rated',
    '/tv/airing_today',
    '/tv/on_the_air',
  ];

  // Fetch 3 pages per endpoint for broader coverage
  const fetchPromises: Promise<void>[] = [];
  for (const endpoint of tmdbEndpoints) {
    for (let page = 1; page <= 3; page++) {
      fetchPromises.push(
        (async () => {
          try {
            const data = await tmdbFetch<TMDBListResponse<TMDBMediaItem>>(endpoint, { page: String(page) });
            for (const item of data.results) {
              tmdbDetailIds.add(item.id);
            }
          } catch { /* skip */ }
        })()
      );
    }
  }

  // TMDB: discover by major genres for more coverage
  const majorGenreIds = [28, 12, 16, 35, 18, 27, 10749, 9648, 14, 878, 53, 80];
  for (const genreId of majorGenreIds) {
    for (const mediaType of ['movie', 'tv'] as const) {
      fetchPromises.push(
        (async () => {
          try {
            const data = await tmdbFetch<TMDBListResponse<TMDBMediaItem>>(
              `/discover/${mediaType}`,
              { with_genres: String(genreId), sort_by: 'popularity.desc', page: '1', vote_count_gte: '30' }
            );
            for (const item of data.results) {
              tmdbDetailIds.add(item.id);
            }
          } catch { /* skip */ }
        })()
      );
    }
  }

  await Promise.allSettled(fetchPromises);

  // TMDB: trending people — 3 pages
  for (let page = 1; page <= 3; page++) {
    try {
      const people = await tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week', { page: String(page) });
      for (const person of people.results) {
        personIds.add(person.id);
      }
    } catch { /* skip */ }
  }

  // AniList: trending + popular anime — 5 pages each
  const anilistPromises = [];
  for (let page = 1; page <= 5; page++) {
    anilistPromises.push(
      getTrendingAnime(page, 25).then(data => {
        for (const media of data.media) anilistDetailIds.add(media.id + ANILIST_ID_OFFSET);
      }).catch(() => {})
    );
    anilistPromises.push(
      getPopularAnime(page, 25).then(data => {
        for (const media of data.media) anilistDetailIds.add(media.id + ANILIST_ID_OFFSET);
      }).catch(() => {})
    );
  }
  await Promise.allSettled(anilistPromises);

  // ── Build dynamic detail URLs (deduplicated, no cap) ─────────────────
  const detailRoutes: MetadataRoute.Sitemap = [];
  for (const id of tmdbDetailIds) {
    detailRoutes.push({
      url: `${baseUrl}/details/${id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }
  for (const id of anilistDetailIds) {
    detailRoutes.push({
      url: `${baseUrl}/details/${id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // ── Person detail URLs ──────────────────────────────────────────────
  const personRoutes: MetadataRoute.Sitemap = [];
  for (const id of personIds) {
    personRoutes.push({
      url: `${baseUrl}/person/${id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  return [...staticRoutes, ...detailRoutes, ...personRoutes];
}