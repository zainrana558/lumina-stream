import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetchPages } from '@/lib/tmdb/sitemap-fetch';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { mediaUrl } from '@/lib/slug';
import { fallbackUrl, escXml } from '@/lib/escXml';
import { NextResponse } from 'next/server';

let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'videos-v2';

const TMDB_BASE = 'https://api.themoviedb.org/3';

interface TMDBMediaItem {
  id: number;
  title?: string;
  name?: string;
  media_type?: string;
  release_date?: string;
  first_air_date?: string;
  popularity: number;
}

interface TMDBVideo {
  key: string;
  name: string;
  site: string;
  type: string;
}

function getAuthHeaders(): { headers: Record<string, string>; apiKey?: string } {
  const token = process.env.TMDB_BEARER_TOKEN;
  const key = process.env.TMDB_API_KEY;
  if (token) return { headers: { Authorization: `Bearer ${token}` } };
  if (key) return { headers: {}, apiKey: key };
  return { headers: {} };
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
    const [movies, tv] = await Promise.all([
      tmdbFetchPages<TMDBMediaItem>('/movie/popular', 3, { region: 'US' }),
      tmdbFetchPages<TMDBMediaItem>('/tv/popular', 3),
    ]);

    const seen = new Set<number>();
    const items: TMDBMediaItem[] = [];
    for (const batch of [movies, tv]) {
      for (const item of batch) {
        if (!seen.has(item.id)) { seen.add(item.id); items.push(item); }
      }
    }

    items.sort((a, b) => b.popularity - a.popularity);
    const topItems = items.slice(0, 200);

    const videoEntries = await Promise.allSettled(
      topItems.map(async (item) => {
        const mt = item.media_type === 'tv' ? 'tv' : 'movie';
        const { headers, apiKey } = getAuthHeaders();
        const sp = new URLSearchParams({ language: 'en-US' });
        if (apiKey) sp.set('api_key', apiKey);
        const url = `${TMDB_BASE}/${mt}/${item.id}/videos?${sp}`;
        try {
          const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
          if (!res.ok) return null;
          const data = await res.json() as { results: TMDBVideo[] };
          const ytVideos = (data.results || []).filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
          return { item, ytVideos };
        } catch {
          return null;
        }
      })
    );

    const urls: string[] = [];
    for (const entry of videoEntries) {
      if (entry.status !== 'fulfilled' || !entry.value) continue;
      const { item, ytVideos } = entry.value;
      if (ytVideos.length === 0) continue;

      const title = escXml(item.title || item.name || 'Untitled');
      const year = (item.release_date || item.first_air_date)?.slice(0, 4) || '';
      const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
      const pageUrl = `${CANONICAL_BASE}${mediaUrl(item.id, item.title || item.name || '', mediaType, (item.release_date || item.first_air_date)?.slice(0, 4))}`;

      const vid = ytVideos[0];
      urls.push(`<url>\n<loc>${pageUrl}</loc>\n<lastmod>${now}</lastmod>\n<video:video>\n<video:thumbnail_loc>${pageUrl}</video:thumbnail_loc>\n<video:title>${title} - ${escXml(vid.name)}</video:title>\n<video:description>Watch the ${vid.type.toLowerCase()} for ${title}${year ? ` (${year})` : ''} on Lumovia</video:description>\n<video:content_loc>https://www.youtube.com/watch?v=${vid.key}</video:content_loc>\n<video:player_loc>https://www.youtube.com/embed/${vid.key}</video:player_loc>\n<video:publication_date>${now}</video:publication_date>\n<video:family_friendly>yes</video:family_friendly>\n<video:live>no</video:live>\n</video:video>\n</url>`);
    }

    const body = urls.length > 0 ? urls.join('\n\n') : fallbackUrl(CANONICAL_BASE, now);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n\n${body}\n\n</urlset>`;

    inMemoryXml = xml; inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, { headers: cacheHeaders });
  } catch (err) {
    console.error('[videos.xml]', err);
    const now2 = new Date().toISOString().split('T')[0];
    const fb = fallbackUrl(CANONICAL_BASE, now2);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n\n${fb}\n\n</urlset>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' } });
  }
}