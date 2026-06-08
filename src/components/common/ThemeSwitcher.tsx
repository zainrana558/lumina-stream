'use client';

import { useState, useEffect, useRef } from 'react';
import { CS } from '@/styles/themes';

const THEME_NAMES = ['Moon', 'Lightning', 'Leaf', 'Fire', 'Ocean', 'Spark', 'Sunrise', 'Galaxy'] as const;

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem('lumina-theme');
    if (saved !== null) {
      const idx = parseInt(saved);
      if (!isNaN(idx) && idx >= 0 && idx < 8) return idx;
    }
    return 0;
  });
  const ref = useRef<HTMLDivElement>(null);

  const applyTheme = (idx: number) => {
    const scheme = CS[idx];
    const root = document.documentElement;
    root.style.setProperty('--accent', scheme.acc);
    root.style.setProperty('--accent2', scheme.acc + 'AA');
    root.style.setProperty('--accent3', scheme.base);
  };

  useEffect(() => {
    const saved = localStorage.getItem('lumina-theme');
    if (saved !== null) {
      const idx = parseInt(saved);
      if (!isNaN(idx) && idx >= 0 && idx < 8) {
        applyTheme(idx);
      }
    }
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const select = (idx: number) => {
    setActive(idx);
    localStorage.setItem('lumina-theme', String(idx));
    applyTheme(idx);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'fixed', bottom: 78, right: 20, zIndex: 100 }}>
      {/* Main button */}
      <button
        onClick={() => setOpen(!open)}
        className="btn-icon"
        style={{
          width: 42, height: 42, fontSize: '1.1rem',
          transition: 'all .3s cubic-bezier(.34,1.56,.64,1)',
          transform: open ? 'scale(1.1)' : 'scale(1)',
          boxShadow: open
            ? `0 0 0 2px ${CS[active].acc}55, 6px 6px 18px rgba(0,0,0,.78),-2px -2px 6px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.12),0 0 20px ${CS[active].acc}22`
            : undefined,
        }}
      >
        🎨
      </button>

      {/* Palette panel */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 52, right: 0,
          background: 'var(--s1)', borderRadius: 16, padding: '12px',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
          boxShadow: '12px 12px 32px rgba(0,0,0,.88),-4px -4px 12px rgba(45,25,90,.22),inset 0 1.5px 0 rgba(255,255,255,.05),0 0 0 1px rgba(255,255,255,.05)',
          animation: 'page-in .25s cubic-bezier(.34,1.56,.64,1) both',
          minWidth: 180,
        }}>
          {THEME_NAMES.map((name, i) => (
            <button
              key={name}
              onClick={() => select(i)}
              title={name}
              style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: CS[i].acc,
                boxShadow: active === i
                  ? `0 0 0 2.5px #FFF5E8, 0 0 14px ${CS[i].acc}80`
                  : `inset 2px 2px 4px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.08)`,
                transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
                transform: active === i ? 'scale(1.15)' : 'scale(1)',
                fontSize: '.55rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: active === i ? '#05020A' : 'transparent',
                fontWeight: 700,
              }}
              onMouseEnter={(e) => {
                if (active !== i) {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = `0 0 10px ${CS[i].acc}55, inset 2px 2px 4px rgba(0,0,0,.4)`;
                }
              }}
              onMouseLeave={(e) => {
                if (active !== i) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '';
                }
              }}
            >
              {active === i ? '✓' : ''}
            </button>
          ))}
          <div style={{
            gridColumn: '1/-1', textAlign: 'center',
            fontFamily: "'Cinzel',serif", fontSize: '.6rem',
            color: CS[active].acc, letterSpacing: '.1em', marginTop: 2,
          }}>
            {THEME_NAMES[active]}
          </div>
        </div>
      )}
    </div>
  );
}
