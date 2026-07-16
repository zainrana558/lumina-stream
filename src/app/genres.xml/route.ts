import { CANONICAL_BASE } from '@/lib/seo/constants';
import { PORTAL_SLUGS } from '@/config/genres';
import { NextResponse } from 'next/server';

/**
 * Genres & static pages sitemap.
 *
 * Includes: core pages, genre portals, decade pages, year pages.
 * No API calls needed — all URLs are known at build time.
 * Cached at CDN for 24h.
 */

const DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s'] as const;
const CURRENT_YEAR = new Date().getFullYear();

export async function GET() {
  const now = new Date().toISOString().split('T')[0];
  const urls: string[] = [];

  function add(path: string, priority: string, changefreq = 'weekly') {
    urls.push(`  <url>\n    <loc>${CANONICAL_BASE}${path}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`);
  }

  // Core pages
  add('/', '1.0', 'daily');
  add('/browse', '0.9');
  add('/trending', '0.9', 'daily');
  add('/coming-soon', '0.85');
  add('/seasonal', '0.9');
  add('/leaderboard', '0.8');
  add('/release-calendar', '0.9');
  add('/movies', '0.9');
  add('/tv-shows', '0.9');
  add('/top-rated', '0.85');
  add('/new-releases', '0.9', 'daily');
  add('/genres', '0.8');
  add('/actors', '0.8');
  add('/directors', '0.8');
  add('/studios', '0.7');
  add('/countries', '0.7');
  add('/languages', '0.7');
  add('/faq', '0.7');
  add('/contact', '0.6');
  add('/about', '0.7');
  add('/news', '0.6', 'daily');
  add('/reviews', '0.5');
  add('/blog', '0.7');
  add('/privacy', '0.3');
  add('/terms', '0.3');
  add('/dmca', '0.3');
  add('/cookies', '0.2');
  add('/disclaimer', '0.2');

  // Genre portals
  for (const slug of PORTAL_SLUGS) add(`/genre/${slug}`, '0.8');

  // Decade pages
  for (const decade of DECADES) add(`/decade/${decade}`, '0.7');

  // Year pages (current year back 19 years)
  for (let i = 0; i < 20; i++) {
    const year = CURRENT_YEAR + 1 - i;
    add(`/year/${year}`, year >= CURRENT_YEAR ? '0.75' : '0.6');
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
  });
}