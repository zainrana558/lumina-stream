'use client';

import { memo, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { MediaItem } from '@/types';
import { CS } from '@/styles/themes';
import { getPosterUrl, getBlurPlaceholder } from '@/lib/images';

const MediaCard = memo(function MediaCard({ item, size = 'md' }: { item: MediaItem; size?: 'sm' | 'md' | 'lg' }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);
  const router = useRouter();
  const s = CS[Math.abs(item.cs) % CS.length];
  const h = { sm: 200, md: 296, lg: 370 }[size];
  const posterSrc = getPosterUrl(item.poster_path);

  const onMove = useCallback((e: React.MouseEvent) => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(750px) rotateY(${x * 12}deg) rotateX(${y * -12}deg) scale3d(1.04,1.04,1.04)`;
      const sh = el.querySelector('.cshine');
      if (sh) { (sh as HTMLElement).style.opacity = '1'; (sh as HTMLElement).style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%,rgba(255,255,255,.14) 0%,transparent 55%)`; }
    });
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) { el.style.transform = ''; const sh = el.querySelector('.cshine'); if (sh) (sh as HTMLElement).style.opacity = '0'; }
  }, []);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  return (
    <div ref={ref} className="card" style={{ height: h }} onMouseMove={onMove} onMouseLeave={onLeave}
      onClick={() => router.push(`/details/${item.id}`)} role="button" tabIndex={0} aria-label={`${item.title} details`}>
      <div className="cring" />
      <div style={{ position: 'relative', height: '100%', borderRadius: 'inherit', overflow: 'hidden', background: s.bg }}>
        {posterSrc ? (
          <>
            <Image src={posterSrc} alt={item.title} fill sizes="(max-width:768px) 50vw, 20vw" loading="lazy" unoptimized
              placeholder="blur" blurDataURL={getBlurPlaceholder(item.cs)} style={{ objectFit: 'cover', zIndex: 0 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.75) 0%,rgba(0,0,0,.2) 50%,transparent 100%)', zIndex: 1 }} />
          </>
        ) : (
          <>
            <div style={{ position: 'absolute', top: '15%', right: '-8%', width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle,${s.acc}55 0%,transparent 68%)`, filter: 'blur(20px)', animation: 'aurora 8s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', bottom: '40%', right: '10%', fontSize: size === 'lg' ? '3.8rem' : '2.2rem', opacity: .09, animation: `float ${3.2 + item.id * 0.4}s ease-in-out infinite` }}>{s.em}</div>
          </>
        )}
        <div className="cshine" />
        <div style={{ position: 'absolute', top: 9, left: 9, zIndex: 5, padding: '3px 9px', background: posterSrc ? 'rgba(0,0,0,.65)' : s.base, borderRadius: 20, fontSize: '.58rem', fontFamily: "'Cinzel',serif", color: s.acc, letterSpacing: '.04em', boxShadow: `0 0 0 1px ${s.acc}40` }}>{item.tag}</div>
        <div className="badge-r" style={{ position: 'absolute', top: 9, right: 9, zIndex: 5 }}>⭐ {item.r}</div>
        <div className="cinfo">
          <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: size === 'sm' ? '.75rem' : '.9rem', color: '#FFF5E8', marginBottom: 2, textShadow: '0 2px 8px rgba(0,0,0,.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
          {size !== 'sm' && <div style={{ fontSize: '.66rem', color: 'rgba(255,245,232,.45)' }}>{item.genre.slice(0, 2).join(' · ')}</div>}
        </div>
      </div>
    </div>
  );
});

export default MediaCard;
