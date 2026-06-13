/**
 * Shared Zod validation schemas for API routes.
 * Centralizes input validation to prevent type-confusion and injection attacks.
 */

import { z } from 'zod';

// ---- Watchlist ----
export const watchlistAddSchema = z.object({
  profileId: z.string().min(1),
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().min(1),
  poster_path: z.string().nullable(),
  status: z.enum(['plan_to_watch', 'watching', 'completed']).optional().default('plan_to_watch'),
});

export const watchlistDeleteSchema = z.object({
  profileId: z.string().min(1),
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
});

export const watchlistPatchSchema = z.object({
  profileId: z.string().min(1),
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  status: z.enum(['plan_to_watch', 'watching', 'completed']),
});

// ---- Comments ----
export const commentPostSchema = z.object({
  profileId: z.string().min(1),
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  content: z.string().trim().min(1).max(2000).transform(v => v.replace(/<[^>]*>/g, '')),
  rating: z.number().min(1).max(5).optional(),
});

export const commentDeleteSchema = z.object({
  commentId: z.string().min(1),
  profileId: z.string().min(1),
});

// ---- Profiles ----
export const profileSelectSchema = z.object({
  profileId: z.string().min(1),
});

export const profileUpdateSchema = z.object({
  profileId: z.string().min(1),
  name: z.string().trim().min(1).max(20).optional(),
  is_kids: z.boolean().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

// ---- Notifications ----
export const notificationMarkReadSchema = z.object({
  notificationId: z.string().min(1),
  profileId: z.string().min(1),
});

export const notificationMarkAllReadSchema = z.object({
  profileId: z.string().min(1),
  markAll: z.literal(true),
});

// ---- Follows ----
export const followSchema = z.object({
  profileId: z.string().min(1),
  targetProfileId: z.string().min(1),
});

// ---- Activity ----
export const activityLogSchema = z.object({
  profileId: z.string().min(1),
  type: z.enum(['watched', 'completed', 'added_to_watchlist', 'commented', 'rated', 'created_list', 'updated_list']),
  mediaId: z.number().int().positive().optional(),
  mediaType: z.enum(['movie', 'tv']).optional(),
  title: z.string().max(200).optional(),
  posterPath: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ---- Collections ----
export const collectionCreateSchema = z.object({
  profileId: z.string().min(1),
  name: z.string().trim().min(1).max(100).transform(v => v.replace(/<[^>]*>/g, '')),
  description: z.string().trim().max(500).optional().transform(v => v ? v.replace(/<[^>]*>/g, '') : v),
  isPublic: z.boolean().optional().default(true),
});

export const collectionUpdateSchema = z.object({
  profileId: z.string().min(1),
  collectionId: z.string().min(1),
  name: z.string().trim().min(1).max(100).optional().transform(v => v ? v.replace(/<[^>]*>/g, '') : v),
  description: z.string().trim().max(500).optional().transform(v => v ? v.replace(/<[^>]*>/g, '') : v),
  isPublic: z.boolean().optional(),
  coverPath: z.string().nullable().optional(),
});

export const collectionDeleteSchema = z.object({
  profileId: z.string().min(1),
  collectionId: z.string().min(1),
});

export const collectionAddItemSchema = z.object({
  profileId: z.string().min(1),
  collectionId: z.string().min(1),
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().max(200).optional(),
  posterPath: z.string().nullable().optional(),
});

export const collectionRemoveItemSchema = z.object({
  profileId: z.string().min(1),
  collectionId: z.string().min(1),
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
});

// ---- Watch Party ----
export const watchPartyCreateSchema = z.object({
  profile_id: z.string().min(1),
  show_id: z.number().int().positive(),
  media_type: z.enum(['movie', 'tv']),
  season: z.number().int().min(1).optional().default(1),
  episode: z.number().int().min(1).optional().default(1),
  title: z.string().max(200),
  poster_path: z.string().nullable().optional(),
});

export const watchPartyJoinSchema = z.object({
  profile_id: z.string().min(1),
  code: z.string().length(6),
});

export const watchPartyLeaveSchema = z.object({
  profile_id: z.string().min(1),
  room_id: z.string().min(1),
});

export const watchPartyMessageSchema = z.object({
  profile_id: z.string().min(1),
  room_id: z.string().min(1),
  content: z.string().trim().min(1).max(500),
});

export const watchPartySyncSchema = z.object({
  profile_id: z.string().min(1),
  room_id: z.string().min(1),
  is_playing: z.boolean().optional(),
  playback_time: z.number().min(0).optional(),
  season: z.number().int().min(1).optional(),
  episode: z.number().int().min(1).optional(),
});

// ---- Embed Health (client reporter) ----
export const embedHealthReportSchema = z.object({
  provider: z.string().min(1),
  alive: z.boolean(),
});

// ---- Reminders ----
export const reminderCreateSchema = z.object({
  profileId: z.string().min(1),
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().min(1),
  posterPath: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
});

export const reminderDeleteSchema = z.object({
  profileId: z.string().min(1),
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
});
