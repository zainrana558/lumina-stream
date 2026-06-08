import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { watchPartyMessageSchema } from "@/lib/schemas";

// POST /api/watch-party/messages — send a chat message to a room
export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, "write");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const body = await request.json();
    const parsed = watchPartyMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profile_id, room_id, content } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profile_id, userId);

    // Verify participant is in the room
    const { data: participant } = await supabase
      .from("watch_party_participants")
      .select("id")
      .eq("room_id", room_id)
      .eq("profile_id", profile_id)
      .maybeSingle();

    if (!participant) {
      return NextResponse.json({ error: "Not in room" }, { status: 403 });
    }

    const { error } = await supabase.from("watch_party_messages").insert({
      room_id: room_id,
      profile_id: profile_id,
      content: content.trim(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/watch-party/messages?roomId=xxx&after=timestamp — poll for new messages
export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    // Require auth — room messages are for authenticated participants only
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const after = searchParams.get("after"); // ISO timestamp filter

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const supabase = await createClient();

    let query = supabase
      .from("watch_party_messages")
      .select("id, profile_id, content, created_at, profiles(name, avatar_url)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (after) {
      query = query.gt("created_at", after);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ messages: [] });

    const messages = (data || []).map((m: { id: string; profile_id: string; content: string; created_at: string; profiles: { name: string; avatar_url: string | null }[] }) => ({
      id: m.id,
      profile_id: m.profile_id,
      name: m.profiles?.[0]?.name || "Anonymous",
      avatar_url: m.profiles?.[0]?.avatar_url || null,
      content: m.content,
      created_at: m.created_at,
    }));

    return NextResponse.json({ messages }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
