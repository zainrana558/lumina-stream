'use client';

import { memo, useMemo } from 'react';

interface PetalData {
  id: number;
  left: string;
  sz: string;
  color: string;
  dur: string;
  delay: string;
  dx: string;
  shape: string;
  anim: string;
  opacity: number;
}

const Blossoms = memo(function Blossoms() {
  const petals = useMemo<PetalData[]>(() => {
    const shapes = ['50% 50% 50% 0', '50% 0 50% 50%', '50%', '40% 60% 60% 40%', '50% 50% 0 50%', '30% 70% 70% 30%'];
    const anims = ['pa', 'pb', 'pc'];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${((i * 3.5) + Math.sin(i * 1.2) * 8 + 1) % 100}%`,
      sz: `${4 + (i % 6) * 2.5}px`,
      color: `hsl(${318 + (i % 8) * 7},72%,${64 + (i % 5) * 5}%)`,
      dur: `${8 + (i % 8) * 1.6}s`,
      delay: `${(i * 0.5) % 9}s`,
      dx: `${((i % 3) - 1) * (35 + (i % 65))}px`,
      shape: shapes[i % 6],
      anim: anims[i % 3],
      opacity: 0.5 + (i % 4) * 0.1,
    }));
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'hidden' }}>
      {petals.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute', left: p.left, top: 0,
            width: p.sz, height: p.sz, background: p.color,
            borderRadius: p.shape, opacity: p.opacity,
            '--dx': p.dx, animation: `${p.anim} ${p.dur} linear ${p.delay} infinite`,
            boxShadow: `0 0 4px ${p.color}88`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
});

export default Blossoms;
