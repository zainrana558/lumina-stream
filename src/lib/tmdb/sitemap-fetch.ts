/**
 * Lightweight TMDB fetch for sitemap generation.
 *
 * Bypasses ALL app caching layers (Redis, Cloudflare API cache worker)
 * because sitemaps have their own 24h filesystem + CDN cache.
 *
 * This avoids the double-? URL bug in buildTmdbRequest when endpoints
 * contain query strings, and eliminates Redis/cold-start failures.
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';

function getAuth(): { headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const token = process.env.TMDB_BEARER_TOKEN;
  const key = process.env.TMDB_API_KEY;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (key) {
    headers['Authorization'] = `Bearer ${key}`;
  }
  return { headers };
}

interface TmdbListResult<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/**
 * Fetch a single TMDB list endpoint. Returns null on any failure.
 */
export async function tmdbSitemapFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<TmdbListResult<T> | null> {
  const sp = new URLSearchParams({ language: 'en-US', ...params });
  const url = `${TMDB_BASE}${endpoint}?${sp}`;
  const { headers } = getAuth();

  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as TmdbListResult<T>;
  } catch {
    return null;
  }
}

/**
 * Fetch multiple pages from a TMDB list endpoint.
 * Returns deduplicated items across all pages.
 */
export async function tmdbFetchPages<T extends { id: number }>(
  endpoint: string,
  maxPages: number,
  extraParams: Record<string, string> = {}
): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<number>();

  const pages = await Promise.all(
    Array.from({ length: maxPages }, (_, i) =>
      tmdbSitemapFetch<T>(endpoint, { page: String(i + 1), ...extraParams })
    )
  );

  for (const page of pages) {
    if (!page?.results) continue;
    for (const item of page.results) {
      if (item.id && !seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
  }

  return items;
}