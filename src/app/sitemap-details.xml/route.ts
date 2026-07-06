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
    // Fetch popular content across multiple categories
    const [popularMovies, popularTv, topRated, trending, nowPlaying, onTheAir] = await Promise.all([
      fetchTmdbIds('/movie/popular?language=en-US', 5),
      fetchTmdbIds('/tv/popular?language=en-US', 5),
      fetchTmdbIds('/movie/top_rated?language=en-US', 3),
      fetchTmdbIds('/trending/all/week?language=en-US', 3),
      fetchTmdbIds('/movie/now_playing?language=en-US', 2),
      fetchTmdbIds('/tv/on_the_air?language=en-US', 2),
    ]);

    // Deduplicate while preserving order (trending first for freshness)
    const seen = new Set<number>();
    const uniqueIds: number[] = [];
    for (const id of [...trending, ...popularMovies, ...popularTv, ...topRated, ...nowPlaying, ...onTheAir]) {
      if (!seen.has(id)) {
        seen.add(id);
        uniqueIds.push(id);
      }
    }

    // Cap at 5000 URLs
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