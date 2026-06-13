'use client';

export default function BrowseError({
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
          background: 'linear-gradient(135deg, rgba(78,205,196,.15) 0%, rgba(255,179,71,.15) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
          boxShadow: '8px 8px 24px rgba(0,0,0,.82), -4px -4px 11px rgba(45,25,90,.28), inset 0 1.5px 0 rgba(255,255,255,.048)',
        }}>⚠</div>
        <h2 className="f-cinzel" style={{
           fontSize: '1.4rem',
          color: 'rgba(255,245,232,.8)', letterSpacing: '.08em', marginBottom: '1rem',
        }}>Failed to Load Browse</h2>
        <p className="f-crimson" style={{
           color: 'rgba(255,245,232,.5)',
          fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem',
        }}>
          We couldn't load the catalog. Please try again.
        </p>
        <button onClick={reset} className="btn-p">↻ Try Again</button>
      </div>
    </div>
  );
}
