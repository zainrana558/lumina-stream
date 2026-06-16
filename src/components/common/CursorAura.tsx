'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   CursorAura — Petal trail that streams behind the cursor
   like petals blown in the wind.

   Uses a cursor position history ring buffer. Each petal reads
   from a past position, so the trail naturally follows the
   cursor's path. Petals smoothly dissolve at the tail via
   exponential opacity fade + scale-down + increasing blur.
   A subtle glowing streak connects the trail for cohesion.
   ═══════════════════════════════════════════════════════════════ */

const PETAL_COUNT = 22;
const HISTORY_LENGTH = 160;

interface TrailPetal {
  el: HTMLCanvasElement;
  size: number;
  rotation: number;
  rotSpeed: number;
  // Per-petal fade properties
  baseOpacity: number;
  baseScale: number;
  blur: number;
  // Wind sway
  swayAmpX: number;
  swayAmpY: number;
  swayFreq: number;
  swayPhase: number;
  // History read offset
  historyIndex: number;
  // Downward drift
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

  if (size > 7) {
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

  // Near-cursor petals are a bit larger; tail petals smaller
  const trailNorm = index / PETAL_COUNT; // 0 = closest to cursor
  const size = (4 + Math.random() * 10) * (1 - trailNorm * 0.35);

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

  return {
    el: canvas,
    size,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 3,
    // Exponential fade: front is vivid, tail dissolves smoothly
    baseOpacity: Math.pow(1 - trailNorm, 1.8) * 0.85,
    // Scale: front is full, tail shrinks to ~40%
    baseScale: 1 - trailNorm * 0.6,
    // Blur: front is crisp, tail gets soft and dreamy
    blur: trailNorm * trailNorm * 4,
    // Wind sway — tail sways wider
    swayAmpX: 8 + Math.random() * 16 + trailNorm * 22,
    swayAmpY: 3 + Math.random() * 8 + trailNorm * 10,
    swayFreq: 1.2 + Math.random() * 1.8,
    swayPhase: Math.random() * Math.PI * 2 + index * 0.45,
    // History: petal 0 ≈ 2 frames back, last ≈ 150 frames back
    historyIndex: Math.floor(2 + trailNorm * (HISTORY_LENGTH - 12)),
    // Tail drifts down gently
    drift: 0.15 + trailNorm * 1.0,
  };
}

export default function CursorAura() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Ring buffer of cursor positions
    const history: { x: number; y: number }[] = [];
    for (let i = 0; i < HISTORY_LENGTH; i++) history.push({ x: -300, y: -300 });
    let head = 0;
    let hasCursor = false;
    let moveCount = 0;

    // Create petals
    const petals: TrailPetal[] = [];
    for (let i = 0; i < PETAL_COUNT; i++) {
      const p = createTrailPetal(i);
      p.el.style.position = 'absolute';
      p.el.style.top = '0';
      p.el.style.left = '0';
      p.el.style.willChange = 'transform, opacity, filter';
      p.el.style.pointerEvents = 'none';
      p.el.style.transformOrigin = 'center center';
      container.appendChild(p.el);
      petals.push(p);
    }

    // Create a single <canvas> for the glow streak
    const glowCanvas = document.createElement('canvas');
    glowCanvas.style.position = 'absolute';
    glowCanvas.style.top = '0';
    glowCanvas.style.left = '0';
    glowCanvas.style.pointerEvents = 'none';
    glowCanvas.style.willChange = 'opacity';
    container.appendChild(glowCanvas);
    let glowCtx: CanvasRenderingContext2D | null = null;

    const resizeGlow = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      glowCanvas.width = window.innerWidth * dpr;
      glowCanvas.height = window.innerHeight * dpr;
      glowCanvas.style.width = `${window.innerWidth}px`;
      glowCanvas.style.height = `${window.innerHeight}px`;
      glowCtx = glowCanvas.getContext('2d');
      if (glowCtx) glowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeGlow();
    window.addEventListener('resize', resizeGlow);

    let fadeOpacity = 0;

    const onMove = (e: MouseEvent) => {
      head = (head + 1) % HISTORY_LENGTH;
      history[head].x = e.clientX;
      history[head].y = e.clientY;
      hasCursor = true;
      moveCount++;
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
      fadeOpacity += (fadeTarget - fadeOpacity) * 0.1 * dt;

      const cw = window.innerWidth;
      const ch = window.innerHeight;

      // Draw the glow streak
      if (glowCtx) {
        glowCtx.clearRect(0, 0, cw, ch);
        if (fadeOpacity > 0.01 && moveCount > 5) {
          // Sample points along the trail for the glow line
          const points: { x: number; y: number }[] = [];
          const sampleCount = 40;
          for (let s = 0; s < sampleCount; s++) {
            const norm = s / sampleCount;
            const readIdx = ((head - Math.floor(2 + norm * (HISTORY_LENGTH * 0.7))) % HISTORY_LENGTH + HISTORY_LENGTH) % HISTORY_LENGTH;
            points.push({ x: history[readIdx].x, y: history[readIdx].y });
          }

          // Draw a soft glowing curve through the points
          for (let s = 0; s < points.length - 1; s++) {
            const norm = s / points.length;
            // Exponential fade for the glow too
            const alpha = Math.pow(1 - norm, 2.2) * 0.06 * fadeOpacity;
            if (alpha < 0.002) continue;

            glowCtx.beginPath();
            glowCtx.moveTo(points[s].x, points[s].y);
            if (s < points.length - 2) {
              const xc = (points[s].x + points[s + 1].x) / 2;
              const yc = (points[s].y + points[s + 1].y) / 2;
              glowCtx.quadraticCurveTo(points[s].x, points[s].y, xc, yc);
            } else {
              glowCtx.lineTo(points[s + 1].x, points[s + 1].y);
            }
            glowCtx.strokeStyle = `rgba(255, 160, 190, ${alpha})`;
            glowCtx.lineWidth = (1 - norm * 0.7) * 6;
            glowCtx.lineCap = 'round';
            glowCtx.stroke();
          }
        }
        glowCanvas.style.opacity = '1';
      }

      // Update petals
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];

        // Read from history
        const readIdx = ((head - p.historyIndex) % HISTORY_LENGTH + HISTORY_LENGTH) % HISTORY_LENGTH;
        const hx = history[readIdx].x;
        const hy = history[readIdx].y;

        // Wind sway
        const swayX = Math.cos(elapsed * p.swayFreq + p.swayPhase) * p.swayAmpX;
        const swayY = Math.sin(elapsed * p.swayFreq * 0.6 + p.swayPhase + 1.2) * p.swayAmpY;

        // Downward drift
        const gravDrift = p.drift * 15;

        // Rotation
        p.rotation += p.rotSpeed * 0.018 * dt;

        // Final opacity with fade
        const opacity = p.baseOpacity * fadeOpacity;

        const drawSize = Math.ceil(p.size * 3);
        const halfDraw = drawSize / 2;
        const finalX = hx + swayX;
        const finalY = hy + swayY + gravDrift;

        // Apply scale + translate + rotate + blur
        const blurStr = p.blur > 0.1 ? `blur(${p.blur.toFixed(1)}px)` : 'none';
        const shadowStr = p.baseOpacity > 0.3
          ? `drop-shadow(0 0 ${2 + (1 - p.baseOpacity) * 3}px rgba(255,150,180,${p.baseOpacity * 0.3}))`
          : 'none';

        p.el.style.filter = [blurStr, shadowStr].filter(f => f !== 'none').join(' ') || 'none';
        p.el.style.transform = `translate(${finalX - halfDraw}px, ${finalY - halfDraw}px) scale(${p.baseScale}) rotate(${p.rotation}rad)`;
        p.el.style.opacity = String(opacity);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resizeGlow);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      petals.forEach(p => p.el.remove());
      glowCanvas.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none' }}
    />
  );
}