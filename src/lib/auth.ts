import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AuthResult {
  supabase: SupabaseClient;
  userId: string;
}

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
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
  if (!profile) throw new Error("Profile not found or access denied");
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
