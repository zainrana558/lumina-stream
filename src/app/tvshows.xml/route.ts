import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch } from '@/lib/tmdb/server';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { mediaUrl } from '@/lib/slug';
import { fallbackUrl } from '@/lib/escXml';
import { NextResponse } from 'next/server';

let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'tvshows';

interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  media_type?: string;
  release_date?: string;
  first_air_date?: string;
  popularity: number;
}

async function fetchPages(endpoint: string, maxPages: number): Promise<TMDBItem[]> {
  const items: TMDBItem[] = [];
  const seen = new Set<number>();
  for (let p = 1; p <= maxPages; p++) {
    try {
      const data = await tmdbFetch<{ results: TMDBItem[] }>(`${endpoint}&page=${p}`);
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
    const [popular, topRated, onTheAir, airingToday, trending] = await Promise.allSettled([
      fetchPages('/tv/popular?language=en-US', 5),
      fetchPages('/tv/top_rated?language=en-US', 5),
      fetchPages('/tv/on_the_air?language=en-US', 3),
      fetchPages('/tv/airing_today?language=en-US', 2),
      fetchPages('/trending/tv/week?language=en-US', 3),
    ]);

    const seen = new Set<number>();
    const all: TMDBItem[] = [];
    for (const r of [popular, topRated, onTheAir, airingToday, trending]) {
      if (r.status === 'fulfilled') {
        for (const item of r.value) {
          if (!seen.has(item.id)) { seen.add(item.id); all.push(item); }
        }
      }
    }

    all.sort((a, b) => b.popularity - a.popularity);
    const capped = all.slice(0, 5000);

    const urls = capped.map(item =>
      `  <url>\n    <loc>${CANONICAL_BASE}${mediaUrl(item.id, item.title || item.name || '', 'tv', item.first_air_date?.slice(0, 4))}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    ).join('\n');

    const body = urls || fallbackUrl(CANONICAL_BASE, now);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;

    inMemoryXml = xml; inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, { headers: cacheHeaders });
  } catch {
    const now = new Date().toISOString().split('T')[0];
    const fb = fallbackUrl(CANONICAL_BASE, now);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${fb}\n</urlset>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' } });
  }
}