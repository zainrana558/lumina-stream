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
import '@/styles/genre-cartoon.css';

const CARTOON_GENRES = ['Animation', 'Comedy', 'Family', 'Adventure', 'Fantasy', 'Music'];

export default function CartoonPage({ initialShows }: { initialShows: MediaItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [shows, setShows] = useState(initialShows);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(5);

  useEffect(() => { trackGenreVisit('cartoon'); }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await fetch(`/api/tmdb?endpoint=/discover/tv&with_genres=16&with_original_language=en&sort_by=popularity.desc&vote_count_gte=50&page=${nextPage}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const newItems = data.results
          .filter((r: TMDBShow) => r.poster_path)
          .map((r: TMDBShow) => tmdbToMedia({ ...r, media_type: r.media_type || 'tv' }));
        setShows(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const fresh = newItems.filter((i: MediaItem) => !existingIds.has(i.id));
          return [...prev, ...fresh];
        });
        pageRef.current = nextPage;
      } else { setHasMore(false); }
    } catch { /* silent — user can retry */ } finally { setLoadingMore(false); }
  }, [loadingMore, hasMore]);

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

  const clouds = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    id: i,
    top: `${5 + i * 12}%`,
    left: `${-5 + i * 22}%`,
    dur: `${8 + i * 2}s`,
    delay: `${i * 1.5}s`,
    scale: 0.7 + i * 0.12,
    op: 0.5 + (i % 3) * 0.12,
  })), []);
  const bubbles = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${5 + (i % 6) * 15}%`,
    size: 6 + (i % 4) * 4,
    delay: `${i * 0.8}s`,
    dur: `${5 + (i % 3) * 2}s`,
    color: ['#74B9FF', '#FF8B80', '#FFE66D', '#98FB98', '#DDA0DD'][i % 5],
  })), []);
  const flowers = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    id: i,
    left: `${3 + i * 11}%`,
    size: 14 + (i % 3) * 6,
    color: ['#FF6B8A', '#FFE66D', '#FF8B80', '#DDA0DD', '#74B9FF'][i % 5],
    delay: `${i * 0.3}s`,
  })), []);

  return (
    <div className="page" style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#87CEEB 0%,#B0E2FF 40%,#90EE90 100%)',
        paddingTop: 'clamp(60px,7vw,80px)',
        overflow: 'hidden',
      }}>
        {/* Sun with rays */}
        <div style={{
          position: 'absolute', top: '4%', right: '8%', zIndex: 1, pointerEvents: 'none',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'radial-gradient(circle,#FFE66D,#FFD93D)',
            boxShadow: '0 0 40px rgba(255,230,100,0.5), 0 0 80px rgba(255,230,100,0.25)',
            animation: 'sun-s 20s linear infinite',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 130, height: 130, borderRadius: '50%',
            border: '3px dashed rgba(255,230,100,0.3)',
            animation: 'sun-s 30s linear infinite reverse',
          }} />
        </div>

        {/* Floating clouds */}
        {clouds.map(c => (
          <div key={c.id} style={{
            position: 'absolute', top: c.top, left: c.left,
            fontSize: `${c.scale * 4}rem`, opacity: c.op, zIndex: 1,
            animation: `cloud-d ${c.dur} ${c.delay} ease-in-out infinite`,
            pointerEvents: 'none', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))',
          }}>☁️</div>
        ))}

        {/* Rising bubbles */}
        {bubbles.map(b => (
          <div key={b.id} style={{
            position: 'absolute', bottom: '-20px', left: b.left,
            width: b.size, height: b.size, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), ${b.color}55)`,
            border: `1px solid ${b.color}44`,
            zIndex: 1,
            animation: `bubble-rise ${b.dur} ${b.delay} ease-in-out infinite`,
            pointerEvents: 'none',
          } as React.CSSProperties} />
        ))}

        {/* Flowers at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, zIndex: 1, pointerEvents: 'none' }}>
          {flowers.map(f => (
            <div key={f.id} style={{
              position: 'absolute', bottom: 5, left: f.left,
              fontSize: f.size,
              animation: `bounce-in 0.6s ${f.delay} both`,
            }}>🌸</div>
          ))}
        </div>

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 5, padding: '3rem clamp(1rem,5vw,3rem) 2rem', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Fredoka One',cursive",
            fontSize: 'clamp(2.8rem,7vw,5rem)',
            color: '#2D5A1B',
            textShadow: '3px 3px 0 rgba(0,0,0,0.08), -1px -1px 0 rgba(255,255,255,0.3)',
            marginBottom: '0.5rem',
            animation: 'bounce-in 0.8s ease both',
          }}><GenreIntro text="CARTOONS! 🌈" genre="cartoon" /></h1>
          <p className="f-cinzel" style={{
            
            fontSize: '0.85rem',
            color: '#2D5A1B',
            letterSpacing: '0.08em',
            opacity: 0.7,
          }}>
            {filteredShows.length} series in the archive
          </p>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1rem',
          }}>
            {['🌈', '⭐', '🎨', '🌟', '🎈'].map((em, i) => (
              <span key={i} style={{
                fontSize: '1.4rem',
                animation: `sway ${2 + i * 0.3}s ease-in-out infinite`,
              }}>{em}</span>
            ))}
          </div>
        </div>

        <GenreParticles genre="cartoon" />
        <GenreTrivia genre="cartoon" color="#2D5A1B" />

        {/* Search, sort, filter toolbar */}
        <GenreToolbar
          onSearch={setSearchTerm}
          onSort={setSortBy}
          genres={CARTOON_GENRES}
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
              color: '#2D5A1B', fontFamily: "'Fredoka One',cursive", fontSize: '1.1rem', opacity: 0.5,
            }}>No results found</div>
          ) : filteredShows.map((s, i) => (
            <div key={s.id} style={{ animation: `card-in .5s ${i * 0.05}s both` }}>
              <Card show={s} ring="linear-gradient(135deg,#FFE66D,#FF8B80,#74B9FF,#98FB98)" />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 4rem' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore || !hasMore}
            className="btn-g f-cinzel"
            style={{ padding: '12px 32px', fontSize: '.82rem',  letterSpacing: '.06em', minWidth: 200, opacity: loadingMore ? 0.6 : 1, cursor: loadingMore ? 'wait' : 'pointer' }}
          >
            {loadingMore ? '✦ Loading...' : hasMore ? 'Load More' : '— End of catalog —'}
          </button>
        </div>
      </div>
  );
}
