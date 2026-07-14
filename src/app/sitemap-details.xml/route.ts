import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch } from '@/lib/tmdb/server';
import { browseAllAnime, getTrendingAnime, getTopRatedAnime, getPopularAnime } from '@/lib/anilist/client';
import { ANILIST_ID_OFFSET } from '@/types';
import { NextResponse } from 'next/server';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';

// In-memory cache as L1 (same-instance fast path)
let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_NAME = 'sitemap-details';

/**
 * GET /sitemap-details.xml
 *
 * Dynamic sitemap for detail pages (/details/[id]).
 * Fetches popular/trending/top-rated content from TMDB + AniList and returns
 * a proper XML sitemap. Google discovers the rest via internal links.
 *
 * Cached in-memory for 24 hours + CDN s-maxage=86400.
 */

interface TMDBItem {
  id: number;
  popularity: number;
}

async function fetchTmdbIds(endpoint: string, pages: number = 2): Promise<number[]> {
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

/** Fetch AniList anime IDs and namespace them for our URL scheme */
async function fetchAnilistIds(): Promise<number[]> {
  const ids: number[] = [];
  const seen = new Set<number>();

  try {
    // Fetch from multiple AniList endpoints for broad coverage
    const [trending, popular, topRated, browse] = await Promise.allSettled([
      // Trending anime (3 pages = ~60 titles)
      (async () => {
        const all: number[] = [];
        for (let p = 1; p <= 3; p++) {
          const res = await getTrendingAnime(p, 20);
          all.push(...res.media.map(m => m.id));
        }
        return all;
      })(),
      // Popular all-time (2 pages = ~40 titles)
      (async () => {
        const all: number[] = [];
        for (let p = 1; p <= 2; p++) {
          const res = await getPopularAnime(p, 20);
          all.push(...res.media.map(m => m.id));
        }
        return all;
      })(),
      // Top rated (2 pages = ~40 titles)
      (async () => {
        const all: number[] = [];
        for (let p = 1; p <= 2; p++) {
          const res = await getTopRatedAnime(p, 20);
          all.push(...res.media.map(m => m.id));
        }
        return all;
      })(),
      // Browse all (3 pages = ~75 titles, sorted by popularity)
      (async () => {
        const all: number[] = [];
        for (let p = 1; p <= 3; p++) {
          const res = await browseAllAnime(p, 25);
          all.push(...res.media.map(m => m.id));
        }
        return all;
      })(),
    ]);

    for (const result of [trending, popular, topRated, browse]) {
      if (result.status === 'fulfilled') {
        for (const rawId of result.value) {
          const namespacedId = rawId + ANILIST_ID_OFFSET;
          if (!seen.has(namespacedId)) {
            seen.add(namespacedId);
            ids.push(namespacedId);
          }
        }
      }
    }
  } catch {
    // AniList fetch failed — continue with TMDB-only sitemap
  }

  return ids;
}

export async function GET() {
  const cacheHeaders = { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' };

  // L1: In-memory cache (same warm instance — zero I/O)
  if (inMemoryXml && Date.now() - inMemoryAt < SITEMAP_TTL) {
    return new NextResponse(inMemoryXml, { headers: cacheHeaders });
  }

  // L2: Filesystem cache (/tmp — survives across warm invocations on same instance)
  const fsCache = await getSitemapCache(CACHE_NAME);
  if (fsCache) {
    inMemoryXml = fsCache;
    inMemoryAt = Date.now();
    return new NextResponse(fsCache, { headers: cacheHeaders });
  }

  const now = new Date().toISOString().split('T')[0];

  try {
    // Fetch popular content from 8 core TMDB endpoints (reduced from 22)
    const [
      trending,
      popularMovies,
      popularTv,
      topRatedMovies,
      topRatedTv,
      nowPlaying,
      onTheAir,
      topAnimation,
      anilistIds,
    ] = await Promise.all([
      fetchTmdbIds('/trending/all/week?language=en-US', 2),
      fetchTmdbIds('/movie/popular?language=en-US', 3),
      fetchTmdbIds('/tv/popular?language=en-US', 2),
      fetchTmdbIds('/movie/top_rated?language=en-US', 2),
      fetchTmdbIds('/tv/top_rated?language=en-US', 2),
      fetchTmdbIds('/movie/now_playing?language=en-US', 2),
      fetchTmdbIds('/tv/on_the_air?language=en-US', 2),
      fetchTmdbIds('/discover/movie?with_genres=16&sort_by=popularity.desc&language=en-US', 2),
      fetchAnilistIds(),
    ]);

    // Deduplicate while preserving order (trending first for freshness)
    const seen = new Set<number>();
    const uniqueIds: number[] = [];
    const allSources = [...trending, ...popularMovies, ...popularTv, ...topRatedMovies, ...topRatedTv, ...nowPlaying, ...onTheAir, ...topAnimation, ...anilistIds];

    for (const id of allSources) {
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

    // Cache: in-memory + filesystem for 24h
    inMemoryXml = xml;
    inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
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
        'Cache-Control': 'public, s-maxage=300',
      },
    });
  }
}