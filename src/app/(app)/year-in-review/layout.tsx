import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Year in Review — Lumina Stream',
  description: 'Your annual streaming recap — see how many hours you watched, your top shows, genre breakdown, and viewing streaks on Lumina Stream.',
  robots: { index: false, follow: false },
};

export default function YearInReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}