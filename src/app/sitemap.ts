import type { MetadataRoute } from 'next';
import { PORTAL_SLUGS } from '@/config/genres';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem, type TMDBPerson } from '@/lib/tmdb/server';
import { getTrendingAnime, getPopularAnime } from '@/lib/anilist/client';
import { ANILIST_ID_OFFSET } from '@/types';

const MAX_DETAIL_URLS = 500;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app';
  const now = new Date();

  // ── Static / semi-static routes ──────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/browse`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/watchlist`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    // Public feature pages
    { url: `${baseUrl}/seasonal`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/release-calendar`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    // Genre portal pages
    ...PORTAL_SLUGS.map(slug => ({
      url: `${baseUrl}/genre/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];

  // ── Fetch dynamic IDs ────────────────────────────────────────────────
  const tmdbDetailIds = new Set<number>();
  const personIds = new Set<number>();
  const anilistDetailIds = new Set<number>();

  // TMDB: trending, popular, top_rated (movies + TV)
  const tmdbEndpoints = [
    '/trending/movie/week',
    '/trending/tv/week',
    '/movie/popular',
    '/tv/popular',
    '/movie/top_rated',
    '/tv/top_rated',
  ];

  for (const endpoint of tmdbEndpoints) {
    try {
      const data = await tmdbFetch<TMDBListResponse<TMDBMediaItem>>(endpoint);
      for (const item of data.results) {
        tmdbDetailIds.add(item.id);
      }
    } catch {
      // Silently skip failed fetches
    }
  }

  // TMDB: trending people
  try {
    const people = await tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week');
    for (const person of people.results) {
      personIds.add(person.id);
    }
  } catch {
    // Silently skip
  }

  // AniList: trending + popular anime
  try {
    const [trending, popular] = await Promise.all([
      getTrendingAnime(1, 25),
      getPopularAnime(1, 25),
    ]);
    for (const media of trending.media) {
      anilistDetailIds.add(media.id + ANILIST_ID_OFFSET);
    }
    for (const media of popular.media) {
      anilistDetailIds.add(media.id + ANILIST_ID_OFFSET);
    }
  } catch {
    // Silently skip
  }

  // ── Build dynamic detail URLs (deduplicated, capped) ─────────────────
  const detailRoutes: MetadataRoute.Sitemap = [];

  // TMDB detail pages (use raw TMDB IDs)
  const allTmdbIds = [...tmdbDetailIds].slice(0, MAX_DETAIL_URLS);
  for (const id of allTmdbIds) {
    detailRoutes.push({
      url: `${baseUrl}/details/${id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // AniList detail pages (use namespaced IDs = id + ANILIST_ID_OFFSET)
  const remaining = MAX_DETAIL_URLS - detailRoutes.length;
  const anilistIds = [...anilistDetailIds].slice(0, remaining);
  for (const id of anilistIds) {
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
