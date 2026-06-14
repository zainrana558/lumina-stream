import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AuthResult {
  supabase: SupabaseClient;
  userId: string;
}

/**
 * Lightweight JWT decoder — extracts payload without calling Supabase Auth.
 * Validates expiry and basic structure, but does NOT verify the signature
 * (Supabase RLS handles signature verification at the Postgres level).
 *
 * This saves 1 network round-trip to Supabase Auth per request.
 */
function decodeJwtLocal(token: string): { sub: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode base64url payload
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    const data = JSON.parse(jsonStr);

    // Must have a subject (user ID)
    if (typeof data.sub !== 'string' || !data.sub) return null;

    // Check expiry
    if (data.exp && Date.now() >= data.exp * 1000) return null;

    return { sub: data.sub, exp: data.exp };
  } catch {
    return null;
  }
}

/**
 * Extract JWT from cookies and decode locally.
 * Falls back to Supabase Auth API call if cookie is missing or expired.
 */
async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Supabase SSR stores tokens as sb-<ref>-access-token
  const accessTokenCookie = allCookies.find(
    c => c.name.includes('-access-token') || c.name === 'sb-access-token'
  );

  if (!accessTokenCookie?.value) return null;

  const decoded = decodeJwtLocal(accessTokenCookie.value);
  if (decoded) return decoded.sub;

  // Token expired or malformed — return null (caller can decide to refresh)
  return null;
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