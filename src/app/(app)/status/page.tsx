import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import StatusContent from './StatusContent';

export const dynamic = 'force-static';
export const revalidate = 60;

const pageUrl = `${CANONICAL_BASE}/status`;

export const metadata: Metadata = {
  title: 'System Status — Lumovia',
  description: 'Live status of Lumovia — the site, streaming sources, and database. See at a glance if anything is currently down.',
  alternates: { canonical: pageUrl },
  // A system-status page has zero real search demand ("Lumovia system
  // status" isn't a query anyone runs) and no unique content worth
  // indexing — noindex keeps crawl budget on pages that can actually
  // rank, same reasoning as isThinContent() in src/lib/seo/metadata.ts.
  robots: { index: false, follow: true },
};

export default function StatusPage() {
  return <StatusContent />;
}
