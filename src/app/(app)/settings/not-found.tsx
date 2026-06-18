'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{
      paddingTop: 'clamp(60px,7vw,80px)', minHeight: '100vh', background: '#07040F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '1.5rem', animation: 'page-in .55s cubic-bezier(.22,1,.36,1) both',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(138,43,226,.15) 0%, rgba(255,179,71,.15) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
        boxShadow: '8px 8px 24px rgba(0,0,0,.82), -4px -4px 11px rgba(45,25,90,.28)',
      }} aria-hidden="true">⚙</div>
      <h2 className="f-cinzel" style={{ color: 'rgba(255,245,232,.8)', letterSpacing: '.08em', fontSize: '1.2rem' }}>Page not found</h2>
      <p className="f-crimson" style={{ color: 'rgba(255,245,232,.5)', fontSize: '.95rem', maxWidth: 360, textAlign: 'center', lineHeight: 1.7 }}>
        This settings page doesn't exist.
      </p>
      <div style={{ display: 'flex', gap: '.85rem' }}>
        <button onClick={() => router.push('/settings')} className="btn-p">Settings</button>
        <button onClick={() => router.push('/')} className="btn-g">Go Home</button>
      </div>
    </div>
  );
}