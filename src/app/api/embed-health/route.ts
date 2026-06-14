import { NextResponse } from 'next/server';
import { checkAllProviders } from '@/lib/streaming/health-check';
import { getPoolStatus } from '@/lib/streaming/providers';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/embed-health
 *
 * Admin/debug endpoint to check all provider health and pool status.
 * Requires authentication to prevent information disclosure.
 */
export async function GET(request: Request) {
  try {
    const rl = await checkRateLimit(request, 'stats');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // Require auth — health info is internal/admin only
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Ping all providers once (checkAllProviders sets health state)
    const results = await checkAllProviders();

    const alive = Object.entries(results).filter(([, v]) => v).length;
    const dead = Object.entries(results).filter(([, v]) => !v).length;

    // Get pool status (reads from maps, no IO)
    const pool = getPoolStatus();

    return NextResponse.json(
      {
        checkedAt: new Date().toISOString(),
        summary: {
          totalChecked: Object.keys(results).length,
          alive,
          dead,
        },
        pool,
        health: results,
        deadProviders: Object.entries(results).filter(([, v]) => !v).map(([k]) => k),
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
