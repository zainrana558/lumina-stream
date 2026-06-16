'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   SakuraCanvas — Natural falling cherry blossom petals with depth

   3 depth layers (far / mid / near) for parallax illusion.
   Per-petal gust amplification + turbulence for organic wind response.
   Spatially-optimized hit detection with ribbon bounding boxes.
   Pre-rendered petal sprites for GPU-friendly drawImage.
   ═══════════════════════════════════════════════════════════════════ */

// ── Depth constants ──
const DEPTH_FAR = 0;
const DEPTH_MID = 1;
const DEPTH_NEAR = 2;

interface Petal {
  x: number; y: number;
  size: number; rotation: number;
  hue: number; sat: number; lit: number; opacity: number;
  fallSpeed: number;
  depth: number;  // 0=far, 1=mid, 2=near
  spriteIdx: number; // index into pre-rendered sprite array
  // Multi-layer sway — 3 independent oscillators per petal
  swayAmp1: number; swayFreq1: number; swayPhase1: number;
  swayAmp2: number; swayFreq2: number; swayPhase2: number;
  swayAmp3: number; swayFreq3: number; swayPhase3: number;
  // Fall pattern
  fallOscAmp: number;
  fallOscFreq: number;
  fallOscPhase: number;
  // Rotation
  rotSpeed: number;
  rotOscAmp: number;
  rotOscFreq: number;
  rotOscPhase: number;
  // Per-petal gust response (velocity-based physics)
  gustDelay: number;
  gustCatch: number;
  flutterFreq: number;
  flutterPhase: number;
  gustExposure: number;
  gustVelX: number;
  turbPhase1: number;
  turbPhase2: number;
  turbFreq1: number;
  turbFreq2: number;
  windVar: number;
}

const COLORS = [
  { h: 340, s: 95, l: 82 }, { h: 345, s: 98, l: 80 },
  { h: 335, s: 90, l: 86 }, { h: 348, s: 100, l: 78 },
  { h: 330, s: 88, l: 88 }, { h: 350, s: 96, l: 83 },
  { h: 342, s: 94, l: 85 },
];

// ── Pre-render petal sprites to offscreen canvases ──
// One sprite per base color, at a reference size. Scaled at draw time.
const SPRITE_REF_SIZE = 40;
const spriteCanvases: HTMLCanvasElement[] = [];

function initSprites() {
  if (spriteCanvases.length > 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = SPRITE_REF_SIZE * dpr;

  for (const col of COLORS) {
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    const cx = c.getContext('2d')!;
    cx.scale(dpr, dpr);
    const hs = SPRITE_REF_SIZE * 0.5;

    cx.beginPath();
    cx.moveTo(0, -hs);
    cx.bezierCurveTo(hs * 0.8, -hs * 0.6, hs, hs * 0.2, 0, hs);
    cx.bezierCurveTo(-hs, hs * 0.2, -hs * 0.8, -hs * 0.6, 0, -hs);
    cx.closePath();

    const g = cx.createLinearGradient(0, -hs, 0, hs);
    g.addColorStop(0, `hsla(${col.h}, ${Math.min(100, col.s - 30)}%, ${Math.min(97, col.l + 12)}%, 1)`);
    g.addColorStop(0.4, `hsla(${col.h}, ${col.s}%, ${col.l}%, 1)`);
    g.addColorStop(1, `hsla(${col.h - 5}, ${Math.min(100, col.s + 10)}%, ${Math.max(50, col.l - 15)}%, 1)`);
    cx.fillStyle = g;
    cx.fill();

    // Center vein
    cx.beginPath();
    cx.moveTo(0, -hs * 0.6);
    cx.quadraticCurveTo(hs * 0.05, 0, 0, hs * 0.7);
    cx.strokeStyle = `hsla(${col.h}, ${col.s}%, ${Math.max(40, col.l - 25)}%, 0.3)`;
    cx.lineWidth = 0.6;
    cx.stroke();

    spriteCanvases.push(c);
  }
}

function createPetal(w: number, h: number, depth: number, spread: boolean): Petal {
  const col = COLORS[Math.floor(Math.random() * COLORS.length)];
  const isFar = depth === DEPTH_FAR;
  const isNear = depth === DEPTH_NEAR;

  // Depth-based size scaling
  const sizeMult = isFar ? 0.55 : isNear ? 1.25 : 1.0;
  const baseSize = isFar ? 3 + Math.random() * 4 : 3 + Math.random() * 5;
  const sz = baseSize * 2.8 * sizeMult;
  const x = Math.random() * w;
  const y = spread ? Math.random() * h * 1.2 - h * 0.1 : -sz * 2 - Math.random() * h * 0.5;
  const rand = Math.random;

  // Depth-based opacity and fall speed
  const depthOpacity = isFar ? 0.2 + rand() * 0.15 : isNear ? 0.55 + rand() * 0.3 : 0.4 + rand() * 0.35;
  const depthFall = isFar ? 0.4 : isNear ? 1.15 : 1.0;

  // Amp scaling by depth
  const amp = isFar ? 0.5 : isNear ? 1.15 : 1.0;

  return {
    x, y, size: sz,
    rotation: rand() * Math.PI * 2,
    hue: col.h + (rand() - 0.5) * 8,
    sat: col.s + (rand() - 0.5) * 5,
    lit: col.l + (rand() - 0.5) * 5,
    opacity: depthOpacity,
    fallSpeed: (0.06 + rand() * 0.45) * depthFall,
    depth,
    spriteIdx: COLORS.indexOf(col),
    swayAmp1: (15 + rand() * 55) * amp,
    swayFreq1: 0.08 + rand() * 0.35,
    swayPhase1: rand() * Math.PI * 2,
    swayAmp2: (6 + rand() * 28) * amp,
    swayFreq2: 0.3 + rand() * 1.1,
    swayPhase2: rand() * Math.PI * 2,
    swayAmp3: (2 + rand() * 12) * amp,
    swayFreq3: 1.2 + rand() * 3.2,
    swayPhase3: rand() * Math.PI * 2,
    fallOscAmp: rand() * 0.12,
    fallOscFreq: 0.3 + rand() * 0.6,
    fallOscPhase: rand() * Math.PI * 2,
    rotSpeed: (rand() - 0.5) * (isFar ? 0.6 : isNear ? 2.5 : 2.2),
    rotOscAmp: rand() * 0.8,
    rotOscFreq: 0.2 + rand() * 0.5,
    rotOscPhase: rand() * Math.PI * 2,
    gustDelay: isFar ? 10 : 0.15 + rand() * 0.9, // far petals never gust-hit
    gustCatch: isFar ? 0 : (isNear ? 0.4 + rand() * 0.6 : 0.25 + rand() * 0.75),
    flutterFreq: 2.5 + rand() * 5,
    flutterPhase: rand() * Math.PI * 2,
    gustExposure: 0,
    gustVelX: 0,
    turbPhase1: rand() * Math.PI * 2,
    turbPhase2: rand() * Math.PI * 2,
    turbFreq1: 1.8 + rand() * 3.5,
    turbFreq2: 3.0 + rand() * 4.0,
    windVar: (rand() - 0.5) * 0.12,
  };
}

// ── Ribbon with pre-computed bounding box for spatial optimization ──
interface RibbonData {
  yCenter: number;
  pts: { x: number; y: number; thickness: number }[];
  yMin: number;  // bounding box
  yMax: number;
  xMin: number;
  xMax: number;
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

    initSprites();

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

    // ── Create 3 depth layers (painter's order: far → mid → near) ──
    for (let i = 0; i < 40; i++) petals.push(createPetal(w, h, DEPTH_FAR, true));
    for (let i = 0; i < 100; i++) petals.push(createPetal(w, h, DEPTH_MID, true));
    for (let i = 0; i < 40; i++) petals.push(createPetal(w, h, DEPTH_NEAR, true));

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
      const gustCycle = Math.sin(t * 0.3);
      const gust = Math.max(0, (gustCycle - 0.15)) * 3.2;

      // ── Compute ribbon centerlines with bounding boxes ──
      const ribbons: RibbonData[] = [];

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
          let rYMin = Infinity, rYMax = -Infinity, rXMin = Infinity, rXMax = -Infinity;

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

            // Expand bounding box (use visual thickness = ±thickness for accuracy)
            const pad = thickness + 20;
            if (cy - pad < rYMin) rYMin = cy - pad;
            if (cy + pad > rYMax) rYMax = cy + pad;
            if (x < rXMin) rXMin = x;
            if (x > rXMax) rXMax = x;
          }

          ribbons.push({ yCenter, pts: centerPts, yMin: rYMin, yMax: rYMax, xMin: rXMin, xMax: rXMax });

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
      // Uses bounding box early-exit to skip most petals per frame
      const getPetalGustHit = (px: number, py: number): number => {
        if (ribbons.length === 0) return 0;
        let maxHit = 0;
        for (const ribbon of ribbons) {
          // Bounding box early-exit — O(1) instead of O(segments)
          if (px < ribbon.xMin || px > ribbon.xMax || py < ribbon.yMin || py > ribbon.yMax) continue;

          for (const pt of ribbon.pts) {
            const dx = px - pt.x;
            const dy = py - pt.y;
            const distSq = dx * dx + dy * dy;
            // Hit radius matches visual ribbon (thickness = half-width)
            const hitR = pt.thickness * 1.0;
            const hitRSq = hitR * hitR * 2.25; // (1.5× radius)² for Gaussian tail
            if (distSq > hitRSq) continue;
            const norm = Math.sqrt(distSq) / hitR;
            const hit = Math.exp(-norm * norm * 2.5);
            if (hit > maxHit) maxHit = hit;
          }
        }
        return maxHit;
      };

      // ── Update & draw petals (already in depth order: far → mid → near) ──
      let currentDepth = DEPTH_FAR;
      for (const p of petals) {
        // Apply depth-of-field blur when transitioning to near layer
        if (p.depth !== currentDepth) {
          currentDepth = p.depth;
          if (currentDepth === DEPTH_NEAR) {
            ctx.filter = 'blur(0.8px)';
          } else {
            ctx.filter = 'none';
          }
        }

        // Spatial hit test (far petals have gustDelay=10 so they never accumulate exposure)
        const rawHit = getPetalGustHit(p.x, p.y);

        // Temporal smoothing: fast pickup, very slow release
        const upRate = 0.045 / (0.3 + p.gustDelay * 0.7);
        const downRate = 0.012;
        const expRate = rawHit > p.gustExposure ? upRate : downRate;
        p.gustExposure += (rawHit - p.gustExposure) * expRate * dt;
        p.gustExposure = Math.max(0, Math.min(1, p.gustExposure));

        const feltGust = gust * p.gustExposure;

        // Gust amplifies each petal's unique natural sway
        const gustAmp = 1 + feltGust * p.gustCatch * 1.8;
        const sway1 = Math.sin(t * p.swayFreq1 + p.swayPhase1) * p.swayAmp1 * 0.009 * gustAmp;
        const sway2 = Math.sin(t * p.swayFreq2 + p.swayPhase2) * p.swayAmp2 * 0.006 * gustAmp;
        const sway3 = Math.cos(t * p.swayFreq3 + p.swayPhase3) * p.swayAmp3 * 0.003 * gustAmp;

        // Turbulent perturbation — unique per petal
        const turb1 = Math.sin(t * p.turbFreq1 + p.turbPhase1) * feltGust * 0.8;
        const turb2 = Math.cos(t * p.turbFreq2 + p.turbPhase2) * feltGust * 0.5;

        // Gentle leftward drift from gust
        const gustAccel = feltGust * p.gustCatch * 0.04;
        p.gustVelX -= gustAccel * dt;
        p.gustVelX *= Math.pow(0.975, dt);

        const petalWind = baseWind + p.windVar;

        p.x += (petalWind + sway1 + sway2 + sway3 + p.gustVelX + turb1 + turb2) * dt;

        // Fall with vertical bobbing + gust vertical turbulence
        const fallMod = 1 + Math.sin(t * p.fallOscFreq + p.fallOscPhase) * p.fallOscAmp;
        const gustVertTurb = Math.sin(t * p.turbFreq1 * 0.6 + p.turbPhase1 + 2.3) * feltGust * 0.08;
        p.y += (p.fallSpeed * fallMod + gustVertTurb) * dt;

        // Rotation — gust adds chaotic wobble
        const rotMod = 1 + Math.sin(t * p.rotOscFreq + p.rotOscPhase) * p.rotOscAmp;
        const gustWobble = feltGust * 0.25 * Math.sin(t * p.turbFreq2 * 0.4 + p.turbPhase2);
        p.rotation += (p.rotSpeed * 0.015 * rotMod + gustWobble * 0.02) * dt;

        // Wraparound — deterministic respawn position
        if (p.y > ch + p.size * 2) {
          p.y = -p.size * 2 - 60 * ((p.hue * 7 + p.sat * 3) % 1);
          p.x = cw * ((p.lit * 13 + p.swayPhase1) % 1);
        }
        if (p.x < -100) p.x = cw + 80;
        if (p.x > cw + 100) p.x = -80;

        // ── Draw using pre-rendered sprite ──
        const sprite = spriteCanvases[p.spriteIdx];
        if (sprite) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          // Scale sprite from reference size to actual petal size
          const scale = p.size / SPRITE_REF_SIZE;
          ctx.drawImage(sprite, -p.size * 0.5, -p.size * 0.5, p.size, p.size);
          ctx.restore();
        }
      }

      // Reset filter after near layer
      if (currentDepth === DEPTH_NEAR) ctx.filter = 'none';

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