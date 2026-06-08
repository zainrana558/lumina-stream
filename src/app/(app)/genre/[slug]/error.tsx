'use client';

import { useRouter } from 'next/navigation';

export default function GenreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh', background: '#07040F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '1.5rem',
      paddingTop: 'clamp(60px,7vw,80px)',
      animation: 'page-in .55s cubic-bezier(.22,1,.36,1) both',
    }}>
      <h2 style={{
        fontFamily: "'Cinzel',serif", fontSize: 'clamp(1.2rem,2.5vw,1.8rem)',
        color: 'rgba(255,245,232,.8)', letterSpacing: '.08em', textAlign: 'center',
      }}>
        Failed to Load Genre
      </h2>
      <p style={{
        fontFamily: "'Crimson Pro',serif", color: 'rgba(255,245,232,.55)',
        fontSize: 'clamp(.88rem,1.1vw,1rem)', lineHeight: 1.7, maxWidth: 400, textAlign: 'center',
      }}>
        Could not fetch shows for this genre. Please try again.
      </p>
      <div style={{ display: 'flex', gap: '.85rem' }}>
        <button className="btn-p" onClick={reset}>Try Again</button>
        <button className="btn-g" onClick={() => router.push('/')}>Go Home</button>
      </div>
    </div>
  );
}
