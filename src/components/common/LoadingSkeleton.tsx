'use client';

import type { CSSProperties } from 'react';

type SkeletonVariant = 'card' | 'text' | 'row' | 'circle';

interface SkeletonProps {
  variant: SkeletonVariant;
  count?: number;
}

const VARIANT_MAP: Record<SkeletonVariant, string> = {
  card: 'skeleton skeleton-card',
  text: 'skeleton skeleton-text',
  row: 'skeleton skeleton-row',
  circle: 'skeleton skeleton-circle',
};

function getContainerStyle(variant: SkeletonVariant, count: number): CSSProperties {
  if (variant === 'card') {
    return {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(152px, 17vw, 222px), 1fr))',
      gap: '1.3rem',
    };
  }
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  };
}

function getItemStyle(variant: SkeletonVariant, index: number): CSSProperties {
  if (variant === 'circle') {
    return { width: 56, height: 56 };
  }
  if (variant === 'text') {
    return {
      width: index === 0 ? '55%' : index === 1 ? '70%' : '40%',
    };
  }
  return {};
}

export default function Skeleton({ variant, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);
  const containerStyle = getContainerStyle(variant, count);

  return (
    <div style={containerStyle}>
      {items.map(i => (
        <div
          key={i}
          className={VARIANT_MAP[variant]}
          style={getItemStyle(variant, i)}
        />
      ))}
    </div>
  );
}
