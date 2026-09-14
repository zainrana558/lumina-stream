import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, verifyProfileOwnership, getVerifiedProfileId, HttpError } from '@/lib/auth';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { notificationMarkReadSchema, notificationMarkAllReadSchema } from '@/lib/schemas';
import { csrfGuard } from '@/lib/csrf';
import { ensureCsrfCookie } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    await ensureCsrfCookie();
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { notifications: [], unreadCount: 0, error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // JWT fast-path — the NotificationBell polls this every 30-60s per open
    // tab; a Supabase Auth round-trip on each poll is pure waste.
    let userId: string;
    try {
      ({ userId } = await requireAuth());
    } catch {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }
    const supabase = await createClient();

    const profileId = await getVerifiedProfileId(userId);
    if (!profileId) return NextResponse.json({ notifications: [], unreadCount: 0 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Poll requests (limit<=1) only want the badge count — skip the list query.
    const countOnly = limit <= 1;

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('is_read', false);

    if (countOnly) {
      return NextResponse.json({ notifications: [], unreadCount: unreadCount || 0 },
        { headers: rateLimitHeaders(rl) });
    }

    // Get notifications with sender profile info
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, media_id, media_type, from_profile_id, link, is_read, created_at, from_profile:profiles!inner(id, name, avatar_url)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ notifications: [], unreadCount: 0, error: error.message }, { status: 500 });

    return NextResponse.json({
      notifications: data || [],
      unreadCount: unreadCount || 0,
    }, {
      headers: rateLimitHeaders(rl),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ notifications: [], unreadCount: 0, error: message });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = await csrfGuard(request);
    if (csrfError) {
      return NextResponse.json(csrfError, { status: csrfError.status });
    }

    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();

    // Mark-all only when explicitly requested AND no single id is given —
    // otherwise a valid single mark-read payload (which also carries profileId)
    // would match this schema and wipe the whole unread list.
    const markAllParsed =
      body?.markAll === true && !body?.notificationId
        ? notificationMarkAllReadSchema.safeParse(body)
        : ({ success: false } as const);
    if (markAllParsed.success) {
      const { supabase, userId } = await requireAuth();
      const { profileId } = markAllParsed.data;
      await verifyProfileOwnership(supabase, profileId, userId);
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('profile_id', profileId)
        .eq('is_read', false);
      return NextResponse.json({ success: true });
    }

    // Fall back to single notification mark-read schema
    const parsed = notificationMarkReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { notificationId, profileId } = parsed.data;
    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('profile_id', profileId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = await csrfGuard(request);
    if (csrfError) {
      return NextResponse.json(csrfError, { status: csrfError.status });
    }

    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const parsed = notificationMarkReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { notificationId, profileId } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('profile_id', profileId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
