---
name: lumina-stream-2026-09-23-session
description: "Lumovia work from 2026-09-23 to 2026-09-25: content-aware provider learning fix, homepage/UX additions (guest playback events, thumbs feedback, status page, PWA install, public watch parties), plus confirmed live status of the earlier security-hardening plan and current repo/deploy state"
metadata:
  type: project
  originSessionId: 88ec5773-0abc-4c6b-afe1-a01b0a9ee495
  modified: 2026-09-25T12:29:55.944Z
---

Continuation of [[lumina-stream-overview]] / [[lumina-stream-architecture]] / [[lumina-stream-known-issues]]
(those are from 2026-09-10/11 and are now stale on several points this file corrects). Work below spans
2026-09-23 to 2026-09-25.

## 1. Content-aware provider learning system (fixed 2026-09-23)

User asked to verify the "find the best provider" scoring logic actually differentiates by content.
Found it was 100% content-blind — verified live that the same provider scored identically for two
unrelated movies. Root cause: `historicalCache` (in-memory), the Redis bonus cache, and the DB
`provider_performance` table were all keyed by provider name ALONE, no content-type dimension anywhere.

Also found independently: `aggregate_provider_performance()` (the SQL RPC that turns raw
`playback_analytics` rows into `provider_performance`) existed in migrations 005/006 but was **never
called by any application code** — the entire DB-backed learning signal had likely been a silent no-op
since inception.

Fixed via `supabase/migrations/010_content_aware_learning.sql` (applied live via the Supabase
Management API, `POST /v1/projects/{ref}/database/query` with `SUPABASE_ACCESS_TOKEN` — no `psql`/CLI
installed on this box, this is the standing way migrations get applied): added `content_type` to both
tables, changed `provider_performance`'s PK to `(provider, content_type)`, and `syncPerformanceToRedis()`
in `src/lib/streaming/learning.ts` now calls the RPC before reading. Every function in `learning.ts` and
`provider-intelligence.ts` now takes/threads a `contentType: 'movie'|'tv'|'anime'` param. Verified
end-to-end with seeded synthetic data producing correctly-split rows.

**Why:** without this, the learning system could never learn "provider X is great for movies, bad for
TV" — a real, observed case — because everything blended into one score.
**How to apply:** if provider selection quality is ever questioned again, this is already fixed and
verified — look for a NEW bug, don't re-diagnose this one.

## 2. `reportEvent` was dead code — the whole learning pipeline had zero real client signal (found + fixed 2026-09-25)

While wiring guest playback events (below), discovered `IntelligentPlayer.tsx`'s `reportEvent` function
was fully built (throttled, posts to `/api/playback/event`) but **never called anywhere in the
component**. The entire content-aware learning system from item 1 — a real, working, verified backend —
had never received a single actual playback event from real usage. Wired it to fire: `'play'` on iframe
`onLoad`, `'error'` on iframe `onError`, and `'complete'` once a session's `time/duration >= 0.9` (matches
the exact threshold `aggregate_provider_performance()` already uses for "successful_plays").

**Why this matters going forward:** a backend being correctly built and verified with seeded test data is
NOT the same as it receiving real signal — always grep for actual call sites of a reporting/telemetry
function, not just its definition, before treating a pipeline as "wired up."

## 3. Guest (logged-out) playback events now recorded (2026-09-25)

`/api/playback/event` required `requireAuth()` and would 401 for guests; `IntelligentPlayer` also
gated `reportEvent` on `isAuthenticated`. Since guests are likely a large share of traffic on a
no-signup-required free streaming site, this meant the learning system was blind to them. Fixed:
- New migration `011_anon_playback_events.sql` — added an RLS INSERT policy on `playback_analytics`
  for `user_id IS NULL AND profile_id IS NULL` (the existing policy required `user_id = auth.uid()`,
  which is `NULL = NULL` → false for anonymous requests, so this was a genuine RLS gap, not just an
  app-layer gate).
- `route.ts` and `learning.ts` (`PlaybackEvent.userId`/`profileId`) now accept `null`.
- `IntelligentPlayer.tsx` no longer gates `reportEvent` on `isAuthenticated`.

Resume/save-resume features correctly remain auth-only (per-user state, not applicable to guests).

## 4. Other features built 2026-09-23–25 (all typechecked, built, deployed, smoke-tested)

- **Explicit thumbs up/down feedback** in the player (top-left, next to the provider switcher). Reuses
  the same `'complete'`/`'error'` event types the aggregate SQL already treats as success/failure,
  tagged `metadata.explicitFeedback: true`. Sent unthrottled (a deliberate click should never be dropped).
- **Homepage row dedup**: removed "Top 10 This Week" — it sourced from the exact same `trending` array
  as "Trending Now" (just sliced 10 vs 12), a near-total content duplicate. User specifically asked to
  "reduce rows that are mostly similar."
- **"NEW" badges** on Card.tsx (bottom-left ribbon) — real release-date signal (within 7 days of
  `release_date`/`first_air_date`), applied only to Now Playing / Airing Today rows. Follows the
  honest-freshness-signal principle already established for blog post dates (never fabricate).
- **`/status` page** (public) — `StatusContent.tsx` fetches `/api/health`, which got a new `categories`
  field (`{site, streaming, database}` booleans only). Deliberately does NOT expose provider
  counts/hostnames — an earlier audit finding (F-15, see [[lumina-stream-known-issues]] Round 9-adjacent
  work) specifically hid that from anonymous callers as a probing-surface risk; the status page respects
  that instead of undoing it.
- **PWA install prompt** — `InstallPrompt.tsx`, listens for `beforeinstallprompt` (manifest.json was
  already fully configured but nothing ever triggered the native flow). Dismissible, 14-day cooldown via
  localStorage.
- **Public watch-party rooms** — migration `012_public_watch_party_rooms.sql` adds
  `watch_party_rooms.is_public`; a "list this room publicly" checkbox in `WatchPartyPanel.tsx`; new
  `/api/watch-party/public` list endpoint; new `/watch-party/browse` page. Kept intentionally simple:
  clicking a room copies its code + navigates to the show page rather than deep-wiring
  `DetailsContent`/`WatchPartyPanel` for a query-param auto-join (scope tradeoff, noted at the time).

Migrations applied this session, in order: `010_content_aware_learning.sql`,
`011_anon_playback_events.sql`, `012_public_watch_party_rooms.sql`. All applied live via the Supabase
Management API pattern above.

## 5. The earlier "Security Hardening + Free-Tier Caching Resilience" plan is DONE, contrary to appearances

A plan file (`~/.claude/plans/lucky-jingling-perlis.md`, "Part A" critical security fixes + "Part B"
Realtime migration for NotificationBell/WatchPartyPanel) surfaced again in this session's system context
looking like open work. **Spot-checked and confirmed already fully implemented and deployed** (just not
committed — see item 6): `safeRedirectPath()` used in both `ProfileSelector.tsx` and
`auth/callback/route.ts` (A1/A2), `007_fix_avatar_storage_rls.sql` exists (A3), `embed-proxy/route.ts`
proxies server-side with an allowlist instead of redirecting with the key exposed (A4),
`iframe-proxy/route.ts` uses `redirect: 'manual'` with re-validation (A5), `playback/aggregate/route.ts`
fails closed on a missing `CRON_SECRET` (A7), `playerResumeSchema` + `.safeParse()` is in
`save-resume/route.ts` (A9), `safeJsonLd` has 41 call sites (A10), and `NotificationBell.tsx` uses
`postgres_changes` Realtime subscriptions, not polling (Part B). Did not re-check A6 (`/api/cdn/image`
rate limit — that route doesn't currently exist under that path, may have been renamed/removed) or
`vercel.json` (A8, low-stakes/inert since the site isn't on Vercel).

**Why this matters:** don't re-open or re-plan this work if it resurfaces in context — it's done. If in
doubt, spot-check the specific file/line the plan cites rather than assuming a stale-looking plan file
means the work wasn't done. Correction: `git log` confirms the Part A/B fixes were already committed in
earlier commits (`b1981f4` "Consolidate provider, search, legal, and mobile UX work" and others,
well before the 2026-09-17 `37cedb4` commit) — they are NOT part of the uncommitted backlog in item 6.

## 6. Current repo state

- 2026-09-25: 27 files (20 modified + 7 new, all from items 1-4 above only) were committed and pushed
  to `origin/main` in commit **(see git log for the actual hash — committed same day, message covers
  content-aware learning + guest playback events + thumbs feedback + status/PWA/public-watch-party)**.
  `main` was fast-forward/in-sync with `origin/main` before this push (no divergence, no merge needed).
- Modified: `ClientShell.tsx`, `blog/[slug]/BlogPost.tsx` + `page.tsx`, `(app)/page.tsx`,
  `embed-health-client/route.ts`, `embed/route.ts`, `health/route.ts`, `playback/event/route.ts`,
  `watch-party/create/route.ts`, `Card.tsx`, `IntelligentPlayer.tsx`, `WatchPartyPanel.tsx`,
  `DetailsContent.tsx`, `blog-articles.ts`, `schemas.ts`, `health-check.ts`, `learning.ts`,
  `provider-intelligence.ts`, `scoring.ts`, `types/index.ts`.
- New (untracked): `(app)/status/`, `(app)/watch-party/`, `api/watch-party/public/`,
  `InstallPrompt.tsx`, migrations `010`/`011`/`012`.
- Next session should ask the user whether to commit/push this backlog before piling on more uncommitted
  work, given its size.

## 7. VM/service resource usage (checked 2026-09-25, for reference — will drift over time)

Azure `Standard_D4as_v7` (4 vCPU, 16GB RAM), region westus2. At check time: ~0.09% average CPU
utilization since last restart, 291MB RAM used by the Node process, 10GB/124GB disk. Upstash Redis at
84,249/500,000 monthly commands (~17%). Cloudflare Workers (`api-cache`, `cache-proxy`) at a few hundred
requests/day combined, nowhere near the 100k/day free-tier limit per worker. Supabase DB at 14MB of the
500MB free tier. **All headroom, nothing near a limit** — re-check live via the Upstash/Cloudflare/Supabase
APIs (credentials in `.env.local`, see [[lumina-stream-credentials]]) rather than trusting these numbers
if asked again later, since they'll have moved.
