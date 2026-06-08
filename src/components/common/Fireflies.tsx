'use client';

import { useEffect, useRef } from 'react';

export default function Fireflies() {
  const cvs = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = cvs.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth, H = window.innerHeight, raf: number;
    c.width = W; c.height = H;

    const N = Math.min(55, Math.floor((W * H) / 26000));
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28 - 0.05,
      sz: Math.random() * 2 + 0.4,
      a: Math.random(),
      da: (Math.random() - 0.5) * 0.015,
      col: [
        'hsl(42,100%,70%)', 'hsl(270,80%,72%)',
        'hsl(185,75%,65%)', 'hsl(340,80%,72%)',
      ][Math.floor(Math.random() * 4)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy; p.a += p.da;
        if (p.a <= 0 || p.a >= 1) p.da *= -1;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2);
        ctx.fillStyle = p.col;
        ctx.globalAlpha = p.a * 0.55;
        ctx.shadowBlur = p.sz * 5;
        ctx.shadowColor = p.col;
        ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onR = () => { W = window.innerWidth; H = window.innerHeight; c.width = W; c.height = H; };
    window.addEventListener('resize', onR, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR); };
  }, []);

  return <canvas ref={cvs} style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }} />;
}
