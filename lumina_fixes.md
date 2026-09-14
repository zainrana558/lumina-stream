
### Round 5b — Jikan too unreliable, TMDB is the anime workhorse

Jikan's ranked-list + search endpoints (`/top/anime`, `/anime?order_by=`,
`/anime?q=`) 504 constantly (their aggregation layer, not a rate-limit or
CF-block — `/anime/{id}` stays 200). So:

- **Anime LISTS** (trending/popular/seasonal/airing/upcoming/toprated/family/
  genre/browse): AniList → **TMDB** directly. Fast (0.1-0.5s), reliable, full.
- **Anime SEARCH**: AniList → **TMDB** (`/search/tv` filtered to genre 16) →
  Jikan.
- **Anime DETAIL**: AniList → Jikan `/anime/{mal}/full` (single-resource, still
  works) → null. Most items are now TMDB-sourced so they load via the normal
  TMDB detail path anyway.
- `tmdb-anime.ts` items carry `__tmdb` markers; `anilistToMediaItem()` detects
  them and emits a plain TMDB `MediaItem` (real poster_path, `_isAnilist`
  false, raw TMDB id) → routes to `/details/{tmdbId}`, loads via TMDB.
- `workers/api-cache/worker.js` gained a `/jikan/*` edge-cache passthrough
  (deployed, api-cache v3) — used for the Jikan calls that remain (detail).

Verified: every `/api/anime` type returns 20 items in <0.5s; search "naruto" →
Naruto/Shippuden/Boruto; `/genre/anime`, `/seasonal` full; a TMDB-anime detail
page (`/details/45857` REBORN!) loads normally.
