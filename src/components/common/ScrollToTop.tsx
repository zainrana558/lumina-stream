'use client';

import { useState, useEffect } from 'react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fn = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(scrollY > 400);
      setProgress(docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0);
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  if (!visible) return null;

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      style={{
        position: 'fixed', bottom: 88, right: 20, zIndex: 9000,
        width: 42, height: 42, borderRadius: '50%',
        background: 'rgba(12,9,26,.85)', border: '1px solid rgba(255,179,71,.3)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: '.85rem', color: '#FFF5E8',
        boxShadow: '3px 3px 12px rgba(0,0,0,.7), -1px -1px 4px rgba(45,25,90,.2), inset 0 1px 0 rgba(255,255,255,.08)',
        animation: 'fi .25s ease both',
        transition: 'all .2s',
        padding: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,179,71,.6)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,179,71,.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <svg width="42" height="42" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
        <circle cx="21" cy="21" r={radius} fill="none" stroke="rgba(255,179,71,.12)" strokeWidth="2" />
        <circle
          cx="21" cy="21" r={radius} fill="none"
          stroke="rgba(255,179,71,.55)" strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .15s ease-out' }}
        />
      </svg>
      <span style={{ position: 'relative', zIndex: 1 }}>↑</span>
    </button>
  );
}
