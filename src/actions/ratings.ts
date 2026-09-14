"use server";

import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireAuth, verifyProfileOwnership } from "@/lib/auth";
import { purgeEdgeCache } from "@/lib/cloudflare-purge";

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

  // Atomic upsert via single RPC
  let { error } = await supabase.rpc(
    "upsert_rating_atomically",
    {
      p_profile_id: parsed.data.profile_id,
      p_media_id: parsed.data.media_id,
      p_media_type: parsed.data.media_type,
      p_rating: parsed.data.rating,
    }
  );

  // The live RPC has an ambiguous `profile_id` reference / relies on a
  // `ratings.updated_at` column that may be absent (fixed in migration 006).
  // Fall back to a plain upsert so rating a title still works.
  if (error && /ambiguous|updated_at|does not exist|column reference/i.test(error.message || '')) {
    const row: Record<string, unknown> = {
      profile_id: parsed.data.profile_id,
      media_id: parsed.data.media_id,
      media_type: parsed.data.media_type,
      rating: parsed.data.rating,
    };
    let up = await supabase.from("ratings").upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: "profile_id,media_id,media_type" },
    );
    if (up.error && /updated_at/.test(up.error.message || '')) {
      up = await supabase.from("ratings").upsert(row, { onConflict: "profile_id,media_id,media_type" });
    }
    error = up.error;
  }

  if (error) return { error: error.message };

  // Dual invalidation: origin + edge
  revalidateTag("user-ratings", "default");

  // Ensure purgeEdgeCache runs in the background reliably
  after(async () => {
    await purgeEdgeCache("user-ratings");
  });

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