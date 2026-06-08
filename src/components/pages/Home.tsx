'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import type { MediaItem } from '@/types';
import { CS, MOODS, GCARDS } from '@/styles/themes';
import Card from '@/components/common/Card';
import ContentRow from '@/components/common/ContentRow';
import ContinueWatchingCard from '@/components/common/ContinueWatchingCard';
import MoodRoulette from '@/components/common/MoodRoulette';
import MoodQuiz from '@/components/common/MoodQuiz';
import AIMoodDetector from '@/components/common/AIMoodDetector';
import AmbientSoundscape from '@/components/common/AmbientSoundscape';
import GenreProgress from '@/components/common/GenreProgress';
import { getBackdropUrl } from '@/lib/images';
import type { GenreFeatured } from '@/app/(app)/page';

interface RowData {
  title: string;
  sub: string;
  items: MediaItem[];
  endpoint?: string;
  params?: Record<string, string>;
}

/* ── SVG Icon components (no emoji) ── */
const MoodIcon = ({ name, size = 28, color }: { name: string; size?: number; color: string }) => {
  const icons: Record<string, string> = {
    Melancholy: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 16 Q10 10 12 14 Q14 10 16 16" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" opacity=".5"/>`,
    Pumped: `<path d="M13 2L4 14h7l-1 10 9-12h-7l1-10z" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`,
    Romantic: `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    Thrilling: `<circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="1.2"/><path d="M12 6v6l4 4" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round"/><path d="M7 7l2 2M17 7l-2 2" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" opacity=".4"/>`,
    Chill: `<path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.7c.5.02 1 .02 1.5 0C13 19 15 13 17 8z" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 2v4" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" opacity=".5"/>`,
    Epic: `<path d="M12 2C10 6 6 8 6 13c0 4 3 7 6 8 3-1 6-4 6-8 0-5-4-7-6-11zm0 16c-2-1-4-3-4-6 0-3 2-5 4-9 2 4 4 6 4 9 0 3-2 5-4 6z" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  };
  const svg = icons[name] || icons['Pumped'];
  return <svg width={size} height={size} viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: svg }} />;
};

const GenreIcon = ({ name, size = 32, color }: { name: string; size?: number; color: string }) => {
  const icons: Record<string, string> = {
    anime: `<path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    cartoon: `<circle cx="12" cy="12" r="9" fill="none" stroke="${color}" stroke-width="1.2"/><path d="M8 14s1.5 2 4 2 4-2 4-2" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round"/><circle cx="9" cy="10" r="1" fill="${color}" opacity=".6"/><circle cx="15" cy="10" r="1" fill="${color}" opacity=".6"/>`,
    horror: `<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 110-10 5 5 0 010 10z" fill="none" stroke="${color}" stroke-width="1.2"/><circle cx="12" cy="12" r="2.5" fill="${color}" opacity=".4"/>`,
    romance: `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    mystery: `<circle cx="10" cy="10" r="7" fill="none" stroke="${color}" stroke-width="1.2"/><line x1="15.5" y1="15.5" x2="21" y2="21" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`,
    fantasy: `<path d="M12 2L6 12l6 10 6-10z" fill="none" stroke="${color}" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 2l6 10" fill="none" stroke="${color}" stroke-width="1" opacity=".4" stroke-linejoin="round"/><line x1="6" y1="12" x2="18" y2="12" stroke="${color}" stroke-width="1" opacity=".4"/>`,
  };
  const svg = icons[name] || icons['anime'];
  return <svg width={size} height={size} viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: svg }} />;
};

/* ── Mood landscape particle configs ── */
const MOOD_SCENES: Record<string, {
  bg: string;
  subtitle: string;
  particleClass: string;
  particles: Array<React.CSSProperties & { key: string }>;
}> = {
  Melancholy: {
    bg: 'linear-gradient(160deg,#0a0520,#1a0d3a,#0d0828)',
    subtitle: 'Rainy nights & deep thoughts',
    particleClass: 'mood-rain',
    particles: Array.from({ length: 18 }, (_, i) => ({
      key: `rain-${i}`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 30}%`,
      height: `${20 + Math.random() * 40}px`,
      '--dur': `${0.8 + Math.random() * 0.8}s`,
      '--delay': `${Math.random() * 2}s`,
    } as React.CSSProperties & { key: string })),
  },
  Pumped: {
    bg: 'linear-gradient(160deg,#1a0f00,#2d1800,#1a0e00)',
    subtitle: 'Adrenaline & pure energy',
    particleClass: 'mood-lightning',
    particles: Array.from({ length: 3 }, (_, i) => ({
      key: `bolt-${i}`,
      '--dur': `${2.5 + Math.random() * 3}s`,
      '--delay': `${i * 1.5}s`,
    } as React.CSSProperties & { key: string })),
  },
  Romantic: {
    bg: 'linear-gradient(160deg,#1a0510,#2d0a1e,#1a0815)',
    subtitle: 'Love stories & warm feels',
    particleClass: 'mood-hearts',
    particles: Array.from({ length: 10 }, (_, i) => ({
      key: `heart-${i}`,
      left: `${10 + Math.random() * 80}%`,
      bottom: `${Math.random() * 30}%`,
      '--sz': `${8 + Math.random() * 10}px`,
      '--dur': `${3 + Math.random() * 3}s`,
      '--delay': `${Math.random() * 4}s`,
      '--sway': `${-20 + Math.random() * 40}px`,
      '--rot': `${-20 + Math.random() * 40}deg`,
    } as React.CSSProperties & { key: string })),
  },
  Thrilling: {
    bg: 'linear-gradient(160deg,#1a0505,#2d0808,#1a0606)',
    subtitle: 'Edge-of-seat suspense',
    particleClass: 'mood-fog',
    particles: Array.from({ length: 3 }, (_, i) => ({
      key: `fog-${i}`,
      top: `${20 + i * 25}%`,
      '--dur': `${10 + i * 4}s`,
      '--delay': `${i * 2}s`,
    } as React.CSSProperties & { key: string })),
  },
  Chill: {
    bg: 'linear-gradient(160deg,#051a0a,#0a2d12,#061a0b)',
    subtitle: 'Relax & unwind',
    particleClass: 'mood-leaves',
    particles: Array.from({ length: 8 }, (_, i) => ({
      key: `leaf-${i}`,
      left: `${10 + Math.random() * 80}%`,
      bottom: `${Math.random() * 20}%`,
      '--sz': `${6 + Math.random() * 6}px`,
      '--dur': `${4 + Math.random() * 4}s`,
      '--delay': `${Math.random() * 5}s`,
      '--leaf-col': i % 2 === 0 ? '#78D621' : '#5B8C35',
    } as React.CSSProperties & { key: string })),
  },
  Epic: {
    bg: 'linear-gradient(160deg,#1a0f00,#2d1500,#1a0c00)',
    subtitle: 'Legends & grand adventures',
    particleClass: 'mood-embers',
    particles: Array.from({ length: 12 }, (_, i) => ({
      key: `ember-${i}`,
      left: `${10 + Math.random() * 80}%`,
      bottom: `${Math.random() * 20}%`,
      '--sz': `${2 + Math.random() * 4}px`,
      '--dur': `${2 + Math.random() * 2.5}s`,
      '--delay': `${Math.random() * 3}s`,
      '--drift': `${-15 + Math.random() * 30}px`,
      '--ember-col': i % 3 === 0 ? '#FF4A4A' : i % 3 === 1 ? '#FF8C00' : '#FFB347',
    } as React.CSSProperties & { key: string })),
  },
};

/* ══════════════════════════════════════════════════
   HERO CAROUSEL (unchanged)
   ══════════════════════════════════════════════════ */
function HeroCarousel({ featured, heroWatchlist, toggleHeroWatchlist }: { featured: MediaItem[]; heroWatchlist: Set<number>; toggleHeroWatchlist: (item: MediaItem) => void }) {
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const bgRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (featured.length === 0 || paused) return;
    const t = setInterval(() => { setIdx(i => (i + 1) % featured.length); setTick(k => k + 1); }, 6800);
    return () => clearInterval(t);
  }, [featured.length, paused]);

  useEffect(() => {
    let raf: number | undefined;
    const fn = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = undefined;
        if (!bgRef.current) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 10;
        bgRef.current.style.transform = `translate(${x}px,${y}px) scale(1.07)`;
      });
    };
    window.addEventListener('mousemove', fn as EventListener);
    return () => window.removeEventListener('mousemove', fn as EventListener);
  }, []);

  if (featured.length === 0) {
    return (
      <section style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.2rem', color: 'rgba(255,245,232,.4)', letterSpacing: '.1em' }}>Loading...</div>
      </section>
    );
  }

  const F = featured[idx];
  const s = CS[F.cs];

  return (
    <section
      style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      tabIndex={0} role="region" aria-label="Featured shows carousel" aria-roledescription="carousel"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { setIdx(i => (i - 1 + featured.length) % featured.length); setTick(k => k + 1); }
        if (e.key === 'ArrowRight') { setIdx(i => (i + 1) % featured.length); setTick(k => k + 1); }
      }}>
      <div ref={bgRef} key={`bg-${idx}`} style={{
        position: 'absolute', inset: '-6%',
        background: F.backdrop_path
          ? `url(${getBackdropUrl(F.backdrop_path, 'w1280')}) center/cover no-repeat`
          : `linear-gradient(135deg,${s.base} 0%,#18063A 22%,#2D1B5E 45%,${s.base} 80%)`,
        transition: 'transform .3s ease', zIndex: 0, animation: 'hero-swap .7s ease both',
      }}>
        {F.backdrop_path && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(7,4,15,.85) 0%,rgba(7,4,15,.6) 40%,rgba(7,4,15,.75) 100%)' }} />
        )}
        <div style={{ position: 'absolute', top: '16%', left: '55%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle,${s.acc}28 0%,transparent 68%)`, filter: 'blur(50px)', animation: 'aurora 11s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '22%', right: '16%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,120,255,.22) 0%,transparent 68%)', filter: 'blur(52px)', animation: 'aurora 15s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(9rem,17vw,19rem)', opacity: .04, filter: 'blur(5px)', animation: 'float 8s ease-in-out infinite', userSelect: 'none' }}>{s.em}</div>
      </div>
      <div className="hero-mask" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', zIndex: 2 }} />
      <div key={`txt-${tick}`} style={{ position: 'relative', zIndex: 3, padding: '0 clamp(1rem,5vw,4rem)', maxWidth: 'clamp(280px,50vw,720px)' }}>
        <div className="s1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 20, marginBottom: '1.3rem', background: '#0D0A1E', boxShadow: '4px 4px 12px rgba(0,0,0,.7),-2px -2px 5px rgba(45,25,90,.2),inset 0 1px 0 rgba(255,255,255,.06),0 0 0 1px rgba(255,179,71,.28)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF4444', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: '.64rem', letterSpacing: '.15em', color: 'rgba(255,179,71,.9)' }}>FEATURED SERIES</span>
        </div>
        <h1 className="h1 s2" style={{ fontSize: 'clamp(2.2rem,5.5vw,5.2rem)', marginBottom: '.85rem' }}>{F.title}</h1>
        <p className="s3" style={{ fontFamily: "'Cinzel',serif", fontSize: 'clamp(.73rem,.98vw,.88rem)', letterSpacing: '.06em', color: 'rgba(255,245,232,.52)', marginBottom: '.72rem' }}>{F.sub || F.genre[0]}</p>
        <p className="s4" style={{ fontFamily: "'Crimson Pro',serif", fontSize: 'clamp(.9rem,1.2vw,1.05rem)', lineHeight: 1.78, color: 'rgba(255,245,232,.68)', maxWidth: 530, marginBottom: '1.4rem' }}>{F.desc.slice(0, 130)}…</p>
        <div className="s4" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.8rem' }}>
          <div className="badge-r">⭐ {F.r}</div>
          {F.genre.slice(0, 2).map(g => <span key={g} className="gtag">{g}</span>)}
          <span style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.38)', alignSelf: 'center', fontFamily: "'Cinzel',serif" }}>{F.eps} eps · {F.yr}</span>
        </div>
        <div className="s5" style={{ display: 'flex', gap: '.85rem', flexWrap: 'wrap' }}>
          <button className="btn-p" onClick={() => router.push(`/details/${F.id}`)}>▶ Play Now</button>
          <button className="btn-g" onClick={() => router.push(`/details/${F.id}`)}>ℹ More Info</button>
          <button className="btn-g" onClick={() => toggleHeroWatchlist(F)}>
            {heroWatchlist.has(F.id) ? '✓ In My List' : '+ My List'}
          </button>
        </div>
      </div>
      <div className="hfloat" style={{ position: 'absolute', right: 'clamp(2rem,6vw,7%)', top: '50%', transform: 'translateY(-50%)', width: 'clamp(175px,17vw,245px)', zIndex: 3, animation: 'float2 7s ease-in-out infinite' }}>
        <Card show={F} sz="lg" />
      </div>
      <div style={{ position: 'absolute', bottom: '11%', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 4 }}>
        {featured.map((_, i) => (
          <div key={i} onClick={() => { setIdx(i); setTick((k: number) => k + 1); }} style={{
            width: i === idx ? 26 : 8, height: 8, borderRadius: 4,
            background: i === idx ? s.acc : 'rgba(255,255,255,.2)',
            cursor: 'pointer', transition: 'all .42s cubic-bezier(.34,1.56,.64,1)',
            boxShadow: i === idx ? `0 0 14px ${s.acc}90,3px 3px 8px rgba(0,0,0,.6)` : '',
          }} />
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   CINEMATIC GENRE PORTAL CARD
   ══════════════════════════════════════════════════ */
function GenrePortalCard({
  g,
  feat,
  index,
  onClick,
}: {
  g: typeof GCARDS[number];
  feat: GenreFeatured | undefined;
  index: number;
  onClick: () => void;
}) {
  const backdropUrl = feat?.backdrop ? getBackdropUrl(feat.backdrop, 'w780') : null;
  const featuredTitle = feat?.title || '';
  const count = feat?.count || 0;
  const tagline = feat?.tagline || '';

  return (
    <div
      className="genre-portal"
      onClick={onClick}
      style={{
        animationDelay: `${index * 0.08}s`,
        border: `1px solid ${g.tc}25`,
      }}
    >
      {/* Backdrop image or gradient fallback */}
      <div
        className="portal-backdrop"
        style={{
          backgroundImage: backdropUrl
            ? `url(${backdropUrl})`
            : g.col,
        }}
      />
      {/* Dark gradient overlay */}
      <div className="portal-overlay" />
      {/* Colored glow orb on hover */}
      <div className="portal-glow" style={{ background: `${g.tc}35` }} />
      {/* Animated shimmer on hover */}
      <div
        className="portal-shine"
        style={{
          background: `radial-gradient(circle at 50% 80%, ${g.tc}18, transparent 60%)`,
        }}
      />
      {/* Show count badge */}
      <div className="portal-badge">
        {count > 0 ? `${(count / 1000).toFixed(1)}k titles` : g.name}
      </div>
      {/* Content */}
      <div className="portal-content">
        {/* SVG icon watermark */}
        <div style={{
          position: 'absolute', top: '18%', right: '12%',
          opacity: .18, animation: `float ${4 + index}s ease-in-out infinite`,
          userSelect: 'none', pointerEvents: 'none',
        }}>
          <GenreIcon name={g.key} size={72} color={g.tc} />
        </div>
        {/* Genre name */}
        <div style={{
          fontFamily: "'Cinzel Decorative',serif", fontWeight: 900,
          fontSize: 'clamp(1.1rem,1.8vw,1.5rem)',
          color: '#FFF5E8', letterSpacing: '.04em',
          textShadow: '0 3px 12px rgba(0,0,0,.9)',
          marginBottom: 4, lineHeight: 1.1,
        }}>
          {g.name}
        </div>
        {/* Tagline */}
        <div style={{
          fontFamily: "'Crimson Pro',serif", fontSize: 'clamp(.68rem,.85vw,.78rem)',
          color: `${g.tc}cc`, fontStyle: 'italic', marginBottom: 10,
          lineHeight: 1.4,
        }}>
          {tagline}
        </div>
        {/* Featured show title */}
        {featuredTitle && (
          <div style={{
            fontSize: '.6rem', color: 'rgba(255,245,232,.35)',
            fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.04em',
            marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis', maxWidth: '85%',
          }}>
            TRENDING: {featuredTitle.toUpperCase()}
          </div>
        )}
        {/* Enter Portal CTA (visible on hover) */}
        <div className="portal-cta" style={{ borderColor: `${g.tc}35` }}>
          Enter Portal <span style={{ fontSize: '.7rem' }}>→</span>
        </div>
        {/* Genre progress */}
        <GenreProgress genre={g.key} />
      </div>
      {/* Animated bottom shimmer line */}
      <div className="genre-shimmer" style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${g.tc}60, transparent)`,
        backgroundSize: '200% 100%', opacity: 0.3,
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   IMMERSIVE MOOD LANDSCAPE CARD
   ══════════════════════════════════════════════════ */
function MoodLandscapeCard({
  mood,
  index,
  isHighlighted,
  onClick,
}: {
  mood: typeof MOODS[number];
  index: number;
  isHighlighted: boolean;
  onClick: () => void;
}) {
  const scene = MOOD_SCENES[mood.name];

  return (
    <div
      className={`mood-landscape ${scene.particleClass} ${isHighlighted ? 'mood-highlighted' : ''}`}
      onClick={onClick}
      style={{
        animationDelay: `${index * 0.1}s`,
        '--mood-glow-color': `${mood.col}30`,
      } as React.CSSProperties}
    >
      {/* Background gradient */}
      <div className="mood-bg" style={{ background: scene.bg }}>
        {/* Animated particles container */}
        <div className="mood-particles">
          {scene.particles.map(p => (
            <div
              key={p.key}
              className={`${scene.particleClass.replace('mood-', '')}-particle`}
              style={p}
            >
              {/* Heart particles rendered as CSS shapes */}
              {mood.name === 'Romantic' && (
                <svg width="10" height="10" viewBox="0 0 24 24" style={{ color: `${mood.col}80` }}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" opacity=".7"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Dark overlay for text readability */}
      <div className="mood-overlay" />
      {/* Large SVG icon watermark */}
      <div className="mood-emoji" style={{ animationDelay: `${index * 0.5}s` }}>
        <MoodIcon name={mood.name} size={72} color={mood.col} />
      </div>
      {/* Expanding ring */}
      <div className="mood-ring" style={{ borderColor: `${mood.col}25`, animationDelay: `${index * 0.8}s` }} />
      {/* Content at bottom */}
      <div className="mood-content">
        <div style={{
          fontFamily: "'Cinzel Decorative',serif", fontWeight: 900,
          fontSize: 'clamp(.95rem,1.4vw,1.15rem)',
          color: '#FFF5E8', letterSpacing: '.04em',
          textShadow: '0 3px 10px rgba(0,0,0,.8)',
          marginBottom: 4, lineHeight: 1.1,
        }}>
          {mood.name}
        </div>
        <div style={{
          fontFamily: "'Crimson Pro',serif", fontSize: 'clamp(.62rem,.75vw,.72rem)',
          color: `${mood.col}aa`, fontStyle: 'italic', lineHeight: 1.4,
          marginBottom: 8,
        }}>
          {scene.subtitle}
        </div>
        {/* Colored accent line */}
        <div style={{
          width: 'clamp(24px,4vw,40px)', height: 2,
          background: `linear-gradient(90deg, ${mood.col}, transparent)`,
          borderRadius: 2, opacity: isHighlighted ? 1 : 0.5,
          transition: 'all .3s',
        }} />
        {isHighlighted && (
          <div style={{
            marginTop: 8,
            fontSize: '.48rem', color: `${mood.col}70`,
            letterSpacing: '.12em', fontFamily: "'JetBrains Mono',monospace",
          }}>
            PICKED FOR NOW
          </div>
        )}
      </div>
      {/* Border glow on hover */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        border: `1px solid ${isHighlighted ? mood.col + '40' : mood.col + '18'}`,
        transition: 'border-color .3s', pointerEvents: 'none', zIndex: 3,
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   HOME PAGE
   ══════════════════════════════════════════════════ */
export default function Home({
  featured,
  rows,
  genreFeatured,
}: {
  featured: MediaItem[];
  rows: RowData[];
  genreFeatured: GenreFeatured[];
}) {
  const { profile, kidsMode } = useApp();
  const [continueWatching, setContinueWatching] = useState<MediaItem[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<MediaItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [timeGreeting, setTimeGreeting] = useState('Good Evening');
  const [heroWatchlist, setHeroWatchlist] = useState<Set<number>>(new Set());
  const router = useRouter();

  // Time-aware greeting
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) setTimeGreeting('Good Morning');
    else if (h >= 12 && h < 17) setTimeGreeting('Good Afternoon');
    else if (h >= 17 && h < 21) setTimeGreeting('Good Evening');
    else setTimeGreeting('Late Night Vibes');
  }, []);

  // Time-aware mood highlight index
  const highlightedMood = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Pumped';
    if (h >= 12 && h < 17) return 'Chill';
    if (h >= 17 && h < 21) return 'Romantic';
    return 'Thrilling';
  }, []);

  // Fetch continue watching
  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const { getContinueWatching } = await import('@/actions/progress');
        const cw = await getContinueWatching(profile.id);
        if (cw && cw.length > 0) {
          const cwItems = cw.map((item: { media_id: number; title: string; duration: number; progress: number; poster_path: string | null; media_type: string }) => ({
            id: item.media_id,
            title: item.title,
            sub: '',
            genre: [],
            r: 0,
            yr: 2024,
            eps: item.duration || 0,
            st: '',
            tag: 'CONTINUE',
            cs: Math.abs(item.media_id) % 8,
            featured: false,
            progress: item.duration > 0 ? (item.progress / item.duration) * 100 : 0,
            desc: '',
            cast: [],
            epList: [],
            poster_path: item.poster_path,
            backdrop_path: null,
            media_type: item.media_type as 'movie' | 'tv',
          }));
          setContinueWatching(cwItems);
        }
      } catch { /* silent */ }
    })();
  }, [profile]);

  // Fetch hero featured watchlist status
  useEffect(() => {
    if (!profile || featured.length === 0) return;
    (async () => {
      try {
        const { isInWatchlist } = await import('@/actions/watchlist');
        const ids = await Promise.all(
          featured.slice(0, 10).map(async (item) => {
            const inList = await isInWatchlist(profile.id, item.id, item.media_type || 'tv');
            return { id: item.id, inList };
          })
        );
        setHeroWatchlist(new Set(ids.filter(i => i.inList).map(i => i.id)));
      } catch { /* silent */ }
    })();
  }, [profile, featured]);

  const toggleHeroWatchlist = async (item: MediaItem) => {
    if (!profile) { router.push('/login'); return; }
    const mediaType = item.media_type || 'tv';
    try {
      if (heroWatchlist.has(item.id)) {
        const { removeFromWatchlist } = await import('@/actions/watchlist');
        await removeFromWatchlist(profile.id, item.id, mediaType);
        setHeroWatchlist(prev => { const next = new Set(prev); next.delete(item.id); return next; });
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: profile.id, mediaId: item.id, mediaType, title: item.title, poster_path: item.poster_path || null, status: 'plan_to_watch' }),
        });
        setHeroWatchlist(prev => new Set([...prev, item.id]));
      }
    } catch { /* silent */ }
  };

  // "Because You Watched" recommendations
  useEffect(() => {
    if (!profile || continueWatching.length === 0) return;
    let cancelled = false;
    const loadRecs = async () => {
      setLoadingRecs(true);
      try {
        const detailsPromises = continueWatching.slice(0, 5).map(async (item) => {
          const mt = item.media_type || 'tv';
          try {
            const res = await fetch(`/api/tmdb?endpoint=/${mt}/${item.id}`);
            const data = await res.json();
            return data.genre_ids || (data.genres || []).map((g: { id: number }) => g.id);
          } catch { return []; }
        });
        const allGenreLists = await Promise.all(detailsPromises);
        const genreCount: Record<number, number> = {};
        allGenreLists.forEach((ids: number[]) => ids.forEach((id: number) => { genreCount[id] = (genreCount[id] || 0) + 1; }));
        const sortedGenres = Object.entries(genreCount).sort(([, a], [, b]) => b - a);
        if (sortedGenres.length === 0) { setLoadingRecs(false); return; }
        const topGenreId = sortedGenres[0][0];
        const tvCount = continueWatching.filter(i => i.media_type === 'tv').length;
        const mediaType = tvCount >= continueWatching.length / 2 ? 'tv' : 'movie';
        const res = await fetch(`/api/tmdb?endpoint=/discover/${mediaType}&with_genres=${topGenreId}&sort_by=popularity.desc`);
        const data = await res.json();
        if (!cancelled && data.results) {
          const { tmdbToMedia } = await import('@/types');
          const items = data.results
            .filter((r: typeof data.results[0]) => r.poster_path)
            .slice(0, 12)
            .map((r: typeof data.results[0]) => tmdbToMedia({ ...r, media_type: mediaType }));
          setRecommendedItems(items);
        }
      } catch { /* silent */ }
      if (!cancelled) setLoadingRecs(false);
    };
    loadRecs();
    return () => { cancelled = true; };
  }, [profile, continueWatching.length > 0]);

  const P = 'clamp(1rem,5vw,3rem)';

  // Kids mode filters
  const filteredFeatured = useMemo(() => {
    if (!kidsMode) return featured;
    const kidGenres = ['Animation', 'Family', 'Comedy', 'Adventure', 'Fantasy', 'Sci-Fi', 'Music', 'Documentary'];
    return featured.filter(item => item.genre.some(g => kidGenres.includes(g)));
  }, [featured, kidsMode]);

  const filteredRows = useMemo(() => {
    if (!kidsMode) return rows;
    const kidGenres = ['Animation', 'Family', 'Comedy', 'Adventure', 'Fantasy', 'Sci-Fi', 'Music', 'Documentary'];
    const kidRowKeywords = ['animation', 'anime', 'family', 'cartoon', 'kids', 'comedy', 'adventure', 'fantasy', 'fun', 'popular', 'top', 'trending'];
    return rows.filter(row => {
      const rowLower = row.title.toLowerCase();
      return kidRowKeywords.some(kw => rowLower.includes(kw));
    }).map(row => ({
      ...row,
      items: row.items.filter(item => item.genre.some(g => kidGenres.includes(g))),
    })).filter(row => row.items.length > 0);
  }, [rows, kidsMode]);

  const filteredGenreCards = useMemo(() => {
    if (!kidsMode) return GCARDS;
    return GCARDS.filter(g => ['anime', 'cartoon'].includes(g.key));
  }, [kidsMode]);

  // Build a map of genre key → featured data
  const genreFeatureMap = useMemo(() => {
    const m = new Map<string, GenreFeatured>();
    genreFeatured.forEach(f => m.set(f.key, f));
    return m;
  }, [genreFeatured]);

  return (
    <div className="page">
      <HeroCarousel featured={filteredFeatured} heroWatchlist={heroWatchlist} toggleHeroWatchlist={toggleHeroWatchlist} />

      {/* ── Content Rows ── */}
      <section style={{ padding: '0 0 3.5rem', position: 'relative', zIndex: 3 }}>
        {continueWatching.length > 0 && (
          <div style={{ marginBottom: 44 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, paddingInline: 'clamp(1rem,5vw,3rem)' }}>
              <div>
                <div style={{ fontSize: '8.5px', color: 'rgba(255,245,232,.3)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 5, fontFamily: "'Cinzel',serif" }}>Pick up where you left off</div>
                <div className="sec" style={{ fontSize: 'clamp(1rem,2vw,1.25rem)' }}>Continue Watching</div>
              </div>
            </div>
            <div className="hide-scroll" style={{ display: 'flex', gap: 14, padding: '6px clamp(1rem,5vw,3rem)', overflowX: 'auto', overflowY: 'visible' }}>
              {continueWatching.map((item, i) => (
                <div key={item.id} style={{ animation: `card-in .45s ${i * 0.045}s both` }}>
                  <ContinueWatchingCard show={item} />
                </div>
              ))}
            </div>
          </div>
        )}
        {loadingRecs && (
          <div style={{ padding: '0 clamp(1rem,5vw,3rem)', textAlign: 'center', color: 'rgba(255,245,232,.35)', fontFamily: "'Cinzel',serif", fontSize: '.82rem', letterSpacing: '.1em', marginBottom: 44 }}>
            <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '1.5rem', marginBottom: '0.5rem' }}>✦</div>
            <div>Finding recommendations for you…</div>
          </div>
        )}
        {!loadingRecs && recommendedItems.length > 0 && (
          <ContentRow title="Because You Watched" sub="Recommended based on your history" items={recommendedItems} />
        )}
        {filteredRows.map((row, i) => (
          <ContentRow key={`row-${i}`} title={row.title} sub={row.sub} items={row.items} ranked={row.title.includes('Top 10')} loadMoreEndpoint={row.endpoint} loadMoreParams={row.params} />
        ))}
      </section>

      {/* ── GENRE PORTALS — Cinematic Backdrop Banners ── */}
      <section style={{ padding: `0 ${P} 4rem`, position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 className="sec" style={{ fontSize: 'clamp(1.1rem,2.2vw,1.5rem)', marginBottom: 4 }}>Genre Portals</h2>
            <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.82rem', color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>{timeGreeting} — step into a world</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(200px,20vw,300px),1fr))', gap: '1.2rem' }}>
          {filteredGenreCards.map((g, i) => (
            <GenrePortalCard
              key={g.key}
              g={g}
              feat={genreFeatureMap.get(g.key)}
              index={i}
              onClick={() => router.push(`/genre/${g.key}`)}
            />
          ))}
        </div>
      </section>

      {/* ── MOOD LANDSCAPES — Immersive Mini-Scenes ── */}
      <section style={{ padding: `0 ${P} 4rem`, position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="sec" style={{ fontSize: 'clamp(1.1rem,2.2vw,1.5rem)', marginBottom: 4 }}>Watch by Mood</h2>
            <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.82rem', color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>Pick your vibe — each mood is alive</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <MoodRoulette />
            <MoodQuiz />
            <AIMoodDetector />
          </div>
        </div>
        <div className="hide-scroll" style={{ display: 'flex', gap: 'clamp(.8rem,1.4vw,1.2rem)', overflowX: 'auto', paddingBottom: 8 }}>
          {MOODS.map((m, i) => (
            <MoodLandscapeCard
              key={m.name}
              mood={m}
              index={i}
              isHighlighted={m.name === highlightedMood}
              onClick={() => router.push('/browse')}
            />
          ))}
        </div>
      </section>

      {/* Ambient Soundscape */}
      <AmbientSoundscape />

      {/* ── Footer ── */}
      <footer style={{ position: 'relative', zIndex: 3, background: '#04020A', borderTop: '1px solid rgba(255,255,255,.055)', padding: '3rem clamp(1rem,5vw,3rem) 2.5rem', boxShadow: '0 -8px 0 rgba(0,0,0,.5),0 -10px 35px rgba(0,0,0,.45)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          <div><span className="logo" style={{ fontSize: '1.25rem', display: 'block', marginBottom: '.6rem' }}>LUMINA</span><p style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.88rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.68 }}>The dreamlike world of anime streaming.</p></div>
          {([['Genres', GCARDS.map(g => g.name)], ['Account', ['Sign In', 'Register', 'My List', 'History']], ['Support', ['Help', 'Contact', 'Privacy', 'Terms']]] as const).map(([t, ls]) => (
            <div key={String(t)}><div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', letterSpacing: '.14em', color: 'rgba(255,179,71,.6)', marginBottom: '.9rem' }}>{String(t).toUpperCase()}</div>{ls.map(l => <div key={l} style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.86rem', color: 'rgba(255,245,232,.38)', marginBottom: '.42rem', cursor: 'pointer', transition: 'color .25s' }}>{l}</div>)}</div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.055)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', letterSpacing: '.09em', color: 'rgba(255,245,232,.22)' }}>© 2025 LUMINA STREAM · ALL RIGHTS RESERVED</div>
          <div style={{ display: 'flex', gap: '1rem' }}>{['𝕏', '📘', '📸', '▶'].map(ic => <div key={ic} className="footer-icon" style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '.78rem', background: '#0C091A', boxShadow: '3px 3px 8px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.2),inset 0 1px 0 rgba(255,255,255,.04)', transition: 'all .25s' }}>{ic}</div>)}</div>
        </div>
      </footer>
    </div>
  );
}
