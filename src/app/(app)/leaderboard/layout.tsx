import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Leaderboard | Lumina Stream',
  description: 'See the top-rated movies and TV shows by the Lumina Stream community. Discover what viewers love most.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app'}/leaderboard`,
  },
  openGraph: {
    title: 'Community Leaderboard | Lumina Stream',
    description: 'See the top-rated movies and TV shows by the Lumina Stream community.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app'}/leaderboard`,
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