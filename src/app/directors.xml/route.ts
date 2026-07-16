import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBPerson } from '@/lib/tmdb/server';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { personUrl } from '@/lib/slug';
import { fallbackUrl } from '@/lib/escXml';
import { NextResponse } from 'next/server';

let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'directors';

/**
 * Directors sitemap — people with known_for_department "Directing".
 * Reuses the same TMDB trending/popular person endpoints as actors,
 * but filters to only directors.
 */
export async function GET() {
  const cacheHeaders = { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' };

  if (inMemoryXml && Date.now() - inMemoryAt < SITEMAP_TTL) {
    return new NextResponse(inMemoryXml, { headers: cacheHeaders });
  }
  const fsCache = await getSitemapCache(CACHE_NAME);
  if (fsCache) { inMemoryXml = fsCache; inMemoryAt = Date.now(); return new NextResponse(fsCache, { headers: cacheHeaders }); }

  const now = new Date().toISOString().split('T')[0];

  try {
    const peopleMap = new Map<number, TMDBPerson>();

    const work = [
      ...Array.from({ length: 5 }, (_, i) => tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week', { page: String(i + 1) })),
      ...Array.from({ length: 5 }, (_, i) => tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: String(i + 1) })),
    ];

    const results = await Promise.allSettled(work);
    for (const r of results) {
      if (r.status === 'fulfilled') {
        for (const p of r.value.results) {
          const existing = peopleMap.get(p.id);
          if (!existing || p.popularity > existing.popularity) peopleMap.set(p.id, p);
        }
      }
    }

    const filtered = Array.from(peopleMap.values()).filter(p => {
      if (p.adult) return false;
      if (!p.known_for || p.known_for.length === 0) return false;
      if (p.popularity < 1.0) return false;
      return true;
    });

    const directors = filtered.filter(p => p.known_for_department === 'Directing');

    const urls = directors.map(p =>
      `  <url>\n    <loc>${CANONICAL_BASE}${personUrl(p.id, p.name)}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.7</priority>\n  </url>`
    ).join('\n');

    const body = urls || fallbackUrl(CANONICAL_BASE, now);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;

    inMemoryXml = xml; inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, { headers: cacheHeaders });
  } catch {
    const fb = fallbackUrl(CANONICAL_BASE, now);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${fb}\n</urlset>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' } });
  }
}