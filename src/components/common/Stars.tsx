'use client';

import { memo, useMemo } from 'react';

interface StarData {
  id: number;
  x: string;
  y: string;
  sz: number;
  delay: number;
  dur: number;
}

const Stars = memo(function Stars() {
  const stars = useMemo<StarData[]>(
    () => Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: `${(i * 4.2 + Math.sin(i * 1.7) * 9) % 100}%`,
      y: `${(i * 3.8 + 10) % 88}%`,
      sz: 1.2 + (i % 3) * 0.9,
      delay: (i * 0.45) % 6,
      dur: 2.2 + (i % 4) * 0.8,
    })),
    [],
  );

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {stars.map(s => (
        <div
          key={s.id}
          style={{
            position: 'absolute', left: s.x, top: s.y,
            width: s.sz, height: s.sz, borderRadius: '50%',
            background: 'rgba(255,218,180,.92)',
            boxShadow: '0 0 4px rgba(255,200,160,.8)',
            animation: `star-t ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
});

export default Stars;
