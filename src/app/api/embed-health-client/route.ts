import { NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getRedis } from '@/lib/redis';
import { embedHealthReportSchema } from '@/lib/schemas';

const HEALTH_PREFIX = 'lumina:provider:health:';
const PREV_HEALTH_PREFIX = 'lumina:provider:prev_health:';
const FAIL_COUNT_PREFIX = 'lumina:provider:fail_count:';
const HEALTH_TTL = 5 * 60;

/**
 * POST /api/embed-health-client
 *
 * Client-side health check reporter.
 * The browser pings embed providers directly (no server IP exposure),
 * then reports results here. The server only reads/writes Redis state
 * and manages the replacement pool swap logic.
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
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { provider, alive } = parsed.data;

    const client = getRedis();

    // Get previous health state
    let prevAlive: boolean | null = null;
    if (client) {
      try {
        const val = await client.get<string>(`${PREV_HEALTH_PREFIX}${provider}`);
        if (val !== null) prevAlive = val === '1';
      } catch { /* ok */ }
    }

    // Save current health
    if (client) {
      try {
        await client.set(`${HEALTH_PREFIX}${provider}`, alive ? '1' : '0', { ex: HEALTH_TTL });
        await client.set(`${PREV_HEALTH_PREFIX}${provider}`, alive ? '1' : '0', { ex: HEALTH_TTL });
      } catch { /* ok */ }
    }

    // Handle fail count
    if (!alive && prevAlive === true) {
      // Provider just died
      if (client) {
        try {
          const val = await client.get<string>(`${FAIL_COUNT_PREFIX}${provider}`);
          const failCount = val ? parseInt(val, 10) : 0;
          await client.set(`${FAIL_COUNT_PREFIX}${provider}`, String(failCount + 1), { ex: HEALTH_TTL });
        } catch { /* ok */ }
      }
    } else if (alive) {
      // Provider recovered — reset fail count
      if (client) {
        try {
          await client.del(`${FAIL_COUNT_PREFIX}${provider}`);
        } catch { /* ok */ }
      }
    }

    return NextResponse.json({ ok: true, provider, alive, prevAlive }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
