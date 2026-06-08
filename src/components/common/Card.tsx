'use client';

import { memo, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { MediaItem } from '@/types';
import { CS } from '@/styles/themes';
import { vibrateTap } from '@/lib/haptics';
import { getPosterUrl, getBlurPlaceholder } from '@/lib/images';

interface CardProps {
  show: MediaItem;
  onClick?: (show: MediaItem, rect?: DOMRect) => void;
  sz?: 'sm' | 'md' | 'lg';
  rank?: number;
  ring?: string;
}

const Card = memo(function Card({ show, onClick, sz = 'md', rank, ring = '' }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | undefined>(undefined);
  const router = useRouter();
  const s = CS[show.cs];
  const h = { sm: 200, md: 296, lg: 370 }[sz];
  // Support both TMDB poster paths and AniList full cover URLs
  const posterSrc = getPosterUrl(show);
  const hasPoster = !!posterSrc;

  const onMove = useCallback((e: React.MouseEvent) => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = undefined;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(750px) rotateY(${x * 15}deg) rotateX(${y * -15}deg) scale3d(1.04,1.04,1.04)`;
      const sh = el.querySelector('.cshine');
      if (sh) {
        (sh as HTMLElement).style.opacity = '1';
        (sh as HTMLElement).style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%,rgba(255,255,255,.14) 0%,transparent 55%)`;
      }
    });
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.transform = 'perspective(750px) rotateY(0) rotateX(0) scale3d(1,1,1)';
      const sh = el.querySelector('.cshine');
      if (sh) (sh as HTMLElement).style.opacity = '0';
    }
  }, []);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  return (
    <div ref={ref} className="card" style={{ height: h }} onMouseMove={onMove} onMouseLeave={onLeave} onClick={() => {
      vibrateTap();
      if (onClick) {
        const rect = ref.current?.getBoundingClientRect();
        onClick(show, rect);
      } else {
        router.push(`/details/${show.id}`);
      }
    }}>
      <div className="cring" style={ring ? { background: ring } : {}} />
      <div style={{ position: 'relative', height: '100%', borderRadius: 'inherit', overflow: 'hidden', background: s.bg }}>
        {/* TMDB poster image */}
        {hasPoster && posterSrc && (
          <>
            <Image
              src={posterSrc}
              alt={show.title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              loading="lazy"
              placeholder="blur"
              blurDataURL={getBlurPlaceholder(show.cs)}
              style={{
                objectFit: 'cover',
                zIndex: 0,
              }}
            />
            {/* Dark overlay for text readability */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.3) 50%, rgba(0,0,0,.1) 100%)',
              zIndex: 1,
            }} />
          </>
        )}
        <div className="cshine" style={{ zIndex: hasPoster ? 3 : undefined }} />
        {!hasPoster && (
          <div style={{
            position: 'absolute', top: '15%', right: '-8%', width: 155, height: 155,
            borderRadius: '50%',
            background: `radial-gradient(circle,${s.acc}55 0%,transparent 68%)`,
            filter: 'blur(20px)', animation: 'orb-m 8s ease-in-out infinite',
          }} />
        )}
        {rank && (
          <div style={{
            position: 'absolute', left: -6, top: '50%', transform: 'translateY(-50%)',
            fontFamily: "'Cinzel Decorative',serif", fontWeight: 900,
            fontSize: 'clamp(3.5rem,7vw,6.5rem)', color: `${s.acc}1A`,
            lineHeight: 1, zIndex: 0, userSelect: 'none', animation: 'rank-in .5s ease both',
          }}>{rank}</div>
        )}
        {!hasPoster && (
          <div style={{
            position: 'absolute', bottom: '40%', right: '10%',
            fontSize: sz === 'lg' ? '3.8rem' : '2.2rem', opacity: 0.09,
            filter: 'blur(2px)', animation: `float ${3.2 + show.id * 0.4}s ease-in-out infinite`,
            userSelect: 'none',
          }}>{s.em}</div>
        )}
        <div style={{
          position: 'absolute', top: 9, left: 9, zIndex: 5,
          padding: '3px 9px', background: hasPoster ? 'rgba(0,0,0,.65)' : CS[show.cs].base, borderRadius: 20,
          fontSize: '.6rem', fontFamily: "'Cinzel',serif", color: s.acc, letterSpacing: '.04em',
          boxShadow: `3px 3px 9px rgba(0,0,0,.7),-1px -1px 3px rgba(45,25,90,.2),inset 0 1px 0 rgba(255,255,255,.05),0 0 0 1px ${s.acc}40`,
        }}>{show.tag}</div>
        <div className="badge-r" style={{ position: 'absolute', top: 9, right: 9, zIndex: 5 }}>⭐ {show.r}</div>
        {show.progress > 0 && show.progress < 100 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 6 }}>
            <div className="prog-bar" style={{ borderRadius: 0, height: 3 }}>
              <div className="prog-fill" style={{ width: `${show.progress}%` }} />
            </div>
          </div>
        )}
        <div className="cinfo" style={{ zIndex: hasPoster ? 3 : undefined }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: sz === 'sm' ? '.78' : '.92rem', color: '#FFF5E8', marginBottom: 3, textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>{show.title}</div>
          {sz !== 'sm' && <div style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.48)' }}>{show.genre.slice(0, 2).join(' · ')} · {show.eps} eps</div>}
        </div>
      </div>
    </div>
  );
});

export default Card;
