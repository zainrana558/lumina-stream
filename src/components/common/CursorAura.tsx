'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════
   CursorAura — GSAP-powered cursor follower with speed-reactive
   scaling. Multiple layered rings create a soft sakura-pink aura
   that follows the cursor with staggered easing.

   Based on the FollowBox pattern:
   • Outer ring follows with more delay (larger stagger)
   • Inner ring is more responsive
   • Scale pulses with cursor movement speed
   ═══════════════════════════════════════════════════════════════ */

const RINGS = [
  { size: 200, blur: 40, opacity: 0.07, color: '255,133,162', delay: 0.15 },
  { size: 120, blur: 25, opacity: 0.10, color: '255,183,197', delay: 0.08 },
  { size: 60,  blur: 12, opacity: 0.15, color: '255,200,214', delay: 0.03 },
] as const;

export default function CursorAura() {
  const containerRef = useRef<HTMLDivElement>(null);
  const ringsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const rings = ringsRef.current.filter(Boolean);
    if (!rings.length) return;

    // Initial state: centered off-screen, invisible
    rings.forEach(r => {
      gsap.set(r, { xPercent: -50, yPercent: -50, scale: 0 });
    });

    const speedMapper = gsap.utils.mapRange(0, 35, 0, 1);
    const clamp = gsap.utils.clamp(0, 1);

    const onMove = (e: MouseEvent) => {
      const speed = Math.abs(e.movementX) + Math.abs(e.movementY);
      const mappedSpeed = clamp(speedMapper(speed));

      rings.forEach((r, i) => {
        gsap.to(r, {
          duration: 0.6,
          overwrite: 'auto',
          x: e.clientX,
          y: e.clientY,
          ease: 'power2.out',
          delay: RINGS[i].delay * (i * 0.5),
        });

        gsap.to(r, {
          duration: 0.35,
          overwrite: 'auto',
          ease: 'power2.out',
          scale: 0.3 + mappedSpeed * 0.7,
          delay: RINGS[i].delay * (i * 0.5),
        });
      });
    };

    const onLeave = () => {
      rings.forEach((r, i) => {
        gsap.to(r, {
          duration: 0.5,
          overwrite: 'auto',
          scale: 0,
          ease: 'power2.in',
          delay: i * 0.05,
        });
      });
    };

    const onEnter = () => {
      rings.forEach((r, i) => {
        gsap.to(r, {
          duration: 0.4,
          overwrite: 'auto',
          scale: 0.3,
          ease: 'power2.out',
          delay: i * 0.05,
        });
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none' }}>
      {RINGS.map((ring, i) => (
        <div
          key={i}
          ref={el => { if (el) ringsRef.current[i] = el; }}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: ring.size,
            height: ring.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${ring.color},${ring.opacity}) 0%, rgba(${ring.color},0) 70%)`,
            filter: `blur(${ring.blur}px)`,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}