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
  // Multi-layer sway — 3 independent oscillators per petal
  swayAmp1: number; swayFreq1: number; swayPhase1: number;
  swayAmp2: number; swayFreq2: number; swayPhase2: number;
  swayAmp3: number; swayFreq3: number; swayPhase3: number;
  // Fall pattern
  fallOscAmp: number;  // vertical bobbing amplitude
  fallOscFreq: number; // vertical bobbing frequency
  fallOscPhase: number;
  // Rotation
  rotSpeed: number;
  rotOscAmp: number;  // rotation speed oscillation
  rotOscFreq: number;
  rotOscPhase: number;
  // Per-petal gust response (velocity-based physics)
  gustDelay: number;
  gustCatch: number;
  flutterFreq: number;
  flutterPhase: number;
  gustExposure: number;  // smoothed 0-1 how much gust is touching this petal
  gustVelX: number;      // horizontal velocity from gust (accumulates, decays via drag)
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
  const rand = Math.random;
  const amp = tier === 'tiny' ? 0.7 : tier === 'medium' ? 1.0 : 1.4;
  return {
    x, y, size: sz,
    rotation: rand() * Math.PI * 2,
    hue: col.h + (rand() - 0.5) * 8,
    sat: col.s + (rand() - 0.5) * 5,
    lit: col.l + (rand() - 0.5) * 5,
    opacity: tier === 'tiny' ? 0.35 + rand() * 0.3 : 0.6 + rand() * 0.3,
    fallSpeed: 0.12 + rand() * 0.3 + (tier === 'tiny' ? 0.04 : 0),
    // Layer 1: slow broad sweep
    swayAmp1: (20 + rand() * 40) * amp,
    swayFreq1: 0.12 + rand() * 0.25,
    swayPhase1: rand() * Math.PI * 2,
    // Layer 2: medium undulation
    swayAmp2: (8 + rand() * 20) * amp,
    swayFreq2: 0.4 + rand() * 0.8,
    swayPhase2: rand() * Math.PI * 2,
    // Layer 3: quick flutter
    swayAmp3: (3 + rand() * 8) * amp,
    swayFreq3: 1.5 + rand() * 2.5,
    swayPhase3: rand() * Math.PI * 2,
    // Vertical bobbing (some petals float, some dive)
    fallOscAmp: rand() * 0.12,
    fallOscFreq: 0.3 + rand() * 0.6,
    fallOscPhase: rand() * Math.PI * 2,
    // Rotation with speed variation
    rotSpeed: (rand() - 0.5) * (tier === 'tiny' ? 1.2 : 2.2),
    rotOscAmp: rand() * 0.8,
    rotOscFreq: 0.2 + rand() * 0.5,
    rotOscPhase: rand() * Math.PI * 2,
    // Gust response
    gustDelay: 0.2 + rand() * 0.8,
    gustCatch: 0.3 + rand() * 0.7 + (tier === 'tiny' ? 0.3 : 0),
    flutterFreq: 2.5 + rand() * 5,
    flutterPhase: rand() * Math.PI * 2,
    gustExposure: 0,
    gustVelX: 0,
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
    for (let i = 0; i < 50; i++) petals.push(createPetal(w, h, 'tiny', true));
    for (let i = 0; i < 100; i++) petals.push(createPetal(w, h, 'medium', true));

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50) / 16.667;
      lastTime = now;
      timeRef.current += 0.016 * dt;
      const t = timeRef.current;
      const cw = window.innerWidth, ch = window.innerHeight;

      ctx.clearRect(0, 0, cw, ch);

      // ── Wind system ──
      const baseWind = -(0.18 + Math.sin(t * 0.15) * 0.06);
      // Smooth gust cycle — soft ramp, no hard on/off threshold
      const gustCycle = Math.sin(t * 0.3);
      const gust = Math.max(0, (gustCycle - 0.15)) * 3.2;

      // ── Compute ribbon centerlines (used for both drawing & petal hit-test) ──
      interface RibbonCenter { yCenter: number; pts: { x: number; y: number; thickness: number }[] }
      const ribbons: RibbonCenter[] = [];

      if (gust > 0.05) {
        const gustStrength = Math.min(gust / 2.5, 1);

        for (let r = 0; r < 5; r++) {
          const seed = r * 2.39 + 0.5;
          const speed = 140 + r * 30;
          const xHead = ((cw + 400) - (t * speed + seed * 500) % (cw + 800));
          const yCenter = ch * (0.08 + r * 0.18) + Math.sin(t * 0.4 + seed) * 50;
          const ribbonLen = 350 + gustStrength * 300;
          const segments = 10;

          const centerPts: { x: number; y: number; thickness: number }[] = [];
          const topPts: [number, number][] = [];
          const botPts: [number, number][] = [];

          for (let s = 0; s <= segments; s++) {
            const frac = s / segments;
            const x = xHead - frac * ribbonLen;
            const sway1 = Math.sin(t * 1.8 + frac * 4 + seed) * (15 + gustStrength * 25);
            const sway2 = Math.sin(t * 2.7 + frac * 7 + seed * 1.3) * (6 + gustStrength * 10);
            const sway3 = Math.cos(t * 0.9 + frac * 2.5 + seed * 0.7) * (8 + gustStrength * 12);
            const totalSway = sway1 + sway2 + sway3;
            const taper = Math.pow(1 - frac, 2.5);
            const baseThickness = 25 + gustStrength * 45;
            const thickness = taper * baseThickness * (0.7 + Math.sin(t * 1.2 + seed + frac * 3) * 0.3);
            const cy = yCenter + totalSway;

            centerPts.push({ x, y: cy, thickness });
            topPts.push([x, cy - thickness]);
            botPts.push([x, cy + thickness]);
          }

          ribbons.push({ yCenter, pts: centerPts });

          // ── Draw ribbon ──
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';

          ctx.beginPath();
          ctx.moveTo(topPts[0][0], topPts[0][1]);
          for (let s = 1; s < topPts.length - 1; s++) {
            const xc = (topPts[s][0] + topPts[s + 1][0]) / 2;
            const yc = (topPts[s][1] + topPts[s + 1][1]) / 2;
            ctx.quadraticCurveTo(topPts[s][0], topPts[s][1], xc, yc);
          }
          ctx.lineTo(topPts[topPts.length - 1][0], topPts[topPts.length - 1][1]);

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

          const grad = ctx.createLinearGradient(xHead, yCenter, xHead - ribbonLen, yCenter);
          const baseAlpha = gustStrength * 0.08 * (0.6 + Math.sin(t * 0.6 + seed) * 0.4);
          grad.addColorStop(0, `rgba(255, 195, 215, 0)`);
          grad.addColorStop(0.08, `rgba(255, 200, 220, ${baseAlpha * 1.3})`);
          grad.addColorStop(0.3, `rgba(255, 205, 225, ${baseAlpha})`);
          grad.addColorStop(0.6, `rgba(255, 190, 210, ${baseAlpha * 0.4})`);
          grad.addColorStop(1, `rgba(255, 185, 205, 0)`);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }
      }

      // ── Helper: how much gust hits a petal (0 = none, 1 = full) ──
      const getPetalGustHit = (px: number, py: number): number => {
        if (ribbons.length === 0) return 0;
        let maxHit = 0;
        for (const ribbon of ribbons) {
          for (const pt of ribbon.pts) {
            const dx = px - pt.x;
            const dy = py - pt.y;
            // Distance from ribbon centerline, normalized by thickness
            const dist = Math.sqrt(dx * dx + dy * dy);
            const hitRadius = pt.thickness * 0.85;
            // Smooth bell-curve falloff — no hard edge
            const norm = dist / hitRadius;
            if (norm < 1.5) {
              const hit = Math.exp(-norm * norm * 2.5);
              if (hit > maxHit) maxHit = hit;
            }
          }
        }
        return maxHit;
      };

      // ── Petals ──
      for (const p of petals) {
        // Spatial hit test against ribbon centerlines
        const rawHit = getPetalGustHit(p.x, p.y);

        // Temporal smoothing: fast pickup, slow release — prevents flicker
        const upRate = 0.06 / (0.4 + p.gustDelay);
        const downRate = 0.018;
        const expRate = rawHit > p.gustExposure ? upRate : downRate;
        p.gustExposure += (rawHit - p.gustExposure) * expRate * dt;
        p.gustExposure = Math.max(0, Math.min(1, p.gustExposure));

        // Wind acceleration from gust (proportional to exposure × gust strength)
        const gustAccel = gust * p.gustExposure * p.gustCatch * 0.18;
        // Apply as force to velocity — this is real physics: F = ma
        p.gustVelX -= gustAccel * dt;
        // Aerodynamic drag: velocity decays toward zero (light petals = high drag)
        const drag = Math.pow(0.978, dt);
        p.gustVelX *= drag;

        // 3 independent sway layers — each petal has unique combination
        const sway1 = Math.sin(t * p.swayFreq1 + p.swayPhase1) * p.swayAmp1 * 0.003;
        const sway2 = Math.sin(t * p.swayFreq2 + p.swayPhase2) * p.swayAmp2 * 0.002;
        const sway3 = Math.cos(t * p.swayFreq3 + p.swayPhase3) * p.swayAmp3 * 0.001;

        // Gust flutter (only if exposed to gust)
        const flutterAmp = 0.015 + p.gustExposure * gust * 0.12;
        const flutter = Math.sin(t * p.flutterFreq + p.flutterPhase) * flutterAmp;

        p.x += (baseWind + sway1 + sway2 + sway3 + p.gustVelX + flutter) * dt;

        // Fall with vertical bobbing — gust push only if exposed
        const fallMod = 1 + Math.sin(t * p.fallOscFreq + p.fallOscPhase) * p.fallOscAmp;
        p.y += (p.fallSpeed * fallMod + p.gustExposure * gust * 0.015) * dt;

        // Rotation with oscillating speed
        const rotMod = 1 + Math.sin(t * p.rotOscFreq + p.rotOscPhase) * p.rotOscAmp;
        p.rotation += p.rotSpeed * 0.015 * rotMod * dt;

        if (p.y > ch + p.size * 2) {
          p.y = -p.size * 2 - Math.random() * 60;
          p.x = Math.random() * cw;
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