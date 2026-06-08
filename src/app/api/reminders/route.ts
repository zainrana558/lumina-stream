import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, verifyProfileOwnership, getVerifiedProfileId } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { reminderCreateSchema, reminderDeleteSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  try {
    // Rate limit: global (100/10s) — reminders read is cheap
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { reminders: [], error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ reminders: [] });

    const profileId = await getVerifiedProfileId(user.id);
    if (!profileId) return NextResponse.json({ reminders: [] });

    // Select only needed columns, limit to 50
    const { data } = await supabase
      .from("reminders")
      .select("id, profile_id, media_id, media_type, title, poster_path, release_date, created_at")
      .eq("profile_id", profileId)
      .order("release_date", { ascending: true })
      .limit(50);

    const reminders = (data || []).map((r) => ({
      id: r.id,
      mediaId: r.media_id,
      mediaType: r.media_type,
      title: r.title,
      poster_path: r.poster_path,
      releaseDate: r.release_date,
      addedAt: new Date(r.created_at).getTime(),
    }));

    return NextResponse.json({ reminders }, {
      headers: {
        ...rateLimitHeaders(rl),
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ reminders: [], error: message });
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
    const parsed = reminderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, mediaId, mediaType, title, posterPath, releaseDate } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    // Upsert reminder
    const { error } = await supabase.from("reminders").upsert(
      {
        profile_id: profileId,
        media_id: mediaId,
        media_type: mediaType,
        title,
        poster_path: posterPath || null,
        release_date: releaseDate || null,
      },
      { onConflict: "profile_id,media_id,media_type" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
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
    const parsed = reminderDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, mediaId, mediaType } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("profile_id", profileId)
      .eq("media_id", mediaId)
      .eq("media_type", mediaType);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
