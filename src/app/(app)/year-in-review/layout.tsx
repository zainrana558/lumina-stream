import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Year in Review — Lumovia',
  description: 'Your annual streaming recap — see how many hours you watched, your top shows, genre breakdown, and viewing streaks on Lumovia.',
  robots: { index: false, follow: false },
};

export default function YearInReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}