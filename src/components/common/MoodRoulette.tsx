'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const DESTINATIONS = [
  { name: 'Melancholy', type: 'mood' as const },
  { name: 'Pumped', type: 'mood' as const },
  { name: 'Romantic', type: 'mood' as const },
  { name: 'Thrilling', type: 'mood' as const },
  { name: 'Chill', type: 'mood' as const },
  { name: 'Epic', type: 'mood' as const },
  { name: 'Horror', type: 'genre' as const, slug: 'horror' },
  { name: 'Anime', type: 'genre' as const, slug: 'anime' },
  { name: 'Fantasy', type: 'genre' as const, slug: 'fantasy' },
  { name: 'Mystery', type: 'genre' as const, slug: 'mystery' },
  { name: 'Romance', type: 'genre' as const, slug: 'romance' },
  { name: 'Cartoons', type: 'genre' as const, slug: 'cartoon' },
];

const RESULT_COLORS: Record<string, string> = {
  Melancholy: '#8B78FF', Pumped: '#FFB347', Romantic: '#FF6B8A', Thrilling: '#FF4A4A',
  Chill: '#78D621', Epic: '#FF8C00', Horror: '#DC143C', Anime: '#FF0096',
  Fantasy: '#C39BD3', Mystery: '#FFB347', Romance: '#FF6B8A', Cartoons: '#74B9FF',
};

export default function MoodRoulette() {
  const [spinning, setSpinning] = useState(false);
  const [displayName, setDisplayName] = useState('Feeling Lucky?');
  const [glowColor, setGlowColor] = useState('#FFB347');
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);

    const targetIdx = Math.floor(Math.random() * DESTINATIONS.length);
    const totalSteps = 20 + Math.floor(Math.random() * 10); // 20-30 steps
    let step = 0;

    const tick = () => {
      const currentIdx = step % DESTINATIONS.length;
      const dest = DESTINATIONS[currentIdx];
      setDisplayName(dest.name);
      step++;

      if (step < totalSteps) {
        // Slow down gradually: 50ms → 250ms
        const progress = step / totalSteps;
        const delay = 50 + Math.pow(progress, 2.5) * 200;
        intervalRef.current = setTimeout(tick, delay);
      } else {
        // Landed on result
        const final = DESTINATIONS[targetIdx];
        setDisplayName(final.name);
        setGlowColor(RESULT_COLORS[final.name] || '#FFB347');

        // Navigate after showing result
        timeoutRef.current = setTimeout(() => {
          if (final.type === 'genre' && final.slug) {
            router.push(`/genre/${final.slug}`);
          } else {
            router.push(`/browse?mood=${final.name.toLowerCase()}`);
          }
        }, 900);
      }
    };

    tick();
  }, [spinning, router]);

  // Cleanup on unmount
  if (typeof window !== 'undefined') {
    // This is fine for cleanup in the return
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <button
        onClick={spin}
        disabled={spinning}
        style={{
          position: 'relative',
          padding: 'clamp(12px,1.5vw,16px) clamp(24px,3vw,40px)',
          borderRadius: 16,
          border: `1px solid ${glowColor}44`,
          background: 'linear-gradient(135deg, #0D0A1E 0%, #18063A 100%)',
          boxShadow: `4px 4px 14px rgba(0,0,0,.7), -2px -2px 6px rgba(45,25,90,.25), 0 0 ${spinning ? '30' : '12'}px ${glowColor}${spinning ? '40' : '15'}, inset 0 1px 0 rgba(255,255,255,.06)`,
          cursor: spinning ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          transition: `all .3s ease, box-shadow .3s ease`,
          opacity: spinning ? 0.85 : 1,
          overflow: 'hidden',
        }}
      >
        {/* Shimmer overlay when spinning */}
        {spinning && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(90deg, transparent 0%, ${glowColor}15 50%, transparent 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 0.8s linear infinite',
          }} />
        )}
        <span className="f-cinzel" style={{
          fontSize: spinning ? '1.4rem' : '1.2rem',
          animation: spinning ? 'spin 0.4s linear infinite' : 'none',
          position: 'relative', zIndex: 1,
          filter: `drop-shadow(0 0 8px ${glowColor}60)`,
          
          fontWeight: 700,
        }}>
          {spinning ? displayName[0] : '?'}
        </span>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span className="f-cinzel" style={{
            
            fontSize: spinning ? 'clamp(.65rem,.85vw,.78rem)' : 'clamp(.55rem,.72vw,.65rem)',
            letterSpacing: spinning ? '.02em' : '.14em',
            color: spinning ? glowColor : 'rgba(255,179,71,.5)',
            textTransform: 'uppercase',
            fontWeight: 600,
            transition: 'all .2s',
          }}>
            {spinning ? 'Vibe Check' : 'Random Vibe'}
          </span>
          <span className="f-crimson" style={{
            
            fontSize: 'clamp(.72rem,.88vw,.82rem)',
            color: '#FFF5E8',
            fontWeight: 600,
            fontStyle: 'italic',
            lineHeight: 1.2,
            minWidth: 80,
            transition: 'all .15s',
          }}>
            {displayName}
          </span>
        </div>
      </button>
    </div>
  );
}
