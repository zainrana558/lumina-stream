import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBMediaItem } from '@/lib/tmdb/server';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { mediaUrl } from '@/lib/slug';
import { fallbackUrl, escXml } from '@/lib/escXml';
import { NextResponse } from 'next/server';

let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'videos';

/**
 * Videos sitemap — uses sitemap video extension to expose trailer/teaser URLs
 * for top movies and TV shows. Requires fetching details with videos appended.
 *
 * Namespace: xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
 *
 * Note: TMDB video files are hosted on YouTube. We include the YouTube embed URL
 * as the content_loc and the TMDB-hosted thumbnail as the thumbnail_loc.
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

interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
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
    // Fetch popular items first
    const [movies, tv] = await Promise.allSettled([
      fetchPages('/movie/popular?language=en-US', 3),
      fetchPages('/tv/popular?language=en-US', 3),
    ]);

    const seen = new Set<number>();
    const items: TMDBMediaItem[] = [];
    for (const r of [movies, tv]) {
      if (r.status === 'fulfilled') {
        for (const item of r.value) {
          if (!seen.has(item.id)) { seen.add(item.id); items.push(item); }
        }
      }
    }

    // Sort by popularity and take top 200 (each needs a detail API call for videos)
    items.sort((a, b) => b.popularity - a.popularity);
    const topItems = items.slice(0, 200);

    // Fetch videos for each item (parallel, tolerant of failures)
    const videoEntries = await Promise.allSettled(
      topItems.map(async (item) => {
        const mt = item.media_type === 'tv' ? 'tv' : 'movie';
        const videos = await tmdbFetch<{ results: TMDBVideo[] }>(`/${mt}/${item.id}/videos`).catch(() => null);
        const ytVideos = (videos?.results || []).filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        return { item, ytVideos };
      })
    );

    const urls: string[] = [];
    for (const entry of videoEntries) {
      if (entry.status !== 'fulfilled' || entry.value.ytVideos.length === 0) continue;
      const { item, ytVideos } = entry.value;
      const title = escXml(item.title || item.name || 'Untitled');
      const year = (item.release_date || item.first_air_date)?.slice(0, 4) || 'N/A';
      const pageUrl = `${CANONICAL_BASE}${mediaUrl(item.id, item.title || item.name || '', item.media_type, (item.release_date || item.first_air_date)?.slice(0, 4))}`;

      // Only include the first (best) trailer/teaser per item to keep sitemap manageable
      const vid = ytVideos[0];
      const videoXml = `  <url>\n    <loc>${pageUrl}</loc>\n    <lastmod>${now}</lastmod>\n    <video:video>\n      <video:thumbnail_loc>${pageUrl}</video:thumbnail_loc>\n      <video:title>${title} - ${escXml(vid.name)}</video:title>\n      <video:description>Watch the ${vid.type.toLowerCase()} for ${title} (${year}) on Lumovia</video:description>\n      <video:content_loc>https://www.youtube.com/watch?v=${vid.key}</video:content_loc>\n      <video:player_loc>https://www.youtube.com/embed/${vid.key}</video:player_loc>\n      <video:publication_date>${now}</video:publication_date>\n      <video:family_friendly>yes</video:family_friendly>\n      <video:live>no</video:live>\n    </video:video>\n  </url>`;
      urls.push(videoXml);
    }

    const body = urls.length > 0 ? urls.join('\n') : fallbackUrl(CANONICAL_BASE, now);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${body}\n</urlset>`;

    inMemoryXml = xml; inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, { headers: cacheHeaders });
  } catch {
    const now = new Date().toISOString().split('T')[0];
    const fb = fallbackUrl(CANONICAL_BASE, now);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${fb}\n</urlset>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' } });
  }
}