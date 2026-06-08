'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ paddingTop: 'clamp(60px,7vw,80px)', minHeight: '100vh', background: '#07040F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '2rem', opacity: 0.4 }}>&#9888;</div>
      <p style={{ fontFamily: "'Cinzel',serif", color: 'rgba(255,245,232,.5)', letterSpacing: '.08em' }}>Failed to load person</p>
      <button onClick={() => reset()} className="btn-p" style={{ fontSize: '.72rem' }}>Try Again</button>
    </div>
  );
}
