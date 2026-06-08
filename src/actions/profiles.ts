"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";
import { sanitizeName } from "@/lib/utils";

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  account_id: string;
}

export async function createProfile(name: string) {
  if (!name || name.trim().length === 0) {
    return { error: "Profile name is required" };
  }

  const sanitized = sanitizeName(name);

  const { supabase, userId } = await requireAuth();

  // Check max profiles
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("account_id", userId);

  if ((count || 0) >= 5) {
    return { error: "Maximum 5 profiles allowed" };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      name: sanitized,
      account_id: userId,
    })
    .select("id, name, avatar_url, created_at, account_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { profile };
}

export async function getProfiles(accountId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify the caller is requesting their own profiles
  if (!user || user.id !== accountId) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, created_at, account_id")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name || "Unnamed",
    avatar_url: p.avatar_url,
    created_at: p.created_at,
    account_id: p.account_id,
  }));
}

export async function deleteProfile(profileId: string) {
  const { supabase, userId } = await requireAuth();
  await verifyProfileOwnership(supabase, profileId, userId);

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
