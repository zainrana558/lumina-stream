'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaItem, TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import MediaCard from '@/components/common/MediaCard';

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const handleClose = useCallback(() => { setOpen(false); onClose(); }, [onClose]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=1`);
        const data = await res.json();
        const items = (data.results || [])
          .filter((r: TMDBShow) => r.poster_path && (r.media_type === 'movie' || r.media_type === 'tv'))
          .map((r: TMDBShow) => tmdbToMedia(r));
        setResults(items);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  if (!open) return null;

  return (
    <div className="search-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{ width: '100%', maxWidth: 700, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV shows..."
            style={{
              width: '100%', padding: '16px 20px 16px 48px',
              background: '#090716', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16,
              color: '#FFF5E8', fontFamily: "'Crimson Pro',serif", fontSize: '1.1rem',
              outline: 'none',
              boxShadow: 'inset 5px 5px 14px rgba(0,0,0,.75),inset -2px -2px 6px rgba(35,20,75,.2)',
            }}
          />
          <div style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', opacity: .4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <button onClick={handleClose} className="btn-icon" style={{ flexShrink: 0 }} aria-label="Close search">✕</button>
        </div>
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 280, borderRadius: 14 }} />
            ))}
          </div>
        )}
        {!loading && results.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 16, maxHeight: '60vh', overflowY: 'auto' }} className="hide-scroll">
            {results.map((item) => (
              <div key={item.id} onClick={() => { handleClose(); router.push(`/details/${item.id}`); }} style={{ cursor: 'pointer' }}>
                <MediaCard item={item} size="sm" />
              </div>
            ))}
          </div>
        )}
        {!loading && query && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,245,232,.4)', fontFamily: "'Cinzel',serif", fontSize: '1rem' }}>
            No results found for &quot;{query}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
