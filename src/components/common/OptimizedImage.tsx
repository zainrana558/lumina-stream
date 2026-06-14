'use client';

import Image from 'next/image';
import { getBlurPlaceholder } from '@/lib/images';

interface OptimizedImageProps {
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  unoptimized?: boolean;
  blurCsIndex?: number;
  fallback?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Reusable optimized image wrapper.
 *
 * Centralises blur placeholders, lazy loading, and
 * responsive sizing so every component benefits from the
 * same optimisation pipeline.
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  className,
  style,
  loading = 'lazy',
  priority = false,
  unoptimized = false,
  blurCsIndex,
  fallback,
  onClick,
}: OptimizedImageProps) {
  if (!src) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      sizes={sizes}
      loading={loading}
      priority={priority}
      unoptimized={unoptimized}
      className={className}
      style={{ objectFit: 'cover', ...style }}
      placeholder={
        !unoptimized && blurCsIndex !== undefined
          ? 'blur'
          : undefined
      }
      blurDataURL={
        !unoptimized && blurCsIndex !== undefined
          ? getBlurPlaceholder(blurCsIndex)
          : undefined
      }
      onClick={onClick}
    />
  );
}
