'use client';

import { useRouter } from 'next/navigation';
import type { GenreCard } from '@/types';
import { CS } from '@/styles/themes';

export default function GenrePortal({ genre, index }: { genre: GenreCard; index: number }) {
  const router = useRouter();
  return (
    <div className="genre-portal" onClick={() => router.push(`/genre/${genre.key}`)}
      style={{ animationDelay: `${index * 0.08}s`, border: `1px solid ${genre.tc}25` }}>
      <div className="portal-backdrop" style={{ backgroundImage: genre.col }} />
      <div className="portal-overlay" />
      <div className="portal-content">
        <div style={{ position: 'absolute', top: '18%', right: '12%', opacity: .18, animation: `float ${4 + index}s ease-in-out infinite`, fontSize: 'clamp(3rem,5vw,4.5rem)', userSelect: 'none' }}>{genre.em}</div>
        <div style={{ fontFamily: "'Cinzel Decorative',serif", fontWeight: 900, fontSize: 'clamp(1.1rem,1.8vw,1.5rem)', color: '#FFF5E8', letterSpacing: '.04em', textShadow: '0 3px 12px rgba(0,0,0,.9)', marginBottom: 4 }}>{genre.name}</div>
        <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: 'clamp(.68rem,.85vw,.78rem)', color: `${genre.tc}cc`, fontStyle: 'italic', marginBottom: 10 }}>{genre.desc}</div>
        <div className="portal-cta" style={{ borderColor: `${genre.tc}35` }}>Enter Portal <span style={{ fontSize: '.7rem' }}>→</span></div>
      </div>
    </div>
  );
}
