#!/usr/bin/env node
/**
 * Deep provider discovery — tests ALL known + newly discovered candidates.
 */

const TEST_ID = 550; // Fight Club
const TIMEOUT_MS = 12000;

// All candidates to test: existing working + new discoveries from deep search
const candidates = [
  // === NEW DISCOVERIES (from web search) ===
  { name: 'SmashyStream',    url: `https://embed.smashystream.com/movie/${TEST_ID}`,            tvUrl: `https://embed.smashystream.com/tv/${1396}/1/1`, new: true },
  { name: 'FilmU',           url: `https://embed.filmu.in/movie/${TEST_ID}`,                  tvUrl: `https://embed.filmu.in/tv/${1396}/1/1`, new: true },
  { name: 'Gomo.to',         url: `https://gomo.to/movie/${TEST_ID}`,                        tvUrl: `https://gomo.to/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.me',       url: `https://vidsrc.me/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.me/embed/tv/${1396}/1/1`, new: true },
  { name: 'Fsapi.xyz',       url: `https://fsapi.xyz/movie/${TEST_ID}`,                      tvUrl: `https://fsapi.xyz/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.com',      url: `https://vidsrc.com/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.com/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.la',       url: `https://vidsrc.la/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.la/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.cx',       url: `https://vidsrc.cx/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.cx/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.icu',      url: `https://vidsrc.icu/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.icu/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.pm',       url: `https://vidsrc.pm/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.pm/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.cc',       url: `https://vidsrc.cc/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.cc/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.rip',      url: `https://vidsrc.rip/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.rip/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.net',      url: `https://vidsrc.net/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.net/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.xyz',      url: `https://vidsrc.xyz/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.xyz/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.gg',       url: `https://vidsrc.gg/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.gg/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.fun',      url: `https://vidsrc.fun/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.fun/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.one',      url: `https://vidsrc.one/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.one/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.link',     url: `https://vidsrc.link/embed/movie/${TEST_ID}`,              tvUrl: `https://vidsrc.link/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.is',       url: `https://vidsrc.is/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.is/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc.dev',      url: `https://vidsrc.dev/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.dev/embed/tv/${1396}/1/1`, new: true },
  { name: 'CurtStream',      url: `https://curtstream.com/movies/tmdb/${TEST_ID}`,           tvUrl: `https://curtstream.com/tv/tmdb/${1396}/1/1`, new: true },
  { name: 'VidSrc TV',       url: `https://vidsrc.tv/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.tv/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc Pro',      url: `https://vidsrc.pro/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.pro/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc VIP',      url: `https://vidsrc.vip/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.vip/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc BZ',       url: `https://vidsrc.bz/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.bz/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc GD',       url: `https://vidsrc.gd/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.gd/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidSrc DO',       url: `https://vidsrc.do/embed/movie/${TEST_ID}`,                tvUrl: `https://vidsrc.do/embed/tv/${1396}/1/1`, new: true },
  { name: 'AutoEmbed.co',    url: `https://autoembed.co/movie/tmdb/${TEST_ID}`,              tvUrl: `https://autoembed.co/tv/tmdb/${1396}-1-1`, new: true },
  { name: 'Series9.io',      url: `https://series9.io/film/${TEST_ID}`,                      tvUrl: `https://series9.io/series/${1396}-1-1`, new: true },
  { name: 'StreamSilk',      url: `https://streamsilk.com/embed/movie/${TEST_ID}`,           tvUrl: `https://streamsilk.com/embed/tv/${1396}/1/1`, new: true },
  { name: 'StreamHide',      url: `https://streamhide.to/embed/movie/${TEST_ID}`,            tvUrl: `https://streamhide.to/embed/tv/${1396}/1/1`, new: true },
  { name: 'MixDrop',         url: `https://mixdrop.to/embed/movie/${TEST_ID}`,               tvUrl: `https://mixdrop.to/embed/tv/${1396}/1/1`, new: true },
  { name: 'VidPhantom',      url: `https://vidphantom.com/movie/${TEST_ID}`,                 tvUrl: `https://vidphantom.com/tv/${1396}/1/1`, new: true },
  { name: 'FileMoon',        url: `https://filemoon.sx/embed/movie/${TEST_ID}`,              tvUrl: `https://filemoon.sx/embed/tv/${1396}/1/1`, new: true },
  { name: 'SuperEmbed',      url: `https://superembed.stream/?video_id=${TEST_ID}&tmdb=1`,  tvUrl: `https://superembed.stream/?video_id=${1396}&tmdb=1&s=1&e=1`, new: true },
  { name: 'MoviesAPI.club',  url: `https://moviesapi.club/movie/${TEST_ID}`,                 tvUrl: `https://moviesapi.club/tv/${1396}-1-1`, new: true },
  { name: 'VidoLol',         url: `https://vido.lol/embed/movie/${TEST_ID}`,                 tvUrl: `https://vido.lol/embed/tv/${1396}/1/1`, new: true },
  { name: 'LordFlix',        url: `https://lordflix.com/embed/movie/${TEST_ID}`,             tvUrl: `https://lordflix.com/embed/tv/${1396}/1/1`, new: true },
  { name: 'Videasy',         url: `https://videasy.com/embed/movie/${TEST_ID}`,              tvUrl: `https://videasy.com/embed/tv/${1396}/1/1`, new: true },

  // === EXISTING WORKING (as baseline) ===
  { name: 'VidSrc RU ★',     url: `https://vidsrc.ru/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.ru/embed/tv/${1396}/1/1`, new: false },
  { name: 'VidSrc SU ★',     url: `https://vidsrc.su/embed/movie/${TEST_ID}`,               tvUrl: `https://vidsrc.su/embed/tv/${1396}/1/1`, new: false },
  { name: 'Embed.su ★',      url: `https://embed.su/embed/movie/${TEST_ID}`,                tvUrl: `https://embed.su/embed/tv/${1396}/1/1`, new: false },
  { name: 'AnyEmbed ★',      url: `https://anyembed.xyz/embed/tmdb-movie-${TEST_ID}`,       tvUrl: `https://anyembed.xyz/embed/tmdb-tv-${1396}-1-1`, new: false },
  { name: 'Videasy Player ★',url: `https://player.videasy.net/movie/${TEST_ID}`,             tvUrl: `https://player.videasy.net/tv/${1396}/1/1`, new: false },
  { name: 'VidLink ★',       url: `https://vidlink.pro/movie/${TEST_ID}`,                   tvUrl: `https://vidlink.pro/tv/${1396}/1/1`, new: false },
  { name: 'StreamWish ★',    url: `https://streamwish.to/embed/movie/${TEST_ID}`,            tvUrl: `https://streamwish.to/embed/tv/${1396}/1/1`, new: false },
];

async function check(url, timeout) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(timeout),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const latency = Date.now() - start;
    let finalStatus = res.status;
    let finalXfo = res.headers.get('x-frame-options');
    let redirectHost = null;

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (loc) {
        try { redirectHost = new URL(loc, url).hostname; } catch {}
        try {
          const r2 = await fetch(loc, {
            signal: AbortSignal.timeout(Math.max(3000, timeout - latency)),
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });
          finalStatus = r2.status;
          finalXfo = r2.headers.get('x-frame-options');
        } catch { finalStatus = '→ERR'; }
      }
    }

    const blocked = finalXfo && (finalXfo.includes('DENY') || finalXfo.includes('SAMEORIGIN'));
    return { ok: finalStatus >= 200 && finalStatus < 400 && !blocked, status: finalStatus, latency, blocked, redirectHost, xfo: finalXfo };
  } catch (err) {
    return { ok: false, status: err.name === 'TimeoutError' ? 'TIMEOUT' : `ERR`, latency: Date.now() - start, blocked: false, redirectHost: null, xfo: null };
  }
}

async function main() {
  console.log(`\n${'═'.repeat(100)}`);
  console.log(`  DEEP PROVIDER DISCOVERY — Testing ${candidates.length} candidates`);
  console.log(`  Movie: TMDB #${TEST_ID} | Timeout: ${TIMEOUT_MS}ms | ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(100)}\n`);

  const results = [];
  const batchSize = 6;
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(async (c) => {
      const r = await check(c.url, TIMEOUT_MS);
      // Also test TV URL if movie works
      let tvResult = null;
      if (r.ok && c.tvUrl) {
        tvResult = await check(c.tvUrl, TIMEOUT_MS);
      }
      return { ...c, ...r, tvOk: tvResult?.ok ?? null, tvStatus: tvResult?.status ?? null, tvLatency: tvResult?.latency ?? null };
    }));
    results.push(...batchResults);
  }

  // Categorize
  const newWorking = results.filter(r => r.new && r.ok && r.tvOk !== false);
  const newBlocked = results.filter(r => r.new && r.ok && r.blocked);
  const newDead = results.filter(r => r.new && !r.ok);
  const existingWorking = results.filter(r => !r.new && r.ok);

  console.log('═══ NEW PROVIDERS — WORKING ═══');
  if (newWorking.length === 0) console.log('  (none found)');
  for (const r of newWorking.sort((a,b) => a.latency - b.latency)) {
    const tv = r.tvOk === null ? '?' : r.tvOk ? '✓' : '✗';
    console.log(`  ✓ ${r.name.padEnd(20)} ${String(r.status).padEnd(6)} ${String(r.latency+'ms').padEnd(10)} TV:${tv} ${r.redirectHost ? '→ ' + r.redirectHost : ''}`);
  }

  console.log('\n═══ NEW PROVIDERS — BLOCKED ═══');
  if (newBlocked.length === 0) console.log('  (none)');
  for (const r of newBlocked) {
    console.log(`  ⚠ ${r.name.padEnd(20)} ${String(r.status).padEnd(6)} BLOCKED: ${r.xfo}`);
  }

  console.log(`\n═══ NEW PROVIDERS — DEAD (${newDead.length}) ═══`);
  for (const r of newDead.sort((a,b) => a.latency - b.latency)) {
    console.log(`  ✗ ${r.name.padEnd(20)} ${String(r.status).padEnd(12)} ${r.latency}ms`);
  }

  console.log('\n═══ EXISTING WORKING (baseline) ═══');
  for (const r of existingWorking.sort((a,b) => a.latency - b.latency)) {
    console.log(`  ✓ ${r.name.padEnd(20)} ${r.latency}ms`);
  }

  console.log(`\n${'─'.repeat(100)}`);
  console.log(`  SUMMARY: ${newWorking.length} new working | ${newBlocked.length} blocked | ${newDead.length} dead | ${existingWorking.length} existing working`);
  console.log(`${'─'.repeat(100)}\n`);

  // Output ready-to-use provider code for new working ones
  if (newWorking.length > 0) {
    console.log('═══ CODE FOR NEW PROVIDERS ═══');
    for (const r of newWorking.sort((a,b) => a.latency - b.latency)) {
      const movieUrl = r.url.replace(`${TEST_ID}`, '${id}');
      const tvUrl = r.tvUrl ? r.tvUrl.replace('1396', '${id}').replace(/\/1\/1$/, '/${s}/${e}') : null;
      console.log(`  { name: '${r.name.replace(' ★','')}', tier: 2, category: 'all',`);
      console.log(`    getMovieUrl: (id) => \`${movieUrl}\`,`);
      if (tvUrl) console.log(`    getTvUrl: (id, s, e) => \`${tvUrl}\`,`);
      console.log(`  },`);
    }
    console.log('');
  }
}

main().catch(console.error);