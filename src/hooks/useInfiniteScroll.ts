import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * IntersectionObserver-based infinite scroll hook.
 * Attaches to a sentinel div at the bottom of a list and calls loadMore
 * when the sentinel enters the viewport.
 */
export function useInfiniteScroll(
  loadMore: () => Promise<void>,
  hasMore: boolean,
  loadingMore: boolean,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '400px' }, // start loading 400px before visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return { sentinelRef };
}