'use client';

import { useRouter } from 'next/navigation';
import { Home, Sparkles } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07040F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.5rem',
        paddingTop: 'clamp(60px,7vw,80px)',
        animation: 'page-in .55s cubic-bezier(.22,1,.36,1) both',
      }}
    >
      <div className="f-cinzel-dec"
        style={{
          fontSize: 'clamp(6rem,14vw,10rem)',
          fontWeight: 900,
          
          background: 'linear-gradient(135deg, rgba(255,245,232,.18) 0%, rgba(255,179,71,.32) 50%, rgba(255,245,232,.18) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
          animation: 'breathe 4s ease-in-out infinite',
          userSelect: 'none',
        }}
      >
        404
      </div>

      <h2 className="f-cinzel"
        style={{
          
          fontSize: 'clamp(1.1rem,2.5vw,1.6rem)',
          color: 'rgba(255,245,232,.7)',
          letterSpacing: '.1em',
          textAlign: 'center',
        }}
      >
        Lost in the Void
      </h2>

      <p className="f-crimson"
        style={{
          
          color: 'rgba(255,245,232,.35)',
          fontSize: 'clamp(.9rem,1.2vw,1.05rem)',
          fontStyle: 'italic',
          textAlign: 'center',
          maxWidth: 420,
          lineHeight: 1.7,
          marginBottom: '0.5rem',
        }}
      >
        The page you seek has drifted beyond the stars. Perhaps it never existed in this realm.
      </p>

      <button
        className="btn-p"
        onClick={() => { router.push('/'); }}
        style={{ marginTop: '0.5rem' }}
      >
        <Home size={16} /> Go Home
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          opacity: 0.06,
          animation: 'float 8s ease-in-out infinite',
          userSelect: 'none',
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Sparkles size={64} />
      </div>
    </div>
  );
}
