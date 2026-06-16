'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   SakuraCanvas — Natural falling petals with cursor attraction

   Motion:
   • Falling: direct kinematic (y += speed) — simple, natural, no solver
   • Sway: sine-wave lateral drift — organic, gentle
   • Cursor: spring-offset attraction — petals drift toward cursor,
     spring back when it leaves. No pushing.
   • Wake: cursor leaves fading attractor trail
   • Deformation: bezier control points bend toward cursor (2D rot matrix)

   No Verlet, no force accumulation, no terminal velocity math.
   The falling is meant to feel natural, not physically simulated.
   ═══════════════════════════════════════════════════════════════════ */

const v2Len = (x: number, y: number) => Math.sqrt(x * x + y * y);
const v2Norm = (x: number, y: number, l: number): [number, number] =>
  l > 1e-4 ? [x / l, y / l] : [0, 0];
const rot2 = (x: number, y: number, c: number, s: number): [number, number] =>
  [x * c - y * s, x * s + y * c];

interface Petal {
  x: number; y: number;
  size: number; rotation: number;
  hue: number; sat: number; lit: number; opacity: number;
  fallSpeed: number;
  swayAmp: number; swayFreq: number; swayPhase: number;
  rotSpeed: number;
  // Cursor attraction offset (spring system)
  offX: number; offY: number;
  offVX: number; offVY: number;
  // Vertex deformation
  bendX: number; bendY: number;
  bendVX: number; bendVY: number;
}

interface WakeNode { x: number; y: number; strength: number; life: number; }
interface Cursor { x: number; y: number; vx: number; vy: number; speed: number; active: boolean; }

const COLORS = [
  { h: 340, s: 80, l: 82 }, { h: 345, s: 85, l: 78 },
  { h: 335, s: 75, l: 88 }, { h: 348, s: 90, l: 75 },
  { h: 330, s: 70, l: 90 }, { h: 350, s: 88, l: 80 },
  { h: 342, s: 82, l: 85 },
];

function createPetal(w: number, h: number, tier: 'tiny' | 'medium' | 'large', spread: boolean): Petal {
  const col = COLORS[Math.floor(Math.random() * COLORS.length)];
  const sm = tier === 'tiny' ? 1.4 : tier === 'medium' ? 2.2 : 3.2;
  const sz = (3 + Math.random() * 5) * sm;
  const x = Math.random() * w;
  const y = spread ? Math.random() * h * 1.2 - h * 0.1 : -sz * 2 - Math.random() * h * 0.5;
  return {
    x, y, size: sz,
    rotation: Math.random() * Math.PI * 2,
    hue: col.h + (Math.random() - 0.5) * 10,
    sat: col.s + (Math.random() - 0.5) * 15,
    lit: col.l + (Math.random() - 0.5) * 10,
    opacity: tier === 'tiny' ? 0.25 + Math.random() * 0.25
      : tier === 'medium' ? 0.5 + Math.random() * 0.3
      : 0.7 + Math.random() * 0.25,
    fallSpeed: 0.15 + Math.random() * 0.25
      + (tier === 'tiny' ? 0.05 : tier === 'large' ? -0.03 : 0),
    swayAmp: 20 + Math.random() * 50 + (tier === 'large' ? 30 : 0),
    swayFreq: 0.15 + Math.random() * 0.35,
    swayPhase: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * (tier === 'tiny' ? 1.0 : tier === 'medium' ? 1.8 : 2.5),
    offX: 0, offY: 0, offVX: 0, offVY: 0,
    bendX: 0, bendY: 0, bendVX: 0, bendVY: 0,
  };
}

function drawPetal(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, rot: number,
  hue: number, sat: number, lit: number, opacity: number,
  bx: number, by: number,
) {
  const hs = size * 0.5;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const [lbx, lby] = rot2(bx, by, cos, -sin);
  const bn = Math.min(v2Len(bx, by) / 30, 1);
  const tb = bn * hs * 0.6;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = opacity;

  ctx.beginPath();
  ctx.moveTo(0, -hs + lby * 0.3);
  ctx.bezierCurveTo(
    hs * 0.8 + lbx * tb * 0.7, -hs * 0.6 + lby * tb * 0.5,
    hs + lbx * tb * 0.3, hs * 0.2 + lby * tb * 0.1, 0, hs);
  ctx.bezierCurveTo(
    -hs + lbx * tb * 0.3, hs * 0.2 + lby * tb * 0.1,
    -hs * 0.8 + lbx * tb * 0.7, -hs * 0.6 + lby * tb * 0.5,
    0, -hs + lby * 0.3);
  ctx.closePath();

  const g = ctx.createLinearGradient(0, -hs, 0, hs);
  g.addColorStop(0, `hsla(${hue}, ${Math.min(100, sat - 30)}%, ${Math.min(97, lit + 12)}%, 1)`);
  g.addColorStop(0.4, `hsla(${hue}, ${sat}%, ${lit}%, 1)`);
  g.addColorStop(1, `hsla(${hue - 5}, ${Math.min(100, sat + 10)}%, ${Math.max(50, lit - 15)}%, 1)`);
  ctx.fillStyle = g;
  ctx.fill();

  if (size > 10) {
    ctx.beginPath();
    ctx.moveTo(lbx * tb * 0.1, -hs * 0.6 + lby * tb * 0.4);
    ctx.quadraticCurveTo(lbx * tb * 0.15, 0, 0, hs * 0.7);
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${Math.max(40, lit - 25)}%, ${opacity * 0.3})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  ctx.restore();
}

export default function SakuraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const timeRef = useRef(0);
  const cursorRef = useRef<Cursor>({ x: -9999, y: -9999, vx: 0, vy: 0, speed: 0, active: false });

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
    for (let i = 0; i < 180; i++) petals.push(createPetal(w, h, 'tiny', true));
    for (let i = 0; i < 50; i++) petals.push(createPetal(w, h, 'medium', true));
    for (let i = 0; i < 20; i++) petals.push(createPetal(w, h, 'large', true));

    // ── Wake trail ──
    const wake: WakeNode[] = [];
    const MAX_WAKE = 30;
    const WAKE_LIFE = 40;
    const WAKE_RADIUS = 100;
    let wakeAccum = 0;

    // ── Cursor ──
    const onMouseMove = (e: MouseEvent) => {
      const c = cursorRef.current;
      c.vx = e.clientX - c.x; c.vy = e.clientY - c.y;
      c.x = e.clientX; c.y = e.clientY;
      c.speed = v2Len(c.vx, c.vy);
      c.active = true;
    };
    const onMouseLeave = () => { cursorRef.current.active = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    // ── Cursor attraction params ──
    const ATTRACT_R = 200;
    const ATTRACT_FORCE = 0.25;  // strong enough for visible 40px+ drift
    const SPRING_K = 0.006;      // weak spring — lets petals drift far toward cursor
    const SPRING_DAMP = 0.95;    // smooth settle, no oscillation
    const WAKE_FORCE = 0.06;

    // ── Bend params (minimal — user wants attraction, not deformation) ──
    const BEND_K = 0.06;
    const BEND_DAMP = 0.80;
    const BEND_MAX = 5;  // nearly invisible — just a hint of curvature

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50) / 16.667;
      lastTime = now;
      timeRef.current += 0.016 * dt;
      const t = timeRef.current;
      const cw = window.innerWidth, ch = window.innerHeight;
      const cur = cursorRef.current;

      cur.vx *= 0.85; cur.vy *= 0.85;
      cur.speed = v2Len(cur.vx, cur.vy);

      // Spawn wake
      if (cur.active && cur.speed > 2) {
        wakeAccum += cur.speed * 0.025 * dt;
        while (wakeAccum >= 1 && wake.length < MAX_WAKE) {
          wakeAccum -= 1;
          wake.push({
            x: cur.x + (Math.random() - 0.5) * 8,
            y: cur.y + (Math.random() - 0.5) * 8,
            strength: Math.min(cur.speed / 10, 1), life: 1,
          });
        }
      }
      for (let i = wake.length - 1; i >= 0; i--) {
        wake[i].life -= dt / WAKE_LIFE;
        if (wake[i].life <= 0) wake.splice(i, 1);
      }

      ctx.clearRect(0, 0, cw, ch);

      for (const p of petals) {
        // ════════════════════════════════════
        // 1) NATURAL FALLING — kinematic, direct
        // ════════════════════════════════════
        // Gentle downward drift + cosine sway (derivative-based for smoothness)
        p.y += p.fallSpeed * dt;
        p.x += Math.cos(t * p.swayFreq + p.swayPhase) * p.swayAmp * 0.003 * dt;
        p.rotation += p.rotSpeed * 0.015 * dt;  // slow gentle tumble

        // ════════════════════════════════════
        // 2) CURSOR ATTRACTION — spring offset
        // ════════════════════════════════════
        if (cur.active) {
          const dx = cur.x - p.x, dy = cur.y - p.y;
          const dist = v2Len(dx, dy);
          if (dist < ATTRACT_R && dist > 1) {
            const norm = 1 - dist / ATTRACT_R;
            const force = norm * norm * (3 - 2 * norm); // smoothstep
            const [nx, ny] = v2Norm(dx, dy, dist);
            p.offVX += nx * ATTRACT_FORCE * force * dt;
            p.offVY += ny * ATTRACT_FORCE * force * dt;
          }
        }

        // Wake attraction
        for (const wn of wake) {
          const dx = wn.x - p.x, dy = wn.y - p.y;
          const dist = v2Len(dx, dy);
          if (dist < WAKE_RADIUS && dist > 1) {
            const norm = 1 - dist / WAKE_RADIUS;
            const [nx, ny] = v2Norm(dx, dy, dist);
            const f = norm * norm * WAKE_FORCE * wn.strength * wn.life * wn.life * dt;
            p.offVX += nx * f;
            p.offVY += ny * f;
          }
        }

        // Spring back to zero offset
        p.offVX -= p.offX * SPRING_K * dt;
        p.offVY -= p.offY * SPRING_K * dt;
        // Damping
        p.offVX *= Math.pow(SPRING_DAMP, dt);
        p.offVY *= Math.pow(SPRING_DAMP, dt);
        // Integrate offset
        p.offX += p.offVX * dt;
        p.offY += p.offVY * dt;

        // ════════════════════════════════════
        // 3) VERTEX BEND — toward cursor
        // ════════════════════════════════════
        if (cur.active) {
          const dx = cur.x - p.x, dy = cur.y - p.y;
          const dist = v2Len(dx, dy);
          if (dist < ATTRACT_R * 0.7 && dist > 1) {
            const [nx, ny] = v2Norm(dx, dy, dist);
            const prox = 1 - dist / (ATTRACT_R * 0.7);
            const sp = prox * prox * (3 - 2 * prox);
            p.bendVX += (nx * BEND_MAX * sp - p.bendX) * BEND_K * dt;
            p.bendVY += (ny * BEND_MAX * sp - p.bendY) * BEND_K * dt;
          }
        }
        p.bendVX -= p.bendX * BEND_K * 0.5 * dt;
        p.bendVY -= p.bendY * BEND_K * 0.5 * dt;
        p.bendVX *= Math.pow(BEND_DAMP, dt);
        p.bendVY *= Math.pow(BEND_DAMP, dt);
        p.bendX += p.bendVX * dt;
        p.bendY += p.bendVY * dt;

        // ════════════════════════════════════
        // 4) RESPAWN
        // ════════════════════════════════════
        if (p.y > ch + p.size * 2) {
          p.y = -p.size * 2 - Math.random() * 60;
          p.x = Math.random() * cw;
          p.swayPhase = Math.random() * Math.PI * 2;
          p.offX = 0; p.offY = 0; p.offVX = 0; p.offVY = 0;
          p.bendX = 0; p.bendY = 0; p.bendVX = 0; p.bendVY = 0;
        }
        if (p.x > cw + 80) p.x = -80;
        if (p.x < -80) p.x = cw + 80;

        drawPetal(ctx, p.x + p.offX, p.y + p.offY, p.size, p.rotation,
          p.hue, p.sat, p.lit, p.opacity, p.bendX, p.bendY);
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
    <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }} />
  );
}