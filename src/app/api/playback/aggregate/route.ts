/**
 * Playback Aggregation Trigger API
 *
 * POST /api/playback/aggregate — Trigger aggregation (cron)
 * GET  /api/playback/aggregate — Health check
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncPerformanceToRedis } from '@/lib/streaming/learning';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  try {
    const cronHeader = request.headers.get('x-cron-secret');
    // Fail closed: an unset CRON_SECRET must not leave this route open.
    if (!CRON_SECRET || cronHeader !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const synced = await syncPerformanceToRedis();

    return NextResponse.json({
      status: 'aggregated',
      syncedProviders: synced,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET + `Authorization: Bearer <CRON_SECRET>` is Vercel Cron's own invocation
// style (it always sends GET, never a custom header) — matches the same
// pattern already used by /api/cache/warm and /api/embed-health-cron so this
// route actually runs under Vercel Cron, not just the self-hosted crontab's
// POST + x-cron-secret call. An unauthenticated GET stays a harmless status
// message, same as before.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? '';
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) {
    try {
      const synced = await syncPerformanceToRedis();
      return NextResponse.json({
        status: 'aggregated',
        syncedProviders: synced,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Playback aggregation endpoint. Use POST with x-cron-secret, or GET with Authorization: Bearer <CRON_SECRET>, to trigger.',
  });
}