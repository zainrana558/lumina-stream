'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaItem, TMDBSearchResult } from '@/types';
import { tmdbToMedia } from '@/types';
import { GCARDS } from '@/styles/themes';
import { CS } from '@/styles/themes';
import Image from 'next/image';
import SearchFilters, { type FilterState } from '@/components/common/SearchFilters';
import { addSearch, getRecentSearches, clearSearchHistory } from '@/lib/searchHistory';
import { getPosterUrl, getProfileUrl } from '@/lib/images';

interface TMDBPersonResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  known_for: TMDBSearchResult[];
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
    setLoading(true);
    setSearched(true);

    if (searchTab === 'people') {
      try {
        const res = await fetch(`/api/tmdb?endpoint=/search/person&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results) {
          setPersonResults(data.results.filter((r: TMDBPersonResult) => r.profile_path).slice(0, 8));
        }
      } catch {
        setPersonResults([]);
      }
      setLoading(false);
      return;
    }

    if (searchTab === 'anime') {
      try {
        const res = await fetch(`/api/anime?type=search&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results) {
          setResults(data.results.slice(0, 10));
        }
      } catch {
        setResults([]);
      }
      addSearch(query);
      setRecentSearches(getRecentSearches());
      setLoading(false);
      return;
    }

    try {
      if (hasActiveFilters) {
        const searchRes = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const searchData = await searchRes.json();
        if (searchData.results) {
          let items = searchData.results
            .filter((r: TMDBSearchResult) => r.media_type === 'movie' || r.media_type === 'tv');
          if (filters.mediaType !== 'all') {
            items = items.filter((r: TMDBSearchResult) => r.media_type === filters.mediaType);
          }
          if (filters.yearFrom) {
            items = items.filter((r: TMDBSearchResult) => {
              const yr = parseInt((r.release_date || r.first_air_date || '').split('-')[0]);
              return yr >= parseInt(filters.yearFrom);
            });
          }
          if (filters.yearTo) {
            items = items.filter((r: TMDBSearchResult) => {
              const yr = parseInt((r.release_date || r.first_air_date || '').split('-')[0]);
              return yr <= parseInt(filters.yearTo);
            });
          }
          if (filters.minRating) {
            items = items.filter((r: TMDBSearchResult) => r.vote_average >= parseFloat(filters.minRating));
          }
          setResults(items.slice(0, 8).map((r: TMDBSearchResult) => tmdbToMedia(r)));
        }
      } else {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results) {
          const items = data.results
            .filter((r: TMDBSearchResult) => r.media_type === 'movie' || r.media_type === 'tv')
            .slice(0, 8)
            .map((r: TMDBSearchResult) => tmdbToMedia(r));
          setResults(items);
          setSearchPage(1);
          setHasMoreResults(true);
        }
      }
      // Save to search history
      addSearch(query);
      setRecentSearches(getRecentSearches());
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [searchTab, hasActiveFilters, filters]);

  const handleInputChange = useCallback((value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearchPage(1); doSearch(value); }, 400);
  }, [doSearch]);

  const loadMoreSearch = useCallback(async () => {
    if (loading || !hasMoreResults || searchQueryRef.current.length < 2) return;
    setLoading(true);
    try {
      const nextPage = searchPage + 1;
      const params = new URLSearchParams();
      if (hasActiveFilters) {
        if (filters.mediaType !== 'all') params.set('mediaType', filters.mediaType);
        if (filters.yearFrom) params.set('yearFrom', filters.yearFrom);
        if (filters.yearTo) params.set('yearTo', filters.yearTo);
        if (filters.minRating) params.set('minRating', filters.minRating);
        if (filters.genre) params.set('genre', filters.genre);
      }
      params.set('page', String(nextPage));
      const qs = params.toString() ? `&${params.toString()}` : '';
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQueryRef.current)}&page=${nextPage}${qs}`);
      const data = await res.json();
      if (data.results) {
        const newItems = data.results
          .filter((r: TMDBSearchResult) => r.media_type === 'movie' || r.media_type === 'tv')
          .map((r: TMDBSearchResult) => tmdbToMedia(r));
        const existingIds = new Set(results.map(i => i.id));
        const fresh = newItems.filter((i: MediaItem) => !existingIds.has(i.id));
        if (fresh.length === 0) setHasMoreResults(false);
        setResults(prev => [...prev, ...fresh]);
        setSearchPage(nextPage);
      } else {
        setHasMoreResults(false);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [loading, hasMoreResults, searchPage, hasActiveFilters, filters, results.length]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

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
    <div className="s-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <span className="sec" style={{ fontSize: '1.2rem' }}>Search Lumina</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Tab bar: Shows / People */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          {(['shows', 'anime', 'people'] as const).map(tab => (
            <button
              key={tab}
              className={`tab-btn${searchTab === tab ? ' on' : ''} f-cinzel`}
              onClick={() => { setSearchTab(tab); setResults([]); setPersonResults([]); setSearched(false); }}
              style={{ padding: '10px clamp(14px,3vw,24px)', background: 'none', border: 'none', outline: 'none', color: searchTab === tab ? 'var(--gold)' : 'rgba(255,245,232,.35)', transition: 'color .22s',  fontSize: '.82rem', letterSpacing: '.06em', cursor: 'pointer' }}
            >
              {tab === 'shows' ? '🎬 Shows' : tab === 'anime' ? '🎌 Anime' : '👤 People'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,245,232,.3)', fontSize: '1.1rem' }}>🔍</span>
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
              <span style={{ transition: 'transform .25s', display: 'inline-block', transform: showFilters ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
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
            <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
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
                  const knownId = p.known_for?.[0]?.id;
                  if ((e.key === 'Enter' || e.key === ' ') && knownId) { e.preventDefault(); router.push(`/details/${knownId}`); onClose(); }
                }}
                onClick={() => {
                  const knownId = p.known_for?.[0]?.id;
                  if (knownId) { router.push(`/details/${knownId}`); onClose(); }
                }}
                style={{ padding: '.9rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: `card-in .35s ${i * 0.06}s both` }}
              >
                {p.profile_path ? (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: '3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.1),0 0 0 1.5px rgba(139,120,255,.3)' }}>
                    <Image src={getProfileUrl(p.profile_path, 'w92')!} alt={p.name} width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#8B78FF55,#8B78FF22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, boxShadow: '3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22)' }}>👤</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="f-cinzel" style={{  fontWeight: 600, fontSize: '.88rem', color: '#FFF5E8', marginBottom: 3 }}>{p.name}</div>
                  <div style={{ fontSize: '.7rem', color: 'rgba(255,245,232,.4)', marginBottom: 2 }}>{p.known_for_department}</div>
                  <div className="f-crimson" style={{ fontSize: '.64rem', color: 'rgba(255,245,232,.3)',  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.known_for?.slice(0, 3).map((kf) => kf.title || kf.name).join(', ') || 'No known works'}
                  </div>
                </div>
                <span className="f-cinzel" style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.25)',  flexShrink: 0 }}>→</span>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
            {results.map((s, i) => {
              const posterSrc = getPosterUrl(s, 'w92');
              return (
              <div key={s.id} className="ep-row" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/details/${s.id}`); onClose(); } }} onClick={() => { router.push(`/details/${s.id}`); onClose(); }} style={{ padding: '.9rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: `card-in .35s ${i * 0.06}s both` }}>
                {posterSrc ? (
                  <div style={{ width: 42, height: 42, borderRadius: 10, overflow: 'hidden', flexShrink: 0, boxShadow: '2px 2px 8px rgba(0,0,0,.6)' }}>
                    <Image src={posterSrc} alt={s.title} width={42} height={42} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: CS[s.cs].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{CS[s.cs].em}</div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="f-cinzel" style={{  fontWeight: 600, fontSize: '.86rem', color: '#FFF5E8', marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: '.7rem', color: 'rgba(255,245,232,.4)' }}>{s.genre[0]} · {s.yr}</div>
                </div>
                <div className="badge-r">⭐ {s.r}</div>
              </div>
              );
            })}
          </div>
        ) : searched && q.length > 1 ? (
          <div className="f-cinzel" style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255,245,232,.3)',  fontSize: '.82rem', letterSpacing: '.1em' }}>✦ No results ✦</div>
        ) : results.length > 0 && hasMoreResults ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            <button
              onClick={loadMoreSearch}
              disabled={loading}
              className="btn-g f-cinzel"
              style={{ padding: '10px 28px', fontSize: '.78rem',  letterSpacing: '.06em', opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? '✦ Loading...' : 'Show More Results'}
            </button>
          </div>
        ) : recentSearches.length > 0 ? (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
              <span className="f-cinzel" style={{ fontSize: '.6rem', color: 'rgba(255,245,232,.3)',  letterSpacing: '.1em' }}>RECENT SEARCHES</span>
              <button className="f-cinzel" onClick={() => { clearSearchHistory(); setRecentSearches([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.58rem', color: 'rgba(255,107,138,.6)',  letterSpacing: '.06em' }}>Clear all</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem' }}>
              {recentSearches.slice(0, 8).map(term => (
                <span key={term} className="gtag" onClick={() => handleInputChange(term)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.6rem', padding: '4px 10px' }}>
                  {term}
                  <span onClick={(e) => removeSearchTerm(term, e)} style={{ opacity: 0.4, cursor: 'pointer', fontSize: '.55rem' }}>✕</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.55rem' }}>
            {GCARDS.map(g => (
              <span key={g.key} className="gtag" onClick={() => handleInputChange(g.name)}>{g.em} {g.name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
