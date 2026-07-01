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
import { requireAuth, getVerifiedProfileId } from '@/lib/auth';

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
    const { data } = await supabase
      .from('watch_progress')
      .select('position, duration, updated_at')
      .eq('profile_id', profileId)
      .eq('media_id', Number(mediaId))
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ position: 0, duration: 0 }, { headers: rateLimitHeaders(rl) });
    }

    return NextResponse.json(
      {
        position: (data.position as number) || 0,
        duration: (data.duration as number) || 0,
        updatedAt: data.updated_at,
      },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}