'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   SakuraCanvas — Canvas 2D cherry blossom petal system
   ~250 falling petals with cursor attraction trail.
   Petals are pulled toward the cursor and follow it with a
   spring-like lag (trailing effect). When the cursor stops,
   petals smoothly drift back to their natural falling path.
   No pushing — only attraction + spring return.
   ═══════════════════════════════════════════════════════════════ */

interface Petal {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  fallSpeed: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  opacity: number;
  hue: number;
  saturation: number;
  lightness: number;
  offX: number;   // cursor attraction displacement X
  offY: number;   // cursor attraction displacement Y
  offVX: number;  // offset velocity X
  offVY: number;  // offset velocity Y
}

interface Cursor {
  x: number;
  y: number;
  active: boolean;
}

const PETAL_COLORS = [
  { h: 340, s: 80, l: 82 },
  { h: 345, s: 85, l: 78 },
  { h: 335, s: 75, l: 88 },
  { h: 348, s: 90, l: 75 },
  { h: 330, s: 70, l: 90 },
  { h: 350, s: 88, l: 80 },
  { h: 342, s: 82, l: 85 },
];

function createPetal(w: number, h: number, tier: 'tiny' | 'medium' | 'large', spread: boolean): Petal {
  const col = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
  const sizeMulti = tier === 'tiny' ? 1.4 : tier === 'medium' ? 2.2 : 3.2;
  const baseSize = (3 + Math.random() * 5) * sizeMulti;

  return {
    x: Math.random() * w,
    y: spread ? Math.random() * h * 1.2 - h * 0.1 : -baseSize * 2 - Math.random() * h * 0.5,
    size: baseSize,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * (tier === 'tiny' ? 1.5 : tier === 'medium' ? 2.5 : 3.5),
    fallSpeed: 0.3 + Math.random() * 0.6 + (tier === 'tiny' ? 0.15 : tier === 'large' ? -0.05 : 0),
    swayAmp: 15 + Math.random() * 45 + (tier === 'large' ? 25 : 0),
    swayFreq: 0.3 + Math.random() * 0.6,
    swayPhase: Math.random() * Math.PI * 2,
    opacity: tier === 'tiny'
      ? 0.25 + Math.random() * 0.25
      : tier === 'medium'
        ? 0.5 + Math.random() * 0.3
        : 0.7 + Math.random() * 0.25,
    hue: col.h + (Math.random() - 0.5) * 10,
    saturation: col.s + (Math.random() - 0.5) * 15,
    lightness: col.l + (Math.random() - 0.5) * 10,
    offX: 0,
    offY: 0,
    offVX: 0,
    offVY: 0,
  };
}

function drawPetal(ctx: CanvasRenderingContext2D, p: { x: number; y: number; size: number; rotation: number; hue: number; saturation: number; lightness: number; opacity: number }) {
  const { x, y, size, rotation, hue, saturation, lightness, opacity } = p;
  const halfS = size * 0.5;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.globalAlpha = opacity;

  ctx.beginPath();
  ctx.moveTo(0, -halfS);
  ctx.bezierCurveTo(halfS * 0.8, -halfS * 0.6, halfS, halfS * 0.2, 0, halfS);
  ctx.bezierCurveTo(-halfS, halfS * 0.2, -halfS * 0.8, -halfS * 0.6, 0, -halfS);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, -halfS, 0, halfS);
  grad.addColorStop(0, `hsla(${hue}, ${Math.min(100, saturation - 30)}%, ${Math.min(97, lightness + 12)}%, 1)`);
  grad.addColorStop(0.4, `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`);
  grad.addColorStop(1, `hsla(${hue - 5}, ${Math.min(100, saturation + 10)}%, ${Math.max(50, lightness - 15)}%, 1)`);
  ctx.fillStyle = grad;
  ctx.fill();

  if (size > 10) {
    ctx.beginPath();
    ctx.moveTo(0, -halfS * 0.6);
    ctx.quadraticCurveTo(halfS * 0.05, 0, 0, halfS * 0.7);
    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${Math.max(40, lightness - 25)}%, ${opacity * 0.3})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  ctx.restore();
}

export default function SakuraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const timeRef = useRef(0);
  const cursorRef = useRef<Cursor>({ x: -9999, y: -9999, active: false });
  // Smoothed cursor position for lag-free attraction
  const smoothCursor = useRef({ x: -9999, y: -9999 });

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

    const w = window.innerWidth;
    const h = window.innerHeight;
    const petals: Petal[] = [];

    for (let i = 0; i < 180; i++) petals.push(createPetal(w, h, 'tiny', true));
    for (let i = 0; i < 50; i++) petals.push(createPetal(w, h, 'medium', true));
    for (let i = 0; i < 20; i++) petals.push(createPetal(w, h, 'large', true));

    // ── Cursor tracking ──
    const onMouseMove = (e: MouseEvent) => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.active = true;
    };
    const onMouseLeave = () => {
      cursorRef.current.active = false;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    // ── Attraction physics params ──
    const ATTRACT_RADIUS = 220;       // how far attraction reaches
    const ATTRACT_STRENGTH = 0.06;    // how strongly petals are pulled toward cursor
    const SPRING_CONSTANT = 0.025;    // spring-back force (return to natural pos)
    const SPRING_DAMPING = 0.88;      // how quickly offset velocity decays
    const MAX_OFFSET = 80;            // max displacement from natural position
    const SMOOTH_FACTOR = 0.12;       // how fast smoothed cursor follows real cursor (lower = more lag = more trail)

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.667, 3);
      lastTime = now;
      timeRef.current += 0.016 * dt;
      const t = timeRef.current;
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const cur = cursorRef.current;
      const sm = smoothCursor.current;

      // Smooth cursor with lag — this is what creates the trailing effect
      // Petals chase this smoothed position, not the raw cursor
      if (cur.active) {
        sm.x += (cur.x - sm.x) * SMOOTH_FACTOR * dt;
        sm.y += (cur.y - sm.y) * SMOOTH_FACTOR * dt;
      }

      ctx.clearRect(0, 0, cw, ch);

      for (const p of petals) {
        // ── Cursor attraction via spring offset ──
        if (cur.active) {
          // Distance from petal's NATURAL position to smoothed cursor
          const toCursorX = sm.x - p.x;
          const toCursorY = sm.y - p.y;
          const dist = Math.sqrt(toCursorX * toCursorX + toCursorY * toCursorY);

          if (dist < ATTRACT_RADIUS && dist > 1) {
            // Smoothstep falloff — full strength near cursor, none at edge
            const norm = 1 - dist / ATTRACT_RADIUS;
            const force = norm * norm * (3 - 2 * norm);

            // Direction toward cursor (normalized)
            const nx = toCursorX / dist;
            const ny = toCursorY / dist;

            // Attraction: pull offset toward cursor
            p.offVX += nx * ATTRACT_STRENGTH * force * dt;
            p.offVY += ny * ATTRACT_STRENGTH * force * dt;

            // Extra gentle spin when being attracted
            p.rotation += force * 0.5 * dt;
          }
        }

        // Spring-back: always pull offset back toward zero (natural position)
        p.offVX -= p.offX * SPRING_CONSTANT * dt;
        p.offVY -= p.offY * SPRING_CONSTANT * dt;

        // Damping
        p.offVX *= Math.pow(SPRING_DAMPING, dt);
        p.offVY *= Math.pow(SPRING_DAMPING, dt);

        // Update offset
        p.offX += p.offVX * dt;
        p.offY += p.offVY * dt;

        // Clamp offset so petals don't fly off screen
        const offMag = Math.sqrt(p.offX * p.offX + p.offY * p.offY);
        if (offMag > MAX_OFFSET) {
          const scale = MAX_OFFSET / offMag;
          p.offX *= scale;
          p.offY *= scale;
          p.offVX *= 0.5;
          p.offVY *= 0.5;
        }

        // Natural falling motion (always runs on base position)
        p.y += p.fallSpeed * dt;
        p.x += Math.sin(t * p.swayFreq + p.swayPhase) * p.swayAmp * 0.008 * dt;
        p.rotation += p.rotSpeed * dt;

        // Respawn when off-screen bottom
        if (p.y > ch + p.size * 2) {
          p.y = -p.size * 2 - Math.random() * 40;
          p.x = Math.random() * cw;
          p.swayPhase = Math.random() * Math.PI * 2;
          p.rotSpeed = (Math.random() - 0.5) * (p.size < 10 ? 1.5 : p.size < 20 ? 2.5 : 3.5);
          // Reset offset so respawned petals don't drift in from weird angles
          p.offX = 0;
          p.offY = 0;
          p.offVX = 0;
          p.offVY = 0;
        }
        // Wrap horizontally
        if (p.x > cw + 60) p.x = -60;
        if (p.x < -60) p.x = cw + 60;

        // Draw at natural position + offset
        drawPetal(ctx, {
          x: p.x + p.offX,
          y: p.y + p.offY,
          size: p.size,
          rotation: p.rotation,
          hue: p.hue,
          saturation: p.saturation,
          lightness: p.lightness,
          opacity: p.opacity,
        });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    />
  );
}