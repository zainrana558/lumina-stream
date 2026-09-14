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
import { requireAuth, getVerifiedProfileId, HttpError } from '@/lib/auth';
import { csrfGuard } from '@/lib/csrf';
import { playerResumeSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = await csrfGuard(request);
    if (csrfError) {
      return NextResponse.json(csrfError, { status: csrfError.status });
    }

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
    const parsed = playerResumeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 },
      );
    }
    const { mediaId, position, duration, mediaType, title, posterPath, seasonNumber, episodeNumber } = parsed.data;

    const profileId = await getVerifiedProfileId(userId) || userId;
    const resolvedMediaType = mediaType; // schema defaults to 'tv' (most content is episodic)

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ status: 'saved' }, { headers: rateLimitHeaders(rl) });
    }

    const supabase = await createClient();
    const dur = duration ? Number(duration) : 0;
    const pos = Number(position);
    const row: Record<string, unknown> = {
      profile_id: profileId,
      media_id: Number(mediaId),
      media_type: resolvedMediaType,
      position: pos,
      duration: dur,
      // Floor at 1% once playback has actually started so the row surfaces in
      // "Continue Watching" (which filters progress > 0).
      progress:
        dur > 0 ? Math.max(pos > 5 ? 1 : 0, Math.min(100, Math.round((pos / dur) * 100))) : (pos > 5 ? 1 : 0),
      updated_at: new Date().toISOString(),
    };
    if (typeof title === 'string' && title) row.title = title.slice(0, 300);
    if (typeof posterPath === 'string' && posterPath) row.poster_path = posterPath;
    if (Number.isFinite(seasonNumber)) row.season_number = Number(seasonNumber);
    if (Number.isFinite(episodeNumber)) row.episode_number = Number(episodeNumber);
    let { error } = await supabase
      .from('watch_progress')
      .upsert(row, { onConflict: 'profile_id,media_id,media_type' });

    // Tolerate a live DB without `watch_progress.position` (migration 006):
    // still persist progress% so "continue watching" works.
    if (error && /position/.test(error.message || '')) {
      delete row.position;
      ({ error } = await supabase
        .from('watch_progress')
        .upsert(row, { onConflict: 'profile_id,media_id,media_type' }));
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ status: 'saved' }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}