import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetchPages } from '@/lib/tmdb/sitemap-fetch';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { personUrl } from '@/lib/slug';
import { fallbackUrl } from '@/lib/escXml';
import { NextResponse } from 'next/server';

let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'directors-v2';

interface TMDBPerson {
  id: number;
  name: string;
  popularity: number;
  adult: boolean;
  known_for_department: string;
  known_for: unknown[];
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
    const [trending, popular] = await Promise.all([
      tmdbFetchPages<TMDBPerson>('/trending/person/week', 5),
      tmdbFetchPages<TMDBPerson>('/person/popular', 5),
    ]);

    const peopleMap = new Map<number, TMDBPerson>();
    for (const p of [...trending, ...popular]) {
      const existing = peopleMap.get(p.id);
      if (!existing || p.popularity > existing.popularity) peopleMap.set(p.id, p);
    }

    const directors = Array.from(peopleMap.values()).filter(p => {
      if (p.adult) return false;
      if (!p.known_for?.length) return false;
      if (p.popularity < 1.0) return false;
      return p.known_for_department === 'Directing';
    });

    const urls = directors.map(p => {
      const loc = `${CANONICAL_BASE}${personUrl(p.id, p.name)}`;
      return `<url>\n<loc>${loc}</loc>\n<lastmod>${now}</lastmod>\n</url>`;
    }).join('\n\n');

    const body = urls || fallbackUrl(CANONICAL_BASE, now);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${body}\n\n</urlset>`;

    inMemoryXml = xml; inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, { headers: cacheHeaders });
  } catch (err) {
    console.error('[directors.xml]', err);
    const fb = fallbackUrl(CANONICAL_BASE, now);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${fb}\n\n</urlset>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' } });
  }
}