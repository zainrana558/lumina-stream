'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import type { MediaItem } from '@/types';
import { tmdbToMedia } from '@/types';
import type { TMDBShow } from '@/types';
import Card from '@/components/common/Card';
import GenreToolbar from '@/components/common/GenreToolbar';
import GenreParticles from '@/components/common/GenreParticles';
import GenreTrivia from '@/components/common/GenreTrivia';
import GenreIntro from '@/components/common/GenreIntro';
import { trackGenreVisit } from '@/components/common/GenreProgress';
import '@/styles/genre-horror.css';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const HORROR_GENRES = ['Horror', 'Thriller', 'Mystery', 'Sci-Fi', 'Fantasy', 'Action'];

export default function HorrorPage({ initialShows }: { initialShows: MediaItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [shows, setShows] = useState(initialShows);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(5);

  // Track genre visit for progress badges
  useEffect(() => { trackGenreVisit('horror'); }, []);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  hasMoreRef.current = hasMore;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await fetch(`/api/tmdb?endpoint=/discover/movie&with_genres=27&sort_by=popularity.desc&vote_count_gte=50&page=${nextPage}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const newItems = data.results
          .filter((r: TMDBShow) => r.poster_path)
          .map((r: TMDBShow) => tmdbToMedia({ ...r, media_type: r.media_type || 'movie' }));
        setShows(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const fresh = newItems.filter((i: MediaItem) => !existingIds.has(i.id));
          return [...prev, ...fresh];
        });
        pageRef.current = nextPage;
      } else { setHasMore(false); }
    } catch { /* silent — user can retry */ } finally { loadingRef.current = false; setLoadingMore(false); }
  }, []);

  const { sentinelRef } = useInfiniteScroll(loadMore, hasMore, loadingMore);

  const filteredShows = useMemo(() => {
    let result = [...shows];
    if (searchTerm) result = result.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (activeGenre) result = result.filter(s => s.genre.some(g => g.toLowerCase() === activeGenre.toLowerCase()));
    switch (sortBy) {
      case 'rating_desc': result.sort((a, b) => b.r - a.r); break;
      case 'rating_asc': result.sort((a, b) => a.r - b.r); break;
      case 'year_desc': result.sort((a, b) => b.yr - a.yr); break;
      case 'year_asc': result.sort((a, b) => a.yr - b.yr); break;
      case 'name_asc': result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'name_desc': result.sort((a, b) => b.title.localeCompare(a.title)); break;
    }
    return result;
  }, [shows, searchTerm, sortBy, activeGenre]);

  const drips = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${4 + i * 7}%`,
    h: 30 + (i % 5) * 25,
    delay: `${i * 0.6}s`,
    dur: `${2 + (i % 3) * 0.8}s`,
    w: 2 + (i % 3),
  })), []);
  const fogLayers = useMemo(() => Array.from({ length: 3 }, (_, i) => ({
    id: i,
    top: `${55 + i * 12}%`,
    op: 0.08 + i * 0.06,
    delay: `${i * 3}s`,
    dur: `${10 + i * 4}s`,
  })), []);

  return (
    <div className="page" style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0A0000',
        paddingTop: 'clamp(60px,7vw,80px)',
        overflow: 'hidden',
      }}>
        {/* Background radial gradients */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse at 20% 10%, rgba(139,0,0,0.20) 0%, transparent 45%),
            radial-gradient(ellipse at 80% 20%, rgba(220,20,60,0.12) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 90%, rgba(45,74,45,0.18) 0%, transparent 50%),
            radial-gradient(ellipse at 10% 60%, rgba(139,0,0,0.10) 0%, transparent 35%)
          `,
        }} />

        {/* SVG radial lines in corners */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '40%', zIndex: 1, pointerEvents: 'none', opacity: 0.06 }}>
          {[0, 30, 60, 90, 120, 150].map(a => (
            <line key={a} x1={0} y1={0} x2={200} y2={200}
              stroke="#DC143C" strokeWidth={1}
              transform={`rotate(${a}, 0, 0)`} />
          ))}
        </svg>
        <svg style={{ position: 'absolute', bottom: 0, right: 0, width: '35%', height: '35%', zIndex: 1, pointerEvents: 'none', opacity: 0.05 }}>
          {[0, 30, 60, 90, 120, 150].map(a => (
            <line key={a} x1={300} y1={300} x2={0} y2={0}
              stroke="#8B0000" strokeWidth={1}
              transform={`rotate(-${a}, 300, 300)`} />
          ))}
        </svg>

        {/* Blood drips from top */}
        {drips.map(d => (
          <div key={d.id} style={{
            position: 'absolute', top: 0, left: d.left,
            width: d.w, height: d.h,
            background: 'linear-gradient(180deg, rgba(139,0,0,0.7), rgba(220,20,60,0.4), transparent)',
            borderRadius: `0 0 ${d.w}px ${d.w}px`,
            animation: `blood-drip ${d.dur} ${d.delay} ease-in infinite`,
            zIndex: 2, pointerEvents: 'none',
          }} />
        ))}

        {/* Fog layers */}
        {fogLayers.map(f => (
          <div key={f.id} style={{
            position: 'absolute', top: f.top, left: '-5%', right: '-5%',
            height: 120,
            background: 'linear-gradient(90deg, transparent 0%, rgba(80,40,40,0.4) 20%, rgba(60,30,30,0.5) 50%, rgba(80,40,40,0.4) 80%, transparent 100%)',
            filter: 'blur(20px)',
            animation: `fog-d ${f.dur} ${f.delay} ease-in-out infinite`,
            zIndex: 1, pointerEvents: 'none', opacity: f.op,
          }} />
        ))}

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 5, padding: '3rem clamp(1rem,5vw,3rem) 2rem', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Special Elite',cursive",
            fontSize: 'clamp(3rem,8vw,6rem)',
            color: '#DC143C',
            letterSpacing: '0.15em',
            textShadow: '0 0 30px rgba(220,20,60,0.5), 0 0 60px rgba(139,0,0,0.3), 2px 2px 4px rgba(0,0,0,0.8)',
            animation: 'flicker 3s linear infinite, h-shake 6s ease-in-out infinite',
            marginBottom: '0.5rem',
          }}><GenreIntro text="HORROR" genre="horror" /></h1>
          <p style={{
            fontFamily: "'Special Elite',cursive",
            fontSize: '0.8rem',
            color: 'rgba(220,20,60,0.4)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {filteredShows.length} series in the archive
          </p>
          <div style={{
            width: 160, height: 1, margin: '1rem auto 0',
            background: 'linear-gradient(90deg,transparent,rgba(220,20,60,0.5),transparent)',
          }} />
        </div>

        <GenreParticles genre="horror" />
        <GenreTrivia genre="horror" color="rgba(220,20,60,.4)" />

        {/* Search, sort, filter toolbar */}
        <GenreToolbar
          onSearch={setSearchTerm}
          onSort={setSortBy}
          genres={HORROR_GENRES}
          onGenreFilter={setActiveGenre}
          activeSort={sortBy}
          activeGenre={activeGenre}
        />

        {/* Cards grid */}
        <div style={{
          position: 'relative', zIndex: 3,
          padding: '0 clamp(1rem,5vw,3rem) 5.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(130px,30vw,220px),1fr))',
          gap: '1.3rem',
        }}>
          {filteredShows.length === 0 ? (
            <div style={{
              gridColumn: '1/-1', textAlign: 'center', padding: '5rem 0',
              color: 'rgba(220,20,60,0.3)', fontFamily: "'Special Elite',cursive", letterSpacing: '.1em',
            }}>No results found</div>
          ) : filteredShows.map((s, i) => (
            <div key={s.id}>
              <Card show={s} ring="linear-gradient(135deg,#8B0000,#DC143C,#2D4A2D,#8B0000)" />
            </div>
          ))}
        </div>
        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 1, padding: '2rem 0' }} />
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '0 0 4rem', color: 'rgba(255,245,232,.35)', fontSize: '.8rem', letterSpacing: '.08em' }}>
            ✦ Loading...
          </div>
        )}
        {!hasMore && (
          <div style={{ textAlign: 'center', padding: '0 0 4rem', color: 'rgba(255,245,232,.2)', fontSize: '.75rem', letterSpacing: '.06em' }}>
            — End of catalog —
          </div>
        )}
      </div>
  );
}
