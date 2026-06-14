'use client';

import { useClientHealthCheck } from '@/hooks/useClientHealthCheck';

/**
 * ClientHealthMonitor — invisible component that runs embed provider
 * health checks from the user's browser (no server IP exposure).
 * Added to AppShell so it runs globally across all pages.
 */
export default function ClientHealthMonitor() {
  useClientHealthCheck();
  return null; // No UI — background monitoring only
}
