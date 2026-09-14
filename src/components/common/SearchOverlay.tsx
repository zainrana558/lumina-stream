'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Film, Sparkles, Users, Search as SearchIcon, ChevronRight, Loader2, User as UserIcon, Star, SearchX } from 'lucide-react';
import type { MediaItem } from '@/types';
import { GCARDS } from '@/styles/themes';
import { CS } from '@/styles/themes';
import Image from 'next/image';
import SearchFilters, { type FilterState } from '@/components/common/SearchFilters';
import { addSearch, getRecentSearches, clearSearchHistory } from '@/lib/searchHistory';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { getPosterUrl, getProfileUrl } from '@/lib/images';
import { mediaUrl } from '@/lib/slug';

interface TMDBPersonResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  known_for: Array<{ id: number; title?: string; name?: string; media_type?: string }>;
  popularity: number;
}

interface SearchOverlayProps {
  onClose: () => void;
  onPick?: (show: MediaItem) => void;
}

const DEFAULT_FILTERS: FilterState = {
  genre: '',
  yearFrom: '',
  yearTo: '',
  minRating: '',
  sortBy: '',
  mediaType: 'all',
  runtimeFrom: '',
  runtimeTo: '',
};

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const router = useRouter();
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const searchQueryRef = useRef('');
  const [searchTab, setSearchTab] = useState<'shows' | 'people' | 'anime'>('shows');
  const [personResults, setPersonResults] = useState<TMDBPersonResult[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load genre list + recent searches on mount
  useEffect(() => {
    fetch('/api/tmdb?endpoint=/genre/movie/list')
      .then(r => r.json())
      .then(data => { if (data.genres) setGenres(data.genres); })
      .catch(() => {});
  }, []);

  const hasActiveFilters = filters.genre || filters.yearFrom || filters.yearTo || filters.minRating || filters.sortBy || filters.mediaType !== 'all' || filters.runtimeFrom || filters.runtimeTo;

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      setPersonResults([]);
      return;
    }
    // Guards against out-of-order async responses: switching tabs re-runs
    // doSearch for whatever text is already in the box (see the searchTab
    // effect below), and a debounced keystroke can still be in flight when
    // the next one fires. Without this, a slower earlier request could
    // resolve AFTER a faster later one and clobber its results with stale
    // data — confirmed live (typing "Intersteller" then switching to the
    // Anime tab and typing "One Peice" could show the Anime tab still
    // rendering "Intersteller" hits). Each call claims the ref as its own
    // "latest request" token; a call only applies its fetched data if it's
    // still the most recent one by the time the fetch resolves.
    const myRequest = (searchQueryRef.current = `${searchTab}:${query}:${Date.now()}:${Math.random()}`);
    const isStale = () => searchQueryRef.current !== myRequest;
    setLoading(true);
    setSearched(true);

    if (searchTab === 'people') {
      try {
        const res = await fetch(`/api/tmdb?endpoint=/search/person&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (isStale()) return;
        if (data.results) {
          // Prefer people with a photo, but don't drop the rest — the row has a
          // 👤 fallback avatar, and dropping them can leave a real match invisible.
          const people = (data.results as TMDBPersonResult[])
            .filter((r) => r.known_for && r.known_for.length > 0)
            .sort((a, b) => (b.profile_path ? 1 : 0) - (a.profile_path ? 1 : 0));
          setPersonResults(people.slice(0, 8));
        }
      } catch {
        if (!isStale()) setPersonResults([]);
      }
      if (!isStale()) setLoading(false);
      return;
    }

    // Anime-only tab uses AniList directly
    if (searchTab === 'anime') {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=1&source=anilist`);
        const data = await res.json();
        if (isStale()) return;
        if (data.results) {
          setResults(data.results.slice(0, 10));
          setSuggestions(data.suggestions || []);
        }
      } catch {
        if (!isStale()) setResults([]);
      }
      addSearch(query);
      setRecentSearches(getRecentSearches());
      if (!isStale()) setLoading(false);
      return;
    }

    // Shows tab: searches BOTH TMDB + AniList via /api/search
    try {
      const source = hasActiveFilters && filters.mediaType !== 'all' ? 'tmdb' : 'all';
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=1&source=${source}`);
      const data = await res.json();
      if (isStale()) return;
      if (data.results) {
        // API returns MediaItem[] directly
        let items: MediaItem[] = data.results;

        // Apply client-side filters when active
        if (hasActiveFilters) {
          if (filters.yearFrom) {
            items = items.filter(s => s.yr >= parseInt(filters.yearFrom));
          }
          if (filters.yearTo) {
            items = items.filter(s => s.yr <= parseInt(filters.yearTo));
          }
          if (filters.minRating) {
            items = items.filter(s => s.r >= parseFloat(filters.minRating));
          }
        }

        setResults(items.slice(0, 10));
        setSearchPage(1);
        setHasMoreResults(data.has_more ?? false);
        setSuggestions(data.suggestions || []);
      }
      addSearch(query);
      setRecentSearches(getRecentSearches());
    } catch {
      if (!isStale()) setResults([]);
    }
    if (!isStale()) setLoading(false);
  }, [searchTab, hasActiveFilters, filters]);

  const handleInputChange = useCallback((value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearchPage(1); doSearch(value); }, 400);
  }, [doSearch]);

  const loadMoreSearch = useCallback(async () => {
    if (loading || !hasMoreResults || q.length < 2) return;
    setLoading(true);
    try {
      const nextPage = searchPage + 1;
      const source = searchTab === 'anime' ? undefined : (hasActiveFilters && filters.mediaType !== 'all' ? 'tmdb' : 'all');
      let url: string;
      if (searchTab === 'anime') {
        url = `/api/anime?type=search&q=${encodeURIComponent(q)}&page=${nextPage}`;
      } else {
        url = `/api/search?q=${encodeURIComponent(q)}&page=${nextPage}&source=${source}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.results) {
        const newItems: MediaItem[] = data.results;
        const existingIds = new Set(results.map(i => i.id));
        const fresh = newItems.filter((i: MediaItem) => !existingIds.has(i.id));
        if (fresh.length === 0) setHasMoreResults(false);
        setResults(prev => [...prev, ...fresh]);
        setSearchPage(nextPage);
        // /api/anime (anime tab) returns AniList's own `pageInfo.hasNextPage`
        // instead of the `has_more` field /api/search returns — checking
        // `data.has_more` unconditionally there was always undefined/falsy,
        // silently capping every anime search at 2 pages regardless of how
        // many results actually existed.
        const hasMore = searchTab === 'anime' ? !!data.pageInfo?.hasNextPage : !!data.has_more;
        if (!hasMore) setHasMoreResults(false);
      } else {
        setHasMoreResults(false);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [loading, hasMoreResults, searchPage, searchTab, hasActiveFilters, filters, q, results.length]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Re-run the current query when the tab changes — otherwise switching from
  // Shows to Anime/People with text already in the box shows a stale empty
  // state (no results, no "nothing found" message) until the user retypes.
  useEffect(() => {
    // doSearch's setLoading/setSearched calls before its first await are the whole
    // point here — re-running the search (with its own loading state) is what "tab
    // changed" means.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate, see above
    if (q.trim().length >= 2) doSearch(q);
  }, [searchTab]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    if (q.length >= 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(q), 300);
    }
  };

  const removeSearchTerm = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumina_search_history', JSON.stringify(updated));
    }
    setRecentSearches(updated);
  };

  return (
    <div className="s-overlay" ref={trapRef} role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <span className="sec" style={{ fontSize: '1.2rem' }}>Search Lumovia</span>
          <button className="btn-icon" onClick={onClose} aria-label="Close search"><X size={16} /></button>
        </div>

        {/* Tab bar: Shows / People */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          {(['shows', 'anime', 'people'] as const).map(tab => (
            <button
              key={tab}
              className={`tab-btn${searchTab === tab ? ' on' : ''} f-cinzel`}
              onClick={() => { setSearchTab(tab); setResults([]); setPersonResults([]); setSearched(false); }}
              style={{ padding: '10px clamp(14px,3vw,24px)', background: 'none', border: 'none', outline: 'none', color: searchTab === tab ? 'var(--gold)' : 'rgba(255,245,232,.35)', transition: 'color .22s',  fontSize: '.82rem', letterSpacing: '.06em', cursor: 'pointer', minHeight: 48, display: 'flex', alignItems: 'center', gap: 7 }}
            >
              {tab === 'shows' ? <Film size={15} /> : tab === 'anime' ? <Sparkles size={15} /> : <Users size={15} />}
              {tab === 'shows' ? 'Shows' : tab === 'anime' ? 'Anime' : 'People'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,245,232,.5)', display: 'flex' }}><SearchIcon size={17} /></span>
          <input className="inp" autoFocus style={{ paddingLeft: 44, fontSize: '1.05rem' }} placeholder={searchTab === 'people' ? 'Search actors, directors…' : searchTab === 'anime' ? 'Search anime titles…' : 'Search shows, genres…'} value={q} onChange={(e) => handleInputChange(e.target.value)} />
        </div>

        {/* Collapsible Filters (shows tab only) */}
        {searchTab === 'shows' && (
          <div style={{ marginBottom: '1.2rem' }}>
            <button
              onClick={() => setShowFilters(f => !f)}
              className="btn-g f-cinzel"
              style={{ padding: '6px 16px', fontSize: '.72rem',  display: 'flex', alignItems: 'center', gap: 6, marginBottom: showFilters ? '.75rem' : 0 }}
            >
              <ChevronRight size={13} style={{ transition: 'transform .25s', transform: showFilters ? 'rotate(90deg)' : 'rotate(0deg)' }} />
              Filters{hasActiveFilters ? ' · Active' : ''}
            </button>
            {showFilters && (
              <div className="neo-raised" style={{ padding: '1rem 1.1rem', borderRadius: 14, animation: 'fi .2s ease both' }}>
                <SearchFilters filters={filters} onFilterChange={handleFilterChange} genres={genres} mediaType="all" />
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="f-cinzel" style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255,245,232,.4)',  fontSize: '.82rem', letterSpacing: '.1em' }}>
            <div style={{ display: 'flex', justifyContent: 'center', animation: 'spin 1.5s linear infinite', marginBottom: '0.5rem', color: 'var(--gold)' }}><Loader2 size={24} /></div>
            <div>Searching…</div>
          </div>
        ) : searchTab === 'people' && personResults.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
            {personResults.map((p, i) => (
              <div
                key={p.id}
                className="ep-row"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  const kf = p.known_for?.[0];
                  if ((e.key === 'Enter' || e.key === ' ') && kf?.id) { e.preventDefault(); router.push(mediaUrl(kf.id, kf.title || kf.name || '', kf.media_type)); onClose(); }
                }}
                onClick={() => {
                  const kf = p.known_for?.[0];
                  if (kf?.id) { router.push(mediaUrl(kf.id, kf.title || kf.name || '', kf.media_type)); onClose(); }
                }}
                style={{ padding: '.9rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: `card-in .35s ${i * 0.06}s both` }}
              >
                {p.profile_path ? (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: '3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.1),0 0 0 1.5px rgba(139,120,255,.3)' }}>
                    <Image src={getProfileUrl(p.profile_path, 'w92')!} alt={p.name} width={48} height={48} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#8B78FF55,#8B78FF22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF5E8', flexShrink: 0, boxShadow: '3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22)' }}><UserIcon size={20} /></div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="f-cinzel" style={{  fontWeight: 600, fontSize: '.88rem', color: '#FFF5E8', marginBottom: 3 }}>{p.name}</div>
                  <div style={{ fontSize: '.7rem', color: 'rgba(255,245,232,.4)', marginBottom: 2 }}>{p.known_for_department}</div>
                  <div className="f-crimson" style={{ fontSize: '.64rem', color: 'rgba(255,245,232,.5)',  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.known_for?.slice(0, 3).map((kf) => kf.title || kf.name).join(', ') || 'No known works'}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: 'rgba(255,245,232,.25)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
            {results.map((s, i) => {
              const posterSrc = getPosterUrl(s, 'w92');
              return (
              <div key={`${s.media_type || 'tv'}-${s.id}`} className="ep-row" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(mediaUrl(s.id, s.title, s.media_type, s.yr, s._isAnilist)); onClose(); } }} onClick={() => { router.push(mediaUrl(s.id, s.title, s.media_type, s.yr, s._isAnilist)); onClose(); }} style={{ padding: '.9rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: `card-in .35s ${i * 0.06}s both` }}>
                {posterSrc ? (
                  <div style={{ width: 42, height: 42, borderRadius: 10, overflow: 'hidden', flexShrink: 0, boxShadow: '2px 2px 8px rgba(0,0,0,.6)' }}>
                    <Image src={posterSrc} alt={s.title} width={42} height={42} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: CS[s.cs].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CS[s.cs].acc, flexShrink: 0 }}>
                    {(() => { const Icon = CS[s.cs].icon; return <Icon size={19} />; })()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="f-cinzel" style={{  fontWeight: 600, fontSize: '.86rem', color: '#FFF5E8', marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: '.7rem', color: 'rgba(255,245,232,.4)' }}>{s.genre[0]} · {s.yr}</div>
                </div>
                <div className="badge-r">{s.r > 0 ? <><Star size={11} fill="currentColor" /> {s.r}</> : 'New'}</div>
              </div>
              );
            })}
          </div>
        ) : searched && q.length > 1 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <SearchX size={28} style={{ color: 'rgba(255,245,232,.3)', marginBottom: '.6rem' }} />
            <div className="f-cinzel" style={{ color: 'rgba(255,245,232,.5)',  fontSize: '.82rem', letterSpacing: '.1em', marginBottom: '.7rem' }}>No results</div>
            <div style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.4)', marginBottom: suggestions.length > 0 ? '1rem' : 0 }}>
              Try fewer words or check spelling
            </div>
            {suggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.4rem' }}>
                <span style={{ fontSize: '.64rem', color: 'rgba(255,179,71,.45)' }}>Did you mean:</span>
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => handleInputChange(s)}
                    style={{
                      background: 'rgba(255,179,71,.08)',
                      border: '1px solid rgba(255,179,71,.18)',
                      borderRadius: 8,
                      padding: '10px 18px',
                      color: '#FFB347',
                      fontSize: '.72rem',
                      cursor: 'pointer',
                      transition: 'background .2s',
                      minHeight: 44,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,179,71,.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,179,71,.08)'}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : results.length > 0 && hasMoreResults ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            <button
              onClick={loadMoreSearch}
              disabled={loading}
              className="btn-g f-cinzel"
              style={{ padding: '10px 28px', fontSize: '.78rem',  letterSpacing: '.06em', opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}
            >
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading</> : 'Show More Results'}
            </button>
          </div>
        ) : recentSearches.length > 0 ? (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
              <span className="f-cinzel" style={{ fontSize: '.6rem', color: 'rgba(255,245,232,.5)',  letterSpacing: '.1em' }}>RECENT SEARCHES</span>
              <button className="f-cinzel" onClick={() => { clearSearchHistory(); setRecentSearches([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.58rem', color: 'rgba(255,107,138,.6)',  letterSpacing: '.06em' }}>Clear all</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem' }}>
              {recentSearches.slice(0, 8).map(term => (
                <span key={term} className="gtag" onClick={() => handleInputChange(term)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.6rem', padding: '8px 12px', minHeight: 36 }}>
                  {term}
                  <span onClick={(e) => removeSearchTerm(term, e)} style={{ opacity: 0.4, cursor: 'pointer', display: 'inline-flex' }}><X size={10} /></span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.55rem' }}>
            {GCARDS.map(g => (
              <span key={g.key} className="gtag" onClick={() => handleInputChange(g.name)}><g.icon size={12} /> {g.name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
