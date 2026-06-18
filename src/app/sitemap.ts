import type { MetadataRoute } from 'next';
import { PORTAL_SLUGS, PORTAL_GENRES, BROWSE_ONLY_GENRES, TMDB_GENRE_NAME_MAP } from '@/config/genres';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem, type TMDBPerson } from '@/lib/tmdb/server';
import { getTrendingAnime, getPopularAnime, getSeasonalAnime } from '@/lib/anilist/client';
import { ANILIST_ID_OFFSET } from '@/types';

const DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s'] as const;
const CURRENT_YEAR = new Date().getFullYear();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app';
  const now = new Date();

  // ════════════════════════════════════════════════════════════════════
  // STATIC / SEMI-STATIC ROUTES
  // ════════════════════════════════════════════════════════════════════
  const staticRoutes: MetadataRoute.Sitemap = [
    // Core pages
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/browse`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/seasonal`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/release-calendar`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },

    // NEW: Format-specific pages
    { url: `${baseUrl}/movies`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/tv-shows`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/top-rated`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/new-releases`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },

    // NEW: Hub / info pages
    { url: `${baseUrl}/genres`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

    // Genre portal pages (themed) — higher priority
    ...PORTAL_SLUGS.map(slug => ({
      url: `${baseUrl}/genre/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),

    // NEW: Decade pages
    ...DECADES.map(decade => ({
      url: `${baseUrl}/decade/${decade}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),

    // NEW: Year pages (current year ± 5)
    ...Array.from({ length: 12 }, (_, i) => {
      const year = CURRENT_YEAR + 1 - i;
      return {
        url: `${baseUrl}/year/${year}`,
        lastModified: now,
        changeFrequency: year >= CURRENT_YEAR ? ('weekly' as const) : ('monthly' as const),
        priority: year >= CURRENT_YEAR ? 0.8 : 0.6,
      };
    }),

    // Browse-only genre pages (query-based)
    ...BROWSE_ONLY_GENRES.map(name => ({
      url: `${baseUrl}/browse?genre=${encodeURIComponent(name)}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];

  // ════════════════════════════════════════════════════════════════════
  // DYNAMIC CONTENT URL DISCOVERY
  // ════════════════════════════════════════════════════════════════════
  const tmdbDetailIds = new Set<number>();
  const personIds = new Set<number>();
  const anilistDetailIds = new Set<number>();

  // Helper: fetch multiple pages from an endpoint
  async function fetchPages(endpoint: string, params?: Record<string, string>, maxPages = 3): Promise<TMDBMediaItem[]> {
    const results: TMDBMediaItem[] = [];
    const promises = Array.from({ length: maxPages }, (_, i) =>
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>(endpoint, { ...params, page: String(i + 1) })
        .then(data => { results.push(...data.results); })
        .catch(() => {})
    );
    await Promise.allSettled(promises);
    return results;
  }

  // ── TMDB: core endpoints (5 pages each) ──
  const coreEndpoints = [
    { endpoint: '/trending/all/week', pages: 5 },
    { endpoint: '/trending/movie/week', pages: 5 },
    { endpoint: '/trending/tv/week', pages: 5 },
    { endpoint: '/movie/popular', pages: 5 },
    { endpoint: '/tv/popular', pages: 5 },
    { endpoint: '/movie/top_rated', pages: 5 },
    { endpoint: '/tv/top_rated', pages: 5 },
    { endpoint: '/movie/now_playing', pages: 3 },
    { endpoint: '/movie/upcoming', pages: 3 },
    { endpoint: '/tv/airing_today', pages: 3 },
    { endpoint: '/tv/on_the_air', pages: 3 },
  ];

  const corePromises = coreEndpoints.map(({ endpoint, pages }) =>
    fetchPages(endpoint, undefined, pages).then(items => {
      for (const item of items) tmdbDetailIds.add(item.id);
    })
  );

  // ── TMDB: discover by ALL genres (movie + TV) ──
  const allGenreIds = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37];
  const genreDiscoverPromises = allGenreIds.map(genreId =>
    Promise.all([
      fetchPages('/discover/movie', { with_genres: String(genreId), sort_by: 'popularity.desc', vote_count_gte: '20' }, 2),
      fetchPages('/discover/tv', { with_genres: String(genreId), sort_by: 'popularity.desc', vote_count_gte: '20' }, 2),
    ]).then(([movieItems, tvItems]) => {
      for (const item of movieItems) tmdbDetailIds.add(item.id);
      for (const item of tvItems) tmdbDetailIds.add(item.id);
    })
  );

  // ── NEW: TMDB: decade-specific discovers (2020s movies + TV) ──
  const decadeDiscoverPromises = DECADES.slice(0, 3).map(decade => {
    const [startYear, endYear] = {
      '2020s': ['2020', '2029'], '2010s': ['2010', '2019'], '2000s': ['2000', '2009'],
    }[decade] as [string, string];
    return Promise.all([
      fetchPages('/discover/movie', {
        sort_by: 'popularity.desc', 'primary_release_date.gte': `${startYear}-01-01`,
        'primary_release_date.lte': `${endYear}-12-31`, 'vote_count.gte': '50',
      }, 2),
      fetchPages('/discover/tv', {
        sort_by: 'popularity.desc', 'first_air_date.gte': `${startYear}-01-01`,
        'first_air_date.lte': `${endYear}-12-31`, 'vote_count.gte': '50',
      }, 2),
    ]).then(([movieItems, tvItems]) => {
      for (const item of movieItems) tmdbDetailIds.add(item.id);
      for (const item of tvItems) tmdbDetailIds.add(item.id);
    });
  });

  // ── TMDB: popular people ──
  const peoplePromises: Promise<void>[] = Array.from({ length: 5 }, (_, i) =>
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week', { page: String(i + 1) })
      .then(data => { for (const p of data.results) personIds.add(p.id); })
      .catch(() => {})
  );
  peoplePromises.push(
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: '1' })
      .then(data => { for (const p of data.results) personIds.add(p.id); })
      .catch(() => {})
  );

  await Promise.allSettled([...corePromises, ...genreDiscoverPromises, ...decadeDiscoverPromises, ...peoplePromises]);

  // ── AniList: trending + popular + seasonal ──
  const anilistPromises: Promise<void>[] = [];
  for (let page = 1; page <= 10; page++) {
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
  for (let page = 1; page <= 5; page++) {
    anilistPromises.push(
      getSeasonalAnime(undefined, undefined, page, 25, 'POPULARITY_DESC').then(data => {
        for (const media of data.media) anilistDetailIds.add(media.id + ANILIST_ID_OFFSET);
      }).catch(() => {})
    );
  }
  await Promise.allSettled(anilistPromises);

  // ════════════════════════════════════════════════════════════════════
  // BUILD URLS (NO CAP)
  // ════════════════════════════════════════════════════════════════════

  // Detail URLs
  const detailRoutes: MetadataRoute.Sitemap = [];
  for (const id of tmdbDetailIds) {
    detailRoutes.push({ url: `${baseUrl}/details/${id}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 });
  }
  for (const id of anilistDetailIds) {
    detailRoutes.push({ url: `${baseUrl}/details/${id}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 });
  }

  // Person URLs
  const personRoutes: MetadataRoute.Sitemap = [];
  for (const id of personIds) {
    personRoutes.push({ url: `${baseUrl}/person/${id}`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
  }

  return [...staticRoutes, ...detailRoutes, ...personRoutes];
}