import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, HttpError } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

// GET /api/watch-party/rooms?code=xxx — fetch room data, participants, and recent messages
export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    // Require auth — room data is for authenticated participants only
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch room
    const { data: room, error: roomError } = await supabase
      .from("watch_party_rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check expiry
    if (new Date(room.expires_at) < new Date()) {
      await supabase.from("watch_party_rooms").delete().eq("id", room.id);
      return NextResponse.json({ error: "Room has expired" }, { status: 410 });
    }

    // Fetch participants with profile data
    const { data: participantsRaw } = await supabase
      .from("watch_party_participants")
      .select("profile_id, profiles(name, avatar_url), joined_at")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });

    const participants = (participantsRaw || []).map((p: {
      profile_id: string;
      joined_at: string;
      profiles: { name: string; avatar_url: string | null }[] | { name: string; avatar_url: string | null } | null;
    }) => {
      const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      return {
        profile_id: p.profile_id,
        name: prof?.name || "Anonymous",
        avatar_url: prof?.avatar_url || null,
        joined_at: p.joined_at,
        is_host: p.profile_id === room.host_profile_id,
      };
    });

    // Fetch recent messages (last 50)
    const { data: messagesRaw } = await supabase
      .from("watch_party_messages")
      .select("id, profile_id, content, created_at, profiles(name, avatar_url)")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .limit(50);

    const messages = (messagesRaw || []).map((m: {
      id: string;
      profile_id: string;
      content: string;
      created_at: string;
      profiles: { name: string; avatar_url: string | null }[] | { name: string; avatar_url: string | null } | null;
    }) => {
      const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return {
        id: m.id,
        profile_id: m.profile_id,
        name: prof?.name || "Anonymous",
        avatar_url: prof?.avatar_url || null,
        content: m.content,
        created_at: m.created_at,
      };
    });

    return NextResponse.json(
      {
        room: {
          id: room.id,
          code: room.code,
          host_profile_id: room.host_profile_id,
          show_id: room.show_id,
          media_type: room.media_type,
          season: room.season,
          episode: room.episode,
          is_playing: room.is_playing,
          playback_time: room.playback_time,
          title: room.title,
          poster_path: room.poster_path,
          expires_at: room.expires_at,
        },
        participants,
        messages,
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
