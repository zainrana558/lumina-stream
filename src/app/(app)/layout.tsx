'use client';

import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import Nav from '@/components/common/Nav';
import BottomNav from '@/components/layout/BottomNav';
import ThemeSwitcher from '@/components/common/ThemeSwitcher';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Dynamic imports for heavy/rarely-used components — reduces initial JS bundle
const Stars = lazy(() => import('@/components/common/Stars'));
const SearchOverlay = lazy(() => import('@/components/common/SearchOverlay'));
const PipPlayer = lazy(() => import('@/components/common/PipPlayer'));
const ShortcutOverlay = lazy(() => import('@/components/common/ShortcutOverlay'));
const Confetti = lazy(() => import('@/components/common/Confetti'));
import { ToastProvider } from '@/components/common/ToastProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';

function NotificationBanner() {
  const {
    permissionStatus,
    isSupported,
    requestPermission,
    hasPromptBeenDismissed,
    dismissPrompt,
  } = usePushNotifications();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner after a short delay if:
    // - Notifications are supported
    // - Permission is default (not yet asked)
    // - User hasn't dismissed the prompt before
    if (isSupported && permissionStatus === 'default' && !hasPromptBeenDismissed()) {
      const showTimer = setTimeout(() => setVisible(true), 4000);
      // Auto-dismiss 5.5 seconds after appearing
      const hideTimer = setTimeout(() => {
        dismissPrompt();
        setVisible(false);
      }, 9500); // 4s delay + 5.5s visible
      return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
    }
  }, [isSupported, permissionStatus, hasPromptBeenDismissed, dismissPrompt]);

  if (!visible) return null;

  const handleEnable = async () => {
    await requestPermission();
    setVisible(false);
  };

  const handleDismiss = () => {
    dismissPrompt();
    setVisible(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 996,
      maxWidth: 420,
      width: 'calc(100% - 2rem)',
      padding: '14px 20px',
      borderRadius: 16,
      background: '#110E24',
      border: '1px solid rgba(255,179,71,.15)',
      boxShadow: '8px 8px 24px rgba(0,0,0,.85),-3px -3px 10px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.05),0 0 0 1px rgba(255,179,71,.12)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'eu .4s cubic-bezier(.34,1.56,.64,1) both',
    }}>
      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🔔</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="f-cinzel" style={{  fontSize: '.72rem', color: '#FFB347', fontWeight: 600, marginBottom: 2, letterSpacing: '.04em' }}>
          Stay Updated
        </div>
        <div className="f-crimson" style={{  fontSize: '.82rem', color: 'rgba(255,245,232,.6)', lineHeight: 1.4 }}>
          Enable notifications for new episode alerts?
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button className="f-cinzel"
          onClick={handleEnable}
          style={{
            padding: '7px 16px',
            borderRadius: '50px',
            border: 'none',
            cursor: 'pointer',
            
            fontSize: '.68rem',
            fontWeight: 600,
            background: 'linear-gradient(175deg,#FFE566 0%,#FFB347 50%,#E07200 100%)',
            color: '#05020A',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4),0 3px 0 #7A3800,0 5px 14px rgba(255,140,0,.4)',
            transition: 'transform .1s',
          }}
        >
          Enable
        </button>
        <button className="f-cinzel"
          onClick={handleDismiss}
          style={{
            padding: '7px 14px',
            borderRadius: '50px',
            border: 'none',
            cursor: 'pointer',
            
            fontSize: '.68rem',
            fontWeight: 500,
            background: '#0C091A',
            color: 'rgba(255,245,232,.45)',
            boxShadow: 'inset 2px 2px 5px rgba(0,0,0,.5),inset -1px -1px 3px rgba(35,20,75,.15)',
            transition: 'color .2s',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const { pipState, searchOpen, setSearchOpen, confettiActive, closePip, user, profile, handleSignOut } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const [reducedMotion, setReducedMotion] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );
  const [transitioning, setTransitioning] = useState(false);
  const [shortcutOverlay, setShortcutOverlay] = useState(false);
  const prevPathRef = useRef(pathname);

  // Register Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          if (process.env.NODE_ENV !== 'production') console.log('[SW] Registered:', reg.scope);
        })
        .catch((err) => {
          if (process.env.NODE_ENV !== 'production') console.warn('[SW] Registration failed:', err);
        });
    }
  }, []);

  // Scroll to top + fade transition on navigation
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      window.scrollTo(0, 0);

      if (!reducedMotion) {
        const raf = requestAnimationFrame(() => setTransitioning(true));
        const timer = setTimeout(() => setTransitioning(false), 300);
        return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
      }
    }
  }, [pathname, reducedMotion]);

  // Global PiP toggle shortcut (P key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (pipState) closePip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pipState, closePip]);



  // Map current path to page name for nav highlighting
  const page = pathname === '/' ? 'home'
    : pathname.startsWith('/browse') ? 'shows'
    : pathname.startsWith('/genre') ? 'genre'
    : pathname.startsWith('/watchlist') ? 'watchlist'
    : pathname.startsWith('/collections') ? 'collections'
    : pathname.startsWith('/activity') ? 'activity'
    : pathname.startsWith('/details') ? 'detail'
    : pathname.startsWith('/stats') ? 'stats'
    : 'home';

  const go = (target: string) => {
    const routes: Record<string, string> = {
      home: '/',
      shows: '/browse',
      watchlist: '/watchlist',
      collections: '/collections',
      activity: '/activity',
      stats: '/stats',
      login: '/login',
    };
    const href = routes[target];
    if (href) router.push(href);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#07040F', position: 'relative' }}>
      <a href="#main-content" className="skip-link" aria-label="Skip to main content">Skip to content</a>
      {/* Ambient background orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-26%', left: '-13%', width: '66vw', height: '66vw', borderRadius: '50%', background: 'radial-gradient(circle,color-mix(in srgb, var(--accent3,#8B78FF) 11%, transparent) 0%,transparent 70%)', animation: 'aurora 20s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '36%', right: '-18%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle,color-mix(in srgb, var(--accent2,#FF6B8A) 9%, transparent) 0%,transparent 70%)', animation: 'aurora 24s ease-in-out infinite reverse', animationDelay: '-7s' }} />
        <div style={{ position: 'absolute', bottom: '-22%', left: '28%', width: '48vw', height: '48vw', borderRadius: '50%', background: 'radial-gradient(circle,color-mix(in srgb, var(--accent,#FFB347) 7%, transparent) 0%,transparent 70%)', animation: 'aurora 28s ease-in-out infinite', animationDelay: '-13s' }} />
      </div>

      {/* Particle effects */}
      {!reducedMotion && (
        <Suspense fallback={null}>
          <Stars />
        </Suspense>
      )}

      {/* Navigation */}
      <Nav
        page={page}
        go={go}
        openSearch={() => setSearchOpen(true)}
        user={user}
        profile={profile}
        onSignOut={handleSignOut}
        onShowShortcuts={() => setShortcutOverlay(true)}
      />
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchOverlay onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}

      {/* Page content with fade transition */}
      <main id="main-content" role="main" style={{
        position: 'relative',
        zIndex: 3,
        opacity: transitioning ? 0 : 1,
        transition: reducedMotion ? 'none' : 'opacity .3s ease',
      }}>
        {children}
      </main>

      {/* Keyboard shortcuts overlay */}
      {shortcutOverlay && (
        <Suspense fallback={null}>
          <ShortcutOverlay visible={shortcutOverlay} onClose={() => setShortcutOverlay(false)} />
        </Suspense>
      )}

      {/* PiP Player */}
      {pipState && (
        <Suspense fallback={null}>
          <PipPlayer
            url={pipState.url}
            title={pipState.title}
            episodeInfo={pipState.episodeInfo}
            onClose={closePip}
            onExpand={() => {
              closePip();
              router.push(`/details/${pipState.showId}`);
            }}
            colorScheme={pipState.colorScheme}
          />
        </Suspense>
      )}

      {/* Mobile bottom nav */}
      <BottomNav
        page={page}
        go={go}
        openSearch={() => setSearchOpen(true)}
      />

      {/* Theme switcher & confetti */}
      <ThemeSwitcher />
      <Suspense fallback={null}>
        <Confetti active={confettiActive} />
      </Suspense>

      {/* Notification permission prompt */}
      <NotificationBanner />
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <ToastProvider>
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </ToastProvider>
    </AppProvider>
  );
}
