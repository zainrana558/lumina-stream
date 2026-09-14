import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { localUserIdFromCookies } from "@/lib/supabase/cookie-session";

interface AuthResult {
  supabase: SupabaseClient;
  userId: string;
}

/**
 * Thrown by requireAuth()/verifyProfileOwnership() so route handlers' generic
 * `catch (error) { ... }` blocks can return the right status (401/403)
 * instead of defaulting every auth failure to 500 — confirmed live: joining
 * a watch-party room with a profile_id that fails ownership verification
 * returned HTTP 500 with the message "Profile not found or access denied",
 * which is a 403 condition, not a server error.
 */
export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Extract the user id from the Supabase session cookie and decode it locally.
 * Falls back to a Supabase Auth API call (in requireAuth) if the cookie is
 * missing, malformed, or expired. Saves ~1 network round-trip per request.
 * See {@link localUserIdFromCookies} for the cookie-format handling.
 */
async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return localUserIdFromCookies(cookieStore.getAll());
}

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();

  // Fast path: decode JWT from cookies (no network call)
  const localUserId = await getUserIdFromCookies();
  if (localUserId) {
    return { supabase, userId: localUserId };
  }

  // Slow path: call Supabase Auth (handles token refresh)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new HttpError("Not authenticated", 401);
  return { supabase, userId: user.id };
}

/**
 * Gate for operator-only pages/routes (e.g. /admin/health). requireAuth()
 * alone only proves the caller is SOME signed-in user — there is no admin
 * role in the schema, so every route using requireAuth() is reachable by
 * any registered account. Checks the authenticated user's email against the
 * ADMIN_EMAILS allowlist (comma-separated) in the environment.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const { supabase, userId } = await requireAuth();
  const allowlist = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) throw new HttpError("Admin access not configured", 403);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email || !allowlist.includes(email)) {
    throw new HttpError("Admin access required", 403);
  }
  return { supabase, userId };
}

export async function verifyProfileOwnership(
  supabase: SupabaseClient,
  profileId: string,
  userId: string
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("account_id", userId)
    .maybeSingle();
  if (!profile) throw new HttpError("Profile not found or access denied", 403);
}

/**
 * Shared helper for GET API routes that read profile_id from cookie
 * and verify it belongs to the authenticated user (IDOR prevention).
 * Returns null if unauthenticated, no cookie, or profile invalid.
 * Returns the verified profile ID string on success.
 */
export async function getVerifiedProfileId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const profileId = cookieStore.get("profile_id")?.value;
  if (!profileId) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("account_id", userId)
    .maybeSingle();
  return profile ? profileId : null;
}