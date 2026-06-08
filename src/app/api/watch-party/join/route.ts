import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { watchPartyJoinSchema } from "@/lib/schemas";

// POST /api/watch-party/join — join an existing room by code
export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, "write");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const body = await request.json();
    const parsed = watchPartyJoinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profile_id, code } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profile_id, userId);

    const upperCode = code.toUpperCase().trim();

    // Find room
    const { data: room, error: roomError } = await supabase
      .from("watch_party_rooms")
      .select("id, code, expires_at")
      .eq("code", upperCode)
      .maybeSingle();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (new Date(room.expires_at) < new Date()) {
      await supabase.from("watch_party_rooms").delete().eq("id", room.id);
      return NextResponse.json({ error: "Room has expired" }, { status: 410 });
    }

    // Upsert participant + update heartbeat
    const { error } = await supabase.from("watch_party_participants").upsert(
      { room_id: room.id, profile_id: profile_id, last_heartbeat: new Date().toISOString() },
      { onConflict: "room_id,profile_id" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ roomId: room.id, code: room.code }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
