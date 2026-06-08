import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { profileUpdateSchema } from "@/lib/schemas";

export async function PATCH(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId, name, is_kids, avatar_url } = parsed.data;

    const { supabase, userId } = await requireAuth();
    await verifyProfileOwnership(supabase, profileId, userId);

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (is_kids !== undefined) updates.is_kids = is_kids;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profileId)
      .select("id, name, avatar_url, created_at, account_id, is_kids")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
