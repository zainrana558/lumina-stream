import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, verifyProfileOwnership, HttpError } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { commentPostSchema, commentDeleteSchema } from "@/lib/schemas";
import { csrfGuard } from '@/lib/csrf';
import { ensureCsrfCookie } from '@/lib/csrf';

interface CommentRow {
  id: string;
  profile_id: string;
  content: string;
  created_at: string;
  profile_name: string;
  profile_avatar: string | null;
  rating?: number;
}

interface CommentQueryRow {
  id: string;
  profile_id: string;
  media_id: number;
  media_type: string;
  content: string;
  created_at: string;
  rating?: number;
  profiles: {
    name: string;
    avatar_url: string | null;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    await ensureCsrfCookie();
    // Rate limit: global (100/10s) — comments read is cheap
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { comments: [], error: "Too many requests." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const mediaId = parseInt(searchParams.get("mediaId") || "0");
    const mediaType = searchParams.get("mediaType") || "tv";

    if (!mediaId) return NextResponse.json({ comments: [] });

    const supabase = await createClient();
    const runQuery = (cols: string) =>
      supabase
        .from("comments")
        .select(cols)
        .eq("media_id", mediaId)
        .eq("media_type", mediaType)
        .order("created_at", { ascending: false })
        .limit(50);

    const COLS = "id, profile_id, media_id, media_type, content, created_at, rating, profiles!inner(name, avatar_url)";
    let res = await runQuery(COLS);

    // Tolerate a live DB that predates the `comments.rating` column (see
    // migration 006). Retry once without it rather than failing the whole tab.
    if (res.error && /rating/.test(res.error.message || '')) {
      res = await runQuery(COLS.replace(", rating", ""));
    }

    if (res.error) return NextResponse.json({ comments: [], error: 'Failed to load comments' }, { status: 200 });
    const data = res.data;

    const comments: CommentRow[] = (data as unknown as CommentQueryRow[] || []).map((c) => {
      // PostgREST returns a to-one embed as an object; older versions / some
      // relationship shapes return a 1-element array. Handle both.
      const prof = Array.isArray(c.profiles) ? c.profiles[0] : (c.profiles as unknown as { name?: string; avatar_url?: string | null } | null);
      return {
        id: c.id,
        profile_id: c.profile_id,
        content: c.content,
        created_at: c.created_at,
        profile_name: prof?.name || "Anonymous",
        profile_avatar: prof?.avatar_url || null,
        rating: c.rating as number | undefined,
      };
    });

    return NextResponse.json({ comments }, {
      headers: rateLimitHeaders(rl),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ comments: [], error: message });
  }
}

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = await csrfGuard(request);
    if (csrfError) {
      return NextResponse.json(csrfError, { status: csrfError.status });
    }

    // Rate limit: 10 req / 10s per IP (write endpoint)
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const parsed = commentPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, mediaId, mediaType, content, rating } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    // Defense-in-depth: verify content length after schema transform
    const sanitized = content.trim();
    if (Buffer.byteLength(sanitized, 'utf-8') > 10_000) {
      return NextResponse.json({ error: 'Comment too long' }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      profile_id: profileId,
      media_id: mediaId,
      media_type: mediaType,
      content: sanitized,
    };
    if (rating && rating > 0) insertData.rating = rating;

    let { error } = await supabase.from("comments").insert(insertData);

    // Tolerate a live DB without the `comments.rating` column (migration 006):
    // keep the comment, drop the rating.
    if (error && 'rating' in insertData && /rating/.test(error.message || '')) {
      delete insertData.rating;
      ({ error } = await supabase.from("comments").insert(insertData));
    }

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
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const parsed = commentDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { commentId, profileId } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("profile_id", profileId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
