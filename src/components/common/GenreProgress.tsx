'use client';

import { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';

const BADGES: Record<string, { min: number; label: string; color: string }> = {
  explorer: { min: 0,  label: 'Explorer',  color: '#78D621' },
  regular: { min: 5,  label: 'Regular',  color: '#FFB347' },
  veteran: { min: 15, label: 'Veteran',  color: '#FFD700' },
};

const STORAGE_KEY = 'lumina-genre-visits';

// ─── localStorage helpers (fallback) ──────────────────────────────────────────

function getLocalVisits(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalVisits(visits: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch {}
}

function getBadge(count: number) {
  if (count >= BADGES.veteran.min) return BADGES.veteran;
  if (count >= BADGES.regular.min) return BADGES.regular;
  if (count >= BADGES.explorer.min) return BADGES.explorer;
  return null;
}

// ─── Track a genre visit (called from genre pages) ───────────────────────────

export function trackGenreVisit(genre: string) {
  // Always update localStorage immediately (fast, no network)
  const visits = getLocalVisits();
  visits[genre] = (visits[genre] || 0) + 1;
  setLocalVisits(visits);

  // Fire-and-forget Supabase update (cross-device sync)
  if (isSupabaseConfigured()) {
    fetch('/api/genre-visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre }),
    }).catch(() => {});
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface GenreProgressProps {
  genre: string;
}

export default function GenreProgress({ genre }: GenreProgressProps) {
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Load visit count: Supabase first, localStorage fallback
  const loadCount = useCallback(async () => {
    // Start with localStorage value (synchronous, fast)
    const localCount = getLocalVisits()[genre] || 0;
    setCount(localCount);

    // Try Supabase for cross-device count
    if (isSupabaseConfigured()) {
      try {
        const res = await fetch('/api/genre-visits');
        const data = await res.json() as { visits?: Record<string, number> };
        const serverCount = data.visits?.[genre] ?? 0;
        // Use the higher of local vs server (merge)
        const merged = Math.max(localCount, serverCount);
        setCount(merged);
        if (serverCount > localCount) {
          // Sync server count down to localStorage
          const visits = getLocalVisits();
          visits[genre] = serverCount;
          setLocalVisits(visits);
        }
      } catch {
        // Keep localStorage value
      }
    }
    setLoaded(true);
  }, [genre]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  // Listen for localStorage changes (other tabs)
  useEffect(() => {
    const handler = () => {
      setCount(getLocalVisits()[genre] || 0);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [genre]);

  const badge = getBadge(count);
  if (!badge || count === 0 || !loaded) return null;

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