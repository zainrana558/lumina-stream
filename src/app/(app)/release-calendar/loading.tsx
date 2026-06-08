'use client';

export default function ReleaseCalendarLoading() {
  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: '2.2rem clamp(1rem,5vw,3rem) 0', position: 'relative', zIndex: 3 }}>
        <div className="skeleton skeleton-text" style={{ width: '40%', height: 32, marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: '25%', height: 20 }} />
      </div>

      <div style={{ padding: '2rem clamp(1rem,5vw,3rem) 5.5rem', position: 'relative', zIndex: 3 }}>
        {Array.from({ length: 3 }).map((_, mi) => (
          <div key={mi} style={{ marginBottom: '2.5rem' }}>
            <div className="skeleton skeleton-text" style={{ width: '30%', height: 24, marginBottom: '1rem' }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                marginBottom: '.65rem',
                padding: '1rem 1.1rem',
                borderRadius: 14,
                background: '#0C091A',
                boxShadow: '3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.18),inset 0 1px 0 rgba(255,255,255,.05)',
                display: 'flex',
                gap: '1rem',
              }}>
                <div className="skeleton skeleton-circle" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
                <div className="skeleton skeleton-card" style={{ width: 48, height: 72, borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton skeleton-text" style={{ width: `${60 + Math.random() * 30}%`, height: 18 }} />
                  <div className="skeleton skeleton-text" style={{ width: '35%', height: 14 }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
