'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import type { MediaItem } from '@/types';
import { tmdbToMedia } from '@/types';
import type { TMDBShow } from '@/types';
import { CS } from '@/styles/themes';
import Card from '@/components/common/Card';
import GenreToolbar from '@/components/common/GenreToolbar';
import GenreParticles from '@/components/common/GenreParticles';
import GenreTrivia from '@/components/common/GenreTrivia';
import GenreIntro from '@/components/common/GenreIntro';
import { trackGenreVisit } from '@/components/common/GenreProgress';
import '@/styles/genre-anime.css';

interface ExtendedMediaItem extends MediaItem {
  _anilistCover?: string;
  _anilistBanner?: string;
  _malId?: number;
  _anilistUrl?: string;
}

const ANIME_GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Thriller', 'Romance', 'Supernatural', 'Slice of Life', 'Sports'];

export default function AnimePage({ initialShows }: { initialShows: MediaItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [shows, setShows] = useState(initialShows);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);

  useEffect(() => { trackGenreVisit('anime'); }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      if (nextPage > 10) { setHasMore(false); return; }
      const res = await fetch(`/api/tmdb?endpoint=/discover/tv&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${nextPage}`);
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

  const sweeps = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    id: i,
    top: `${8 + i * 14}%`,
    delay: `${i * 1.3}s`,
    dur: `${2.4 + i * 0.5}s`,
    h: `${2 + (i % 3)}px`,
  })), []);
  const gridDots = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: `${(i % 10) * 10}%`,
    top: `${Math.floor(i / 10) * 10}%`,
    op: 0.04 + (i % 3) * 0.015,
  })), []);

  return (
    <div className="page" style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#000',
        paddingTop: 'clamp(60px,7vw,80px)',
        overflow: 'hidden',
      }}>
        {/* Background layers */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse at 15% 25%, rgba(255,0,150,0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 35%, rgba(0,255,255,0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(255,230,0,0.06) 0%, transparent 50%)
          `,
        }} />
        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          {gridDots.map(d => (
            <div key={d.id} style={{
              position: 'absolute', left: d.left, top: d.top,
              width: 2, height: 2, borderRadius: '50%',
              background: '#00FFFF', opacity: d.op,
            }} />
          ))}
        </div>

        {/* Scan line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2, zIndex: 1,
          background: 'linear-gradient(90deg,transparent,rgba(0,255,255,0.25),rgba(255,0,150,0.2),transparent)',
          animation: 'scan 4s linear infinite', pointerEvents: 'none',
        }} />

        {/* Speed sweep lines */}
        {sweeps.map(s => (
          <div key={s.id} style={{
            position: 'absolute', left: 0, right: 0, top: s.top, height: s.h, zIndex: 1,
            background: 'linear-gradient(90deg,transparent,rgba(255,0,150,0.15),rgba(0,255,255,0.12),transparent)',
            animation: `speed-sweep ${s.dur} ${s.delay} linear infinite`,
            pointerEvents: 'none',
          } as React.CSSProperties} />
        ))}

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 5, padding: '3rem clamp(1rem,5vw,3rem) 2rem', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Bangers',cursive",
            fontSize: 'clamp(3rem,8vw,6rem)',
            letterSpacing: '0.06em',
            background: 'linear-gradient(135deg,#FF0096,#00FFFF,#FFE600,#FF0096)',
            backgroundSize: '300% 300%',
            animation: 'g-flow 4s ease infinite',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            
            marginBottom: '0.5rem',
          }}><GenreIntro text="ANIME VAULT" genre="anime" /></h1>
          <p className="f-cinzel" style={{
            
            fontSize: '0.85rem',
            color: 'rgba(0,255,255,0.5)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            animation: 'neon-pulse 3s ease-in-out infinite',
          }}>
            {filteredShows.length} series in the archive · Powered by AniList
          </p>
          <div style={{
            width: 200, height: 2, margin: '1rem auto 0',
            background: 'linear-gradient(90deg,transparent,#FF0096,#00FFFF,#FF0096,transparent)',
            animation: 'g-flow 3s ease infinite',
            backgroundSize: '200% 100%',
          }} />
        </div>

        <GenreParticles genre="anime" />
        <GenreTrivia genre="anime" color="rgba(0,255,255,.45)" />

        {/* Search, sort, filter toolbar */}
        <GenreToolbar
          onSearch={setSearchTerm}
          onSort={setSortBy}
          genres={ANIME_GENRES}
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
            <div className="f-cinzel" style={{
              gridColumn: '1/-1', textAlign: 'center', padding: '5rem 0',
              color: 'rgba(0,255,255,0.3)',  letterSpacing: '.1em',
            }}>No results found</div>
          ) : filteredShows.map((s, i) => (
            <div key={s.id} style={{ animation: `card-in .5s ${i * 0.05}s both` }}>
              <Card show={s} ring="linear-gradient(135deg,#FF0096,#00FFFF,#FFE600,#FF0096)" />
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
