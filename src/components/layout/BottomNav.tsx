'use client';

import { useState, lazy, Suspense } from 'react';
const ShortcutOverlay = lazy(() => import('@/components/common/ShortcutOverlay'));

interface BottomNavProps {
  page: string;
  go: (target: string) => void;
  openSearch: () => void;
}

const ITEMS: { key: string; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'shows', label: 'Browse' },
  { key: 'search', label: 'Search' },
  { key: 'activity', label: 'Activity' },
  { key: 'login', label: 'Account' },
];

export default function BottomNav({ page, go, openSearch }: BottomNavProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {ITEMS.map(({ key, label }) => (
          <div
            key={key}
            className={`bn${page === key ? ' on' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-current={page === key ? 'page' : undefined}
            onClick={() => {
              if (key === 'search') { openSearch(); return; }
              if (key === 'activity') {
                if (typeof window !== 'undefined') window.location.href = '/activity';
                return;
              }
              go(key);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (key === 'search') openSearch();
                else if (key === 'activity') {
                  if (typeof window !== 'undefined') window.location.href = '/activity';
                }
                else go(key);
              }
            }}
          >
            <span className="em">{label[0]}</span>
            <span className="lb">{label}</span>
          </div>
        ))}

        {/* Keyboard shortcuts help button */}
        <div
          className="bn"
          role="button"
          tabIndex={0}
          aria-label="Keyboard shortcuts"
          onClick={() => setShowShortcuts(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowShortcuts(true);
            }
          }}
          style={{ position: 'relative' }}
        >
          <span className="em" style={{ fontSize: '1.05rem', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>?</span>
          <span className="lb">Keys</span>
        </div>
      </nav>

      {/* Shortcuts overlay from bottom nav */}
      {showShortcuts && (
        <Suspense fallback={null}>
          <ShortcutOverlay visible={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </Suspense>
      )}
    </>
  );
}
