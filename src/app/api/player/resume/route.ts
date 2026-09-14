/**
 * Resume Position API
 *
 * GET /api/player/resume?mediaId=...&profileId=...
 *
 * Returns the last watched position for a media item.
 * Uses the watch_progress table in Supabase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/server';
import { requireAuth, getVerifiedProfileId, HttpError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'stats');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    // Auth optional — returns 401 if no auth
    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.userId;
    } catch {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');
    if (!mediaId) {
      return NextResponse.json({ error: 'Missing mediaId' }, { status: 400 });
    }

    const profileId = await getVerifiedProfileId(userId) || userId;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ position: 0, duration: 0 }, { headers: rateLimitHeaders(rl) });
    }

    const supabase = await createClient();
    const runQuery = (cols: string) =>
      supabase
        .from('watch_progress')
        .select(cols)
        .eq('profile_id', profileId)
        .eq('media_id', Number(mediaId))
        .maybeSingle();

    let res = await runQuery('position, progress, duration, updated_at');
    // Tolerate a live DB without the `watch_progress.position` column
    // (migration 006) — fall back to deriving it from progress% × duration.
    if (res.error && /position/.test(res.error.message || '')) {
      res = await runQuery('progress, duration, updated_at');
    }

    const row = res.data as Record<string, unknown> | null;
    if (res.error || !row) {
      return NextResponse.json({ position: 0, duration: 0 }, { headers: rateLimitHeaders(rl) });
    }

    const duration = (row.duration as number) || 0;
    const progressPct = (row.progress as number) || 0;
    const position =
      (row.position as number | undefined) ??
      (duration > 0 && progressPct > 0 ? Math.round((progressPct / 100) * duration) : 0);

    return NextResponse.json(
      { position, duration, updatedAt: row.updated_at },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}