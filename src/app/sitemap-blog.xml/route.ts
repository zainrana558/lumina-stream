import { NextResponse } from 'next/server';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetchRaw, tmdbFetch } from '@/lib/tmdb/server';
import { getAnimeDetail } from '@/lib/anilist/client';

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

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=60',
      },
    });
  }
}