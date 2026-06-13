/**
 * AniList GraphQL API client
 *
 * Free, no API key required. Rate limit: 90 req/min.
 * All anime/manga data sourced from AniList's community-maintained database.
 *
 * Features:
 * - Seasonal anime browsing (Winter/Spring/Summer/Fall)
 * - Full anime catalog search
 * - Trending + popular anime
 * - Upcoming next season
 * - Anime details with episode counts, scores, genres, studios
 */

import { fetchWithCache, getCached, setCache } from '@/lib/cache';
import type { MediaItem } from '@/types';

// ---- Types ----

export type AniListSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
export type AniListMediaFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC';
export type AniListMediaStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';

export interface AniListDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface AniListMedia {
  id: number;
  idMal: number | null;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  type: 'ANIME' | 'MANGA';
  format: AniListMediaFormat | null;
  status: AniListMediaStatus | null;
  description: string | null;
  startDate: AniListDate | null;
  endDate: AniListDate | null;
  season: AniListSeason | null;
  episodes: number | null;
  duration: number | null;
  chapters: number | null;
  volumes: number | null;
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    medium: string | null;
    color: string | null;
  } | null;
  bannerImage: string | null;
  genres: string[];
  tags: Array<{
    name: string;
    rank: number | null;
    isMediaSpoiler: boolean;
  }>;
  studios: {
    nodes: Array<{
      id: number;
      name: string;
      isAnimationStudio: boolean;
    }>;
  };
  meanScore: number | null;
  popularity: number;
  trending: number;
  favourites: number;
  nextEpisode: {
    airingAt: number | null;
    episode: number | null;
    timeUntilAiring: number | null;
  } | null;
  siteUrl: string;
  externalLinks: Array<{
    site: string;
    url: string;
    icon: string | null;
  }>;
}

export interface AniListPage<T> {
  pageInfo: {
    total: number;
    currentPage: number;
    lastPage: number;
    hasNextPage: boolean;
    perPage: number;
  };
  media: T[];
}

// ---- GraphQL fragments ----

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

// Minimal fields for list views (keeps payload small)
const MEDIA_LIST_FRAGMENT = `
  id
  idMal
  title { romaji english native }
  format
  status
  coverImage { extraLarge large medium color }
  bannerImage
  genres
  episodes
  duration
  meanScore
  popularity
  trending
  favourites
  season
  startDate { year month day }
  endDate { year month day }
  nextEpisode { airingAt episode timeUntilAiring }
  studios { nodes { name isAnimationStudio } }
  siteUrl
`;

// Full fields for detail views
const MEDIA_DETAIL_FRAGMENT = `
  id
  idMal
  title { romaji english native }
  format
  status
  description(asHtml: false)
  coverImage { extraLarge large medium color }
  bannerImage
  genres
  tags { name rank isMediaSpoiler }
  episodes
  duration
  meanScore
  popularity
  trending
  favourites
  season
  startDate { year month day }
  endDate { year month day }
  nextEpisode { airingAt episode timeUntilAiring }
  studios { nodes { name isAnimationStudio } }
  siteUrl
  externalLinks { site url icon }
`;

// ---- Rate limiting (90 req/min) ----
// Uses globalThis to ensure state is shared across warm invocations
// in the same serverless isolate while being properly isolated per-cold-start.

const RATE_LIMIT = 80; // stay under 90
const WINDOW_MS = 60_000;

interface AniListRateState {
  requestCount: number;
  resetTime: number;
}

// Proper type augmentation for globalThis
declare global {
  var __anilistRateState: AniListRateState | undefined;
}

function getRateState(): AniListRateState {
  if (!globalThis.__anilistRateState) {
    globalThis.__anilistRateState = {
      requestCount: 0,
      resetTime: 0,
    };
  }
  return globalThis.__anilistRateState;
}

async function rateLimitedFetch(body: string): Promise<Response> {
  const state = getRateState();
  const now = Date.now();
  if (now > state.resetTime) {
    state.requestCount = 0;
    state.resetTime = now + WINDOW_MS;
  }
  if (state.requestCount >= RATE_LIMIT) {
    // Instead of throwing (which wastes the entire serverless function),
    // sleep until the window resets. Cap at 10s to avoid burning function time.
    const waitMs = Math.min(state.resetTime - now, 10_000);
    if (waitMs > 0) {
      await new Promise<void>(resolve => setTimeout(resolve, waitMs));
    }
    // Re-check after waiting
    const afterWait = Date.now();
    if (afterWait > state.resetTime) {
      state.requestCount = 0;
      state.resetTime = afterWait + WINDOW_MS;
    }
    // If still over limit after capped wait, throw
    if (state.requestCount >= RATE_LIMIT) {
      throw new Error(`AniList rate limit reached. Retry after ${Math.ceil((state.resetTime - Date.now()) / 1000)}s`);
    }
  }
  state.requestCount++;

  return fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
  });
}

// ---- Core fetcher ----

async function anilistQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const body = JSON.stringify({ query, variables });
  const res = await rateLimitedFetch(body);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AniList API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    const msg = json.errors.map((e: { message: string }) => e.message).join(', ');
    throw new Error(`AniList GraphQL error: ${msg}`);
  }

  return json.data as T;
}

// ---- Helpers ----

export function getAniListTitle(media: { title: { romaji: string | null; english: string | null; native: string | null } }): string {
  return media.title.english || media.title.romaji || media.title.native || 'Untitled';
}

export function getAniListCover(media: AniListMedia): string | null {
  return media.coverImage?.extraLarge || media.coverImage?.large || null;
}

/**
 * Convert AniList media to app MediaItem format.
 * AniList covers use full URLs (not TMDB paths), stored in _anilistCover.
 */
export function anilistToMediaItem(media: AniListMedia): MediaItem & { _anilistCover?: string; _anilistBanner?: string; _malId?: number; _anilistUrl?: string } {
  const title = getAniListTitle(media);
  const year = media.startDate?.year || new Date().getFullYear();
  // AniList scores are 0-100, our app uses 0-10
  const score = (media.meanScore ?? 0) / 10;

  const genreMap: Record<string, string> = {
    'Action': 'Action', 'Adventure': 'Adventure', 'Comedy': 'Comedy',
    'Drama': 'Drama', 'Fantasy': 'Fantasy', 'Horror': 'Horror',
    'Mystery': 'Mystery', 'Romance': 'Romance', 'Sci-Fi': 'Sci-Fi',
    'Thriller': 'Thriller', 'Slice of Life': 'Slice of Life',
    'Sports': 'Sports', 'Supernatural': 'Supernatural',
  };
  const genres = media.genres.map(g => genreMap[g] || g);

  const statusMap: Record<string, string> = {
    'FINISHED': 'Ended',
    'RELEASING': 'Returning Series',
    'NOT_YET_RELEASED': 'Planned',
    'CANCELLED': 'Cancelled',
    'HIATUS': 'Hiatus',
  };

  return {
    id: media.id,
    title,
    sub: media.title.native || media.title.romaji || '',
    genre: genres.length > 0 ? genres : ['Action'],
    r: Math.round(score * 10) / 10,
    yr: year,
    eps: media.episodes || 12,
    st: statusMap[media.status || ''] || 'Returning Series',
    tag: media.format || 'TV',
    cs: Math.abs(media.id) % 8,
    featured: score >= 7.5,
    progress: 0,
    desc: media.description?.replace(/<[^>]*>/g, '') || '',
    cast: media.studios?.nodes?.map(s => s.name) || [],
    epList: [],
    poster_path: null, // Not a TMDB path — use _anilistCover instead
    backdrop_path: null,
    media_type: 'tv',
    _anilistCover: getAniListCover(media) || undefined,
    _anilistBanner: media.bannerImage || undefined,
    _malId: media.idMal || undefined,
    _anilistUrl: media.siteUrl,
  };
}

// ---- Public API functions ----

/**
 * Get current season's anime (auto-detects season/year)
 */
export async function getSeasonalAnime(
  season?: AniListSeason,
  year?: number,
  page = 1,
  perPage = 20,
  sort: string = 'POPULARITY_DESC'
): Promise<AniListPage<AniListMedia>> {
  const now = new Date();
  const currentMonth = now.getMonth();
  let autoSeason: AniListSeason = 'SPRING';
  let autoYear = year || now.getFullYear();

  if (!season) {
    if (currentMonth >= 0 && currentMonth <= 2) autoSeason = 'WINTER';
    else if (currentMonth >= 3 && currentMonth <= 5) autoSeason = 'SPRING';
    else if (currentMonth >= 6 && currentMonth <= 8) autoSeason = 'SUMMER';
    else autoSeason = 'FALL';

    // Last month of a season? Show next season
    if (currentMonth === 2 || currentMonth === 5 || currentMonth === 8 || currentMonth === 11) {
      const nextSeasons: Record<string, AniListSeason> = {
        'WINTER': 'SPRING', 'SPRING': 'SUMMER', 'SUMMER': 'FALL', 'FALL': 'WINTER',
      };
      autoSeason = nextSeasons[autoSeason];
      if (autoSeason === 'WINTER') autoYear++;
    }
  }

  const query = `
    query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(type: ANIME, season: $season, seasonYear: $year, sort: $sort, isAdult: false) {
          ${MEDIA_LIST_FRAGMENT}
        }
      }
    }
  `;

  return fetchWithCache('trending', `anilist:seasonal:${season || autoSeason}:${autoYear}:${page}:${sort}`, () =>
    anilistQuery<AniListPage<AniListMedia>>(query, {
      season: season || autoSeason,
      year: autoYear,
      page,
      perPage,
      sort,
    })
  );
}

/**
 * Get trending anime this season
 */
export async function getTrendingAnime(page = 1, perPage = 20): Promise<AniListPage<AniListMedia>> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_LIST_FRAGMENT}
        }
      }
    }
  `;

  return fetchWithCache('trending', `anilist:trending:${page}`, () =>
    anilistQuery<AniListPage<AniListMedia>>(query, { page, perPage })
  );
}

/**
 * Get popular all-time anime
 */
export async function getPopularAnime(page = 1, perPage = 20): Promise<AniListPage<AniListMedia>> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_LIST_FRAGMENT}
        }
      }
    }
  `;

  return fetchWithCache('popular', `anilist:popular:${page}`, () =>
    anilistQuery<AniListPage<AniListMedia>>(query, { page, perPage })
  );
}

/**
 * Get upcoming/next season anime
 */
export async function getUpcomingAnime(
  season?: AniListSeason,
  year?: number,
  page = 1,
  perPage = 20
): Promise<AniListPage<AniListMedia>> {
  const now = new Date();
  const currentMonth = now.getMonth();
  const seasons: AniListSeason[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const currentIdx = currentMonth <= 2 ? 0 : currentMonth <= 5 ? 1 : currentMonth <= 8 ? 2 : 3;
  const nextIdx = (currentIdx + 1) % 4;
  let nextYear = year || now.getFullYear();
  if (nextIdx === 0 && !year) nextYear++;

  const nextSeason = season || seasons[nextIdx];

  const query = `
    query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC, status: NOT_YET_RELEASED, isAdult: false) {
          ${MEDIA_LIST_FRAGMENT}
        }
      }
    }
  `;

  return fetchWithCache('trending', `anilist:upcoming:${nextSeason}:${nextYear}:${page}`, () =>
    anilistQuery<AniListPage<AniListMedia>>(query, { season: nextSeason, year: nextYear, page, perPage })
  );
}

/**
 * Get anime currently airing (has next episode info)
 */
export async function getAiringAnime(page = 1, perPage = 20): Promise<AniListPage<AniListMedia>> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING, isAdult: false) {
          ${MEDIA_LIST_FRAGMENT}
          nextEpisode { airingAt episode timeUntilAiring }
        }
      }
    }
  `;

  return fetchWithCache('trending', `anilist:airing:${page}`, () =>
    anilistQuery<AniListPage<AniListMedia>>(query, { page, perPage })
  );
}

/**
 * Search anime by title
 */
export async function searchAnime(
  query: string,
  page = 1,
  perPage = 10
): Promise<AniListPage<AniListMedia>> {
  const gql = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
          ${MEDIA_LIST_FRAGMENT}
        }
      }
    }
  `;

  // Don't cache search results — they should be fresh
  return anilistQuery<AniListPage<AniListMedia>>(gql, { search: query, page, perPage });
}

/**
 * Get detailed anime info by AniList ID
 */
export async function getAnimeDetail(id: number): Promise<AniListMedia | null> {
  const query = `
    query ($id: Int) {
      Media(type: ANIME, id: $id, isAdult: false) {
        ${MEDIA_DETAIL_FRAGMENT}
      }
    }
  `;

  const cached = await getCached<AniListMedia>('details', `anilist:detail:${id}`);
  if (cached) return cached;

  const data = await anilistQuery<{ Media: AniListMedia | null }>(query, { id });
  const result = data.Media;
  if (result) {
    setCache('details', `anilist:detail:${id}`, result).catch(() => {});
  }
  return result;
}

/**
 * Get top-rated anime (by score)
 */
export async function getTopRatedAnime(page = 1, perPage = 20): Promise<AniListPage<AniListMedia>> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(type: ANIME, sort: SCORE_DESC, isAdult: false) {
          ${MEDIA_LIST_FRAGMENT}
        }
      }
    }
  `;

  return fetchWithCache('popular', `anilist:top:${page}`, () =>
    anilistQuery<AniListPage<AniListMedia>>(query, { page, perPage })
  );
}
