'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import type { MediaItem } from '@/types';
import { CS } from '@/styles/themes';
import Card from '@/components/common/Card';
import GenreToolbar from '@/components/common/GenreToolbar';
import SakuraCanvas from '@/components/common/SakuraCanvas';
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
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);
  const pageRef = useRef(3);
  const scrollYRef = useRef(0);
  const treeRef = useRef<HTMLDivElement>(null);
  const orbsWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { trackGenreVisit('anime'); }, []);

  useEffect(() => {
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
      if (treeRef.current) {
        treeRef.current.style.transform = `translateY(${window.scrollY * 0.15}px)`;
      }
      if (orbsWrapperRef.current) {
        orbsWrapperRef.current.style.transform = `translateY(${window.scrollY * 0.04}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setShowSubtitle(true), 800);
    const t2 = setTimeout(() => setShowTrivia(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

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
          {/* Tree image — fixed position so it stays behind on scroll, with parallax */}
          <div ref={treeRef} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '100vh',
            willChange: 'transform',
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

        {/* ── Background: Slowly pulsing sakura glow orbs (scroll-responsive) ── */}
        <div ref={orbsWrapperRef} style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          willChange: 'transform',
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

        {/* ── Header ── */}
        <div style={{ position: 'relative', zIndex: 5, padding: '3rem clamp(1rem,5vw,3rem) 2rem', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            fontSize: 'clamp(2.8rem,7.5vw,5.5rem)',
            letterSpacing: '0.08em',
            fontWeight: 700,
            marginBottom: '0.5rem',
          }}>
            <GenreIntro text="ANIME VAULT" genre="anime" />
          </h1>
          <p className="f-cinzel" style={{
            fontSize: '0.85rem',
            color: 'rgba(255,183,197,0.45)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            opacity: showSubtitle ? 1 : 0,
            transition: 'opacity 0.8s ease, transform 0.8s ease',
            transform: showSubtitle ? 'translateY(0)' : 'translateY(8px)',
          }}>
            {filteredShows.length} series in the archive · Powered by AniList
          </p>
          <div style={{
            width: 220, height: 1.5, margin: '1rem auto 0',
            background: 'linear-gradient(90deg, transparent, #FF85A2, #FFB7C5, #FF85A2, transparent)',
            borderRadius: 1,
            opacity: showSubtitle ? 1 : 0,
            transition: 'opacity 0.8s ease, transform 0.8s ease',
            transform: showSubtitle ? 'translateY(0)' : 'translateY(8px)',
          }} />
        </div>

        <SakuraCanvas />
        <div style={{
          opacity: showTrivia ? 1 : 0,
          transition: 'opacity 0.8s ease 0.2s',
          transform: showTrivia ? 'translateY(0)' : 'translateY(10px)',
        }}>
          <GenreTrivia genre="anime" color="rgba(255,183,197,.4)" />
        </div>

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
          ) : filteredShows.map((s, i) => (
            <div key={s.id}>
              <Card
                show={s}
                index={i}
                ring="linear-gradient(135deg, #FF85A2, #FFB7C5, #E8789A, #FFC8D6, #FF85A2)"
              />
            </div>
          ))}
        </div>

        {/* ── Infinite scroll sentinel ── */}
        <div ref={sentinelRef} style={{ height: 1, padding: '2rem 0' }} />
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '0 0 4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 24, height: 24, border: '2px solid rgba(255,183,197,0.15)', borderTopColor: 'rgba(255,133,162,0.6)', borderRadius: '50%', animation: 'sakura-spin 0.8s linear infinite' }} />
            <span style={{ color: 'rgba(255,183,197,.3)', fontSize: '.75rem', letterSpacing: '.08em' }}>Loading more</span>
          </div>
        )}
        {!hasMore && (
          <div style={{ textAlign: 'center', padding: '0 0 4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,183,197,0.2))' }} />
            <span style={{ color: 'rgba(255,183,197,.15)', fontSize: '.75rem', letterSpacing: '.06em' }} className="f-cinzel">End of archive</span>
            <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, rgba(255,183,197,0.2), transparent)' }} />
          </div>
        )}

      </div>
  );
}