'use client';

import { useState, useEffect } from 'react';

const BADGES: Record<string, { min: number; label: string; color: string }> = {
  explorer: { min: 0,  label: 'Explorer',  color: '#78D621' },
  regular: { min: 5,  label: 'Regular',  color: '#FFB347' },
  veteran: { min: 15, label: 'Veteran',  color: '#FFD700' },
};

const STORAGE_KEY = 'lumina-genre-visits';

function getVisits(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getBadge(count: number) {
  if (count >= BADGES.veteran.min) return BADGES.veteran;
  if (count >= BADGES.regular.min) return BADGES.regular;
  if (count >= BADGES.explorer.min) return BADGES.explorer;
  return null;
}

export function trackGenreVisit(genre: string) {
  try {
    const visits = getVisits();
    visits[genre] = (visits[genre] || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch {}
}

interface GenreProgressProps {
  genre: string;
}

export default function GenreProgress({ genre }: GenreProgressProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const visits = getVisits();
    setCount(visits[genre] || 0);

    const handler = () => {
      const v = getVisits();
      setCount(v[genre] || 0);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [genre]);

  const badge = getBadge(count);
  if (!badge || count === 0) return null;

  return (
    <div className="f-mono"
      style={{
        position: 'absolute', top: 6, right: 6,
        display: 'flex', alignItems: 'center', gap: 3,
        padding: '2px 8px',
        borderRadius: 10,
        background: 'rgba(0,0,0,.55)',
        backdropFilter: 'blur(6px)',
        border: `1px solid ${badge.color}30`,
        zIndex: 10,
        fontSize: '.55rem',
        
        color: badge.color,
        letterSpacing: '.04em',
        opacity: 0.85,
        animation: 'card-in .4s both',
      }}
      title={`${count} visits -- ${badge.label}`}
    >
      <span>{count}</span>
    </div>
  );
}
