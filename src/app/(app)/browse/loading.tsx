'use client';
import Skeleton from '@/components/common/LoadingSkeleton';

export default function BrowseLoading() {
  return (
    <div className="page" style={{ paddingTop: 'clamp(60px,7vw,80px)', minHeight: '100vh' }}>
      <div style={{ padding: '2.2rem clamp(1rem,5vw,3rem) 0', position: 'relative', zIndex: 3 }}>
        {/* Page title skeleton */}
        <Skeleton variant="text" count={1} />
        <div style={{ height: 6 }} />
        <div
          className="skeleton skeleton-text"
          style={{ width: '35%' }}
        />
        <div style={{ height: '1.8rem' }} />

        {/* Search bar + sort skeleton */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="skeleton" style={{ flex: '1 1 260px', height: 48, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: 140, height: 48, borderRadius: 12 }} />
        </div>

        {/* Genre chip skeleton row */}
        <div style={{ display: 'flex', gap: '.55rem', overflow: 'hidden', paddingBottom: '.75rem', marginBottom: '2rem' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: i < 3 ? 60 : 80, height: 34, borderRadius: 8, flexShrink: 0 }}
            />
          ))}
        </div>
      </div>

      {/* Card grid skeleton */}
      <div style={{ padding: '0 clamp(1rem,5vw,3rem) 5.5rem', position: 'relative', zIndex: 3 }}>
        <Skeleton variant="card" count={6} />
      </div>
    </div>
  );
}
