import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { profileSelectSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    // Rate limit: 10 req / 10s (profile switch should be infrequent)
    const rl = await checkRateLimit(request, 'write');
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const parsed = profileSelectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    const { profileId } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", profileId)
      .eq("account_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    // Set cookie on the response object — cookies().set() does NOT
    // propagate to NextResponse in Route Handlers
    const response = NextResponse.json({ success: true }, {
      headers: rateLimitHeaders(rl),
    });
    response.cookies.set("profile_id", profileId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
