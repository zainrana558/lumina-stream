import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch } from '@/lib/tmdb/server';
import { browseAllAnime, getTrendingAnime, getTopRatedAnime, getPopularAnime, getAniListTitle, type AniListMedia } from '@/lib/anilist/client';
import { ANILIST_ID_OFFSET } from '@/types';
import { NextResponse } from 'next/server';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { mediaUrl } from '@/lib/slug';

// In-memory cache as L1 (same-instance fast path)
let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_NAME = 'sitemap-details';

/**
 * GET /sitemap-details.xml
 *
 * Dynamic sitemap for media detail pages (clean slug-based URLs).
 * Fetches popular/trending/top-rated content from TMDB + AniList and returns
 * a proper XML sitemap. Google discovers the rest via internal links.
 *
 * Cached in-memory for 24 hours + CDN s-maxage=86400.
 */

interface TMDBItemWithSlug {
  id: number;
  popularity: number;
  title?: string;
  name?: string;
  media_type?: string;
  release_date?: string;
  first_air_date?: string;
}

async function fetchTmdbItems(endpoint: string, pages: number = 2): Promise<TMDBItemWithSlug[]> {
  const items: TMDBItemWithSlug[] = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const data = await tmdbFetch<{ results: TMDBItemWithSlug[] }>(`${endpoint}&page=${page}`);
      if (data?.results) {
        for (const item of data.results) {
          if (item.id && !items.find(i => i.id === item.id)) {
            items.push(item);
          }
        }
      }
    } catch {
      // Continue with what we have
    }
  }
  return items;
}

interface AnilistItem {
  id: number; // namespaced
  title: string;
  year?: number;
}

/** Fetch AniList anime with titles for clean URLs */
async function fetchAnilistItems(): Promise<AnilistItem[]> {
  const items: AnilistItem[] = [];
  const seen = new Set<number>();

  function addItems(media: Array<{ id: number; title: { romaji: string | null; english: string | null; native: string | null }; startDate: { year: number | null } | null }>) {
    for (const m of media) {
      const namespacedId = m.id + ANILIST_ID_OFFSET;
      if (!seen.has(namespacedId)) {
        seen.add(namespacedId);
        items.push({
          id: namespacedId,
          title: getAniListTitle(m),
          year: m.startDate?.year ?? undefined,
        });
      }
    }
  }

  try {
    // Fetch from multiple AniList endpoints for broad coverage
    const [trending, popular, topRated, browse] = await Promise.allSettled([
      // Trending anime (3 pages = ~60 titles)
      (async () => {
        const all: AniListMedia[] = [];
        for (let p = 1; p <= 3; p++) {
          const res = await getTrendingAnime(p, 20);
          all.push(...res.media);
        }
        return all;
      })(),
      // Popular all-time (2 pages = ~40 titles)
      (async () => {
        const all: AniListMedia[] = [];
        for (let p = 1; p <= 2; p++) {
          const res = await getPopularAnime(p, 20);
          all.push(...res.media);
        }
        return all;
      })(),
      // Top rated (2 pages = ~40 titles)
      (async () => {
        const all: AniListMedia[] = [];
        for (let p = 1; p <= 2; p++) {
          const res = await getTopRatedAnime(p, 20);
          all.push(...res.media);
        }
        return all;
      })(),
      // Browse all (3 pages = ~75 titles, sorted by popularity)
      (async () => {
        const all: AniListMedia[] = [];
        for (let p = 1; p <= 3; p++) {
          const res = await browseAllAnime(p, 25);
          all.push(...res.media);
        }
        return all;
      })(),
    ]);

    for (const result of [trending, popular, topRated, browse]) {
      if (result.status === 'fulfilled') {
        addItems(result.value);
      }
    }
  } catch {
    // AniList fetch failed — continue with TMDB-only sitemap
  }

  return items;
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
      anilistItems,
    ] = await Promise.all([
      fetchTmdbItems('/trending/all/week?language=en-US', 2),
      fetchTmdbItems('/movie/popular?language=en-US', 3),
      fetchTmdbItems('/tv/popular?language=en-US', 2),
      fetchTmdbItems('/movie/top_rated?language=en-US', 2),
      fetchTmdbItems('/tv/top_rated?language=en-US', 2),
      fetchTmdbItems('/movie/now_playing?language=en-US', 2),
      fetchTmdbItems('/tv/on_the_air?language=en-US', 2),
      fetchTmdbItems('/discover/movie?with_genres=16&sort_by=popularity.desc&language=en-US', 2),
      fetchAnilistItems(),
    ]);

    // Deduplicate TMDB items while preserving order (trending first for freshness)
    const seen = new Set<number>();
    const uniqueTmdbItems: TMDBItemWithSlug[] = [];
    const allTmdbSources = [...trending, ...popularMovies, ...popularTv, ...topRatedMovies, ...topRatedTv, ...nowPlaying, ...onTheAir, ...topAnimation];

    for (const item of allTmdbSources) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniqueTmdbItems.push(item);
      }
    }

    // Deduplicate AniList items
    for (const item of anilistItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
      }
    }

    // Cap at 5000 URLs (sitemap protocol limit is 50,000, we stay well under)
    const cappedTmdb = uniqueTmdbItems.slice(0, 5000);
    const cappedAnilist = anilistItems.filter(a => seen.has(a.id)).slice(0, Math.max(0, 5000 - cappedTmdb.length));

    // Build XML
    const tmdbXml = cappedTmdb.map(item => `  <url>
    <loc>${CANONICAL_BASE}${mediaUrl(item.id, item.title || item.name || '', item.media_type, (item.release_date || item.first_air_date)?.slice(0, 4))}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n');

    const anilistXml = cappedAnilist.map(item => `  <url>
    <loc>${CANONICAL_BASE}${mediaUrl(item.id, item.title, 'tv', item.year, true)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${tmdbXml}
${anilistXml}
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