'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { MediaItem } from '@/types';
import { CS } from '@/styles/themes';
import { getBackdropUrl, getPosterUrl } from '@/lib/images';
import MediaCard from './MediaCard';

export default function HeroCarousel({ items }: { items: MediaItem[] }) {
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const bgRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (items.length === 0 || paused) return;
    const t = setInterval(() => { setIdx(i => (i + 1) % items.length); setTick(k => k + 1); }, 7000);
    return () => clearInterval(t);
  }, [items.length, paused]);

  useEffect(() => {
    let raf = 0;
    const fn = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!bgRef.current) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 10;
        bgRef.current.style.transform = `translate(${x}px,${y}px) scale(1.07)`;
      });
    };
    window.addEventListener('mousemove', fn as EventListener);
    return () => window.removeEventListener('mousemove', fn as EventListener);
  }, []);

  if (items.length === 0) return <section style={{ height: '100vh' }} />;

  const F = items[idx];
  const s = CS[Math.abs(F.cs) % CS.length];
  const backdrop = getBackdropUrl(F.backdrop_path, 'w1280');

  return (
    <section style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} tabIndex={0}
      role="region" aria-label="Featured carousel"
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') { setIdx(i => (i - 1 + items.length) % items.length); setTick(k => k + 1); } if (e.key === 'ArrowRight') { setIdx(i => (i + 1) % items.length); setTick(k => k + 1); } }}>

      <div ref={bgRef} key={`bg-${idx}`} style={{
        position: 'absolute', inset: '-6%',
        background: backdrop ? `url(${backdrop}) center/cover no-repeat` : s.bg,
        transition: 'transform .3s ease', zIndex: 0, animation: 'hero-swap .7s ease both',
      }}>
        {backdrop && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(7,4,15,.85) 0%,rgba(7,4,15,.6) 40%,rgba(7,4,15,.75) 100%)' }} />}
        <div style={{ position: 'absolute', top: '16%', left: '55%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle,${s.acc}28 0%,transparent 68%)`, filter: 'blur(50px)', animation: 'aurora 11s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '22%', right: '16%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,120,255,.22) 0%,transparent 68%)', filter: 'blur(52px)', animation: 'aurora 15s ease-in-out infinite reverse' }} />
        {!backdrop && <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(9rem,17vw,19rem)', opacity: .04, animation: 'float 8s ease-in-out infinite' }}>{s.em}</div>}
      </div>

      <div className="hero-mask" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', zIndex: 2 }} />

      <div key={`txt-${tick}`} style={{ position: 'relative', zIndex: 3, padding: '0 clamp(1rem,5vw,4rem)', maxWidth: 'clamp(280px,50vw,720px)' }}>
        <div className="s1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 20, marginBottom: '1.3rem', background: '#0D0A1E', boxShadow: '4px 4px 12px rgba(0,0,0,.7),0 0 0 1px rgba(255,179,71,.28)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF4444', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: '.64rem', letterSpacing: '.15em', color: 'rgba(255,179,71,.9)' }}>FEATURED</span>
        </div>
        <h1 className="h1 s2" style={{ fontSize: 'clamp(2.2rem,5.5vw,5.2rem)', marginBottom: '.85rem' }}>{F.title}</h1>
        <p className="s3" style={{ fontFamily: "'Cinzel',serif", fontSize: 'clamp(.73rem,.98vw,.88rem)', letterSpacing: '.06em', color: 'rgba(255,245,232,.52)', marginBottom: '.72rem' }}>{F.sub || F.genre[0]}</p>
        <p className="s4" style={{ fontFamily: "'Crimson Pro',serif", fontSize: 'clamp(.9rem,1.2vw,1.05rem)', lineHeight: 1.78, color: 'rgba(255,245,232,.68)', maxWidth: 530, marginBottom: '1.4rem' }}>{F.desc.slice(0, 150)}…</p>
        <div className="s4" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.8rem' }}>
          <div className="badge-r">⭐ {F.r}</div>
          {F.genre.slice(0, 2).map(g => <span key={g} className="gtag">{g}</span>)}
          <span style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.38)', alignSelf: 'center', fontFamily: "'Cinzel',serif" }}>{F.yr}</span>
        </div>
        <div className="s5" style={{ display: 'flex', gap: '.85rem', flexWrap: 'wrap' }}>
          <button className="btn-p" onClick={() => router.push(`/details/${F.id}`)}>▶ Play Now</button>
          <button className="btn-g" onClick={() => router.push(`/details/${F.id}`)}>ℹ More Info</button>
        </div>
      </div>

      <div style={{ position: 'absolute', right: 'clamp(2rem,6vw,7%)', top: '50%', transform: 'translateY(-50%)', width: 'clamp(175px,17vw,245px)', zIndex: 3, animation: 'float2 7s ease-in-out infinite' }}>
        <MediaCard item={F} size="lg" />
      </div>

      <div style={{ position: 'absolute', bottom: '11%', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 4 }}>
        {items.map((_, i) => (
          <div key={i} onClick={() => { setIdx(i); setTick(k => k + 1); }} style={{
            width: i === idx ? 26 : 8, height: 8, borderRadius: 4,
            background: i === idx ? s.acc : 'rgba(255,255,255,.2)',
            cursor: 'pointer', transition: 'all .42s cubic-bezier(.34,1.56,.64,1)',
            boxShadow: i === idx ? `0 0 14px ${s.acc}90` : '',
          }} role="button" aria-label={`Slide ${i + 1}`} />
        ))}
      </div>
    </section>
  );
}
