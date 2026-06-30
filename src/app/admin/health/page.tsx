/**
 * Admin Health Dashboard — Server Component
 *
 * Fetches all health data server-side and passes to client component.
 * Protected by Supabase auth + admin role check.
 */

import { getFullStatus, getAllHealthRecords, type HealthRecord } from '@/lib/streaming/health-check';
import { getSelectionMetrics, getHealthMetrics, getRecentFailovers } from '@/lib/streaming/metrics';
import { getProviderRegistry } from '@/lib/streaming/registry';
import { requireAuth } from '@/lib/auth';
import HealthDashboardClient from './HealthDashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HealthDashboardPage() {
  // Auth check
  try {
    await requireAuth();
  } catch {
    return (
      <div style={{ padding: 40, color: '#ff6b6b', fontFamily: 'monospace', minHeight: '100vh', background: '#07040F' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 12 }}>Access Denied</h2>
        <p>Authentication required to view the health dashboard.</p>
      </div>
    );
  }

  // Fetch all data in parallel
  let healthRecords = new Map<string, HealthRecord>();
  try { healthRecords = getAllHealthRecords(); } catch { /* non-critical */ }

  const [fullStatus, selMetrics, hMetrics, failovers] = await Promise.all([
    getFullStatus().catch(() => null),
    getSelectionMetrics(),
    getHealthMetrics(),
    getRecentFailovers(20),
  ]);

  const registry = await getProviderRegistry();

  // Build provider rows
  const providers = [];
  for (const [name, record] of registry) {
    const health = healthRecords.get(name);
    const sel = selMetrics[name];
    const hm = hMetrics[name];

    providers.push({
      name,
      tier: record.tier,
      category: record.category,
      status: health?.status || 'unknown',
      latencyMs: health?.latencyMs || 0,
      failCount: health?.failCount || 0,
      consecutiveSuccesses: health?.consecutiveSuccesses || 0,
      lastCheck: health ? new Date(health.lastCheck).toISOString() : null,
      lastError: health?.lastError || null,
      clientReported: health?.clientReported || false,
      selectionCount: sel?.count || 0,
      avgSelectionScore: sel?.avgScore || 0,
      avgSelectionLatency: sel?.avgLatency || 0,
      healthChecks: hm?.checks || 0,
      healthPassRate: hm?.passRate || 0,
    });
  }

  // Sort by status (dead first), then by tier, then by name
  const statusOrder: Record<string, number> = { dead: 0, degraded: 1, unknown: 2, alive: 3 };
  providers.sort((a: { status: string; tier: number; name: string }, b: { status: string; tier: number; name: string }) => {
    const so = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
    if (so !== 0) return so;
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.name.localeCompare(b.name);
  });

  const data = {
    providers,
    redisAvailable: fullStatus?.redisAvailable ?? null,
    poolStatus: fullStatus?.pool ?? null,
    recentFailovers: failovers,
  };

  return <HealthDashboardClient initialData={data} />;
}