import { NextResponse } from 'next/server';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import { getTrendingAnime, getPopularAnime, getSeasonalAnime } from '@/lib/anilist/client';
import { ANILIST_ID_OFFSET } from '@/types';

// Detail pages sitemap — TMDB + AniList content URLs.
// Reduced API calls for fast generation (~1-2s instead of 5s+).

async function fetchPages(endpoint: string, params?: Record<string, string>, maxPages = 2): Promise<TMDBMediaItem[]> {
  const results: TMDBMediaItem[] = [];
  const promises = Array.from({ length: maxPages }, (_, i) =>
    tmdbFetch<TMDBListResponse<TMDBMediaItem>>(endpoint, { ...params, page: String(i + 1) })
      .then(data => { results.push(...data.results); })
      .catch(() => {})
  );
  await Promise.allSettled(promises);
  return results;
}

export async function GET() {
  const baseUrl = 'https://lumina-stream-omega.vercel.app';
  const now = new Date().toISOString();

  const ids = new Set<number>();

  // TMDB: top 5 core endpoints, 2 pages each (50 total items)
  const coreWork = [
    fetchPages('/trending/all/week', undefined, 2),
    fetchPages('/movie/popular', undefined, 2),
    fetchPages('/tv/popular', undefined, 2),
    fetchPages('/movie/top_rated', undefined, 2),
    fetchPages('/tv/top_rated', undefined, 2),
  ];

  const coreResults = await Promise.allSettled(coreWork);
  for (const r of coreResults) {
    if (r.status === 'fulfilled') for (const item of r.value) ids.add(item.id);
  }

  // AniList: 3 pages each (75 anime)
  const anilistWork = [
    getTrendingAnime(1, 25), getTrendingAnime(2, 25), getTrendingAnime(3, 25),
    getPopularAnime(1, 25), getPopularAnime(2, 25), getPopularAnime(3, 25),
    getSeasonalAnime(undefined, undefined, 1, 25, 'POPULARITY_DESC'),
    getSeasonalAnime(undefined, undefined, 2, 25, 'POPULARITY_DESC'),
  ];

  const anilistResults = await Promise.allSettled(anilistWork);
  for (const r of anilistResults) {
    if (r.status === 'fulfilled') for (const m of r.value.media) ids.add(m.id + ANILIST_ID_OFFSET);
  }

  const urls = Array.from(ids).map(id =>
    `  <url>\n    <loc>${baseUrl}/details/${id}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.8</priority>\n  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}