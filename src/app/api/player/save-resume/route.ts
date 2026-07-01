/**
 * Save Resume Position API
 *
 * POST /api/player/save-resume
 *
 * Upserts the user's watch progress for a media item.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/server';
import { requireAuth, getVerifiedProfileId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.userId;
    } catch {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { mediaId, position, duration } = body;

    if (!mediaId || position === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: mediaId, position' },
        { status: 400 },
      );
    }

    const profileId = await getVerifiedProfileId(userId) || userId;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ status: 'saved' }, { headers: rateLimitHeaders(rl) });
    }

    const supabase = await createClient();
    await supabase.from('watch_progress').upsert({
      profile_id: profileId,
      media_id: Number(mediaId),
      position: Number(position),
      duration: duration ? Number(duration) : null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'profile_id,media_id',
    });

    return NextResponse.json({ status: 'saved' }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}