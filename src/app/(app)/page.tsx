import type { Metadata } from 'next';
import { fetchBatchWithCache } from '@/lib/cache';
import { tmdbFetchRaw } from '@/lib/tmdb/server';
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

// Helper to create a cache-key-safe identifier from endpoint + params
function makeKey(endpoint: string, params?: Record<string, string>): string {
  if (!params) return endpoint;
  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  return endpoint + '?' + sorted.map(([k, v]) => `${k}=${v}`).join('&');
}

// All 21 home page data fetches, defined declaratively
const HOME_FETCHES = [
  { id: 'trending',     endpoint: '/trending/all/week',                                          category: 'trending' as const },
  { id: 'popular',      endpoint: '/movie/popular',                                               category: 'popular' as const },
  { id: 'tvPopular',    endpoint: '/tv/popular',                                                   category: 'popular' as const },
  { id: 'topRated',     endpoint: '/movie/top_rated',                                              category: 'popular' as const },
  { id: 'upcoming',     endpoint: '/movie/upcoming',                                               category: 'popular' as const },
  { id: 'action',       endpoint: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc' },               category: 'discover' as const },
  { id: 'comedy',       endpoint: '/discover/movie', params: { with_genres: '35', sort_by: 'popularity.desc' },               category: 'discover' as const },
  { id: 'scifi',        endpoint: '/discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc' },              category: 'discover' as const },
  { id: 'animation',    endpoint: '/discover/movie', params: { with_genres: '16', sort_by: 'popularity.desc' },               category: 'discover' as const },
  { id: 'nowPlaying',   endpoint: '/movie/now_playing',                                            category: 'popular' as const },
  { id: 'airingToday',  endpoint: '/tv/airing_today',                                              category: 'popular' as const },
  { id: 'onTheAir',     endpoint: '/tv/on_the_air',                                                category: 'popular' as const },
  { id: 'drama',        endpoint: '/discover/movie', params: { with_genres: '18', sort_by: 'popularity.desc' },               category: 'discover' as const },
  { id: 'thriller',     endpoint: '/discover/movie', params: { with_genres: '53', sort_by: 'popularity.desc' },               category: 'discover' as const },
  { id: 'crime',        endpoint: '/discover/movie', params: { with_genres: '80', sort_by: 'popularity.desc' },               category: 'discover' as const },
  { id: 'romance',      endpoint: '/discover/movie', params: { with_genres: '10749', sort_by: 'popularity.desc' },            category: 'discover' as const },
  { id: 'family',       endpoint: '/discover/movie', params: { with_genres: '10751', sort_by: 'popularity.desc' },            category: 'discover' as const },
  { id: 'hiddenGems',   endpoint: '/discover/movie', params: { 'vote_average.gte': '7', 'vote_count.gte': '200', sort_by: 'popularity.asc' },  category: 'discover' as const },
  { id: 'acclaimed',    endpoint: '/discover/movie', params: { 'vote_average.gte': '8', 'vote_count.gte': '500', sort_by: 'popularity.desc' }, category: 'discover' as const },
  { id: 'warHistory',   endpoint: '/discover/movie', params: { with_genres: '10752,36', sort_by: 'popularity.desc' },          category: 'discover' as const },
  // 6 genre featured backdrop fetches
  { id: 'feat-anime',   endpoint: '/discover/tv', params: { with_genres: '16,10759', sort_by: 'popularity.desc', with_original_language: 'ja', vote_count_gte: '100' }, category: 'discover' as const },
  { id: 'feat-cartoon', endpoint: '/discover/tv', params: { with_genres: '16', sort_by: 'popularity.desc', without_genres: '10759', with_original_language: 'en' },     category: 'discover' as const },
  { id: 'feat-horror',  endpoint: '/discover/movie', params: { with_genres: '27', sort_by: 'popularity.desc' },               category: 'discover' as const },
  { id: 'feat-romance', endpoint: '/discover/movie', params: { with_genres: '10749', sort_by: 'popularity.desc' },            category: 'discover' as const },
  { id: 'feat-mystery', endpoint: '/discover/movie', params: { with_genres: '9648', sort_by: 'popularity.desc' },              category: 'discover' as const },
  { id: 'feat-fantasy', endpoint: '/discover/movie', params: { with_genres: '14', sort_by: 'popularity.desc' },               category: 'discover' as const },
];

async function getTMDBData() {
  try {
    // Build batch entries — one MGET for all 26 fetches
    const batchEntries = HOME_FETCHES.map(f => ({
      category: f.category,
      key: makeKey(f.endpoint, f.params),
      fetcher: () => tmdbFetchRaw<{ results?: TMDBShow[]; total_results?: number }>(f.endpoint, f.params)
        .then(data => ({ results: data.results || [], total_results: data.total_results || 0 }))
        .catch(() => ({ results: [] as TMDBShow[], total_results: 0 })),
    }));

    // Single Redis MGET + parallel fetch for misses
    const batchResults = await fetchBatchWithCache(batchEntries);

    // Extract results by ID
    const get = (id: string): TMDBShow[] => {
      const idx = HOME_FETCHES.findIndex(f => f.id === id);
      const entry = batchResults[idx]?.data as { results?: TMDBShow[]; total_results?: number } | TMDBShow[] | undefined;
      if (!entry) return [];
      if (Array.isArray(entry)) return entry;
      return entry.results || [];
    };
    // Extract total_results by ID (for genre counts)
    const getTotal = (id: string): number => {
      const idx = HOME_FETCHES.findIndex(f => f.id === id);
      const entry = batchResults[idx]?.data as { results?: TMDBShow[]; total_results?: number } | TMDBShow[] | undefined;
      if (!entry) return 0;
      if (Array.isArray(entry)) return 0;
      return entry.total_results || 0;
    };

    // Filter poster-only items (was done in safeFetch before)
    const filterPosters = (items: TMDBShow[]) => items.filter(r => r.poster_path);

    const trending    = filterPosters(get('trending'));
    const popular     = filterPosters(get('popular'));
    const tvPopular   = filterPosters(get('tvPopular'));
    const topRated    = filterPosters(get('topRated'));
    const upcoming    = get('upcoming'); // no poster filter for upcoming (featured might need non-poster items)
    const action      = filterPosters(get('action'));
    const comedy      = filterPosters(get('comedy'));
    const scifi       = filterPosters(get('scifi'));
    const animation   = filterPosters(get('animation'));
    const nowPlaying  = filterPosters(get('nowPlaying'));
    const airingToday = filterPosters(get('airingToday'));
    const onTheAir    = filterPosters(get('onTheAir'));
    const drama       = filterPosters(get('drama'));
    const thriller    = filterPosters(get('thriller'));
    const crime       = filterPosters(get('crime'));
    const romance     = filterPosters(get('romance'));
    const family      = filterPosters(get('family'));
    const hiddenGems  = filterPosters(get('hiddenGems'));
    const acclaimed   = filterPosters(get('acclaimed'));
    const warHistory  = filterPosters(get('warHistory'));

    // Filter trending to only items with backdrop_path for hero carousel
    const trendingWithBackdrop = trending.filter(r => r.backdrop_path);
    const featured = trendingWithBackdrop.slice(0, 10).map(r => tmdbToMedia(r));
    const rows: RowData[] = [];

    // ── Trending & Popular ──
    if (popular.length) rows.push({ title: 'Trending Now', sub: 'Most watched this week', items: popular.slice(0, 20).map(r => tmdbToMedia(r)), endpoint: '/trending/all/week' });
    if (popular.length) rows.push({ title: 'Top 10 This Week', sub: '#1 trending right now', items: popular.slice(0, 10).map(r => tmdbToMedia(r)), endpoint: '/trending/all/week', ranked: true });
    if (tvPopular.length) rows.push({ title: 'Popular TV', sub: 'Most popular TV shows', items: tvPopular.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'tv' })), endpoint: '/tv/popular' });
    if (topRated.length) rows.push({ title: 'Top Rated', sub: 'Highest rated of all time', items: topRated.slice(0, 20).map(r => tmdbToMedia(r)), endpoint: '/movie/top_rated' });
    if (upcoming.length) rows.push({ title: 'Coming Soon', sub: 'Upcoming releases', items: upcoming.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/movie/upcoming' });

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

    // Genre featured backdrops for portal cards (already fetched in batch)
    const GENRE_TAGLINES: Record<string, string> = {
      anime: 'Dive into extraordinary worlds',
      cartoon: 'Laugh, adventure, repeat',
      horror: 'Face your darkest fears',
      romance: 'Feel every heartbeat',
      mystery: 'Unravel the unknown',
      fantasy: 'Beyond imagination awaits',
    };

    const genreFeatured = [
      { key: 'anime',   name: 'Anime' },
      { key: 'cartoon', name: 'Cartoon' },
      { key: 'horror',  name: 'Horror' },
      { key: 'romance', name: 'Romance' },
      { key: 'mystery', name: 'Mystery' },
      { key: 'fantasy', name: 'Fantasy' },
    ].map(({ key, name }) => {
      const results = get(`feat-${key}`);
      const withBackdrop = results.filter(r => r.backdrop_path);
      const pool = key === 'anime'
        ? withBackdrop.filter(r => r.vote_average >= 7 || r.popularity >= 50)
        : withBackdrop;
      const pick = pool.length > 1 ? pool[Math.floor(Math.random() * pool.length)] : (pool[0] || withBackdrop[0] || results[0]);
      return {
        key,
        name,
        backdrop: pick?.backdrop_path || null,
        title: pick?.title || pick?.name || '',
        count: getTotal(`feat-${key}`) || results.length,
        tagline: GENRE_TAGLINES[key] || '',
      };
    });

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