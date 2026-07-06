import type { ReactNode } from 'react';
import { AppProvider } from '@/contexts/AppContext';

export const metadata = {
  title: 'Select Profile — Lumina Stream',
  robots: { index: false, follow: false },
};

/**
 * Minimal layout for the profile selector screen.
 * Reuses auth-style background orbs but wraps in AppProvider
 * so ProfileSelector can access useApp() (handleSignOut, refreshProfile).
 *
 * Intentionally NOT inside (app) route group — no Nav, Footer, or BottomNav.
 */
export default function ProfilesLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <div className="auth-layout-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>
      <main className="auth-content-wrapper">
        {children}
      </main>
    </AppProvider>
  );
}