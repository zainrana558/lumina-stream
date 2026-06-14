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
import '@/styles/genre-fantasy.css';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const FANTASY_GENRES = ['Fantasy', 'Adventure', 'Action', 'Drama', 'Sci-Fi', 'Animation'];

export default function FantasyPage({ initialShows }: { initialShows: MediaItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [shows, setShows] = useState(initialShows);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(5);

  useEffect(() => { trackGenreVisit('fantasy'); }, []);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  hasMoreRef.current = hasMore;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await fetch(`/api/tmdb?endpoint=/discover/movie&with_genres=14&sort_by=popularity.desc&vote_count_gte=50&page=${nextPage}`);
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

  const sparkles = useMemo(() => Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: `${2 + (i % 8) * 12}%`,
    top: `${5 + Math.floor(i / 8) * 18}%`,
    size: 3 + (i % 4) * 2,
    delay: `${i * 0.4}s`,
    dur: `${2 + (i % 3) * 0.8}s`,
    color: ['#FFD700', '#C39BD3', '#87CEEB', '#FFF5CC'][i % 4],
  })), []);
  const clouds = useMemo(() => Array.from({ length: 4 }, (_, i) => ({
    id: i,
    top: `${10 + i * 20}%`,
    left: `${-8 + i * 25}%`,
    dur: `${12 + i * 3}s`,
    delay: `${i * 2}s`,
    op: 0.06 + i * 0.02,
    w: 200 + i * 60,
  })), []);
  const orbs = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    id: i,
    left: `${10 + i * 14}%`,
    top: `${20 + (i % 3) * 25}%`,
    size: 60 + (i % 3) * 30,
    delay: `${i * 1.5}s`,
    color: ['#C39BD3', '#87CEEB', '#FFD700', '#DDA0DD', '#ADD8E6', '#E6E6FA'][i],
  })), []);
  const mistLayers = useMemo(() => Array.from({ length: 3 }, (_, i) => ({
    id: i,
    bottom: `${8 + i * 10}%`,
    op: 0.08 + i * 0.04,
    delay: `${i * 3.5}s`,
    dur: `${14 + i * 4}s`,
  })), []);

  return (
    <div className="page" style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0D0520',
        paddingTop: 'clamp(60px,7vw,80px)',
        overflow: 'hidden',
      }}>
        {/* Background: purple/blue with floating orbs */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse at 25% 15%, rgba(195,155,211,0.12) 0%, transparent 45%),
            radial-gradient(ellipse at 75% 30%, rgba(135,206,235,0.08) 0%, transparent 40%),
            radial-gradient(ellipse at 40% 75%, rgba(255,215,0,0.06) 0%, transparent 35%),
            radial-gradient(ellipse at 60% 50%, rgba(26,8,64,0.5) 0%, transparent 60%)
          `,
        }} />

        {/* Floating sparkle stars */}
        {sparkles.map(sp => (
          <div key={sp.id} style={{
            position: 'absolute', left: sp.left, top: sp.top,
            width: sp.size, height: sp.size, borderRadius: '50%',
            background: sp.color,
            zIndex: 2, pointerEvents: 'none',
            animation: `sparkle-p ${sp.dur} ${sp.delay} ease-in-out infinite`,
            boxShadow: `0 0 ${sp.size * 2}px ${sp.color}55, 0 0 ${sp.size * 4}px ${sp.color}22`,
          } as React.CSSProperties} />
        ))}

        {/* Drifting clouds */}
        {clouds.map(c => (
          <div key={c.id} style={{
            position: 'absolute', top: c.top, left: c.left,
            width: c.w, height: 50,
            background: 'radial-gradient(ellipse, rgba(195,155,211,0.15) 0%, transparent 70%)',
            filter: 'blur(20px)',
            borderRadius: '50%',
            animation: `cloud-fl ${c.dur} ${c.delay} ease-in-out infinite`,
            zIndex: 1, pointerEvents: 'none', opacity: c.op,
          }} />
        ))}

        {/* Glowing orbs */}
        {orbs.map(o => (
          <div key={o.id} style={{
            position: 'absolute', left: o.left, top: o.top,
            width: o.size, height: o.size, borderRadius: '50%',
            background: `radial-gradient(circle, ${o.color}18 0%, transparent 70%)`,
            filter: 'blur(15px)',
            zIndex: 1, pointerEvents: 'none',
            animation: `star-dr ${6 + o.id * 1.5}s ${o.delay} ease-in-out infinite`,
          }} />
        ))}

        {/* Mist layer */}
        {mistLayers.map(m => (
          <div key={m.id} style={{
            position: 'absolute', bottom: m.bottom, left: '-8%', right: '-8%',
            height: 80,
            background: 'linear-gradient(90deg, transparent, rgba(195,155,211,0.15), rgba(135,206,235,0.10), rgba(195,155,211,0.15), transparent)',
            filter: 'blur(18px)',
            animation: `mist-d ${m.dur} ${m.delay} ease-in-out infinite`,
            zIndex: 1, pointerEvents: 'none', opacity: m.op,
          }} />
        ))}

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 5, padding: '3rem clamp(1rem,5vw,3rem) 2rem', textAlign: 'center' }}>
          {/* Sparkle stars around title */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ color: '#FFD700', fontSize: '1.2rem', animation: 'sparkle-p 2s ease-in-out infinite' }}>✦</span>
            <span style={{ color: '#87CEEB', fontSize: '0.8rem', animation: 'sparkle-p 2.5s 0.3s ease-in-out infinite' }}>✧</span>
            <span style={{ color: '#C39BD3', fontSize: '1.4rem', animation: 'sparkle-p 1.8s 0.6s ease-in-out infinite' }}>✦</span>
            <span style={{ color: '#FFD700', fontSize: '0.9rem', animation: 'sparkle-p 2.2s 0.9s ease-in-out infinite' }}>✧</span>
            <span style={{ color: '#87CEEB', fontSize: '1.1rem', animation: 'sparkle-p 2.8s 1.2s ease-in-out infinite' }}>✦</span>
          </div>
          <h1 className="f-playfair" style={{
            
            fontStyle: 'italic',
            fontWeight: 900,
            fontSize: 'clamp(3rem,8vw,5.5rem)',
            background: 'linear-gradient(135deg, #C39BD3, #FFD700, #87CEEB, #C39BD3)',
            backgroundSize: '300% 300%',
            animation: 'g-flow 5s ease infinite',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            
            marginBottom: '0.5rem',
            lineHeight: 1.1,
          }}><GenreIntro text="Fantasy" genre="fantasy" /></h1>
          <p className="f-cinzel" style={{
            
            fontSize: '0.85rem',
            color: 'rgba(195,155,211,0.45)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {filteredShows.length} series in the archive
          </p>
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: '1rem',
          }}>
            <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg,transparent,rgba(195,155,211,0.35))' }} />
            <span style={{ fontSize: '1rem', opacity: 0.5 }}>🔮</span>
            <div style={{ width: 60, height: 1, background: 'linear-gradient(270deg,transparent,rgba(195,155,211,0.35))' }} />
          </div>
        </div>

        <GenreParticles genre="fantasy" />
        <GenreTrivia genre="fantasy" color="rgba(195,155,211,.45)" />

        {/* Search, sort, filter toolbar */}
        <GenreToolbar
          onSearch={setSearchTerm}
          onSort={setSortBy}
          genres={FANTASY_GENRES}
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
              color: 'rgba(195,155,211,0.3)',  fontStyle: 'italic', letterSpacing: '.1em',
            }}>No results found</div>
          ) : filteredShows.map((s, i) => (
            <div key={s.id}>
              <Card show={s} ring="linear-gradient(135deg,#C39BD3,#FFD700,#87CEEB,#C39BD3)" />
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
