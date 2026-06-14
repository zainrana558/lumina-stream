'use client';

import { useRouter } from 'next/navigation';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorBoundaryProps) {
  const router = useRouter();
  let message = 'An unexpected error occurred.';
  try {
    message = error?.message || message;
  } catch {
    // If error is not accessible, use fallback
  }

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
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255,107,138,.15) 0%, rgba(255,179,71,.15) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          boxShadow: '8px 8px 24px rgba(0,0,0,.82), -4px -4px 11px rgba(45,25,90,.28), inset 0 1.5px 0 rgba(255,255,255,.048), 0 0 0 1px rgba(255,255,255,.032)',
          animation: 'breathe 3s ease-in-out infinite',
        }}
      >
        ⚠
      </div>

      <h2 className="f-cinzel"
        style={{
          
          fontSize: 'clamp(1.2rem,2.5vw,1.8rem)',
          color: 'rgba(255,245,232,.8)',
          letterSpacing: '.08em',
          textAlign: 'center',
        }}
      >
        Something Went Wrong
      </h2>

      <div
        className="neo-raised"
        style={{
          padding: '1.2rem 1.6rem',
          borderRadius: 16,
          maxWidth: 480,
          width: '90%',
          textAlign: 'center',
        }}
      >
        <p className="f-crimson"
          style={{
            
            color: 'rgba(255,245,232,.55)',
            fontSize: 'clamp(.88rem,1.1vw,1rem)',
            lineHeight: 1.7,
            marginBottom: '1.2rem',
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', gap: '.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-p" onClick={reset}>
            ↻ Try Again
          </button>
          <button className="btn-g" onClick={() => { router.push('/'); }}>
            ✦ Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
