import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, HttpError } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

// GET /api/watch-party/public — list open, non-expired public rooms to join
// without needing a code first. Same auth requirement as /rooms (signed-in
// users only) — no anonymous scraping of who's watching what.
export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, "stats");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: rooms, error } = await supabase
      .from("watch_party_rooms")
      .select("id, code, show_id, media_type, season, episode, title, poster_path, created_at, expires_at")
      .eq("is_public", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(24);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const roomIds = (rooms || []).map(r => r.id);
    const counts: Record<string, number> = {};
    if (roomIds.length) {
      const { data: participants } = await supabase
        .from("watch_party_participants")
        .select("room_id")
        .in("room_id", roomIds);
      for (const p of participants || []) {
        counts[p.room_id] = (counts[p.room_id] || 0) + 1;
      }
    }

    const result = (rooms || []).map(r => ({ ...r, participant_count: counts[r.id] || 0 }));

    return NextResponse.json({ rooms: result }, { headers: rateLimitHeaders(rl) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
