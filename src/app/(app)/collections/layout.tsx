import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collections — Lumovia',
  description: 'Create and manage curated lists of your favorite shows on Lumovia.',
  robots: { index: false, follow: false },
};

export default function CollectionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
