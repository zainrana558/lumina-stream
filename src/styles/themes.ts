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
  { key: 'anime',   name: 'Anime',   em: '⚡', col: 'linear-gradient(135deg,#0A0012,#2A0055)', tc: '#FF0096' },
  { key: 'cartoon', name: 'Cartoon', em: '🌸', col: 'linear-gradient(135deg,#87CEEB,#B0E2FF)', tc: '#2D5A1B' },
  { key: 'horror',  name: 'Horror',  em: '👁', col: 'linear-gradient(135deg,#000,#3D0000)',       tc: '#DC143C' },
  { key: 'romance', name: 'Romance', em: '💕', col: 'linear-gradient(135deg,#1A0005,#5A001A)',      tc: '#FF6B8A' },
  { key: 'mystery', name: 'Mystery', em: '🔍', col: 'linear-gradient(135deg,#050A15,#0A1A35)',      tc: '#FFB347' },
  { key: 'fantasy', name: 'Fantasy', em: '✨', col: 'linear-gradient(135deg,#0D0520,#1A0840)',      tc: '#C39BD3' },
];

export const MOODS: Mood[] = [
  { em: '🌙', name: 'Melancholy', col: '#8B78FF' },
  { em: '⚡', name: 'Pumped',     col: '#FFB347' },
  { em: '💕', name: 'Romantic',   col: '#FF6B8A' },
  { em: '😱', name: 'Thrilling',  col: '#FF4A4A' },
  { em: '🌿', name: 'Chill',      col: '#78D621' },
  { em: '🔥', name: 'Epic',       col: '#FF8C00' },
];

export const GENRES_ALL = [
  'All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Drama',
  'Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Mystery',
];
