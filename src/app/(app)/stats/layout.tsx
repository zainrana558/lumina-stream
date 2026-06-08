import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Viewing Stats',
  description: 'Track your viewing statistics including hours watched, titles completed, streaks, and monthly activity.',
  openGraph: {
    title: 'Viewing Stats | Lumina Stream',
    description: 'Track your viewing statistics on Lumina Stream.',
  },
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
