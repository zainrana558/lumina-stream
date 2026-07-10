import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activity Feed — Lumina Stream',
  description: 'See what you and people you follow have been watching on Lumina Stream.',
  robots: { index: false, follow: false },
};

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
