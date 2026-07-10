import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collections — Lumina Stream',
  description: 'Create and manage curated lists of your favorite shows on Lumina Stream.',
  robots: { index: false, follow: false },
};

export default function CollectionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
