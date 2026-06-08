"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";

const watchlistSchema = z.object({
  profile_id: z.string().min(1),
  media_id: z.number(),
  media_type: z.enum(["movie", "tv"]),
  title: z.string(),
  poster_path: z.string().nullable(),
  status: z.enum(["plan_to_watch", "watching", "completed"]).optional().default("plan_to_watch"),
});

export async function addToWatchlist(data: z.infer<typeof watchlistSchema>) {
  const { supabase, userId } = await requireAuth();
  await verifyProfileOwnership(supabase, data.profile_id, userId);

  const parsed = watchlistSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid data" };

  const { error } = await supabase.from("watchlist").upsert(
    parsed.data,
    { onConflict: "profile_id,media_id,media_type" }
  );

  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function removeFromWatchlist(profileId: string, mediaId: number, mediaType: "movie" | "tv") {
  const { supabase, userId } = await requireAuth();
  await verifyProfileOwnership(supabase, profileId, userId);

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("profile_id", profileId)
    .eq("media_id", mediaId)
    .eq("media_type", mediaType);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function getWatchlist(profileId: string) {
  const { supabase, userId } = await requireAuth();
  await verifyProfileOwnership(supabase, profileId, userId);
  const { data } = await supabase
    .from("watchlist")
    .select("id, profile_id, media_id, media_type, title, poster_path, status, added_at")
    .eq("profile_id", profileId)
    .order("added_at", { ascending: false })
    .limit(100);

  return data || [];
}

export async function isInWatchlist(profileId: string, mediaId: number, mediaType: "movie" | "tv") {
  const { supabase, userId } = await requireAuth();
  await verifyProfileOwnership(supabase, profileId, userId);
  const { data } = await supabase
    .from("watchlist")
    .select("id")
    .eq("profile_id", profileId)
    .eq("media_id", mediaId)
    .eq("media_type", mediaType)
    .maybeSingle();

  return !!data;
}
