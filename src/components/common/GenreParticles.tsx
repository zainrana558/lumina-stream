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
      /* ── Cherry Blossom Petals (Sakura) ──
         Three layers of depth for a surreal, life-like effect:
         1. Main petals (14): Realistic CSS sakura shape with 3-axis rotation
         2. Drift petals (8): Smaller, slower, wider sway — mid-depth
         3. Bokeh petals (4): Large, blurred foreground petals — depth-of-field */
      const petalColors = [
        { bg: 'radial-gradient(ellipse at 65% 35%, #ffe0e8 0%, #ffb7c5 40%, #f4a0b4 70%, #e8899e 100%)', shadow: 'rgba(255,150,170,0.25)' },
        { bg: 'radial-gradient(ellipse at 55% 40%, #fff0f3 0%, #ffc8d6 35%, #f9a8ba 65%, #e8899e 100%)', shadow: 'rgba(255,183,197,0.2)' },
        { bg: 'radial-gradient(ellipse at 70% 30%, #ffd6de 0%, #ff8fa8 45%, #e87a95 75%, #d4687e 100%)', shadow: 'rgba(255,130,160,0.3)' },
        { bg: 'radial-gradient(ellipse at 60% 35%, #ffeef2 0%, #ffc0d0 40%, #f095ad 70%, #e0809a 100%)', shadow: 'rgba(255,170,190,0.22)' },
        { bg: 'radial-gradient(ellipse at 50% 45%, #fff5f7 0%, #ffb3c6 50%, #e88da5 80%, #d07090 100%)', shadow: 'rgba(255,140,170,0.18)' },
      ];

      // Layer 1: Main falling petals (detailed, mid-speed)
      const mainCount = 14;
      for (let i = 0; i < mainCount; i++) {
        const pc = petalColors[Math.floor(r() * petalColors.length)];
        const size = 10 + r() * 12;
        const swayX = 20 + r() * 50;
        result.push({
          id: i,
          left: `${r() * 100}%`,
          top: '0',
          w: size,
          h: size * 0.72,
          background: pc.bg,
          borderRadius: '50% 0% 50% 0%',
          boxShadow: `0 0 ${4 + r() * 4}px ${pc.shadow}`,
          animation: `sakura-fall ${12 + r() * 10}s ${r() * 15}s linear infinite`,
          dur: '',
          delay: '',
          opacity: 0,
          extraStyle: {
            '--sway-x': `${swayX * (r() > 0.5 ? 1 : -1)}px`,
            '--petal-scale': `${0.7 + r() * 0.5}`,
            '--petal-op': `${0.5 + r() * 0.35}`,
          } as React.CSSProperties,
        });
      }

      // Layer 2: Drift petals (smaller, slower, wider sway — depth layer)
      const driftCount = 8;
      for (let i = 0; i < driftCount; i++) {
        const pc = petalColors[Math.floor(r() * petalColors.length)];
        const size = 6 + r() * 8;
        const swayX = 30 + r() * 60;
        result.push({
          id: 100 + i,
          left: `${r() * 100}%`,
          top: '0',
          w: size,
          h: size * 0.7,
          background: pc.bg,
          borderRadius: '50% 0% 50% 0%',
          boxShadow: `0 0 ${2 + r() * 3}px ${pc.shadow}`,
          animation: `sakura-drift ${18 + r() * 12}s ${r() * 20}s linear infinite`,
          dur: '',
          delay: '',
          opacity: 0,
          extraStyle: {
            '--sway-x': `${swayX * (r() > 0.5 ? 1 : -1)}px`,
            '--petal-scale': `${0.5 + r() * 0.4}`,
            '--petal-op': `${0.35 + r() * 0.3}`,
          } as React.CSSProperties,
        });
      }

      // Layer 3: Bokeh petals (large, blurred foreground — cinematic depth-of-field)
      const bokehCount = 4;
      for (let i = 0; i < bokehCount; i++) {
        const pc = petalColors[Math.floor(r() * petalColors.length)];
        const size = 20 + r() * 16;
        const swayX = 40 + r() * 70;
        result.push({
          id: 200 + i,
          left: `${r() * 100}%`,
          top: '0',
          w: size,
          h: size * 0.68,
          background: pc.bg,
          borderRadius: '50% 0% 50% 0%',
          animation: `sakura-bokeh ${22 + r() * 10}s ${r() * 18}s linear infinite`,
          dur: '',
          delay: '',
          opacity: 0,
          extraStyle: {
            '--sway-x': `${swayX * (r() > 0.5 ? 1 : -1)}px`,
            '--petal-scale': `${1.4 + r() * 0.8}`,
            '--petal-op': `${0.15 + r() * 0.15}`,
          } as React.CSSProperties,
        });
      }

      // Layer 4: Tiny sparkle dust (subtle magic particles)
      for (let i = 0; i < 6; i++) {
        result.push({
          id: 300 + i,
          left: `${5 + r() * 90}%`,
          top: `${10 + r() * 80}%`,
          size: 2 + r() * 2,
          color: '#FFB7C5',
          borderRadius: '50%',
          animation: `sakura-sparkle ${3 + r() * 4}s ${r() * 6}s ease-in-out infinite`,
          dur: '',
          delay: '',
          opacity: 0,
          boxShadow: `0 0 ${4 + r() * 4}px rgba(255,183,197,0.4)`,
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
