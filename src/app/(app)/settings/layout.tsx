import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings — Lumovia',
  description: 'Manage your Lumovia account settings, profile, appearance, notifications, and privacy preferences.',
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}