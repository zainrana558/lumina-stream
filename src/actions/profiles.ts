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

  // Simple cascade deletes — run in parallel for speed
  await Promise.all([
    supabase.from('watchlist').delete().eq('profile_id', profileId),
    supabase.from('ratings').delete().eq('profile_id', profileId),
    supabase.from('comments').delete().eq('profile_id', profileId),
    supabase.from('watch_progress').delete().eq('profile_id', profileId),
    supabase.from('watch_history').delete().eq('profile_id', profileId),
    supabase.from('reminders').delete().eq('profile_id', profileId),
    supabase.from('notifications').delete().eq('profile_id', profileId),
    supabase.from('notifications').delete().eq('from_profile_id', profileId),
    supabase.from('follows').delete().eq('follower_id', profileId),
    supabase.from('follows').delete().eq('following_id', profileId),
    supabase.from('watch_party_participants').delete().eq('profile_id', profileId),
    supabase.from('watch_party_messages').delete().eq('profile_id', profileId),
  ]);

  // Collections: delete items first, then collections themselves
  const { data: collections } = await supabase
    .from('collections')
    .select('id')
    .eq('profile_id', profileId);

  if (collections && collections.length > 0) {
    const collectionIds = collections.map((c) => c.id);
    await supabase.from('collection_items').delete().in('collection_id', collectionIds);
  }
  await supabase.from('collections').delete().eq('profile_id', profileId);

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
