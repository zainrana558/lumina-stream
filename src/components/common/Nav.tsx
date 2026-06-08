'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/contexts/AppContext';
import NotificationBell from '@/components/common/NotificationBell';

interface NavProps {
  page: string;
  go: (target: string) => void;
  openSearch: () => void;
  user: User | null;
  profile: UserProfile | null;
  onSignOut: () => void;
  onShowShortcuts?: () => void;
}

const GENRE_LINKS = [
  { key: 'anime', label: 'Anime', color: '#FF0096' },
  { key: 'cartoon', label: 'Cartoon', color: '#74B9FF' },
  { key: 'horror', label: 'Horror', color: '#DC143C' },
  { key: 'romance', label: 'Romance', color: '#FF6B8A' },
  { key: 'mystery', label: 'Mystery', color: '#FFB347' },
  { key: 'fantasy', label: 'Fantasy', color: '#C39BD3' },
];

export default function Nav({ page, go, openSearch, user, profile, onSignOut, onShowShortcuts }: NavProps) {
  const router = useRouter();
  const [drop, setDrop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [genreDrop, setGenreDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const genreRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDrop(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) setGenreDrop(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDrop(false); setMenuOpen(false); setGenreDrop(false); }
    };
    if (drop || menuOpen || genreDrop) document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [drop, menuOpen, genreDrop]);

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: close mobile menu on navigation
    setMenuOpen(false);
    // eslint-enable-next-line react-hooks/set-state-in-effect
  }, [page]);

  const displayName = profile?.name || (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Dreamer');
  const displayEmail = user?.email || '';

  const menuItems = [
    { key: 'home', label: 'Home' },
    { key: 'shows', label: 'Browse' },
    { key: 'genre', label: 'Genres' },
    { key: 'watchlist', label: 'Watchlist' },
    { key: 'collections', label: 'Collections' },
    { key: 'activity', label: 'Activity' },
    { key: 'stats', label: 'Stats' },
  ] as const;

  const handleMenuNav = (item: { key: string }) => {
    setMenuOpen(false);
    if (item.key === 'genre') {
      router.push('/genre/anime');
      return;
    }
    go(item.key);
  };

  return (
    <nav className="nav" aria-label="Main navigation">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(.6rem,2vw,1.2rem)' }}>
        {/* Hamburger for mobile */}
        <button
          className="btn-icon"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          style={{ display: 'none', width: 32, height: 32, fontSize: '1rem' }}
        >=</button>
        <div onClick={() => go('home')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') go('home'); }} style={{ cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
          <span className="logo" style={{ fontSize: 'clamp(1.05rem,2vw,1.35rem)' }}>LUMINA</span>
          <span style={{ fontSize: '.42rem', letterSpacing: '.35em', color: 'rgba(255,179,71,.5)', display: 'block', textAlign: 'right', fontFamily: "'Cinzel',serif", marginTop: -2 }}>STREAM</span>
        </div>
      </div>

      <div className="nav-links" style={{ display: 'flex', gap: 'clamp(1.2rem,2.5vw,2.5rem)', alignItems: 'center' }}>
        {([['home', 'Home'], ['shows', 'Browse']] as const).map(([p, l]) => (
          <span key={p} className={`nl${page === p ? ' on' : ''}`} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(p); } }} onClick={() => go(p)}>{l}</span>
        ))}
        {/* Genre dropdown */}
        <div
          ref={genreRef}
          style={{ position: 'relative' }}
          onMouseEnter={() => setGenreDrop(true)}
          onMouseLeave={() => setGenreDrop(false)}
        >
          <span
            className={`nl${page === 'genre' ? ' on' : ''}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGenreDrop(!genreDrop); } }}
            onClick={() => setGenreDrop(!genreDrop)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Genres
            <svg width="10" height="6" viewBox="0 0 10 6" style={{ transition: 'transform .2s', transform: genreDrop ? 'rotate(180deg)' : 'rotate(0)' }}>
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {genreDrop && (
            <div
              role="menu"
              aria-label="Genre links"
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: 12,
                minWidth: 180,
                background: '#0C091A',
                border: '1px solid rgba(255,255,255,.06)',
                borderRadius: 14,
                boxShadow: '8px 8px 24px rgba(0,0,0,.85), -3px -3px 10px rgba(45,25,90,.22), 0 0 0 1px rgba(255,179,71,.08)',
                padding: '6px',
                zIndex: 997,
                animation: 'fi .15s ease both',
              }}
            >
              {GENRE_LINKS.map((g) => (
                <div
                  key={g.key}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGenreDrop(false); router.push(`/genre/${g.key}`); } }}
                  onClick={() => { setGenreDrop(false); router.push(`/genre/${g.key}`); }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'background .15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: '.72rem', letterSpacing: '.06em', color: '#FFF5E8' }}>{g.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
        <button className="btn-icon" onClick={openSearch} aria-label="Open search">Search</button>
        <NotificationBell />
        <button className="btn-icon desktop-only" onClick={() => onShowShortcuts?.()} aria-label="Keyboard shortcuts" style={{ fontSize: '.7rem', opacity: .5 }}>?</button>
        <div ref={dropRef} style={{ position: 'relative' }}>
          {user ? (
            <>
              <button
                onClick={() => setDrop(!drop)}
                aria-expanded={drop}
                aria-haspopup="true"
                aria-label="User menu"
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: profile
                    ? `linear-gradient(135deg,${profile.avatar_url || '#8B78FF'},${profile.avatar_url || '#FF6B8A'})`
                    : 'linear-gradient(135deg,rgba(255,179,71,.38),rgba(139,120,255,.38))',
                  border: '2px solid rgba(255,179,71,.38)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '.9rem', fontFamily: "'Cinzel',serif", fontWeight: 700, color: '#05020A',
                  boxShadow: '4px 4px 12px rgba(0,0,0,.7),-2px -2px 6px rgba(45,25,90,.2),inset 0 1px 0 rgba(255,255,255,.1)',
                }}
              >
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </button>
              {drop && (
                <div className="dropdown" role="menu" aria-label="User dropdown">
                  <div style={{ padding: '.85rem 1.1rem', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.76rem', color: '#FFF5E8', marginBottom: 2 }}>{displayName}</div>
                    {displayEmail && <div style={{ fontSize: '.7rem', color: 'rgba(255,245,232,.4)' }}>{displayEmail}</div>}
                  </div>
                  {([
                    { lb: 'My Profile', action: () => router.push('/profiles') },
                    { lb: 'Watchlist', action: () => go('watchlist') },
                    { lb: 'Collections', action: () => go('collections') },
                    { lb: 'Activity', action: () => go('activity') },
                    { lb: 'Viewing Stats', action: () => go('stats') },
                    { lb: 'Settings', action: () => router.push('/settings') },
                    { lb: 'Sign Out', action: () => onSignOut() },
                  ] as const).map(({ lb, action }) => (
                    <div key={lb} className="dd-item" role="menuitem" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrop(false); action(); } }} onClick={() => { setDrop(false); action(); }}>
                      <span>{lb}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setDrop(!drop)}
                aria-expanded={drop}
                aria-haspopup="true"
                aria-label="Guest menu"
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'linear-gradient(135deg,rgba(255,179,71,.38),rgba(139,120,255,.38))',
                  border: '2px solid rgba(255,179,71,.38)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '.9rem',
                  boxShadow: '4px 4px 12px rgba(0,0,0,.7),-2px -2px 6px rgba(45,25,90,.2)',
                }}
              >G</button>
              {drop && (
                <div className="dropdown" role="menu" aria-label="Guest dropdown">
                  <div style={{ padding: '.85rem 1.1rem', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.76rem', color: '#FFF5E8', marginBottom: 2 }}>Guest</div>
                    <div style={{ fontSize: '.7rem', color: 'rgba(255,245,232,.4)' }}>Sign in to save progress</div>
                  </div>
                  <div className="dd-item" role="menuitem" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') { setDrop(false); router.push('/login'); } }} onClick={() => { setDrop(false); router.push('/login'); }}>
                    <span>Sign In</span>
                  </div>
                  <div className="dd-item" role="menuitem" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') { setDrop(false); router.push('/signup'); } }} onClick={() => { setDrop(false); router.push('/signup'); }}>
                    <span>Create Account</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="mobile-menu"
          role="menu"
          style={{
            position: 'absolute',
            top: 64,
            left: 0,
            right: 0,
            background: '#0C091A',
            borderBottom: '1px solid rgba(255,255,255,.055)',
            boxShadow: '0 12px 32px rgba(0,0,0,.8)',
            zIndex: 996,
            padding: '0.5rem 0',
            animation: 'fi .2s ease both',
          }}
        >
          {menuItems.map((item) => (
            <div
              key={item.key}
              className="dd-item"
              role="menuitem"
              tabIndex={0}
              style={{ padding: '.85rem clamp(1rem,5vw,3rem)', fontSize: '.8rem' }}
              onClick={() => handleMenuNav(item)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMenuNav(item); } }}
            >
              <span>{item.label}</span>
            </div>
          ))}
          {!user && (
            <>
              <div className="dd-item" role="menuitem" tabIndex={0} onClick={() => { setMenuOpen(false); router.push('/login'); }} style={{ padding: '.85rem clamp(1rem,5vw,3rem)' }}>
                <span>Sign In</span>
              </div>
              <div className="dd-item" role="menuitem" tabIndex={0} onClick={() => { setMenuOpen(false); router.push('/signup'); }} style={{ padding: '.85rem clamp(1rem,5vw,3rem)' }}>
                <span>Create Account</span>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
