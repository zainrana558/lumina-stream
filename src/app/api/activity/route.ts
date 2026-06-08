import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, verifyProfileOwnership } from '@/lib/auth';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { activityLogSchema } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { activities: [], error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId') || '';
    const feed = searchParams.get('feed') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!profileId) return NextResponse.json({ activities: [] });

    const supabase = await createClient();

    if (feed) {
      // Activity feed: activities from followed users + own
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profileId);

      const followingIds = (following || []).map(f => f.following_id);
      followingIds.push(profileId);

      const { data, error } = await supabase
        .from('activities')
        .select('id, type, media_id, media_type, title, poster_path, metadata, created_at, profile:profiles!inner(id, name, avatar_url)')
        .in('profile_id', followingIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return NextResponse.json({ activities: [] });
      return NextResponse.json({ activities: data || [] }, { headers: rateLimitHeaders(rl) });
    }

    const { data, error } = await supabase
      .from('activities')
      .select('id, type, media_id, media_type, title, poster_path, metadata, created_at, profile:profiles!inner(id, name, avatar_url)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ activities: [] });
    return NextResponse.json({ activities: data || [] }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ activities: [], error: message });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const parsed = activityLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }

    const { profileId, type, mediaId, mediaType, title, posterPath, metadata } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const insertData: Record<string, unknown> = {
      profile_id: profileId,
      type,
      metadata: metadata || {},
    };
    if (mediaId) insertData.media_id = mediaId;
    if (mediaType) insertData.media_type = mediaType;
    if (title) insertData.title = title;
    if (posterPath !== undefined) insertData.poster_path = posterPath;

    const { error } = await supabase.from('activities').insert(insertData);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
