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
import '@/styles/genre-mystery.css';

const MYSTERY_GENRES = ['Mystery', 'Thriller', 'Crime', 'Drama', 'Sci-Fi', 'Fantasy'];

export default function MysteryPage({ initialShows }: { initialShows: MediaItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [shows, setShows] = useState(initialShows);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(5);

  useEffect(() => { trackGenreVisit('mystery'); }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await fetch(`/api/tmdb?endpoint=/discover/movie&with_genres=9648&sort_by=popularity.desc&vote_count_gte=50&page=${nextPage}`);
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

  const rain = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${(i % 20) * 5}%`,
    h: 12 + (i % 5) * 6,
    delay: `${i * 0.15}s`,
    dur: `${0.8 + (i % 4) * 0.3}s`,
    rx: -10 + (i % 7) * 3,
    op: 0.2 + (i % 3) * 0.1,
  })), []);
  const fogLayers = useMemo(() => Array.from({ length: 3 }, (_, i) => ({
    id: i,
    bottom: `${5 + i * 8}%`,
    op: 0.06 + i * 0.04,
    delay: `${i * 4}s`,
    dur: `${12 + i * 3}s`,
  })), []);

  return (
    <div className="page" style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#050A15',
        paddingTop: 'clamp(60px,7vw,80px)',
        overflow: 'hidden',
      }}>
        {/* Background: dark blue with golden lamp glow */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse at 50% 15%, rgba(255,179,71,0.10) 0%, transparent 35%),
            radial-gradient(ellipse at 30% 60%, rgba(10,20,40,0.8) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 50%, rgba(15,25,50,0.6) 0%, transparent 50%)
          `,
        }} />

        {/* Lamp glow effect */}
        <div style={{
          position: 'absolute', top: '2%', left: '50%', transform: 'translateX(-50%)',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,179,71,0.08) 0%, rgba(255,215,0,0.04) 40%, transparent 70%)',
          filter: 'blur(30px)',
          animation: 'lamp-f 4s ease-in-out infinite',
          zIndex: 1, pointerEvents: 'none',
        }}>
          {/* Lamp bulb */}
          <div style={{
            position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
            width: 24, height: 24, borderRadius: '50%',
            background: 'radial-gradient(circle, #FFD700, #FFB347)',
            boxShadow: '0 0 30px rgba(255,215,0,0.3), 0 0 60px rgba(255,179,71,0.15)',
            animation: 'lamp-f 4s ease-in-out infinite',
          }} />
          {/* Lamp wire */}
          <div style={{
            position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
            width: 2, height: '10%',
            background: 'linear-gradient(180deg, rgba(255,179,71,0.2), rgba(255,179,71,0.4))',
          }} />
        </div>

        {/* Falling rain drops */}
        {rain.map(r => (
          <div key={r.id} style={{
            position: 'absolute', top: '-20px', left: r.left,
            width: 1, height: r.h,
            background: 'linear-gradient(180deg, transparent, rgba(138,155,168,0.5))',
            animation: `rain-f ${r.dur} ${r.delay} linear infinite`,
            zIndex: 1, pointerEvents: 'none', opacity: r.op,
          } as React.CSSProperties} />
        ))}

        {/* Fog at bottom */}
        {fogLayers.map(f => (
          <div key={f.id} style={{
            position: 'absolute', bottom: f.bottom, left: '-5%', right: '-5%',
            height: 100,
            background: 'linear-gradient(90deg, transparent 0%, rgba(20,30,50,0.6) 25%, rgba(30,40,60,0.5) 50%, rgba(20,30,50,0.6) 75%, transparent 100%)',
            filter: 'blur(25px)',
            animation: `fog-d ${f.dur} ${f.delay} ease-in-out infinite`,
            zIndex: 1, pointerEvents: 'none', opacity: f.op,
          }} />
        ))}

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 5, padding: '3rem clamp(1rem,5vw,3rem) 2rem', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Special Elite',cursive",
            fontSize: 'clamp(2.8rem,7vw,5rem)',
            color: '#FFB347',
            letterSpacing: '0.18em',
            textShadow: '0 0 20px rgba(255,179,71,0.25), 0 2px 4px rgba(0,0,0,0.8)',
            marginBottom: '0.5rem',
          }}>
            <GenreIntro text="MYSTERY" genre="mystery" /><span style={{
              animation: 't-blink 1s step-end infinite',
              color: '#FFB347',
            }}>{'_'}</span>
          </h1>
          <p style={{
            fontFamily: "'Special Elite',cursive",
            fontSize: '0.8rem',
            color: 'rgba(255,179,71,0.35)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {filteredShows.length} FILES IN THE ARCHIVE
          </p>
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: '1rem',
          }}>
            <div style={{
              width: 50, height: 1,
              background: 'linear-gradient(90deg,transparent,rgba(255,179,71,0.3))',
            }} />
            <span style={{ fontFamily: "'Special Elite',cursive", fontSize: '0.75rem', color: 'rgba(255,179,71,0.25)', letterSpacing: '0.1em' }}>CLASSIFIED</span>
            <div style={{
              width: 50, height: 1,
              background: 'linear-gradient(270deg,transparent,rgba(255,179,71,0.3))',
            }} />
          </div>
        </div>

        <GenreParticles genre="mystery" />
        <GenreTrivia genre="mystery" color="rgba(255,179,71,.4)" />

        {/* Search, sort, filter toolbar */}
        <GenreToolbar
          onSearch={setSearchTerm}
          onSort={setSortBy}
          genres={MYSTERY_GENRES}
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
              color: 'rgba(255,179,71,0.3)', fontFamily: "'Special Elite',cursive", letterSpacing: '.1em',
            }}>No results found</div>
          ) : filteredShows.map((s, i) => (
            <div key={s.id} style={{ animation: `card-in .5s ${i * 0.05}s both` }}>
              <Card show={s} ring="linear-gradient(135deg,#FFB347,#FFD700,#8A9BA8,#FFB347)" />
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
