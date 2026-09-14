/**
 * TMDB anime fallback — last resort when BOTH AniList and Jikan are unavailable.
 *
 * TMDB carries anime as Japanese-origin animation (genre 16 + original_language
 * ja). We map it into the `AniListMedia` shape so it flows through the same
 * `anilistToMediaItem()` pipeline. These items get real TMDB ids (not
 * namespaced), so they route to normal /details/{tmdbId} pages.
 */

import type { AniListMedia, AniListPage } from '@/lib/anilist/client';
import { fetchWithCache } from '@/lib/cache';
import { tmdbFetchRaw } from '@/lib/tmdb/server';

interface TmdbTv {
  id: number;
  name?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  popularity?: number;
  first_air_date?: string;
  genre_ids?: number[];
}

const G: Record<number, string> = {
  16: 'Animation', 10759: 'Action', 35: 'Comedy', 18: 'Drama', 10765: 'Sci-Fi',
  9648: 'Mystery', 80: 'Crime', 10768: 'War', 37: 'Western', 10751: 'Family',
};

function toMedia(t: TmdbTv): AniListMedia {
  const cover = t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : null;
  const year = t.first_air_date ? Number(t.first_air_date.slice(0, 4)) : null;
  return {
    // marker fields consumed by anilistToMediaItem() to emit a plain TMDB item
    __tmdb: true,
    __posterPath: t.poster_path ?? null,
    __backdropPath: t.backdrop_path ?? null,
    id: t.id,
    idMal: null,
    title: { romaji: t.name || t.original_name || null, english: t.name || null, native: t.original_name || null },
    type: 'ANIME',
    format: 'TV',
    status: null,
    description: t.overview || null,
    startDate: year ? { year, month: null, day: null } : null,
    endDate: null,
    season: null,
    seasonYear: year,
    episodes: null,
    duration: null, chapters: null, volumes: null, source: null,
    coverImage: { extraLarge: cover, large: cover, medium: cover, color: null },
    bannerImage: t.backdrop_path ? `https://image.tmdb.org/t/p/w1280${t.backdrop_path}` : null,
    genres: (t.genre_ids || []).map((g) => G[g]).filter(Boolean),
    synonyms: [], tags: [],
    studios: { nodes: [] }, staff: { edges: [] }, characters: { edges: [] }, relations: { edges: [] },
    meanScore: t.vote_average != null ? Math.round(t.vote_average * 10) : null,
    averageScore: t.vote_average != null ? Math.round(t.vote_average * 10) : null,
    popularity: Math.round(t.popularity || 0),
    trending: Math.round(t.popularity || 0),
    favourites: 0,
    nextAiringEpisode: null,
    trailer: null,
    siteUrl: null,
    externalLinks: [],
  } as unknown as AniListMedia;
}

async function discover(params: Record<string, string>, pg: number): Promise<AniListPage<AniListMedia>> {
  const key = `tmdb-anime:${new URLSearchParams(params).toString()}:${pg}`;
  const data = await fetchWithCache('discover', key, () =>
    tmdbFetchRaw<{ results?: TmdbTv[]; total_pages?: number }>('/discover/tv', {
      with_genres: '16', with_original_language: 'ja', include_adult: 'false',
      'vote_count.gte': '20', page: String(pg), ...params,
    }),
  );
  const media = (data.results || []).filter((r) => r.poster_path).map(toMedia);
  return {
    media,
    pageInfo: { total: media.length, currentPage: pg, lastPage: (data.total_pages || 1), hasNextPage: pg < (data.total_pages || 1), perPage: media.length },
  } as AniListPage<AniListMedia>;
}

export async function tmdbAnimeSearch(q: string, pg = 1): Promise<AniListPage<AniListMedia>> {
  try {
    const data = await fetchWithCache('search', `tmdb-anime-search:${q}:${pg}`, () =>
      tmdbFetchRaw<{ results?: TmdbTv[]; total_pages?: number }>('/search/tv', { query: q, page: String(pg), include_adult: 'false' }),
    );
    const media = (data.results || [])
      .filter((r) => r.poster_path && (r.genre_ids || []).includes(16))
      .map(toMedia);
    return { media, pageInfo: { total: media.length, currentPage: pg, lastPage: data.total_pages || 1, hasNextPage: pg < (data.total_pages || 1), perPage: media.length } } as AniListPage<AniListMedia>;
  } catch {
    return { media: [], pageInfo: { total: 0, currentPage: pg, lastPage: pg, hasNextPage: false, perPage: 0 } } as AniListPage<AniListMedia>;
  }
}

export const tmdbAnimePopular   = (pg = 1) => discover({ sort_by: 'popularity.desc' }, pg);
export const tmdbAnimeTrending  = (pg = 1) => discover({ sort_by: 'popularity.desc', 'first_air_date.gte': new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10) }, pg);
export const tmdbAnimeTopRated  = (pg = 1) => discover({ sort_by: 'vote_average.desc', 'vote_count.gte': '150' }, pg);
export const tmdbAnimeUpcoming  = (pg = 1) => discover({ sort_by: 'popularity.desc', 'first_air_date.gte': new Date().toISOString().slice(0, 10) }, pg);
