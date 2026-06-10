import { NextRequest, NextResponse } from "next/server";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { watchPartyCreateSchema } from "@/lib/schemas";

// POST /api/watch-party/create — create a new watch party room
export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, "write");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const body = await request.json();
    const parsed = watchPartyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profile_id, show_id, media_type, season, episode, title, poster_path } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profile_id, userId);

    // Generate unique 6-char code (no I/O/0/1 to avoid confusion)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    let unique = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const { data: existing } = await supabase
        .from("watch_party_rooms")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!existing) { unique = true; break; }
    }
    if (!unique) return NextResponse.json({ error: "Could not generate unique code" }, { status: 500 });

    const { data: room, error } = await supabase
      .from("watch_party_rooms")
      .insert({
        code,
        host_profile_id: profile_id,
        show_id,
        media_type,
        season: season || 1,
        episode: episode || 1,
        title,
        poster_path: poster_path || null,
      })
      .select("id, code")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-join host as participant
    await supabase.from("watch_party_participants").insert({
      room_id: room.id,
      profile_id: profile_id,
    });

    return NextResponse.json({ roomId: room.id, code: room.code }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
