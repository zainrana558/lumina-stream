'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   SakuraCanvas — High-performance canvas-based cherry blossom system
   ~250 petals drawn with bezier curves, animated via rAF.
   Three size tiers so the screen never looks congested:
     180 tiny (2-6px)  — soft atmospheric texture
      50 medium (6-13px) — visible swaying petals
      20 large (13-22px) — detailed foreground petals
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
  hue: number;        // 330-350 (pink range)
  saturation: number; // 60-100
  lightness: number;  // 70-92
}

const PETAL_COLORS = [
  { h: 340, s: 80, l: 82 },  // soft pink
  { h: 345, s: 85, l: 78 },  // medium pink
  { h: 335, s: 75, l: 88 },  // pale pink
  { h: 348, s: 90, l: 75 },  // deeper rose
  { h: 330, s: 70, l: 90 },  // very light pink
  { h: 350, s: 88, l: 80 },  // warm pink
  { h: 342, s: 82, l: 85 },  // classic sakura
];

function createPetal(w: number, h: number, tier: 'tiny' | 'medium' | 'large'): Petal {
  const col = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
  const sizeMulti = tier === 'tiny' ? 1 : tier === 'medium' ? 1.8 : 2.8;
  const baseSize = (2 + Math.random() * 4) * sizeMulti;

  return {
    x: Math.random() * w,
    y: -baseSize * 2 - Math.random() * h * 0.5,
    size: baseSize,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * (tier === 'tiny' ? 1.5 : tier === 'medium' ? 2.5 : 3.5),
    fallSpeed: 0.3 + Math.random() * 0.7 + (tier === 'tiny' ? 0.2 : tier === 'large' ? -0.1 : 0),
    swayAmp: 15 + Math.random() * 50 + (tier === 'large' ? 20 : 0),
    swayFreq: 0.3 + Math.random() * 0.6,
    swayPhase: Math.random() * Math.PI * 2,
    opacity: tier === 'tiny'
      ? 0.2 + Math.random() * 0.25
      : tier === 'medium'
        ? 0.45 + Math.random() * 0.35
        : 0.65 + Math.random() * 0.3,
    hue: col.h + (Math.random() - 0.5) * 10,
    saturation: col.s + (Math.random() - 0.5) * 15,
    lightness: col.l + (Math.random() - 0.5) * 10,
  };
}

/** Draw a single sakura petal shape using bezier curves */
function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  const { x, y, size, rotation, hue, saturation, lightness, opacity } = p;
  const s = size;
  const halfS = s * 0.5;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.globalAlpha = opacity;

  // Petal shape — two bezier curves forming a teardrop
  ctx.beginPath();
  ctx.moveTo(0, -halfS);
  ctx.bezierCurveTo(halfS * 0.8, -halfS * 0.6, halfS, halfS * 0.2, 0, halfS);
  ctx.bezierCurveTo(-halfS, halfS * 0.2, -halfS * 0.8, -halfS * 0.6, 0, -halfS);
  ctx.closePath();

  // Gradient fill — white highlight at top, saturated pink at bottom
  const grad = ctx.createLinearGradient(0, -halfS, 0, halfS);
  grad.addColorStop(0, `hsla(${hue}, ${Math.min(100, saturation - 30)}%, ${Math.min(97, lightness + 12)}%, 1)`);
  grad.addColorStop(0.4, `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`);
  grad.addColorStop(1, `hsla(${hue - 5}, ${Math.min(100, saturation + 10)}%, ${Math.max(50, lightness - 15)}%, 1)`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle center vein
  if (s > 5) {
    ctx.beginPath();
    ctx.moveTo(0, -halfS * 0.6);
    ctx.quadraticCurveTo(halfS * 0.05, 0, 0, halfS * 0.7);
    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${Math.max(40, lightness - 25)}%, ${opacity * 0.3})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  ctx.restore();
}

export default function SakuraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petalsRef = useRef<Petal[]>([]);
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

    // Spawn petals distributed across the screen so it doesn't start empty
    const w = window.innerWidth;
    const h = window.innerHeight;
    const petals: Petal[] = [];

    const tinyCount = 180;
    const medCount = 50;
    const lgCount = 20;

    for (let i = 0; i < tinyCount; i++) {
      const p = createPetal(w, h, 'tiny');
      p.y = Math.random() * h * 1.2 - h * 0.1; // spread across viewport
      petals.push(p);
    }
    for (let i = 0; i < medCount; i++) {
      const p = createPetal(w, h, 'medium');
      p.y = Math.random() * h * 1.2 - h * 0.1;
      petals.push(p);
    }
    for (let i = 0; i < lgCount; i++) {
      const p = createPetal(w, h, 'large');
      p.y = Math.random() * h * 1.2 - h * 0.1;
      petals.push(p);
    }

    petalsRef.current = petals;

    const animate = () => {
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      timeRef.current += 0.016; // ~60fps timestep
      const t = timeRef.current;

      ctx.clearRect(0, 0, cw, ch);

      for (const p of petals) {
        // Update position
        p.y += p.fallSpeed;
        p.x += Math.sin(t * p.swayFreq + p.swayPhase) * p.swayAmp * 0.008;
        p.rotation += p.rotSpeed;

        // Respawn when off-screen
        if (p.y > ch + p.size * 2) {
          p.y = -p.size * 2 - Math.random() * 40;
          p.x = Math.random() * cw;
          // Re-randomize some properties for variety
          p.swayPhase = Math.random() * Math.PI * 2;
          p.rotSpeed = (Math.random() - 0.5) * (p.size < 5 ? 1.5 : p.size < 12 ? 2.5 : 3.5);
        }
        // Wrap horizontally
        if (p.x > cw + 40) p.x = -40;
        if (p.x < -40) p.x = cw + 40;

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