'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar({ onSearchOpen }: { onSearchOpen: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <a href="/" className="logo" style={{ fontSize: '1.15rem', textDecoration: 'none' }}>LUMINA</a>
      <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1.2rem,3vw,2.5rem)' }}>
        <Link href="/" className="nl on">Home</Link>
        <Link href="/browse" className="nl">Browse</Link>
        <Link href="/genre/action" className="nl">Genre</Link>
        <button onClick={onSearchOpen} className="btn-icon" style={{ width: 36, height: 36 }} aria-label="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#FFB347,#FF6B8A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', cursor: 'pointer', boxShadow: '0 0 0 2px rgba(255,179,71,.3)' }}>U</div>
      </div>
    </nav>
  );
}
