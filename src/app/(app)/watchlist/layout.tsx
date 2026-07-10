import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Watchlist — Lumina Stream',
  description: 'Track and manage your personal watchlist. Save movies, TV shows, anime, and cartoons to watch later on Lumina Stream.',
  robots: { index: false, follow: false },
};

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
