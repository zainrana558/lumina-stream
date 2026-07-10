import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch } from '@/lib/tmdb/server';
import { NextResponse } from 'next/server';

/**
 * GET /sitemap-details.xml
 *
 * Dynamic sitemap for detail pages (/details/[id]).
 * Fetches popular/trending/top-rated content from TMDB and returns
 * a proper XML sitemap. Google discovers the rest via internal links.
 *
 * Revalidated via cache headers (1 hour).
 */

interface TMDBItem {
  id: number;
  popularity: number;
}

async function fetchTmdbIds(endpoint: string, pages: number = 3): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const data = await tmdbFetch<{ results: TMDBItem[] }>(`${endpoint}&page=${page}`);
      if (data?.results) {
        for (const item of data.results) {
          if (item.id && !ids.includes(item.id)) {
            ids.push(item.id);
          }
        }
      }
    } catch {
      // Continue with what we have
    }
  }
  return ids;
}

export async function GET() {
  const now = new Date().toISOString().split('T')[0];

  try {
    // Fetch popular content across MANY categories for maximum URL coverage
    const [
      trending,
      popularMovies,
      popularTv,
      topRatedMovies,
      topRatedTv,
      nowPlaying,
      onTheAir,
      upcoming,
      animationMovies,
      animationTv,
      discoverAction,
      discoverDrama,
      discoverComedy,
      discoverHorror,
      discoverSciFi,
      discoverRomance,
      discoverThriller,
      discoverAnimation,
      discoverCrime,
      discoverDocumentary,
      discoverFantasy,
      discoverMystery,
    ] = await Promise.all([
      fetchTmdbIds('/trending/all/week?language=en-US', 5),
      fetchTmdbIds('/movie/popular?language=en-US', 5),
      fetchTmdbIds('/tv/popular?language=en-US', 5),
      fetchTmdbIds('/movie/top_rated?language=en-US', 5),
      fetchTmdbIds('/tv/top_rated?language=en-US', 5),
      fetchTmdbIds('/movie/now_playing?language=en-US', 3),
      fetchTmdbIds('/tv/on_the_air?language=en-US', 3),
      fetchTmdbIds('/movie/upcoming?language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=16&sort_by=popularity.desc&language=en-US', 3),
      fetchTmdbIds('/discover/tv?with_genres=16&sort_by=popularity.desc&language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=28&sort_by=popularity.desc&language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=18&sort_by=popularity.desc&language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=35&sort_by=popularity.desc&language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=27&sort_by=popularity.desc&language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=878&sort_by=popularity.desc&language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=10749&sort_by=popularity.desc&language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=53&sort_by=popularity.desc&language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=16&sort_by=vote_average.desc&vote_count.gte=100&language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=80&sort_by=popularity.desc&language=en-US', 2),
      fetchTmdbIds('/discover/movie?with_genres=99&sort_by=popularity.desc&language=en-US', 2),
      fetchTmdbIds('/discover/movie?with_genres=14&sort_by=popularity.desc&language=en-US', 3),
      fetchTmdbIds('/discover/movie?with_genres=9648&sort_by=popularity.desc&language=en-US', 3),
    ]);

    // Deduplicate while preserving order (trending first for freshness)
    const seen = new Set<number>();
    const uniqueIds: number[] = [];
    for (const id of [...trending, ...popularMovies, ...popularTv, ...topRatedMovies, ...topRatedTv, ...nowPlaying, ...onTheAir, ...upcoming, ...animationMovies, ...animationTv, ...discoverAction, ...discoverDrama, ...discoverComedy, ...discoverHorror, ...discoverSciFi, ...discoverRomance, ...discoverThriller, ...discoverAnimation, ...discoverCrime, ...discoverDocumentary, ...discoverFantasy, ...discoverMystery]) {
      if (!seen.has(id)) {
        seen.add(id);
        uniqueIds.push(id);
      }
    }

    // Cap at 5000 URLs (sitemap protocol limit is 50,000, we stay well under)
    const urls = uniqueIds.slice(0, 5000);

    // Build XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(id => `  <url>
    <loc>${CANONICAL_BASE}/details/${id}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch {
    // Return empty sitemap on error
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=60',
      },
    });
  }
}