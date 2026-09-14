/**
 * Jikan (unofficial MyAnimeList API) — anime metadata fallback.
 *
 * AniList's public GraphQL API is frequently disabled outright. Jikan mirrors
 * MyAnimeList, is free + keyless, and — critically — returns MAL ids, which the
 * streaming layer already keys anime embeds on (`getAnimeUrl(malId)`).
 *
 * We map Jikan responses into the same `AniListMedia` shape the rest of the app
 * consumes, so `anilistToMediaItem()` / the anime detail page keep working
 * unchanged. Jikan is rate-limited (~3 req/s, 60/min) — every call goes through
 * `fetchWithCache` upstream, and this module adds a light in-process throttle +
 * circuit breaker.
 */

import type { AniListMedia, AniListPage } from '@/lib/anilist/client';

// Direct to Jikan. The api-cache Worker proxy 504s on /jikan/* — Jikan sits
// behind Cloudflare and rejects Worker-origin (CF IP) requests — whereas the
// origin box reaches it fine. Responses are still Redis-cached upstream via
// fetchWithCache, and this module throttles + circuit-breaks locally.
const JIKAN = 'https://api.jikan.moe/v4';

// ── throttle + circuit breaker ──
interface JikanState { last: number; fails: number; openUntil: number }
declare global { var __jikanState: JikanState | undefined }
function st(): JikanState {
  if (!globalThis.__jikanState) globalThis.__jikanState = { last: 0, fails: 0, openUntil: 0 };
  return globalThis.__jikanState;
}
export function jikanHealthy(): boolean {
  return st().openUntil <= Date.now();
}

/**
 * @param countBreaker when false, failures don't trip the shared circuit
 *   breaker. Single-resource endpoints (`/anime/{id}`) are reliable even when
 *   the ranked-list endpoints (`/top`, heavy `/anime?order_by`) are 504-ing, so
 *   detail lookups shouldn't be blocked by list flakiness (or vice-versa).
 */
async function jget<T>(path: string, countBreaker = true): Promise<T> {
  const s = st();
  const now = Date.now();
  if (countBreaker && s.openUntil > now) throw new Error('Jikan circuit open');

  // Jikan's rate limit is tight (3 req/s, 60/min) and it 504s aggressively when
  // exceeded — stay well under 1 req/s. Every call is cached 24h upstream anyway.
  const wait = 1500 - (now - s.last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  s.last = Date.now();

  const trip = () => { if (countBreaker && ++s.fails >= 3) s.openUntil = Date.now() + 90_000; };

  let res: Response;
  try {
    res = await fetch(`${JIKAN}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    });
  } catch (e) {
    trip();
    throw e;
  }
  if (res.status === 429 || res.status >= 500) {
    trip();
    throw new Error(`Jikan ${res.status}`);
  }
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  if (countBreaker) s.fails = 0;
  return res.json() as Promise<T>;
}

// ── Jikan → AniListMedia mapper ──

interface JikanAnime {
  mal_id: number;
  url?: string;
  title?: string;
  title_english?: string | null;
  title_japanese?: string | null;
  title_synonyms?: string[];
  type?: string | null;             // TV, Movie, OVA, ONA, Special, Music
  source?: string | null;
  episodes?: number | null;
  status?: string | null;           // "Finished Airing" | "Currently Airing" | "Not yet aired"
  airing?: boolean;
  duration?: string | null;
  score?: number | null;
  scored_by?: number | null;
  members?: number | null;
  favorites?: number | null;
  synopsis?: string | null;
  season?: string | null;
  year?: number | null;
  aired?: { from?: string | null; prop?: { from?: { day: number | null; month: number | null; year: number | null } } };
  images?: { jpg?: Record<string, string>; webp?: { image_url?: string; small_image_url?: string; large_image_url?: string } };
  trailer?: { youtube_id?: string | null; url?: string | null };
  genres?: Array<{ mal_id: number; name: string }>;
  themes?: Array<{ mal_id: number; name: string }>;
  demographics?: Array<{ mal_id: number; name: string }>;
  studios?: Array<{ mal_id: number; name: string }>;
  relations?: Array<{ relation: string; entry: Array<{ mal_id: number; name: string; type: string }> }>;
}

const FORMAT_MAP: Record<string, AniListMedia['format']> = {
  TV: 'TV', Movie: 'MOVIE', OVA: 'OVA', ONA: 'ONA', Special: 'SPECIAL', Music: 'MUSIC', 'TV Special': 'TV_SHORT',
};
const STATUS_MAP: Record<string, AniListMedia['status']> = {
  'Finished Airing': 'FINISHED', 'Currently Airing': 'RELEASING', 'Not yet aired': 'NOT_YET_RELEASED',
};

export function jikanToMedia(j: JikanAnime): AniListMedia {
  const cover = j.images?.webp?.large_image_url || j.images?.webp?.image_url
    || j.images?.jpg?.large_image_url || j.images?.jpg?.image_url || null;
  const from = j.aired?.prop?.from;
  const genres = [
    ...(j.genres || []),
    ...(j.themes || []),
    ...(j.demographics || []),
  ].map((g) => g.name);

  return {
    id: j.mal_id,
    idMal: j.mal_id,
    title: {
      romaji: j.title || j.title_english || null,
      english: j.title_english || j.title || null,
      native: j.title_japanese || null,
    },
    type: 'ANIME',
    format: (j.type && FORMAT_MAP[j.type]) || 'TV',
    status: (j.status && STATUS_MAP[j.status]) || null,
    description: j.synopsis || null,
    startDate: from
      ? { year: from.year, month: from.month, day: from.day }
      : (j.year ? { year: j.year, month: null, day: null } : null),
    endDate: null,
    season: (j.season ? j.season.toUpperCase() : null) as AniListMedia['season'],
    seasonYear: j.year ?? null,
    episodes: j.episodes ?? null,
    duration: null,
    chapters: null,
    volumes: null,
    source: null,
    coverImage: { extraLarge: cover, large: cover, medium: cover, color: null },
    bannerImage: null,
    genres,
    synonyms: j.title_synonyms || [],
    tags: [],
    studios: { nodes: (j.studios || []).map((s) => ({ id: s.mal_id, name: s.name, isAnimationStudio: true })) },
    staff: { edges: [] },
    characters: { edges: [] },
    relations: { edges: [] },
    // AniList score is 0-100; MAL is 0-10 → scale up so anilistToMediaItem's /10 works.
    meanScore: j.score != null ? Math.round(j.score * 10) : null,
    averageScore: j.score != null ? Math.round(j.score * 10) : null,
    popularity: j.members ?? 0,
    trending: j.favorites ?? 0,
    favourites: j.favorites ?? 0,
    nextAiringEpisode: null,
    trailer: j.trailer?.youtube_id ? { id: j.trailer.youtube_id, site: 'youtube', thumbnail: null } : null,
    siteUrl: j.url || null,
    externalLinks: [],
  } as unknown as AniListMedia;
}

function page<T>(items: T[], current: number, hasNext: boolean): AniListPage<T> {
  return {
    media: items,
    pageInfo: { total: items.length, currentPage: current, lastPage: hasNext ? current + 1 : current, hasNextPage: hasNext, perPage: items.length },
  } as AniListPage<T>;
}

// ── list endpoints ──

type JikanListResp = { data: JikanAnime[]; pagination?: { has_next_page?: boolean; current_page?: number } };

async function list(path: string, pg: number): Promise<AniListPage<AniListMedia>> {
  const r = await jget<JikanListResp>(path);
  const media = (r.data || []).filter((a) => a.mal_id).map(jikanToMedia);
  return page(media, r.pagination?.current_page || pg, !!r.pagination?.has_next_page);
}

// MAL genre ids: 1 Action, 2 Adventure, 4 Comedy, 8 Drama, 10 Fantasy, 14 Horror,
// 7 Mystery, 22 Romance, 24 Sci-Fi, 36 Slice of Life, 30 Sports, 37 Supernatural, 41 Suspense.
// Jikan's precomputed /top/anime?filter= endpoints are far more reliable than
// /anime?order_by= (which 504s on the heavy sort). Use /top for ranked lists,
// /anime?q= only for search (which is fine), and /anime?genres= for genre.
export const jikanPopular   = (pg = 1) => list(`/top/anime?filter=bypopularity&page=${pg}`, pg);
export const jikanTrending  = (pg = 1) => list(`/top/anime?filter=airing&page=${pg}`, pg);
export const jikanAiring    = (pg = 1) => list(`/top/anime?filter=airing&page=${pg}`, pg);
export const jikanTopRated  = (pg = 1) => list(`/top/anime?type=tv&page=${pg}`, pg);
export const jikanSeasonNow = (pg = 1) => list(`/top/anime?filter=airing&page=${pg}`, pg);
export const jikanUpcoming  = (pg = 1) => list(`/top/anime?filter=upcoming&page=${pg}`, pg);
export const jikanBrowseAll = (pg = 1) => list(`/top/anime?filter=bypopularity&page=${pg}`, pg);
export const jikanSearch    = (q: string, pg = 1) =>
  list(`/anime?sfw=true&q=${encodeURIComponent(q)}&limit=24&page=${pg}`, pg);
// genres= / order_by= on /anime 504s hard. Use the precomputed popular list and
// let the TMDB tail handle real genre filtering.
export const jikanByGenre   = (_genreIds: string[], pg = 1) =>
  list(`/top/anime?filter=bypopularity&page=${pg}`, pg);
export const jikanFamily = (pg = 1) =>
  list(`/top/anime?filter=bypopularity&page=${pg}`, pg);

export async function jikanDetail(malId: number): Promise<AniListMedia | null> {
  if (!malId || malId < 1) return null;
  // Jikan's 3/s limit 429/504s hard under crawl bursts. countBreaker=true here so
  // a run of failures opens the shared circuit and callers fall straight through
  // to their next source for 90s instead of piling more load on Jikan.
  if (!jikanHealthy()) return null;
  try {
    const r = await jget<{ data: JikanAnime }>(`/anime/${malId}/full`);
    if (!r.data?.mal_id) return null;
    const base = jikanToMedia(r.data);
    let recs: AniListMedia[] = [];
    // Recommendations are a nice-to-have — skip the extra call if the breaker
    // is already close to tripping.
    if (jikanHealthy()) {
      try {
        const rr = await jget<{ data: Array<{ entry: JikanAnime }> }>(`/anime/${malId}/recommendations`);
        recs = (rr.data || []).slice(0, 10).map((x) => jikanToMedia(x.entry as JikanAnime));
      } catch { /* optional */ }
    }
    return { ...base, recommendations: { nodes: recs.map((m) => ({ mediaRecommendation: m })) } } as unknown as AniListMedia;
  } catch {
    return null;
  }
}
