import { NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { reportClientHealth } from '@/lib/streaming/health-check';
import { embedHealthReportSchema } from '@/lib/schemas';

/**
 * POST /api/embed-health-client
 *
 * Client-side health check reporter — UNIFIED with server-side health system.
 *
 * The browser pings embed providers directly (no server IP exposure),
 * then reports results here. Results now flow into the SAME Redis keys
 * used by the server-side health checker (health:provider:{name} hashes
 * and health:alive ZSET), ending the previous dual-system problem.
 *
 * Client reports are flagged with `clientReported: true` so the scoring
 * engine (Phase 2) can weight them at 0.5x vs server-side checks.
 *
 * Body: { provider: string, alive: boolean }
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
    const { provider, alive } = parsed.data;

    // Write to the UNIFIED health system (Redis + in-memory fallback)
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