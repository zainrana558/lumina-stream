import { NextResponse } from 'next/server';
import { tmdbFetch, type TMDBListResponse, type TMDBPerson } from '@/lib/tmdb/server';

// People sitemap — trending + popular person URLs.

export async function GET() {
  const baseUrl = 'https://lumina-stream-omega.vercel.app';
  const now = new Date().toISOString();

  const ids = new Set<number>();

  const work = [
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week', { page: '1' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week', { page: '2' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: '1' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: '2' }),
  ];

  const results = await Promise.allSettled(work);
  for (const r of results) {
    if (r.status === 'fulfilled') for (const p of r.value.results) ids.add(p.id);
  }

  const urls = Array.from(ids).map(id =>
    `  <url>\n    <loc>${baseUrl}/person/${id}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.7</priority>\n  </url>`
  );

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