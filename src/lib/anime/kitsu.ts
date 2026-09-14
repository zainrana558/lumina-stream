/**
 * Kitsu API — anime metadata fallback (preferred over TMDB when AniList is down).
 *
 * Why Kitsu sits between AniList and TMDB in the fallback chain:
 *  - it's a real anime database (proper titles, synopsis, scores, episode counts,
 *    per-episode titles) — far richer than treating anime as generic TMDB TV;
 *  - it's keyless with sane rate limits;
 *  - `include=mappings` returns each entry's MyAnimeList id in the SAME request,
 *    so we can key items on the MAL id — which is what the streaming layer and
 *    the anime detail path (`getAnimeDetail` → Jikan) already use.
 *
 * Responses are mapped into the `AniListMedia` shape so `anilistToMediaItem()`
 * and the rest of the app keep working unchanged. Entries without a MAL mapping
 * are dropped (their detail page couldn't resolve anyway).
 *
 * JSON:API quirks: list pagination is `page[limit]` / `page[offset]`; genres
 * live in a `categories` relationship, not inline.
 */

import type { AniListMedia, AniListPage } from '@/lib/anilist/client';

const KITSU = 'https://kitsu.app/api/edge';

// ── throttle + circuit breaker (shared, mirrors jikan.ts) ──
interface KitsuState { last: number; fails: number; openUntil: number }
declare global { var __kitsuState: KitsuState | undefined }
function st(): KitsuState {
  if (!globalThis.__kitsuState) globalThis.__kitsuState = { last: 0, fails: 0, openUntil: 0 };
  return globalThis.__kitsuState;
}
export function kitsuHealthy(): boolean {
  return st().openUntil <= Date.now();
}

async function kget<T>(path: string, countBreaker = true): Promise<T> {
  const s = st();
  const now = Date.now();
  if (countBreaker && s.openUntil > now) throw new Error('Kitsu circuit open');

  // Be a good citizen — Kitsu is generous but not unlimited. Everything is
  // cached upstream via fetchWithCache anyway.
  const wait = 700 - (now - s.last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  s.last = Date.now();

  const trip = () => { if (countBreaker && ++s.fails >= 3) s.openUntil = Date.now() + 90_000; };

  let res: Response;
  try {
    res = await fetch(`${KITSU}${path}`, {
      headers: { Accept: 'application/vnd.api+json' },
      signal: AbortSignal.timeout(9000),
    });
  } catch (e) {
    trip();
    throw e;
  }
  if (res.status === 429 || res.status >= 500) {
    trip();
    throw new Error(`Kitsu ${res.status}`);
  }
  if (!res.ok) throw new Error(`Kitsu ${res.status}`);
  if (countBreaker) s.fails = 0;
  return res.json() as Promise<T>;
}

// ── JSON:API types (only the fields we read) ──
interface KitsuResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data?: Array<{ id: string; type: string }> | { id: string; type: string } }>;
}
interface KitsuListResp { data: KitsuResource[]; included?: KitsuResource[]; links?: { next?: string } }
interface KitsuOneResp { data: KitsuResource; included?: KitsuResource[] }

interface KitsuImage { tiny?: string; small?: string; medium?: string; large?: string; original?: string }

const SUBTYPE_MAP: Record<string, AniListMedia['format']> = {
  TV: 'TV', movie: 'MOVIE', OVA: 'OVA', ONA: 'ONA', special: 'SPECIAL', music: 'MUSIC',
};
const STATUS_MAP: Record<string, AniListMedia['status']> = {
  current: 'RELEASING', finished: 'FINISHED', upcoming: 'NOT_YET_RELEASED',
  tba: 'NOT_YET_RELEASED', unreleased: 'NOT_YET_RELEASED',
};

/** Pull the MAL id for an anime from the included `mappings` resources. */
function malIdFor(anime: KitsuResource, included: KitsuResource[]): number | null {
  const rel = anime.relationships?.mappings?.data;
  const ids = new Set((Array.isArray(rel) ? rel : rel ? [rel] : []).map((r) => r.id));
  for (const inc of included) {
    if (inc.type !== 'mappings' || !ids.has(inc.id)) continue;
    const site = inc.attributes.externalSite;
    if (site === 'myanimelist/anime') {
      const ext = Number(inc.attributes.externalId);
      if (Number.isFinite(ext) && ext > 0) return ext;
    }
  }
  return null;
}

/** Category (genre) titles for an anime from included `categories` resources. */
function categoriesFor(anime: KitsuResource, included: KitsuResource[]): string[] {
  const rel = anime.relationships?.categories?.data;
  const ids = new Set((Array.isArray(rel) ? rel : rel ? [rel] : []).map((r) => r.id));
  return included
    .filter((inc) => inc.type === 'categories' && ids.has(inc.id))
    .map((inc) => String(inc.attributes.title || ''))
    .filter(Boolean)
    .slice(0, 8);
}

function kitsuToMedia(anime: KitsuResource, malId: number, genres: string[]): AniListMedia {
  const a = anime.attributes;
  const poster = a.posterImage as KitsuImage | undefined;
  const cover = a.coverImage as KitsuImage | undefined;
  const posterUrl = poster?.large || poster?.medium || poster?.small || poster?.original || null;
  const titles = (a.titles as Record<string, string>) || {};
  const startDate = (a.startDate as string | null) || null;
  const year = startDate ? Number(startDate.slice(0, 4)) : null;
  // Kitsu averageRating is a stringified 0-100 number.
  const rating = a.averageRating != null ? Number(a.averageRating) : null;

  return {
    id: malId,
    idMal: malId,
    title: {
      romaji: titles.en_jp || (a.canonicalTitle as string) || null,
      english: titles.en || (a.canonicalTitle as string) || null,
      native: titles.ja_jp || null,
    },
    type: 'ANIME',
    format: (SUBTYPE_MAP[a.subtype as string]) || 'TV',
    status: (STATUS_MAP[a.status as string]) || null,
    description: (a.synopsis as string) || (a.description as string) || null,
    startDate: startDate
      ? { year, month: Number(startDate.slice(5, 7)) || null, day: Number(startDate.slice(8, 10)) || null }
      : null,
    endDate: null,
    season: null,
    seasonYear: year,
    episodes: (a.episodeCount as number) ?? null,
    duration: (a.episodeLength as number) ?? null,
    chapters: null,
    volumes: null,
    source: null,
    coverImage: { extraLarge: posterUrl, large: posterUrl, medium: posterUrl, color: null },
    bannerImage: cover?.original || cover?.large || null,
    genres,
    synonyms: (a.abbreviatedTitles as string[]) || [],
    tags: [],
    studios: { nodes: [] },
    staff: { edges: [] },
    characters: { edges: [] },
    relations: { edges: [] },
    meanScore: rating != null && Number.isFinite(rating) ? Math.round(rating) : null,
    averageScore: rating != null && Number.isFinite(rating) ? Math.round(rating) : null,
    popularity: (a.userCount as number) ?? 0,
    trending: (a.favoritesCount as number) ?? 0,
    favourites: (a.favoritesCount as number) ?? 0,
    nextAiringEpisode: null,
    trailer: a.youtubeVideoId ? { id: a.youtubeVideoId as string, site: 'youtube', thumbnail: null } : null,
    siteUrl: anime.attributes.slug ? `https://kitsu.app/anime/${anime.attributes.slug}` : null,
    externalLinks: [],
  } as unknown as AniListMedia;
}

function toPage(items: AniListMedia[], pg: number, hasNext: boolean): AniListPage<AniListMedia> {
  return {
    media: items,
    pageInfo: { total: items.length, currentPage: pg, lastPage: hasNext ? pg + 1 : pg, hasNextPage: hasNext, perPage: items.length },
  } as AniListPage<AniListMedia>;
}

const PER = 20;

async function listQuery(query: string, pg: number): Promise<AniListPage<AniListMedia>> {
  const offset = (pg - 1) * PER;
  const sep = query.includes('?') ? '&' : '?';
  const r = await kget<KitsuListResp>(
    `/anime${sep}${query}&include=mappings,categories&page%5Blimit%5D=${PER}&page%5Boffset%5D=${offset}`,
  );
  const included = r.included || [];
  const media: AniListMedia[] = [];
  for (const anime of r.data || []) {
    const malId = malIdFor(anime, included);
    if (!malId) continue;
    media.push(kitsuToMedia(anime, malId, categoriesFor(anime, included)));
  }
  return toPage(media, pg, !!r.links?.next);
}

// ── list endpoints ──
export const kitsuPopular   = (pg = 1) => listQuery('sort=-userCount&filter%5Bsubtype%5D=TV,movie,ONA,OVA', pg);
export const kitsuTrending  = (pg = 1) => listQuery('sort=-userCount&filter%5Bstatus%5D=current', pg);
export const kitsuAiring    = (pg = 1) => listQuery('sort=-userCount&filter%5Bstatus%5D=current', pg);
export const kitsuTopRated  = (pg = 1) => listQuery('sort=-averageRating&filter%5Bsubtype%5D=TV', pg);
export const kitsuUpcoming  = (pg = 1) => listQuery('sort=-userCount&filter%5Bstatus%5D=upcoming', pg);
export const kitsuByGenre   = (genres: string[], pg = 1) =>
  listQuery(`sort=-userCount&filter%5Bcategories%5D=${encodeURIComponent(genres.map((g) => g.toLowerCase().replace(/\s+/g, '-')).join(','))}`, pg);
export const kitsuFamily    = (pg = 1) => listQuery('sort=-userCount&filter%5BageRating%5D=G,PG', pg);
export const kitsuSearch    = (q: string, pg = 1) =>
  listQuery(`filter%5Btext%5D=${encodeURIComponent(q)}`, pg);

// ── detail ──
export async function kitsuDetail(malId: number): Promise<AniListMedia | null> {
  if (!malId || malId < 1) return null;
  try {
    // Reverse-lookup by MAL mapping, then hydrate with categories + episodes.
    const lookup = await kget<KitsuListResp>(
      `/mappings?filter%5BexternalSite%5D=myanimelist/anime&filter%5BexternalId%5D=${malId}&include=item`,
      false,
    );
    const item = (lookup.included || []).find((i) => i.type === 'anime');
    if (!item) return null;

    const full = await kget<KitsuOneResp>(`/anime/${item.id}?include=categories`, false);
    const genres = categoriesFor(full.data, full.included || []);
    const base = kitsuToMedia(full.data, malId, genres);

    // Episode titles — a real win over the numbered-placeholder fallback.
    let episodes: Array<{ number: number; title: string }> = [];
    try {
      const eps = await kget<KitsuListResp>(`/anime/${item.id}/episodes?sort=number&page%5Blimit%5D=50`, false);
      episodes = (eps.data || [])
        .map((e) => ({
          number: Number(e.attributes.number) || 0,
          title: String(e.attributes.canonicalTitle || '') || `Episode ${e.attributes.number}`,
        }))
        .filter((e) => e.number > 0);
    } catch { /* optional */ }

    return { ...base, _kitsuEpisodes: episodes } as unknown as AniListMedia;
  } catch {
    return null;
  }
}
