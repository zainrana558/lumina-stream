import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { PORTAL_SLUGS } from '@/config/genres';
import { csrfGuard } from '@/lib/csrf';
import { ensureCsrfCookie } from '@/lib/csrf';

/**
 * POST /api/genre-visits
 *
 * Atomically increments a genre visit count for the authenticated user.
 * Falls back silently if Supabase is not configured or user is not authenticated.
 *
 * Body: { genre: string }
 * Response: { ok: boolean, count: number }
 */
export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = await csrfGuard(request);
  if (csrfError) {
    return NextResponse.json(csrfError, { status: csrfError.status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, count: 0, source: 'unconfigured' });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: true, count: 0, source: 'unauthenticated' });
    }

    const body = await request.json() as { genre?: string };
    const genre = body?.genre;

    if (!genre || !PORTAL_SLUGS.includes(genre)) {
      return NextResponse.json({ ok: false, error: 'Invalid genre' }, { status: 400 });
    }

    // Try atomic increment via RPC (row must exist)
    const { data: rpcCount, error: rpcError } = await supabase.rpc('increment_genre_visit', {
      p_user_id: user.id,
      p_genre_slug: genre,
    });

    if (!rpcError && rpcCount !== null) {
      return NextResponse.json({ ok: true, count: rpcCount, source: 'supabase' });
    }

    // Row doesn't exist yet — insert it
    const { error: insertError } = await supabase
      .from('genre_visits')
      .insert({ user_id: user.id, genre_slug: genre, visit_count: 1 });

    if (insertError) {
      console.error('[genre-visits] insert error:', insertError);
      return NextResponse.json({ ok: true, count: 0, source: 'error' });
    }

    return NextResponse.json({ ok: true, count: 1, source: 'supabase' });
  } catch (err) {
    console.error('[genre-visits] unexpected error:', err);
    return NextResponse.json({ ok: true, count: 0, source: 'error' });
  }
}

/**
 * GET /api/genre-visits
 *
 * Returns visit counts for all genres for the authenticated user.
 * Falls back to empty if not configured or not authenticated.
 */
export async function GET() {
  await ensureCsrfCookie();
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ visits: {}, source: 'unconfigured' });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ visits: {}, source: 'unauthenticated' });
    }

    const { data, error } = await supabase
      .from('genre_visits')
      .select('genre_slug, visit_count')
      .eq('user_id', user.id);

    if (error) {
      console.error('[genre-visits] get error:', error);
      return NextResponse.json({ visits: {}, source: 'error' });
    }

    const visits: Record<string, number> = {};
    for (const row of data ?? []) {
      visits[row.genre_slug] = row.visit_count;
    }

    return NextResponse.json({ visits, source: 'supabase' });
  } catch {
    return NextResponse.json({ visits: {}, source: 'error' });
  }
}