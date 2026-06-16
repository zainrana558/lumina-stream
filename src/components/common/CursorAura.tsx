'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════
   CursorAura — GSAP-driven petal trail that follows the cursor

   A pool of sakura petals orbit and trail behind the cursor using
   GSAP tweens for buttery-smooth following with staggered delays.
   Each petal has its own bezier-curve shape, soft pink gradient,
   and gentle rotation. Petals scatter outward on fast movement
   and reconverge when the cursor slows.
   ═══════════════════════════════════════════════════════════════ */

const PETAL_COUNT = 18;

interface TrailPetal {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  hue: number;
  sat: number;
  lit: number;
  opacity: number;
  angle: number;        // orbital angle around cursor
  orbitRadius: number;  // base distance from cursor center
  scatter: number;      // extra scatter on fast movement
  delay: number;        // GSAP follow delay (staggered)
}

const COLORS = [
  { h: 340, s: 80, l: 82 }, { h: 345, s: 85, l: 78 },
  { h: 335, s: 75, l: 88 }, { h: 348, s: 90, l: 75 },
  { h: 330, s: 70, l: 90 }, { h: 350, s: 88, l: 80 },
  { h: 342, s: 82, l: 85 },
];

function drawPetalShape(ctx: CanvasRenderingContext2D, size: number, hue: number, sat: number, lit: number, opacity: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = size * dpr;
  ctx.clearRect(0, 0, px * 3, px * 3);
  ctx.save();
  ctx.translate(px * 1.5, px * 1.5);

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
  ctx.globalAlpha = opacity;
  ctx.fill();

  // Subtle vein for larger petals
  if (size > 8) {
    ctx.beginPath();
    ctx.moveTo(0, -hs * 0.6);
    ctx.quadraticCurveTo(hs * 0.05, 0, 0, hs * 0.7);
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${Math.max(40, lit - 25)}%, ${opacity * 0.3})`;
    ctx.lineWidth = 0.6 * dpr;
    ctx.stroke();
  }

  ctx.restore();
}

function createTrailPetal(index: number): TrailPetal {
  const canvas = document.createElement('canvas');
  const col = COLORS[Math.floor(Math.random() * COLORS.length)];
  // Mix of small, medium petals for the trail
  const size = 6 + Math.random() * 12;
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

  drawPetalShape(ctx, size, hue, sat, lit, 1);

  return {
    el: canvas,
    ctx,
    x: -100,
    y: -100,
    size,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 2.5,
    hue, sat, lit,
    opacity: 0.55 + Math.random() * 0.35,
    angle: (index / PETAL_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8,
    orbitRadius: 12 + Math.random() * 35,
    scatter: 0,
    delay: 0.06 + index * 0.018, // Staggered delays for trailing
  };
}

export default function CursorAura() {
  const containerRef = useRef<HTMLDivElement>(null);
  const petalsRef = useRef<TrailPetal[]>([]);
  const rafRef = useRef(0);
  const cursorRef = useRef({ x: -200, y: -200, speed: 0, visible: false });
  const targetScatterRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create petal pool
    const petals: TrailPetal[] = [];
    for (let i = 0; i < PETAL_COUNT; i++) {
      const petal = createTrailPetal(i);
      petal.el.style.position = 'absolute';
      petal.el.style.top = '0';
      petal.el.style.left = '0';
      petal.el.style.willChange = 'transform';
      petal.el.style.pointerEvents = 'none';
      petal.el.style.filter = 'drop-shadow(0 0 3px rgba(255,150,180,0.3))';
      container.appendChild(petal.el);
      petals.push(petal);
    }
    petalsRef.current = petals;

    const speedMapper = gsap.utils.mapRange(0, 40, 0, 1);
    const clamp = gsap.utils.clamp(0, 1);

    // GSAP quickTo for smooth scatter interpolation
    const scatterTween = { value: 0 };
    const scatterTo = gsap.quickTo(scatterTween, 'value', {
      duration: 0.4,
      ease: 'power2.out',
    });

    const onMove = (e: MouseEvent) => {
      const speed = Math.abs(e.movementX) + Math.abs(e.movementY);
      const mappedSpeed = clamp(speedMapper(speed));
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.speed = mappedSpeed;
      cursorRef.current.visible = true;

      // More scatter on fast movement
      scatterTo(mappedSpeed * 45);
    };

    const onLeave = () => {
      cursorRef.current.visible = false;
      scatterTo(0);
    };

    const onEnter = () => {
      cursorRef.current.visible = true;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    // Animation loop — updates petal positions each frame
    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50) / 16.667;
      lastTime = now;
      const { x: cx, y: cy, visible } = cursorRef.current;
      const scatter = scatterTween.value;

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];

        // GSAP smooth follow with per-petal staggered delay
        gsap.to(p, {
          x: cx,
          y: cy,
          duration: 0.5 + p.delay * 0.6,
          ease: 'power2.out',
          overwrite: 'auto',
        });

        // Calculate orbital position around the smoothed (x, y)
        const orbAngle = p.angle + now * 0.0004 * (i % 2 === 0 ? 1 : -1);
        const effectiveRadius = p.orbitRadius + scatter * (0.5 + (i / PETAL_COUNT) * 0.5);

        const offsetX = Math.cos(orbAngle) * effectiveRadius;
        const offsetY = Math.sin(orbAngle) * effectiveRadius * 0.6; // Slight elliptical

        // Gentle rotation
        p.rotation += p.rotSpeed * 0.02 * dt;

        // Fade based on visibility and distance
        const targetOpacity = visible ? p.opacity : 0;

        const drawSize = Math.ceil(p.size * 3);
        const halfDraw = drawSize / 2;

        p.el.style.transform = `translate(${p.x + offsetX - halfDraw}px, ${p.y + offsetY - halfDraw}px) rotate(${p.rotation}rad)`;
        p.el.style.opacity = String(targetOpacity);
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