import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, verifyProfileOwnership, getVerifiedProfileId } from '@/lib/auth';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { collectionUpdateSchema } from '@/lib/schemas';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json({ collection: null, error: 'Too many requests.' }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('collections')
      .select('id, profile_id, name, description, cover_path, is_public, created_at, updated_at, profile:profiles!inner(id, name, avatar_url)')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return NextResponse.json({ collection: null });

    if (!data.is_public) {
      const { supabase: authedSupabase, userId } = await requireAuth();
      await verifyProfileOwnership(authedSupabase, data.profile_id, userId);
    }

    const { data: items } = await supabase
      .from('collection_items')
      .select('id, media_id, media_type, title, poster_path, order_index, added_at')
      .eq('collection_id', id)
      .order('order_index', { ascending: true });

    return NextResponse.json({ collection: data, items: items || [] }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ collection: null, items: [], error: message });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = collectionUpdateSchema.safeParse({ ...body, collectionId: id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }

    const { profileId, name, description, isPublic, coverPath } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isPublic !== undefined) updateData.is_public = isPublic;
    if (coverPath !== undefined) updateData.cover_path = coverPath;

    const { error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .eq('profile_id', profileId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
