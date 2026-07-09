import type { Metadata } from 'next';
import { fetchBatchWithCache } from '@/lib/cache';
import { tmdbFetchRaw } from '@/lib/tmdb/server';
import { getTrendingAnime, anilistToMediaItem } from '@/lib/anilist/client';
import Home from '@/components/pages/Home';
import type { MediaItem, TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import { CANONICAL_BASE } from '@/lib/seo/constants';

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

interface HomeFetch {
  id: string;
  endpoint: string;
  params?: Record<string, string>;
  category: 'trending' | 'popular' | 'discover';
}

// Core home page data fetches (reduced from 26 to 15 — removed 6 feat-* backdrop fetches
// that wasted entire API calls for a single image; backdrops now reuse row data)
const HOME_FETCHES: HomeFetch[] = [
  // ── Trending & Popular ──
  { id: 'trending',     endpoint: '/trending/all/week',                                          category: 'trending' },
  { id: 'popular',      endpoint: '/movie/popular',                                               category: 'popular' },
  { id: 'tvPopular',    endpoint: '/tv/popular',                                                   category: 'popular' },
  { id: 'topRated',     endpoint: '/movie/top_rated',                                              category: 'popular' },
  { id: 'upcoming',     endpoint: '/movie/upcoming',                                               category: 'popular' },
  // ── Now Playing & TV ──
  { id: 'nowPlaying',   endpoint: '/movie/now_playing',                                            category: 'popular' },
  { id: 'airingToday',  endpoint: '/tv/airing_today',                                              category: 'popular' },
  { id: 'onTheAir',     endpoint: '/tv/on_the_air',                                                category: 'popular' },
  // ── Genre rows (backdrops reused for genre portal cards) ──
  { id: 'action',       endpoint: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc' },               category: 'discover' },
  { id: 'comedy',       endpoint: '/discover/movie', params: { with_genres: '35', sort_by: 'popularity.desc' },               category: 'discover' },
  { id: 'scifi',        endpoint: '/discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc' },              category: 'discover' },
  { id: 'drama',        endpoint: '/discover/movie', params: { with_genres: '18', sort_by: 'popularity.desc' },               category: 'discover' },
  { id: 'thriller',     endpoint: '/discover/movie', params: { with_genres: '53', sort_by: 'popularity.desc' },               category: 'discover' },
  // ── Curated collections ──
  { id: 'hiddenGems',   endpoint: '/discover/movie', params: { 'vote_average.gte': '7', 'vote_count.gte': '200', sort_by: 'popularity.asc' },  category: 'discover' },
  { id: 'acclaimed',    endpoint: '/discover/movie', params: { 'vote_average.gte': '8', 'vote_count.gte': '500', sort_by: 'popularity.desc' }, category: 'discover' },
];

async function getTMDBData() {
  try {
    // Build batch entries — one MGET for all fetches
    const batchEntries = HOME_FETCHES.map(f => ({
      category: f.category,
      key: makeKey(f.endpoint, f.params ?? undefined),
      fetcher: () => tmdbFetchRaw<{ results?: TMDBShow[]; total_results?: number }>(f.endpoint, f.params ?? {})
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
    const nowPlaying  = filterPosters(get('nowPlaying'));
    const airingToday = filterPosters(get('airingToday'));
    const onTheAir    = filterPosters(get('onTheAir'));
    const drama       = filterPosters(get('drama'));
    const thriller    = filterPosters(get('thriller'));
    const hiddenGems  = filterPosters(get('hiddenGems'));
    const acclaimed   = filterPosters(get('acclaimed'));

    // Helper: format a raw TMDB total_results count into a human-friendly label
    const fmtCount = (id: string, fallbackLabel: string): string => {
      const total = getTotal(id);
      if (total >= 1000) return `${(total / 1000).toFixed(1).replace(/\.0$/, '')}k titles available`;
      if (total > 0) return `${total}+ titles available`;
      return fallbackLabel;
    };

    // Filter trending to only items with backdrop_path for hero carousel
    const trendingWithBackdrop = trending.filter(r => r.backdrop_path);
    const featured = trendingWithBackdrop.slice(0, 10).map(r => tmdbToMedia(r));
    const rows: RowData[] = [];

    // ── Trending & Popular ──
    if (popular.length) rows.push({ title: 'Trending Now', sub: fmtCount('trending', 'Most watched this week'), items: popular.slice(0, 20).map(r => tmdbToMedia(r)), endpoint: '/trending/all/week' });
    if (popular.length) rows.push({ title: 'Top 10 This Week', sub: fmtCount('popular', 'Hot right now'), items: popular.slice(0, 10).map(r => tmdbToMedia(r)), endpoint: '/trending/all/week', ranked: true });
    if (tvPopular.length) rows.push({ title: 'Popular TV', sub: fmtCount('tvPopular', 'Most popular TV shows'), items: tvPopular.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'tv' })), endpoint: '/tv/popular' });
    if (topRated.length) rows.push({ title: 'Top Rated', sub: fmtCount('topRated', 'Highest rated of all time'), items: topRated.slice(0, 20).map(r => tmdbToMedia(r)), endpoint: '/movie/top_rated' });
    if (upcoming.length) rows.push({ title: 'Coming Soon', sub: fmtCount('upcoming', 'Upcoming releases'), items: upcoming.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/movie/upcoming' });

    // ── Genre rows ──
    if (action.length) rows.push({ title: 'Action', sub: fmtCount('action', 'Adrenaline-pumping hits'), items: action.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc' } });
    if (comedy.length) rows.push({ title: 'Comedy', sub: fmtCount('comedy', 'Laugh-out-loud favorites'), items: comedy.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '35', sort_by: 'popularity.desc' } });
    if (scifi.length) rows.push({ title: 'Sci-Fi', sub: fmtCount('scifi', 'Explore the unknown'), items: scifi.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc' } });

    // Anime row from AniList (pure anime, no western cartoons)
    // Also captures a banner for the anime genre portal card — single fetch serves both
    let anilistBanner: string | null = null;
    try {
      const animeResults = await getTrendingAnime(1, 20);
      const animeItems = animeResults.media
        .filter(m => m.coverImage?.large)
        .map(m => anilistToMediaItem(m));
      if (animeItems.length) rows.push({ title: 'Anime', sub: '5,000+ series in the archive · Powered by AniList', items: animeItems.slice(0, 20), endpoint: '/genre/anime' });
      // Grab a banner for the anime genre portal card from the same response
      const withBanner = animeResults.media.filter(m => m.bannerImage);
      if (withBanner.length) {
        anilistBanner = withBanner[Math.floor(Math.random() * withBanner.length)].bannerImage!;
      }
    } catch { /* non-critical — skip anime row if AniList is down */ }

    // ── Now Playing + TV airing ──
    if (nowPlaying.length) rows.push({ title: 'Now Playing in Theaters', sub: fmtCount('nowPlaying', 'Currently showing in cinemas'), items: nowPlaying.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/movie/now_playing' });
    if (airingToday.length) rows.push({ title: 'Airing Today on TV', sub: fmtCount('airingToday', 'Episodes airing today'), items: airingToday.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'tv' })), endpoint: '/tv/airing_today' });
    if (onTheAir.length) rows.push({ title: 'On The Air', sub: fmtCount('onTheAir', 'TV shows currently broadcasting'), items: onTheAir.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'tv' })), endpoint: '/tv/on_the_air' });
    if (drama.length) rows.push({ title: 'Drama', sub: fmtCount('drama', 'Emotional stories that move you'), items: drama.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '18', sort_by: 'popularity.desc' } });

    // ── Thriller ──
    if (thriller.length) rows.push({ title: 'Thriller', sub: fmtCount('thriller', 'Edge-of-your-seat suspense'), items: thriller.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { with_genres: '53', sort_by: 'popularity.desc' } });

    // ── Curated collections ──
    if (hiddenGems.length) rows.push({ title: 'Hidden Gems', sub: fmtCount('hiddenGems', 'Underrated treasures waiting to be found'), items: hiddenGems.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { 'vote_average.gte': '7', 'vote_count.gte': '200', sort_by: 'popularity.asc' } });
    if (acclaimed.length) rows.push({ title: 'Critically Acclaimed', sub: fmtCount('acclaimed', 'Certified hits with top ratings'), items: acclaimed.slice(0, 20).map(r => tmdbToMedia({ ...r, media_type: 'movie' })), endpoint: '/discover/movie', params: { 'vote_average.gte': '8', 'vote_count.gte': '500', sort_by: 'popularity.desc' } });

    // Genre featured backdrops for portal cards — reuses existing row data
    // instead of 6 separate API calls (one per backdrop)
    const GENRE_TAGLINES: Record<string, string> = {
      anime: 'Dive into extraordinary worlds',
      cartoon: 'Laugh, adventure, repeat',
      horror: 'Face your darkest fears',
      romance: 'Feel every heartbeat',
      mystery: 'Unravel the unknown',
      fantasy: 'Beyond imagination awaits',
    };

    // Pick backdrops from already-fetched row data
    const pickBackdrop = (items: TMDBShow[]) => {
      const withBackdrop = items.filter(r => r.backdrop_path);
      if (!withBackdrop.length) return null;
      return withBackdrop[Math.floor(Math.random() * withBackdrop.length)].backdrop_path!;
    };

    const genreFeatured: GenreFeatured[] = [
      { key: 'anime',   name: 'Anime',   backdrop: anilistBanner || pickBackdrop(scifi), title: '', count: 5000, tagline: GENRE_TAGLINES.anime },
      { key: 'cartoon', name: 'Cartoon', backdrop: pickBackdrop(comedy),               title: '', count: 800,  tagline: GENRE_TAGLINES.cartoon },
      { key: 'horror',  name: 'Horror',  backdrop: pickBackdrop(thriller),             title: '', count: 1200, tagline: GENRE_TAGLINES.horror },
      { key: 'romance', name: 'Romance', backdrop: pickBackdrop(drama),                title: '', count: 1500, tagline: GENRE_TAGLINES.romance },
      { key: 'mystery', name: 'Mystery', backdrop: pickBackdrop(acclaimed),            title: '', count: 900,  tagline: GENRE_TAGLINES.mystery },
      { key: 'fantasy', name: 'Fantasy', backdrop: pickBackdrop(scifi),                title: '', count: 1100, tagline: GENRE_TAGLINES.fantasy },
    ].map(gf => ({
      ...gf,
      title: gf.title || gf.name,
      count: gf.count || 100,
    }));

    return { featured, rows, genreFeatured };
  } catch {
    return { featured: [] as MediaItem[], rows: [] as RowData[], genreFeatured: [] as GenreFeatured[] };
  }
}

export const revalidate = 300; // 5 min ISR — avoids 130+ API calls at build time

export const metadata: Metadata = {
  title: 'Lumina Stream - Dream, Discover, Stream',
  description: 'Explore a curated collection of movies, TV shows, anime, and cartoons. Trending, popular, and top-rated content updated weekly.',
  alternates: { canonical: `${CANONICAL_BASE}/` },
  openGraph: {
    title: 'Lumina Stream - Dream, Discover, Stream',
    description: 'Explore a curated collection of movies, TV shows, anime, and cartoons. Trending, popular, and top-rated content updated weekly.',
    type: 'website',
    url: CANONICAL_BASE,
    siteName: 'Lumina Stream',
    images: [{ url: `${CANONICAL_BASE}/og/og-movies.png`, width: 1344, height: 768, alt: 'Lumina Stream - Dream, Discover, Stream' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lumina Stream - Dream, Discover, Stream',
    description: 'Explore a curated collection of movies, TV shows, anime, and cartoons.',
    images: [`${CANONICAL_BASE}/og/og-movies.png`],
  },
};

export default async function HomePage() {
  const { featured, rows, genreFeatured } = await getTMDBData();
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Lumina Stream',
    url: CANONICAL_BASE,
    description: 'Stream movies, TV shows, anime, and cartoons for free.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${CANONICAL_BASE}/browse?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Home featured={featured} rows={rows} genreFeatured={genreFeatured} />
    </>
  );
}