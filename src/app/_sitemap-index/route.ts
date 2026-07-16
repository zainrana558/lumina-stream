import { NextResponse } from 'next/server';
import { CANONICAL_BASE } from '@/lib/seo/constants';

/**
 * Sitemap Index — serves proper <sitemapindex> XML.
 * Accessed via rewrite: /sitemap.xml → /_sitemap-index
 *
 * Each sub-sitemap is cached for 24 hours (L1 in-memory + L2 filesystem + CDN),
 * so only the FIRST request triggers API calls.
 */

const SUB_SITEMAPS = [
  'movies.xml',
  'tvshows.xml',
  'anime.xml',
  'genres.xml',
  'actors.xml',
  'directors.xml',
  'news.xml',
  'reviews.xml',
  'blog.xml',
  'images.xml',
  'videos.xml',
] as const;

export async function GET() {
  const now = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SUB_SITEMAPS.map(
  (s) => `  <sitemap>
    <loc>${CANONICAL_BASE}/${s}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
).join('\n')}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}