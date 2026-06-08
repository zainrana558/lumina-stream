// ═══════════════════════════════════════════
// LUMINA STREAM — TMDB Server Helper
// ═══════════════════════════════════════════

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY || '';
  if (!key) console.warn('[TMDB] No TMDB_API_KEY set');
  return key;
}

interface FetchOptions {
  endpoint: string;
  params?: Record<string, string>;
  cache?: RequestCache;
}

export async function tmdbFetch<T = Record<string, unknown>>(options: FetchOptions): Promise<T> {
  const { endpoint, params = {}, cache = 'force-cache' } = options;
  const apiKey = getApiKey();
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { next: { revalidate: 300 }, cache });
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTrending(page = 1) {
  return tmdbFetch({ endpoint: '/trending/all/week', params: { page: String(page) } });
}

export async function fetchPopular(type: 'movie' | 'tv' = 'movie', page = 1) {
  return tmdbFetch({ endpoint: `/${type}/popular`, params: { page: String(page) } });
}

export async function fetchTopRated(type: 'movie' | 'tv' = 'movie', page = 1) {
  return tmdbFetch({ endpoint: `/${type}/top_rated`, params: { page: String(page) } });
}

export async function fetchDiscover(genreId: number, page = 1) {
  return tmdbFetch({
    endpoint: '/discover/movie',
    params: { with_genres: String(genreId), sort_by: 'popularity.desc', page: String(page) },
  });
}

export async function fetchDetails(id: number, type: 'movie' | 'tv' = 'movie') {
  return tmdbFetch({
    endpoint: `/${type}/${id}`,
    params: { append_to_response: 'credits,similar,videos' },
    cache: 'no-store',
  });
}

export async function fetchSearch(query: string, page = 1) {
  return tmdbFetch({
    endpoint: '/search/multi',
    params: { query, page: String(page) },
    cache: 'no-store',
  });
}

export async function fetchGenreMovies(genreSlug: string, page = 1) {
  const genreMap: Record<string, number> = {
    action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
    documentary: 99, drama: 18, family: 10751, fantasy: 14, horror: 27,
    music: 10402, mystery: 9648, romance: 10749, scifi: 878, thriller: 53,
    war: 10752, western: 37, anime: 16, cartoon: 16,
  };
  const genreId = genreMap[genreSlug] || 28;
  return tmdbFetch({
    endpoint: '/discover/movie',
    params: { with_genres: String(genreId), sort_by: 'popularity.desc', page: String(page) },
  });
}

export function getImageUrl(path: string | null, size = 'w500'): string {
  if (!path) return '';
  return `${TMDB_IMG}/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size = 'w1280'): string {
  if (!path) return '';
  return `${TMDB_IMG}/${size}${path}`;
}
