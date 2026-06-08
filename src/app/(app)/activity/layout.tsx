import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activity Feed',
  description: 'See what you and people you follow have been watching on Lumina Stream',
};

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
