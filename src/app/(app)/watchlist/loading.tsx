'use client';
import Skeleton from '@/components/common/LoadingSkeleton';

export default function WatchlistLoading() {
  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: '2.2rem clamp(1rem,5vw,3rem) 0', position: 'relative', zIndex: 3 }}>
        <Skeleton variant="text" count={1} />
        <div style={{ height: 6 }} />
        <div
          className="skeleton skeleton-text"
          style={{ width: '30%' }}
        />
      </div>

      <div style={{ padding: '0 clamp(1rem,5vw,3rem) 5.5rem', position: 'relative', zIndex: 3 }}>
        <Skeleton variant="row" count={6} />
      </div>
    </div>
  );
}
