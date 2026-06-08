// ═══════════════════════════════════════════
// LUMINA STREAM — Type Definitions
// ═══════════════════════════════════════════

export type MediaType = 'movie' | 'tv';

// ── TMDB API response types ──────────────

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBShow {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  media_type?: MediaType;
  popularity: number;
  vote_count?: number;
  genre_ids?: number[];
  release_date?: string;
  first_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  runtime?: number;
  genres?: TMDBGenre[];
  credits?: { cast: TMDBCastMember[] };
  similar?: { results: TMDBShow[] };
  seasons?: TMDBSeason[];
  status?: string;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TMDBSeason {
  season_number: number;
  name: string;
  episode_count: number;
}

export interface TMDBSeasonEpisode {
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

// ── App-level types ──────────────────────

export interface MediaItem {
  id: number;
  title: string;
  sub: string;
  genre: string[];
  r: number;
  yr: number;
  eps: number;
  st: string;
  tag: string;
  cs: number;
  featured: boolean;
  progress: number;
  desc: string;
  cast: string[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  media_type?: MediaType;
}

export interface ColorScheme {
  bg: string;
  acc: string;
  base: string;
  em: string;
}

export interface GenreCard {
  key: string;
  name: string;
  em: string;
  col: string;
  tc: string;
  desc: string;
}

export interface Mood {
  em: string;
  name: string;
  col: string;
  desc: string;
}

export interface ContentRowData {
  title: string;
  sub: string;
  items: MediaItem[];
  endpoint: string;
  params?: Record<string, string>;
}

// ── TMDB genre ID → name mapping ────────

const TMDB_GENRE_ID_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western', 10759: 'Action & Adventure',
};

export function tmdbToMedia(item: TMDBShow): MediaItem {
  let genres = item.genres?.map((g) => g.name) || [];
  if (genres.length === 0 && item.genre_ids?.length) {
    genres = item.genre_ids.map((id) => TMDB_GENRE_ID_MAP[id]).filter(Boolean);
  }
  genres = genres.map(g => g === 'Science Fiction' ? 'Sci-Fi' : g);
  const title = item.title || item.name || 'Untitled';
  const date = item.release_date || item.first_air_date || '';
  const year = date ? parseInt(date.split('-')[0]) : new Date().getFullYear();
  const rating = item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0;
  const cs = Math.abs(item.id) % 8;

  return {
    id: item.id,
    title,
    sub: item.tagline || '',
    genre: genres.length > 0 ? genres : ['Drama'],
    r: rating,
    yr: year,
    eps: item.number_of_episodes || (item.media_type === 'movie' ? 1 : 10),
    st: item.status || 'Returning Series',
    tag: item.media_type === 'movie' ? 'Movie' : 'Series',
    cs,
    featured: rating > 7.5,
    progress: 0,
    desc: item.overview || '',
    cast: item.credits?.cast?.slice(0, 8).map((c) => c.name) || [],
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    media_type: item.media_type || 'tv',
  };
}
