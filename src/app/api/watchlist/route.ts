import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, verifyProfileOwnership, getVerifiedProfileId } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { watchlistAddSchema, watchlistDeleteSchema, watchlistPatchSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  try {
    // Rate limit: global (100/10s) — watchlist read is cheap
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { items: [], error: "Too many requests." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ items: [] });

    const profileId = await getVerifiedProfileId(user.id);
    if (!profileId) return NextResponse.json({ items: [] });

    const { data } = await supabase
      .from("watchlist")
      .select("id, profile_id, media_id, media_type, title, poster_path, status, added_at")
      .eq("profile_id", profileId)
      .order("added_at", { ascending: false })
      .limit(100);

    return NextResponse.json({ items: data || [] }, {
      headers: rateLimitHeaders(rl),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ items: [], error: message });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const parsed = watchlistAddSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, mediaId, mediaType, title, poster_path, status } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { error } = await supabase.from("watchlist").upsert(
      {
        profile_id: profileId,
        media_id: mediaId,
        media_type: mediaType,
        title,
        poster_path: poster_path || null,
        status,
      },
      { onConflict: "profile_id,media_id,media_type" }
    );

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
    const parsed = watchlistDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, mediaId, mediaType } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("profile_id", profileId)
      .eq("media_id", mediaId)
      .eq("media_type", mediaType);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const parsed = watchlistPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, mediaId, mediaType, status } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { error } = await supabase
      .from("watchlist")
      .update({ status })
      .eq("profile_id", profileId)
      .eq("media_id", mediaId)
      .eq("media_type", mediaType);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
