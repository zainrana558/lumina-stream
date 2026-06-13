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
import '@/styles/genre-romance.css';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const ROMANCE_GENRES = ['Romance', 'Drama', 'Comedy', 'Fantasy', 'Animation', 'Music'];

export default function RomancePage({ initialShows }: { initialShows: MediaItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [shows, setShows] = useState(initialShows);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(5);

  useEffect(() => { trackGenreVisit('romance'); }, []);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  hasMoreRef.current = hasMore;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await fetch(`/api/tmdb?endpoint=/discover/movie&with_genres=10749&sort_by=popularity.desc&vote_count_gte=50&page=${nextPage}`);
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

  const hearts = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${3 + (i % 7) * 13}%`,
    size: 12 + (i % 4) * 5,
    delay: `${i * 0.9}s`,
    dur: `${6 + (i % 3) * 2}s`,
    color: ['#FF4D6D', '#FFB3C1', '#FFD700', '#FF69B4', '#FF1493', '#E75480'][i % 6],
    rot: -20 + (i % 5) * 10,
  })), []);
  const petals = useMemo(() => Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: `${2 + (i % 8) * 12}%`,
    delay: `${i * 1.2}s`,
    dur: `${7 + (i % 3) * 2}s`,
    size: 8 + (i % 3) * 4,
    rot: 200 + i * 80,
    color: ['#FFB3C1', '#FF69B4', '#FFD1DC', '#FF4D6D'][i % 4],
    sway: -30 + i * 8,
  })), []);

  return (
    <div className="page" style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0D0008',
        paddingTop: 'clamp(60px,7vw,80px)',
        overflow: 'hidden',
      }}>
        {/* Background radial gradients */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(255,77,109,0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 40%, rgba(255,107,138,0.10) 0%, transparent 45%),
            radial-gradient(ellipse at 50% 80%, rgba(255,77,109,0.08) 0%, transparent 40%),
            radial-gradient(ellipse at 15% 70%, rgba(255,179,193,0.06) 0%, transparent 35%)
          `,
        }} />

        {/* Rising hearts */}
        {hearts.map(h => (
          <div key={h.id} style={{
            position: 'absolute', bottom: '-20px', left: h.left,
            fontSize: h.size,
            color: h.color,
            opacity: 0.7,
            zIndex: 1, pointerEvents: 'none',
            animation: `heart-rise ${h.dur} ${h.delay} ease-in-out infinite`,
            filter: `drop-shadow(0 0 6px ${h.color}55)`,
          } as React.CSSProperties}>
            {h.id % 3 === 0 ? '♥' : h.id % 3 === 1 ? '♡' : '❤'}
          </div>
        ))}

        {/* Falling rose petals */}
        {petals.map(p => (
          <div key={p.id} style={{
            position: 'absolute', top: '-20px', left: p.left,
            width: p.size, height: p.size * 0.7,
            borderRadius: '50% 0 50% 50%',
            background: `linear-gradient(135deg, ${p.color}, ${p.color}88)`,
            zIndex: 1, pointerEvents: 'none',
            animation: `rose-fall ${p.dur} ${p.delay} ease-in-out infinite`,
            transform: `rotate(${p.rot}deg)`,
            opacity: 0.6,
          } as React.CSSProperties} />
        ))}

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 5, padding: '3rem clamp(1rem,5vw,3rem) 2rem', textAlign: 'center' }}>
          <div className="f-playfair" style={{
            
            fontWeight: 900,
            fontSize: 'clamp(1.5rem,4vw,2.5rem)',
            color: '#FFB3C1',
            marginBottom: '0.3rem',
            letterSpacing: '0.05em',
            animation: 'love-g 3s ease-in-out infinite',
          }}>♥ &nbsp; ♡ &nbsp; ♥</div>
          <h1 className="f-playfair" style={{
            
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: 'clamp(3rem,8vw,5.5rem)',
            color: '#FF6B8A',
            textShadow: '0 0 30px rgba(255,107,138,0.3), 0 0 60px rgba(255,77,109,0.15)',
            animation: 'love-g 4s ease-in-out infinite',
            marginBottom: '0.5rem',
            lineHeight: 1.1,
          }}><GenreIntro text="Romance" genre="romance" /></h1>
          <p className="f-cinzel" style={{
            
            fontSize: '0.85rem',
            color: 'rgba(255,107,138,0.45)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {filteredShows.length} series in the archive
          </p>
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: '1rem',
          }}>
            <div style={{
              width: 50, height: 1,
              background: 'linear-gradient(90deg,transparent,rgba(255,107,138,0.4))',
            }} />
            <span style={{ color: '#FF6B8A', fontSize: '1rem', opacity: 0.6 }}>🌹</span>
            <div style={{
              width: 50, height: 1,
              background: 'linear-gradient(270deg,transparent,rgba(255,107,138,0.4))',
            }} />
          </div>
        </div>

        <GenreParticles genre="romance" />
        <GenreTrivia genre="romance" color="rgba(255,107,138,.45)" />

        {/* Search, sort, filter toolbar */}
        <GenreToolbar
          onSearch={setSearchTerm}
          onSort={setSortBy}
          genres={ROMANCE_GENRES}
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
            <div className="f-playfair" style={{
              gridColumn: '1/-1', textAlign: 'center', padding: '5rem 0',
              color: 'rgba(255,107,138,0.3)',  fontStyle: 'italic', letterSpacing: '.1em',
            }}>No results found</div>
          ) : filteredShows.map((s, i) => (
            <div key={s.id}>
              <Card show={s} ring="linear-gradient(135deg,#FF4D6D,#FFB3C1,#FF4D6D,#FFD700)" />
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
