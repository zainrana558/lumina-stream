'use client';

import { useMemo } from 'react';

interface GenreParticlesProps {
  genre: 'anime' | 'cartoon' | 'horror' | 'romance' | 'mystery' | 'fantasy';
}

interface Particle {
  id: number;
  left: string;
  right?: string;
  top?: string;
  bottom?: string;
  size?: number;
  w?: number;
  h?: number;
  color?: string;
  background?: string;
  border?: string;
  borderRadius?: string;
  content?: string;
  fontSize?: number;
  animation: string;
  dur: string;
  delay: string;
  opacity: number;
  boxShadow?: string;
  filter?: string;
  extraStyle?: React.CSSProperties;
}

function seed(s: number) {
  return function() {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export default function GenreParticles({ genre }: GenreParticlesProps) {
  const particles = useMemo((): Particle[] => {
    const rng = seed(
      genre.charCodeAt(0) * 10000 +
      genre.charCodeAt(1) * 100 +
      genre.charCodeAt(2)
    );
    const n = 16;
    const result: Particle[] = [];

    const r = () => rng();

    if (genre === 'anime') {
      for (let i = 0; i < n; i++) {
        const color = r() > 0.5 ? '#00FFFF' : '#FF0096';
        result.push({
          id: i, left: `${r() * 100}%`, bottom: `-${r() * 20}px`,
          size: 2 + r() * 3, color,
          animation: `particle-rise ${6 + r() * 8}s ${r() * 6}s ease-in-out infinite`,
          dur: '', delay: '', opacity: 0.15 + r() * 0.25,
          boxShadow: `0 0 ${8 + r() * 8}px ${color}55`,
          borderRadius: '50%',
          extraStyle: { '--drift': `${(r() - 0.5) * 60}px` } as React.CSSProperties,
        });
      }
    } else if (genre === 'cartoon') {
      const colors = ['#74B9FF', '#FF8B80', '#FFE66D', '#98FB98', '#DDA0DD'];
      for (let i = 0; i < n; i++) {
        const color = colors[i % colors.length];
        result.push({
          id: i, left: `${5 + r() * 90}%`, bottom: `-${r() * 20}px`,
          size: 8 + r() * 14, borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), ${color}55)`,
          border: `1px solid ${color}44`,
          animation: `particle-bubble ${7 + r() * 6}s ${r() * 5}s ease-in-out infinite`,
          dur: '', delay: '', opacity: 0.2 + r() * 0.2,
          extraStyle: { '--wobble': `${(r() - 0.5) * 40}px` } as React.CSSProperties,
        });
      }
    } else if (genre === 'horror') {
      // Blood drips
      for (let i = 0; i < 10; i++) {
        result.push({
          id: i, left: `${5 + r() * 90}%`, top: '0px',
          w: 1.5 + r() * 1.5, h: 20 + r() * 40,
          borderRadius: '0 0 50% 50%',
          background: 'linear-gradient(180deg, rgba(139,0,0,0.6), rgba(220,20,60,0.3), transparent)',
          animation: `blood-drip ${3 + r() * 3}s ${r() * 4}s ease-in infinite`,
          dur: '', delay: '', opacity: 0.12 + r() * 0.15,
        });
      }
      // Fog layers
      for (let i = 0; i < 3; i++) {
        result.push({
          id: 100 + i, left: '-5%', right: '-5%',
          top: `${50 + i * 15}%`, w: 0, h: 100,
          background: 'linear-gradient(90deg, transparent, rgba(20,10,10,0.5), transparent)',
          animation: `fog-d ${12 + i * 4}s ${i * 3}s ease-in-out infinite`,
          dur: '', delay: '', opacity: 0.04 + i * 0.02,
          extraStyle: { filter: 'blur(25px)' },
        });
      }
    } else if (genre === 'romance') {
      const hearts = ['♥', '♡', '❤', '💕', '💗'];
      for (let i = 0; i < n; i++) {
        const color = r() > 0.5 ? '#FF6B8A' : '#FF4D6D';
        result.push({
          id: i, left: `${5 + r() * 90}%`, bottom: `-${r() * 20}px`,
          content: hearts[i % hearts.length], color,
          fontSize: 10 + r() * 14,
          animation: `heart-float ${6 + r() * 6}s ${r() * 6}s ease-in-out infinite`,
          dur: '', delay: '', opacity: 0.15 + r() * 0.2,
          extraStyle: { '--sway': `${(r() - 0.5) * 50}px` } as React.CSSProperties,
        });
      }
    } else if (genre === 'mystery') {
      for (let i = 0; i < n; i++) {
        result.push({
          id: i, left: `${5 + r() * 90}%`, top: `${5 + r() * 90}%`,
          size: 3 + r() * 4, color: '#FFB347',
          borderRadius: '50%',
          animation: `sparkle-pulse ${2 + r() * 3}s ${r() * 3}s ease-in-out infinite`,
          dur: '', delay: '', opacity: 0.15 + r() * 0.3,
          boxShadow: `0 0 ${6 + r() * 6}px #FFB34755`,
        });
      }
    } else if (genre === 'fantasy') {
      const colors = ['#C39BD3', '#FFD700', '#87CEEB', '#DDA0DD', '#E6E6FA', '#ADD8E6'];
      for (let i = 0; i < 20; i++) {
        const color = colors[i % colors.length];
        result.push({
          id: i, left: `${3 + r() * 94}%`, top: `${5 + r() * 90}%`,
          size: 2.5 + r() * 4, color, borderRadius: '50%',
          animation: `sparkle-drift ${2.5 + r() * 3}s ${r() * 3}s ease-in-out infinite`,
          dur: '', delay: '', opacity: 0.12 + r() * 0.25,
          boxShadow: `0 0 ${6 + r() * 8}px ${color}55`,
          extraStyle: { '--drift': `${(r() - 0.5) * 30}px` } as React.CSSProperties,
        });
      }
    }

    return result;
  }, [genre]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            bottom: p.bottom,
            width: p.size,
            height: p.h ?? p.size,
            minWidth: p.content ? undefined : p.size,
            borderRadius: p.borderRadius,
            background: p.background,
            border: p.border,
            color: p.color,
            fontSize: p.fontSize,
            boxShadow: p.boxShadow,
            filter: p.filter,
            opacity: p.opacity,
            animation: p.animation,
            right: p.right,
            ...p.extraStyle,
          } as React.CSSProperties}
        >
          {p.content}
        </div>
      ))}
    </div>
  );
}
