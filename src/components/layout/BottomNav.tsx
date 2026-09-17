'use client';

import { memo } from 'react';
import { Home, Compass, Search, Activity, User, Keyboard } from 'lucide-react';

interface BottomNavProps {
  page: string;
  go: (target: string) => void;
  openSearch: () => void;
  onShowShortcuts?: () => void;
}

const ITEMS: { key: string; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'shows', label: 'Browse', icon: Compass },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'login', label: 'Account', icon: User },
];

function BottomNav({ page, go, openSearch, onShowShortcuts }: BottomNavProps) {
  return (
    <>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {/* .bn is flex:1 over 6 real children (ITEMS + the Keys button below),
            so each slot is 100/6% wide, not the 20% a 5-item bar would use. */}
        <div style={{ position: 'absolute', top: 0, height: 3, background: 'var(--gold)', borderRadius: 2, transition: 'all .3s cubic-bezier(.34,1.56,.64,1)', width: `${(100 / 6) * 0.8}%`, left: `${ITEMS.findIndex(i => i.key === page) * (100 / 6) + (100 / 6) * 0.1}%`, boxShadow: '0 0 12px rgba(255,179,71,.6),0 2px 6px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3)', opacity: ITEMS.some(i => i.key === page) ? 1 : 0 }} />
        {ITEMS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className={`bn${page === key ? ' on' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-current={page === key ? 'page' : undefined}
            onClick={() => {
              if (key === 'search') { openSearch(); return; }
              go(key);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (key === 'search') openSearch();
                else go(key);
              }
            }}
          >
            <Icon size={20} className="em" />
            <span className="lb">{label}</span>
          </div>
        ))}

        {/* Keyboard shortcuts help button */}
        <div
          className="bn"
          role="button"
          tabIndex={0}
          aria-label="Keyboard shortcuts"
          onClick={() => onShowShortcuts?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onShowShortcuts?.();
            }
          }}
          style={{ position: 'relative' }}
        >
          <Keyboard size={20} className="em" />
          <span className="lb">Keys</span>
        </div>
      </nav>
    </>
  );
}

export default memo(BottomNav);