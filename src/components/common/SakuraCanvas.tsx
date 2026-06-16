'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   SakuraCanvas — Production petal physics engine

   Integration: Verlet with frame-normalized timestep (dt=1 @60fps).
   All constants are in per-frame units for intuitive tuning while
   dt normalization handles frame-rate independence.

   Forces:
   • Gravitational potential field: F = G·m / (r² + ε²), inverse-square
   • Per-petal mass → acceleration = F/m (Newton's 2nd)
   • Wake velocity field: cursor leaves decaying attractor nodes
   • Spring-damper restore to natural trajectory

   Vertex math:
   • 2D rotation matrix for local-space bend deformation
   • Per-control-point bezier displacement (tip bends, base anchors)
   • 2D cross product for torque-driven angular velocity
   ═══════════════════════════════════════════════════════════════════ */

// ── Inline vector math (zero allocation) ──
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

// ── Types ──
interface Petal {
  cx: number; cy: number;   // Verlet current
  px: number; py: number;   // Verlet previous
  baseX: number; baseY: number; // natural trajectory anchor
  size: number;
  rotation: number;
  hue: number; sat: number; lit: number; opacity: number;
  mass: number;
  fallSpeed: number;
  swayAmp: number; swayFreq: number; swayPhase: number;
  rotSpeed: number;
  bendX: number; bendY: number;     // bezier deformation
  bendVX: number; bendVY: number;
}

interface WakeNode {
  x: number; y: number;
  strength: number;
  life: number;
}

interface Cursor {
  x: number; y: number;
  vx: number; vy: number;
  speed: number;
  active: boolean;
}

const PETAL_COLORS = [
  { h: 340, s: 80, l: 82 }, { h: 345, s: 85, l: 78 },
  { h: 335, s: 75, l: 88 }, { h: 348, s: 90, l: 75 },
  { h: 330, s: 70, l: 90 }, { h: 350, s: 88, l: 80 },
  { h: 342, s: 82, l: 85 },
];

function createPetal(w: number, h: number, tier: 'tiny' | 'medium' | 'large', spread: boolean): Petal {
  const col = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
  const sizeMulti = tier === 'tiny' ? 1.4 : tier === 'medium' ? 2.2 : 3.2;
  const baseSize = (3 + Math.random() * 5) * sizeMulti;
  const mass = tier === 'tiny' ? 0.5 + Math.random() * 0.3
    : tier === 'medium' ? 1.0 + Math.random() * 0.5
    : 1.8 + Math.random() * 0.7;
  const x = Math.random() * w;
  const y = spread ? Math.random() * h * 1.2 - h * 0.1 : -baseSize * 2 - Math.random() * h * 0.5;
  return {
    cx: x, cy: y, px: x, py: y,
    baseX: x, baseY: y,
    size: baseSize,
    rotation: Math.random() * Math.PI * 2,
    hue: col.h + (Math.random() - 0.5) * 10,
    sat: col.s + (Math.random() - 0.5) * 15,
    lit: col.l + (Math.random() - 0.5) * 10,
    opacity: tier === 'tiny' ? 0.25 + Math.random() * 0.25
      : tier === 'medium' ? 0.5 + Math.random() * 0.3
      : 0.7 + Math.random() * 0.25,
    mass,
    fallSpeed: 0.3 + Math.random() * 0.6 + (tier === 'tiny' ? 0.15 : tier === 'large' ? -0.05 : 0),
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
  // Transform bend into petal local space via 2D rotation matrix
  const [lbx, lby] = rot2(bendX, bendY, cos, -sin);
  const bendNorm = Math.min(v2Len(bendX, bendY) / 30, 1);
  const tipBend = bendNorm * hs * 0.6;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = opacity;

  // Deformed bezier — tip control points shift, base stays anchored
  ctx.beginPath();
  ctx.moveTo(0, -hs + lby * 0.3);
  ctx.bezierCurveTo(
    hs * 0.8 + lbx * tipBend * 0.7, -hs * 0.6 + lby * tipBend * 0.5,
    hs + lbx * tipBend * 0.3, hs * 0.2 + lby * tipBend * 0.1,
    0, hs
  );
  ctx.bezierCurveTo(
    -hs + lbx * tipBend * 0.3, hs * 0.2 + lby * tipBend * 0.1,
    -hs * 0.8 + lbx * tipBend * 0.7, -hs * 0.6 + lby * tipBend * 0.5,
    0, -hs + lby * 0.3
  );
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, -hs, 0, hs);
  grad.addColorStop(0, `hsla(${hue}, ${Math.min(100, sat - 30)}%, ${Math.min(97, lit + 12)}%, 1)`);
  grad.addColorStop(0.4, `hsla(${hue}, ${sat}%, ${lit}%, 1)`);
  grad.addColorStop(1, `hsla(${hue - 5}, ${Math.min(100, sat + 10)}%, ${Math.max(50, lit - 15)}%, 1)`);
  ctx.fillStyle = grad;
  ctx.fill();

  if (size > 10) {
    ctx.beginPath();
    ctx.moveTo(lbx * tipBend * 0.1, -hs * 0.6 + lby * tipBend * 0.4);
    ctx.quadraticCurveTo(lbx * tipBend * 0.15, 0, 0, hs * 0.7);
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
  const cursorRef = useRef<Cursor>({
    x: -9999, y: -9999, vx: 0, vy: 0, speed: 0, active: false,
  });

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
    const MAX_WAKE = 35;
    const WAKE_LIFETIME = 50;   // frames (~0.8s @60fps)
    const WAKE_RADIUS = 130;
    const WAKE_G = 1800;        // wake gravitational strength
    let wakeSpawnAccum = 0;

    // ── Cursor tracking ──
    const onMouseMove = (e: MouseEvent) => {
      const c = cursorRef.current;
      const nx = e.clientX, ny = e.clientY;
      c.vx = nx - c.x; c.vy = ny - c.y;
      c.x = nx; c.y = ny;
      c.speed = v2Len(c.vx, c.vy);
      c.active = true;
    };
    const onMouseLeave = () => { cursorRef.current.active = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    // ════════════════════════════════════════════
    // Physics constants (frame-normalized: dt=1 @60fps)
    // ════════════════════════════════════════════
    const FIELD_RADIUS = 260;
    const GRAVITY_G = 5500;       // gravitational constant for cursor field
    const SOFTENING = 35;         // ε: prevents 1/r² singularity
    const RESTORE_K = 0.018;      // spring stiffness → base trajectory
    const RESTORE_DAMP = 0.96;    // Verlet velocity damping
    const BEND_K = 0.12;          // bend spring stiffness
    const BEND_DAMP = 0.88;       // bend velocity damping
    const BEND_MAX = 32;          // max pixel displacement for bend
    const FALL_SCALE = 1.0;       // base fall speed multiplier
    const SWAY_SCALE = 0.008;     // sway amplitude multiplier

    let lastTime = performance.now();

    const animate = (now: number) => {
      // Frame-normalized dt: 1.0 at 60fps, 2.0 at 30fps, etc.
      const dtMs = Math.min(now - lastTime, 50);
      lastTime = now;
      const dt = dtMs / 16.667;  // 1.0 @ 60fps
      timeRef.current += 0.016 * dt;
      const t = timeRef.current;
      const cw = window.innerWidth, ch = window.innerHeight;
      const cur = cursorRef.current;

      // Decay cursor velocity between mouse events
      cur.vx *= Math.pow(0.82, dt);
      cur.vy *= Math.pow(0.82, dt);
      cur.speed = v2Len(cur.vx, cur.vy);

      // ── Spawn wake nodes ──
      if (cur.active && cur.speed > 2) {
        wakeSpawnAccum += cur.speed * 0.03 * dt;
        while (wakeSpawnAccum >= 1 && wake.length < MAX_WAKE) {
          wakeSpawnAccum -= 1;
          wake.push({
            x: cur.x + (Math.random() - 0.5) * 10,
            y: cur.y + (Math.random() - 0.5) * 10,
            strength: Math.min(cur.speed / 12, 1),
            life: 1,
          });
        }
      }
      // Decay wake
      for (let i = wake.length - 1; i >= 0; i--) {
        wake[i].life -= dt / WAKE_LIFETIME;
        if (wake[i].life <= 0) wake.splice(i, 1);
      }

      ctx.clearRect(0, 0, cw, ch);

      for (const p of petals) {
        let fx = 0, fy = 0;

        // ── 1) Cursor gravitational field ──
        //    F = G·m / (r² + ε²),  direction: toward cursor
        if (cur.active) {
          const dx = cur.x - p.cx;
          const dy = cur.y - p.cy;
          const rSq = dx * dx + dy * dy;
          const r = Math.sqrt(rSq);

          if (r < FIELD_RADIUS) {
            // Inverse-square with softening
            const F = (GRAVITY_G * p.mass) / (rSq + SOFTENING * SOFTENING);
            // Smoothstep boundary: full strength inside, fades to 0 at edge
            const boundary = smoothstep(FIELD_RADIUS, FIELD_RADIUS * 0.35, r);
            const [nx, ny] = v2Norm(dx, dy, r);
            fx += nx * F * boundary;
            fy += ny * F * boundary;
          }
        }

        // ── 2) Wake field: each node is a decaying attractor ──
        for (let i = 0; i < wake.length; i++) {
          const wn = wake[i];
          const dx = wn.x - p.cx;
          const dy = wn.y - p.cy;
          const rSq = dx * dx + dy * dy;
          const r = Math.sqrt(rSq);
          if (r < WAKE_RADIUS && r > 1) {
            const F = (WAKE_G * wn.strength * wn.life * wn.life * p.mass)
              / (rSq + 800);
            const [nx, ny] = v2Norm(dx, dy, r);
            fx += nx * F;
            fy += ny * F;
          }
        }

        // ── 3) Spring restore → base trajectory ──
        fx += (p.baseX - p.cx) * RESTORE_K;
        fy += (p.baseY - p.cy) * RESTORE_K;

        // ── Verlet integration ──
        // v = (current - previous) * damping  (implicit velocity)
        // a = F / m  (Newton's 2nd)
        // new_pos = current + v·dt + a·dt²
        const vx = (p.cx - p.px) * Math.pow(RESTORE_DAMP, dt);
        const vy = (p.cy - p.py) * Math.pow(RESTORE_DAMP, dt);
        const ax = fx / p.mass;
        const ay = fy / p.mass;

        p.px = p.cx;
        p.py = p.cy;
        p.cx += vx * dt + ax * dt * dt;
        p.cy += vy * dt + ay * dt * dt;

        // ── Advance base trajectory (natural fall) ──
        p.baseY += p.fallSpeed * FALL_SCALE * dt;
        p.baseX += Math.sin(t * p.swayFreq + p.swayPhase) * p.swayAmp * SWAY_SCALE * dt;

        // ── Torque-driven rotation (2D cross product: r × F) ──
        if (cur.active) {
          const dx = cur.x - p.cx, dy = cur.y - p.cy;
          const r = v2Len(dx, dy);
          if (r < FIELD_RADIUS && r > 5) {
            const torque = v2Cross(dx, dy, fx, fy) / (r * r + 200);
            p.rotation += torque * dt * 0.02;
          }
        }
        p.rotation += p.rotSpeed * dt;

        // ── Per-vertex bend deformation ──
        // Bend target: toward cursor, magnitude by proximity
        if (cur.active) {
          const dx = cur.x - p.cx, dy = cur.y - p.cy;
          const r = v2Len(dx, dy);
          if (r < FIELD_RADIUS * 0.75 && r > 1) {
            const [nx, ny] = v2Norm(dx, dy, r);
            const proximity = smoothstep(FIELD_RADIUS * 0.75, 20, r);
            const targetBX = nx * BEND_MAX * proximity;
            const targetBY = ny * BEND_MAX * proximity;
            // Spring-damper toward target
            p.bendVX += (targetBX - p.bendX) * BEND_K * dt;
            p.bendVY += (targetBY - p.bendY) * BEND_K * dt;
          }
        }
        // Always restore bend toward zero
        p.bendVX -= p.bendX * BEND_K * 0.4 * dt;
        p.bendVY -= p.bendY * BEND_K * 0.4 * dt;
        p.bendVX *= Math.pow(BEND_DAMP, dt);
        p.bendVY *= Math.pow(BEND_DAMP, dt);
        p.bendX += p.bendVX * dt;
        p.bendY += p.bendVY * dt;

        // ── Respawn ──
        if (p.baseY > ch + p.size * 2) {
          const nx2 = Math.random() * cw;
          const ny2 = -p.size * 2 - Math.random() * 40;
          p.cx = nx2; p.cy = ny2; p.px = nx2; p.py = ny2;
          p.baseX = nx2; p.baseY = ny2;
          p.swayPhase = Math.random() * Math.PI * 2;
          p.rotSpeed = (Math.random() - 0.5) * (p.size < 10 ? 1.5 : p.size < 20 ? 2.5 : 3.5);
          p.bendX = 0; p.bendY = 0; p.bendVX = 0; p.bendVY = 0;
        }
        if (p.baseX > cw + 60) p.baseX = -60;
        if (p.baseX < -60) p.baseX = cw + 60;

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
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}
    />
  );
}