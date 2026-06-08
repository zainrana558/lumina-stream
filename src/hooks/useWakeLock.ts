'use client';
import { useEffect, useRef, useState } from 'react';

export function useWakeLock(active: boolean) {
  const [supported, setSupported] = useState(() => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) return true;
    return false;
  });
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !supported) return;

    let cancelled = false;
    const request = async () => {
      try {
        sentinelRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // permission denied or not supported
      }
    };
    request();

    // Re-request on visibility change (wake lock releases when tab hidden)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && active && !cancelled) {
        request();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinelRef.current?.release();
      sentinelRef.current = null;
    };
  }, [active, supported]);

  return { supported };
}
