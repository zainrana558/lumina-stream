'use client';

export default function WatchlistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: '100vh', background: '#07040F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      paddingTop: 'clamp(60px,7vw,80px)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: '2rem' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1.5rem',
          background: 'linear-gradient(135deg, rgba(255,179,71,.15) 0%, rgba(139,120,255,.15) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
          boxShadow: '8px 8px 24px rgba(0,0,0,.82), -4px -4px 11px rgba(45,25,90,.28), inset 0 1.5px 0 rgba(255,255,255,.048)',
        }}>⚠</div>
        <h2 style={{
          fontFamily: "'Cinzel', serif", fontSize: '1.4rem',
          color: 'rgba(255,245,232,.8)', letterSpacing: '.08em', marginBottom: '1rem',
        }}>Failed to Load Watchlist</h2>
        <p style={{
          fontFamily: "'Crimson Pro', serif", color: 'rgba(255,245,232,.5)',
          fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem',
        }}>
          We couldn't load your watchlist. Please try again.
        </p>
        <button onClick={reset} className="btn-p">↻ Try Again</button>
      </div>
    </div>
  );
}
