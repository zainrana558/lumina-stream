'use client';

import { lazy, Suspense, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import type { MediaItem } from '@/types';
import { CS } from '@/styles/themes';
import Card from '@/components/common/Card';
import GenreToolbar from '@/components/common/GenreToolbar';
const SakuraCanvas = lazy(() => import('@/components/common/SakuraCanvas'));
import GenreTrivia from '@/components/common/GenreTrivia';
import GenreIntro from '@/components/common/GenreIntro';
import { trackGenreVisit } from '@/components/common/GenreProgress';
import '@/styles/genre-anime.css';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const ANIME_GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Thriller', 'Romance', 'Supernatural', 'Slice of Life', 'Sports'];

export default function AnimePage({ initialShows }: { initialShows: MediaItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [shows, setShows] = useState(initialShows);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(3);

  useEffect(() => { trackGenreVisit('anime'); }, []);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await fetch(`/api/anime?type=all&page=${nextPage}&perPage=25`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const newItems = data.results as MediaItem[];
        setShows(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const fresh = newItems.filter((i: MediaItem) => !existingIds.has(i.id));
          return [...prev, ...fresh];
        });
        pageRef.current = nextPage;
        if (!data.pageInfo?.hasNextPage) setHasMore(false);
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

  return (
    <div className="page" style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'linear-gradient(175deg, #1a0a12 0%, #0d0610 35%, #120818 65%, #0a0510 100%)',
        paddingTop: 'clamp(60px,7vw,80px)',
        overflow: 'hidden',
      }}>

        {/* ── Background: Cherry blossom tree ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        }}>
          {/* Tree image — fixed position so it stays behind on scroll */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '100vh',
            backgroundImage: 'url(/anime-sakura-bg.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundRepeat: 'no-repeat',
            opacity: 0.35,
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)',
          }} />
        </div>

        {/* ── Background: Soft pink atmospheric glows ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 600px 500px at 12% 18%, rgba(255, 130, 170, 0.10) 0%, transparent 70%),
            radial-gradient(ellipse 500px 600px at 88% 22%, rgba(255, 183, 197, 0.07) 0%, transparent 70%),
            radial-gradient(ellipse 700px 400px at 45% 75%, rgba(219, 112, 147, 0.06) 0%, transparent 70%),
            radial-gradient(ellipse 400px 400px at 70% 55%, rgba(255, 105, 140, 0.05) 0%, transparent 70%)
          `,
        }} />

        {/* ── Background: Slowly pulsing sakura glow orbs ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        }}>
          {[
            { left: '8%', top: '15%', size: 320, color: 'rgba(255,150,170,0.12)', delay: '0s', dur: '14s' },
            { left: '75%', top: '10%', size: 280, color: 'rgba(255,130,180,0.10)', delay: '4s', dur: '18s' },
            { left: '50%', top: '60%', size: 350, color: 'rgba(219,112,147,0.08)', delay: '7s', dur: '16s' },
            { left: '25%', top: '45%', size: 200, color: 'rgba(255,183,197,0.09)', delay: '2s', dur: '20s' },
            { left: '60%', top: '25%', size: 260, color: 'rgba(255,160,185,0.07)', delay: '9s', dur: '22s' },
          ].map((orb, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: orb.left,
              top: orb.top,
              width: orb.size,
              height: orb.size,
              borderRadius: '50%',
              background: orb.color,
              animation: `sakura-glow ${orb.dur} ${orb.delay} ease-in-out infinite`,
              pointerEvents: 'none',
            }} />
          ))}
        </div>

        {/* ── Delicate horizontal sweep lines ── */}
        {useMemo(() => Array.from({ length: 4 }, (_, i) => ({
          id: i,
          top: `${12 + i * 22}%`,
          delay: `${i * 3.5}s`,
          dur: `${12 + i * 2}s`,
        })), []).map(s => (
          <div key={s.id} style={{
            position: 'absolute', left: 0, right: 0, top: s.top, height: 1, zIndex: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,183,197,0.08), rgba(255,150,170,0.06), transparent)',
            animation: `sakura-sweep ${s.dur} ${s.delay} linear infinite`,
            pointerEvents: 'none',
          } as React.CSSProperties} />
        ))}

        {/* ── Header ── */}
        <div style={{ position: 'relative', zIndex: 5, padding: '3rem clamp(1rem,5vw,3rem) 2rem', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            fontSize: 'clamp(2.8rem,7.5vw,5.5rem)',
            letterSpacing: '0.08em',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #FFB7C5 0%, #FF85A2 25%, #E8789A 40%, #FFB7C5 55%, #FFC8D6 70%, #FF85A2 85%, #FFB7C5 100%)',
            backgroundSize: '300% 300%',
            animation: 'sakura-title-flow 6s ease infinite',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(255,150,170,0.3))',
            marginBottom: '0.5rem',
          }}>
            <GenreIntro text="ANIME VAULT" genre="anime" />
          </h1>
          <p className="f-cinzel" style={{
            fontSize: '0.85rem',
            color: 'rgba(255,183,197,0.45)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>
            {filteredShows.length} series in the archive · Powered by AniList
          </p>
          <div style={{
            width: 220, height: 1.5, margin: '1rem auto 0',
            background: 'linear-gradient(90deg, transparent, #FF85A2, #FFB7C5, #FF85A2, transparent)',
            backgroundSize: '200% 100%',
            animation: 'sakura-title-flow 4s ease infinite',
            borderRadius: 1,
          }} />
        </div>

        <Suspense fallback={null}><SakuraCanvas /></Suspense>
        <GenreTrivia genre="anime" color="rgba(255,183,197,.4)" />

        {/* ── Search, sort, filter toolbar ── */}
        <GenreToolbar
          onSearch={setSearchTerm}
          onSort={setSortBy}
          genres={ANIME_GENRES}
          onGenreFilter={setActiveGenre}
          activeSort={sortBy}
          activeGenre={activeGenre}
        />

        {/* ── Cards grid ── */}
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
              color: 'rgba(255,183,197,0.25)', letterSpacing: '.1em',
            }}>No results found</div>
          ) : filteredShows.map((s) => (
            <div key={s.id}>
              <Card
                show={s}
                ring="linear-gradient(135deg, #FF85A2, #FFB7C5, #E8789A, #FFC8D6, #FF85A2)"
              />
            </div>
          ))}
        </div>

        {/* ── Infinite scroll sentinel ── */}
        <div ref={sentinelRef} style={{ height: 1, padding: '2rem 0' }} />
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '0 0 4rem', color: 'rgba(255,183,197,.3)', fontSize: '.8rem', letterSpacing: '.08em' }}>
            ✦ Loading...
          </div>
        )}
        {!hasMore && (
          <div style={{ textAlign: 'center', padding: '0 0 4rem', color: 'rgba(255,183,197,.15)', fontSize: '.75rem', letterSpacing: '.06em' }}>
            — End of catalog —
          </div>
        )}
      </div>
  );
}