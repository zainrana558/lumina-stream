import { NextResponse } from 'next/server';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBPerson } from '@/lib/tmdb/server';

// In-memory cache: avoids 10 API calls per request
let cachedXml: string | null = null;
let cachedAt = 0;
const SITEMAP_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * People sitemap — trending + popular person URLs.
 *
 * Filters out:
 *   - Adult content performers (TMDB flags `adult: true`)
 *   - People with no known credits (thin pages)
 *   - People with very low popularity (< 1.0)
 */
export async function GET() {
  // Return cached XML if still fresh
  if (cachedXml && Date.now() - cachedAt < SITEMAP_TTL) {
    return new NextResponse(cachedXml, {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
    });
  }

  const baseUrl = CANONICAL_BASE;
  const now = new Date().toISOString();

  const peopleMap = new Map<number, TMDBPerson>();

  const work = [
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week', { page: '1' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week', { page: '2' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week', { page: '3' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week', { page: '4' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/trending/person/week', { page: '5' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: '1' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: '2' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: '3' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: '4' }),
    tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: '5' }),
  ];

  const results = await Promise.allSettled(work);
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const p of r.value.results) {
        // Keep highest-popularity version of each person
        const existing = peopleMap.get(p.id);
        if (!existing || p.popularity > existing.popularity) {
          peopleMap.set(p.id, p);
        }
      }
    }
  }

  // Filter: must have known credits, not adult, and have minimum popularity
  const filteredPeople = Array.from(peopleMap.values()).filter(p => {
    if (p.adult) return false;                    // Skip adult content performers
    if (!p.known_for || p.known_for.length === 0) return false; // No credits = thin page
    if (p.popularity < 1.0) return false;        // Very low popularity = obscure
    return true;
  });

  const urls = filteredPeople.map(p =>
    `  <url>\n    <loc>${baseUrl}/person/${p.id}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>0.7</priority>\n  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  // Cache in memory for 24h
  cachedXml = xml;
  cachedAt = Date.now();

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}