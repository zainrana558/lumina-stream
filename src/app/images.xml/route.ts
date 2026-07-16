import { CANONICAL_BASE, TMDB_IMAGE_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBMediaItem } from '@/lib/tmdb/server';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { mediaUrl } from '@/lib/slug';
import { NextResponse } from 'next/server';

let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'images';

/**
 * Images sitemap — uses sitemap image extension to expose poster/backdrop URLs
 * for top movies and TV shows. Helps Google Image Search discover content.
 *
 * Namespace: xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
 */

async function fetchPages(endpoint: string, maxPages: number): Promise<TMDBMediaItem[]> {
  const items: TMDBMediaItem[] = [];
  const seen = new Set<number>();
  for (let p = 1; p <= maxPages; p++) {
    try {
      const data = await tmdbFetch<{ results: TMDBMediaItem[] }>(`${endpoint}&page=${p}`);
      for (const item of data?.results || []) {
        if (item.id && !seen.has(item.id)) { seen.add(item.id); items.push(item); }
      }
    } catch { /* continue */ }
  }
  return items;
}

export async function GET() {
  const cacheHeaders = { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' };

  if (inMemoryXml && Date.now() - inMemoryAt < SITEMAP_TTL) {
    return new NextResponse(inMemoryXml, { headers: cacheHeaders });
  }
  const fsCache = await getSitemapCache(CACHE_NAME);
  if (fsCache) { inMemoryXml = fsCache; inMemoryAt = Date.now(); return new NextResponse(fsCache, { headers: cacheHeaders }); }

  const now = new Date().toISOString().split('T')[0];

  try {
    const [popular, topRated, trending] = await Promise.allSettled([
      fetchPages('/movie/popular?language=en-US', 5),
      fetchPages('/tv/popular?language=en-US', 5),
      fetchPages('/trending/all/week?language=en-US', 3),
    ]);

    const seen = new Set<number>();
    const all: TMDBMediaItem[] = [];
    for (const r of [popular, topRated, trending]) {
      if (r.status === 'fulfilled') {
        for (const item of r.value) {
          if (!seen.has(item.id)) { seen.add(item.id); all.push(item); }
        }
      }
    }

    all.sort((a, b) => b.popularity - a.popularity);
    const capped = all.slice(0, 2000);

    const urls = capped.map(item => {
      const title = item.title || item.name || 'Untitled';
      const year = (item.release_date || item.first_air_date)?.slice(0, 4);
      const pageUrl = `${CANONICAL_BASE}${mediaUrl(item.id, title, item.media_type, year)}`;
      const mt = item.media_type === 'tv' ? 'tv' : 'movie';

      const images: string[] = [];
      if (item.poster_path) {
        images.push(`    <image:image>\n      <image:loc>${TMDB_IMAGE_BASE}/w780${item.poster_path}</image:loc>\n      <image:title>${title} (${year || 'N/A'}) - Poster</image:title>\n      <image:caption>Official poster for ${title}</image:caption>\n    </image:image>`);
      }
      if (item.backdrop_path) {
        images.push(`    <image:image>\n      <image:loc>${TMDB_IMAGE_BASE}/w1280${item.backdrop_path}</image:loc>\n      <image:title>${title} (${year || 'N/A'}) - Backdrop</image:title>\n      <image:caption>Backdrop image for ${title}</image:caption>\n    </image:image>`);
      }

      if (images.length === 0) return null;
      return `  <url>\n    <loc>${pageUrl}</loc>\n    <lastmod>${now}</lastmod>\n${images.join('\n')}\n  </url>`;
    }).filter(Boolean).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>`;

    inMemoryXml = xml; inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, { headers: cacheHeaders });
  } catch {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n</urlset>', { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' } });
  }
}