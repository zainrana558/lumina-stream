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
    if (CRON_SECRET && cronHeader !== CRON_SECRET) {
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

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Playback aggregation endpoint. Use POST with cron secret to trigger.',
  });
}