#!/usr/bin/env node
/**
 * Health-check every active streaming provider.
 * Pings each provider's movie embed URL (TMDB ID 550 = Fight Club)
 * and reports: HTTP status, latency, X-Frame-Options header.
 */

const TEST_MOVIE_ID = 550; // Fight Club — reliable test ID
const TEST_TV_ID = 1396;   // Breaking Bad S01E01
const TIMEOUT_MS = 12000;

// All active providers extracted from providers.ts
const providers = [
  // TIER 1
  { name: 'VidSrc SU',       url: `https://vidsrc.su/embed/movie/${TEST_MOVIE_ID}`,         tier: 1 },
  { name: 'Embed.su',        url: `https://embed.su/embed/movie/${TEST_MOVIE_ID}`,          tier: 1 },
  { name: 'VidSrc RU',       url: `https://vidsrc.ru/embed/movie/${TEST_MOVIE_ID}`,         tier: 1 },
  { name: 'VidSrc Embed RU', url: `https://vidsrc-embed.ru/embed/movie?tmdb=${TEST_MOVIE_ID}`, tier: 1 },
  { name: 'VidSrc Embed SU', url: `https://vidsrc-embed.su/embed/movie?tmdb=${TEST_MOVIE_ID}`, tier: 1 },
  { name: 'VSrc SU',         url: `https://vsrc.su/embed/movie/${TEST_MOVIE_ID}`,           tier: 1 },
  { name: 'MultiEmbed',      url: `https://multiembed.mov/?video_id=${TEST_MOVIE_ID}&tmdb=1`, tier: 1 },
  // TIER 2
  { name: 'VidSrcMe RU',     url: `https://vidsrcme.ru/embed/movie/${TEST_MOVIE_ID}`,       tier: 2 },
  { name: 'VidSrcMe SU',     url: `https://vidsrcme.su/embed/movie/${TEST_MOVIE_ID}`,       tier: 2 },
  { name: 'VidSrc-Me RU',    url: `https://vidsrc-me.ru/embed/movie/${TEST_MOVIE_ID}`,      tier: 2 },
  { name: 'VidSrc-Me SU',    url: `https://vidsrc-me.su/embed/movie/${TEST_MOVIE_ID}`,      tier: 2 },
  { name: 'Nontongo',        url: `https://nontongo.win/embed/movie/${TEST_MOVIE_ID}`,      tier: 2 },
  { name: 'MoviesApi.to',    url: `https://moviesapi.to/movie/${TEST_MOVIE_ID}`,            tier: 2 },
  { name: 'StreamWish',      url: `https://streamwish.to/embed/movie/${TEST_MOVIE_ID}`,     tier: 2 },
  { name: 'VidLink',         url: `https://vidlink.pro/movie/${TEST_MOVIE_ID}`,             tier: 2 },
  { name: 'AnyEmbed',        url: `https://anyembed.xyz/embed/tmdb-movie-${TEST_MOVIE_ID}`, tier: 2 },
  { name: 'Videasy Player',  url: `https://player.videasy.net/movie/${TEST_MOVIE_ID}`,      tier: 2 },
  { name: 'VaPlayer',        url: `https://vaplayer.ru/embed/movie/${TEST_MOVIE_ID}`,       tier: 2 },
  { name: '2Embed',          url: `https://www.2embed.cc/embed/movie/${TEST_MOVIE_ID}`,    tier: 2 },
  { name: 'VidSrc MOV',      url: `https://vidsrc.mov/embed/movie/${TEST_MOVIE_ID}`,        tier: 2 },
  { name: '111Movies',       url: `https://www.111movies.net/movie/${TEST_MOVIE_ID}`,       tier: 2 },
  { name: 'HDStream',        url: `https://hdstream.to/embed/movie/${TEST_MOVIE_ID}`,       tier: 2 },
];

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
        status = `→ ${res.status} → ERR`;
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
  console.log(`\n${'═'.repeat(90)}`);
  console.log(`  LUMINA STREAM — PROVIDER HEALTH CHECK`);
  console.log(`  Test: TMDB Movie #${TEST_MOVIE_ID} (Fight Club) | Timeout: ${TIMEOUT_MS}ms`);
  console.log(`  ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(90)}\n`);

  // Run all checks concurrently (batched in groups of 5 to avoid overwhelming)
  const results = [];
  const batchSize = 5;

  for (let i = 0; i < providers.length; i += batchSize) {
    const batch = providers.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkProvider));
    results.push(...batchResults);
  }

  // Sort by tier, then by status (working first)
  const sorted = results.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    const aOk = typeof a.status === 'number' && a.status >= 200 && a.status < 400 && a.iframeOk;
    const bOk = typeof b.status === 'number' && b.status >= 200 && b.status < 400 && b.iframeOk;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    return a.latency - b.latency;
  });

  let alive = 0, dead = 0, blocked = 0;

  let currentTier = 0;
  for (const r of sorted) {
    if (r.tier !== currentTier) {
      currentTier = r.tier;
      console.log(`\n── TIER ${r.tier} ──────────────────────────────────────────────────────────`);
    }

    const statusStr = typeof r.status === 'number' ? String(r.status) : String(r.status);
    const isOk = typeof r.status === 'number' && r.status >= 200 && r.status < 400;
    const icon = !isOk ? '✗' : !r.iframeOk ? '⚠' : '✓';
    const latencyStr = r.latency < 1000 ? `${r.latency}ms` : `${(r.latency / 1000).toFixed(1)}s`;

    let line = `  ${icon} ${r.name.padEnd(20)} ${statusStr.padEnd(12)} ${latencyStr.padEnd(8)}`;
    if (r.redirected) line += ` → ${r.redirected}`;
    if (r.iframeNote) line += `\n    ${r.iframeNote}`;
    console.log(line);

    if (!isOk) dead++;
    else if (!r.iframeOk) blocked++;
    else alive++;
  }

  console.log(`\n${'─'.repeat(90)}`);
  console.log(`  SUMMARY:  ✓ ${alive} working  |  ⚠ ${blocked} iframe-blocked  |  ✗ ${dead} dead/timeout`);
  console.log(`  Total active providers checked: ${results.length}`);
  console.log(`${'─'.repeat(90)}\n`);

  // List recommended actions
  if (dead > 0 || blocked > 0) {
    console.log('  RECOMMENDED ACTIONS:');
    const deadProviders = sorted.filter(r => typeof r.status !== 'number' || r.status >= 400 || !r.iframeOk);
    for (const r of deadProviders) {
      const statusStr = typeof r.status === 'number' ? String(r.status) : String(r.status);
      if (!r.iframeOk && typeof r.status === 'number' && r.status >= 200 && r.status < 400) {
        console.log(`    ⚠ ${r.name}: ${r.iframeNote} — remove or comment out`);
      } else {
        console.log(`    ✗ ${r.name}: ${statusStr} — remove or comment out`);
      }
    }
    console.log('');
  }
}

main().catch(console.error);