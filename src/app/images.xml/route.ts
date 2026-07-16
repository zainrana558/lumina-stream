import { CANONICAL_BASE, TMDB_IMAGE_BASE } from '@/lib/seo/constants';
import { tmdbFetchPages, tmdbSitemapFetch } from '@/lib/tmdb/sitemap-fetch';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { mediaUrl } from '@/lib/slug';
import { fallbackUrl, escXml } from '@/lib/escXml';
import { NextResponse } from 'next/server';

let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'images';

interface TMDBMediaItem {
  id: number;
  title?: string;
  name?: string;
  media_type?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  popularity: number;
}

/**
 * Images sitemap — Google Image sitemap extension.
 * Namespace: xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
 */
export async function GET() {
  const cacheHeaders = { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' };

  if (inMemoryXml && Date.now() - inMemoryAt < SITEMAP_TTL) {
    return new NextResponse(inMemoryXml, { headers: cacheHeaders });
  }
  const fsCache = await getSitemapCache(CACHE_NAME);
  if (fsCache) { inMemoryXml = fsCache; inMemoryAt = Date.now(); return new NextResponse(fsCache, { headers: cacheHeaders }); }

  const now = new Date().toISOString().split('T')[0];

  try {
    const [popular, topRated, trending] = await Promise.all([
      tmdbFetchPages<TMDBMediaItem>('/movie/popular', 5, { region: 'US' }),
      tmdbFetchPages<TMDBMediaItem>('/tv/popular', 5),
      tmdbFetchPages<TMDBMediaItem>('/trending/all/week', 3),
    ]);

    const seen = new Set<number>();
    const all: TMDBMediaItem[] = [];
    for (const batch of [popular, topRated, trending]) {
      for (const item of batch) {
        if (!seen.has(item.id)) { seen.add(item.id); all.push(item); }
      }
    }

    all.sort((a, b) => b.popularity - a.popularity);
    const capped = all.slice(0, 2000);

    const urls = capped.map(item => {
      const title = escXml(item.title || item.name || 'Untitled');
      const year = (item.release_date || item.first_air_date)?.slice(0, 4) || 'N/A';
      const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
      const pageUrl = `${CANONICAL_BASE}${mediaUrl(item.id, item.title || item.name || '', mediaType, (item.release_date || item.first_air_date)?.slice(0, 4))}`;

      const images: string[] = [];
      if (item.poster_path) {
        images.push(`    <image:image>\n      <image:loc>${TMDB_IMAGE_BASE}/w780${item.poster_path}</image:loc>\n      <image:title>${title} (${year}) - Poster</image:title>\n      <image:caption>Official poster for ${title}</image:caption>\n    </image:image>`);
      }
      if (item.backdrop_path) {
        images.push(`    <image:image>\n      <image:loc>${TMDB_IMAGE_BASE}/w1280${item.backdrop_path}</image:loc>\n      <image:title>${title} (${year}) - Backdrop</image:title>\n      <image:caption>Backdrop image for ${title}</image:caption>\n    </image:image>`);
      }

      if (images.length === 0) return null;
      return `  <url>\n    <loc>${pageUrl}</loc>\n    <lastmod>${now}</lastmod>\n${images.join('\n')}\n  </url>`;
    }).filter(Boolean).join('\n');

    const body = urls || fallbackUrl(CANONICAL_BASE, now);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>`;

    inMemoryXml = xml; inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, { headers: cacheHeaders });
  } catch (err) {
    console.error('[images.xml]', err);
    const now2 = new Date().toISOString().split('T')[0];
    const fb = fallbackUrl(CANONICAL_BASE, now2);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${fb}\n</urlset>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' } });
  }
}