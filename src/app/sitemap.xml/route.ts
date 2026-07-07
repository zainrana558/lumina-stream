import { NextResponse } from 'next/server';
import { CANONICAL_BASE } from '@/lib/seo/constants';

/**
 * Sitemap Index — single entry point for Google.
 *
 * When Google fetches /sitemap.xml, it discovers ALL sub-sitemaps.
 * No need for Google to read robots.txt to find them (though robots.txt
 * also lists this index for belt-and-suspenders).
 *
 * Sub-sitemaps:
 *   - sitemap-static.xml  → core pages, genres, decades, years, legal
 *   - sitemap-details.xml → /details/[id] (movies + TV shows)
 *   - sitemap-episodes.xml → /details/[id]/season/[s]/episode/[e]
 *   - sitemap-people.xml  → /person/[id]
 */

const SUB_SITEMAPS = [
  'sitemap-static.xml',
  'sitemap-details.xml',
  'sitemap-episodes.xml',
  'sitemap-people.xml',
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
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}