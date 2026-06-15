import type { ColorScheme, Mood } from '@/types';

export const CS: ColorScheme[] = [
  { bg: 'linear-gradient(148deg,#14052E 0%,#4B2C8B 55%,#9E3EA8 100%)', acc: '#D070FF', base: '#14052E', em: '🌙' },
  { bg: 'linear-gradient(148deg,#08162A 0%,#1A5C8A 60%,#2E86AB 100%)', acc: '#52C8F5', base: '#08162A', em: '⚡' },
  { bg: 'linear-gradient(148deg,#0B1608 0%,#2D5A1B 60%,#5B8C35 100%)', acc: '#78D621', base: '#0B1608', em: '🌿' },
  { bg: 'linear-gradient(148deg,#160A0A 0%,#5C1515 60%,#982E2E 100%)', acc: '#FF4A4A', base: '#160A0A', em: '🔥' },
  { bg: 'linear-gradient(148deg,#071818 0%,#154040 60%,#1A7070 100%)', acc: '#4EEAE4', base: '#071818', em: '🌊' },
  { bg: 'linear-gradient(148deg,#0D0818 0%,#3B1857 60%,#8040AA 100%)', acc: '#C860FF', base: '#0D0818', em: '✨' },
  { bg: 'linear-gradient(148deg,#180D08 0%,#5C2A15 60%,#8B4513 100%)', acc: '#FF9020', base: '#180D08', em: '🌅' },
  { bg: 'linear-gradient(148deg,#080818 0%,#181880 60%,#2E30C0 100%)', acc: '#6A90FF', base: '#080818', em: '🌌' },
];

export const MOODS: Mood[] = [
  { em: '🌙', name: 'Melancholy', col: '#8B78FF' },
  { em: '⚡', name: 'Pumped',     col: '#FFB347' },
  { em: '💕', name: 'Romantic',   col: '#FF6B8A' },
  { em: '😱', name: 'Thrilling', col: '#FF4A4A' },
  { em: '🌿', name: 'Chill',      col: '#78D621' },
  { em: '🔥', name: 'Epic',       col: '#FF8C00' },
];

// ─── Re-exports from single source of truth ────────────────────────────────────
export { GCARDS, GENRES_ALL, PORTAL_GENRES, PORTAL_GENRE_MAP, PORTAL_SLUGS, PORTAL_KEY_SET, PORTAL_NAME_SET, BROWSE_ONLY_GENRES, GENRE_NAV_LINKS, TMDB_GENRE_ID_MAP, TMDB_GENRE_NAME_MAP } from '@/config/genres';