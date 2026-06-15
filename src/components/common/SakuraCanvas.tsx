'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   SakuraCanvas — Canvas 2D cherry blossom petal system
   ~250 falling petals + cursor breeze vortex + trail wake.
   Nearby petals swirl tangentially around the cursor like
   a gentle wind vortex. Micro-petals spawn along the cursor
   path for a magical trailing effect.
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
  vx: number;
  vy: number;
}

interface TrailPetal {
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
  life: number;
  hue: number;
  saturation: number;
  lightness: number;
  vx: number;
  vy: number;
}

interface Cursor {
  x: number;
  y: number;
  px: number;
  py: number;
  active: boolean;
  dx: number;
  dy: number;
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
    vx: 0,
    vy: 0,
  };
}

function drawPetal(ctx: CanvasRenderingContext2D, p: { x: number; y: number; size: number; rotation: number; hue: number; saturation: number; lightness: number; opacity: number }) {
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

    // ── Trail system ──
    const trail: TrailPetal[] = [];
    const MAX_TRAIL = 60;
    let trailSpawnAccum = 0;

    // ── Cursor tracking ──
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

    // ── Vortex params ──
    const VORTEX_RADIUS = 160;
    const TANGENT_STRENGTH = 3.0;
    const REPULSE_STRENGTH = 0.8;
    const VELOCITY_DECAY = 0.92;
    const MOUSE_SPEED_FACTOR = 0.15;

    // ── Trail params ──
    const TRAIL_SPEED_THRESHOLD = 2;
    const TRAIL_SPAWN_RATE = 0.35;

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.667, 3);
      lastTime = now;
      timeRef.current += 0.016 * dt;
      const t = timeRef.current;
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const cur = cursorRef.current;

      ctx.clearRect(0, 0, cw, ch);

      // ── Spawn trail petals along cursor path ──
      if (cur.active) {
        const mouseSpeed = Math.sqrt(cur.dx * cur.dx + cur.dy * cur.dy);
        if (mouseSpeed > TRAIL_SPEED_THRESHOLD) {
          trailSpawnAccum += mouseSpeed * TRAIL_SPAWN_RATE;
          while (trailSpawnAccum >= 1 && trail.length < MAX_TRAIL) {
            trailSpawnAccum -= 1;
            const col = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
            const sz = 2 + Math.random() * 5;
            const angle = Math.random() * Math.PI * 2;
            const spread = 5 + Math.random() * 12;
            trail.push({
              x: cur.x + Math.cos(angle) * spread,
              y: cur.y + Math.sin(angle) * spread,
              size: sz,
              rotation: Math.random() * 360,
              rotSpeed: (Math.random() - 0.5) * 4,
              fallSpeed: 0.2 + Math.random() * 0.4,
              swayAmp: 8 + Math.random() * 15,
              swayFreq: 0.4 + Math.random() * 0.8,
              swayPhase: Math.random() * Math.PI * 2,
              opacity: 0.5 + Math.random() * 0.4,
              life: 1,
              hue: col.h + (Math.random() - 0.5) * 15,
              saturation: col.s + (Math.random() - 0.5) * 10,
              lightness: col.l + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 0.5,
              vy: (Math.random() - 0.5) * 0.3,
            });
          }
        }
      }

      // ── Update & draw trail petals ──
      for (let i = trail.length - 1; i >= 0; i--) {
        const tp = trail[i];
        tp.life -= 0.012 * dt;
        if (tp.life <= 0) { trail.splice(i, 1); continue; }
        tp.y += tp.fallSpeed * dt;
        tp.x += Math.sin(t * tp.swayFreq + tp.swayPhase) * tp.swayAmp * 0.01 * dt;
        tp.x += tp.vx * dt;
        tp.y += tp.vy * dt;
        tp.rotation += tp.rotSpeed * dt;
        tp.vx *= 0.97;
        tp.vy *= 0.97;
        drawPetal(ctx, { ...tp, opacity: tp.opacity * tp.life * tp.life });
      }

      // ── Update & draw main petals ──
      for (const p of petals) {
        // ── Breeze vortex: tangential swirl + mild radial push ──
        if (cur.active) {
          const ddx = p.x - cur.x;
          const ddy = p.y - cur.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);

          if (dist < VORTEX_RADIUS && dist > 1) {
            const norm = 1 - dist / VORTEX_RADIUS;
            const force = norm * norm * (3 - 2 * norm); // smoothstep

            // Radial unit vector (outward)
            const nx = ddx / dist;
            const ny = ddy / dist;

            // Tangent unit vector (perpendicular)
            const tx = -ny;
            const ty = nx;

            const mouseSpeed = Math.sqrt(cur.dx * cur.dx + cur.dy * cur.dy);
            const speedBoost = 1 + mouseSpeed * MOUSE_SPEED_FACTOR;

            // Swirl direction follows cursor movement cross product
            const cross = cur.dx * ny - cur.dy * nx;
            const swirlDir = cross >= 0 ? 1 : -1;

            // Tangent force — main swirl effect (petals curve around cursor)
            p.vx += tx * TANGENT_STRENGTH * force * speedBoost * swirlDir * dt;
            p.vy += ty * TANGENT_STRENGTH * force * speedBoost * swirlDir * dt;

            // Mild radial push — prevents collapsing into cursor
            p.vx += nx * REPULSE_STRENGTH * force * speedBoost * dt;
            p.vy += ny * REPULSE_STRENGTH * force * speedBoost * dt;

            // Spin from turbulence
            p.rotation += cross * 0.2 * force * dt;
          }
        }

        // Apply velocity with frame-rate independent decay
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(VELOCITY_DECAY, dt);
        p.vy *= Math.pow(VELOCITY_DECAY, dt);

        // Natural falling motion (always runs, never stops)
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

      // Decay cursor delta each frame
      cur.dx *= 0.6;
      cur.dy *= 0.6;

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