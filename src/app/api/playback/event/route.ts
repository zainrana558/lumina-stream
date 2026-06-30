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
import { requireAuth, getVerifiedProfileId } from '@/lib/auth';
import type { PlaybackEventType } from '@/lib/streaming/learning';

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    // Auth required for event recording
    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.userId;
    } catch {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { mediaId, provider, eventType, position, duration, metadata } = body;

    if (!mediaId || !provider || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: mediaId, provider, eventType' },
        { status: 400 },
      );
    }

    const validEvents: PlaybackEventType[] = [
      'play', 'pause', 'seek', 'buffer_start', 'buffer_end',
      'error', 'complete', 'quality_change', 'provider_switch',
    ];
    if (!validEvents.includes(eventType)) {
      return NextResponse.json({ error: `Invalid event type: ${eventType}` }, { status: 400 });
    }

    const profileId = await getVerifiedProfileId(userId) || userId;

    await recordPlaybackEvent({
      userId,
      profileId,
      mediaId: Number(mediaId),
      provider: String(provider),
      eventType: eventType as PlaybackEventType,
      timestamp: Date.now(),
      position: position !== undefined ? Number(position) : undefined,
      duration: duration !== undefined ? Number(duration) : undefined,
      metadata: metadata || undefined,
    });

    return NextResponse.json({ status: 'recorded' }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}