'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'circle' | 'rect';
  life: number;
  maxLife: number;
}

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

const COLORS = ['#FFB347', '#FF6B8A', '#8B78FF', '#4ECDC4', '#FFF5E8', '#FFD700', '#FF85A1'];

function createParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 4 + Math.random() * 8;
    const maxLife = 80 + Math.random() * 60;
    particles.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight * 0.15,
      vx: Math.cos(angle) * speed * (0.5 + Math.random()),
      vy: Math.sin(angle) * speed * -1 - 3,
      size: 3 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
      life: 0,
      maxLife,
    });
  }
  return particles;
}

export default function Confetti({ active, onComplete }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const activeRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // Keep onCompleteRef in sync (in effect, not during render)
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Store animate in a ref to allow self-reference in rAF loop
  const animateRef = useRef<() => void>(() => {});

  // Define the animation function via ref to avoid "access before declaration"
  useEffect(() => {
    animateRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      let alive = 0;
      particlesRef.current.forEach(p => {
        if (p.life >= p.maxLife) return;
        alive++;

        p.life++;
        p.vy += 0.15; // gravity
        p.vx *= 0.99; // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, 1 - p.life / p.maxLife);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      });

      if (alive > 0) {
        animRef.current = requestAnimationFrame(animateRef.current);
      } else {
        activeRef.current = false;
        onCompleteRef.current?.();
      }
    };
  }, []);

  useEffect(() => {
    if (active && !activeRef.current) {
      activeRef.current = true;
      particlesRef.current = createParticles(70);
      animRef.current = requestAnimationFrame(animateRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [active]);

  // Early return AFTER all hooks (React rules of hooks)
  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        pointerEvents: 'none',
        width: '100%', height: '100%',
      }}
    />
  );
}