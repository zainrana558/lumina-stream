import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import BrowseContent from './BrowseContent';

export const metadata: Metadata = {
  title: 'Public Watch Parties — Lumovia',
  description: 'Join an open watch party — real-time group watching with chat, no code required.',
  alternates: { canonical: `${CANONICAL_BASE}/watch-party/browse` },
  robots: { index: false, follow: true },
};

export default function WatchPartyBrowsePage() {
  return <BrowseContent />;
}
