'use client';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for monitoring (in production)
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0, padding: 0, background: '#07040F', color: '#FFF5E8',
        fontFamily: "'Crimson Pro', serif",
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '2rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1.5rem',
            background: 'linear-gradient(135deg, rgba(255,107,138,.15) 0%, rgba(255,179,71,.15) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
            boxShadow: '8px 8px 24px rgba(0,0,0,.82), -4px -4px 11px rgba(45,25,90,.28), inset 0 1.5px 0 rgba(255,255,255,.048)',
          }}>
            ⚠
          </div>
          <h2 style={{
            fontFamily: "'Cinzel', serif", fontSize: '1.6rem',
            color: 'rgba(255,245,232,.8)', letterSpacing: '.08em', marginBottom: '1rem',
            background: 'linear-gradient(135deg, #FFD700, #FFB347, #FF8C69)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Something Went Wrong</h2>
          <p style={{ color: 'rgba(255,245,232,.5)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '13px 32px', borderRadius: '50px', border: 'none', cursor: 'pointer',
              fontFamily: "'Cinzel', serif", fontSize: '.84rem', fontWeight: 700, letterSpacing: '.09em',
              color: '#05020A',
              background: 'linear-gradient(175deg, #FFE566 0%, #FFB347 26%, #FF8C00 66%, #E07200 100%)',
              boxShadow: 'inset 0 1.5px 1.5px rgba(255,255,255,.55), 0 6px 0 #7A3800, 0 9px 22px rgba(255,140,0,.52)',
            }}
          >
            ↻ Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
