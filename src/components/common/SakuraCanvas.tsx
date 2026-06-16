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
      const baseWind = -(0.35 + Math.sin(t * 0.15) * 0.12);
      const gustCycle = Math.sin(t * 0.3);
      const gust = gustCycle > 0.5 ? (gustCycle - 0.5) * 5.0 : 0;
      const totalGust = -gust; // always leftward

      // ── Draw organic wind gust ribbons ──
      if (gust > 0.05) {
        const gustStrength = Math.min(gust / 2.5, 1); // 0–1 normalized
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let r = 0; r < 8; r++) {
          const seed = r * 2.39 + 0.5;
          // Each ribbon drifts across the screen leftward, looping
          const speed = 120 + r * 25;
          const xHead = ((cw + 300) - (t * speed + seed * 400) % (cw + 600));
          // Vertical center oscillates organically
          const yCenter = ch * (0.1 + r * 0.11) + Math.sin(t * 0.4 + seed) * 40;

          // Ribbon thickness varies along its length
          const ribbonLen = 250 + gustStrength * 200;
          const segments = 12;

          // Build top and bottom edges as bezier curves
          const topPts: [number, number][] = [];
          const botPts: [number, number][] = [];

          for (let s = 0; s <= segments; s++) {
            const frac = s / segments;
            // Position along ribbon (sweeps right-to-left)
            const x = xHead - frac * ribbonLen;
            // Sway: multi-frequency sinusoidal for organic undulation
            const sway1 = Math.sin(t * 1.8 + frac * 4 + seed) * (15 + gustStrength * 25);
            const sway2 = Math.sin(t * 2.7 + frac * 7 + seed * 1.3) * (6 + gustStrength * 10);
            const sway3 = Math.cos(t * 0.9 + frac * 2.5 + seed * 0.7) * (8 + gustStrength * 12);
            const totalSway = sway1 + sway2 + sway3;

            // Thickness: thickest at head, tapering to nothing at tail
            const thickness = (1 - frac * frac) * (12 + gustStrength * 22) * (0.6 + Math.sin(t * 1.2 + seed + frac * 3) * 0.4);

            topPts.push([x, yCenter + totalSway - thickness]);
            botPts.push([x, yCenter + totalSway + thickness]);
          }

          // Draw as a filled shape with smooth curves
          ctx.beginPath();
          ctx.moveTo(topPts[0][0], topPts[0][1]);
          for (let s = 1; s < topPts.length - 1; s++) {
            const xc = (topPts[s][0] + topPts[s + 1][0]) / 2;
            const yc = (topPts[s][1] + topPts[s + 1][1]) / 2;
            ctx.quadraticCurveTo(topPts[s][0], topPts[s][1], xc, yc);
          }
          ctx.lineTo(topPts[topPts.length - 1][0], topPts[topPts.length - 1][1]);

          // Bottom edge (reverse)
          for (let s = botPts.length - 1; s >= 1; s--) {
            if (s === botPts.length - 1) {
              ctx.lineTo(botPts[s][0], botPts[s][1]);
            } else {
              const xc = (botPts[s][0] + botPts[s - 1][0]) / 2;
              const yc = (botPts[s][1] + botPts[s - 1][1]) / 2;
              ctx.quadraticCurveTo(botPts[s][0], botPts[s][1], xc, yc);
            }
          }
          ctx.lineTo(botPts[0][0], botPts[0][1]);
          ctx.closePath();

          // Gradient fill along ribbon length
          const grad = ctx.createLinearGradient(xHead, yCenter, xHead - ribbonLen, yCenter);
          const baseAlpha = gustStrength * 0.035 * (0.5 + Math.sin(t * 0.6 + seed) * 0.5);
          grad.addColorStop(0, `rgba(255, 190, 210, 0)`);
          grad.addColorStop(0.15, `rgba(255, 190, 210, ${baseAlpha})`);
          grad.addColorStop(0.45, `rgba(255, 200, 220, ${baseAlpha * 1.2})`);
          grad.addColorStop(0.8, `rgba(255, 180, 200, ${baseAlpha * 0.5})`);
          grad.addColorStop(1, `rgba(255, 180, 200, 0)`);
          ctx.fillStyle = grad;
          ctx.fill();
        }
        ctx.restore();
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