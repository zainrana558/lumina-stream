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
import { ANILIST_ID_OFFSET } from '@/types';
import * as jikan from '@/lib/anime/jikan';
import * as kitsu from '@/lib/anime/kitsu';
import * as tmdbAnime from '@/lib/anime/tmdb-anime';

// MAL genre ids for the Jikan fallback (AniList uses names, MAL uses numbers).
const MAL_GENRE_IDS: Record<string, string> = {
  Action: '1', Adventure: '2', Comedy: '4', Drama: '8', Fantasy: '10',
  Horror: '14', Mystery: '7', Romance: '22', 'Sci-Fi': '24', 'Slice of Life': '36',
  Sports: '30', Supernatural: '37', Thriller: '41', 'Mahou Shoujo': '66',
  Ecchi: '9', 'Award Winning': '46', Suspense: '41', 'Avant Garde': '5',
};
function genresToMalIds(names: string[]): string[] {
  const ids = names.map(n => MAL_GENRE_IDS[n]).filter(Boolean) as string[];
  return ids.length ? ids : ['1'];
}


// ---- Types ----

export type AniListSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
export type AniListMediaFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC';
export type AniListMediaStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';

export interface AniListDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export type AniListSource = 'MANGA' | 'LIGHT_NOVEL' | 'VISUAL_NOVEL' | 'VIDEO_GAME' | 'OTHER' | 'ORIGINAL' | 'NOVEL' | 'ONE_SHOT' | 'DOUJINSHI' | 'ANIME' | 'WEB_NOVEL' | 'WEB_MANGA' | 'MUSIC' | 'GAME' | 'MIXED_MEDIA' | 'PICTURE_BOOK' | 'COMIC';

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
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null;
  chapters: number | null;
  volumes: number | null;
  source: AniListSource | null;
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    medium: string | null;
    color: string | null;
  } | null;
  bannerImage: string | null;
  genres: string[];
  synonyms: string[];
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
  staff: {
    edges: Array<{
      node: {
        id: number;
        name: {
          full: string | null;
          native: string | null;
        };
        image: {
          medium: string | null;
        } | null;
      };
      role: string;
    }>;
  };
  characters: {
    edges: Array<{
      node: {
        id: number;
        name: {
          full: string | null;
          native: string | null;
        };
        image: {
          medium: string | null;
        } | null;
      };
      role: string;
      voiceActors: Array<{
        id: number;
        name: {
          full: string | null;
          native: string | null;
        };
        languageV2: string;
        image: {
          medium: string | null;
        } | null;
      }>;
    }>;
  };
  relations: {
    edges: Array<{
      relationType: string;
      node: {
        id: number;
        title: {
          romaji: string | null;
          english: string | null;
          native: string | null;
        };
        format: AniListMediaFormat | null;
        coverImage: {
          extraLarge: string | null;
          large: string | null;
        } | null;
      };
    }>;
  };
  meanScore: number | null;
  popularity: number;
  trending: number;
  favourites: number;
  nextAiringEpisode: {
    airingAt: number | null;
    episode: number | null;
    timeUntilAiring: number | null;
  } | null;
  siteUrl: string;
  trailer: {
    id: string;
    site: string;
    thumbnail: string;
  } | null;
  externalLinks: Array<{
    site: string;
    url: string;
    icon: string | null;
    type: string;
    color: string | null;
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

// Cloudflare API cache worker (set in Vercel env as API_CACHE_URL)
const API_CACHE_URL = process.env.API_CACHE_URL;

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
  nextAiringEpisode { airingAt episode timeUntilAiring }
  studios { nodes { name isAnimationStudio } }
  siteUrl
  trailer { id site thumbnail }
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
  synonyms
  tags { name rank isMediaSpoiler }
  episodes
  duration
  meanScore
  popularity
  trending
  favourites
  season
  seasonYear
  startDate { year month day }
  endDate { year month day }
  nextAiringEpisode { airingAt episode timeUntilAiring }
  source
  studios { nodes { name isAnimationStudio } }
  staff(perPage: 12) { edges { node { id name { full native } image { medium } } role } }
  characters(perPage: 15) { edges { node { id name { full native } image { medium } } role voiceActors(language: JAPANESE) { id name { full native } languageV2 image { medium } } } }
  relations { edges { relationType node { id title { romaji english native } format coverImage { extraLarge large } } } }
  siteUrl
  trailer { id site thumbnail }
  externalLinks { site url icon type color }
`;

// ---- Rate limiting (90 req/min) ----
// Uses globalThis to ensure state is shared across warm invocations
// in the same serverless isolate while being properly isolated per-cold-start.

const RATE_LIMIT = 80; // stay under 90
const WINDOW_MS = 60_000;

interface AniListRateState {
  requestCount: number;
  resetTime: number;
  // circuit breaker — AniList is frequently down (503s, rate limits, or its
  // own "API temporarily disabled" 403). After CB_THRESHOLD consecutive
  // failures we stop calling it for CB_COOLDOWN_MS instead of hammering a
  // dead endpoint on every anime request.
  fails: number;
  openUntil: number;
}

const CB_THRESHOLD = 3;
const CB_COOLDOWN_MS = 90_000;

// Proper type augmentation for globalThis
declare global {
  var __anilistRateState: AniListRateState | undefined;
}

function getRateState(): AniListRateState {
  if (!globalThis.__anilistRateState) {
    globalThis.__anilistRateState = {
      requestCount: 0,
      resetTime: 0,
      fails: 0,
      openUntil: 0,
    };
  }
  return globalThis.__anilistRateState;
}

/** Call after every AniList request so the breaker tracks health. */
export function reportAnilistResult(ok: boolean): void {
  const s = getRateState();
  if (ok) {
    s.fails = 0;
    s.openUntil = 0;
  } else if (++s.fails >= CB_THRESHOLD) {
    s.openUntil = Date.now() + CB_COOLDOWN_MS;
  }
}

async function rateLimitedFetch(body: string): Promise<Response> {
  const state = getRateState();
  const now = Date.now();
  if (state.openUntil > now) {
    throw new Error(
      `AniList circuit open — upstream unhealthy, retrying in ${Math.ceil((state.openUntil - now) / 1000)}s`,
    );
  }
  if (now > state.resetTime) {
    state.requestCount = 0;
    state.resetTime = now + WINDOW_MS;
  }
  if (state.requestCount >= RATE_LIMIT) {
    const waitMs = Math.min(state.resetTime - now, 10_000);
    if (waitMs > 0) {
      await new Promise<void>(resolve => setTimeout(resolve, waitMs));
    }
    const afterWait = Date.now();
    if (afterWait > state.resetTime) {
      state.requestCount = 0;
      state.resetTime = afterWait + WINDOW_MS;
    }
    if (state.requestCount >= RATE_LIMIT) {
      throw new Error(`AniList rate limit reached. Retry after ${Math.ceil((state.resetTime - Date.now()) / 1000)}s`);
    }
  }
  state.requestCount++;

  // AniList blocks requests from Cloudflare Workers (403).
  // Always call AniList directly from Vercel — Redis L1 cache provides
  // the caching layer. The API cache worker is NOT used for AniList.
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
  let res: Response;
  try {
    res = await rateLimitedFetch(body);
  } catch (e) {
    // circuit already open, or network error — don't double-count the CB
    if (!(e instanceof Error) || !/circuit open/.test(e.message)) reportAnilistResult(false);
    throw e;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    reportAnilistResult(false);
    throw new Error(`AniList API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    const msg = json.errors.map((e: { message: string }) => e.message).join(', ');
    reportAnilistResult(false);
    throw new Error(`AniList GraphQL error: ${msg}`);
  }

  reportAnilistResult(true);
  return json.data as T;
}

/**
 * Page-query helper: unwraps the `Page` wrapper that AniList GraphQL
 * always returns for paginated queries.
 * json.data = { Page: { media: [...], pageInfo: {...} } }
 * We want:     { media: [...], pageInfo: {...} }
 */
async function anilistPageQuery<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<AniListPage<T>> {
  const data = await anilistQuery<{ Page: AniListPage<T> }>(query, variables);
  return data.Page;
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
export function anilistToMediaItem(media: AniListMedia): MediaItem {
  // TMDB-sourced anime (last-resort fallback) — treat as a normal TMDB TV item
  // so it routes to /details/{tmdbId} and loads via the standard TMDB path,
  // NOT the AniList/MAL detail path.
  const tmdb = media as unknown as { __tmdb?: boolean; __posterPath?: string | null; __backdropPath?: string | null };
  if (tmdb.__tmdb) {
    const t = getAniListTitle(media);
    const yr = media.startDate?.year || new Date().getFullYear();
    const r = Math.round(((media.meanScore ?? 0) / 10) * 10) / 10;
    return {
      id: media.id,
      title: t,
      sub: media.title.native || '',
      genre: media.genres.length ? media.genres : ['Animation'],
      r, yr,
      eps: media.episodes || 12,
      st: 'Returning Series',
      tag: 'TV',
      cs: Math.abs(media.id) % 8,
      featured: r >= 7.5,
      progress: 0,
      desc: media.description?.replace(/<[^>]*>/g, '') || '',
      cast: [],
      epList: [],
      poster_path: tmdb.__posterPath ?? null,
      backdrop_path: tmdb.__backdropPath ?? null,
      media_type: 'tv',
    } as MediaItem;
  }

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

// Namespace the AniList ID to prevent collisions with TMDB IDs
  const namespacedId = media.id + ANILIST_ID_OFFSET;

  // Kitsu detail fallback carries real per-episode titles — surface them so the
  // episode list shows titles instead of "Episode N" placeholders.
  const kitsuEps = (media as unknown as { _kitsuEpisodes?: Array<{ number: number; title: string }> })._kitsuEpisodes;
  const epList = Array.isArray(kitsuEps)
    ? kitsuEps.map((e) => ({ ep: e.number, title: e.title, dur: '', done: false }))
    : [];

  return {
    id: namespacedId,
    title,
    sub: media.title.native || media.title.romaji || '',
    genre: genres.length > 0 ? genres : ['Action'],
    r: Math.round(score * 10) / 10,
    yr: year,
    eps: media.episodes || 12,
    st: statusMap[media.status || ''] || 'Returning Series',
    tag: media.format || 'TV',
    cs: Math.abs(namespacedId) % 8,
    featured: score >= 7.5,
    progress: 0,
    desc: media.description?.replace(/<[^>]*>/g, '') || '',
    cast: media.studios?.nodes?.map(s => s.name) || [],
    epList,
    poster_path: null, // Not a TMDB path — use _anilistCover instead
    backdrop_path: null,
    media_type: 'tv',
    _isAnilist: true,
    _anilistId: media.id,
    _anilistCover: getAniListCover(media) || undefined,
    _anilistBanner: media.bannerImage || undefined,
    _malId: media.idMal || undefined,
    _anilistUrl: media.siteUrl,
    _anilistTrailer: media.trailer?.site === 'youtube' ? media.trailer : null,
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

  return fetchWithCache('trending', `anime:v2:seasonal:${season || autoSeason}:${autoYear}:${page}:${sort}`, () =>
    anilistPageQuery<AniListMedia>(query, {
      season: season || autoSeason,
      year: autoYear,
      page,
      perPage,
      sort,
    }).catch(() => kitsu.kitsuTrending(page)).catch(() => tmdbAnime.tmdbAnimeTrending(page))
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

  return fetchWithCache('trending', `anime:v2:trending:${page}`, () =>
    anilistPageQuery<AniListMedia>(query, { page, perPage }).catch(() => kitsu.kitsuTrending(page)).catch(() => tmdbAnime.tmdbAnimeTrending(page))
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

  return fetchWithCache('popular', `anime:v2:popular:${page}`, () =>
    anilistPageQuery<AniListMedia>(query, { page, perPage }).catch(() => kitsu.kitsuPopular(page)).catch(() => tmdbAnime.tmdbAnimePopular(page))
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

  return fetchWithCache('trending', `anime:v2:upcoming:${nextSeason}:${nextYear}:${page}`, () =>
    anilistPageQuery<AniListMedia>(query, { season: nextSeason, year: nextYear, page, perPage }).catch(() => kitsu.kitsuUpcoming(page)).catch(() => tmdbAnime.tmdbAnimeUpcoming(page))
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
        }
      }
    }
  `;

  return fetchWithCache('trending', `anime:v2:airing:${page}`, () =>
    anilistPageQuery<AniListMedia>(query, { page, perPage }).catch(() => kitsu.kitsuAiring(page)).catch(() => tmdbAnime.tmdbAnimeTrending(page))
  );
}

/**
 * Search anime by title.
 *
 * `cascade` (default true) controls whether a zero-result AniList search
 * falls through to Kitsu → Jikan → TMDB-anime. Pass `false` for low-confidence
 * queries fired in a loop (e.g. a fuzzy-match fallback trying several mutated
 * variants of a typo'd query) — cascading all 4 providers on every one of
 * those would compound into several seconds of sequential requests for what
 * are mostly going to be genuine misses anyway. Full cascade is worth the
 * latency for the query the user actually typed.
 */
export async function searchAnime(
  query: string,
  page = 1,
  perPage = 10,
  options?: { cascade?: boolean },
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

  // Don't cache search results — they should be fresh.
  // Order: AniList → Kitsu → Jikan (all real anime search) → TMDB (weakest, genre-filtered TV).
  //
  // Cascades on an EMPTY result too, not just a thrown error. A provider
  // returning zero matches is a perfectly normal, successful response (not
  // a rejection), so a plain .catch() chain never reaches Kitsu/Jikan/TMDB
  // for a title AniList's own catalog simply doesn't have — confirmed by
  // reading anilistQuery(): it only throws on network failure, a non-2xx
  // response, or a GraphQL `errors` payload, never on `media: []`. These
  // catalogs don't fully overlap (an obscure or very new title can exist on
  // one and not another), so a query-level miss on AniList should still try
  // the rest before giving up, the same as an outright AniList outage does.
  const tryProvider = async (
    fn: () => Promise<AniListPage<AniListMedia>>,
  ): Promise<AniListPage<AniListMedia> | null> => {
    try {
      const result = await fn();
      return result.media && result.media.length > 0 ? result : null;
    } catch {
      return null;
    }
  };

  const anilistResult = await tryProvider(() => anilistPageQuery<AniListMedia>(gql, { search: query, page, perPage }));
  if (anilistResult || options?.cascade === false) {
    return anilistResult ?? { media: [], pageInfo: { total: 0, currentPage: page, lastPage: 0, hasNextPage: false, perPage } };
  }

  return (
    (await tryProvider(() => kitsu.kitsuSearch(query, page))) ??
    (await tryProvider(() => jikan.jikanSearch(query, page))) ??
    (await tryProvider(() => tmdbAnime.tmdbAnimeSearch(query, page))) ?? {
      media: [],
      pageInfo: { total: 0, currentPage: page, lastPage: 0, hasNextPage: false, perPage },
    }
  );
}

/**
 * Get detailed anime info by AniList ID
 */
export async function getAnimeDetail(id: number): Promise<AniListMedia | null> {
  const query = `
    query ($id: Int) {
      Media(type: ANIME, id: $id, isAdult: false) {
        ${MEDIA_DETAIL_FRAGMENT}
        recommendations(page: 1, perPage: 10, sort: [RATING_DESC]) {
          nodes {
            mediaRecommendation {
              id
              title { romaji english native }
              meanScore
              coverImage { extraLarge large }
              format
              startDate { year }
              episodes
            }
          }
        }
      }
    }
  `;

  const cached = await getCached<AniListMedia>('details', `anime:v2:detail:${id}`);
  if (cached) return cached;

  const data = await anilistQuery<{ Media: (AniListMedia & { recommendations?: { nodes: Array<{ mediaRecommendation: { id: number; title: { romaji: string | null; english: string | null; native: string | null }; meanScore: number | null; coverImage: { extraLarge: string | null; large: string | null } | null; format: AniListMediaFormat | null; startDate: { year: number | null } | null; episodes: number | null } }> } }) | null }>(query, { id }).catch(() => null);
  // When AniList is down, the id is a MAL id (see jikanToMedia / kitsuToMedia).
  // Kitsu first — no aggressive rate limit, stable under crawl load, has real
  // episode titles. Jikan second (its 3/s limit 429/504s hard under bursts, but
  // it adds recommendations).
  const result = data?.Media ?? (await kitsu.kitsuDetail(id)) ?? (await jikan.jikanDetail(id));
  if (result) {
    setCache('details', `anime:v2:detail:${id}`, result).catch(() => {});
  }
  return result;
}

/** Type for the extended detail with recommendations */
export type AniListDetailWithRecs = NonNullable<Awaited<ReturnType<typeof getAnimeDetail>>>;

/**
 * Browse the entire AniList anime catalog (sorted by popularity).
 * ~15K anime entries, paginated. Used for infinite scroll on anime page.
 */
export async function browseAllAnime(
  page = 1,
  perPage = 25,
  sort: string = 'POPULARITY_DESC',
): Promise<AniListPage<AniListMedia>> {
  const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(type: ANIME, sort: $sort, isAdult: false) {
          ${MEDIA_LIST_FRAGMENT}
        }
      }
    }
  `;

  return fetchWithCache('popular', `anime:v2:all:${sort}:${page}`, () =>
    anilistPageQuery<AniListMedia>(query, { page, perPage, sort })
      .catch(() => (sort.includes('SCORE') ? kitsu.kitsuTopRated(page) : kitsu.kitsuPopular(page)))
      .catch(() => tmdbAnime.tmdbAnimePopular(page))
  );
}

/**
 * Browse anime by genre(s). Uses AniList genre_in filter.
 */
export async function browseAnimeByGenre(
  genres: string[],
  page = 1,
  perPage = 25,
): Promise<AniListPage<AniListMedia>> {
  const query = `
    query ($genres: [String], $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(type: ANIME, genre_in: $genres, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_LIST_FRAGMENT}
        }
      }
    }
  `;

  return fetchWithCache('popular', `anime:v2:genre:${genres.join(',')}:${page}`, () =>
    anilistPageQuery<AniListMedia>(query, { genres, page, perPage })
      .catch(() => kitsu.kitsuByGenre(genres, page))
      .catch(() => tmdbAnime.tmdbAnimePopular(page))
  );
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

  return fetchWithCache('popular', `anime:v2:top:${page}`, () =>
    anilistPageQuery<AniListMedia>(query, { page, perPage }).catch(() => kitsu.kitsuTopRated(page)).catch(() => tmdbAnime.tmdbAnimeTopRated(page))
  );
}

/**
 * Get popular family-friendly anime (no ecchi, no hentai, no gore).
 * Uses genre_in with wholesome genres and excludes adult/suggestive tags.
 * Used for anime portal page and genre card backdrops.
 */
export async function getFamilyFriendlyAnime(
  page = 1,
  perPage = 20,
): Promise<AniListPage<AniListMedia>> {
  // Wholesome genres that produce family-friendly results
  const safeGenres = ['Action', 'Adventure', 'Comedy', 'Fantasy', 'Slice of Life', 'Sports', 'Supernatural'];
  const query = `
    query ($page: Int, $perPage: Int, $genres: [String]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(
          type: ANIME,
          sort: POPULARITY_DESC,
          isAdult: false,
          genre_in: $genres,
        ) {
          ${MEDIA_LIST_FRAGMENT}
        }
      }
    }
  `;

  return fetchWithCache('popular', `anime:v2:family:${page}`, () =>
    anilistPageQuery<AniListMedia>(query, { page, perPage, genres: safeGenres }).catch(() => kitsu.kitsuFamily(page)).catch(() => tmdbAnime.tmdbAnimePopular(page))
  );
}

/**
 * Get family-friendly anime banner images for genre card backdrops.
 * Returns only anime with bannerImage (wide cinematic images).
 */
export async function getFamilyFriendlyBanners(
  perPage = 15,
): Promise<AniListMedia[]> {
  const safeGenres = ['Action', 'Adventure', 'Comedy', 'Fantasy', 'Slice of Life', 'Sports'];
  const query = `
    query ($genres: [String], $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(
          type: ANIME,
          sort: POPULARITY_DESC,
          isAdult: false,
          genre_in: $genres,
        ) {
          id
          title { romaji english }
          bannerImage
          coverImage { extraLarge }
          genres
        }
      }
    }
  `;

  try {
    const data = await anilistQuery<{ Page: { media: AniListMedia[] } }>(query, {
      genres: safeGenres,
      perPage,
    });
    return (data.Page?.media || []).filter(m => m.bannerImage);
  } catch {
    return [];
  }
}
