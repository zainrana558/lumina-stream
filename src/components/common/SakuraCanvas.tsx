'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   SakuraCanvas — Production petal physics engine

   Physics:
   • Verlet integration for stable, frame-rate independent motion
   • Gravitational potential field centered on cursor
   • Per-petal mass affects response (large = heavier = slower pull)
   • Velocity-field wake: cursor leaves decaying force trail behind it
   • 2D rotation matrix for petal orientation
   • Per-vertex bezier deformation under force gradient

   Visual:
   • ~250 petals in 3 tiers (atmosphere / mid / hero)
   • Petals deform (bend) toward cursor via control-point displacement
   • When cursor stops → field decays → spring restores → petals drift back
   ═══════════════════════════════════════════════════════════════════ */

// ── Vector2 helpers (inlined for perf — no object allocation) ──
const vec2Len = (x: number, y: number) => Math.sqrt(x * x + y * y);
const vec2Norm = (x: number, y: number, len: number) => len > 0.0001 ? [x / len, y / len] as const : [0, 0] as const;
const vec2Dot = (ax: number, ay: number, bx: number, by: number) => ax * bx + ay * by;
const vec2Cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;
// 2D rotation matrix: rotate vector (x,y) by angle radians
const rot2 = (x: number, y: number, cos: number, sin: number) => [x * cos - y * sin, x * sin + y * cos] as const;

// Smoothstep (Hermite interpolation)
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// ── Types ──
interface Petal {
  // Position (Verlet: current + previous for integration)
  cx: number; cy: number;   // current position
  px: number; py: number;   // previous position
  // Base fall trajectory (natural drift)
  baseX: number; baseY: number;
  // Appearance
  size: number;
  rotation: number;
  hue: number; sat: number; lit: number; opacity: number;
  // Physics properties
  mass: number;              // affects how much cursor pulls (larger = heavier)
  fallSpeed: number;
  swayAmp: number; swayFreq: number; swayPhase: number;
  rotSpeed: number;
  // Deformation state — per-vertex displacement for bezier bending
  bendX: number; bendY: number;       // current bend vector
  bendVX: number; bendVY: number;     // bend velocity
}

interface WakeNode {
  x: number; y: number;
  strength: number;  // decays over time
  life: number;      // 0..1
}

interface Cursor {
  x: number; y: number;
  px: number; py: number;
  vx: number; vy: number;   // velocity
  speed: number;
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
  const mass = tier === 'tiny' ? 0.4 + Math.random() * 0.3
    : tier === 'medium' ? 0.8 + Math.random() * 0.4
    : 1.4 + Math.random() * 0.6;

  const x = Math.random() * w;
  const y = spread ? Math.random() * h * 1.2 - h * 0.1 : -baseSize * 2 - Math.random() * h * 0.5;

  return {
    cx: x, cy: y,
    px: x, py: y,
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

// ── Draw petal with vertex-level deformation ──
// Control points are displaced by bend vector → petal visually bends toward cursor
function drawPetal(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, rotation: number,
  hue: number, sat: number, lit: number, opacity: number,
  bendX: number, bendY: number,
) {
  const halfS = size * 0.5;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  // Bend magnitude determines how much control points shift
  const bendMag = vec2Len(bendX, bendY);
  const bendNorm = Math.min(bendMag / 30, 1); // normalize 0..1
  // Rotate bend into petal local space for correct directional deformation
  const [localBX, localBY] = rot2(bendX, bendY, cos, -sin);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;

  // ── Deformed bezier petal ──
  // Top control points bend toward cursor, bottom stays anchored
  // This creates a natural "reaching" curve like petals in wind
  const tipBend = bendNorm * halfS * 0.6;

  ctx.beginPath();
  ctx.moveTo(0, -halfS + localBY * 0.3);
  // Right curve: top CP bends, bottom CP stays
  ctx.bezierCurveTo(
    halfS * 0.8 + localBX * tipBend * 0.7, -halfS * 0.6 + localBY * tipBend * 0.5,
    halfS + localBX * tipBend * 0.3, halfS * 0.2 + localBY * tipBend * 0.1,
    0, halfS
  );
  // Left curve: mirrored
  ctx.bezierCurveTo(
    -halfS + localBX * tipBend * 0.3, halfS * 0.2 + localBY * tipBend * 0.1,
    -halfS * 0.8 + localBX * tipBend * 0.7, -halfS * 0.6 + localBY * tipBend * 0.5,
    0, -halfS + localBY * 0.3
  );
  ctx.closePath();

  // Gradient fill
  const grad = ctx.createLinearGradient(0, -halfS, 0, halfS);
  grad.addColorStop(0, `hsla(${hue}, ${Math.min(100, sat - 30)}%, ${Math.min(97, lit + 12)}%, 1)`);
  grad.addColorStop(0.4, `hsla(${hue}, ${sat}%, ${lit}%, 1)`);
  grad.addColorStop(1, `hsla(${hue - 5}, ${Math.min(100, sat + 10)}%, ${Math.max(50, lit - 15)}%, 1)`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Center vein (deforms with the petal)
  if (size > 10) {
    ctx.beginPath();
    ctx.moveTo(localBX * tipBend * 0.1, -halfS * 0.6 + localBY * tipBend * 0.4);
    ctx.quadraticCurveTo(
      localBX * tipBend * 0.15, 0,
      0, halfS * 0.7
    );
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
    x: -9999, y: -9999, px: -9999, py: -9999,
    vx: 0, vy: 0, speed: 0, active: false,
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

    const w = window.innerWidth;
    const h = window.innerHeight;
    const petals: Petal[] = [];

    for (let i = 0; i < 180; i++) petals.push(createPetal(w, h, 'tiny', true));
    for (let i = 0; i < 50; i++) petals.push(createPetal(w, h, 'medium', true));
    for (let i = 0; i < 20; i++) petals.push(createPetal(w, h, 'large', true));

    // ── Cursor velocity field wake ──
    const wake: WakeNode[] = [];
    const MAX_WAKE = 40;
    const WAKE_LIFETIME = 1.2; // seconds
    const WAKE_RADIUS = 120;
    const WAKE_FORCE = 2.5;
    let wakeSpawnAccum = 0;

    // ── Cursor tracking ──
    const onMouseMove = (e: MouseEvent) => {
      const c = cursorRef.current;
      c.px = c.x; c.py = c.y;
      c.x = e.clientX; c.y = e.clientY;
      c.vx = c.x - c.px; c.vy = c.y - c.py;
      c.speed = vec2Len(c.vx, c.vy);
      c.active = true;
    };
    const onMouseLeave = () => { cursorRef.current.active = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    // ── Physics constants ──
    const GRAVITY_FIELD_RADIUS = 240;   // cursor gravitational influence range
    const GRAVITY_CONSTANT = 800;       // gravitational pull strength (F = G * m / r²)
    const GRAVITY_SOFTENING = 40;       // prevents singularity at r→0
    const RESTORE_STIFFNESS = 2.8;      // spring constant pulling back to base trajectory
    const RESTORE_DAMPING = 0.92;       // velocity damping on restore
    const BEND_STIFFNESS = 4.0;         // how fast bend deformation responds
    const BEND_DAMPING = 0.85;          // bend velocity damping
    const BEND_MAX = 35;               // max bend displacement in pixels
    const VERLET_DAMPING = 0.985;       // global Verlet velocity damping

    let lastTime = performance.now();

    const animate = (now: number) => {
      const rawDt = (now - lastTime) / 1000; // seconds
      const dt = Math.min(rawDt, 0.05);      // cap at 50ms
      lastTime = now;
      timeRef.current += dt;
      const t = timeRef.current;
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const cur = cursorRef.current;
      const dtSq = dt * dt;

      // ── Update cursor velocity (decays when no new events) ──
      cur.vx *= 0.85;
      cur.vy *= 0.85;
      cur.speed = vec2Len(cur.vx, cur.vy);

      // ── Spawn wake nodes along cursor path ──
      if (cur.active && cur.speed > 1.5) {
        wakeSpawnAccum += cur.speed * 0.04;
        while (wakeSpawnAccum >= 1 && wake.length < MAX_WAKE) {
          wakeSpawnAccum -= 1;
          wake.push({
            x: cur.x + (Math.random() - 0.5) * 8,
            y: cur.y + (Math.random() - 0.5) * 8,
            strength: Math.min(cur.speed / 15, 1),
            life: 1,
          });
        }
      }

      // ── Update wake nodes ──
      for (let i = wake.length - 1; i >= 0; i--) {
        const wn = wake[i];
        wn.life -= dt / WAKE_LIFETIME;
        if (wn.life <= 0) { wake.splice(i, 1); }
      }

      ctx.clearRect(0, 0, cw, ch);

      // ── Physics step for each petal ──
      for (const p of petals) {
        // ── Accumulate forces ──
        let fx = 0, fy = 0;

        // 1) Cursor gravitational field: F = G * m / (r² + softening²)
        //    Direction: toward cursor
        if (cur.active) {
          const dx = cur.x - p.cx;
          const dy = cur.y - p.cy;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          if (dist < GRAVITY_FIELD_RADIUS) {
            // Inverse-square with softening
            const forceMag = (GRAVITY_CONSTANT * p.mass) / (distSq + GRAVITY_SOFTENING * GRAVITY_SOFTENING);
            // Smoothstep boundary falloff
            const boundaryForce = smoothstep(GRAVITY_FIELD_RADIUS, GRAVITY_FIELD_RADIUS * 0.3, dist);
            const finalForce = forceMag * boundaryForce;

            const [nx, ny] = vec2Norm(dx, dy, dist);
            fx += nx * finalForce;
            fy += ny * finalForce;
          }
        }

        // 2) Wake field: each wake node exerts a gentle pull
        for (const wn of wake) {
          const dx = wn.x - p.cx;
          const dy = wn.y - p.cy;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          if (dist < WAKE_RADIUS && dist > 1) {
            const forceMag = (WAKE_FORCE * wn.strength * wn.life * wn.life * p.mass)
              / (distSq + 900);
            const [nx, ny] = vec2Norm(dx, dy, dist);
            fx += nx * forceMag;
            fy += ny * forceMag;
          }
        }

        // 3) Spring restore: pull toward base trajectory (Verlet-constraint style)
        const toBaseX = p.baseX - p.cx;
        const toBaseY = p.baseY - p.cy;
        fx += toBaseX * RESTORE_STIFFNESS;
        fy += toBaseY * RESTORE_STIFFNESS;

        // ── Verlet integration ──
        // new_pos = current + (current - previous) * damping + acceleration * dt²
        const vx = (p.cx - p.px) * VERLET_DAMPING;
        const vy = (p.cy - p.py) * VERLET_DAMPING;
        // Acceleration = Force / mass (Newton's 2nd law)
        const ax = fx / p.mass;
        const ay = fy / p.mass;

        p.px = p.cx;
        p.py = p.cy;
        p.cx += vx + ax * dtSq;
        p.cy += vy + ay * dtSq;

        // ── Update base trajectory (natural fall) ──
        p.baseY += p.fallSpeed * dt * 60; // scale to ~60fps equivalent
        p.baseX += Math.sin(t * p.swayFreq + p.swayPhase) * p.swayAmp * 0.008 * dt * 60;

        // ── Rotation: angular velocity from torque (cross product of force × radius) ──
        // Torque from cursor attraction causes spin
        if (cur.active) {
          const dx = cur.x - p.cx;
          const dy = cur.y - p.cy;
          const dist = vec2Len(dx, dy);
          if (dist < GRAVITY_FIELD_RADIUS && dist > 1) {
            // Torque = r × F (2D cross product gives scalar)
            const rForceX = fx * p.mass; // total force in cursor direction
            const rForceY = fy * p.mass;
            const torque = vec2Cross(dx, dy, rForceX, rForceY) / (dist * dist + 100);
            p.rotation += torque * dt * 0.3;
          }
        }
        // Natural rotation
        p.rotation += p.rotSpeed * dt;

        // ── Per-vertex bend deformation ──
        // Bend direction = toward cursor (or dominant force direction)
        if (cur.active) {
          const dx = cur.x - p.cx;
          const dy = cur.y - p.cy;
          const dist = vec2Len(dx, dy);
          if (dist < GRAVITY_FIELD_RADIUS * 0.8 && dist > 1) {
            const [nx, ny] = vec2Norm(dx, dy, dist);
            const targetBendX = nx * BEND_MAX * smoothstep(GRAVITY_FIELD_RADIUS * 0.8, 0, dist);
            const targetBendY = ny * BEND_MAX * smoothstep(GRAVITY_FIELD_RADIUS * 0.8, 0, dist);
            // Spring-damper toward target bend
            p.bendVX += (targetBendX - p.bendX) * BEND_STIFFNESS * dt;
            p.bendVY += (targetBendY - p.bendY) * BEND_STIFFNESS * dt;
          }
        }
        // Bend restore (spring back to unbent)
        p.bendVX -= p.bendX * BEND_STIFFNESS * 0.5 * dt;
        p.bendVY -= p.bendY * BEND_STIFFNESS * 0.5 * dt;
        p.bendVX *= Math.pow(BEND_DAMPING, dt * 60);
        p.bendVY *= Math.pow(BEND_DAMPING, dt * 60);
        p.bendX += p.bendVX * dt;
        p.bendY += p.bendVY * dt;

        // ── Respawn when base falls off screen ──
        if (p.baseY > ch + p.size * 2) {
          const newX = Math.random() * cw;
          const newY = -p.size * 2 - Math.random() * 40;
          // Reset Verlet positions to new spawn
          p.cx = newX; p.cy = newY;
          p.px = newX; p.py = newY;
          p.baseX = newX; p.baseY = newY;
          p.swayPhase = Math.random() * Math.PI * 2;
          p.rotSpeed = (Math.random() - 0.5) * (p.size < 10 ? 1.5 : p.size < 20 ? 2.5 : 3.5);
          p.bendX = 0; p.bendY = 0; p.bendVX = 0; p.bendVY = 0;
        }
        // Wrap base horizontally
        if (p.baseX > cw + 60) p.baseX = -60;
        if (p.baseX < -60) p.baseX = cw + 60;

        // ── Draw ──
        drawPetal(ctx, p.cx, p.cy, p.size, p.rotation,
          p.hue, p.sat, p.lit, p.opacity,
          p.bendX, p.bendY);
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