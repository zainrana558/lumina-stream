'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const tabs = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Browse', href: '/browse', icon: '🔍' },
  { label: 'Genre', href: '/genre/action', icon: '🎭' },
  { label: 'Profile', href: '/', icon: '👤' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Mobile navigation">
      {tabs.map(tab => (
        <Link key={tab.href + tab.label} href={tab.href} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer',
          color: pathname === tab.href ? '#FFB347' : 'rgba(255,245,232,.35)', textDecoration: 'none', transition: 'color .25s',
        }}>
          <span style={{ fontSize: '1.15rem' }}>{tab.icon}</span>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: '.5rem', letterSpacing: '.08em' }}>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
