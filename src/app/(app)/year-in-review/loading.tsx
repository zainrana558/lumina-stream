'use client';

import Skeleton from '@/components/common/LoadingSkeleton';

export default function YearInReviewLoading() {
  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: '2.2rem clamp(1rem,5vw,3rem) 0', position: 'relative', zIndex: 3 }}>
        <Skeleton variant="text" count={1} />
        <div style={{ height: 6 }} />
        <Skeleton variant="text" count={1} />
      </div>

      <div style={{ padding: '0 clamp(1rem,5vw,3rem) 5.5rem', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="neo-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
              <Skeleton variant="text" count={1} />
              <div style={{ height: 8 }} />
              <Skeleton variant="text" count={1} />
            </div>
          ))}
        </div>

        {/* Pie chart skeleton */}
        <div className="neo-card" style={{ padding: '2rem', borderRadius: 16, marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 180, height: 180, borderRadius: '50%', background: '#110E24', boxShadow: 'inset 0 0 30px rgba(0,0,0,.4)' }} />
        </div>

        {/* Top 5 skeleton */}
        <Skeleton variant="text" count={1} />
        <div style={{ height: 16 }} />
        <Skeleton variant="row" count={5} />
      </div>
    </div>
  );
}
