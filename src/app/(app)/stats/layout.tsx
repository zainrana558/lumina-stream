import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Viewing Stats — Lumovia',
  description: 'Track your viewing statistics including hours watched, titles completed, streaks, and monthly activity on Lumovia.',
  robots: { index: false, follow: false },
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
