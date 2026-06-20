import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Community Leaderboard | Lumina Stream',
  description: 'See the top-rated movies and TV shows by the Lumina Stream community. Discover what viewers love most.',
  alternates: {
    canonical: `${CANONICAL_BASE}/leaderboard`,
  },
  openGraph: {
    title: 'Community Leaderboard | Lumina Stream',
    description: 'See the top-rated movies and TV shows by the Lumina Stream community.',
    url: `${CANONICAL_BASE}/leaderboard`,
    siteName: 'Lumina Stream',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Community Leaderboard | Lumina Stream',
    description: 'See the top-rated movies and TV shows by the Lumina Stream community.',
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}