-- ============================================================
-- FIX: avatars storage bucket RLS was ownership-blind.
--
-- "Users can update own avatars" / "Users can delete own avatars"
-- (005_complete_setup.sql) checked only auth.role() = 'authenticated',
-- never the object path — any signed-in user could overwrite or delete
-- ANY other user's avatar file. The app uploads to `${profileId}/${filename}`
-- (src/components/auth/ProfileSelector.tsx), so the fix ties the path's
-- first folder segment to a profile owned by the caller's auth.uid().
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

CREATE POLICY "Users can upload avatars to own profile folder" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.profiles WHERE account_id = auth.uid())
  );

CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.profiles WHERE account_id = auth.uid())
  );

CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.profiles WHERE account_id = auth.uid())
  );

-- Enforce the client-side type/size checks (ProfileSelector.tsx) server-side too.
UPDATE storage.buckets
SET file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';
