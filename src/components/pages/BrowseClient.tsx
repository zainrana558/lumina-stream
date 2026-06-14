'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { MediaItem, SortKey, TMDBShow } from '@/types';
import { GENRES_ALL } from '@/styles/themes';
import { tmdbToMedia } from '@/types';
import Card from '@/components/common/Card';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface BrowseClientProps {
  initialShows: MediaItem[];
}

const ITEMS_PER_GROUP = 5;

type BrowseSource = 'all' | 'tmdb' | 'anime';

const SOURCE_OPTIONS: { value: BrowseSource; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'tmdb', label: 'Movies & TV' },
  { value: 'anime', label: 'Anime' },
];

// ─── Mood → content source mapping ───────────────────────────────────────────

const MOOD_CONFIG: Record<string, {
  label: string;
  color: string;
  desc: string;
  genres: string;           // TMDB genre IDs for /api/browse?genre=
  anilistGenres: string[];  // AniList genres for /api/anime?type=genre&genres=
}> = {
  melancholy: {
    label: 'Melancholy',
    color: '#8B78FF',
    desc: 'Deep, emotional stories that resonate with your soul.',
    genres: '18',
    anilistGenres: ['Drama'],
  },
  pumped: {
    label: 'Pumped',
    color: '#FFB347',
    desc: 'Energy is flowing! Action-packed adventures await.',
    genres: '28',
    anilistGenres: ['Action'],
  },
  romantic: {
    label: 'Romantic',
    color: '#FF6B8A',
    desc: 'Love is in the air. Heartfelt stories and tender romances.',
    genres: '10749',
    anilistGenres: ['Romance'],
  },
  thrilling: {
    label: 'Thrilling',
    color: '#FF4A4A',
    desc: 'Edge-of-your-seat mysteries and dark thrillers.',
    genres: '53,27,9648',
    anilistGenres: ['Thriller', 'Horror'],
  },
  chill: {
    label: 'Chill',
    color: '#78D621',
    desc: 'Relax and unwind with light-hearted, easy-watching content.',
    genres: '35',
    anilistGenres: ['Comedy', 'Slice of Life'],
  },
  epic: {
    label: 'Epic',
    color: '#FF8C00',
    desc: 'Grand adventures, legendary sagas, and epic worlds.',
    genres: '12,878,14',
    anilistGenres: ['Adventure', 'Fantasy'],
  },
};

export default function BrowseClient({ initialShows }: BrowseClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const moodParam = searchParams.get('mood')?.toLowerCase() || '';
  const moodConfig = moodParam ? MOOD_CONFIG[moodParam] : null;

  const [allShows, setAllShows] = useState<MediaItem[]>(initialShows);
  const [genre, setGenre] = useState('All');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('r');
  const [isMobile, setIsMobile] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [browseSource, setBrowseSource] = useState<BrowseSource>('all');
  const currentPageRef = useRef(1);
  const gridRef = useRef<HTMLDivElement>(null);

  // Search-specific state
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const [activeQuery, setActiveQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // AniList browse state
  const [animePage, setAnimePage] = useState(1);
  const [animeHasMore, setAnimeHasMore] = useState(true);
  const [animeShows, setAnimeShows] = useState<MediaItem[]>([]);

  // Mood-specific state
  const [moodLoading, setMoodLoading] = useState(false);
  const moodInitRef = useRef(false);

  const isSearching = activeQuery.length > 0;
  const isMoodMode = !!moodConfig;

  // Track viewport width for mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // ─── Mood mode: fetch mood-based content ───────────────────────────────────

  useEffect(() => {
    if (!moodConfig) {
      // Mood cleared — reset to initial data
      if (moodInitRef.current) {
        setAllShows(initialShows);
        setAnimeShows([]);
        currentPageRef.current = 1;
        setAnimePage(1);
        setHasMore(true);
        moodInitRef.current = false;
      }
      return;
    }

    // Avoid double-fire in StrictMode
    if (moodInitRef.current) return;
    moodInitRef.current = true;

    setMoodLoading(true);
    setGenre('All');
    setQ('');
    setActiveQuery('');
    setSearchResults([]);

    const genresCsv = moodConfig.anilistGenres.join(',');

    Promise.all([
      fetch(`/api/browse?genre=${moodConfig.genres}&page=1&sortBy=popularity.desc`)
        .then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`/api/anime?type=genre&genres=${encodeURIComponent(genresCsv)}&page=1&perPage=25`)
        .then(r => r.json()).catch(() => ({ results: [] })),
    ]).then(([tmdbData, animeData]) => {
      const tmdbItems = (tmdbData.results || [])
        .filter((r: TMDBShow) => r.poster_path)
        .map((r: TMDBShow) => tmdbToMedia({ ...r, media_type: r.media_type || 'movie' }));

      setAllShows(tmdbItems);
      setAnimeShows(animeData.results || []);
      currentPageRef.current = 1;
      setAnimePage(1);
      setAnimeHasMore(!!animeData.pageInfo?.hasNextPage);
      setHasMore(tmdbItems.length > 0 || (animeData.results || []).length > 0);
      setMoodLoading(false);
    }).catch(() => {
      setMoodLoading(false);
    });
  }, [moodParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch initial AniList batch when source includes anime (non-mood mode only)
  useEffect(() => {
    if (isMoodMode) return;
    if (browseSource === 'anime' || browseSource === 'all') {
      fetch(`/api/anime?type=all&page=1&perPage=25`)
        .then(r => r.json())
        .then(data => {
          if (data.results) {
            setAnimeShows(data.results);
            setAnimePage(1);
            setAnimeHasMore(data.pageInfo?.hasNextPage ?? false);
          }
        })
        .catch(() => {});
    }
  }, [browseSource, isMoodMode]);

  // Debounced search — hits both TMDB + AniList via /api/search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();

    if (!q.trim()) {
      setActiveQuery('');
      setSearchResults([]);
      setSearchPage(1);
      setSearchTotalPages(0);
      setSearchTotalResults(0);
      setSuggestions([]);
      return;
    }

    setSearchLoading(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q.trim())}&page=1&source=${browseSource}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (controller.signal.aborted) return;

        const items: MediaItem[] = data.results || [];

        setSearchResults(items);
        setSearchPage(1);
        setSearchTotalPages(data.total_pages || 0);
        setSearchTotalResults(data.total_results || 0);
        setSuggestions(data.suggestions || []);
        setActiveQuery(q.trim());
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, browseSource]);

  // Load more: search mode, mood mode, or browse mode
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      if (isSearching) {
        const nextPage = searchPage + 1;
        if (nextPage > searchTotalPages) {
          setHasMore(false);
          setLoadingMore(false);
          return;
        }
        const res = await fetch(`/api/search?q=${encodeURIComponent(activeQuery)}&page=${nextPage}&source=${browseSource}`);
        const data = await res.json();
        const newItems: MediaItem[] = data.results || [];
        const existingIds = new Set(searchResults.map(i => i.id));
        const fresh = newItems.filter(i => !existingIds.has(i.id));
        setSearchResults(prev => [...prev, ...fresh]);
        setSearchPage(nextPage);
        if (nextPage >= searchTotalPages || fresh.length === 0) setHasMore(false);
      } else if (isMoodMode && moodConfig) {
        // Mood mode — load more from TMDB discover + AniList genre
        const tmdbNext = currentPageRef.current + 1;
        const animeNext = animePage + 1;
        const genresCsv = moodConfig.anilistGenres.join(',');

        const [tmdbData, animeData] = await Promise.all([
          fetch(`/api/browse?genre=${moodConfig.genres}&page=${tmdbNext}&sortBy=popularity.desc`)
            .then(r => r.json()).catch(() => ({ results: [] })),
          fetch(`/api/anime?type=genre&genres=${encodeURIComponent(genresCsv)}&page=${animeNext}&perPage=25`)
            .then(r => r.json()).catch(() => ({ results: [] })),
        ]);

        // TMDB items
        if (tmdbData.results?.length > 0) {
          const newItems = tmdbData.results
            .filter((r: TMDBShow) => r.poster_path)
            .map((r: TMDBShow) => tmdbToMedia({ ...r, media_type: r.media_type || 'movie' }));
          setAllShows(prev => {
            const existingIds = new Set(prev.map((i: MediaItem) => i.id));
            return [...prev, ...newItems.filter((i: MediaItem) => !existingIds.has(i.id))];
          });
          currentPageRef.current = tmdbNext;
        }

        // AniList items
        if (animeData.results?.length > 0) {
          const existingIds = new Set(animeShows.map(i => i.id));
          const fresh = animeData.results.filter((i: MediaItem) => !existingIds.has(i.id));
          setAnimeShows(prev => [...prev, ...fresh]);
          setAnimePage(animeNext);
          setAnimeHasMore(!!animeData.pageInfo?.hasNextPage);
        }

        // Stop when both are exhausted
        if ((tmdbData.results?.length || 0) === 0 && (animeData.results?.length || 0) === 0) {
          setHasMore(false);
        }
      } else {
        // Normal browse mode — load more based on source
        if (browseSource === 'anime') {
          const nextPage = animePage + 1;
          const res = await fetch(`/api/anime?type=all&page=${nextPage}&perPage=25`);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const existingIds = new Set(animeShows.map(i => i.id));
            const fresh = data.results.filter((i: MediaItem) => !existingIds.has(i.id));
            setAnimeShows(prev => [...prev, ...fresh]);
            setAnimePage(nextPage);
            setAnimeHasMore(data.pageInfo?.hasNextPage ?? false);
          } else {
            setAnimeHasMore(false);
          }
        } else if (browseSource === 'all') {
          // Load from both TMDB and AniList
          const tmdbNext = currentPageRef.current + 1;
          const animeNext = animePage + 1;

          const [tmdbData, animeData] = await Promise.all([
            fetch(`/api/tmdb?endpoint=/trending/all/week&page=${tmdbNext}`).then(r => r.json()).catch(() => ({ results: [] })),
            fetch(`/api/anime?type=all&page=${animeNext}&perPage=25`).then(r => r.json()).catch(() => ({ results: [] })),
          ]);

          // TMDB items
          if (tmdbData.results?.length > 0) {
            const newItems = tmdbData.results
              .filter((r: TMDBShow) => r.poster_path)
              .map((r: TMDBShow) => tmdbToMedia({ ...r, media_type: r.media_type || 'movie' }));
            setAllShows(prev => {
              const existingIds = new Set(prev.map((i: MediaItem) => i.id));
              return [...prev, ...newItems.filter((i: MediaItem) => !existingIds.has(i.id))];
            });
            currentPageRef.current = tmdbNext;
          }

          // AniList items
          if (animeData.results?.length > 0) {
            const existingIds = new Set(animeShows.map(i => i.id));
            const fresh = animeData.results.filter((i: MediaItem) => !existingIds.has(i.id));
            setAnimeShows(prev => [...prev, ...fresh]);
            setAnimePage(animeNext);
            setAnimeHasMore(animeData.pageInfo?.hasNextPage ?? false);
          }

          // Stop when both are exhausted
          if (tmdbData.results?.length === 0 && animeData.results?.length === 0) {
            setHasMore(false);
          }
        } else {
          // TMDB only
          const nextPage = currentPageRef.current + 1;
          const res = await fetch(`/api/tmdb?endpoint=/trending/all/week&page=${nextPage}`);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const newItems = data.results
              .filter((r: TMDBShow) => r.poster_path)
              .map((r: TMDBShow) => tmdbToMedia({ ...r, media_type: r.media_type || 'movie' }));
            setAllShows(prev => {
              const existingIds = new Set(prev.map((i: MediaItem) => i.id));
              return [...prev, ...newItems.filter((i: MediaItem) => !existingIds.has(i.id))];
            });
            currentPageRef.current = nextPage;
          } else {
            setHasMore(false);
          }
        }
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, isSearching, isMoodMode, searchPage, searchTotalPages, activeQuery, browseSource, animePage, animeShows.length, searchResults.length, moodConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine hasMore based on mode
  useEffect(() => {
    if (isMoodMode) {
      // In mood mode, hasMore is managed by loadMore
      return;
    }
    if (isSearching) {
      setHasMore(searchPage < searchTotalPages);
    } else if (browseSource === 'anime') {
      setHasMore(animeHasMore);
    } else if (browseSource === 'all') {
      setHasMore(true);
    } else {
      setHasMore(true);
    }
  }, [isSearching, searchPage, searchTotalPages, browseSource, animeHasMore, isMoodMode]);

  // Get the combined source list for browse mode
  const browseList = useMemo(() => {
    if (browseSource === 'tmdb') return allShows;
    if (browseSource === 'anime') return animeShows;
    // 'all' — combine both, deduplicate by id
    const animeIds = new Set(animeShows.map(a => a.id));
    const tmdbUnique = allShows.filter(s => !animeIds.has(s.id));
    return [...tmdbUnique, ...animeShows];
  }, [browseSource, allShows, animeShows]);

  // The list to display
  const list = useMemo(() => {
    const sortFn = (a: MediaItem, b: MediaItem): number => {
      switch (sort) {
        case 'r': return b.r - a.r;
        case 'yr': return b.yr - a.yr;
        case 'eps': return b.eps - a.eps;
        default: return 0;
      }
    };

    const source = isSearching ? searchResults : browseList;

    return source
      .filter(s => genre === 'All' || s.genre.some(g => g.toLowerCase() === genre.toLowerCase()))
      .sort(sortFn);
  }, [isSearching, searchResults, browseList, genre, sort]);

  const genreCounts = useMemo(() => {
    const source = isSearching ? searchResults : browseList;
    const counts: Record<string, number> = { All: source.length };
    source.forEach(s => {
      s.genre.forEach(g => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });
    return counts;
  }, [isSearching, searchResults, browseList]);

  const totalCount = isSearching
    ? searchTotalResults || searchResults.length
    : browseList.length;

  const clearMood = useCallback(() => {
    router.push('/browse');
  }, [router]);

  const { sentinelRef } = useInfiniteScroll(loadMore, hasMore, loadingMore);

  const isFeatured = useCallback((index: number) => {
    if (isMobile) return false;
    return index % ITEMS_PER_GROUP === 0;
  }, [isMobile]);

  return (
    <div className="page" style={{ paddingTop: 'clamp(60px,7vw,80px)', minHeight: '100vh' }}>
      <style>{`
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
          gap: 1.3rem;
        }
        .bento-item-featured {
          grid-column: span 2;
          grid-row: span 2;
        }
        @media (max-width: 639px) {
          .bento-grid {
            grid-template-columns: 1fr;
          }
          .bento-item-featured {
            grid-column: span 1;
            grid-row: span 1;
          }
        }
      `}</style>

      <div className="main-pad" style={{ padding: '2.2rem clamp(1rem,5vw,3rem) 0', position: 'relative', zIndex: 3 }}>
        {/* ─── Mood banner ──────────────────────────────────────────── */}
        {isMoodMode && moodConfig && (
          <div style={{
            marginBottom: '1.8rem',
            padding: 'clamp(1rem,2vw,1.5rem) clamp(1.2rem,2.5vw,2rem)',
            borderRadius: 16,
            border: `1px solid ${moodConfig.color}30`,
            background: `linear-gradient(135deg, ${moodConfig.color}08 0%, #0D0A1E 100%)`,
            boxShadow: `0 0 20px ${moodConfig.color}10, 4px 4px 14px rgba(0,0,0,.7), -2px -2px 6px rgba(45,25,90,.2)`,
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(1rem,2vw,1.5rem)',
            animation: 'fi .35s ease both',
          }}>
            <div style={{
              width: 'clamp(48px,5vw,64px)',
              height: 'clamp(48px,5vw,64px)',
              borderRadius: 14,
              background: `${moodConfig.color}18`,
              border: `1px solid ${moodConfig.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span className="f-cinzel-dec" style={{
                fontSize: 'clamp(1.5rem,3vw,2rem)',
                color: moodConfig.color,
                fontWeight: 900,
                filter: `drop-shadow(0 0 12px ${moodConfig.color}50)`,
              }}>{moodConfig.label[0]}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="f-cinzel" style={{
                fontSize: 'clamp(1.3rem,2.5vw,1.8rem)',
                background: `linear-gradient(135deg, ${moodConfig.color}, #FFF5E8)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '.3rem',
                fontWeight: 700,
              }}>{moodConfig.label} Vibes</h1>
              <p className="f-crimson" style={{
                color: 'rgba(255,245,232,.5)',
                fontSize: '.82rem',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}>{moodConfig.desc}</p>
            </div>
            <button
              onClick={clearMood}
              className="btn-g"
              style={{ flexShrink: 0, padding: '8px 18px', fontSize: '.72rem' }}
            >
              Clear
            </button>
          </div>
        )}

        {/* ─── Normal header (hidden in mood mode) ──────────────────── */}
        {!isMoodMode && (
          <>
            <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', marginBottom: 4 }}>Browse Shows</h1>
            <p className="f-crimson" style={{  color: 'rgba(255,245,232,.4)', marginBottom: '1.8rem', fontStyle: 'italic' }}>
              {isSearching
                ? (searchLoading && searchResults.length === 0
                  ? `Searching for "${activeQuery}"…`
                  : `${searchTotalResults || searchResults.length} results for "${activeQuery}"`)
                : `${totalCount} in catalog`}
              {genre !== 'All' ? ` · ${list.length} shown` : ''}
            </p>
          </>
        )}

        {/* ─── Mood mode subtitle ───────────────────────────────────── */}
        {isMoodMode && moodConfig && (
          <p className="f-crimson" style={{
            color: 'rgba(255,245,232,.4)',
            marginBottom: '1.8rem',
            fontStyle: 'italic',
            marginTop: '-.8rem',
          }}>
            {moodLoading ? 'Finding the perfect picks for you…' : `${list.length} shows matched`}
          </p>
        )}

        {/* ─── Controls (hidden during initial mood load) ───────────── */}
        {!moodLoading && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,245,232,.28)', fontSize: '1rem' }}>🔍</span>
              <input className="inp" style={{ paddingLeft: 42 }} placeholder="Search TMDB + AniList…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="neo-select">
              <option value="r" style={{ background: '#0C091A' }}>Top Rated</option>
              <option value="yr" style={{ background: '#0C091A' }}>Newest</option>
              <option value="eps" style={{ background: '#0C091A' }}>Most Episodes</option>
            </select>
            {!isSearching && !isMoodMode && (
              <select
                value={browseSource}
                onChange={(e) => { setBrowseSource(e.target.value as BrowseSource); }}
                className="neo-select"
              >
                {SOURCE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} style={{ background: '#0C091A' }}>{o.label}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* ─── Genre chips ──────────────────────────────────────────── */}
        {!moodLoading && (
          <div className="hide-scroll" style={{ display: 'flex', gap: '.55rem', overflowX: 'auto', paddingBottom: '.75rem', marginBottom: '2rem' }}>
            {GENRES_ALL.map(g => (
              <button key={g} className={`chip${genre === g ? ' on' : ''}`} onClick={() => setGenre(g)} style={{ flexShrink: 0 }}>
                {g}
                <span className="f-mono" style={{ marginLeft: 6, fontSize: '.6rem', color: genre === g ? 'rgba(255,179,71,.55)' : 'rgba(255,245,232,.22)' }}>
                  {genreCounts[g] || 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={gridRef} className="main-pad bento-grid" style={{ padding: '0 clamp(1rem,5vw,3rem) 5.5rem', position: 'relative', zIndex: 3 }}>
        {moodLoading ? (
          <div className="f-cinzel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 1rem', color: 'rgba(255,245,232,.35)', letterSpacing: '.1em' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '.8rem', animation: 'pulse-dot 1.5s ease-in-out infinite' }}>
              {isMoodMode && moodConfig ? `Finding ${moodConfig.label.toLowerCase()} content…` : 'Loading…'}
            </div>
          </div>
        ) : list.length === 0 && !searchLoading ? (
          <div className="f-cinzel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 1rem', color: 'rgba(255,245,232,.28)',  letterSpacing: '.1em' }}>
            {isSearching && activeQuery ? (
              <>
                <div style={{ fontSize: '1rem', marginBottom: '.8rem' }}>✦ No results for &ldquo;{activeQuery}&rdquo;</div>
                <div style={{ fontSize: '.72rem', color: 'rgba(255,245,232,.22)', marginBottom: '1.2rem' }}>
                  Try checking the spelling, or use fewer words
                </div>
                {suggestions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}>
                    <span style={{ fontSize: '.68rem', color: 'rgba(255,179,71,.5)' }}>Did you mean:</span>
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => setQ(s)}
                        style={{
                          background: 'rgba(255,179,71,.08)',
                          border: '1px solid rgba(255,179,71,.2)',
                          borderRadius: 8,
                          padding: '6px 18px',
                          color: '#FFB347',
                          fontSize: '.78rem',
                          cursor: 'pointer',
                          transition: 'background .2s, border-color .2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,179,71,.15)'; e.currentTarget.style.borderColor = 'rgba(255,179,71,.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,179,71,.08)'; e.currentTarget.style.borderColor = 'rgba(255,179,71,.2)'; }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : '✦ No shows found ✦'}
          </div>
        ) : list.length === 0 ? (
          <div className="f-cinzel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 0', color: 'rgba(255,245,232,.28)',  letterSpacing: '.1em' }}>
            ✦ Searching…
          </div>
        ) : (
          <>
            {list.map((s, i) => {
              const featured = isFeatured(i);
              return (
                <div
                  key={`${s.id}-${s.title}`}
                  className={featured ? 'bento-item-featured' : ''}
                  style={{
                    animation: `card-in .44s ${Math.min(i, 5) * 0.04}s both`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Card show={s} sz={featured ? 'lg' : 'md'} />
                  {featured && !isMobile && (
                    <div style={{
                      marginTop: '.65rem',
                      display: 'flex',
                      gap: '.4rem',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}>
                      <span className="badge-r" style={{ fontSize: '.58rem', padding: '2px 8px' }}>⭐ {s.r}</span>
                      {s.genre.slice(0, 2).map(g => (
                        <span key={g} className="gtag" style={{ fontSize: '.55rem', padding: '2px 8px' }}>{g}</span>
                      ))}
                      <span className="f-mono" style={{ fontSize: '.58rem', color: 'rgba(255,245,232,.35)', }}>
                        {s.yr} · {s.eps} eps
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Loading indicator for initial search */}
      {searchLoading && searchResults.length === 0 && (
        <div className="f-cinzel" style={{ textAlign: 'center', padding: '0 0 4rem', color: 'rgba(255,245,232,.35)', fontSize: '.8rem', letterSpacing: '.08em', position: 'relative', zIndex: 3 }}>
          ✦ Searching TMDB + AniList…
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1, padding: '2rem 0' }} />
      {loadingMore && (
        <div className="f-cinzel" style={{ textAlign: 'center', padding: '0 0 4rem', color: 'rgba(255,245,232,.35)', fontSize: '.8rem', letterSpacing: '.08em', position: 'relative', zIndex: 3 }}>
          ✦ Loading…
        </div>
      )}
    </div>
  );
}