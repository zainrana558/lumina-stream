'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   CursorAura — Compact petal trail with wind gust effect.

   Shorter trail, denser petals, and a multi-frequency wind
   gust system that creates periodic bursts of lateral force —
   like real gusts sweeping petals sideways.
   ═══════════════════════════════════════════════════════════════ */

const PETAL_COUNT = 36;
const HISTORY_LENGTH = 80;

// Wind gust parameters — 3 overlapping gust layers
const GUSTS = [
  { freq: 0.4, amp: 22, phase: 0 },       // slow broad gust
  { freq: 1.1, amp: 12, phase: 2.1 },     // medium gust
  { freq: 2.7, amp: 6,  phase: 4.8 },     // quick flutter
];

interface TrailPetal {
  el: HTMLCanvasElement;
  size: number;
  rotation: number;
  rotSpeed: number;
  baseOpacity: number;
  baseScale: number;
  blur: number;
  // Per-petal sway (individual flutter on top of global gust)
  flutterAmp: number;
  flutterFreq: number;
  flutterPhase: number;
  // History read offset
  historyIndex: number;
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

  if (size > 5) {
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

  const trailNorm = index / PETAL_COUNT;
  // Smaller petals overall; front slightly larger
  const size = (3 + Math.random() * 7) * (1 - trailNorm * 0.3);

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
    rotSpeed: (Math.random() - 0.5) * 4,
    baseOpacity: Math.pow(1 - trailNorm, 1.6) * 0.9,
    baseScale: 1 - trailNorm * 0.55,
    blur: trailNorm * trailNorm * 3,
    // Individual flutter (high freq, small amp — adds organic feel)
    flutterAmp: 3 + Math.random() * 6,
    flutterFreq: 2.5 + Math.random() * 3,
    flutterPhase: Math.random() * Math.PI * 2 + index * 0.3,
    // Dense history: spread evenly across shorter buffer
    historyIndex: Math.floor(1 + trailNorm * (HISTORY_LENGTH - 6)),
    drift: 0.1 + trailNorm * 0.6,
  };
}

export default function CursorAura() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const history: { x: number; y: number }[] = [];
    for (let i = 0; i < HISTORY_LENGTH; i++) history.push({ x: -300, y: -300 });
    let head = 0;
    let hasCursor = false;
    let moveCount = 0;

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

    // Glow streak canvas
    const glowCanvas = document.createElement('canvas');
    glowCanvas.style.position = 'absolute';
    glowCanvas.style.top = '0';
    glowCanvas.style.left = '0';
    glowCanvas.style.pointerEvents = 'none';
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

      const fadeTarget = hasCursor ? 1 : 0;
      fadeOpacity += (fadeTarget - fadeOpacity) * 0.12 * dt;

      const cw = window.innerWidth;

      // ── Global wind gust force (shared by all petals) ──
      // Sum of 3 sine layers creates organic gust rhythm
      let gustX = 0;
      let gustY = 0;
      for (const g of GUSTS) {
        gustX += Math.sin(elapsed * g.freq + g.phase) * g.amp;
        gustY += Math.cos(elapsed * g.freq * 0.7 + g.phase + 1.5) * g.amp * 0.35;
      }

      // ── Glow streak ──
      if (glowCtx) {
        glowCtx.clearRect(0, 0, cw, window.innerHeight);
        if (fadeOpacity > 0.01 && moveCount > 3) {
          const sampleCount = 30;
          for (let s = 0; s < sampleCount - 1; s++) {
            const norm = s / sampleCount;
            const i1 = ((head - Math.floor(1 + norm * HISTORY_LENGTH * 0.65)) % HISTORY_LENGTH + HISTORY_LENGTH) % HISTORY_LENGTH;
            const i2 = ((head - Math.floor(1 + (norm + 1 / sampleCount) * HISTORY_LENGTH * 0.65)) % HISTORY_LENGTH + HISTORY_LENGTH) % HISTORY_LENGTH;
            const alpha = Math.pow(1 - norm, 2.0) * 0.05 * fadeOpacity;
            if (alpha < 0.002) continue;

            glowCtx.beginPath();
            glowCtx.moveTo(history[i1].x + gustX * norm * 0.4, history[i1].y + gustY * norm * 0.4);
            glowCtx.lineTo(history[i2].x + gustX * (norm + 1 / sampleCount) * 0.4, history[i2].y + gustY * (norm + 1 / sampleCount) * 0.4);
            glowCtx.strokeStyle = `rgba(255, 160, 190, ${alpha})`;
            glowCtx.lineWidth = (1 - norm * 0.6) * 5;
            glowCtx.lineCap = 'round';
            glowCtx.stroke();
          }
        }
      }

      // ── Petals ──
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];

        const readIdx = ((head - p.historyIndex) % HISTORY_LENGTH + HISTORY_LENGTH) % HISTORY_LENGTH;
        const hx = history[readIdx].x;
        const hy = history[readIdx].y;

        const trailNorm = i / PETAL_COUNT;

        // Global gust — tail petals are affected more (they've been in the wind longer)
        const gustInfluence = trailNorm * 0.7;
        const gx = gustX * gustInfluence;
        const gy = gustY * gustInfluence;

        // Individual flutter on top
        const fx = Math.cos(elapsed * p.flutterFreq + p.flutterPhase) * p.flutterAmp;
        const fy = Math.sin(elapsed * p.flutterFreq * 0.65 + p.flutterPhase + 0.8) * p.flutterAmp * 0.5;

        // Downward drift
        const grav = p.drift * 10;

        // Rotation — gusts make them spin more
        const gustSpin = Math.abs(gustX) * 0.003 * trailNorm;
        p.rotation += (p.rotSpeed * 0.02 + gustSpin) * dt;

        const opacity = p.baseOpacity * fadeOpacity;
        const drawSize = Math.ceil(p.size * 3);
        const halfDraw = drawSize / 2;
        const finalX = hx + gx + fx;
        const finalY = hy + gy + fy + grav;

        const blurStr = p.blur > 0.1 ? `blur(${p.blur.toFixed(1)}px)` : 'none';
        const shadowStr = p.baseOpacity > 0.25
          ? `drop-shadow(0 0 ${(2 + (1 - p.baseOpacity) * 2).toFixed(1)}px rgba(255,150,180,${(p.baseOpacity * 0.25).toFixed(2)}))`
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