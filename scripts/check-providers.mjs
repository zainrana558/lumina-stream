const providers = [
  { name: 'VidSrc SU', url: 'https://vidsrc.su/embed/movie/550' },
  { name: 'Embed.su', url: 'https://embed.su/embed/movie/550' },
  { name: 'VidSrc RU', url: 'https://vidsrc.ru/embed/movie/550' },
  { name: 'VidSrc Embed RU', url: 'https://vidsrc-embed.ru/embed/movie?tmdb=550' },
  { name: 'VidSrc Embed SU', url: 'https://vidsrc-embed.su/embed/movie?tmdb=550' },
  { name: 'VSrc SU', url: 'https://vsrc.su/embed/movie/550' },
  { name: 'MultiEmbed', url: 'https://multiembed.mov/?video_id=550&tmdb=1' },
  { name: 'Nontongo', url: 'https://nontongo.win/embed/movie/550' },
  { name: 'MoviesApi.to', url: 'https://moviesapi.to/movie/550' },
  { name: 'VidSrcMe RU', url: 'https://vidsrcme.ru/embed/movie/550' },
  { name: 'VidSrcMe SU', url: 'https://vidsrcme.su/embed/movie/550' },
  { name: 'VidSrc-Me RU', url: 'https://vidsrc-me.ru/embed/movie/550' },
  { name: 'VidSrc-Me SU', url: 'https://vidsrc-me.su/embed/movie/550' },
  { name: 'StreamWish', url: 'https://streamwish.to/embed/movie/550' },
  { name: 'VidLink', url: 'https://vidlink.pro/movie/550' },
  { name: 'AnyEmbed', url: 'https://anyembed.xyz/embed/tmdb-movie-550' },
  { name: 'Videasy Player', url: 'https://player.videasy.net/movie/550' },
  { name: 'VaPlayer', url: 'https://vaplayer.ru/embed/movie/550' },
  { name: '2Embed', url: 'https://www.2embed.cc/embed/movie/550' },
  { name: 'VidSrc MOV', url: 'https://vidsrc.mov/embed/movie/550' },
  { name: 'VidNest', url: 'https://vidnest.fun/embed/movie/550' },
  { name: '111Movies', url: 'https://www.111movies.net/movie/550' },
  { name: 'VidFast', url: 'https://www.vidfast.net/embed/movie/550' },
  { name: 'HDStream', url: 'https://hdstream.to/embed/movie/550' },
  { name: 'VidSrc PRO', url: 'https://vidsrc.pro/embed/movie/550' },
  { name: 'VidSrc DEV', url: 'https://vidsrc.dev/embed/movie/550' },
  { name: 'VidSrc FYI', url: 'https://vidsrc.fyi/embed/movie/550' },
];

const results = await Promise.allSettled(providers.map(async (p) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(p.url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    clearTimeout(timer);
    const xfo = res.headers.get('x-frame-options') || '';
    const blocked = xfo.includes('DENY') || xfo.includes('SAMEORIGIN');
    return { name: p.name, status: res.status, blocked, ok: res.status >= 200 && res.status < 400 && !blocked };
  } catch (e) {
    return { name: p.name, status: 0, blocked: false, ok: false, error: (e.message || '').slice(0, 50) };
  }
}));

let alive = 0, dead = 0, blocked = 0;
for (const r of results) {
  if (r.status === 'fulfilled') {
    const d = r.value;
    if (d.ok) {
      alive++;
      console.log('  ✓ ' + d.name.padEnd(22) + 'HTTP ' + d.status);
    } else {
      if (d.blocked) blocked++;
      else dead++;
      const reason = d.blocked ? 'XFO BLOCKED' : d.status === 0 ? 'ERR: ' + d.error : 'HTTP ' + d.status;
      console.log('  ✗ ' + d.name.padEnd(22) + reason);
    }
  }
}
console.log('\n  Total: ' + results.length + ' | Alive: ' + alive + ' | Dead: ' + dead + ' | Blocked: ' + blocked);