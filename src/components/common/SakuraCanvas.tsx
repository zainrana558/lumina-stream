'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   SakuraCanvas — Canvas 2D cherry blossom petal system
   ~250 petals with cursor interaction: petals get pushed by
   mouse movement and gently drift toward the cursor.
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
  vx: number;  // velocity x (for cursor push)
  vy: number;  // velocity y (for cursor push)
}

interface Cursor {
  x: number;
  y: number;
  px: number; // previous x
  py: number; // previous y
  active: boolean;
  dx: number; // delta x this frame
  dy: number; // delta y this frame
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
  const sizeMulti = tier === 'tiny' ? 2.2 : tier === 'medium' ? 3.5 : 5;
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
    vx: 0,
    vy: 0,
  };
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  const { x, y, size, rotation, hue, saturation, lightness, opacity } = p;
  const halfS = size * 0.5;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.globalAlpha = opacity;

  // Petal shape — two bezier curves
  ctx.beginPath();
  ctx.moveTo(0, -halfS);
  ctx.bezierCurveTo(halfS * 0.8, -halfS * 0.6, halfS, halfS * 0.2, 0, halfS);
  ctx.bezierCurveTo(-halfS, halfS * 0.2, -halfS * 0.8, -halfS * 0.6, 0, -halfS);
  ctx.closePath();

  // Gradient fill
  const grad = ctx.createLinearGradient(0, -halfS, 0, halfS);
  grad.addColorStop(0, `hsla(${hue}, ${Math.min(100, saturation - 30)}%, ${Math.min(97, lightness + 12)}%, 1)`);
  grad.addColorStop(0.4, `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`);
  grad.addColorStop(1, `hsla(${hue - 5}, ${Math.min(100, saturation + 10)}%, ${Math.max(50, lightness - 15)}%, 1)`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Center vein on larger petals
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
  const cursorRef = useRef<Cursor>({ x: -9999, y: -9999, px: -9999, py: -9999, active: false, dx: 0, dy: 0 });

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

    // Spawn distributed across screen
    for (let i = 0; i < 180; i++) petals.push(createPetal(w, h, 'tiny', true));
    for (let i = 0; i < 50; i++) petals.push(createPetal(w, h, 'medium', true));
    for (let i = 0; i < 20; i++) petals.push(createPetal(w, h, 'large', true));

    // ── Cursor tracking (listens on document so it works everywhere) ──
    const onMouseMove = (e: MouseEvent) => {
      const cur = cursorRef.current;
      cur.px = cur.x;
      cur.py = cur.y;
      cur.x = e.clientX;
      cur.y = e.clientY;
      cur.dx = cur.x - cur.px;
      cur.dy = cur.y - cur.py;
      cur.active = true;
    };
    const onMouseLeave = () => {
      cursorRef.current.active = false;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    // Interaction params
    const PUSH_RADIUS = 120;    // how far cursor influence reaches
    const PUSH_STRENGTH = 0.35; // how hard cursor pushes petals
    const DRIFT_STRENGTH = 0.012; // gentle pull toward cursor when still
    const VELOCITY_DECAY = 0.94; // how fast pushed velocity fades

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.667, 3); // normalize to ~60fps, cap at 3x
      lastTime = now;
      timeRef.current += 0.016 * dt;
      const t = timeRef.current;
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const cur = cursorRef.current;

      ctx.clearRect(0, 0, cw, ch);

      for (const p of petals) {
        // ── Cursor interaction ──
        if (cur.active) {
          const ddx = p.x - cur.x;
          const ddy = p.y - cur.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);

          if (dist < PUSH_RADIUS && dist > 0.1) {
            const norm = 1 - dist / PUSH_RADIUS;

            // Push away from cursor movement direction
            if (Math.abs(cur.dx) > 0.5 || Math.abs(cur.dy) > 0.5) {
              p.vx += cur.dx * PUSH_STRENGTH * norm * dt;
              p.vy += cur.dy * PUSH_STRENGTH * norm * dt;
            }

            // Gentle drift toward cursor when cursor is still
            if (Math.abs(cur.dx) < 1 && Math.abs(cur.dy) < 1) {
              p.vx -= (ddx / dist) * DRIFT_STRENGTH * norm * dt;
              p.vy -= (ddy / dist) * DRIFT_STRENGTH * norm * dt;
            }

            // Extra rotation from cursor turbulence
            p.rotation += (cur.dx + cur.dy) * 0.3 * norm * dt;
          }
        }

        // Apply velocity with decay
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= VELOCITY_DECAY;
        p.vy *= VELOCITY_DECAY;

        // Natural falling motion
        p.y += p.fallSpeed * dt;
        p.x += Math.sin(t * p.swayFreq + p.swayPhase) * p.swayAmp * 0.008 * dt;
        p.rotation += p.rotSpeed * dt;

        // Respawn when off-screen bottom
        if (p.y > ch + p.size * 2) {
          p.y = -p.size * 2 - Math.random() * 40;
          p.x = Math.random() * cw;
          p.swayPhase = Math.random() * Math.PI * 2;
          p.rotSpeed = (Math.random() - 0.5) * (p.size < 10 ? 1.5 : p.size < 20 ? 2.5 : 3.5);
          p.vx = 0;
          p.vy = 0;
        }
        // Wrap horizontally
        if (p.x > cw + 60) p.x = -60;
        if (p.x < -60) p.x = cw + 60;

        drawPetal(ctx, p);
      }

      // Decay cursor delta each frame so "still" detection works
      cur.dx *= 0.8;
      cur.dy *= 0.8;

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