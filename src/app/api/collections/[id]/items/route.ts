import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, verifyProfileOwnership } from '@/lib/auth';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { collectionAddItemSchema, collectionRemoveItemSchema } from '@/lib/schemas';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { items: [], error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('collection_items')
      .select('id, media_id, media_type, title, poster_path, order_index, added_at')
      .eq('collection_id', id)
      .order('order_index', { ascending: true });

    if (error) return NextResponse.json({ items: [] });
    return NextResponse.json({ items: data || [] }, {
      headers: rateLimitHeaders(rl),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ items: [], error: message });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = collectionAddItemSchema.safeParse({ ...body, collectionId: id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }

    const { profileId, mediaId, mediaType, title, posterPath } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    // Verify collection belongs to user
    const { data: collection } = await supabase
      .from('collections')
      .select('id')
      .eq('id', id)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found or access denied' }, { status: 404 });
    }

    // Atomic: single RPC handles MAX + INSERT in one transaction
    const { data: inserted, error } = await supabase.rpc(
      'insert_collection_item_atomically',
      {
        p_collection_id: id,
        p_media_id: mediaId,
        p_media_type: mediaType,
        p_title: title || '',
        p_poster_path: posterPath || null,
      }
    );

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already in collection' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update collection timestamp
    await supabase
      .from('collections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = collectionRemoveItemSchema.safeParse({ ...body, collectionId: id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }

    const { profileId, mediaId, mediaType } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', id)
      .eq('media_id', mediaId)
      .eq('media_type', mediaType);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update collection timestamp
    await supabase
      .from('collections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
