'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   SakuraCanvas — Production petal physics engine

   All motion is force-driven through Verlet integration.
   No kinematic position hacks — gravity, sway, cursor attraction,
   and wake field are all forces competing in the same solver.

   Forces (accumulated per petal per frame):
   1. Constant gravity (downward) — drives falling
   2. Oscillating sway force (lateral) — drives gentle drift
   3. Cursor gravitational field: F = G·m / (r² + ε²)
   4. Wake velocity field — decaying attractor nodes
   5. Weak spring to base trajectory — prevents long-term drift

   Integration: Störmer-Verlet with frame-normalized dt (1.0 @60fps)
   Vertex: 2D rotation matrix for per-control-point bezier deformation
   Torque: 2D cross product (r × F) for angular acceleration
   ═══════════════════════════════════════════════════════════════════ */

const v2Len = (x: number, y: number) => Math.sqrt(x * x + y * y);
const v2Norm = (x: number, y: number, len: number): [number, number] =>
  len > 1e-4 ? [x / len, y / len] : [0, 0];
const v2Cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;
const rot2 = (x: number, y: number, c: number, s: number): [number, number] =>
  [x * c - y * s, x * s + y * c];
const smoothstep = (lo: number, hi: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

interface Petal {
  cx: number; cy: number;   // Verlet current position
  px: number; py: number;   // Verlet previous position
  size: number;
  rotation: number;
  hue: number; sat: number; lit: number; opacity: number;
  mass: number;
  fallSpeed: number;       // target fall rate (maps to gravity force)
  swayAmp: number; swayFreq: number; swayPhase: number;
  rotSpeed: number;
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
  const mass = tier === 'tiny' ? 0.5 + Math.random() * 0.3
    : tier === 'medium' ? 1.0 + Math.random() * 0.5
    : 1.8 + Math.random() * 0.7;
  const fallSpeed = 0.3 + Math.random() * 0.6
    + (tier === 'tiny' ? 0.15 : tier === 'large' ? -0.05 : 0);
  const x = Math.random() * w;
  const y = spread ? Math.random() * h * 1.2 - h * 0.1 : -sz * 2 - Math.random() * h * 0.5;

  return {
    cx: x, cy: y,
    // Pre-seed Verlet with downward velocity matching terminal v
    // v_term = fallSpeed × GRAV_SCALE / (1−DAMP) = fallSpeed × 0.286
    px: x, py: y - fallSpeed * 0.286,
    size: sz,
    rotation: Math.random() * Math.PI * 2,
    hue: col.h + (Math.random() - 0.5) * 10,
    sat: col.s + (Math.random() - 0.5) * 15,
    lit: col.l + (Math.random() - 0.5) * 10,
    opacity: tier === 'tiny' ? 0.25 + Math.random() * 0.25
      : tier === 'medium' ? 0.5 + Math.random() * 0.3
      : 0.7 + Math.random() * 0.25,
    mass,
    fallSpeed,
    swayAmp: 15 + Math.random() * 45 + (tier === 'large' ? 25 : 0),
    swayFreq: 0.3 + Math.random() * 0.6,
    swayPhase: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * (tier === 'tiny' ? 1.5 : tier === 'medium' ? 2.5 : 3.5),
    bendX: 0, bendY: 0, bendVX: 0, bendVY: 0,
  };
}

function drawPetal(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, rot: number,
  hue: number, sat: number, lit: number, opacity: number,
  bendX: number, bendY: number,
) {
  const hs = size * 0.5;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const [lbx, lby] = rot2(bendX, bendY, cos, -sin);
  const bn = Math.min(v2Len(bendX, bendY) / 30, 1);
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

    // ── Wake velocity field ──
    const wake: WakeNode[] = [];
    const MAX_WAKE = 30;
    const WAKE_LIFE = 45;      // frames
    const WAKE_RADIUS = 120;
    const WAKE_G = 90;         // per-frame wake pull
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

    // ═══════════════════════════════════════════════════════
    // Physics constants (frame-normalized: dt ≡ 1 @ 60fps)
    //
    // Terminal velocity: v_term = a / (1 − damping)
    // Damping = 0.965 → (1−d) = 0.035
    //
    // Per-petal gravity: g = fallSpeed × 0.025
    //   Tiny  (0.45-0.75): terminal 0.32-0.54 px/f (slow atmosphere)
    //   Medium(0.30-0.90): terminal 0.21-0.64 px/f
    //   Large (0.25-0.85): terminal 0.18-0.61 px/f
    //
    // Cursor field: F/m = G/(r²+ε²)
    //   At r=80:  a = 1200/6725 = 0.178  (10× gravity → strong pull)
    //   At r=150: a = 1200/23225 = 0.052 (3× gravity → visible)
    //   At r=250: a = 1200/63725 = 0.019 (≈ gravity → gentle nudge)
    // ═══════════════════════════════════════════════════════
    const DAMP = 0.965;
    const GRAV_SCALE = 0.010;    // per-petal: g = fallSpeed × this (slower fall)
    const SWAY_ACCEL = 0.12;

    const FIELD_R = 280;          // cursor field radius (wider reach)
    const FIELD_G = 1200;         // cursor gravitational constant (6× stronger)
    const FIELD_EPS = 35;
    const FIELD_INNER = 0.25;     // full strength below 25% of radius (70px)

    const WAKE_G_LOCAL = 400;     // wake pull (scaled up with field)
    const BEND_K = 0.1;
    const BEND_DAMP = 0.88;
    const BEND_MAX = 30;

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50) / 16.667;
      lastTime = now;
      timeRef.current += 0.016 * dt;
      const t = timeRef.current;
      const cw = window.innerWidth, ch = window.innerHeight;
      const cur = cursorRef.current;

      // Cursor velocity decay between events
      const cvDecay = Math.pow(0.82, dt);
      cur.vx *= cvDecay; cur.vy *= cvDecay;
      cur.speed = v2Len(cur.vx, cur.vy);

      // Spawn wake nodes
      if (cur.active && cur.speed > 2) {
        wakeAccum += cur.speed * 0.03 * dt;
        while (wakeAccum >= 1 && wake.length < MAX_WAKE) {
          wakeAccum -= 1;
          wake.push({
            x: cur.x + (Math.random() - 0.5) * 10,
            y: cur.y + (Math.random() - 0.5) * 10,
            strength: Math.min(cur.speed / 12, 1), life: 1,
          });
        }
      }
      for (let i = wake.length - 1; i >= 0; i--) {
        wake[i].life -= dt / WAKE_LIFE;
        if (wake[i].life <= 0) wake.splice(i, 1);
      }

      ctx.clearRect(0, 0, cw, ch);
      const dampF = Math.pow(DAMP, dt);

      for (const p of petals) {
        let fx = 0, fy = 0;

        // ── Force 1: Per-petal gravity (constant downward) ──
        // Each petal has its own g based on fallSpeed → natural speed variation
        // F = m·g_petal, terminal v = fallSpeed × GRAV_SCALE / (1−DAMP)
        fy += p.mass * p.fallSpeed * GRAV_SCALE;

        // ── Force 2: Sway (oscillating lateral) ──
        // Cosine-derived acceleration for smooth back-and-forth
        fx += Math.cos(t * p.swayFreq + p.swayPhase) * p.swayAmp * SWAY_ACCEL * 0.001;

        // ── Force 3: Cursor gravitational field ──
        // F = G·m / (r² + ε²) with smoothstep boundary
        if (cur.active) {
          const dx = cur.x - p.cx, dy = cur.y - p.cy;
          const rSq = dx * dx + dy * dy;
          const r = Math.sqrt(rSq);
          if (r < FIELD_R) {
            const F = (FIELD_G * p.mass) / (rSq + FIELD_EPS * FIELD_EPS);
            const boundary = smoothstep(FIELD_R, FIELD_R * FIELD_INNER, r);
            const [nx, ny] = v2Norm(dx, dy, r);
            fx += nx * F * boundary;
            fy += ny * F * boundary;
          }
        }

        // ── Force 4: Wake field ──
        for (let i = 0; i < wake.length; i++) {
          const wn = wake[i];
          const dx = wn.x - p.cx, dy = wn.y - p.cy;
          const rSq = dx * dx + dy * dy;
          const r = Math.sqrt(rSq);
          if (r < WAKE_RADIUS && r > 1) {
            const F = (WAKE_G_LOCAL * wn.strength * wn.life * wn.life * p.mass) / (rSq + 600);
            const [nx, ny] = v2Norm(dx, dy, r);
            fx += nx * F;
            fy += ny * F;
          }
        }

        // ── Störmer-Verlet integration ──
        // Implicit velocity: v = (x_curr − x_prev) · damping
        // Acceleration:     a = F / m   (Newton's 2nd law)
        // Position update:   x_new = x_curr + v·dt + a·dt²
        const vx = (p.cx - p.px) * dampF;
        const vy = (p.cy - p.py) * dampF;
        const ax = fx / p.mass;
        const ay = fy / p.mass;

        p.px = p.cx; p.py = p.cy;
        p.cx += vx * dt + ax * dt * dt;
        p.cy += vy * dt + ay * dt * dt;

        // ── Torque: τ = r × F  (2D cross → scalar) ──
        if (cur.active) {
          const dx = cur.x - p.cx, dy = cur.y - p.cy;
          const r = v2Len(dx, dy);
          if (r < FIELD_R && r > 5) {
            const torque = v2Cross(dx, dy, ax, ay) / (r + 30);
            p.rotation += torque * dt * 0.08;
          }
        }
        p.rotation += p.rotSpeed * dt;

        // ── Per-vertex bend deformation ──
        if (cur.active) {
          const dx = cur.x - p.cx, dy = cur.y - p.cy;
          const r = v2Len(dx, dy);
          if (r < FIELD_R * 0.75 && r > 1) {
            const [nx, ny] = v2Norm(dx, dy, r);
            const prox = smoothstep(FIELD_R * 0.75, 20, r);
            p.bendVX += (nx * BEND_MAX * prox - p.bendX) * BEND_K * dt;
            p.bendVY += (ny * BEND_MAX * prox - p.bendY) * BEND_K * dt;
          }
        }
        p.bendVX -= p.bendX * BEND_K * 0.4 * dt;
        p.bendVY -= p.bendY * BEND_K * 0.4 * dt;
        p.bendVX *= Math.pow(BEND_DAMP, dt);
        p.bendVY *= Math.pow(BEND_DAMP, dt);
        p.bendX += p.bendVX * dt;
        p.bendY += p.bendVY * dt;

        // ── Respawn ──
        if (p.cy > ch + p.size * 2) {
          const nx2 = Math.random() * cw;
          const ny2 = -p.size * 2 - Math.random() * 40;
          p.cx = nx2; p.cy = ny2;
          p.px = nx2; p.py = ny2 - p.fallSpeed * 0.286; // pre-seed terminal velocity
          p.swayPhase = Math.random() * Math.PI * 2;
          p.rotSpeed = (Math.random() - 0.5) * (p.size < 10 ? 1.5 : p.size < 20 ? 2.5 : 3.5);
          p.bendX = 0; p.bendY = 0; p.bendVX = 0; p.bendVY = 0;
        }
        if (p.cx > cw + 60) { p.cx = -60; p.px = -60 - p.fallSpeed * 0.3; }
        if (p.cx < -60) { p.cx = cw + 60; p.px = cw + 60 - p.fallSpeed * 0.3; }

        drawPetal(ctx, p.cx, p.cy, p.size, p.rotation,
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