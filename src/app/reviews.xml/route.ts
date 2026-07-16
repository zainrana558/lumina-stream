import { CANONICAL_BASE } from '@/lib/seo/constants';
import { NextResponse } from 'next/server';

/**
 * Reviews sitemap — single static page, no individual review URLs exist.
 * Cached at CDN for 24h.
 */

export async function GET() {
  const now = new Date().toISOString().split('T')[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${CANONICAL_BASE}/reviews</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
  });
}