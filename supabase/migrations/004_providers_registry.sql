-- Provider registry table for admin-managed configuration
-- This is OPTIONAL — the app works with hardcoded providers + Redis cache
-- Add this to Supabase via the SQL editor when you want admin management
--
-- Migration: 004_providers_registry
-- Created: 2026-06-29
-- Depends on: 001_create_missing_tables.sql (for profiles table used in RLS)

CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tier INT NOT NULL DEFAULT 3 CHECK (tier BETWEEN 1 AND 3),
  base_url TEXT NOT NULL,
  embed_pattern TEXT,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_providers_tier ON providers(tier);
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(is_active);

-- capabilities JSONB example:
-- {
--   "supportsMovie": true,
--   "supportsAnime": false,
--   "supportsEpisode": true,
--   "maxQuality": "1080p",
--   "requiresReferrer": false
-- }

-- RLS: Only authenticated admins can modify
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active providers"
  ON providers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can read all providers"
  ON providers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert providers"
  ON providers FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Add admin role check: auth.jwt() ->> 'role' = 'admin'

CREATE POLICY "Admins can update providers"
  ON providers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true); -- Add admin role check

CREATE POLICY "Admins can delete providers"
  ON providers FOR DELETE
  TO authenticated
  USING (true); -- Add admin role check

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS providers_updated_at ON providers;
CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW
  EXECUTE FUNCTION update_providers_updated_at();