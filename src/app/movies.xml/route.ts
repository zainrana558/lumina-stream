import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetchPages } from '@/lib/tmdb/sitemap-fetch';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { mediaUrl } from '@/lib/slug';
import { fallbackUrl } from '@/lib/escXml';
import { NextResponse } from 'next/server';

let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'movies-v2';

interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  popularity: number;
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
    const [popular, topRated, nowPlaying, upcoming, trending] = await Promise.all([
      tmdbFetchPages<TMDBItem>('/movie/popular', 5, { region: 'US' }),
      tmdbFetchPages<TMDBItem>('/movie/top_rated', 5),
      tmdbFetchPages<TMDBItem>('/movie/now_playing', 2, { region: 'US' }),
      tmdbFetchPages<TMDBItem>('/movie/upcoming', 2, { region: 'US' }),
      tmdbFetchPages<TMDBItem>('/trending/movie/week', 3),
    ]);

    const seen = new Set<number>();
    const all: TMDBItem[] = [];
    for (const batch of [popular, topRated, nowPlaying, upcoming, trending]) {
      for (const item of batch) {
        if (!seen.has(item.id)) { seen.add(item.id); all.push(item); }
      }
    }

    all.sort((a, b) => b.popularity - a.popularity);
    const capped = all.slice(0, 5000);

    const urls = capped.map(item => {
      const loc = `${CANONICAL_BASE}${mediaUrl(item.id, item.title || item.name || '', 'movie', item.release_date?.slice(0, 4))}`;
      return `<url>\n<loc>${loc}</loc>\n<lastmod>${now}</lastmod>\n</url>`;
    }).join('\n\n');

    const body = urls || fallbackUrl(CANONICAL_BASE, now);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${body}\n\n</urlset>`;

    inMemoryXml = xml; inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, { headers: cacheHeaders });
  } catch (err) {
    console.error('[movies.xml]', err);
    const now2 = new Date().toISOString().split('T')[0];
    const fb = fallbackUrl(CANONICAL_BASE, now2);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${fb}\n\n</urlset>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' } });
  }
}