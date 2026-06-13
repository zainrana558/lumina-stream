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
  ranked?: boolean;
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
    // Fire ALL 21 TMDB calls + 6 genre featured calls in parallel (none depend on each other)
    const [
      trending, popular, tvPopular, topRated, upcoming,
      action, comedy, scifi, animation,
      nowPlaying, airingToday, onTheAir, drama,
      thriller, crime, romance, family,
      hiddenGems, acclaimed, warHistory,
    ] = await Promise.all([
      // Core trending + popular
      safeFetch('/trending/all/week'),
      safeFetch('/movie/popular'),
      safeFetch('/tv/popular'),
      safeFetch('/movie/top_rated'),
      tmdbFetch<{ results?: TMDBShow[] }>('/movie/upcoming').catch(() => ({ results: [] })),
      // Genre rows
      safeFetch('/discover/movie', { with_genres: '28', sort_by: 'popularity.desc' }),
      safeFetch('/discover/movie', { with_genres: '35', sort_by: 'popularity.desc' }),
      safeFetch('/discover/movie', { with_genres: '878', sort_by: 'popularity.desc' }),
      safeFetch('/discover/movie', { with_genres: '16', sort_by: 'popularity.desc' }),
      // Now Playing + TV airing
      safeFetch('/movie/now_playing'),
      safeFetch('/tv/airing_today'),
      safeFetch('/tv/on_the_air'),
      safeFetch('/discover/movie', { with_genres: '18', sort_by: 'popularity.desc' }),
      // Thriller, Crime, Romance, Family
      safeFetch('/discover/movie', { with_genres: '53', sort_by: 'popularity.desc' }),
      safeFetch('/discover/movie', { with_genres: '80', sort_by: 'popularity.desc' }),
      safeFetch('/discover/movie', { with_genres: '10749', sort_by: 'popularity.desc' }),
      safeFetch('/discover/movie', { with_genres: '10751', sort_by: 'popularity.desc' }),
      // Curated collections
      safeFetch('/discover/movie', { 'vote_average.gte': '7', 'vote_count.gte': '200', sort_by: 'popularity.asc' }),
      safeFetch('/discover/movie', { 'vote_average.gte': '8', 'vote_count.gte': '500', sort_by: 'popularity.desc' }),
      safeFetch('/discover/movie', { with_genres: '10752,36', sort_by: 'popularity.desc' }),
    ]);

    const featured = trending.slice(0, 10).map(r => tmdbToMedia(r));
    const rows: RowData[] = [];

    // ── Trending & Popular ──
    if (popular.length) rows.push({ title: 'Trending Now', sub: 'Most watched this week', items: popular.slice(0, 20).map(r => tmdbToMedia(r)), endpoint: '/trending/all/week' });
    if (popular.length) rows.push({ title: 'Top 10 This Week', sub: '#1 trending right now', items: popular.slice(0, 10).map(r => tmdbToMedia(r)), endpoint: '/trending/all/week', ranked: true });
    if (tvPopular.length) rows.push({ title: 'Popular TV', sub: 'Most popular TV shows', items: tvPopular.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'tv' })), endpoint: '/tv/popular' });
    if (topRated.length) rows.push({ title: 'Top Rated', sub: 'Highest rated of all time', items: topRated.slice(0, 20).map(r => tmdbToMedia(r)), endpoint: '/movie/top_rated' });
    if (upcoming.results?.length) rows.push({ title: 'Coming Soon', sub: 'Upcoming releases', items: upcoming.results.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/movie/upcoming' });

    // ── Genre rows ──
    if (action.length) rows.push({ title: 'Action', sub: 'Adrenaline-pumping hits', items: action.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc' } });
    if (comedy.length) rows.push({ title: 'Comedy', sub: 'Laugh-out-loud favorites', items: comedy.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '35', sort_by: 'popularity.desc' } });
    if (scifi.length) rows.push({ title: 'Sci-Fi', sub: 'Explore the unknown', items: scifi.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc' } });
    if (animation.length) rows.push({ title: 'Animation', sub: 'Animated adventures for all ages', items: animation.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '16', sort_by: 'popularity.desc' } });

    // ── Now Playing + TV airing ──
    if (nowPlaying.length) rows.push({ title: 'Now Playing in Theaters', sub: 'Currently showing in cinemas', items: nowPlaying.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/movie/now_playing' });
    if (airingToday.length) rows.push({ title: 'Airing Today on TV', sub: 'Episodes airing today', items: airingToday.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'tv' })), endpoint: '/tv/airing_today' });
    if (onTheAir.length) rows.push({ title: 'On The Air', sub: 'TV shows currently broadcasting', items: onTheAir.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'tv' })), endpoint: '/tv/on_the_air' });
    if (drama.length) rows.push({ title: 'Drama', sub: 'Emotional stories that move you', items: drama.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '18', sort_by: 'popularity.desc' } });

    // ── Thriller, Crime, Romance, Family ──
    if (thriller.length) rows.push({ title: 'Thriller', sub: 'Edge-of-your-seat suspense', items: thriller.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '53', sort_by: 'popularity.desc' } });
    if (crime.length) rows.push({ title: 'Crime', sub: 'Dark investigations & heists', items: crime.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '80', sort_by: 'popularity.desc' } });
    if (romance.length) rows.push({ title: 'Romance', sub: 'Love stories & heartwarming tales', items: romance.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '10749', sort_by: 'popularity.desc' } });
    if (family.length) rows.push({ title: 'Family Friendly', sub: 'Fun for the whole family', items: family.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '10751', sort_by: 'popularity.desc' } });

    // ── Curated collections ──
    if (hiddenGems.length) rows.push({ title: 'Hidden Gems', sub: 'Underrated treasures waiting to be found', items: hiddenGems.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { 'vote_average.gte': '7', 'vote_count.gte': '200', sort_by: 'popularity.asc' } });
    if (acclaimed.length) rows.push({ title: 'Critically Acclaimed', sub: 'Certified hits with top ratings', items: acclaimed.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { 'vote_average.gte': '8', 'vote_count.gte': '500', sort_by: 'popularity.desc' } });
    if (warHistory.length) rows.push({ title: 'War & History', sub: 'Epic battles & lessons from the past', items: warHistory.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '10752,36', sort_by: 'popularity.desc' } });

    // Genre featured backdrops for portal cards (run in parallel with everything above)
    const genreFeaturedPromises = Object.entries(GENRE_DISCOVER).map(async ([key, config]) => {
      try {
        const data = await tmdbFetch<{ results?: TMDBShow[]; total_results?: number }>(config.endpoint, config.params);
        const results = data.results || [];
        const withBackdrop = results.filter(r => r.backdrop_path);
        const pick = withBackdrop.length > 1 ? withBackdrop[Math.floor(Math.random() * withBackdrop.length)] : (withBackdrop[0] || results[0]);
        return { key, name: key.charAt(0).toUpperCase() + key.slice(1), backdrop: pick?.backdrop_path || null, title: pick?.title || pick?.name || '', count: data.total_results || results.length, tagline: GENRE_TAGLINES[key] || '' };
      } catch {
        return { key, name: key.charAt(0).toUpperCase() + key.slice(1), backdrop: null, title: '', count: 0, tagline: GENRE_TAGLINES[key] || '' };
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
