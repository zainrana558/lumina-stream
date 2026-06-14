/**
 * Enhanced TMDB server-side fetch with Redis + Cloudflare edge caching.
 *
 * Cache hierarchy (fastest → slowest):
 *   1. Redis (Upstash) — in-memory, ~10ms hit
 *   2. Cloudflare API Cache Worker — edge, ~50ms hit, unlimited storage
 *   3. TMDB API directly — ~300-800ms, rate-limited
 *
 * When API_CACHE_URL is set, requests go through the Cloudflare worker
 * which caches at the edge. Redis still serves as L1 cache for speed.
 */

import { getValidatedEnv } from '@/lib/env';
import { fetchWithCache, CACHE_TTL } from '@/lib/cache';

// Cloudflare API cache worker (set in Vercel env)
const API_CACHE_URL = process.env.API_CACHE_URL; // e.g. https://api-cache.zainrana553.workers.dev

const BASE_URL = 'https://api.themoviedb.org/3';

// Cache category mapping
function endpointToCacheCategory(endpoint: string): keyof typeof CACHE_TTL {
  if (endpoint.includes('/trending')) return 'trending';
  if (endpoint.includes('/search/')) return 'search';
  if (endpoint.includes('/genre/') && endpoint.includes('/list')) return 'genre';
  if (endpoint.includes('/discover/')) return 'discover';
  if (endpoint.includes('/season/')) return 'season';
  if (endpoint.includes('/recommendations')) return 'popular';
  if (endpoint.includes('/videos')) return 'videos';
  if (endpoint.match(/\/(movie|tv)\/\d+$/)) return 'details';
  return 'popular';
}

const FETCH_TIMEOUT = 8000;
const MAX_RETRIES = 1;
const RETRY_DELAY = 500;

async function fetchWithRetry(url: string, headers: Record<string, string>): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const res = await fetch(url, { headers, signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        lastError = new Error(`TMDB API error: ${res.status} ${body.slice(0, 200)}`);
        if (res.status >= 400 && res.status < 500) throw lastError;
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        }
        continue;
      }
      return res;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.name === 'AbortError') throw lastError;
      if (lastError.message.startsWith('TMDB API error: 4')) throw lastError;
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Build the fetch URL and auth headers for a TMDB request.
 * If API_CACHE_URL is set, routes through Cloudflare edge cache.
 */
function buildTmdbRequest(endpoint: string, params: Record<string, string>) {
  const env = getValidatedEnv();
  const headers: Record<string, string> = {};
  const searchParams = new URLSearchParams();

  if (env.TMDB_BEARER_TOKEN) {
    headers['Authorization'] = `Bearer ${env.TMDB_BEARER_TOKEN}`;
  } else {
    searchParams.set('api_key', env.TMDB_API_KEY!);
  }

  // Defaults
  if (!params.language) searchParams.set('language', 'en-US');
  if (!params.include_adult) searchParams.set('include_adult', 'false');

  if (['/movie/now_playing', '/movie/upcoming', '/movie/popular'].some(e => endpoint.includes(e)) && !params.region) {
    searchParams.set('region', 'US');
  }

  Object.entries(params).forEach(([key, value]) => searchParams.set(key, value));

  // Route through Cloudflare API cache if configured
  if (API_CACHE_URL) {
    const cacheUrl = `${API_CACHE_URL}/tmdb${endpoint}?${searchParams.toString()}`;
    // Auth goes via header (worker strips it before caching)
    return { url: cacheUrl, headers };
  }

  return {
    url: `${BASE_URL}${endpoint}?${searchParams.toString()}`,
    headers,
  };
}

export async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const path = endpoint.split('?')[0];
  const category = endpointToCacheCategory(path);

  return fetchWithCache(
    category,
    `${path}?${new URLSearchParams(params).toString()}`,
    async () => {
      const { url, headers } = buildTmdbRequest(endpoint, params);
      const res = await fetchWithRetry(url, headers);
      return res.json() as Promise<T>;
    }
  );
}

/**
 * Raw TMDB fetch without Redis caching — used by batch cache reads
 * where the caller manages caching via fetchBatchWithCache().
 */
export async function tmdbFetchRaw<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const { url, headers } = buildTmdbRequest(endpoint, params);
  const res = await fetchWithRetry(url, headers);
  return res.json() as Promise<T>;
}

// Re-export all types and helper functions
export interface TMDBListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMediaItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  media_type?: string;
  popularity: number;
  genre_ids?: number[];
  release_date?: string;
  first_air_date?: string;
  adult?: boolean;
  original_language?: string;
  original_title?: string;
  original_name?: string;
  video?: boolean;
  vote_count?: number;
}

export interface TMDBMediaDetails extends TMDBMediaItem {
  genres: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null; order: number }[];
    crew: { id: number; name: string; job: string; department: string; profile_path: string | null }[];
  };
  similar?: { results: TMDBMediaItem[] };
  videos?: { results: { id: string; key: string; site: string; type: string; name: string }[] };
  seasons?: { id: number; season_number: number; name: string; episode_count: number; poster_path: string | null; air_date: string }[];
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  runtime?: number;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  season_number: number;
}

export async function getTrending(mediaType: 'movie' | 'tv' | 'all' = 'all', timeWindow: 'day' | 'week' = 'week') {
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>(`/trending/${mediaType}/${timeWindow}`);
}

export async function getPopular(mediaType: 'movie' | 'tv') {
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>(`/${mediaType}/popular`);
}

export async function getTopRated(mediaType: 'movie' | 'tv') {
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>(`/${mediaType}/top_rated`);
}

export async function getNowPlaying() {
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/movie/now_playing');
}

export async function getUpcoming() {
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/movie/upcoming');
}

export async function getAiringToday() {
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/tv/airing_today');
}

export async function getOnTheAir() {
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/tv/on_the_air');
}

export async function getDetails(mediaType: 'movie' | 'tv', id: number) {
  return tmdbFetch<TMDBMediaDetails>(`/${mediaType}/${id}`, {
    append_to_response: 'credits,similar,videos',
  });
}

export async function getSeasonEpisodes(tvId: number, seasonNumber: number) {
  const data = await tmdbFetch<{ episodes: TMDBEpisode[] }>(`/tv/${tvId}/season/${seasonNumber}`);
  return data.episodes;
}

export async function searchMedia(query: string, page: string = '1') {
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/search/multi', { query, page });
}

export async function getGenres(mediaType: 'movie' | 'tv') {
  return tmdbFetch<{ genres: { id: number; name: string }[] }>(`/genre/${mediaType}/list`);
}

export async function getByGenre(
  mediaType: 'movie' | 'tv',
  genreId: number,
  extraParams?: Record<string, string>,
  page: string = '1',
) {
  const params: Record<string, string> = {
    with_genres: genreId.toString(),
    sort_by: 'popularity.desc',
    page,
  };
  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      params[key] = value;
    });
  }
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>(`/discover/${mediaType}`, params);
}

export async function getRecommendations(mediaType: 'movie' | 'tv', mediaId: number) {
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>(`/${mediaType}/${mediaId}/recommendations`);
}

export async function searchPeople(query: string, page: string = '1') {
  return tmdbFetch<TMDBListResponse<TMDBPerson>>('/search/person', { query, page });
}

export async function getPersonDetails(personId: number) {
  return tmdbFetch<TMDBPersonDetails>(`/person/${personId}`, {
    append_to_response: 'combined_credits',
  });
}

export async function getVideos(mediaType: 'movie' | 'tv', id: number) {
  const data = await tmdbFetch<{ results: TMDBVideo[] }>(`/${mediaType}/${id}/videos`);
  return data.results;
}

export async function discoverMedia(
  mediaType: 'movie' | 'tv',
  params: Record<string, string> = {},
) {
  return tmdbFetch<TMDBListResponse<TMDBMediaItem>>(`/discover/${mediaType}`, {
    sort_by: 'popularity.desc',
    ...params,
  });
}

export async function getTvDetailsWithNextEpisode(tvId: number) {
  return tmdbFetch<TMDBMediaDetails & { next_episode_to_air?: TMDBEpisode }>(
    `/tv/${tvId}`,
    { append_to_response: 'credits,similar,videos,next_episode_to_air' },
  );
}

export function getImageUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '/placeholder.svg';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getTitle(item: { title?: string; name?: string }): string {
  return item.title || item.name || 'Untitled';
}

// ===== Person types =====

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for: TMDBMediaItem[];
  known_for_department: string;
  popularity: number;
  adult: boolean;
  gender: number;
}

export interface TMDBPersonDetails extends TMDBPerson {
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  homepage: string | null;
  also_known_as: string[];
  combined_credits?: {
    cast: TMDBCombinedCredit[];
    crew: TMDBCombinedCredit[];
  };
}

export interface TMDBCombinedCredit {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: 'movie' | 'tv';
  character?: string;
  job?: string;
  department?: string;
  episode_count?: number;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  popularity?: number;
  overview?: string;
}

export interface TMDBVideo {
  id: string;
  key: string;
  site: string;
  type: string;
  name: string;
  official: boolean;
}