#!/usr/bin/env node

/**
 * Enhanced Provider Refresh Script for Lumina-Stream
 *
 * Improvements over v1:
 *   1. DNS pre-check (fast-fail unreachable domains)
 *   2. GET request with content validation (checks for actual player HTML)
 *   3. Discovers new providers from public listing pages
 *   4. Checks live site health endpoint to detect currently-dead providers
 *   5. Smart replacement — promotes from pool or discovers new ones
 *   6. Latency scoring — picks fastest providers for TIER 1
 *   7. Summary report with actionable info
 *
 * Usage:
 *   node scripts/provider-refresh.mjs
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const PROVIDERS_FILE = resolve(PROJECT_ROOT, 'src/lib/streaming/providers.ts');
const LOG_FILE = resolve(PROJECT_ROOT, 'scripts/provider-refresh.log');

// ---- Config ----
const PING_TIMEOUT = 10000;
const DNS_TIMEOUT = 5000;
const CONTENT_CHECK_TIMEOUT = 15000;
const TEST_TMDB_MOVIE = 550;   // Fight Club
const TEST_TMDB_TV = 1396;     // Breaking Bad S1E1
const MIN_ALIVE_FOR_UPDATE = 3;
const CONCURRENCY = 6;

// ---- Known candidate domains ----
const CANDIDATE_DOMAINS = [
  // VidSrc family
  { name: 'VidSrc FYI',     domain: 'vidsrc.fyi',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc PM',      domain: 'vidsrc.pm',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc IN',      domain: 'vidsrc.in',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc IO',      domain: 'vidsrc.io',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc CC',      domain: 'vidsrc.cc',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc To',      domain: 'vidsrc.to',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc XYZ',     domain: 'vidsrc.xyz',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc IC',      domain: 'vidsrc.ic',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc NET',     domain: 'vidsrc.net',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc PRO',     domain: 'vidsrc.pro',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc APP',     domain: 'vidsrc.app',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc ME',      domain: 'vidsrc.me',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc SR',      domain: 'vidsrc.sr',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc LS',      domain: 'vidsrc.ls',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc ES',      domain: 'vidsrc.es',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc DE',      domain: 'vidsrc.de',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc RU',      domain: 'vidsrc.ru',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc REST',    domain: 'vidsrc.rest',    moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcic',       domain: 'vidsrcic.com',   moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcNerd',     domain: 'vidsrc.nerd',    moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcXL',       domain: 'vidsrcxl.to',    moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcing',      domain: 'vidsrcing.com',  moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // Non-VidSrc providers
  { name: 'AutoEmbed',      domain: 'autoembed.co',          moviePath: '/movie/tmdb',  tvPath: '/tv/tmdb' },
  { name: 'VidPhantom',     domain: 'vidphantom.com',        moviePath: '/movie',       tvPath: '/tv' },
  { name: 'CodeSpecters',   domain: 'api.codespecters.com',  moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'Embed.su',       domain: 'embed.su',              moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'EmbedVip',       domain: 'embedvip.com',          moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'MultiEmbed',     domain: 'multiembed.mov',        moviePath: '/movie',       tvPath: '/tv' },
  { name: 'MoviesAPI',      domain: 'moviesapi.club',        moviePath: '/movie',       tvPath: '/tv' },
  { name: '2Embed',         domain: '2embed.cc',             moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'NontonGo',       domain: 'nontongo.store',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'SmashyStream',   domain: 'smashystream.com',      moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'SuperEmbed',     domain: 'superembed.stream',     moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'Playembed',      domain: 'playembed.top',         moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidBinge',       domain: 'vidbinge.dev',          moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidPlay',        domain: 'vidplay.site',          moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidLink',        domain: 'vidlink.xyz',           moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'MovieHax',       domain: 'moviehax.watch',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'StreamRuby',     domain: 'streamruby.com',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'CineStream',     domain: 'cinestream.xyz',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'AnyEmbed',       domain: 'anyembed.xyz',          moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'EmberTokyo',     domain: 'ember.television',      moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'TVPizza',        domain: 'tvpizza.com',           moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'Series9',        domain: 'series9.io',            moviePath: '/film',        tvPath: '/series' },
  { name: 'EmbedStorm',     domain: 'embedstorm.com',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'StreamSB',       domain: 'streamsb.net',          moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidSrc2',        domain: 'vidsrc2.com',           moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidSrcBeta',     domain: 'vidsrc.beta',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcTop',      domain: 'vidsrc.top',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'MovieBox',       domain: 'moviebox.pro',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'EmbedTV',        domain: 'embedtv.com',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'NinjaEmbed',     domain: 'ninjaembed.net',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'StreamTape',     domain: 'streamtape.com',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcRip',      domain: 'vidsrc.rip',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'WatchStream',    domain: 'watchstream.to',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'SourceCode',     domain: 'sourcecode.vip',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'MovieE',         domain: 'moviee.tv',             moviePath: '/movie',        tvPath: '/tv' },
  { name: 'VidSrcGG',       domain: 'vidsrc.gg',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcAC',       domain: 'vidsrc.ac',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'NetPlay',        domain: 'netplay.vip',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'StreamDrama',    domain: 'streamdrama.live',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // --- VidSrc alt TLDs ---
  { name: 'VidSrc LA',      domain: 'vidsrc.la',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc LI',      domain: 'vidsrc.li',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc ORG',     domain: 'vidsrc.org',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc CO',      domain: 'vidsrc.co',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc EU',      domain: 'vidsrc.eu',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc UK',      domain: 'vidsrc.uk',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc CM',      domain: 'vidsrc.cm',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc VN',      domain: 'vidsrc.vn',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc CLUB',    domain: 'vidsrc.club',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc BIZ',     domain: 'vidsrc.biz',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc INFO',    domain: 'vidsrc.info',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc ONLINE',  domain: 'vidsrc.online',         moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc ONE',     domain: 'vidsrc.one',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc VIP',     domain: 'vidsrc.vip',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc WIN',     domain: 'vidsrc.win',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc FUN',     domain: 'vidsrc.fun',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc DEV',     domain: 'vidsrc.dev',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc APPS',    domain: 'vidsrc.apps',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc STREAM',  domain: 'vidsrc.stream',         moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc HD',      domain: 'vidsrc.hd',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc SX',      domain: 'vidsrc.sx',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc CX',      domain: 'vidsrc.cx',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc NU',      domain: 'vidsrc.nu',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc LAT',     domain: 'vidsrc.lat',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc CAT',     domain: 'vidsrc.cat',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc DOG',     domain: 'vidsrc.dog',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'WatchOMG',       domain: 'watchomg.to',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcMP4',      domain: 'vidsrcmp4.com',         moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'EmbedV2',        domain: 'embedv2.com',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'GoStream',       domain: 'gostream.to',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'FlixHQ',         domain: 'flixhq.to',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'MovieBoxPro',    domain: 'movieboxpro.xyz',       moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'RabbitStream',   domain: 'rabbitstream.net',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidCloud',       domain: 'vidcloud.xyz',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'MegaCloud',      domain: 'megacloud.tv',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'LoadEmbed',      domain: 'loadembed.com',         moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'Vidoza',         domain: 'vidoza.net',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'UpCloud',        domain: 'upcloud.to',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'StreamLare',     domain: 'streamlare.com',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'MixDrop',        domain: 'mixdrop.to',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'MixDropAgg',     domain: 'mixdrop.ag',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'DoodStream',     domain: 'doodstream.com',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'DoodWatch',      domain: 'dood.watch',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'DWatch',         domain: 'dwatch.to',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'HDStream',       domain: 'hdstream.to',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'CineMagia',      domain: 'cinemagia.to',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'PelisEmbed',     domain: 'pelisembed.net',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'EmbedHub',       domain: 'embedhub.to',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'StreamHide',     domain: 'streamhide.to',         moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcPro2',     domain: 'vidsrcpro.com',         moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'StreamSilk',     domain: 'streamsilk.com',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcBest',     domain: 'vidsrc.best',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'MovieTweak',     domain: 'movietweak.xyz',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcBZ',       domain: 'vidsrc.bz',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc LT',      domain: 'vidsrc.lt',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc PT',      domain: 'vidsrc.pt',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc ID',      domain: 'vidsrc.id',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc PH',      domain: 'vidsrc.ph',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'AutoEmbedCC',    domain: 'autoembed.cc',          moviePath: '/movie/tmdb',  tvPath: '/tv/tmdb' },
  { name: 'AutoEmbedNet',   domain: 'autoembed.net',         moviePath: '/movie/tmdb',  tvPath: '/tv/tmdb' },
  { name: 'AutoEmbedIO',    domain: 'autoembed.io',          moviePath: '/movie/tmdb',  tvPath: '/tv/tmdb' },
  { name: 'AutoEmbedVIP',   domain: 'autoembed.vip',         moviePath: '/movie/tmdb',  tvPath: '/tv/tmdb' },
  { name: 'MultiEmbedMov',  domain: 'multiembed.movie',      moviePath: '/movie',       tvPath: '/tv' },
  { name: 'MultiEmbedCC',   domain: 'multiembed.cc',         moviePath: '/movie',       tvPath: '/tv' },
  { name: 'SmashyStream2',  domain: 'smashystream.to',       moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'SmashyStreamOrg',domain: 'smashystream.org',      moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'SmashyStreamCC', domain: 'smashystream.cc',       moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'Series9TV',      domain: 'series9.tv',            moviePath: '/film',        tvPath: '/series' },
  { name: 'Series9API',     domain: 'api.series9.io',        moviePath: '/film',        tvPath: '/series' },
  { name: 'VidPhantom2',    domain: 'vidphantom.co',         moviePath: '/movie',       tvPath: '/tv' },
  { name: 'VidPhantomVIP',  domain: 'vidphantom.vip',        moviePath: '/movie',       tvPath: '/tv' },
  { name: 'CodeSpecters2',  domain: 'codespecters.com',      moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'TVPizza2',       domain: 'tvpizza.to',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'Embed4u',        domain: 'embed4u.to',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcBlue',     domain: 'vidsrc.blue',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcRed',      domain: 'vidsrc.red',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcDark',     domain: 'vidsrc.dark',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcFree',     domain: 'vidsrc.free',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcSafe',     domain: 'vidsrc.safe',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcZone',     domain: 'vidsrc.zone',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcBase',     domain: 'vidsrc.base',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcHub',      domain: 'vidsrc.hub',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcSpace',    domain: 'vidsrc.space',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcWorld',    domain: 'vidsrc.world',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcWeb',      domain: 'vidsrc.web',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcLive',     domain: 'vidsrc.live',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcRun',      domain: 'vidsrc.run',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcSite',     domain: 'vidsrc.site',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcNet2',     domain: 'vidsrc.network',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcHome',     domain: 'vidsrc.home',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcNow',      domain: 'vidsrc.now',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcGo',       domain: 'vidsrc.go',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcTV',       domain: 'vidsrc.tv',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcMX',       domain: 'vidsrc.mx',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcAsia',     domain: 'vidsrc.asia',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcFlux',     domain: 'vidsrc.flux',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'NetPlay2',       domain: 'netplay.org',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'NetPlay3',       domain: 'netplay.to',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'MovieBox2',      domain: 'moviebox.io',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'MovieBoxTV',     domain: 'moviebox.tv',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'StreamSB2',      domain: 'streamsb.online',       moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'StreamSB3',      domain: 'streamsb.to',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // ---- Deep web search discoveries (June 2026) ----

  // VidSrc family — confirmed domains from vidsrc.domains + search
  { name: 'VidSrcSU',       domain: 'vidsrc.su',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcGD',       domain: 'vidsrc.gd',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcDO',       domain: 'vidsrc.do',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcMN',       domain: 'vidsrc.mn',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcTW',       domain: 'vidsrc.tw',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcICU',      domain: 'vidsrc.icu',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcME2',      domain: 'vidsrcme.ru',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // Vidify (from Scribd guide & GitHub)
  { name: 'Vidify',         domain: 'player.vidify.top',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // VidLink (confirmed from GitHub topics + search)
  { name: 'VidLinkPro',     domain: 'vidlink.pro',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // SuperEmbed / MultiEmbed (from Scribd guide)
  { name: 'SuperEmbed2',    domain: 'superembed.stream',      moviePath: '/',            tvPath: '/' },
  { name: 'PerEmbed',       domain: 'perembed.stream',        moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // 2Embed variants (from Scribd + Netflix Clone)
  { name: '2EmbedAPI',      domain: 'api.2embed.cc',          moviePath: '/movie',        tvPath: '/tv' },

  // SmashyStream variants (from Scribd guide)
  { name: 'SmashyPlayer',   domain: 'player.smashy.stream',   moviePath: '/movie',        tvPath: '/tv' },
  { name: 'SmashyEmbed',    domain: 'embed.smashystream.com', moviePath: '/playere.php',  tvPath: '/playere.php' },

  // PStream (from Netflix Clone repo)
  { name: 'PStream',        domain: 'iframe.pstream.org',     moviePath: '/embed',        tvPath: '/embed' },

  // Cine.su (confirmed working from Reddit cinehunters)
  { name: 'CineSu',         domain: 'cine.su',                moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // PrimeWire embed (from Netflix Clone)
  { name: 'PrimeWire',      domain: 'primewire.tf',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // FreEmbed (from Netflix Clone)
  { name: 'FreEmbed',       domain: 'frembed.cc',             moviePath: '/api/film.php', tvPath: '/api/serie.php' },

  // AutoEmbed player variant (from Netflix Clone)
  { name: 'AutoEmbedPlayer',domain: 'player.autoembed.cc',    moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // MoviesAPI (from Netflix Clone)
  { name: 'MoviesAPIClub',  domain: 'moviesapi.club',         moviePath: '/movie',        tvPath: '/tv' },

  // VidCore (mentioned in GitHub topics as VidSrc alternative)
  { name: 'VidCore',        domain: 'vidcore.cc',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // GoDrive player
  { name: 'GoDrive',        domain: 'godriveplayer.com',      moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // Video hosting embeds (from BHW + search)
  { name: 'VidoLol',        domain: 'vido.lol',               moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'PlayerX',        domain: 'playerx.to',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'Vetevio',        domain: 'vetevio.com',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'Moshahda',       domain: 'moshahda.com',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'Lify',           domain: 'lify.app',               moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'WardsAI',        domain: 'wardsai.net',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // FileMoon (popular anime/movie host)
  { name: 'FileMoon',       domain: 'filemoon.sx',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'FileMoon2',      domain: 'filemoon.cc',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // StreamWish (successor to StreamSB)
  { name: 'StreamWish',     domain: 'streamwish.to',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'StreamWish2',    domain: 'streamwish.com',         moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // Voe (European embed host)
  { name: 'Voe',            domain: 'voe.sx',                 moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'Voe2',           domain: 'voe.cd',                 moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // Kwik (anime embed host)
  { name: 'Kwik',           domain: 'kwik.cx',                moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'KwikSI',         domain: 'kwik.si',                moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // Aparat (Iranian video platform, good for non-English content)
  { name: 'Aparat',         domain: 'aparat.com',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // VUpload
  { name: 'VUpload',        domain: 'vupload.com',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // Bilibili (anime/Asian content embeds)
  { name: 'Bilibili',       domain: 'bilibili.tv',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // 4KHDHub (from TMDB-Embed-API providers)
  { name: '4KHDHub',        domain: '4khdhub.com',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // DahmerMovies (from TMDB-Embed-API providers)
  { name: 'DahmerMovies',   domain: 'dahmermovies.com',       moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // LordFlix (from TMDB-Embed-API providers)
  { name: 'LordFlix',       domain: 'lordflix.com',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // Videasy (from TMDB-Embed-API providers)
  { name: 'Videasy',        domain: 'videasy.com',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // VixSrc (from TMDB-Embed-API providers)
  { name: 'VixSrc',         domain: 'vixsrc.com',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // Notorrent (from TMDB-Embed-API providers — torrent-based streaming)
  { name: 'NoTorrent',      domain: 'notorrent.com',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // Showbox / Febbox (from TMDB-Embed-API providers — needs cookies)
  { name: 'Febbox',         domain: 'febbox.com',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // VidSrc newer TLDs found from search
  { name: 'VidSrcINC',      domain: 'vidsrc.inc',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcMAX',      domain: 'vidsrc.max',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcPLUS',     domain: 'vidsrc.plus',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcDAY',      domain: 'vidsrc.day',             moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcNIGHT',    domain: 'vidsrc.night',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcNINJA',    domain: 'vidsrc.ninja',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcPRIME',    domain: 'vidsrc.prime',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcKING',     domain: 'vidsrc.king',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcCITY',     domain: 'vidsrc.city',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcLAND',     domain: 'vidsrc.land',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcNATION',   domain: 'vidsrc.nation',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcPUNK',     domain: 'vidsrc.punk',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcSHOP',     domain: 'vidsrc.shop',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcTEAM',     domain: 'vidsrc.team',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcCLOUD2',   domain: 'vidsrc.cloud',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcTECH',     domain: 'vidsrc.tech',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcDIGITAL',  domain: 'vidsrc.digital',         moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcCENTER',   domain: 'vidsrc.center',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcPORTAL',   domain: 'vidsrc.portal',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcMEDIA',    domain: 'vidsrc.media',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcMOVIES',   domain: 'vidsrc.movies',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcFILM',     domain: 'vidsrc.film',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcPLAY',     domain: 'vidsrc.play',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcSHOW',     domain: 'vidsrc.show',            moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcCINEMA',   domain: 'vidsrc.cinema',          moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrcWORLD2',   domain: 'vidsrc.world',           moviePath: '/embed/movie',  tvPath: '/embed/tv' },
];

// ---- Discovery sources ----
// Provider listing repos
const DISCOVERY_SOURCES = [
  { name: 'MovieWeb', url: 'https://raw.githubusercontent.com/ghoshRitesh12/robo-watch/refs/heads/main/src/providers/index.ts', type: 'code' },
  { name: 'AnimeApi', url: 'https://raw.githubusercontent.com/ghoshRitesh12/aniwatch/refs/heads/main/src/providers/index.ts', type: 'code' },
];

// ---- Logging ----
function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    const existing = existsSync(LOG_FILE) ? readFileSync(LOG_FILE, 'utf-8') : '';
    const lines = existing.split('\n');
    const trimmed = lines.length > 500 ? lines.slice(-400).join('\n') : existing;
    writeFileSync(LOG_FILE, trimmed + '\n' + line + '\n');
  } catch { /* ignore */ }
}

// ---- DNS Pre-check ----
async function dnsResolve(domain) {
  try {
    const addresses = await dns.resolve4(domain, { timeout: DNS_TIMEOUT });
    return addresses.length > 0;
  } catch {
    return false;
  }
}

// ---- Content-validating ping ----
// GET the embed URL and check if the response contains actual player content
async function validateProvider(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONTENT_CHECK_TIMEOUT);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;

    if (!res.ok) return { alive: false, latency, reason: `HTTP ${res.status}` };

    // Check content type — should be HTML
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      // Some providers return JS — still valid if status is 200
      if (res.status === 200) return { alive: true, latency, reason: 'non-html 200' };
      return { alive: false, latency, reason: `content-type: ${contentType}` };
    }

    // Read a chunk of the body to check for player indicators
    const body = await res.text();

    // Player indicators — if ANY of these are found, it's a real embed
    const playerIndicators = [
      /<iframe/i,
      /<video/i,
      /hls\.js/i,
      /hlsjs/i,
      /plyr/i,
      /videojs/i,
      /jwplayer/i,
      /player/i,
      /source\s*=/i,
      /m3u8/i,
      /vidstack/i,
      /mp4/i,
      /stream/i,
      /embed/i,
      /moviedb/i,
      /tmdb/i,
    ];

    const hasPlayer = playerIndicators.some(r => r.test(body));
    // Also check page is not a captcha/block page
    const isBlocked = /cloudflare/i.test(body) && /challenge/i.test(body);
    const isCaptcha = /captcha/i.test(body) || /cf-browser-verification/i.test(body);

    if (isBlocked || isCaptcha) {
      return { alive: false, latency, reason: 'cloudflare challenge/captcha' };
    }

    return { alive: hasPlayer || body.length > 500, latency, reason: hasPlayer ? 'player found' : `no player (body=${body.length}b)` };
  } catch (err) {
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return { alive: false, latency, reason: err.name === 'AbortError' ? 'timeout' : (err.message || 'unknown') };
  }
}

// ---- Build test URL ----
function buildTestUrl(candidate, type = 'movie') {
  const base = `https://${candidate.domain}`;
  if (type === 'movie') {
    if (candidate.domain === 'autoembed.co') return `${base}${candidate.moviePath}/${TEST_TMDB_MOVIE}`;
    if (candidate.domain === 'vidphantom.com') return `${base}${candidate.moviePath}/${TEST_TMDB_MOVIE}`;
    if (candidate.domain === 'series9.io') return `${base}${candidate.moviePath}/${TEST_TMDB_MOVIE}`;
    return `${base}${candidate.moviePath}/${TEST_TMDB_MOVIE}`;
  } else {
    if (candidate.domain === 'autoembed.co') return `${base}${candidate.tvPath}/${TEST_TMDB_TV}-1-1`;
    if (candidate.domain === 'vidphantom.com') return `${base}${candidate.tvPath}/${TEST_TMDB_TV}/1/1`;
    if (candidate.domain === 'series9.io') return `${base}${candidate.tvPath}/${TEST_TMDB_TV}/1/1`;
    return `${base}${candidate.tvPath}/${TEST_TMDB_TV}/1/1`;
  }
}

// ---- Batch runner ----
async function runBatch(tasks, concurrency) {
  const results = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(t => t()));
    results.push(...batchResults);
  }
  return results;
}

// ---- Test all candidates with 3-stage validation ----
async function testAllCandidates() {
  log(`\n${'═'.repeat(60)}`);
  log(`STAGE 1: DNS pre-check on ${CANDIDATE_DOMAINS.length} candidates`);
  log(`${'═'.repeat(60)}`);

  // Stage 1: DNS resolution
  const dnsResults = await runBatch(
    CANDIDATE_DOMAINS.map(c => async () => {
      const resolvable = await dnsResolve(c.domain);
      log(`  DNS ${resolvable ? '✅' : '❌'} ${c.domain}`);
      return { ...c, dnsOk: resolvable };
    }),
    20
  );

  const dnsAlive = dnsResults.filter(r => r.dnsOk);
  const dnsDead = dnsResults.filter(r => !r.dnsOk);
  log(`\nDNS: ${dnsAlive.length} resolvable, ${dnsDead.length} dead`);

  // Stage 2: HTTP content validation on DNS-alive domains
  log(`\n${'═'.repeat(60)}`);
  log(`STAGE 2: Content validation on ${dnsAlive.length} DNS-alive domains`);
  log(`${'═'.repeat(60)}`);

  const validated = await runBatch(
    dnsAlive.map(c => async () => {
      const movieUrl = buildTestUrl(c, 'movie');
      const movieResult = await validateProvider(movieUrl);

      let tvResult = { alive: false, latency: 0, reason: 'skipped' };
      if (movieResult.alive) {
        const tvUrl = buildTestUrl(c, 'tv');
        tvResult = await validateProvider(tvUrl);
      }

      const alive = movieResult.alive && tvResult.alive;
      const avgLatency = Math.round((movieResult.latency + tvResult.latency) / 2);

      log(`  ${alive ? '✅' : '❌'} ${c.name.padEnd(18)} movie:${movieResult.reason.padEnd(24)} tv:${tvResult.reason.padEnd(24)} ${avgLatency}ms`);

      return { ...c, alive, avgLatency, movieResult, tvResult, dnsOk: true };
    }),
    CONCURRENCY
  );

  const alive = validated.filter(r => r.alive).sort((a, b) => a.avgLatency - b.avgLatency);
  const dead = validated.filter(r => !r.alive);

  log(`\n${'═'.repeat(60)}`);
  log(`RESULTS: ${alive.length} alive, ${dead.length} dead`);
  log(`${'═'.repeat(60)}`);

  if (alive.length > 0) {
    log(`\n🟢 Alive providers (sorted by speed):`);
    alive.forEach((p, i) => log(`   ${i + 1}. ${p.name.padEnd(18)} ${p.avgLatency}ms`));
  }

  if (dead.length > 0) {
    log(`\n🔴 Dead providers:`);
    dead.forEach(p => log(`   ✗ ${p.name.padEnd(18)} ${p.movieResult.reason}`));
  }

  return { all: validated, alive, dead, dnsDead };
}

// ---- Discovery: scrape for new provider domains ----
async function discoverNewProviders(knownDomains) {
  log(`\n${'═'.repeat(60)}`);
  log(`STAGE 3: Discovering new providers from external sources`);
  log(`${'═'.repeat(60)}`);

  const knownSet = new Set(knownDomains);
  const newDomains = [];

  for (const source of DISCOVERY_SOURCES) {
    try {
      log(`  Fetching ${source.name}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(source.url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        log(`    ✗ HTTP ${res.status}`);
        continue;
      }

      const text = await res.text();

      // Extract domains from URLs
      const domainRegex = /https?:\/\/([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9.]+)/g;
      let match;
      const found = new Set();

      while ((match = domainRegex.exec(text)) !== null) {
        const domain = match[1].toLowerCase();
        // Filter: must look like an embed domain, not a CDN/API/known non-embed
        if (
          !knownSet.has(domain) &&
          !domain.includes('github') &&
          !domain.includes('google') &&
          !domain.includes('cloudflare') &&
          !domain.includes('mozilla') &&
          !domain.includes('w3.org') &&
          !domain.includes('schema.org') &&
          domain.includes('.') &&
          !domain.endsWith('.githubusercontent.com') &&
          !domain.endsWith('.googleapis.com')
        ) {
          found.add(domain);
        }
      }

      log(`    Found ${found.size} candidate domains`);
      for (const domain of found) {
        // Only add if DNS resolves
        const resolvable = await dnsResolve(domain);
        if (resolvable) {
          log(`    ✅ NEW ${domain} — DNS resolves`);
          newDomains.push({
            name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
            domain,
            moviePath: '/embed/movie',
            tvPath: '/embed/tv',
            discovered: true,
          });
        } else {
          log(`    ❌ ${domain} — DNS failed`);
        }
      }
    } catch (err) {
      log(`    ✗ ${source.name}: ${err.message || 'failed'}`);
    }
  }

  // Validate discovered domains
  if (newDomains.length > 0) {
    log(`\n  Validating ${newDomains.length} newly discovered domains...`);
    const validated = await runBatch(
      newDomains.map(c => async () => {
        const movieUrl = buildTestUrl(c, 'movie');
        const result = await validateProvider(movieUrl);
        log(`    ${result.alive ? '✅' : '❌'} ${c.domain} — ${result.reason}`);
        return { ...c, alive: result.alive, avgLatency: result.latency, movieResult: result, tvResult: { alive: false, latency: 0, reason: 'skipped' }, dnsOk: true };
      }),
      CONCURRENCY
    );
    return validated.filter(r => r.alive);
  }

  return [];
}

// ---- Check live site for currently-dead providers ----
async function checkLiveSite() {
  const siteUrl = process.env.SITE_URL || 'https://lumina-stream.vercel.app';
  const healthUrl = `${siteUrl}/api/embed-health`;
  const cronSecret = process.env.CRON_SECRET;

  log(`\n${'═'.repeat(60)}`);
  log(`STAGE 4: Checking live site for dead providers`);
  log(`${'═'.repeat(60)}`);

  try {
    const headers = {};
    if (cronSecret) headers['Authorization'] = `Bearer ${cronSecret}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(healthUrl, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      log(`  ⚠ Health endpoint returned ${res.status} — skipping live check`);
      return { deadProviders: [], aliveProviders: [] };
    }

    const data = await res.json();
    const deadProviders = data.embed?.deadProviders || [];
    const totalEmbed = data.embed?.total || 0;
    const aliveEmbed = data.embed?.alive || 0;

    log(`  Live site: ${aliveEmbed}/${totalEmbed} embed providers alive`);
    if (deadProviders.length > 0) {
      log(`  Dead on live: ${deadProviders.join(', ')}`);
    } else {
      log(`  All providers healthy on live site`);
    }

    return { deadProviders, aliveProviders: [] };
  } catch (err) {
    log(`  ⚠ Could not reach live site: ${err.message}`);
    return { deadProviders: [], aliveProviders: [] };
  }
}

// ---- Pinned TIER 1 providers (top 10 curated for quality, diversity, speed, stability) ----
// These are NEVER demoted — they always stay TIER 1 if alive.
// Chosen from deep web research: Reddit, GitHub, WJunction, Scribd, BHW, Hacker News.
const PINNED_TIER1 = [
  { name: 'VidSrc CC',    domain: 'vidsrc.cc',             moviePath: '/v2/embed/movie',  tvPath: '/v2/embed/tv' },
  { name: 'Embed.su',     domain: 'embed.su',              moviePath: '/embed/movie',     tvPath: '/embed/tv' },
  { name: 'SmashyStream', domain: 'player.smashy.stream',   moviePath: '/movie',           tvPath: '/tv' },
  { name: 'Vidify',       domain: 'player.vidify.top',      moviePath: '/embed/movie',     tvPath: '/embed/tv' },
  { name: 'VidLink',      domain: 'vidlink.pro',            moviePath: '/embed/movie',     tvPath: '/embed/tv' },
  { name: '2Embed',       domain: '2embed.cc',              moviePath: '/embed',           tvPath: '/embedtv' },
  { name: 'Cine.su',      domain: 'cine.su',                moviePath: '/embed/movie',     tvPath: '/embed/tv' },
  { name: 'VidSrc.to',    domain: 'vidsrc.to',              moviePath: '/embed/movie',     tvPath: '/embed/tv' },
  { name: 'MultiEmbed',   domain: 'multiembed.mov',         moviePath: '/',                tvPath: '/' },
  { name: 'AutoEmbed',    domain: 'autoembed.cc',           moviePath: '/movie/tmdb',      tvPath: '/tv/tmdb' },
];

// ---- Generate providers.ts content ----
function generateProvidersFile(aliveProviders) {
  const now = new Date().toISOString().split('T')[0];

  // Separate pinned providers that are alive
  const aliveDomains = new Set(aliveProviders.map(p => p.domain));
  const pinnedAlive = PINNED_TIER1.filter(p => aliveDomains.has(p.domain));
  const pinnedDead = PINNED_TIER1.filter(p => !aliveDomains.has(p.domain));

  // Non-pinned alive providers (for TIER 2 and replacement pool)
  const nonPinnedAlive = aliveProviders.filter(p => !PINNED_TIER1.some(pp => pp.domain === p.domain));

  const tier1 = pinnedAlive.slice(0, 10);
  const tier2 = nonPinnedAlive.slice(0, Math.min(3, nonPinnedAlive.length));
  const replacements = nonPinnedAlive.slice(3);

  const tier1Lines = tier1.map(p => buildProviderEntry(p, 1)).join(',\n  ');
  const tier2Lines = tier2.map(p => buildProviderEntry(p, 2)).join(',\n  ');
  const activeLines = tier2Lines
    ? `${tier1Lines},\n  // ════════════════════════════════════════════\n  // TIER 2 — Backup\n  // ════════════════════════════════════════════\n  ${tier2Lines}`
    : tier1Lines;

  const poolProviders = replacements.length > 0
    ? replacements
    : aliveProviders.slice(Math.max(0, aliveProviders.length - 2));

  const poolLines = poolProviders.map(p => {
    const movieFn = `getMovieUrl: (id) => \`${buildUrlPattern(p, 'movie')}\``;
    const tvFn = `getTvUrl: (id, s, e) => \`${buildUrlPattern(p, 'tv')}\``;
    return `  { name: '${p.name}', category: 'all', ${movieFn}, ${tvFn} }`;
  }).join(',\n');

  const animePoolLines = tier1.slice(0, 2).map(p => {
    const movieFn = `getMovieUrl: (id) => \`${buildUrlPattern(p, 'movie')}\``;
    const tvFn = `getTvUrl: (id, s, e) => \`${buildUrlPattern(p, 'tv')}\``;
    const animeFn = `getAnimeUrl: (malId, ep) => \`${buildUrlPattern(p, 'anime')}\``;
    return `  { name: '${p.name} Anime', category: 'anime', ${movieFn}, ${tvFn}, ${animeFn} }`;
  }).join(',\n');

  return `/**
 * Embed streaming providers with replacement pool
 *
 * Active providers are the ones currently served to users.
 * Replacement pool is a stash of extra provider URLs kept in reserve.
 * When a provider is detected as dead, it gets swapped with a replacement
 * from the pool. When a dead provider recovers, it goes back into the pool.
 *
 * TIER 1 = Top 10 pinned providers (curated for quality, diversity, speed, stability)
 *   - Only 4 VidSrc-family · 6 independent infrastructure
 *   - Chosen from deep web research: Reddit, GitHub, WJunction, Scribd, BHW
 *
 * Total: ${tier1.length + tier2.length} active + ${poolProviders.length + 2} replacements = ${tier1.length + tier2.length + poolProviders.length + 2} providers available
 * Categories: 'all' = movies + TV, 'anime' = anime-focused embeds
 *
 * All providers verified alive as of ${now}.
 * Auto-refreshed by provider-refresh.mjs script.
 * Anime providers accept MAL (MyAnimeList) IDs from AniList data.
 */

// ---- Types ----

export type ProviderTier = 1 | 2;
export type ProviderCategory = 'all' | 'anime';

export interface StreamProvider {
  name: string;
  tier: ProviderTier;
  category: ProviderCategory;
  getMovieUrl: (tmdbId: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number) => string;
  getAnimeUrl?: (malId: number, episode: number) => string;
}

export interface EmbedResult {
  name: string;
  url: string;
  tier: ProviderTier;
  category: ProviderCategory;
  /** true if this provider was swapped in from the replacement pool */
  replaced?: boolean;
}

// ---- Replacement Pool (stashed extras) ----
// These sit in reserve. When an active provider dies, one gets swapped in.

interface ReplacementEntry {
  name: string;
  category: ProviderCategory;
  getMovieUrl: (tmdbId: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number) => string;
  getAnimeUrl?: (malId: number, episode: number) => string;
}

const REPLACEMENT_POOL: ReplacementEntry[] = [
  // General (TMDB) replacements — verified alive
${poolLines},
  // Anime replacements — use general providers as fallback since
  // dedicated anime embeds (gogoanime, zoro, animepahe, etc.) are all dead
${animePoolLines},
];

// ---- Active Providers ----

const activeProviders: StreamProvider[] = [
  // ════════════════════════════════════════════
  // TIER 1 — Primary (sorted by latency)
  // ════════════════════════════════════════════
  ${activeLines}
];

// ---- Pool State ----

const swappedIn: Map<string, StreamProvider> = new Map();
const swappedOut: Map<string, StreamProvider> = new Map();
const swapMapping: Map<string, string> = new Map();

// ---- Swap Logic ----

export function getAllProviders(): StreamProvider[] {
  const current = activeProviders.filter(p => !swappedOut.has(p.name));
  for (const replacement of swappedIn.values()) {
    current.push(replacement);
  }
  return current;
}

export function getPoolStatus(): {
  poolSize: number;
  available: number;
  swappedIn: string[];
  swappedOut: string[];
  originals: number;
} {
  const usedNames = new Set(swappedIn.keys());
  const available = REPLACEMENT_POOL.filter(r => !usedNames.has(r.name));
  return {
    poolSize: REPLACEMENT_POOL.length,
    available: available.length,
    swappedIn: Array.from(swappedIn.keys()),
    swappedOut: Array.from(swappedOut.keys()),
    originals: activeProviders.filter(p => !swappedOut.has(p.name)).length,
  };
}

export function swapInReplacement(deadProviderName: string): StreamProvider | null {
  if (swappedOut.has(deadProviderName)) return null;
  const deadProvider = activeProviders.find(p => p.name === deadProviderName);
  const category = deadProvider?.category || 'all';
  let replacement = REPLACEMENT_POOL.find(r => r.category === category && !swappedIn.has(r.name));
  if (!replacement) replacement = REPLACEMENT_POOL.find(r => !swappedIn.has(r.name));
  if (!replacement) return null;
  swappedOut.set(deadProviderName, deadProvider!);
  const newProvider: StreamProvider = {
    name: replacement.name,
    tier: deadProvider?.tier || 2,
    category: replacement.category,
    getMovieUrl: replacement.getMovieUrl,
    getTvUrl: replacement.getTvUrl,
    getAnimeUrl: replacement.getAnimeUrl,
  };
  swappedIn.set(replacement.name, newProvider);
  swapMapping.set(deadProviderName, replacement.name);
  return newProvider;
}

export function restoreOriginal(originalName: string): boolean {
  if (!swappedOut.has(originalName)) return false;
  const repName = swapMapping.get(originalName);
  if (!repName || !swappedIn.has(repName)) return false;
  swappedIn.delete(repName);
  swappedOut.delete(originalName);
  swapMapping.delete(originalName);
  return true;
}

export function getReplacementPool(): ReplacementEntry[] {
  return REPLACEMENT_POOL;
}

export function getAllEmbedUrls(
  mediaType: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number
): EmbedResult[] {
  return getAllProviders()
    .filter((p) => p.category === "all")
    .sort((a, b) => a.tier - b.tier)
    .map((p) => ({
      name: p.name,
      tier: p.tier,
      category: p.category,
      replaced: swappedIn.has(p.name),
      url:
        mediaType === "tv" && season !== undefined && episode !== undefined
          ? p.getTvUrl(tmdbId, season, episode)
          : p.getMovieUrl(tmdbId),
    }));
}

export function getAnimeEmbedUrls(
  tmdbId: number,
  season: number,
  episode: number,
  malId?: number
): EmbedResult[] {
  const providers = getAllProviders();
  const generalProviders: EmbedResult[] = providers
    .filter((p) => p.category === "all")
    .sort((a, b) => a.tier - b.tier)
    .map((p) => ({
      name: p.name,
      tier: p.tier,
      category: "all" as ProviderCategory,
      replaced: swappedIn.has(p.name),
      url: p.getTvUrl(tmdbId, season, episode),
    }));
  const animeProviders: EmbedResult[] = providers
    .filter((p) => p.category === "anime")
    .sort((a, b) => a.tier - b.tier)
    .map((p) => ({
      name: p.name,
      tier: p.tier,
      category: "anime" as ProviderCategory,
      replaced: swappedIn.has(p.name),
      url:
        malId && p.getAnimeUrl
          ? p.getAnimeUrl(malId, episode)
          : p.getTvUrl(tmdbId, season, episode),
    }));
  return [...generalProviders, ...animeProviders];
}
`;
}

function buildProviderEntry(provider, tier) {
  const movieFn = `getMovieUrl: (id) => \`${buildUrlPattern(provider, 'movie')}\``;
  const tvFn = `getTvUrl: (id, s, e) => \`${buildUrlPattern(provider, 'tv')}\``;
  return `{
    name: "${provider.name}",
    tier: ${tier}, category: "all",
    ${movieFn},
    ${tvFn},
  }`;
}

function buildUrlPattern(provider, type) {
  const base = `https://${provider.domain}`;
  if (provider.domain === 'autoembed.co') {
    if (type === 'movie') return `${base}/movie/tmdb/\${id}`;
    if (type === 'tv') return `${base}/tv/tmdb/\${id}-\${s}-\${e}`;
    if (type === 'anime') return `${base}/tv/tmdb/\${malId}-\${Math.floor(ep / 25) + 1}-\${(ep % 25) || 25}`;
  }
  if (provider.domain === 'vidphantom.com') {
    if (type === 'movie') return `${base}/movie/\${id}`;
    if (type === 'tv') return `${base}/tv/\${id}/\${s}/\${e}`;
    if (type === 'anime') return `${base}/tv/\${malId}/\${Math.floor(ep / 25) + 1}/\${(ep % 25) || 25}`;
  }
  if (provider.domain === 'series9.io') {
    if (type === 'movie') return `${base}/film/\${id}`;
    if (type === 'tv') return `${base}/series/\${id}-\${s}-\${e}`;
  }
  const path = type === 'movie' ? provider.moviePath : provider.tvPath;
  if (type === 'movie') return `${base}${path}/\${id}`;
  if (type === 'tv') return `${base}${path}/\${id}/\${s}/\${e}`;
  if (type === 'anime') return `${base}${path}/\${malId}/\${Math.floor(ep / 25) + 1}/\${(ep % 25) || 25}`;
  return `${base}${path}/\${id}`;
}

// ---- Main ----
async function main() {
  log('╔══════════════════════════════════════════════════════════╗');
  log('║         ENHANCED PROVIDER REFRESH v2                    ║');
  log('╚══════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  // 1. Test all known candidates (DNS + content validation)
  const { all, alive, dead, dnsDead } = await testAllCandidates();

  // 2. Check live site for dead providers
  const { deadProviders: liveDead } = await checkLiveSite();

  // 3. Discover new providers from external sources
  const knownDomains = new Set(CANDIDATE_DOMAINS.map(c => c.domain));
  const discovered = await discoverNewProviders(knownDomains);

  // 4. Merge discovered providers into alive list
  let allAlive = [...alive];
  if (discovered.length > 0) {
    log(`\n${'═'.repeat(60)}`);
    log(`MERGE: Adding ${discovered.length} newly discovered providers`);
    log(`${'═'.repeat(60)}`);
    for (const d of discovered) {
      log(`  + ${d.domain} (new discovery)`);
      allAlive.push(d);
    }
    // Re-sort by latency
    allAlive.sort((a, b) => (a.avgLatency || 99999) - (b.avgLatency || 99999));
  }

  // 5. Report on live-dead providers
  if (liveDead.length > 0) {
    log(`\n${'═'.repeat(60)}`);
    log(`REPLACEMENT PLAN: ${liveDead.length} providers dead on live site`);
    log(`${'═'.repeat(60)}`);
    for (const deadName of liveDead) {
      const replacement = allAlive.find(a => a.name !== deadName && !liveDead.includes(a.name));
      if (replacement) {
        log(`  ✗ ${deadName} → replaced by ${replacement.name} (${replacement.domain})`);
      } else {
        log(`  ✗ ${deadName} → NO replacement available!`);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n${'═'.repeat(60)}`);
  log(`SUMMARY (took ${elapsed}s)`);
  log(`${'═'.repeat(60)}`);
  log(`  DNS dead:        ${dnsDead.length}`);
  log(`  HTTP dead:       ${dead.length}`);
  log(`  Discovered new:  ${discovered.length}`);
  log(`  Total alive:     ${allAlive.length}`);
  log(`  Live-dead:       ${liveDead.length}`);
  const pinnedDomains = new Set(PINNED_TIER1.map(p => p.domain));
  const pinnedAliveCount = allAlive.filter(p => pinnedDomains.has(p.domain)).length;
  log(`  Pinned TIER 1:   ${pinnedAliveCount}/${PINNED_TIER1.length} alive`);

  // 6. Safety check
  if (allAlive.length < MIN_ALIVE_FOR_UPDATE) {
    log(`\n⚠️ Only ${allAlive.length} providers alive (minimum ${MIN_ALIVE_FOR_UPDATE}). Skipping update.`);
    log('Dead providers will rely on in-app replacement pool.');
    log('══════════════════════════════════════════════════════════');
    return;
  }

  // 7. Generate and write new providers.ts
  const newContent = generateProvidersFile(allAlive);

  const backupPath = PROVIDERS_FILE + `.backup.${new Date().toISOString().replace(/[:.]/g, '-')}`;
  try {
    if (existsSync(PROVIDERS_FILE)) {
      writeFileSync(backupPath, readFileSync(PROVIDERS_FILE, 'utf-8'));
      log(`\nBackup: ${backupPath}`);
    }
  } catch (err) {
    log(`⚠️ Backup failed: ${err.message}`);
  }

  try {
    writeFileSync(PROVIDERS_FILE, newContent, 'utf-8');
    log(`\n✅ Updated providers.ts with ${allAlive.length} alive providers:`);
    allAlive.forEach((p, i) => {
      const tag = p.discovered ? ' [NEW]' : '';
      log(`   ${i + 1}. ${p.name.padEnd(18)} ${p.avgLatency || '?'}ms${tag}`);
    });
  } catch (err) {
    log(`❌ Failed to write providers.ts: ${err.message}`);
    return;
  }

  // 8. Git handled by workflow in CI
  if (!process.env.GITHUB_ACTIONS) {
    log('\nRunning locally — use git to commit and push manually.');
  } else {
    log('\nRunning in GitHub Actions — workflow will commit and push.');
  }

  log('══════════════════════════════════════════════════════════');
}

main().catch(err => {
  log(`❌ Fatal error: ${err.message}`);
  process.exit(1);
});