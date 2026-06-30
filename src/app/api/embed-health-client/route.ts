import { NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { reportClientHealth } from '@/lib/streaming/health-check';
import { embedHealthReportSchema } from '@/lib/schemas';

/**
 * POST /api/embed-health-client
 *
 * Client-side health check reporter — feeds the Provider Intelligence Layer.
 *
 * The browser pings embed providers directly (no server IP exposure),
 * then reports results here. Results flow into:
 *   1. The unified health system (health-check.ts)
 *   2. The Provider Intelligence speed cache (provider-intelligence.ts)
 *   3. The historical success cache (for scoring)
 *
 * Body: { provider: string, alive: boolean, latencyMs?: number }
 */
export async function POST(request: Request) {
  try {
    const rl = await checkRateLimit(request, 'stats');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const parsed = embedHealthReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }
    const { provider, alive, latencyMs } = parsed.data;

    // Feed the Provider Intelligence Layer caches
    try {
      const { updateSpeedCache, updateHistoricalCache } = await import('@/lib/streaming/provider-intelligence');
      if (latencyMs) updateSpeedCache(provider, latencyMs);
      updateHistoricalCache(provider, alive);
    } catch {
      // Non-critical
    }

    // Write to the UNIFIED health system (in-memory)
    const record = await reportClientHealth(provider, alive);

    return NextResponse.json(
      {
        ok: true,
        provider,
        alive,
        status: record.status,
        failCount: record.failCount,
        clientReported: true,
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}