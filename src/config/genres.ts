/**
 * Single source of truth for all genre configuration.
 * Every file that needs genre data should import from here.
 *
 * PORTAL genres have their own themed pages at /genre/[slug].
 * BROWSE-ONLY genres appear in the Browse page filter chips
 * but don't have dedicated themed pages — they route to /browse?genre=<name>.
 */

import type { GenreCard } from '@/types';

// ─── Featured (portal) genre definitions ────────────────────────────────────

export interface PortalGenreConfig {
  key: string;
  name: string;
  em: string;
  col: string;
  tc: string;
  genreId: number;
  mediaType: 'movie' | 'tv';
  source: 'tmdb' | 'anilist';
  /** Extra TMDB discover params (sort, vote thresholds, language, etc.) */
  extraParams?: Record<string, string>;
  /** For cartoon: additional keyword-based fetch params */
  keywordParams?: Record<string, string>;
  title: string;
  description: string;
  /** Sub-genres shown in the genre page toolbar */
  subGenres: string[];
}

export const PORTAL_GENRES: PortalGenreConfig[] = [
  {
    key: 'anime',
    name: 'Anime',
    em: '\u26A1',
    col: 'linear-gradient(135deg,#0A0012,#2A0055)',
    tc: '#FF0096',
    genreId: 16,
    mediaType: 'tv',
    source: 'anilist',
    extraParams: { sort_by: 'popularity.desc', with_original_language: 'ja' },
    title: 'Anime',
    description: 'Discover popular and trending anime series. From action-packed shonen to heartwarming slice-of-life, explore the best anime curated for you.',
    subGenres: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Thriller', 'Romance', 'Supernatural', 'Slice of Life', 'Sports'],
  },
  {
    key: 'cartoon',
    name: 'Cartoon',
    em: '\uD83C\uDF38',
    col: 'linear-gradient(135deg,#87CEEB,#B0E2FF)',
    tc: '#2D5A1B',
    genreId: 16,
    mediaType: 'tv',
    source: 'tmdb',
    extraParams: { sort_by: 'popularity.desc', vote_count_gte: '50', with_original_language: 'en' },
    keywordParams: { with_keywords: '210755', sort_by: 'popularity.desc', vote_count_gte: '30' },
    title: 'Cartoons',
    description: 'Explore classic and modern cartoon series. Laugh, adventure, and enjoy animated shows for all ages.',
    subGenres: ['Animation', 'Comedy', 'Family', 'Adventure', 'Fantasy', 'Music'],
  },
  {
    key: 'horror',
    name: 'Horror',
    em: '\uD83D\uDC41',
    col: 'linear-gradient(135deg,#000,#3D0000)',
    tc: '#DC143C',
    genreId: 27,
    mediaType: 'movie',
    source: 'tmdb',
    extraParams: { sort_by: 'popularity.desc', vote_count_gte: '50' },
    title: 'Horror',
    description: 'Face your darkest fears with the best horror movies. From psychological thrillers to supernatural terror, find your next scare.',
    subGenres: ['Horror', 'Thriller', 'Mystery', 'Sci-Fi', 'Fantasy', 'Action'],
  },
  {
    key: 'romance',
    name: 'Romance',
    em: '\uD83D\uDC95',
    col: 'linear-gradient(135deg,#1A0005,#5A001A)',
    tc: '#FF6B8A',
    genreId: 10749,
    mediaType: 'movie',
    source: 'tmdb',
    extraParams: { sort_by: 'popularity.desc', vote_count_gte: '50' },
    title: 'Romance',
    description: 'Feel every heartbeat with romantic movies. From passionate love stories to tender moments, discover the best romance films.',
    subGenres: ['Romance', 'Drama', 'Comedy', 'Fantasy', 'Animation', 'Music'],
  },
  {
    key: 'mystery',
    name: 'Mystery',
    em: '\uD83D\uDD0D',
    col: 'linear-gradient(135deg,#050A15,#0A1A35)',
    tc: '#FFB347',
    genreId: 9648,
    mediaType: 'movie',
    source: 'tmdb',
    extraParams: { sort_by: 'popularity.desc', vote_count_gte: '50' },
    title: 'Mystery',
    description: 'Unravel the unknown with mystery and thriller movies. From detective stories to mind-bending puzzles, keep guessing.',
    subGenres: ['Mystery', 'Thriller', 'Crime', 'Drama', 'Sci-Fi', 'Fantasy'],
  },
  {
    key: 'fantasy',
    name: 'Fantasy',
    em: '\u2728',
    col: 'linear-gradient(135deg,#0D0520,#1A0840)',
    tc: '#C39BD3',
    genreId: 14,
    mediaType: 'movie',
    source: 'tmdb',
    extraParams: { sort_by: 'popularity.desc', vote_count_gte: '50' },
    title: 'Fantasy',
    description: 'Beyond imagination awaits. Explore epic fantasy movies with magical worlds, mythical creatures, and legendary adventures.',
    subGenres: ['Fantasy', 'Adventure', 'Action', 'Drama', 'Sci-Fi', 'Animation'],
  },
];

// ─── Browse-only genres (no themed page, route to /browse?genre=<name>) ─────

export const BROWSE_ONLY_GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller'] as const;

// ─── Derived helpers ─────────────────────────────────────────────────────────

/** Lookup a portal genre by slug */
export const PORTAL_GENRE_MAP = Object.fromEntries(
  PORTAL_GENRES.map(g => [g.key, g])
) as Record<string, PortalGenreConfig>;

/** All portal genre slugs */
export const PORTAL_SLUGS = PORTAL_GENRES.map(g => g.key);

/** Set of portal genre keys for fast lookup */
export const PORTAL_KEY_SET = new Set(PORTAL_SLUGS);

/** Set of portal genre display names for fast lookup */
export const PORTAL_NAME_SET = new Set(PORTAL_GENRES.map(g => g.name));

/** Genre cards for home page portal (GCARDS shape) */
export const GCARDS: GenreCard[] = PORTAL_GENRES.map(g => ({
  key: g.key,
  name: g.name,
  em: g.em,
  col: g.col,
  tc: g.tc,
}));

/** Genre links for navbar dropdown */
export const GENRE_NAV_LINKS = PORTAL_GENRES.map(g => ({
  key: g.key,
  label: g.name,
  color: g.tc,
}));

/** Full genre list for Browse page filter chips (portal + browse-only) */
export const GENRES_ALL = [
  'All',
  ...PORTAL_GENRES.map(g => g.name),
  ...BROWSE_ONLY_GENRES,
] as const;

/** TMDB genre ID → name map (used when discover/trending returns genre_ids) */
export const TMDB_GENRE_ID_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western', 10759: 'Action & Adventure',
  10762: 'Kids', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
  10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

/** Reverse lookup: genre name → TMDB ID */
export const TMDB_GENRE_NAME_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(TMDB_GENRE_ID_MAP).map(([id, name]) => [name, Number(id)])
);