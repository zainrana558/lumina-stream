'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   CursorAura — Petal trail that streams behind the cursor
   like petals blown in the wind.

   Uses a cursor position history ring buffer. Each petal reads
   from a past position in the buffer, so the trail naturally
   follows the cursor's path. Wind sway (sinusoidal) is layered
   on top for a natural drifting look. No GSAP position tweening
   — the trail is purely path-based.
   ═══════════════════════════════════════════════════════════════ */

const PETAL_COUNT = 18;
const HISTORY_LENGTH = 120; // frames of cursor history to keep

interface TrailPetal {
  el: HTMLCanvasElement;
  size: number;
  rotation: number;
  rotSpeed: number;
  baseOpacity: number;
  // Wind sway
  swayAmpX: number;
  swayAmpY: number;
  swayFreq: number;
  swayPhase: number;
  // Which history slot to read from (staggered)
  historyIndex: number;
  // Gentle downward gravity drift for tail petals
  drift: number;
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

function createTrailPetal(index: number): TrailPetal {
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

  const trailNorm = index / PETAL_COUNT;

  return {
    el: canvas,
    size,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 3,
    baseOpacity: 0.75 - trailNorm * 0.5, // 0.75 → 0.25 fade toward tail
    swayAmpX: 10 + Math.random() * 20 + trailNorm * 15,
    swayAmpY: 4 + Math.random() * 10 + trailNorm * 6,
    swayFreq: 1.5 + Math.random() * 2.0,
    swayPhase: Math.random() * Math.PI * 2 + index * 0.5,
    historyIndex: Math.floor(3 + trailNorm * (HISTORY_LENGTH - 10)), // Petal 0 = 3 frames back, last = ~110 frames back
    drift: 0.2 + trailNorm * 0.8, // Tail petals drift down more
  };
}

export default function CursorAura() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Ring buffer of cursor positions
    const history: { x: number; y: number }[] = new Array(HISTORY_LENGTH).fill(null).map(() => ({ x: -200, y: -200 }));
    let head = 0; // write index
    let hasCursor = false;

    // Create petals
    const petals: TrailPetal[] = [];
    for (let i = 0; i < PETAL_COUNT; i++) {
      const p = createTrailPetal(i);
      p.el.style.position = 'absolute';
      p.el.style.top = '0';
      p.el.style.left = '0';
      p.el.style.willChange = 'transform';
      p.el.style.pointerEvents = 'none';
      p.el.style.filter = 'drop-shadow(0 0 2px rgba(255,150,180,0.2))';
      container.appendChild(p.el);
      petals.push(p);
    }

    // Fade state (for mouse enter/leave)
    let fadeOpacity = 0;

    const onMove = (e: MouseEvent) => {
      head = (head + 1) % HISTORY_LENGTH;
      history[head].x = e.clientX;
      history[head].y = e.clientY;
      hasCursor = true;
    };

    const onLeave = () => { hasCursor = false; };
    const onEnter = () => { hasCursor = true; };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    const startTime = performance.now();
    let lastTime = startTime;

    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50) / 16.667;
      lastTime = now;
      const elapsed = (now - startTime) * 0.001;

      // Smooth fade in/out
      const fadeTarget = hasCursor ? 1 : 0;
      fadeOpacity += (fadeTarget - fadeOpacity) * 0.08 * dt;

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];

        // Read from history buffer — go back p.historyIndex frames
        const readIdx = ((head - p.historyIndex) % HISTORY_LENGTH + HISTORY_LENGTH) % HISTORY_LENGTH;
        const hx = history[readIdx].x;
        const hy = history[readIdx].y;

        // Wind sway — sinusoidal drift perpendicular to trail
        const swayX = Math.cos(elapsed * p.swayFreq + p.swayPhase) * p.swayAmpX;
        const swayY = Math.sin(elapsed * p.swayFreq * 0.6 + p.swayPhase + 1.2) * p.swayAmpY;

        // Gentle downward gravity drift
        const gravDrift = p.drift * 18;

        // Rotation — gentle tumble
        p.rotation += p.rotSpeed * 0.02 * dt;

        // Opacity
        const opacity = p.baseOpacity * fadeOpacity;

        const drawSize = Math.ceil(p.size * 3);
        const halfDraw = drawSize / 2;
        const finalX = hx + swayX;
        const finalY = hy + swayY + gravDrift;

        p.el.style.transform = `translate(${finalX - halfDraw}px, ${finalY - halfDraw}px) rotate(${p.rotation}rad)`;
        p.el.style.opacity = String(opacity);
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