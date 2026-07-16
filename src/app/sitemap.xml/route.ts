import { NextResponse } from 'next/server';
import { CANONICAL_BASE } from '@/lib/seo/constants';

/**
 * Sitemap Index — single entry point for Google.
 *
 * When Google fetches /sitemap.xml, it discovers ALL sub-sitemaps.
 * Each sub-sitemap is cached for 24 hours (L1 in-memory + L2 filesystem + CDN),
 * so only the FIRST user request triggers API calls.
 */

const SUB_SITEMAPS = [
  'pages.xml',
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
  (s) => `<sitemap>\n<loc>${CANONICAL_BASE}/${s}</loc>\n<lastmod>${now}</lastmod>\n</sitemap>`
).join('\n\n')}

</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}