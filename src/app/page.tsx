import { fetchTrending, fetchPopular, fetchTopRated, fetchDiscover, getImageUrl } from '@/lib/tmdb';
import { tmdbToMedia } from '@/types';
import type { MediaItem, ContentRowData } from '@/types';
import { GCARDS, MOODS, GENRE_IDS } from '@/styles/themes';
import ClientHome from './ClientHome';

export const revalidate = 300;

async function getMediaItems(endpoint: string, params?: Record<string, string>): Promise<MediaItem[]> {
  try {
    const url = new URL(endpoint);
    url.searchParams.set('api_key', process.env.TMDB_API_KEY || '');
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).filter((r: any) => r.poster_path).map((r: any) => tmdbToMedia(r));
  } catch { return []; }
}

export default async function HomePage() {
  const TMDB = 'https://api.themoviedb.org/3';
  const key = process.env.TMDB_API_KEY || '';

  async function fetchEndpoint(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${TMDB}${endpoint}`);
    url.searchParams.set('api_key', key);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
      const res = await fetch(url.toString(), { next: { revalidate: 300 } });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).filter((r: any) => r.poster_path).map((r: any) => tmdbToMedia(r));
    } catch { return []; }
  }

  const [trending, popular, topRatedTv, action, animation, scifi] = await Promise.all([
    fetchEndpoint('/trending/all/week'),
    fetchEndpoint('/movie/popular'),
    fetchEndpoint('/tv/top_rated'),
    fetchEndpoint('/discover/movie', { with_genres: '28', sort_by: 'popularity.desc' }),
    fetchEndpoint('/discover/movie', { with_genres: '16', sort_by: 'popularity.desc' }),
    fetchEndpoint('/discover/movie', { with_genres: '878', sort_by: 'popularity.desc' }),
  ]);

  const featured = trending.filter((m: MediaItem) => m.backdrop_path).slice(0, 6);

  const rows: ContentRowData[] = [
    { title: 'Trending Now', sub: 'Most watched this week', items: trending.slice(0, 12), endpoint: '/trending/all/week' },
    { title: 'Popular Movies', sub: 'Box office hits', items: popular.slice(0, 12), endpoint: '/movie/popular' },
    { title: 'Top Rated TV', sub: 'Highest rated series', items: topRatedTv.slice(0, 12), endpoint: '/tv/top_rated' },
    { title: 'Action & Adventure', sub: 'Adrenaline-pumping', items: action.slice(0, 12), endpoint: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc' } },
    { title: 'Animation', sub: 'Animated worlds', items: animation.slice(0, 12), endpoint: '/discover/movie', params: { with_genres: '16', sort_by: 'popularity.desc' } },
    { title: 'Sci-Fi', sub: 'Explore the unknown', items: scifi.slice(0, 12), endpoint: '/discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc' } },
  ];

  return <ClientHome featured={featured} rows={rows} />;
}
