#!/bin/bash
check() {
  local name="$1"
  local url="$2"
  local code=$(curl -so /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 12 -L "$url" 2>/dev/null)
  if [ -z "$code" ] || [ "$code" = "000" ]; then
    echo "DEAD    | --- | $name | $url"
  else
    echo "ALIVE   | HTTP $code | $name | $url"
  fi
}

echo "=== TIER 1 ==="
check "VidSrc.to" "https://vidsrc.to/embed/movie/550"
check "VidSrc.me" "https://vidsrc.me/embed/movie/550"
check "VidCore" "https://vidcore.cc/embed/movie/550"
check "SuperEmbed" "https://superembed.stream/?video_id=550&tmdb=1"
check "VidLink" "https://vidlink.pro/embed/movie/550"
check "AutoEmbed" "https://autoembed.cc/movie/tmdb/550"
check "2Embed.cc" "https://2embed.cc/embed/550"
check "2Embed.skin" "https://2embed.skin/embed/550"

echo ""
echo "=== TIER 2 ==="
check "VidFast" "https://vidfast.to/embed/movie/550"
check "VidSrc.pm" "https://vidsrc.pm/embed/movie/550"
check "MultiEmbed" "https://multiembed.mov/?video_id=550&tmdb=1"
check "EmbedMaster" "https://embedmaster.xyz/embed/movie/550"
check "VixSrc" "https://vixsrc.com/embed/movie/550"
check "4KHDHub" "https://4khdhub.com/embed/movie/550"
check "SmashyStream" "https://player.smashy.stream/movie/550"
check "FreEmbed" "https://frembed.cc/api/film.php?id=550"
check "MoviesApi.to" "https://moviesapi.to/movie/550"
check "Nontongo.win" "https://nontongo.win/embed/movie/550"

echo ""
echo "=== TIER 3 ==="
check "111Movies" "https://111movies.com/embed/movie/550"
check "FebBox" "https://febbox.com/embed/movie/550"
check "Videasy" "https://videasy.com/embed/movie/550"
check "LordFlix" "https://lordflix.com/embed/movie/550"
check "NoTorrent" "https://notorrent.com/embed/movie/550"
check "DahmerMovies" "https://dahmermovies.com/embed/movie/550"
check "HydraFlix" "https://hydraflix.com/embed/movie/550"
check "MovPI" "https://movpi.co/embed/movie/550"
check "PlayEmbed" "https://playembed.io/embed/movie/550"
check "RgShows" "https://rgshows.com/embed/movie/550"
check "PrimeSrc.me" "https://primesrc.me/embed/movie/550"
check "VidSrc.cc" "https://vidsrc.cc/v2/embed/movie/550"
check "VidSrc.rip" "https://vidsrc.rip/embed/movie/550"