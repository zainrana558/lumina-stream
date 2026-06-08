import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { watchPartySyncSchema } from "@/lib/schemas";

// POST /api/watch-party/sync — host syncs playback state to all participants
// Body: { profile_id, room_id, is_playing, playback_time, season?, episode? }
export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, "write");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const body = await request.json();
    const parsed = watchPartySyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profile_id, room_id, is_playing, playback_time, season, episode } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profile_id, userId);

    // Verify the user is the host of this room
    const { data: room } = await supabase
      .from("watch_party_rooms")
      .select("host_profile_id")
      .eq("id", room_id)
      .maybeSingle();

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.host_profile_id !== profile_id) {
      return NextResponse.json({ error: "Only the host can control playback" }, { status: 403 });
    }

    // Build update object
    const update: Record<string, unknown> = {};
    if (typeof is_playing === "boolean") update.is_playing = is_playing;
    if (typeof playback_time === "number") update.playback_time = playback_time;
    if (typeof season === "number") update.season = season;
    if (typeof episode === "number") update.episode = episode;

    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from("watch_party_rooms")
        .update(update)
        .eq("id", room_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/watch-party/sync?roomId=xxx — poll for playback state changes
export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    // Require auth — playback sync is for authenticated participants only
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: room, error } = await supabase
      .from("watch_party_rooms")
      .select("is_playing, playback_time, season, episode")
      .eq("id", roomId)
      .maybeSingle();

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Get active participants (heartbeat within last 60s)
    const { data: participants } = await supabase
      .from("watch_party_participants")
      .select("profile_id, profiles(name, avatar_url), joined_at, last_heartbeat")
      .eq("room_id", roomId)
      .gt("last_heartbeat", new Date(Date.now() - 60000).toISOString());

    return NextResponse.json({
      is_playing: room.is_playing,
      playback_time: room.playback_time,
      season: room.season,
      episode: room.episode,
      participant_count: participants?.length || 0,
    }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
