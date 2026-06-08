import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { commentPostSchema, commentDeleteSchema } from "@/lib/schemas";

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
    const { data, error } = await supabase
      .from("comments")
      .select("id, profile_id, media_id, media_type, content, created_at, rating, profiles!inner(name, avatar_url)")
      .eq("media_id", mediaId)
      .eq("media_type", mediaType)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ comments: [] });

    const comments: CommentRow[] = (data as unknown as CommentQueryRow[] || []).map((c) => ({
      id: c.id,
      profile_id: c.profile_id,
      content: c.content,
      created_at: c.created_at,
      profile_name: c.profiles?.[0]?.name || "Anonymous",
      profile_avatar: c.profiles?.[0]?.avatar_url || null,
      rating: c.rating as number | undefined,
    }));

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

    const insertData: Record<string, unknown> = {
      profile_id: profileId,
      media_id: mediaId,
      media_type: mediaType,
      content: content.trim(),
    };
    if (rating && rating > 0) insertData.rating = rating;

    const { error } = await supabase.from("comments").insert(insertData);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
