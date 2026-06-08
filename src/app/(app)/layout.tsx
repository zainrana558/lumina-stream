'use client';

import { AppProvider } from '@/contexts/AppContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}
