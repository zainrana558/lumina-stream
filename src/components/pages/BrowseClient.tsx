'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { MediaItem, SortKey, TMDBShow } from '@/types';
import { GENRES_ALL } from '@/styles/themes';
import { tmdbToMedia } from '@/types';
import Card from '@/components/common/Card';

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

export default function BrowseClient({ initialShows }: BrowseClientProps) {
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

  const isSearching = activeQuery.length > 0;

  // Track viewport width for mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch initial AniList batch when source includes anime
  useEffect(() => {
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
  }, [browseSource]);

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

  // Load more: search mode or browse mode
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
      } else {
        // Browse mode — load more based on source
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
  }, [loadingMore, hasMore, isSearching, searchPage, searchTotalPages, activeQuery, browseSource, animePage, animeShows.length, searchResults.length]);

  // Reset hasMore when switching modes
  useEffect(() => {
    if (isSearching) {
      setHasMore(searchPage < searchTotalPages);
    } else if (browseSource === 'anime') {
      setHasMore(animeHasMore);
    } else if (browseSource === 'all') {
      setHasMore(true); // Both sources may have more
    } else {
      setHasMore(true);
    }
  }, [isSearching, searchPage, searchTotalPages, browseSource, animeHasMore]);

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
        <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', marginBottom: 4 }}>Browse Shows</h1>
        <p className="f-crimson" style={{  color: 'rgba(255,245,232,.4)', marginBottom: '1.8rem', fontStyle: 'italic' }}>
          {isSearching
            ? (searchLoading && searchResults.length === 0
              ? `Searching for "${activeQuery}"…`
              : `${searchTotalResults || searchResults.length} results for "${activeQuery}"`)
            : `${totalCount} in catalog`}
          {genre !== 'All' ? ` · ${list.length} shown` : ''}
        </p>

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
          {!isSearching && (
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
      </div>

      <div ref={gridRef} className="main-pad bento-grid" style={{ padding: '0 clamp(1rem,5vw,3rem) 5.5rem', position: 'relative', zIndex: 3 }}>
        {list.length === 0 && !searchLoading ? (
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

      {/* Load More Button */}
      {!searchLoading && hasMore && list.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 clamp(1rem,5vw,3rem) 4rem', position: 'relative', zIndex: 3 }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-g f-cinzel"
            style={{
              padding: '12px 32px',
              fontSize: '.82rem',
              letterSpacing: '.06em',
              minWidth: 200,
              opacity: loadingMore ? 0.6 : 1,
              cursor: loadingMore ? 'wait' : 'pointer',
            }}
          >
            {loadingMore ? '✦ Loading…' : 'Load More Shows'}
          </button>
        </div>
      )}

      {!hasMore && list.length > 0 && (
        <div className="f-cinzel" style={{ textAlign: 'center', padding: '0 0 4rem', color: 'rgba(255,245,232,.25)',  fontSize: '.75rem', letterSpacing: '.08em', position: 'relative', zIndex: 3 }}>
          — End of catalog —
        </div>
      )}
    </div>
  );
}