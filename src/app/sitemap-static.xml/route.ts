import { NextResponse } from 'next/server';
import { PORTAL_SLUGS, BROWSE_ONLY_GENRES } from '@/config/genres';

// Static sitemap — no API calls, instant response. Contains all hand-curated pages.

const DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s'] as const;
const CURRENT_YEAR = new Date().getFullYear();

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app';
  const now = new Date().toISOString();

  const urls: string[] = [];

  function add(path: string, priority: string) {
    urls.push(`  <url>\n    <loc>${baseUrl}${path}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>${priority}</priority>\n  </url>`);
  }

  // Core pages
  add('/', '1.0');
  add('/browse', '0.9');
  add('/seasonal', '0.9');
  add('/leaderboard', '0.9');
  add('/release-calendar', '0.9');
  add('/movies', '0.9');
  add('/tv-shows', '0.9');
  add('/top-rated', '0.85');
  add('/new-releases', '0.9');
  add('/genres', '0.8');
  add('/about', '0.6');

  // Genre portals
  for (const slug of PORTAL_SLUGS) add(`/genre/${slug}`, '0.8');

  // Decade pages
  for (const decade of DECADES) add(`/decade/${decade}`, '0.75');

  // Year pages (current year to -11)
  for (let i = 0; i < 12; i++) {
    const year = CURRENT_YEAR + 1 - i;
    add(`/year/${year}`, year >= CURRENT_YEAR ? '0.8' : '0.6');
  }

  // Browse-only genre query pages
  for (const name of BROWSE_ONLY_GENRES) {
    urls.push(`  <url>\n    <loc>${baseUrl}/browse?genre=${encodeURIComponent(name)}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.6</priority>\n  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}