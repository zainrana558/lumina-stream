import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, verifyProfileOwnership, getVerifiedProfileId } from '@/lib/auth';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { followSchema } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { followers: [], following: [], error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    if (!profileId) return NextResponse.json({ followers: [], following: [] });

    const supabase = await createClient();

    const { data: followersData } = await supabase
      .from('follows')
      .select('follower_id, created_at, follower:profiles!follows_follower_id_fkey(id, name, avatar_url)')
      .eq('following_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id, created_at, following:profiles!follows_following_id_fkey(id, name, avatar_url)')
      .eq('follower_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Check if current user follows this profile (verified cookie to prevent IDOR)
    let isFollowing = false;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const myProfileId = await getVerifiedProfileId(user.id);
      if (myProfileId && myProfileId !== profileId) {
        const { data: followCheck } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', myProfileId)
          .eq('following_id', profileId)
          .maybeSingle();
        isFollowing = !!followCheck;
      }
    }

    return NextResponse.json({
      followers: followersData || [],
      following: followingData || [],
      followersCount: followersData?.length || 0,
      followingCount: followingData?.length || 0,
      isFollowing,
    }, {
      headers: rateLimitHeaders(rl),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ followers: [], following: [], error: message });
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
    const parsed = followSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, targetProfileId } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    if (profileId === targetProfileId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: profileId, following_id: targetProfileId });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already following' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify the followed user
    const { data: followerProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', profileId)
      .single();

    await supabase.from('notifications').insert({
      profile_id: targetProfileId,
      type: 'follow',
      title: 'New Follower',
      body: `${followerProfile?.name || 'Someone'} started following you`,
      from_profile_id: profileId,
      link: '/activity',
    });

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
    const parsed = followSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, targetProfileId } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', profileId)
      .eq('following_id', targetProfileId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
