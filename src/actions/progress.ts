"use server";

import { z } from "zod";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";

const progressSchema = z.object({
  profile_id: z.string().min(1),
  media_id: z.number(),
  media_type: z.enum(["movie", "tv"]),
  title: z.string(),
  poster_path: z.string().nullable(),
  progress: z.number().min(0),
  duration: z.number().min(0),
  season_number: z.number().optional(),
  episode_number: z.number().optional(),
});

export async function saveProgress(data: z.infer<typeof progressSchema>) {
  const { supabase, userId } = await requireAuth();
  await verifyProfileOwnership(supabase, data.profile_id, userId);

  const parsed = progressSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid data" };

  const { error } = await supabase.from("watch_progress").upsert(
    { ...parsed.data, updated_at: new Date().toISOString() },
    { onConflict: "profile_id,media_id,media_type" }
  );

  if (error) return { error: error.message };
  return { success: true };
}

export async function getContinueWatching(profileId: string) {
  const { supabase, userId } = await requireAuth();
  await verifyProfileOwnership(supabase, profileId, userId);
  const { data } = await supabase
    .from("watch_progress")
    .select("id, profile_id, media_id, media_type, title, poster_path, progress, duration, season_number, episode_number, updated_at")
    .eq("profile_id", profileId)
    .gt("progress", 0)
    .order("updated_at", { ascending: false })
    .limit(20);

  return data || [];
}

