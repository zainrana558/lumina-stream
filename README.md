# Lumovia

A free movie / TV / anime streaming catalog and discovery site. Next.js 16 (App Router), React 19,
TypeScript, Supabase (Postgres + Auth + RLS), Upstash Redis, optional Cloudflare Workers as an edge
cache layer. Metadata from TMDB and AniList; playback via third-party embed providers (no media is
hosted by this app itself).

## Quickstart (local dev)

```bash
bun install
cp .env.example .env.local   # fill in at least TMDB_BEARER_TOKEN or TMDB_API_KEY
bun run dev
```

Only TMDB credentials are required to boot — see `.env.example` for what every other variable does
and whether it's optional. Get free TMDB credentials at
[themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).

## Database setup (optional, but required for accounts/watchlists/comments)

1. Create a free project at [supabase.com](https://supabase.com).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (Project
   Settings → API).
3. Run every file in `supabase/migrations/` against your project, in the order they appear in the
   directory — either paste each one into the Supabase SQL editor, or use the Management API
   (`SUPABASE_ACCESS_TOKEN` from [dashboard account tokens](https://supabase.com/dashboard/account/tokens)):

   ```bash
   for f in supabase/migrations/*.sql; do
     curl -sS -X POST "https://api.supabase.com/v1/projects/<project-ref>/database/query" \
       -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
       -H "Content-Type: application/json" \
       --data-binary "$(python3 -c "import json,sys; print(json.dumps({'query': open(sys.argv[1]).read()}))" "$f")"
   done
   ```

The app runs without Supabase configured — accounts, watchlists, ratings, comments, and watch
parties just won't be available.

## Deploying to Vercel

This app builds cleanly on Vercel with zero special configuration — `vercel.json` already sets the
right cache headers and cron jobs.

1. Push this repo to GitHub and import it in Vercel.
2. Add the environment variables from `.env.example` in Project Settings → Environment Variables
   (at minimum, TMDB; add Supabase/Upstash for full functionality).
3. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL (or custom domain once attached).
4. Deploy. The three cron jobs in `vercel.json` (`cache/warm`, `embed-health-cron`,
   `playback/aggregate`) run automatically on Vercel's own cron — no extra setup needed.

Skip `CLOUDFLARE_*` and `API_CACHE_URL` entirely on Vercel — those are for the optional edge-cache
Worker layer described below, and Vercel has its own CDN in front of the app already.

## Self-hosting (VM / Docker)

`next.config.ts` deliberately does **not** set `output: 'standalone'` so the same build works on
both Vercel and a plain `next start` on a VM. For a VM:

```bash
bun install
bun run build
bun run start   # respects $PORT, defaults to 3000
```

Put a reverse proxy (Caddy, nginx) in front for TLS. A `Caddyfile` is included as a starting point —
point it at your domain and Caddy handles Let's Encrypt automatically:

```
your-domain.com {
	reverse_proxy localhost:3000
}
```

Run it as a systemd service (or your process manager of choice) so it restarts on crash and on boot.

## Optional: Cloudflare Worker edge-cache layer

`workers/cache-proxy.js` and `workers/api-cache/worker.js` are optional Cloudflare Workers that sit
in front of the app and cache both full pages and TMDB/AniList API responses at Cloudflare's edge —
useful for staying within TMDB's and your own infra's rate limits under real traffic. Entirely
optional; the app works fine without them, just without that extra cache tier. Deploy with `wrangler`
(or the raw Workers API if your account's token can't use `wrangler`'s auth flow — see the deploy
pattern in this repo's own operational notes) and point `API_CACHE_URL` / the Worker's own
`VERCEL_ORIGIN`-style binding at wherever you deployed the app.

## Security notes

- Every mutating API route is CSRF-protected and rate-limited; see `src/lib/csrf.ts` and
  `src/lib/rate-limit.ts`.
- Row Level Security is enabled on every Supabase table the app uses — the app never uses a
  service-role key, only the anon key scoped by RLS policies.
- Run `bun audit` after any dependency bump and before deploying — this project tracks dependency
  CVEs seriously; a critical one (Next.js `next/og` RCE) was found and patched during development.
- `FLOW_DEBUG` must stay `0`/unset in production — it wraps every outbound fetch for local debugging
  and adds real overhead with no benefit once traffic is real.
