import { CANONICAL_BASE } from '@/lib/seo/constants';
import { PORTAL_SLUGS } from '@/config/genres';
import { NextResponse } from 'next/server';

/**
 * Genres sitemap — genre portal pages only.
 *
 * Static pages, decade pages, and year pages have been moved to pages.xml.
 * This sitemap lists only the genre-themed portal pages.
 */

export async function GET() {
  const urls = PORTAL_SLUGS.map(
    (slug) => `<url>\n<loc>${CANONICAL_BASE}/genre/${slug}</loc>\n</url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls.join('\n\n')}

</urlset>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
  });
}