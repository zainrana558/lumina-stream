import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedProfileId } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Rate limit: global (100/10s) — active profile check is cheap
    const rl = await checkRateLimit(request);
    if (!rl.success) {
      return NextResponse.json(
        { profile: null, error: "Too many requests." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ profile: null });

    const profileId = await getVerifiedProfileId(user.id);
    if (!profileId) return NextResponse.json({ profile: null });

    // Fetch full profile data for context
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, created_at, account_id, is_kids")
      .eq("id", profileId)
      .single();

    if (!profile) return NextResponse.json({ profile: null });

    return NextResponse.json({ profile }, {
      headers: rateLimitHeaders(rl),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ profile: null, error: message });
  }
}
