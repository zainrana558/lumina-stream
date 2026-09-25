/**
 * Playback Event Collection API
 *
 * POST /api/playback/event
 *
 * Receives playback events (play, pause, error, complete, etc.)
 * and forwards them to the L12 Learning System for aggregation.
 * Rate limit: 60/10s
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { recordPlaybackEvent } from '@/lib/streaming/learning';
import { requireAuth, getVerifiedProfileId, HttpError } from '@/lib/auth';
import { csrfGuard } from '@/lib/csrf';
import { playbackEventSchema } from '@/lib/schemas';
import type { PlaybackEventType } from '@/lib/streaming/learning';

export async function POST(request: NextRequest) {
  try {
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

    // Auth is not required — guest playback is recorded anonymously (see
    // migration 011_anon_playback_events.sql) so the learning system isn't
    // blind to the (likely large) share of traffic that never signs in.
    let userId: string | null = null;
    try {
      const auth = await requireAuth();
      userId = auth.userId;
    } catch { /* guest — proceed with userId = null */ }

    const body = await request.json().catch(() => null);
    const parsed = playbackEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 },
      );
    }
    const { mediaId, provider, eventType, contentType, position, duration, metadata } = parsed.data;

    const profileId = userId ? (await getVerifiedProfileId(userId) || userId) : null;

    await recordPlaybackEvent({
      userId,
      profileId,
      mediaId: Number(mediaId),
      provider: String(provider),
      eventType: eventType as PlaybackEventType,
      contentType,
      timestamp: Date.now(),
      position: position !== undefined ? Number(position) : undefined,
      duration: duration !== undefined ? Number(duration) : undefined,
      metadata: metadata || undefined,
    });

    return NextResponse.json({ status: 'recorded' }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}