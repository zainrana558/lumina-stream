import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, verifyProfileOwnership, getVerifiedProfileId } from '@/lib/auth';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { notificationMarkReadSchema, notificationMarkAllReadSchema } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { notifications: [], unreadCount: 0, error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ notifications: [], unreadCount: 0 });

    const profileId = await getVerifiedProfileId(user.id);
    if (!profileId) return NextResponse.json({ notifications: [], unreadCount: 0 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Get notifications with sender profile info
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, media_id, media_type, from_profile_id, link, is_read, created_at, from_profile:profiles!inner(id, name, avatar_url)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ notifications: [], unreadCount: 0 });

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('is_read', false);

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
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();

    // Try mark-all-read schema first (contains markAll: true literal)
    const markAllParsed = notificationMarkAllReadSchema.safeParse(body);
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

    if (error) return NextResponse.json({ error: error.message });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
