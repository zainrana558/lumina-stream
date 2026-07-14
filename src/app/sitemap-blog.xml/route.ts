import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetchRaw } from '@/lib/tmdb/server';
import { getSitemapCache, setSitemapCache } from '@/lib/sitemap-cache';
import { NextResponse } from 'next/server';

// In-memory L1 cache + filesystem L2 cache via sitemap-cache.ts
let inMemoryXml: string | null = null;
let inMemoryAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000;
const CACHE_NAME = 'sitemap-blog';

/**
 * Blog sitemap — SEO blog post URLs for popular movies and TV shows.
 *
 * Each blog post is generated from a TMDB title and targets long-tail
 * keywords like "watch [title] online free". Including them in the
 * sitemap ensures Google discovers and indexes these programmatic pages.
 */

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
}

export async function GET() {
  const cacheHeaders = { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' };

  // L1: In-memory cache
  if (inMemoryXml && Date.now() - inMemoryAt < SITEMAP_TTL) {
    return new NextResponse(inMemoryXml, { headers: cacheHeaders });
  }

  // L2: Filesystem cache
  const fsCache = await getSitemapCache(CACHE_NAME);
  if (fsCache) {
    inMemoryXml = fsCache;
    inMemoryAt = Date.now();
    return new NextResponse(fsCache, { headers: cacheHeaders });
  }

  const now = new Date().toISOString().split('T')[0];

  try {
    // Fetch popular content to generate blog URLs from
    const [movies, tv] = await Promise.all([
      tmdbFetchRaw<{ results: TMDBItem[] }>('/movie/popular?language=en-US'),
      tmdbFetchRaw<{ results: TMDBItem[] }>('/tv/popular?language=en-US'),
    ]);

    const urls: string[] = [];
    const seen = new Set<string>();

    for (const item of [...(movies?.results || []), ...(tv?.results || [])]) {
      const title = item.title || item.name;
      if (!title) continue;

      const slug = slugify(title);
      if (seen.has(slug)) continue;
      seen.add(slug);

      urls.push(`  <url>\n    <loc>${CANONICAL_BASE}/blog/${slug}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.5</priority>\n  </url>`);
    }

    // Also add top-rated movies for more coverage
    try {
      const topRated = await tmdbFetchRaw<{ results: TMDBItem[] }>('/movie/top_rated?language=en-US');
      for (const item of topRated?.results || []) {
        const title = item.title || item.name;
        if (!title) continue;
        const slug = slugify(title);
        if (seen.has(slug)) continue;
        seen.add(slug);
        urls.push(`  <url>\n    <loc>${CANONICAL_BASE}/blog/${slug}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.5</priority>\n  </url>`);
      }
    } catch { /* skip */ }

    // Also add trending
    try {
      const trending = await tmdbFetchRaw<{ results: TMDBItem[] }>('/trending/all/week?language=en-US');
      for (const item of trending?.results || []) {
        const title = item.title || item.name;
        if (!title) continue;
        const slug = slugify(title);
        if (seen.has(slug)) continue;
        seen.add(slug);
        urls.push(`  <url>\n    <loc>${CANONICAL_BASE}/blog/${slug}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.5</priority>\n  </url>`);
      }
    } catch { /* skip */ }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    // Cache: in-memory + filesystem for 24h
    inMemoryXml = xml;
    inMemoryAt = Date.now();
    setSitemapCache(CACHE_NAME, xml).catch(() => {});

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=300',
      },
    });
  }
}