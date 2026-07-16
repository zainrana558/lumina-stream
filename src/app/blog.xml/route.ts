import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetchRaw } from '@/lib/tmdb/server';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { NextResponse } from 'next/server';

let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'blog';

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

interface TMDBItem { id: number; title?: string; name?: string; }

export async function GET() {
  const cacheHeaders = { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' };

  if (inMemoryXml && Date.now() - inMemoryAt < SITEMAP_TTL) {
    return new NextResponse(inMemoryXml, { headers: cacheHeaders });
  }
  const fsCache = await getSitemapCache(CACHE_NAME);
  if (fsCache) { inMemoryXml = fsCache; inMemoryAt = Date.now(); return new NextResponse(fsCache, { headers: cacheHeaders }); }

  const now = new Date().toISOString().split('T')[0];

  try {
    const [movies, tv, topRated, trending] = await Promise.allSettled([
      tmdbFetchRaw<{ results: TMDBItem[] }>('/movie/popular?language=en-US'),
      tmdbFetchRaw<{ results: TMDBItem[] }>('/tv/popular?language=en-US'),
      tmdbFetchRaw<{ results: TMDBItem[] }>('/movie/top_rated?language=en-US'),
      tmdbFetchRaw<{ results: TMDBItem[] }>('/trending/all/week?language=en-US'),
    ]);

    const seen = new Set<string>();
    const urls: string[] = [];

    for (const r of [movies, tv, topRated, trending]) {
      if (r.status !== 'fulfilled') continue;
      for (const item of r.value?.results || []) {
        const title = item.title || item.name;
        if (!title) continue;
        const slug = slugify(title);
        if (seen.has(slug)) continue;
        seen.add(slug);
        urls.push(`  <url>\n    <loc>${CANONICAL_BASE}/blog/${slug}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.5</priority>\n  </url>`);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

    inMemoryXml = xml; inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, { headers: cacheHeaders });
  } catch {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>', { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' } });
  }
}