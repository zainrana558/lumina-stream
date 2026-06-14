import { NextResponse } from 'next/server';
import { checkAllProviders } from '@/lib/streaming/health-check';

/**
 * GET /api/embed-health-cron
 *
 * Called by Vercel Cron every 30 minutes.
 * Pings all embed providers and updates in-memory health state.
 * Triggers replacement swaps for dead providers automatically.
 *
 * Security: Vercel Cron sends an "Authorization: Bearer <CRON_SECRET>" header
 * when CRON_SECRET is set in Vercel env vars. Set CRON_SECRET to the same
 * value as CACHE_WARM_SECRET in your Vercel dashboard.
 */
export async function GET(request: Request) {
  // Vercel Cron passes CRON_SECRET as Bearer token when configured
  const auth = request.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;
  const warmSecret = process.env.CACHE_WARM_SECRET;
  const expectedSecret = cronSecret || warmSecret;

  if (!expectedSecret || auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await checkAllProviders();

    const alive = Object.entries(results).filter(([, v]) => v).length;
    const dead = Object.entries(results).filter(([, v]) => !v).length;

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      totalChecked: Object.keys(results).length,
      alive,
      dead,
      deadProviders: Object.entries(results).filter(([, v]) => !v).map(([k]) => k),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}