import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activity Feed — Lumovia',
  description: 'See what you and people you follow have been watching on Lumovia.',
  robots: { index: false, follow: false },
};

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
