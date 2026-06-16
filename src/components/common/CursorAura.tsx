'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════
   CursorAura — GSAP-driven petal trail that streams behind
   the cursor like petals caught in the wind.

   Each petal follows the cursor with increasing stagger delay,
   forming a trail. Petals sway side-to-side (cosine wave) to
   simulate wind drift. When the cursor moves fast, the trail
   stretches and petals fan out; when slow, they gently converge.
   ═══════════════════════════════════════════════════════════════ */

const PETAL_COUNT = 18;

interface TrailPetal {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  // GSAP-tweened position (the smoothed follow point)
  x: number;
  y: number;
  // Visual properties
  size: number;
  rotation: number;
  rotSpeed: number;
  hue: number;
  sat: number;
  lit: number;
  baseOpacity: number;
  // Trail behavior
  followDelay: number;    // GSAP tween duration — higher = trails further behind
  swayAmp: number;        // Side-to-side wind sway amplitude
  swayFreq: number;       // Sway oscillation speed
  swayPhase: number;      // Phase offset so petals don't sway in sync
  trailOffset: number;    // How far back in the trail (normalized 0–1)
  windBias: number;       // Slight vertical drift (petals gently falling as they trail)
}

const COLORS = [
  { h: 340, s: 80, l: 82 }, { h: 345, s: 85, l: 78 },
  { h: 335, s: 75, l: 88 }, { h: 348, s: 90, l: 75 },
  { h: 330, s: 70, l: 90 }, { h: 350, s: 88, l: 80 },
  { h: 342, s: 82, l: 85 },
];

function drawPetalShape(ctx: CanvasRenderingContext2D, size: number, hue: number, sat: number, lit: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = size * dpr;
  const canvasSize = px * 3;
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.save();
  ctx.translate(canvasSize / 2, canvasSize / 2);

  const hs = px * 0.5;

  ctx.beginPath();
  ctx.moveTo(0, -hs);
  ctx.bezierCurveTo(hs * 0.8, -hs * 0.6, hs, hs * 0.2, 0, hs);
  ctx.bezierCurveTo(-hs, hs * 0.2, -hs * 0.8, -hs * 0.6, 0, -hs);
  ctx.closePath();

  const g = ctx.createLinearGradient(0, -hs, 0, hs);
  g.addColorStop(0, `hsla(${hue}, ${Math.min(100, sat - 30)}%, ${Math.min(97, lit + 12)}%, 1)`);
  g.addColorStop(0.4, `hsla(${hue}, ${sat}%, ${lit}%, 1)`);
  g.addColorStop(1, `hsla(${hue - 5}, ${Math.min(100, sat + 10)}%, ${Math.max(50, lit - 15)}%, 1)`);
  ctx.fillStyle = g;
  ctx.fill();

  if (size > 8) {
    ctx.beginPath();
    ctx.moveTo(0, -hs * 0.6);
    ctx.quadraticCurveTo(hs * 0.05, 0, 0, hs * 0.7);
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${Math.max(40, lit - 25)}%, 0.25)`;
    ctx.lineWidth = 0.6 * dpr;
    ctx.stroke();
  }

  ctx.restore();
}

function createTrailPetal(index: number, total: number): TrailPetal {
  const canvas = document.createElement('canvas');
  const col = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = 5 + Math.random() * 11;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pxSize = Math.ceil(size * 3 * dpr);
  canvas.width = pxSize;
  canvas.height = pxSize;
  canvas.style.width = `${Math.ceil(size * 3)}px`;
  canvas.style.height = `${Math.ceil(size * 3)}px`;

  const ctx = canvas.getContext('2d')!;
  const hue = col.h + (Math.random() - 0.5) * 10;
  const sat = col.s + (Math.random() - 0.5) * 15;
  const lit = col.l + (Math.random() - 0.5) * 10;

  drawPetalShape(ctx, size, hue, sat, lit);

  // Normalize position in trail: 0 = closest to cursor, 1 = furthest
  const trailNorm = index / total;

  return {
    el: canvas,
    ctx,
    x: -200,
    y: -200,
    size,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 3,
    hue, sat, lit,
    baseOpacity: 0.7 - trailNorm * 0.45, // Fade out toward the tail
    followDelay: 0.12 + trailNorm * 0.55, // 0.12s → 0.67s follow delay
    swayAmp: 8 + Math.random() * 18 + trailNorm * 10, // Tail petals sway wider
    swayFreq: 1.8 + Math.random() * 2.5,
    swayPhase: Math.random() * Math.PI * 2 + index * 0.4,
    trailOffset: trailNorm,
    windBias: 0.15 + Math.random() * 0.35, // Gentle downward drift
  };
}

export default function CursorAura() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const cursorRef = useRef({ x: -200, y: -200, speed: 0, visible: false, prevX: -200, prevY: -200 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create petal pool
    const petals: TrailPetal[] = [];
    for (let i = 0; i < PETAL_COUNT; i++) {
      const petal = createTrailPetal(i, PETAL_COUNT);
      petal.el.style.position = 'absolute';
      petal.el.style.top = '0';
      petal.el.style.left = '0';
      petal.el.style.willChange = 'transform';
      petal.el.style.pointerEvents = 'none';
      petal.el.style.filter = 'drop-shadow(0 0 2px rgba(255,150,180,0.25))';
      container.appendChild(petal.el);
      petals.push(petal);
    }

    const speedMapper = gsap.utils.mapRange(0, 45, 0, 1);
    const clamp = gsap.utils.clamp(0, 1);

    // Smooth speed for trail stretch
    const speedState = { value: 0 };
    const speedTo = gsap.quickTo(speedState, 'value', {
      duration: 0.5,
      ease: 'power3.out',
    });

    const onMove = (e: MouseEvent) => {
      const rawSpeed = Math.abs(e.movementX) + Math.abs(e.movementY);
      const mapped = clamp(speedMapper(rawSpeed));
      cursorRef.current.prevX = cursorRef.current.x;
      cursorRef.current.prevY = cursorRef.current.y;
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.speed = mapped;
      cursorRef.current.visible = true;
      speedTo(mapped);
    };

    const onLeave = () => {
      cursorRef.current.visible = false;
      speedTo(0);
    };

    const onEnter = () => {
      cursorRef.current.visible = true;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    // Animation loop
    const startTime = performance.now();
    let lastTime = startTime;

    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50) / 16.667;
      lastTime = now;
      const elapsed = (now - startTime) * 0.001; // seconds

      const { x: cx, y: cy, visible } = cursorRef.current;
      const smoothSpeed = speedState.value;

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];

        // GSAP tween toward cursor — staggered duration creates the trail
        gsap.to(p, {
          x: cx,
          y: cy,
          duration: p.followDelay,
          ease: 'power2.out',
          overwrite: 'auto',
        });

        // The petal's actual GSAP-smoothed position lags behind cursor.
        // We add wind sway perpendicular to nothing specific — just a
        // gentle sinusoidal drift that makes it look like wind.
        const swayX = Math.cos(elapsed * p.swayFreq + p.swayPhase) * p.swayAmp;
        const swayY = Math.sin(elapsed * p.swayFreq * 0.7 + p.swayPhase) * p.swayAmp * 0.4;

        // Gentle downward drift — petals in the tail sink a bit
        const drift = p.trailOffset * p.windBias * 25;

        // Speed stretches the trail: faster = more offset from center
        const speedSpread = smoothSpeed * p.trailOffset * 12;

        // Rotation — faster when cursor moves, gentle tumble when still
        const rotBoost = smoothSpeed * 0.08;
        p.rotation += (p.rotSpeed * 0.018 + rotBoost) * dt;

        // Opacity: fade tail, fade when invisible
        const targetOpacity = visible ? p.baseOpacity : 0;

        const drawSize = Math.ceil(p.size * 3);
        const halfDraw = drawSize / 2;

        // Final position = GSAP-smoothed follow + wind sway + drift
        // Deterministic per-petal speed scatter using sin (no Math.random in render loop)
        const scatterX = Math.sin(elapsed * 3.7 + i * 1.9) * speedSpread;
        const scatterY = Math.cos(elapsed * 2.3 + i * 2.7) * speedSpread * 0.3;
        const finalX = p.x + swayX + scatterX;
        const finalY = p.y + swayY + drift + scatterY;

        p.el.style.transform = `translate(${finalX - halfDraw}px, ${finalY - halfDraw}px) rotate(${p.rotation}rad)`;
        p.el.style.opacity = String(targetOpacity);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      petals.forEach(p => p.el.remove());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none' }}
    />
  );
}