-- Newsletter signup capture
--
-- Migration: 009_newsletter_subscribers
-- Created: 2026-09-17
--
-- Stores email signups from the newsletter form (src/components/common/
-- NewsletterSignup.tsx, POST /api/newsletter). This table only CAPTURES
-- subscriptions — no email-sending service (Resend/SendGrid/etc.) is
-- configured, so nothing is actually mailed out yet. Wire one up and read
-- from this table when that's ready.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  source TEXT DEFAULT 'footer' -- where on the site they signed up
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);

-- RLS: this table holds real email addresses — nobody gets to read it back
-- through the public API surface. Anyone can INSERT (the signup form isn't
-- gated behind login), but that's it: no SELECT/UPDATE/DELETE policy exists
-- for anon or authenticated at all, so both are fully blocked by default
-- under RLS — email harvesting or tampering isn't possible through the
-- public Supabase client, only via the Supabase dashboard/service role.
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
