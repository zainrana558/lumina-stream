'use client';
import Skeleton from '@/components/common/LoadingSkeleton';

export default function DetailsLoading() {
  return (
    <div className="page" style={{ minHeight: '100vh' }}>
      {/* Hero backdrop skeleton */}
      <div
        style={{
          position: 'relative',
          height: 'clamp(55vh,70vh,75vh)',
          overflow: 'hidden',
        }}
      >
        <div
          className="skeleton"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 0,
          }}
        />
        {/* Top gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 130,
            background: 'linear-gradient(to bottom,#07040F,transparent)',
            zIndex: 2,
          }}
        />
        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '58%',
            background: 'linear-gradient(to top,#07040F 0%,rgba(7,4,15,.82) 46%,transparent 100%)',
            zIndex: 2,
          }}
        />
        {/* Back button skeleton */}
        <div
          className="skeleton"
          style={{
            position: 'absolute',
            top: 'clamp(70px,8vw,88px)',
            left: 'clamp(1rem,5vw,2.5rem)',
            zIndex: 10,
            width: 90,
            height: 38,
            borderRadius: 50,
          }}
        />
        {/* Hero text skeleton */}
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            left: 'clamp(1rem,5vw,2.5rem)',
            right: 'clamp(1rem,5vw,2.5rem)',
            zIndex: 3,
            maxWidth: 840,
          }}
        >
          <div className="skeleton" style={{ width: '40%', height: 14, borderRadius: 6, marginBottom: '1rem' }} />
          <div className="skeleton" style={{ width: '75%', height: 36, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '45%', height: 18, borderRadius: 6 }} />
        </div>
      </div>

      {/* Content area skeleton */}
      <div
        style={{
          padding: '2rem clamp(1rem,5vw,2.5rem)',
          position: 'relative',
          zIndex: 3,
          maxWidth: 1040,
          margin: '0 auto',
        }}
      >
        {/* Action buttons skeleton */}
        <div style={{ display: 'flex', gap: '.85rem', flexWrap: 'wrap', marginBottom: '2.2rem' }}>
          <div className="skeleton" style={{ width: 160, height: 48, borderRadius: 50 }} />
          <div className="skeleton" style={{ width: 130, height: 48, borderRadius: 50 }} />
        </div>

        {/* Synopsis skeleton */}
        <div
          className="skeleton"
          style={{ width: '100%', height: 120, borderRadius: 16, marginBottom: '2rem' }}
        />

        {/* Tab bar skeleton */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '1.8rem', borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: 0 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: i === 0 ? 80 : 60, height: 40, borderRadius: 0 }}
            />
          ))}
        </div>

        {/* Episode rows skeleton */}
        <Skeleton variant="row" count={4} />
      </div>
    </div>
  );
}
