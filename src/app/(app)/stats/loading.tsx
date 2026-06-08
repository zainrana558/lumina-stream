'use client';

import Skeleton from '@/components/common/LoadingSkeleton';

export default function StatsLoading() {
  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: '2.2rem clamp(1rem,5vw,3rem) 0', position: 'relative', zIndex: 3 }}>
        <Skeleton variant="text" count={1} />
        <div style={{ height: 6 }} />
        <div className="skeleton skeleton-text" style={{ width: '40%' }} />
      </div>

      <div style={{ padding: '0 clamp(1rem,5vw,3rem) 5.5rem', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="neo-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
              <Skeleton variant="text" count={1} />
              <div style={{ height: 8 }} />
              <Skeleton variant="text" count={1} />
            </div>
          ))}
        </div>
        <Skeleton variant="text" count={1} />
        <div style={{ height: 16 }} />
        <Skeleton variant="row" count={4} />
      </div>
    </div>
  );
}
