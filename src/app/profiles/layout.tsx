import type { ReactNode } from 'react';
import { AppProvider } from '@/contexts/AppContext';

/**
 * Layout for /profiles page.
 * Wraps with AppProvider so ProfileSelector can call useApp()
 * without the full AppShell chrome (Nav, BottomNav, etc.)
 */
export default function ProfilesLayout({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
