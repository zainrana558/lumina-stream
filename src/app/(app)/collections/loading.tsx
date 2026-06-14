'use client';
import Skeleton from '@/components/common/LoadingSkeleton';

export default function Loading() {
  return (
    <div style={{ paddingTop: 'clamp(60px,7vw,80px)', minHeight: '100vh', background: '#07040F' }}>
      <div style={{ padding: '0 clamp(1rem,5vw,3rem)' }}>
        <Skeleton variant="text" count={2} />
        <div style={{ height: 24 }} />
        <Skeleton variant="card" count={4} />
      </div>
    </div>
  );
}
