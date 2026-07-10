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
  title: 'Lumina Stream - Watch Free Movies, TV Shows, Anime & Cartoons Online',
  description: 'Lumina Stream is a free streaming catalog with thousands of movies, TV shows, anime series, and cartoons. Discover trending content, top-rated classics, new releases, genre portals, and seasonal anime — all powered by TMDB and AniList with data updated every few minutes.',
  alternates: { canonical: `${CANONICAL_BASE}/` },
  openGraph: {
    title: 'Lumina Stream - Watch Free Movies, TV Shows, Anime & Cartoons Online',
    description: 'Stream thousands of free movies, TV shows, anime, and cartoons. Trending, top-rated, new releases, and genre portals updated in real time.',
    type: 'website',
    url: CANONICAL_BASE,
    siteName: 'Lumina Stream',
    images: [{ url: `${CANONICAL_BASE}/og/og-movies.png`, width: 1344, height: 768, alt: 'Lumina Stream - Watch Free Movies, TV Shows, Anime & Cartoons' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lumina Stream - Watch Free Movies, TV Shows, Anime & Cartoons Online',
    description: 'Stream thousands of free movies, TV shows, anime, and cartoons on Lumina Stream.',
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
    description: 'Lumina Stream is a free streaming catalog with thousands of movies, TV shows, anime series, and cartoons powered by TMDB and AniList.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${CANONICAL_BASE}/browse?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const homeFaqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Lumina Stream?',
        acceptedAnswer: { '@type': 'Answer', text: 'Lumina Stream is a free streaming catalog that aggregates movie, TV show, anime, and cartoon data from TMDB and AniList. Browse thousands of titles across every genre, discover trending content, track seasonal anime, and explore curated genre portals — all at no cost and with no account required.' },
      },
      {
        '@type': 'Question',
        name: 'How much content is available on Lumina Stream?',
        acceptedAnswer: { '@type': 'Answer', text: 'Lumina Stream catalogs thousands of movies, TV shows, anime series, and cartoons. Content spans every major genre including action, comedy, drama, horror, romance, sci-fi, thriller, mystery, and fantasy. Our catalog is continuously synced with TMDB and AniList, so new titles appear as soon as they become popular.' },
      },
      {
        '@type': 'Question',
        name: 'Is Lumina Stream free?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. Lumina Stream is completely free to use. No subscription, no payment, and no account is needed to browse and discover content. Create an optional free account to unlock features like watchlists, progress tracking, ratings, and collections.' },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd) }}
      />

      <Home featured={featured} rows={rows} genreFeatured={genreFeatured} />

      {/* Server-rendered SEO text — visible to Googlebot without JS */}
      <style>{`
        .home-qlink {
          display: inline-block; padding: 6px 14px; border-radius: 8px;
          font-size: .78rem; color: #FFB347; text-decoration: none;
          background: rgba(255,245,232,.04); border: 1px solid rgba(255,245,232,.08);
          transition: background .2s, border-color .2s;
        }
        .home-qlink:hover { background: rgba(255,245,232,.08); border-color: rgba(255,179,71,.3); }
      `}</style>
      <section
        aria-label="About Lumina Stream"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,40px) clamp(16px,3vw,24px) 60px',
        }}
      >
        <h1 className="f-cinzel-dec" style={{
          fontSize: 'clamp(1.6rem,3.5vw,2.6rem)',
          color: '#FFF5E8',
          marginBottom: 16,
          letterSpacing: '.02em',
        }}>
          Watch Free Movies, TV Shows, Anime & Cartoons Online
        </h1>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem,1.2vw,1.05rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.75,
          maxWidth: 860,
          marginBottom: 20,
        }}>
          Lumina Stream is a free streaming catalog that aggregates thousands of movies, TV shows, anime series, and cartoons from The Movie Database (TMDB) and AniList. Every title on this page is pulled from real-time API data — trending content refreshes every five minutes, popular and top-rated lists update hourly, and genre rows are re-curated throughout the day. Scroll down to explore trending movies and TV, genre-specific rows for action, comedy, sci-fi, drama, and thriller, a dedicated anime section powered by AniList, curated collections of hidden gems and critically acclaimed films, and six immersive genre portals for anime, cartoons, horror, romance, mystery, and fantasy. Use the search bar to find any title instantly, or browse our genre index, decade pages, and release calendar for structured discovery. Lumina Stream runs entirely in your browser with no app download required, works on desktop, tablet, and mobile, and costs nothing to use.
        </p>
        <nav aria-label="Quick links" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 8,
        }}>
          {[
            { label: 'Movies', href: '/movies' },
            { label: 'TV Shows', href: '/tv-shows' },
            { label: 'Top Rated', href: '/top-rated' },
            { label: 'New Releases', href: '/new-releases' },
            { label: 'Anime', href: '/genre/anime' },
            { label: 'Seasonal Anime', href: '/seasonal' },
            { label: 'All Genres', href: '/genres' },
            { label: 'Browse', href: '/browse' },
            { label: 'Release Calendar', href: '/release-calendar' },
            { label: 'Decade Collections', href: '/decade/2020s' },
          ].map(link => (
            <a key={link.href} href={link.href} className="home-qlink">
              {link.label}
            </a>
          ))}
        </nav>
      </section>
    </>
  );
}