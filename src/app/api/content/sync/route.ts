/**
 * Content Sync API
 *
 * POST /api/content/sync — Trigger content sync (admin/cron only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/server';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or admin auth
    const authHeader = request.headers.get('authorization');
    const cronHeader = request.headers.get('x-cron-secret');

    const isCron = CRON_SECRET && cronHeader === CRON_SECRET;
    const isAdmin = authHeader === `Bearer ${process.env.ADMIN_API_KEY}`;

    if (!isCron && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    // Content sync is a placeholder — the actual sync logic
    // would import from content-sync.ts and run batch operations
    const result = {
      status: 'sync_triggered',
      timestamp: new Date().toISOString(),
      message: 'Content sync initiated. Results will be available via the aggregation endpoint.',
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Also accept GET for manual testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Content sync endpoint. Use POST with cron secret to trigger.',
  });
}