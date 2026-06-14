import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Create and manage curated lists of your favorite shows on Lumina Stream',
};

export default function CollectionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
