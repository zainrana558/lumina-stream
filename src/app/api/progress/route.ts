import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { getVerifiedProfileId } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Rate limit: global (100/10s) — progress reads are frequent but cheap
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { items: [], error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ items: [] });

    const profileId = await getVerifiedProfileId(user.id);
    if (!profileId) return NextResponse.json({ items: [] });

    // Select only needed columns, limit to 20
    const { data } = await supabase
      .from("watch_progress")
      .select("id, media_id, media_type, title, poster_path, progress, duration, season_number, episode_number, updated_at")
      .eq("profile_id", profileId)
      .gt("progress", 0)
      .order("updated_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ items: data || [] }, {
      headers: {
        ...rateLimitHeaders(rl),
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ items: [], error: message });
  }
}
