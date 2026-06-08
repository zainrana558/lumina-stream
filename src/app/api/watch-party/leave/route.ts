import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { watchPartyLeaveSchema } from "@/lib/schemas";

// POST /api/watch-party/leave — leave a room
export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, "write");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const body = await request.json();
    const parsed = watchPartyLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profile_id, room_id } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profile_id, userId);

    // Remove participant
    await supabase
      .from("watch_party_participants")
      .delete()
      .eq("room_id", room_id)
      .eq("profile_id", profile_id);

    // If host left, close the room
    const { data: room } = await supabase
      .from("watch_party_rooms")
      .select("host_profile_id")
      .eq("id", room_id)
      .maybeSingle();

    if (room && room.host_profile_id === profile_id) {
      await supabase.from("watch_party_rooms").delete().eq("id", room_id);
    }

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
