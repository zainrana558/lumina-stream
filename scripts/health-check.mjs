#!/usr/bin/env node
/**
 * Health-check every active streaming provider.
 * Pings each provider's movie embed URL (TMDB ID 550 = Fight Club)
 * and reports: HTTP status, latency, X-Frame-Options header.
 *
 * Also tests anime-specific providers with anime embed URLs.
 */

const TEST_MOVIE_ID = 550;   // Fight Club — reliable test ID
const TEST_TV_ID = 1396;     // Breaking Bad S01E01
const TIMEOUT_MS = 12000;

// ── All active providers (synced with providers.ts) ──
const providers = [
  // TIER 1
  { name: 'VidSrc SU',       url: `https://vidsrc.su/embed/movie/${TEST_MOVIE_ID}`,         tier: 1, category: 'all' },
  { name: 'Embed.su',        url: `https://embed.su/embed/movie/${TEST_MOVIE_ID}`,          tier: 1, category: 'all' },
  { name: 'VidSrc RU',       url: `https://vidsrc.ru/embed/movie/${TEST_MOVIE_ID}`,         tier: 1, category: 'all' },
  // TIER 2 — VidSrcMe family
  { name: 'VidSrcMe RU',     url: `https://vidsrcme.ru/embed/movie/${TEST_MOVIE_ID}`,       tier: 2, category: 'all' },
  { name: 'VidSrcMe SU',     url: `https://vidsrcme.su/embed/movie/${TEST_MOVIE_ID}`,       tier: 2, category: 'all' },
  { name: 'VidSrc-Me RU',    url: `https://vidsrc-me.ru/embed/movie/${TEST_MOVIE_ID}`,      tier: 2, category: 'all' },
  { name: 'VidSrc-Me SU',    url: `https://vidsrc-me.su/embed/movie/${TEST_MOVIE_ID}`,      tier: 2, category: 'all' },
  // TIER 2 — Other
  { name: 'Nontongo',        url: `https://nontongo.win/embed/movie/${TEST_MOVIE_ID}`,      tier: 2, category: 'all' },
  { name: 'MoviesApi.to',    url: `https://moviesapi.to/movie/${TEST_MOVIE_ID}`,            tier: 2, category: 'all' },
  { name: 'StreamWish',      url: `https://streamwish.to/embed/movie/${TEST_MOVIE_ID}`,     tier: 2, category: 'all' },
  { name: 'VidLink',         url: `https://vidlink.pro/movie/${TEST_MOVIE_ID}`,             tier: 2, category: 'all' },
  { name: 'AnyEmbed',        url: `https://anyembed.xyz/embed/tmdb-movie-${TEST_MOVIE_ID}`, tier: 2, category: 'all' },
  { name: 'Videasy Player',  url: `https://player.videasy.net/movie/${TEST_MOVIE_ID}`,      tier: 2, category: 'all' },
  { name: 'VaPlayer',        url: `https://vaplayer.ru/embed/movie/${TEST_MOVIE_ID}`,       tier: 2, category: 'all' },
  { name: '2Embed',          url: `https://www.2embed.cc/embed/movie/${TEST_MOVIE_ID}`,    tier: 2, category: 'all' },
  { name: 'VidSrc MOV',      url: `https://vidsrc.mov/embed/movie/${TEST_MOVIE_ID}`,        tier: 2, category: 'all' },
  { name: '111Movies',       url: `https://www.111movies.net/movie/${TEST_MOVIE_ID}`,       tier: 2, category: 'all' },
  { name: 'HDStream',        url: `https://hdstream.to/embed/movie/${TEST_MOVIE_ID}`,       tier: 2, category: 'all' },
  // TIER 2 — Deep search additions
  { name: 'FilmU',           url: `https://embed.filmu.in/movie/${TEST_MOVIE_ID}`,          tier: 2, category: 'all' },
  { name: 'VidSrc.pm',       url: `https://vidsrc.pm/embed/movie/${TEST_MOVIE_ID}`,         tier: 2, category: 'all' },
  { name: 'VidSrc.dev',      url: `https://vidsrc.dev/embed/movie/${TEST_MOVIE_ID}`,        tier: 2, category: 'all' },
  { name: 'VidSrc.link',     url: `https://vidsrc.link/embed/movie/${TEST_MOVIE_ID}`,       tier: 2, category: 'all' },
  { name: 'VidPhantom',      url: `https://vidphantom.com/movie/${TEST_MOVIE_ID}`,          tier: 2, category: 'all' },
  { name: 'SuperEmbed',      url: `https://superembed.stream/?video_id=${TEST_MOVIE_ID}&tmdb=1`, tier: 2, category: 'all' },
  { name: 'Videasy',         url: `https://videasy.com/embed/movie/${TEST_MOVIE_ID}`,       tier: 2, category: 'all' },
  { name: 'StreamHide',      url: `https://streamhide.to/embed/movie/${TEST_MOVIE_ID}`,     tier: 2, category: 'all' },
  { name: 'Series9',         url: `https://series9.io/film/${TEST_MOVIE_ID}`,               tier: 2, category: 'all' },
  { name: 'StreamSilk',      url: `https://streamsilk.com/embed/movie/${TEST_MOVIE_ID}`,    tier: 2, category: 'all' },
  { name: 'FileMoon',        url: `https://filemoon.sx/embed/movie/${TEST_MOVIE_ID}`,       tier: 2, category: 'all' },
];

// ── Anime-specific candidates to test ──
// AniList ID 21 = One Piece, episode 1
// TMDB anime test: ID 85937 = Demon Slayer
const animeCandidates = [
  { name: 'VidPlus Anime',       url: 'https://player.vidplus.to/embed/anime/21/1',  tier: 1, category: 'anime', note: 'AniList ID-based, dub support' },
  { name: 'VidPlus Sub',         url: 'https://player.vidplus.to/embed/anime/21/1?dub=false', tier: 1, category: 'anime', note: 'VidPlus sub variant' },
  { name: 'VidPlus Dub',         url: 'https://player.vidplus.to/embed/anime/21/1?dub=true',  tier: 1, category: 'anime', note: 'VidPlus dub variant' },
  { name: 'GoMo',                url: 'https://gomo.to/movie/tt0111161',             tier: 2, category: 'all', note: 'IMDb-based, supports anime per FMHY' },
  { name: 'AutoEmbed Anime',     url: 'https://autoembed.co/tv/tmdb/85937-1-1',     tier: 2, category: 'anime', note: 'Demon Slayer S1E1 (TMDB)' },
  { name: 'VidSrc WIN Anime',    url: 'https://vidsrc.win/embed/tv/85937/1/1',       tier: 2, category: 'anime', note: 'Demon Slayer (in replacement pool)' },
  { name: 'VidPlus Movie',       url: 'https://player.vidplus.to/embed/movie/550',    tier: 2, category: 'all', note: 'VidPlus movie (TMDB)' },
  { name: 'VidPlus TV',          url: 'https://player.vidplus.to/embed/tv/1396/1/1',  tier: 2, category: 'all', note: 'VidPlus TV (TMDB)' },
  { name: 'databasegdriveplayer', url: 'https://databasegdriveplayer.co/anime.php?v=1711411824019', tier: 2, category: 'anime', note: 'GDrive player anime endpoint' },
  // AniList-based candidates
  { name: 'Cinezo Anime (sub)',  url: 'https://player.cinezo.live/embed/anime/21/1',  tier: 1, category: 'anime', note: 'AniList ID 21 (One Piece) sub' },
  { name: 'Cinezo Anime (dub)',  url: 'https://player.cinezo.live/embed/anime/21/1?dub=true', tier: 1, category: 'anime', note: 'AniList ID 21 (One Piece) dub' },
  { name: 'Cinezo JJK',         url: 'https://player.cinezo.live/embed/anime/16498/1', tier: 1, category: 'anime', note: 'AniList ID 16498 (Jujutsu Kaisen)' },
  { name: 'Cinezo Movie',       url: 'https://player.cinezo.live/embed/movie/550', tier: 2, category: 'all', note: 'Cinezo movie TMDB' },
  { name: 'Cinezo TV',          url: 'https://player.cinezo.live/embed/tv/1396/1/1', tier: 2, category: 'all', note: 'Cinezo TV TMDB' },
  { name: 'Vidify Anime',       url: 'https://player.vidify.top/embed/anime/21/1',  tier: 2, category: 'anime', note: 'AniList-based, redirects to pro.vidify.top' },
];

const allProviders = [...providers, ...animeCandidates];

async function checkProvider(provider) {
  const start = Date.now();
  let status = 'TIMEOUT';
  let xfo = null;
  let csp = null;
  let latency = TIMEOUT_MS;
  let redirected = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(provider.url, {
      method: 'GET',
      redirect: 'manual', // Don't follow redirects — we want to see where it goes
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timer);
    latency = Date.now() - start;
    status = res.status;

    // Follow redirect manually to get final status
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      redirected = location ? new URL(location, provider.url).hostname : null;
      try {
        const res2 = await fetch(location, {
          method: 'GET',
          signal: AbortSignal.timeout(TIMEOUT_MS - latency),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        status = res2.status;
        latency = Date.now() - start;
        xfo = res2.headers.get('x-frame-options');
        csp = res2.headers.get('content-security-policy');
      } catch (e2) {
        status = `-> ${res.status} -> ERR`;
      }
    } else {
      xfo = res.headers.get('x-frame-options');
      csp = res.headers.get('content-security-policy');
    }
  } catch (err) {
    latency = Date.now() - start;
    if (err.name === 'AbortError') {
      status = 'TIMEOUT';
    } else {
      status = `ERR: ${err.code || err.message?.slice(0, 30) || 'UNKNOWN'}`;
    }
  }

  // Determine iframe compatibility
  let iframeOk = true;
  let iframeNote = '';
  if (typeof status === 'number') {
    if (xfo && (xfo.includes('DENY') || xfo.includes('SAMEORIGIN'))) {
      iframeOk = false;
      iframeNote = `BLOCKED by X-Frame-Options: ${xfo}`;
    }
    if (csp && csp.includes('frame-ancestors') && !csp.includes("'self' *") && !csp.includes('*')) {
      iframeOk = false;
      iframeNote = `BLOCKED by CSP frame-ancestors`;
    }
  }

  return { ...provider, status, latency, xfo, csp, redirected, iframeOk, iframeNote };
}

async function main() {
  console.log(`\n${'='.repeat(90)}`);
  console.log(`  LUMINA STREAM - PROVIDER HEALTH CHECK (ALL + ANIME)`);
  console.log(`  Movie test: TMDB #${TEST_MOVIE_ID} (Fight Club) | Anime test: AniList #21 (One Piece)`);
  console.log(`  Timeout: ${TIMEOUT_MS}ms | ${new Date().toISOString()}`);
  console.log(`${'='.repeat(90)}\n`);

  // Run all checks concurrently (batched in groups of 5)
  const results = [];
  const batchSize = 5;

  for (let i = 0; i < allProviders.length; i += batchSize) {
    const batch = allProviders.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkProvider));
    results.push(...batchResults);
  }

  // Separate general vs anime
  const general = results.filter(r => r.category === 'all');
  const anime = results.filter(r => r.category === 'anime');

  // Sort helper
  const sortBy = (arr) => arr.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    const aOk = typeof a.status === 'number' && a.status >= 200 && a.status < 400 && a.iframeOk;
    const bOk = typeof b.status === 'number' && b.status >= 200 && b.status < 400 && b.iframeOk;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    return a.latency - b.latency;
  });

  sortBy(general);
  sortBy(anime);

  let alive = 0, dead = 0, blocked = 0;

  // ── Print General Providers ──
  console.log(`\n${'='.repeat(90)}`);
  console.log(`  GENERAL PROVIDERS (TMDB-based)`);
  console.log(`${'='.repeat(90)}\n`);

  let currentTier = 0;
  for (const r of general) {
    if (r.tier !== currentTier) {
      currentTier = r.tier;
      console.log(`\n  --- TIER ${r.tier} ---`);
    }

    const statusStr = typeof r.status === 'number' ? String(r.status) : String(r.status);
    const isOk = typeof r.status === 'number' && r.status >= 200 && r.status < 400;
    const icon = !isOk ? 'X' : !r.iframeOk ? '!' : '+';
    const latencyStr = r.latency < 1000 ? `${r.latency}ms` : `${(r.latency / 1000).toFixed(1)}s`;

    let line = `  ${icon} ${r.name.padEnd(20)} ${statusStr.padEnd(12)} ${latencyStr.padEnd(8)}`;
    if (r.redirected) line += ` -> ${r.redirected}`;
    if (r.iframeNote) line += `\n    ${r.iframeNote}`;
    console.log(line);

    if (!isOk) dead++;
    else if (!r.iframeOk) blocked++;
    else alive++;
  }

  // ── Print Anime Candidates ──
  console.log(`\n\n${'='.repeat(90)}`);
  console.log(`  ANIME-SPECIFIC PROVIDERS (AniList/MAL/anime-endpoint)`);
  console.log(`${'='.repeat(90)}\n`);

  currentTier = 0;
  for (const r of anime) {
    if (r.tier !== currentTier) {
      currentTier = r.tier;
      console.log(`\n  --- TIER ${r.tier} ---`);
    }

    const statusStr = typeof r.status === 'number' ? String(r.status) : String(r.status);
    const isOk = typeof r.status === 'number' && r.status >= 200 && r.status < 400;
    const icon = !isOk ? 'X' : !r.iframeOk ? '!' : '+';
    const latencyStr = r.latency < 1000 ? `${r.latency}ms` : `${(r.latency / 1000).toFixed(1)}s`;

    let line = `  ${icon} ${r.name.padEnd(25)} ${statusStr.padEnd(12)} ${latencyStr.padEnd(8)}`;
    if (r.note) line += ` [${r.note}]`;
    if (r.redirected) line += `\n    -> ${r.redirected}`;
    if (r.iframeNote) line += `\n    ${r.iframeNote}`;
    console.log(line);

    if (!isOk) dead++;
    else if (!r.iframeOk) blocked++;
    else alive++;
  }

  console.log(`\n${'-'.repeat(90)}`);
  console.log(`  SUMMARY:  + ${alive} working  |  ! ${blocked} iframe-blocked  |  X ${dead} dead/timeout`);
  console.log(`  Total providers checked: ${results.length} (general: ${general.length}, anime: ${anime.length})`);
  console.log(`${'-'.repeat(90)}\n`);

  // List recommended actions
  if (dead > 0 || blocked > 0) {
    console.log('  RECOMMENDED ACTIONS:');
    const problemProviders = [...general, ...anime].filter(r => {
      return typeof r.status !== 'number' || r.status >= 400 || !r.iframeOk;
    });
    for (const r of problemProviders) {
      const statusStr = typeof r.status === 'number' ? String(r.status) : String(r.status);
      if (!r.iframeOk && typeof r.status === 'number' && r.status >= 200 && r.status < 400) {
        console.log(`    ! ${r.name}: ${r.iframeNote} - remove or comment out`);
      } else {
        console.log(`    X ${r.name}: ${statusStr} - remove or comment out`);
      }
    }
    console.log('');
  }

  // List new anime providers to add
  const newAnimeAlive = anime.filter(r =>
    typeof r.status === 'number' && r.status >= 200 && r.status < 400 && r.iframeOk
  );
  if (newAnimeAlive.length > 0) {
    console.log('  NEW ANIME PROVIDERS READY TO ADD:');
    for (const r of newAnimeAlive) {
      console.log(`    + ${r.name}: ${r.status} ${r.latency}ms - ${r.note || 'working'}`);
    }
    console.log('');
  }
}

main().catch(console.error);