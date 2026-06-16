'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   SakuraCanvas — Pure natural falling cherry blossom petals

   Kinematic motion only — no cursor interaction (handled by
   CursorAura + GSAP). Just beautiful, slow, swaying petals.
   ═══════════════════════════════════════════════════════════════════ */

interface Petal {
  x: number; y: number;
  size: number; rotation: number;
  hue: number; sat: number; lit: number; opacity: number;
  fallSpeed: number;
  swayAmp: number; swayFreq: number; swayPhase: number;
  rotSpeed: number;
}

const COLORS = [
  { h: 340, s: 95, l: 82 }, { h: 345, s: 98, l: 80 },
  { h: 335, s: 90, l: 86 }, { h: 348, s: 100, l: 78 },
  { h: 330, s: 88, l: 88 }, { h: 350, s: 96, l: 83 },
  { h: 342, s: 94, l: 85 },
];

function createPetal(w: number, h: number, tier: 'tiny' | 'medium' | 'large', spread: boolean): Petal {
  const col = COLORS[Math.floor(Math.random() * COLORS.length)];
  const sm = tier === 'tiny' ? 1.8 : tier === 'medium' ? 2.8 : 4.0;
  const sz = (3 + Math.random() * 5) * sm;
  const x = Math.random() * w;
  const y = spread ? Math.random() * h * 1.2 - h * 0.1 : -sz * 2 - Math.random() * h * 0.5;
  return {
    x, y, size: sz,
    rotation: Math.random() * Math.PI * 2,
    hue: col.h + (Math.random() - 0.5) * 8,
    sat: col.s + (Math.random() - 0.5) * 5,
    lit: col.l + (Math.random() - 0.5) * 5,
    opacity: tier === 'tiny' ? 0.35 + Math.random() * 0.3
      : 0.6 + Math.random() * 0.3,
    fallSpeed: 0.15 + Math.random() * 0.25
      + (tier === 'tiny' ? 0.05 : tier === 'large' ? -0.03 : 0),
    swayAmp: 30 + Math.random() * 55 + (tier === 'large' ? 25 : 0),
    swayFreq: 0.2 + Math.random() * 0.45,
    swayPhase: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * (tier === 'tiny' ? 1.0 : tier === 'medium' ? 1.8 : 2.5),
  };
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  const hs = p.size * 0.5;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = p.opacity;

  ctx.beginPath();
  ctx.moveTo(0, -hs);
  ctx.bezierCurveTo(hs * 0.8, -hs * 0.6, hs, hs * 0.2, 0, hs);
  ctx.bezierCurveTo(-hs, hs * 0.2, -hs * 0.8, -hs * 0.6, 0, -hs);
  ctx.closePath();

  const g = ctx.createLinearGradient(0, -hs, 0, hs);
  g.addColorStop(0, `hsla(${p.hue}, ${Math.min(100, p.sat - 30)}%, ${Math.min(97, p.lit + 12)}%, 1)`);
  g.addColorStop(0.4, `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, 1)`);
  g.addColorStop(1, `hsla(${p.hue - 5}, ${Math.min(100, p.sat + 10)}%, ${Math.max(50, p.lit - 15)}%, 1)`);
  ctx.fillStyle = g;
  ctx.fill();

  if (p.size > 10) {
    ctx.beginPath();
    ctx.moveTo(0, -hs * 0.6);
    ctx.quadraticCurveTo(hs * 0.05, 0, 0, hs * 0.7);
    ctx.strokeStyle = `hsla(${p.hue}, ${p.sat}%, ${Math.max(40, p.lit - 25)}%, ${p.opacity * 0.3})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  ctx.restore();
}

export default function SakuraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const w = window.innerWidth, h = window.innerHeight;
    const petals: Petal[] = [];
    for (let i = 0; i < 150; i++) petals.push(createPetal(w, h, 'tiny', true));
    for (let i = 0; i < 65; i++) petals.push(createPetal(w, h, 'medium', true));

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50) / 16.667;
      lastTime = now;
      timeRef.current += 0.016 * dt;
      const t = timeRef.current;
      const cw = window.innerWidth, ch = window.innerHeight;

      ctx.clearRect(0, 0, cw, ch);

      // ── Wind system ──
      // Base wind: steady leftward drift
      const baseWind = -(0.35 + Math.sin(t * 0.15) * 0.12);
      // Gust: periodic bursts (peaks every ~21s, lasts ~4s)
      const gustCycle = Math.sin(t * 0.3);
      const gust = gustCycle > 0.5 ? (gustCycle - 0.5) * 5.0 : 0;
      const gustDir = -(baseWind > 0 ? 1 : -1); // gust always in wind direction
      const totalGust = gust * gustDir;

      // ── Draw gust visual streaks ──
      if (gust > 0.1) {
        const gustAlpha = Math.min((gust - 0.1) * 0.12, 0.06);
        // Multiple horizontal streaks sweeping left
        for (let g = 0; g < 5; g++) {
          const yBase = (t * 40 + g * ch / 5) % (ch + 200) - 100;
          const xOff = Math.sin(t * 0.8 + g * 1.7) * 60;
          const streakLen = 200 + gust * 150;
          const grad = ctx.createLinearGradient(cw - xOff, yBase, cw - xOff - streakLen, yBase);
          grad.addColorStop(0, `rgba(255, 180, 200, 0)`);
          grad.addColorStop(0.3, `rgba(255, 180, 200, ${gustAlpha})`);
          grad.addColorStop(0.7, `rgba(255, 180, 200, ${gustAlpha * 0.7})`);
          grad.addColorStop(1, `rgba(255, 180, 200, 0)`);
          ctx.beginPath();
          ctx.moveTo(cw - xOff, yBase - 25 - gust * 15);
          ctx.lineTo(cw - xOff - streakLen, yBase - 10);
          ctx.lineTo(cw - xOff - streakLen, yBase + 10);
          ctx.lineTo(cw - xOff, yBase + 25 + gust * 15);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      // ── Petals ──
      for (const p of petals) {
        // Per-petal drift (always leftward, slight wobble)
        const drift = baseWind + totalGust + Math.sin(t * p.swayFreq + p.swayPhase) * 0.06;
        p.x += drift * p.swayAmp * 0.006 * dt;
        p.y += (p.fallSpeed + Math.abs(totalGust) * 0.12) * dt;
        p.rotation += (p.rotSpeed * 0.015 + totalGust * 0.3) * dt;

        if (p.y > ch + p.size * 2) {
          p.y = -p.size * 2 - Math.random() * 60;
          p.x = Math.random() * cw;
          p.swayPhase = Math.random() * Math.PI * 2;
        }
        if (p.x < -100) p.x = cw + 80;
        if (p.x > cw + 100) p.x = -80;

        drawPetal(ctx, p);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }} />
  );
}