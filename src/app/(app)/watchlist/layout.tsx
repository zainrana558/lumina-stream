import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Watchlist',
  description: 'Track and manage your personal watchlist. Save movies, TV shows, anime, and cartoons to watch later.',
  openGraph: {
    title: 'My Watchlist | Lumina Stream',
    description: 'Manage your personal watchlist on Lumina Stream.',
  },
};

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
