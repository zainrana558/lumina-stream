import { CANONICAL_BASE } from '@/lib/seo/constants';
import { NextResponse } from 'next/server';
import { GUIDES } from '@/content/guides';

export const dynamic = 'force-static';

export async function GET() {
  const now = new Date().toISOString().split('T')[0];

  const guideUrls = GUIDES.map(
    (g) =>
      `<url>\n<loc>${CANONICAL_BASE}/guide/${g.slug}</loc>\n<lastmod>${now}</lastmod>\n<priority>0.7</priority>\n</url>`
  );

  const indexUrl = `<url>\n<loc>${CANONICAL_BASE}/guides</loc>\n<lastmod>${now}</lastmod>\n<priority>0.6</priority>\n</url>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${indexUrl}

${guideUrls.join('\n\n')}

</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}