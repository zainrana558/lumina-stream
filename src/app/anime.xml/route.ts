import { CANONICAL_BASE } from '@/lib/seo/constants';
import { browseAllAnime, getTrendingAnime, getTopRatedAnime, getPopularAnime, getAniListTitle, type AniListMedia } from '@/lib/anilist/client';
import { ANILIST_ID_OFFSET } from '@/types';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { mediaUrl } from '@/lib/slug';
import { fallbackUrl } from '@/lib/escXml';
import { NextResponse } from 'next/server';

let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'anime-v2';

interface AnilistItem { id: number; title: string; year?: number; popularity: number; }

async function fetchAnime(): Promise<AnilistItem[]> {
  const items: AnilistItem[] = [];
  const seen = new Set<number>();

  function addBatch(media: Array<{ id: number; popularity: number; title: { romaji: string | null; english: string | null; native: string | null }; startDate: { year: number | null } | null }>) {
    for (const m of media) {
      const nid = m.id + ANILIST_ID_OFFSET;
      if (!seen.has(nid)) {
        seen.add(nid);
        items.push({ id: nid, title: getAniListTitle(m), year: m.startDate?.year ?? undefined, popularity: m.popularity });
      }
    }
  }

  async function fetchPages(fn: (p: number, pp: number) => Promise<{ media: AniListMedia[] }>, pages: number, perPage = 25) {
    const all: AniListMedia[] = [];
    for (let p = 1; p <= pages; p++) {
      try { const res = await fn(p, perPage); all.push(...res.media); } catch { /* continue */ }
    }
    addBatch(all);
  }

  await Promise.allSettled([
    fetchPages(getTrendingAnime, 5, 50),
    fetchPages(getPopularAnime, 5, 50),
    fetchPages(getTopRatedAnime, 4, 50),
    fetchPages(browseAllAnime, 6, 50),
  ]);

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
    const items = await fetchAnime();
    items.sort((a, b) => b.popularity - a.popularity);
    const capped = items.slice(0, 5000);

    const urls = capped.map(item => {
      const loc = `${CANONICAL_BASE}${mediaUrl(item.id, item.title, 'tv', item.year, true)}`;
      return `<url>\n<loc>${loc}</loc>\n<lastmod>${now}</lastmod>\n</url>`;
    }).join('\n\n');

    const body = urls || fallbackUrl(CANONICAL_BASE, now);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${body}\n\n</urlset>`;

    inMemoryXml = xml; inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, { headers: cacheHeaders });
  } catch {
    const now = new Date().toISOString().split('T')[0];
    const fb = fallbackUrl(CANONICAL_BASE, now);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${fb}\n\n</urlset>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' } });
  }
}