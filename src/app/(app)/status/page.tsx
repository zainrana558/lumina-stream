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
  robots: { index: true, follow: true },
};

export default function StatusPage() {
  return <StatusContent />;
}
