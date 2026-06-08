// ═══════════════════════════════════════════
// LUMINA STREAM — Theme Constants
// ═══════════════════════════════════════════

import type { ColorScheme, GenreCard, Mood } from '@/types';

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

export const GCARDS: GenreCard[] = [
  { key: 'anime',   name: 'Anime',    em: '⚡', col: 'linear-gradient(135deg,#0A0012,#2A0055)', tc: '#FF0096', desc: 'Explore Japanese animation' },
  { key: 'cartoon', name: 'Cartoon',  em: '🌸', col: 'linear-gradient(135deg,#001A33,#003366)', tc: '#2D5A1B', desc: 'Animated worlds await' },
  { key: 'horror',  name: 'Horror',   em: '👁', col: 'linear-gradient(135deg,#000,#3D0000)',    tc: '#DC143C', desc: 'Face your darkest fears' },
  { key: 'romance', name: 'Romance',  em: '💕', col: 'linear-gradient(135deg,#1A0005,#5A001A)', tc: '#FF6B8A', desc: 'Love stories to melt hearts' },
  { key: 'mystery', name: 'Mystery',  em: '🔍', col: 'linear-gradient(135deg,#050A15,#0A1A35)', tc: '#FFB347', desc: 'Unravel the unknown' },
  { key: 'fantasy', name: 'Fantasy',  em: '✨', col: 'linear-gradient(135deg,#0D0520,#1A0840)', tc: '#C39BD3', desc: 'Enter magical realms' },
];

export const MOODS: Mood[] = [
  { em: '🌙', name: 'Melancholy', col: '#8B78FF', desc: 'Rainy nights & deep thoughts' },
  { em: '⚡', name: 'Pumped',     col: '#FFB347', desc: 'Adrenaline & pure energy' },
  { em: '💕', name: 'Romantic',   col: '#FF6B8A', desc: 'Love stories & warm feels' },
  { em: '😱', name: 'Thrilling',  col: '#FF4A4A', desc: 'Edge-of-seat suspense' },
  { em: '🌿', name: 'Chill',      col: '#78D621', desc: 'Relax & unwind' },
  { em: '🔥', name: 'Epic',       col: '#FF8C00', desc: 'Legends & grand adventures' },
];

// Genre ID mapping for TMDB discovery
export const GENRE_IDS: Record<string, number> = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, horror: 27,
  music: 10402, mystery: 9648, romance: 10749, scifi: 878, thriller: 53, war: 10752,
  western: 37, anime: 16, cartoon: 16,
};

export const GENRES_ALL = [
  'All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Drama',
  'Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Mystery',
];
