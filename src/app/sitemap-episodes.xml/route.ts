import { NextResponse } from 'next/server';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';

/**
 * Episode sitemap — Programmatic SEO for individual episode landing pages.
 *
 * Strategy: Include episodes for the top ~40 popular/trending TV shows.
 * Each show includes all seasons (capped at 99 seasons, 24 episodes per season).
 * As Google indexes these, it discovers the URL pattern and can follow
 * internal links to deeper seasons/episodes.
 *
 * Movies are excluded (single-episode content has no per-episode routes).
 * AniList anime is excluded until per-episode detail queries are added.
 */

interface TMDBEpisode {
  episode_number: number;
}

export async function GET() {
  const baseUrl = 'https://lumina-stream-omega.vercel.app';
  const now = new Date().toISOString();

  // 1. Fetch top TV shows (popular + top_rated, 2 pages each = ~40 shows)
  const tvShows: TMDBMediaItem[] = [];

  async function fetchTvPages(endpoint: string, maxPages = 2) {
    const promises = Array.from({ length: maxPages }, (_, i) =>
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>(endpoint, { page: String(i + 1) })
        .then(data => { tvShows.push(...data.results.filter(r => r.media_type === 'tv' || !r.media_type)); })
        .catch(() => {})
    );
    await Promise.allSettled(promises);
  }

  await Promise.allSettled([
    fetchTvPages('/tv/popular', 2),
    fetchTvPages('/tv/top_rated', 2),
  ]);

  // Deduplicate
  const seen = new Set<number>();
  const uniqueShows = tvShows.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  }).slice(0, 40); // Cap at 40 shows

  // 2. Fetch all seasons for each show (parallel, with error tolerance)
  const MAX_SEASONS = 99;
  const MAX_EPS_PER_SEASON = 24;
  const episodeUrls: string[] = [];

  const episodePromises = uniqueShows.map(async (show) => {
    // First, get the total number of seasons (1 API call)
    let totalSeasons = MAX_SEASONS;
    try {
      const showData = await tmdbFetch<{ number_of_seasons?: number }>(`/tv/${show.id}`).catch(() => null);
      if (showData?.number_of_seasons) {
        totalSeasons = Math.min(showData.number_of_seasons, MAX_SEASONS);
      }
    } catch { /* default to 3 */ }

    const seasonPromises = Array.from({ length: totalSeasons }, (_, i) =>
      tmdbFetch<{ episodes: TMDBEpisode[] }>(`/tv/${show.id}/season/${i + 1}`)
        .then(seasonData => {
          const episodes = seasonData?.episodes || [];
          for (const ep of episodes.slice(0, MAX_EPS_PER_SEASON)) {
            episodeUrls.push(
              `  <url>\n    <loc>${baseUrl}/details/${show.id}/season/${i + 1}/episode/${ep.episode_number}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.6</priority>\n  </url>`
            );
          }
        })
        .catch(() => {})
    );
    await Promise.allSettled(seasonPromises);
  });

  await Promise.allSettled(episodePromises);

  // 3. Also include trending TV (might have shows not in popular/top_rated)
  try {
    const trending = await tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/trending/tv/week', { page: '1' });
    for (const show of trending.results.slice(0, 10)) {
      if (seen.has(show.id)) continue;
      seen.add(show.id);
      try {
        const seasonPromises = Array.from({ length: MAX_SEASONS }, (_, i) =>
          tmdbFetch<{ episodes: TMDBEpisode[] }>(`/tv/${show.id}/season/${i + 1}`)
            .then(seasonData => {
              const episodes = seasonData?.episodes || [];
              for (const ep of episodes.slice(0, MAX_EPS_PER_SEASON)) {
                episodeUrls.push(
                  `  <url>\n    <loc>${baseUrl}/details/${show.id}/season/${i + 1}/episode/${ep.episode_number}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.6</priority>\n  </url>`
                );
              }
            })
            .catch(() => {})
        );
        await Promise.allSettled(seasonPromises);
      } catch { /* skip */ }
    }
  } catch { /* skip trending fetch */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${episodeUrls.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}