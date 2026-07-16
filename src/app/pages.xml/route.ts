import { CANONICAL_BASE } from '@/lib/seo/constants';
import { NextResponse } from 'next/server';

/**
 * Pages sitemap — static pages only.
 *
 * Includes: homepage, browse, discover hubs, info pages, legal pages.
 * No API calls needed — all URLs are known at build time.
 */

const STATIC_PAGES: Array<{ path: string; priority: string }> = [
  { path: '/movies', priority: '0.9' },
  { path: '/tv-shows', priority: '0.9' },
  { path: '/anime', priority: '0.9' },
  { path: '/trending', priority: '0.8' },
  { path: '/top-rated', priority: '0.8' },
  { path: '/new-releases', priority: '0.8' },
  { path: '/browse', priority: '0.9' },
  { path: '/coming-soon', priority: '0.7' },
  { path: '/seasonal', priority: '0.8' },
  { path: '/leaderboard', priority: '0.7' },
  { path: '/release-calendar', priority: '0.8' },
  { path: '/genres', priority: '0.7' },
  { path: '/actors', priority: '0.7' },
  { path: '/directors', priority: '0.7' },
  { path: '/studios', priority: '0.6' },
  { path: '/countries', priority: '0.6' },
  { path: '/languages', priority: '0.6' },
  { path: '/news', priority: '0.6' },
  { path: '/reviews', priority: '0.5' },
  { path: '/blog', priority: '0.6' },
  { path: '/about', priority: '0.5' },
  { path: '/contact', priority: '0.4' },
  { path: '/faq', priority: '0.5' },
  { path: '/privacy', priority: '0.3' },
  { path: '/terms', priority: '0.3' },
  { path: '/dmca', priority: '0.3' },
  { path: '/cookies', priority: '0.2' },
  { path: '/disclaimer', priority: '0.2' },
];

export async function GET() {
  const now = new Date().toISOString().split('T')[0];

  // Homepage with full metadata
  const home = `<url>\n<loc>${CANONICAL_BASE}/</loc>\n<lastmod>${now}</lastmod>\n<changefreq>daily</changefreq>\n<priority>1.0</priority>\n</url>`;

  // Other pages — just loc + priority
  const pages = STATIC_PAGES.map(
    (p) => `<url>\n<loc>${CANONICAL_BASE}${p.path}</loc>\n<priority>${p.priority}</priority>\n</url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${home}

${pages.join('\n\n')}

</urlset>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
  });
}