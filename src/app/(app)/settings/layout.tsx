import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings — Lumina Stream',
  description: 'Manage your Lumina Stream account settings, profile, appearance, notifications, and privacy preferences.',
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}