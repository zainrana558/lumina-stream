'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   GenreParticles — shared ambient world layer for Horror, Cartoon,
   Romance, Mystery, and Fantasy (Anime has its own, more elaborate
   SakuraCanvas). Canvas-based, not DOM divs, for the same reason
   SakuraCanvas is: real depth.

   Every particle carries a `depth` (0 = far background, 1 = right in
   front of the camera) that drives its size, speed, opacity, and which
   of three blur tiers it draws in — near particles crisp and fast, far
   ones soft and slow, exactly the depth-of-field cue a single flat
   layer of same-size CSS divs can't give you. Particles also tumble
   through the Z axis (a scaleX oscillation, not just a 2D spin) so they
   catch and lose light as they turn, and the whole field parallaxes
   against the pointer — near particles shift more than far ones.

   Props unchanged from the old DOM-div version, so every call site
   (HorrorPage, CartoonPage, RomancePage, MysteryPage, FantasyPage) needs
   no changes at all.
   ═══════════════════════════════════════════════════════════════════ */

type Genre = 'anime' | 'cartoon' | 'horror' | 'romance' | 'mystery' | 'fantasy';

interface GenreParticlesProps {
  genre: Genre;
}

interface Particle {
  x: number; y: number; size: number;
  depth: number; bucket: 0 | 1 | 2;
  hue: number; sat: number; lit: number;
  baseOpacity: number;
  speed: number;                 // px/frame at depth=1, scaled by depth
  swayAmp: number; swayFreq: number; swayPhase: number;
  driftAmp: number; driftFreq: number; driftPhase: number; // small-radius wander (mystery/fantasy)
  rotation: number; rotSpeed: number;
  flipPhase: number; flipFreq: number;
  twinklePhase: number; twinkleFreq: number;
  homeX: number; homeY: number;  // anchor point for particles that wander in place
}

// Per-genre visual recipe. Colors match the previous CSS-div implementation
// so the palette doesn't change, only how it's rendered.
const RECIPES: Record<Exclude<Genre, 'anime'>, {
  count: number;
  colors: { h: number; s: number; l: number }[];
  motion: 'rise' | 'wander';
  shape: 'ember' | 'bubble' | 'heart' | 'spark' | 'star';
  sizeRange: [number, number];
}> = {
  horror:  { count: 26, colors: [{ h: 355, s: 85, l: 42 }, { h: 6, s: 90, l: 50 }], motion: 'rise',   shape: 'ember', sizeRange: [2, 6] },
  cartoon: { count: 22, colors: [{ h: 205, s: 90, l: 72 }, { h: 5, s: 90, l: 76 }, { h: 48, s: 95, l: 70 }, { h: 120, s: 65, l: 75 }, { h: 280, s: 55, l: 78 }], motion: 'rise', shape: 'bubble', sizeRange: [5, 15] },
  romance: { count: 20, colors: [{ h: 344, s: 100, l: 71 }, { h: 350, s: 100, l: 66 }], motion: 'rise', shape: 'heart', sizeRange: [7, 15] },
  mystery: { count: 22, colors: [{ h: 36, s: 90, l: 60 }], motion: 'wander', shape: 'spark', sizeRange: [2, 5] },
  fantasy: { count: 28, colors: [{ h: 280, s: 45, l: 75 }, { h: 48, s: 95, l: 68 }, { h: 197, s: 70, l: 75 }, { h: 300, s: 40, l: 82 }], motion: 'wander', shape: 'star', sizeRange: [3, 7] },
};

function createParticle(genre: Exclude<Genre, 'anime'>, w: number, h: number): Particle {
  const recipe = RECIPES[genre];
  const col = recipe.colors[Math.floor(Math.random() * recipe.colors.length)];
  const rand = Math.random;
  const depth = 0.15 + rand() * 0.85;
  const bucket: 0 | 1 | 2 = depth < 0.4 ? 0 : depth < 0.72 ? 1 : 2;
  const [minSz, maxSz] = recipe.sizeRange;
  const homeX = rand() * w, homeY = rand() * h;
  return {
    x: homeX,
    // Spread across the full visible range (and a bit below) on creation,
    // not bunched below the fold waiting to rise in — otherwise the page
    // looks empty for the first several seconds after every load.
    y: recipe.motion === 'rise' ? h * 1.3 - rand() * h * 1.6 : homeY,
    size: (minSz + rand() * (maxSz - minSz)) * (0.55 + depth * 0.7),
    depth, bucket,
    hue: col.h + (rand() - 0.5) * 6, sat: col.s, lit: col.l + (rand() - 0.5) * 8,
    baseOpacity: (0.35 + rand() * 0.4) * (0.45 + depth * 0.65),
    speed: (0.15 + rand() * 0.35) * (0.4 + depth * 1.1),
    swayAmp: 8 + rand() * 22, swayFreq: 0.2 + rand() * 0.5, swayPhase: rand() * Math.PI * 2,
    driftAmp: 18 + rand() * 40, driftFreq: 0.08 + rand() * 0.18, driftPhase: rand() * Math.PI * 2,
    rotation: rand() * Math.PI * 2, rotSpeed: (rand() - 0.5) * 0.6,
    flipPhase: rand() * Math.PI * 2, flipFreq: 0.1 + rand() * 0.25,
    twinklePhase: rand() * Math.PI * 2, twinkleFreq: 0.5 + rand() * 1.2,
    homeX, homeY,
  };
}

/**
 * Depth-based softness is baked into each shape's own gradients — never a
 * ctx.filter blur pass. Canvas `filter: blur()` composites through the
 * GPU's blur implementation, which on plenty of real hardware renders as
 * visibly stepped/blocky rather than a true gaussian, especially at the
 * small radii ambient particles need. A wider, more gradual gradient
 * falloff is softer AND always smooth, at any zoom or pixel density,
 * because it's just a fill — no separate compositing pass at all.
 */
function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, shape: string) {
  const flip = Math.cos(p.flipPhase);
  const twinkle = 0.6 + Math.sin(p.twinklePhase) * 0.4;
  const alpha = p.baseOpacity * twinkle * (shape === 'star' || shape === 'spark' ? 1 : 0.6 + Math.abs(flip) * 0.4);
  // haze: 0 at full depth (near, crisp) → 1 at zero depth (far, soft/hazy)
  const haze = 1 - p.depth;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  if (shape !== 'spark' && shape !== 'star') ctx.scale(flip, 1);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  const hs = p.size * 0.5;
  const sat = p.sat * (1 - haze * 0.35); // far particles read slightly desaturated — atmospheric perspective
  const hi = Math.min(96, p.lit + 22 - haze * 6);
  const lo = Math.max(20, p.lit - 16);

  switch (shape) {
    case 'ember': {
      // Hot white-yellow core → the particle's own hue → transparent edge.
      // Far embers get a proportionally wider transparent falloff, which
      // reads as "softer" without ever touching ctx.filter.
      const r = hs * (2.1 + haze * 1.3);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `hsla(${p.hue},${Math.max(20, sat - 55)}%,97%,1)`);
      g.addColorStop(0.22, `hsla(${p.hue},${sat}%,${hi}%,.95)`);
      g.addColorStop(0.55, `hsla(${p.hue},${sat}%,${p.lit}%,.55)`);
      g.addColorStop(1, `hsla(${p.hue},${sat}%,${p.lit}%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bubble': {
      // Filled sphere gradient (not a flat tint) so it reads as a lit
      // 3D orb, plus a rim highlight and a small sparkle — three layers
      // instead of one flat ring.
      const g = ctx.createRadialGradient(-hs * 0.3, -hs * 0.35, hs * 0.1, 0, 0, hs);
      g.addColorStop(0, `hsla(${p.hue},${sat}%,${Math.min(94, hi + 6)}%,.5)`);
      g.addColorStop(0.6, `hsla(${p.hue},${sat}%,${p.lit}%,.22)`);
      g.addColorStop(1, `hsla(${p.hue},${sat}%,${lo}%,.16)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, hs, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `hsla(${p.hue},${sat}%,${hi}%,${0.55 - haze * 0.2})`;
      ctx.lineWidth = Math.max(0.5, hs * 0.1);
      ctx.beginPath(); ctx.arc(0, 0, hs * 0.94, -2.4, -0.7); ctx.stroke();
      ctx.beginPath(); ctx.arc(-hs * 0.32, -hs * 0.34, hs * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.6 - haze * 0.25})`; ctx.fill();
      break;
    }
    case 'heart': {
      // Soft bloom behind the heart (a wide, mostly-transparent radial
      // fill) plus the crisp bezier heart on top — the bloom is what
      // gives it warmth/glow without any filter pass.
      const bloomR = hs * (1.8 + haze * 1.1);
      const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, bloomR);
      bloom.addColorStop(0, `hsla(${p.hue},${sat}%,${p.lit}%,.4)`);
      bloom.addColorStop(1, `hsla(${p.hue},${sat}%,${p.lit}%,0)`);
      ctx.fillStyle = bloom;
      ctx.beginPath(); ctx.arc(0, 0, bloomR, 0, Math.PI * 2); ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, hs * 0.7);
      ctx.bezierCurveTo(-hs * 1.1, -hs * 0.1, -hs * 0.5, -hs * 1.05, 0, -hs * 0.35);
      ctx.bezierCurveTo(hs * 0.5, -hs * 1.05, hs * 1.1, -hs * 0.1, 0, hs * 0.7);
      ctx.closePath();
      const g = ctx.createLinearGradient(-hs * 0.5, -hs, hs * 0.3, hs);
      g.addColorStop(0, `hsla(${p.hue},${sat}%,${hi}%,1)`);
      g.addColorStop(0.55, `hsla(${p.hue},${sat}%,${p.lit}%,1)`);
      g.addColorStop(1, `hsla(${p.hue - 6},${Math.min(100, sat + 8)}%,${lo}%,1)`);
      ctx.fillStyle = g;
      ctx.fill();
      break;
    }
    case 'spark': {
      // Three concentric layers — outer halo, mid glow, hot pinpoint
      // center — instead of one gradient circle. Reads as a genuine
      // glint of light rather than a flat blob.
      const r = hs * (1.6 + haze * 1.2);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `hsla(${p.hue},${Math.max(15, sat - 60)}%,98%,1)`);
      g.addColorStop(0.18, `hsla(${p.hue},${sat}%,${hi}%,.9)`);
      g.addColorStop(0.5, `hsla(${p.hue},${sat}%,${p.lit}%,.4)`);
      g.addColorStop(1, `hsla(${p.hue},${sat}%,${p.lit}%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'star': {
      // A proper twinkle: soft glow core + 4 tapered rays (each a thin
      // gradient-filled sliver, bright at the center and fading to
      // nothing at the tip), the classic lens-flare sparkle — not a
      // hard-edged 4-point polygon, which is what read as "lines".
      const glowR = hs * (1.7 + haze * 1.1);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      glow.addColorStop(0, `hsla(${p.hue},${Math.max(15, sat - 50)}%,97%,.95)`);
      glow.addColorStop(0.4, `hsla(${p.hue},${sat}%,${hi}%,.45)`);
      glow.addColorStop(1, `hsla(${p.hue},${sat}%,${p.lit}%,0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();

      const rayLen = hs * (2.6 - haze * 0.8);
      const rayW = Math.max(0.5, hs * 0.16);
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + (i % 2 === 0 ? 0 : Math.PI / 4);
        ctx.save();
        ctx.rotate(a);
        const ray = ctx.createLinearGradient(0, 0, rayLen, 0);
        ray.addColorStop(0, `hsla(${p.hue},${Math.max(15, sat - 50)}%,96%,.85)`);
        ray.addColorStop(1, `hsla(${p.hue},${sat}%,${p.lit}%,0)`);
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(0, -rayW * 0.5);
        ctx.quadraticCurveTo(rayLen * 0.5, -rayW * 0.15, rayLen, 0);
        ctx.quadraticCurveTo(rayLen * 0.5, rayW * 0.15, 0, rayW * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
  }
  ctx.restore();
}

export default function GenreParticles({ genre }: GenreParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (genre === 'anime') return; // anime uses SakuraCanvas instead
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const recipe = RECIPES[genre];
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove);

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
    const particles: Particle[] = Array.from({ length: recipe.count }, () => createParticle(genre, w, h));

    let raf = 0;
    let t = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50) / 16.667;
      lastTime = now;
      t += 0.016 * dt;
      const cw = window.innerWidth, ch = window.innerHeight;
      ctx.clearRect(0, 0, cw, ch);

      for (const p of particles) {
        const sway = Math.sin(t * p.swayFreq + p.swayPhase) * p.swayAmp * 0.01;
        if (recipe.motion === 'rise') {
          p.y -= p.speed * dt;
          p.x = p.homeX + sway * 100 + Math.sin(t * p.swayFreq * 0.5 + p.swayPhase) * p.swayAmp;
          if (p.y < -p.size * 2) {
            p.y = ch + p.size * 2 + Math.random() * 40;
            p.homeX = Math.random() * cw;
          }
        } else {
          // Wander in a small radius around a home point — mystery/fantasy
          // specks that feel alive without traveling across the screen.
          p.x = p.homeX + Math.sin(t * p.driftFreq + p.driftPhase) * p.driftAmp;
          p.y = p.homeY + Math.cos(t * p.driftFreq * 0.7 + p.driftPhase) * p.driftAmp * 0.6;
        }
        p.rotation += p.rotSpeed * 0.02 * dt;
        p.flipPhase += p.flipFreq * 0.02 * dt;
        p.twinklePhase += p.twinkleFreq * 0.02 * dt;
      }

      // Draw far → near so nearer particles correctly occlude farther
      // ones. Softness per bucket comes entirely from each shape's own
      // gradients (see drawParticle) — no ctx.filter pass here.
      const BUCKET_PARALLAX = [3, 9, 18] as const;
      for (let b = 0; b < 3; b++) {
        ctx.save();
        ctx.translate(pointer.x * BUCKET_PARALLAX[b], pointer.y * BUCKET_PARALLAX[b] * 0.6);
        for (const p of particles) if (p.bucket === b) drawParticle(ctx, p, recipe.shape);
        ctx.restore();
      }

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [genre]);

  if (genre === 'anime') return null;

  return (
    <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }} />
  );
}
