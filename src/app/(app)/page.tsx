import type { Metadata } from 'next';
import { tmdbFetch } from '@/lib/tmdb/server';
import Home from '@/components/pages/Home';
import type { MediaItem, TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';

interface RowData {
  title: string;
  sub: string;
  items: MediaItem[];
  endpoint: string;
  params?: Record<string, string>;
}

export interface GenreFeatured {
  key: string;
  name: string;
  backdrop: string | null;
  title: string;
  count: number;
  tagline: string;
}

// Helper to safely fetch and convert TMDB results
async function safeFetch(endpoint: string, params?: Record<string, string>): Promise<TMDBShow[]> {
  try {
    const data = await tmdbFetch<{ results?: TMDBShow[] }>(endpoint, params);
    return (data.results || []).filter(r => r.poster_path);
  } catch {
    return [];
  }
}

// Genre-specific TMDB discover params for fetching featured backdrop
const GENRE_DISCOVER: Record<string, { endpoint: string; params: Record<string, string> }> = {
  anime:   { endpoint: '/discover/tv', params: { with_genres: '16', sort_by: 'popularity.desc', with_original_language: 'ja' } },
  cartoon: { endpoint: '/discover/tv', params: { with_genres: '16', sort_by: 'popularity.desc', without_genres: '10759', with_original_language: 'en' } },
  horror:  { endpoint: '/discover/movie', params: { with_genres: '27', sort_by: 'popularity.desc' } },
  romance: { endpoint: '/discover/movie', params: { with_genres: '10749', sort_by: 'popularity.desc' } },
  mystery: { endpoint: '/discover/movie', params: { with_genres: '9648', sort_by: 'popularity.desc' } },
  fantasy: { endpoint: '/discover/movie', params: { with_genres: '14', sort_by: 'popularity.desc' } },
};

const GENRE_TAGLINES: Record<string, string> = {
  anime: 'Dive into extraordinary worlds',
  cartoon: 'Laugh, adventure, repeat',
  horror: 'Face your darkest fears',
  romance: 'Feel every heartbeat',
  mystery: 'Unravel the unknown',
  fantasy: 'Beyond imagination awaits',
};

async function getTMDBData() {
  try {
    // Phase 1: Core trending + popular (5 calls)
    const [trending, popular, tvPopular, topRated, upcoming] = await Promise.all([
      safeFetch('/trending/all/week'),
      safeFetch('/movie/popular'),
      safeFetch('/tv/popular'),
      safeFetch('/movie/top_rated'),
      tmdbFetch<{ results?: TMDBShow[] }>('/movie/upcoming').catch(() => ({ results: [] })),
    ]);

    const featured = trending.slice(0, 10).map(r => tmdbToMedia(r));
    const rows: RowData[] = [];

    // ── Trending & Popular (3 rows) ──
    if (popular.length) rows.push({ title: 'Trending Now', sub: 'Most watched this week', items: popular.slice(0, 20).map(r => tmdbToMedia(r)), endpoint: '/trending/all/week' });
    if (tvPopular.length) rows.push({ title: 'Popular TV', sub: 'Most popular TV shows', items: tvPopular.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'tv' })), endpoint: '/tv/popular' });
    if (topRated.length) rows.push({ title: 'Top Rated', sub: 'Highest rated of all time', items: topRated.slice(0, 20).map(r => tmdbToMedia(r)), endpoint: '/movie/top_rated' });
    if (upcoming.results?.length) rows.push({ title: 'Coming Soon', sub: 'Upcoming releases', items: upcoming.results.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/movie/upcoming' });

    // Phase 2: 4 genre rows (4 calls)
    const [action, comedy, scifi, animation] = await Promise.all([
      safeFetch('/discover/movie', { with_genres: '28', sort_by: 'popularity.desc' }),
      safeFetch('/discover/movie', { with_genres: '35', sort_by: 'popularity.desc' }),
      safeFetch('/discover/movie', { with_genres: '878', sort_by: 'popularity.desc' }),
      safeFetch('/discover/movie', { with_genres: '16', sort_by: 'popularity.desc' }),
    ]);

    if (action.length) rows.push({ title: 'Action', sub: 'Adrenaline-pumping hits', items: action.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc' } });
    if (comedy.length) rows.push({ title: 'Comedy', sub: 'Laugh-out-loud favorites', items: comedy.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '35', sort_by: 'popularity.desc' } });
    if (scifi.length) rows.push({ title: 'Sci-Fi', sub: 'Explore the unknown', items: scifi.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc' } });
    if (animation.length) rows.push({ title: 'Animation', sub: 'Animated adventures for all ages', items: animation.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '16', sort_by: 'popularity.desc' } });

    // Phase 3: Genre featured backdrops for portal cards
    const genreFeaturedPromises = Object.entries(GENRE_DISCOVER).map(async ([key, config]) => {
      try {
        const data = await tmdbFetch<{ results?: TMDBShow[]; total_results?: number }>(config.endpoint, config.params);
        const results = data.results || [];
        const withBackdrop = results.filter(r => r.backdrop_path);
        const pick = withBackdrop[0] || results[0];
        return {
          key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
          backdrop: pick?.backdrop_path || null,
          title: pick?.title || pick?.name || '',
          count: data.total_results || results.length,
          tagline: GENRE_TAGLINES[key] || '',
        };
      } catch {
        return {
          key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
          backdrop: null,
          title: '',
          count: 0,
          tagline: GENRE_TAGLINES[key] || '',
        };
      }
    });
    const genreFeatured = await Promise.all(genreFeaturedPromises);

    return { featured, rows, genreFeatured };
  } catch {
    return { featured: [] as MediaItem[], rows: [] as RowData[], genreFeatured: [] as GenreFeatured[] };
  }
}

export const revalidate = 300; // 5 min — trending data doesn't need real-time

export const metadata: Metadata = {
  title: 'Lumina Stream - Dream, Discover, Stream',
  description: 'Explore a curated collection of movies, TV shows, anime, and cartoons. Trending, popular, and top-rated content updated weekly.',
  openGraph: {
    title: 'Lumina Stream',
    description: 'Explore a curated collection of movies, TV shows, anime, and cartoons.',
    type: 'website',
  },
};

export default async function HomePage() {
  const { featured, rows, genreFeatured } = await getTMDBData();
  return <Home featured={featured} rows={rows} genreFeatured={genreFeatured} />;
}
