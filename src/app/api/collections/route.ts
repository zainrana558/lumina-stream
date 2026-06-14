import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, verifyProfileOwnership } from '@/lib/auth';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { collectionCreateSchema, collectionDeleteSchema } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { collections: [], error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const publicOnly = searchParams.get('public') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    let query = supabase
      .from('collections')
      .select('id, profile_id, name, description, cover_path, is_public, created_at, updated_at, profile:profiles!inner(id, name, avatar_url), item_count:collection_items(count)')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (profileId) {
      query = query.eq('profile_id', profileId);
    } else if (publicOnly) {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ collections: [] });

    const collections = (data || []).map(c => ({
      ...c,
      item_count: Array.isArray(c.item_count) ? c.item_count[0]?.count || 0 : 0,
    }));

    return NextResponse.json({ collections }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ collections: [], error: message });
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
    const parsed = collectionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, name, description, isPublic } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { data, error } = await supabase
      .from('collections')
      .insert({
        profile_id: profileId,
        name: name.trim(),
        description: (description || '').trim(),
        is_public: isPublic,
      })
      .select('id, name, description, is_public, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    await supabase.from('activities').insert({
      profile_id: profileId,
      type: 'created_list',
      metadata: { collection_name: name },
    });

    return NextResponse.json({ collection: data });
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
    const parsed = collectionDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, collectionId } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId)
      .eq('profile_id', profileId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
