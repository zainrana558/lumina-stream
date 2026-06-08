"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";

const ratingSchema = z.object({
  profile_id: z.string().min(1),
  media_id: z.number(),
  media_type: z.enum(["movie", "tv"]),
  rating: z.number().min(1).max(10),
});

export async function setRating(data: z.infer<typeof ratingSchema>) {
  const { supabase, userId } = await requireAuth();
  await verifyProfileOwnership(supabase, data.profile_id, userId);

  const parsed = ratingSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid data" };

  const { error } = await supabase.from("ratings").upsert(
    parsed.data,
    { onConflict: "profile_id,media_id,media_type" }
  );

  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function getRating(profileId: string, mediaId: number, mediaType: "movie" | "tv") {
  const { supabase, userId } = await requireAuth();
  await verifyProfileOwnership(supabase, profileId, userId);
  const { data } = await supabase
    .from("ratings")
    .select("rating")
    .eq("profile_id", profileId)
    .eq("media_id", mediaId)
    .eq("media_type", mediaType)
    .maybeSingle();

  return data?.rating ?? null;
}
