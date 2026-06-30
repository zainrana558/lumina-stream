#!/usr/bin/env python3
"""Lumina Stream Architecture Review - PDF Generator"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Fonts ──
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Bold.ttf'))
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC-Bold')
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/english/Tinos-Regular.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerifBold', f'{FONT_DIR}/truetype/english/Tinos-Bold.ttf'))
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerifBold')

# ── Palette ──
PAGE_BG = colors.HexColor('#f6f6f5')
SECTION_BG = colors.HexColor('#f1f1ef')
CARD_BG = colors.HexColor('#e9e8e4')
TABLE_STRIPE = colors.HexColor('#eeedeb')
HEADER_FILL = colors.HexColor('#6b634a')
COVER_BLOCK = colors.HexColor('#666050')
BORDER = colors.HexColor('#ccc5ae')
ICON = colors.HexColor('#948148')
ACCENT = colors.HexColor('#ab8a29')
ACCENT_2 = colors.HexColor('#50a5c2')
TEXT_PRIMARY = colors.HexColor('#272724')
TEXT_MUTED = colors.HexColor('#7a7871')
SEM_SUCCESS = colors.HexColor('#4e9064')
SEM_WARNING = colors.HexColor('#9a804b')
SEM_ERROR = colors.HexColor('#9d5953')
SEM_INFO = colors.HexColor('#5079a3')

# ── Dimensions ──
PAGE_W, PAGE_H = A4
MARGIN = 0.9 * inch
AVAIL_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - 2 * MARGIN

# ── Styles ──
sH1 = ParagraphStyle('H1', fontName='NotoSansSC-Bold', fontSize=20, leading=26, textColor=HEADER_FILL, spaceAfter=8, spaceBefore=4)
sH2 = ParagraphStyle('H2', fontName='NotoSansSC-Bold', fontSize=15, leading=20, textColor=COVER_BLOCK, spaceAfter=6, spaceBefore=10)
sH3 = ParagraphStyle('H3', fontName='NotoSansSC-Bold', fontSize=11.5, leading=15, textColor=ICON, spaceAfter=4, spaceBefore=8)
sBody = ParagraphStyle('Body', fontName='NotoSansSC', fontSize=9.5, leading=14.5, textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=6)
sBodySmall = ParagraphStyle('BodySmall', fontName='NotoSansSC', fontSize=8.5, leading=13, textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=4)
sBullet = ParagraphStyle('Bullet', fontName='NotoSansSC', fontSize=9.5, leading=14, textColor=TEXT_PRIMARY, leftIndent=18, bulletIndent=6, spaceAfter=3)
sTableCell = ParagraphStyle('TableCell', fontName='NotoSansSC', fontSize=8.5, leading=12, textColor=TEXT_PRIMARY, wordWrap='CJK')
sTableHeader = ParagraphStyle('TableHeader', fontName='NotoSansSC-Bold', fontSize=8.5, leading=12, textColor=colors.white, wordWrap='CJK')
sTOCEntry = ParagraphStyle('TOCEntry', fontName='NotoSansSC', fontSize=10, leading=18, textColor=TEXT_PRIMARY)

# ── Helpers ──
def h1(t): return Paragraph(t, sH1)
def h2(t): return Paragraph(t, sH2)
def h3(t): return Paragraph(t, sH3)
def p(t): return Paragraph(t, sBody)
def ps(t): return Paragraph(t, sBodySmall)
def bullet(t): return Paragraph(f'\u2022 {t}', sBullet)
def sp(h=6): return Spacer(1, h)

def gap_table(data, col_widths=None):
    """Build a gap analysis table with safe column widths."""
    if col_widths is None:
        n = len(data[0])
        col_widths = [AVAIL_W * w for w in [0.22, 0.30, 0.48]]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8.5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

def simple_table(headers, rows, widths=None):
    header_row = [Paragraph(h, sTableHeader) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([Paragraph(str(c), sTableCell) for c in row])
    if widths is None:
        n = len(headers)
        widths = [AVAIL_W / n] * n
    return gap_table(data, widths)

# ── Page number footer ──
def footer_body(canvas, doc):
    canvas.saveState()
    canvas.setFont('FreeSerif', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(PAGE_W / 2, 0.5 * inch, str(doc.page - 1))
    canvas.restoreState()

def no_footer(canvas, doc):
    pass

# ── Build story ──
story = []

# Cover
story.append(Spacer(1, 2.2 * inch))
story.append(Paragraph('Lumina Stream', ParagraphStyle('CoverTitle', fontName='NotoSansSC-Bold', fontSize=36, leading=42, textColor=HEADER_FILL, alignment=TA_LEFT, leftIndent=MARGIN)))
story.append(Spacer(1, 8))
story.append(Paragraph('Architecture Review', ParagraphStyle('CoverSub', fontName='NotoSansSC', fontSize=22, leading=28, textColor=ICON, alignment=TA_LEFT, leftIndent=MARGIN)))
story.append(Spacer(1, 16))
story.append(Paragraph('Gap Analysis &amp; Migration Plan', ParagraphStyle('CoverDesc', fontName='NotoSansSC', fontSize=14, leading=20, textColor=TEXT_MUTED, alignment=TA_LEFT, leftIndent=MARGIN)))
story.append(Spacer(1, 1.2 * inch))
story.append(Paragraph('June 2026', ParagraphStyle('CoverDate', fontName='FreeSerif', fontSize=12, leading=16, textColor=TEXT_MUTED, alignment=TA_LEFT, leftIndent=MARGIN)))
story.append(PageBreak())

# ── 1. Executive Summary ──
story.append(h1('1. Executive Summary'))
story.append(p(
    'This document presents a comprehensive gap analysis of the Lumina Stream platform against a 15-layer target streaming architecture. '
    'The review examines the current implementation across metadata management, provider infrastructure, health monitoring, player capabilities, '
    'analytics, and operational observability. The analysis is based on a complete codebase audit of the Next.js application deployed on Vercel, '
    'with Cloudflare Workers for edge caching and Supabase for user data persistence.'
))
story.append(p(
    'The current architecture demonstrates several strengths: a sophisticated 4-tier caching hierarchy (browser dedup, Redis, Cloudflare Worker, '
    'Cache Proxy), a provider replacement pool with automatic swap-in/swap-out logic, and comprehensive SEO infrastructure with programmatic '
    'sitemaps and JSON-LD structured data. The rate limiting system is particularly well-designed, using a hybrid Redis plus in-memory approach '
    'with 8 preset configurations and batched synchronization to minimize Redis command consumption on the free tier.'
))
story.append(p(
    'However, the analysis reveals critical gaps. The most significant finding is that the entire video playback system relies on third-party '
    'iframe embeds with zero control over playback quality, subtitles, or position tracking. The health monitoring system uses opaque no-cors '
    'requests that cannot distinguish a working provider from a Cloudflare challenge page. There is no runtime provider scoring, no playback '
    'analytics, and the client-side health monitoring component is dead code that is never mounted in the application. Provider state is stored '
    'entirely in memory and is lost on every Vercel serverless cold start, making the swap system unreliable in production.'
))
story.append(p(
    'The migration roadmap is organized into four phases spanning 20 weeks, prioritized by impact and risk. Phase 1 (Foundation) addresses '
    'the most critical gaps: moving health state to Redis, adding a scoring engine, and creating a database-driven provider registry. Phase 2 '
    '(Intelligence) builds smart provider selection and parallel validation. Phase 3 (Player Evolution) is the highest-risk but highest-reward '
    'phase, introducing a hybrid native player. Phase 4 (Scale) adds content caching, CDN optimization, and an operational dashboard.'
))
story.append(sp(12))

# ── 2. Current Architecture Overview ──
story.append(h1('2. Current Architecture Overview'))
story.append(h2('2.1 Metadata Layer'))
story.append(p(
    'The platform uses TMDB (The Movie Database) for movies and TV shows, and AniList GraphQL API for anime content. All metadata is fetched '
    'on-demand from these external sources and cached through a 4-tier hierarchy. Tier 1 is a browser-side in-memory deduplication layer '
    '(src/lib/fetch-dedup.ts) that prevents duplicate concurrent requests and uses per-route TTLs ranging from 5 to 60 seconds. Tier 2 is '
    'Upstash Redis (src/lib/cache.ts) with a free tier limit of 10,000 commands per day, using versioned cache keys (currently v4) with TTLs '
    'ranging from 15 minutes for trending content to 6 hours for genre data. Tier 3 is a Cloudflare API Cache Worker that caches TMDB responses '
    'at the edge, though notably AniList requests bypass this layer because AniList blocks Cloudflare Worker requests with 403 errors. '
    'Tier 4 is a Cloudflare Cache Proxy that sits in front of the Vercel origin and uses X-Cache-Category headers for TTL coordination.'
))
story.append(p(
    'A critical architectural decision is that zero content metadata is stored in the database. The Supabase PostgreSQL instance contains 18 '
    'tables, all dedicated to user and social data: profiles, watchlist, watch_progress, watch_history, ratings, comments, collections, '
    'follows, notifications, watch party rooms, and reminders. Content type distinction between anime and movies/TV is handled entirely '
    'through ID namespacing: AniList IDs are stored with a 100,000,000 offset, and a single isAnilistId() check routes all downstream logic '
    'including metadata fetching, image handling, and provider selection. Cache warming runs daily via Vercel Cron, pre-populating Redis with '
    'genre catalogs and browse data, consuming approximately 1,400 Redis commands per full warm cycle.'
))

story.append(h2('2.2 Provider System'))
story.append(p(
    'All streaming providers are hardcoded in src/lib/streaming/providers.ts as TypeScript objects with URL generator functions. The current '
    'active lineup consists of 4 Tier 1 providers (VidSrc CC, Embed.su, VidSrc.to, MultiEmbed) and 4 Tier 2 backups (VidSrc.me, Nontongo, '
    'MoviesApi.to, VidSrc.vip), with a replacement pool of approximately 40 additional providers. The swap system uses three in-memory '
    'Maps (swappedIn, swappedOut, swapMapping) to track provider promotions and demotions. When the health check detects 2 consecutive '
    'failures for a provider, it automatically swaps in a replacement from the pool and pre-pings the replacement to verify it works. '
    'On recovery, the original provider is restored. Notably, 75% of Tier 1 providers belong to the VidSrc ecosystem, creating a single '
    'point of failure if the VidSrc infrastructure is targeted.'
))

story.append(h2('2.3 Health Monitoring'))
story.append(p(
    'The health monitoring system (src/lib/streaming/health-check.ts) operates entirely in-memory with no Redis or database persistence. '
    'It pings providers using fetch() with method HEAD and mode no-cors, which produces opaque responses. This means the system cannot '
    'distinguish between a working provider that returns a valid video player and one that returns a Cloudflare challenge page or a 403 '
    'error, since opaque responses provide no status code or content information. The check runs on a round-robin basis, examining one '
    'provider per embed API request with a minimum 5-minute interval between checks. Each provider is tested against TMDB ID 550 (Fight Club) '
    'with a 6-second timeout. A stale entry cleanup runs every 60 seconds via setInterval to prevent memory leaks in the serverless environment.'
))
story.append(p(
    'A client-side health monitoring system exists (useClientHealthCheck.ts and ClientHealthMonitor.tsx) but the ClientHealthMonitor component '
    'is never imported or mounted anywhere in the application. Even if it were active, the client reports are written to Redis keys that '
    'are never read by the server-side health system, creating a completely disconnected reporting pipeline. The Vercel Cron job at '
    '/api/embed-health-cron runs daily at 06:00 UTC and checks all services (TMDB, AniList, Supabase, Redis) plus all embed providers, '
    'but this provides only a once-daily snapshot rather than continuous monitoring.'
))

story.append(h2('2.4 Player Implementation'))
story.append(p(
    'The entire video playback system is built on third-party iframe embeds loaded via a single &lt;iframe&gt; element in DetailsContent.tsx. '
    'There is no native video player integration whatsoever: no HLS.js, no Plyr, no Shaka Player, no DASH support. The iframe renders at '
    'full-screen fixed overlay with 16:9 aspect ratio, using sandbox="allow-scripts allow-same-origin allow-presentation allow-forms" and '
    'allow="autoplay; fullscreen; encrypted-media; picture-in-picture". A Picture-in-Picture mini-player (PipPlayer.tsx) provides a '
    'draggable, resizable floating window, also iframe-based. Notably, PlayerControls.tsx contains full transport controls (play/pause, '
    'skip, speed, volume, CC toggle) and useEpisodeTimer.ts tracks elapsed time with skip intro/credits logic, but NEITHER is connected '
    'to the active player. The subtitle toggle is an empty no-op function. Progress tracking uses a setInterval to simulate elapsed time '
    'rather than reading actual playback position from the video element.'
))

story.append(PageBreak())

# ── 3-17: Layer-by-Layer Gap Analysis ──
def layer_block(num, title, target, current, gap, rec, complexity, perf, rel):
    story.append(h1(f'Layer {num}: {title}'))
    story.append(h2('Target State'))
    story.append(p(target))
    story.append(h2('Current State'))
    story.append(p(current))
    story.append(h2('Gap Analysis'))
    story.append(p(gap))
    story.append(h2('Migration Recommendation'))
    story.append(p(rec))
    story.append(sp(4))
    story.append(simple_table(
        ['Aspect', 'Assessment'],
        [
            ['Implementation Complexity', complexity],
            ['Expected Performance Gain', perf],
            ['Expected Reliability Gain', rel],
        ],
        [AVAIL_W * 0.35, AVAIL_W * 0.65]
    ))
    story.append(sp(12))

layer_block(1, 'Metadata Layer',
    'Store content metadata in a local database table with fields: id, type, tmdb_id, anilist_id, title, poster, backdrop, rating, genres, '
    'runtime, and year. Metadata should be fetched from TMDB and AniList as the source of truth, but cached locally for fast access. '
    'The database should serve as the primary read path for frequently accessed content, with external APIs as the fallback for '
    'less popular or newly released titles.',

    'The current system stores zero content metadata in any database. All 18 Supabase PostgreSQL tables are dedicated exclusively to '
    'user and social data (profiles, watchlist, watch_progress, ratings, comments, collections, follows, notifications, watch party rooms, '
    'reminders, and genre visit tracking). Every content detail page fetches metadata on-demand from TMDB or AniList, mitigated by a '
    '4-tier caching hierarchy: browser-side in-memory deduplication (approximately 0ms hit), Upstash Redis (approximately 10ms hit), '
    'Cloudflare API Cache Worker for TMDB only (approximately 50ms hit), and the external API directly (300-800ms). Cache warming runs '
    'daily via Vercel Cron, pre-populating Redis with genre catalogs and browse data using approximately 1,400 Redis commands per cycle.',

    'The primary weakness is the complete absence of a local content store. While the 4-tier cache is well-designed, it means that '
    'every cold cache miss results in an external API call. More critically, the system is entirely dependent on TMDB and AniList '
    'availability. If either service experiences an outage, cached data gradually expires and users see errors. The Redis free tier '
    'limit of 10,000 commands per day constrains the caching depth, and the AniList GraphQL client cannot use the Cloudflare Worker '
    'cache because AniList blocks Cloudflare Worker requests with 403 errors, creating an asymmetry in cache coverage between TMDB '
    'and AniList content.',

    'Add a content table to Supabase with tmdb_id, anilist_id, title, poster, backdrop, rating, genres, runtime, and year. Build a '
    'background sync service that populates this table for popular content (trending, top-rated, seasonal anime) during the daily cache '
    'warm cycle. Keep TMDB and AniList as the authoritative source of truth, using the local table as a fast read path. For less popular '
    'content not yet synced, fall through to the existing cache hierarchy. This is a non-breaking change that adds a new read path '
    'without modifying the existing cache layers.',
    'Medium', 'Reduce cold-start detail page latency from 300-800ms (API hit) to approximately 10ms (Redis) or approximately 2ms '
    '(local DB) for popular content. First-time visitors to popular titles get instant metadata.', 'Decouple from external API '
    'outages for the most popular content. If TMDB or AniList goes down, popular titles remain accessible from local cache.'
)

layer_block(2, 'Provider Registry',
    'Create a database-driven provider configuration system. Each provider should be stored as a database record with fields: id, name, '
    'type, status, priority, supports_subtitles, supports_dub, supports_hls, supports_iframe, supports_anime, and supports_movie. '
    'Providers should be fully configurable through database records or an admin API, eliminating the need for code deployments to '
    'add, remove, or modify streaming providers.',

    'All providers are hardcoded in src/lib/streaming/providers.ts as TypeScript objects with inline URL generator functions. The file '
    'defines a StreamProvider interface with name, tier, category, and three URL generator functions (getMovieUrl, getTvUrl, and '
    'optional getAnimeUrl). Currently there are 8 active providers (4 Tier 1, 4 Tier 2) and approximately 40 entries in the replacement '
    'pool. Provider capability flags (such as subtitle support, HLS support, or dub support) do not exist anywhere in the codebase. '
    'All swap state (which providers are active, which are demoted, and the mapping between them) lives in three in-memory Maps that '
    'are lost on every Vercel serverless cold start, making the replacement system unreliable in production where cold starts are frequent.',

    'The fundamental problem is that changing any aspect of the provider configuration requires a code change, commit, and deployment '
    'cycle. This is particularly problematic because the streaming provider ecosystem is highly volatile, with providers frequently being '
    'shut down by legal action or simply disappearing. Additionally, the lack of capability flags means the system cannot make intelligent '
    'routing decisions based on what a provider actually supports. The in-memory swap state means that provider health improvements '
    'or degradations detected during one serverless instance lifecycle are invisible to other instances.',

    'Create a providers table in Supabase with all the fields from the target schema. Build a server-side provider loader that reads '
    'from this table on application startup and caches the result in Redis with a short TTL. Create an admin API for CRUD operations '
    'on provider records. Keep the TypeScript types as compile-time validation for the provider shape. Migrate all existing hardcoded '
    'providers to database records in an initial seed migration.',
    'Medium', 'No direct performance improvement for end users. The change is architectural.', 'Enable hot-swapping providers without '
    'code deployment. Provider health state survives serverless cold starts. Admin can respond to provider outages in minutes '
    'instead of hours.'
)

layer_block(3, 'Content Intelligence Engine',
    'Build an intelligent content routing system that classifies content by type (movie, anime, TV) and routes to the appropriate '
    'provider pool. The routing logic should examine content metadata (genre tags, source API, AniList ID presence) and select the '
    'best-matching provider pool before any stream resolution occurs.',

    'A basic content type routing mechanism already exists through ID namespacing. The isAnilistId() function checks whether a content '
    'ID is greater than or equal to 100,000,000 (the ANILIST_ID_OFFSET), and this check routes metadata fetching, image handling, and '
    'provider selection. Genre-level routing also exists in src/config/genres.ts where each PortalGenreConfig has a source field of '
    'either "tmdb" or "anilist". However, there is no active anime-specific provider routing. Anime content falls through to the same '
    'general providers using TMDB-style URLs. Only 3 anime-specific providers exist in the replacement pool (VidSrc WIN Anime, Kwik Anime, '
    'FileMoon Anime) and none are in the active tier.',

    'While the ID namespacing system works correctly for metadata routing, it does not extend to provider selection. Anime content '
    'is served by the same general providers as movies and TV shows, using TMDB IDs. This means anime titles that lack TMDB IDs or '
    'have poor TMDB metadata coverage will fail to find working streams. The genre-based routing in the config only affects browse '
    'pages, not the actual playback provider selection. There is no runtime intelligence that says "this is anime, use the anime pool."',

    'Enhance the existing content type detection by building a lightweight routing function that examines the _isAnilist flag, genre '
    'array, and source metadata to classify content as movie, TV, or anime. Promote verified anime providers to active status. '
    'Add an anime-specific selection path in the embed API that uses anime-capable providers with MAL ID-based URLs when available. '
    'This builds directly on the existing isAnilistId infrastructure.',
    'Low', 'Better first-attempt success rate for anime content, estimated improvement from roughly 40% to 70%.', 'Independent failure '
    'domains for anime versus movies/TV content. A movie provider outage does not affect anime playback.'
)

layer_block(4, 'Provider Pools',
    'Maintain separate provider pools for movies and anime. The Movie Pool should contain providers specialized in movie and TV show '
    'embeds, while the Anime Pool should contain providers that support anime-specific URL patterns (including MAL ID-based resolution). '
    'Each pool should have its own health tracking, scoring, and failover chain.',

    'The current system has a single provider pool with a category field of either "all" or "anime". Most entries have category "all". '
    'Only 3 providers in the replacement pool have category "anime" (VidSrc WIN Anime, Kwik Anime, FileMoon Anime), and none are in '
    'the active tier. The getAnimeEmbedUrls() function concatenates general providers with anime providers, but since no anime providers '
    'are active, the "anime" section is always empty at runtime. The replacement pool contains 40+ general providers but very few '
    'have been validated for anime content.',

    'The anime pool is effectively non-functional. When a user plays an anime title, they are served by the same providers as movie '
    'watchers, using TMDB IDs. This is problematic because many anime titles have poor TMDB coverage or different episode numbering. '
    'Additionally, movie and TV providers often lack anime-specific features such as subtitle availability in multiple languages, '
    'dub tracks, and the episode grouping conventions used by anime fans.',

    'Validate existing anime providers (VidSrc WIN, Kwik, FileMoon) and promote working ones to active status. Add additional '
    'anime providers from the target list (DropFile, Cinezo, MegaPlay, SupaPlay, Anikoto). Build pool separation logic in the embed '
    'API so that anime content uses the anime pool first with general pool as fallback. This requires testing each provider with '
    'actual anime content to verify they work.',
    'Medium', 'Faster anime playback start with anime-optimized providers. Estimated 2-3 second improvement on average.', '
    'Independent failure isolation between content types. Anime viewers are not affected by movie provider outages and vice versa.'
)

layer_block(5, 'Health Monitoring',
    'Build comprehensive provider monitoring that measures response time, success rate, subtitle availability, and quality availability '
    'every 5 minutes. Store results in a provider_health database table. Implement circuit breaker pattern (open after consecutive '
    'failures, half-open after cooldown), provider quarantine for consistently failing providers, and automatic recovery detection '
    'when a provider starts responding again.',

    'The health monitoring system (src/lib/streaming/health-check.ts) operates entirely in-memory using three Maps: healthStore '
    '(alive/dead boolean plus timestamp), prevHealthStore (previous state for transition detection), and failCountStore (consecutive '
    'failure counter). Providers are pinged using fetch() with method HEAD and mode no-cors, producing opaque responses that provide '
    'no status code, no content validation, and no latency measurement. The check runs round-robin at one provider per embed API '
    'request with a minimum 5-minute interval. After 2 consecutive failures, the system swaps in a replacement from the pool. '
    'A client-side health monitor (useClientHealthCheck.ts) exists but the ClientHealthMonitor component is dead code that is never '
    'mounted in the app. Client health reports are written to separate Redis keys that are never read by the server health system.',

    'The most critical gap is that the no-cors HEAD ping cannot distinguish a working provider from one behind a Cloudflare challenge '
    'page, an error page, or a captcha wall. A provider that returns a "verify you are human" page is marked as "alive" because the '
    'opaque fetch does not throw. Additionally, in-memory state is lost on every Vercel serverless cold start. With Vercel hobby tier '
    'experiencing cold starts every few minutes, the swap state is frequently reset, meaning a provider detected as dead in one instance '
    'may still be served by another instance that has not yet checked it. The disconnect between client health reports and server '
    'decisions means distributed monitoring data is collected but wasted.',
    'Move health state to Redis for persistence across serverless instances. Replace no-cors HEAD pings with actual GET requests that '
    'validate the response contains expected content (e.g., a video element or player script). Add response time measurement to every '
    'ping. Implement a circuit breaker: after 3 consecutive failures, open the circuit and skip the provider for 5 minutes. '
    'In half-open state, allow one test request; if it succeeds, close the circuit. Connect the existing client health reports '
    'to the server-side health system by reading from the Redis keys that the client writes to. Activate the ClientHealthMonitor '
    'component in the app layout.',
    'High', 'Reduce dead provider detection from potentially hours (waiting for round-robin) to under 5 minutes with persistent '
    'state. Content validation eliminates false-positive "alive" readings from challenge pages.', 'Dramatically reduce serving broken '
    'providers. Persistent state survives cold starts. Circuit breaker prevents cascading failures when multiple providers degrade '
    'simultaneously.'
)

layer_block(6, 'Dynamic Provider Scoring',
    'Every provider receives a composite score calculated as: score = (successRate * 40) + (speed * 30) + (subtitles * 10) + '
    '(quality * 10) + (history * 10). Scores are recalculated periodically and stored in Redis. Provider ranking updates automatically '
    'based on the latest metrics, ensuring the best-performing providers are always served first.',

    'There is absolutely no runtime scoring in the current system. Providers are sorted exclusively by tier number (Tier 1 before Tier 2) '
    'and then by their order within the array. A slow, unreliable Tier 1 provider will always be presented before a fast, reliable '
    'Tier 2 provider. The only ranking mechanism is the static tier assignment, which is determined at code-write time and only changes '
    'when a developer manually edits providers.ts. The provider-refresh.mjs script does perform latency scoring, but this only affects '
    'which providers get written into the TypeScript file during the daily cron job, not runtime selection.',

    'Without scoring, the system cannot adapt to real-world provider performance. A provider that consistently takes 5 seconds to '
    'respond but works is treated identically to one that responds in 200 milliseconds. A provider with 95% success rate is ranked '
    'the same as one with 50% success rate as long as both are Tier 1. This means users frequently experience poor providers first '
    'before failing over to better ones, degrading the user experience on every playback attempt.',

    'Build a scoring engine that runs in Redis alongside the health check system. On each provider ping, record the response time '
    'and success/failure outcome. Track rolling success rate over the last 100 requests per provider. Calculate the composite score '
    'using the target formula. Store scores in Redis with provider names as keys. In the embed API, sort providers by score '
    'instead of tier, using tier only as a tiebreaker. Scores update every 5 minutes alongside health checks.',
    'High', '30-50% faster average provider selection by routing to the fastest, most reliable provider first. Users experience '
    'the best provider on the first attempt more frequently.', 'Automatically deprioritize degrading providers before users notice. '
    'Self-healing: when a provider recovers, its score naturally rises and it regains priority.'
)

layer_block(7, 'Smart Provider Selection',
    'Implement intelligent provider selection following the flow: Content is identified by type, the appropriate provider pool is '
    'loaded, cached scores are read from the scoring engine, the top 3 providers are selected based on score, and the best provider '
    'is served to the player. The system should never use random selection or a fixed provider order; it must always use '
    'intelligent ranking based on real-time performance data.',

    'The current selection logic is trivially simple. The server returns all active providers sorted by tier number. The client '
    '(DetailsContent.tsx) fetches this list and defaults to index 0, which is the first Tier 1 provider. The user can manually '
    'switch providers via a dropdown, but the default selection is always the same fixed order regardless of actual provider '
    'performance, geographic location, content type, or historical success patterns. There is no per-user, per-region, or '
    'per-content personalization of provider selection.',

    'The fixed-order selection means every user sees the same provider first, even if that provider is slow or unreliable in their '
    'geographic region. A provider that works well for users in Europe may be terrible for users in Asia, but the system has no '
    'way to differentiate. Additionally, when a Tier 1 provider is experiencing degradation (slow but not dead), every user hits it '
    'first and experiences poor quality before failing over, rather than the system proactively routing around it.',

    'Modify the embed API to perform server-side provider selection. After scoring (Layer 6), sort providers by composite score '
    'and return only the top 3 as a prioritized list. The client should try provider 1 first, with provider 2 and 3 as immediate '
    'failover targets. This is a natural extension of the scoring engine and requires minimal client-side changes since the '
    'failover logic already supports sequential provider switching.',
    'Medium', 'Higher first-attempt success rate by always selecting the best available provider. Estimated improvement from '
    '60% to 80-85%.', 'Adaptive routing that responds to real-time provider conditions. Geographic and content-type awareness '
    'emerges naturally from score-based selection.'
)

layer_block(8, 'Parallel Validation',
    'Instead of trying providers sequentially, test the top 3 providers in parallel using Promise.all([testA(), testB(), testC()]). '
    'Select the fastest successful result. This eliminates the wait time associated with sequential timeout-based failover and '
    'dramatically reduces the worst-case time to a working stream.',

    'The current system is entirely sequential. When a user clicks play, the first provider is loaded into an iframe. If it does not '
    'fire an onLoad event within 15 seconds, the system switches to the next untried provider. If that also fails, it tries the '
    'next one. With 3 failures before a working provider is found, the user waits up to 45 seconds before seeing content. The '
    'timeout is the only failure detection mechanism; there is no server-side pre-validation of providers before serving them to '
    'the client. The triedProviders Set tracks which providers have been attempted to avoid retrying known failures.',

    'The 15-second timeout per provider is extremely long when multiplied across multiple failures. Users who hit a dead Tier 1 '
    'provider wait 15 seconds, then try the next, then the next. This creates a poor user experience and leads to abandonment. '
    'Additionally, the client has no way to pre-validate whether a provider is actually serving content before loading it into the '
    'iframe, so every attempt involves a full page load cycle.',
    'Implement server-side parallel validation in the embed API. When a play request arrives, take the top 3 scored providers '
    'and fetch their embed URLs simultaneously with a 6-second timeout each. Return the first that responds successfully, '
    'pre-validated. The client receives a single URL that has already been verified as reachable. This changes the embed API '
    'from a "list all providers" endpoint to a "return the best provider" endpoint. The sequential client-side failover remains '
    'as a fallback for cases where the server-side validation itself fails.',
    'High', 'Reduce worst-case startup time from 45 seconds (3 sequential 15s timeouts) to approximately 6 seconds (one parallel '
    'round). Average startup improves from 2-5 seconds to under 1 second for cached streams.', 'Users almost never see a failed '
    'provider. The system handles all validation transparently before the player loads.'
)

layer_block(9, 'Stream Resolver Cache',
    'Implement a Redis-based cache for resolved stream URLs. The cache key pattern should be content:1234:provider:vidcore '
    'mapping to the resolved stream URL with a 10-minute TTL. Goals include reducing provider requests, improving startup speed, '
    'and reducing overall latency for repeat plays.',

    'There is no stream URL caching whatsoever. Every play request hits the /api/embed endpoint, which generates provider URLs '
    'fresh by calling the URL generator functions. The embed URLs themselves are deterministic (based on TMDB ID and provider name), '
    'so the same content on the same provider always produces the same URL. However, the server does not cache the validation '
    'result (whether the provider actually served content). The client-side fetch-dedup.ts does cache /api/embed responses for '
    '5 seconds, but this only prevents duplicate requests within a short window and does not persist across page loads.',

    'Without stream caching, every play action triggers a full API round-trip including rate limiting, dead provider filtering, '
    'and provider list generation. For users who pause and resume, switch episodes, or rewatch content, this is redundant work. '
    'The 5-second client-side cache helps slightly for rapid navigation but provides no benefit for users returning to the same '
    'content after closing the tab.',

    'Add a Redis cache layer in the embed API that stores successful provider-to-URL mappings with a 10-minute TTL. The cache key '
    'should incorporate content ID, provider name, season, and episode. On cache hit, return the cached provider URL immediately '
    'without re-running the full provider selection pipeline. On cache miss, run the normal selection logic and cache the result. '
    'Invalidate cache entries when a provider is marked as dead.',
    'Low', 'Near-instant repeat play for users who pause/resume or switch episodes. Eliminates API round-trip for cached content, '
    'reducing startup from 500-1000ms to under 50ms.', 'Reduces load on the provider selection pipeline. Cached providers that '
    'were verified as working provide a higher confidence level for repeat plays.'
)

layer_block(10, 'Intelligent Player',
    'Replace or augment the iframe-based player with a native video player supporting resume watching, skip intro, skip credits, '
    'subtitles, quality selection, playback speed, picture-in-picture, and Chromecast. Recommended technologies include HLS.js for '
    'streaming, combined with Plyr or Shaka Player for the UI layer.',

    'The current player is 100% iframe-based with zero native video integration. The app cannot access the video element inside '
    'the cross-origin iframe, meaning it has no control over playback quality, subtitle rendering, seeking behavior, or playback '
    'position. PlayerControls.tsx contains a full set of transport controls (play/pause, previous/next episode, plus/minus 30 '
    'second skip, speed selection from 0.5x to 2x, volume slider, CC toggle, PiP button, and exit button) but this component is '
    'never rendered in the active player. Similarly, useEpisodeTimer.ts tracks elapsed time, skip intro (first 90 seconds), skip '
    'credits (last 90 seconds), playback speed, mute, volume, and CC state, but this hook is not imported or used in '
    'DetailsContent.tsx. The subtitle toggle in the keyboard shortcuts handler calls an empty no-op function. The progress tracking '
    'system uses setInterval to simulate elapsed time rather than reading actual playback position.',
    'This is the single largest architectural gap. The app has built significant player infrastructure (PlayerControls, useEpisodeTimer, '
    'PipPlayer) but none of it is connected to the actual playback system. The iframe approach provides zero visibility into '
    'playback state, making features like accurate progress tracking, skip intro, and subtitle display fundamentally impossible '
    'without native player integration. The orphaned components suggest an intention to build these features that was never completed.',
    'Implement a hybrid player approach. For providers that offer direct HLS/DASH stream URLs (discoverable through a resolver '
    'endpoint), switch to a native player using HLS.js with Plyr or Shaka Player for the UI. For providers that only offer '
    'iframe embeds, continue using the iframe approach but add a postMessage-based communication layer where supported. '
    'Wire up the existing PlayerControls and useEpisodeTimer to the native player. This is the highest-risk change but provides '
    'the foundation for every other feature in the target architecture (accurate analytics, learning engine, subtitle support).',
    'Very High', 'Native player enables instant seeking (no rebuffering), quality switching without reloading, and subtitle overlay '
    'without depending on provider support. Eliminates the 15-second iframe load time for supported providers.', 'Eliminates '
    'dependency on third-party player UI. The app controls the entire user experience. Accurate progress tracking becomes possible.'
)

layer_block(11, 'Auto Failover',
    'Implement seamless provider failover with a user-facing "Loading backup source..." message. When the current provider fails, '
    'the system should switch to the next provider and continue playback from the same position, with minimal disruption to the '
    'user. The user should never see a raw "Video unavailable" error if any working provider exists.',

    'The current failover mechanism in DetailsContent.tsx has three layers: a 15-second timeout that auto-switches providers if '
    'the iframe does not fire onLoad, an onError event handler that triggers immediate switching, and a manual dropdown for user '
    'selection. The handleProviderFail() function adds the current provider to a triedProviders Set and linearly scans for the next '
    'untried provider. It shows a toast notification ("Switching from X to Y...") and if all providers are exhausted, displays '
    '"All providers unavailable. Try again later." Each failover completely remounts the iframe (controlled by the key prop), '
    'losing all playback state including position, buffer, and player UI state.',
    'The 15-second timeout is too long for user tolerance. Each failover causes a full iframe remount, which means the user '
    'loses their place in the video and must wait for the new provider to load from scratch. There is no pre-fetching of the next '
    'provider URL, so the user sees a blank player during the switch. The linear scan through providers means that if the first '
    'provider is dead and the second is slow, the user experiences both problems sequentially.',
    'Reduce the timeout from 15 seconds to 8 seconds. Pre-fetch the next provider URL before switching so the new iframe loads '
    'immediately. Show a "Loading backup source..." overlay during the transition. With the native player (Layer 10), preserve '
    'playback position across provider switches by recording the timestamp before failover and seeking to it in the new stream. '
    'These improvements are achievable with the current iframe approach and become even more effective with a native player.',
    'Medium for iframe improvements, High for seamless position-preserving failover with native player.', '50% faster failover '
    'recovery by pre-fetching and reducing timeout. User-perceived downtime drops from 15+ seconds to 3-5 seconds.', 'Users '
    'experience fewer complete playback failures. The system appears more reliable even when individual providers are flaky.'
)

layer_block(12, 'Learning Engine',
    'Track playback events in a playbacks table with fields: user, content, provider, success, watch_time, buffer_count. Use '
    'this data to automatically evolve provider rankings. The goal is provider rankings that adapt to real usage patterns: for example, '
    'DropFile wins for anime, VidCore wins for movies, and EZVidAPI wins for TV.',

    'There is no playback analytics system whatsoever. The only data collection mechanisms are discrete activity events logged to the '
    'activity table (types: watched, completed, added_to_watchlist, commented, rated, created_list, updated_list) and the watch_progress '
    'table that stores simulated (not actual) playback position. No event tracking exists for play/pause/seek/complete/buffer events. '
    'No per-provider success or failure tracking occurs at the user level. The useEpisodeTimer hook tracks elapsed time but does not '
    'report it anywhere. The watch_progress table stores a progress fraction and duration, but the progress is based on simulated '
    'time from setInterval, not actual video position, making it inaccurate for content with ads, intros, or variable playback speeds.',
    'Without accurate playback analytics, the system cannot learn which providers work best for which content types, regions, or user '
    'segments. Provider rankings are entirely static, based on manual tier assignments. There is no feedback loop between user '
    'experience and provider selection. The system cannot identify patterns like "Provider X works well for new movies but fails '
    'for older content" or "Provider Y is fast in Asia but slow in Europe."',
    'Create a playbacks table to store per-play events: play_start, play_success (did the provider serve content?), play_fail '
    '(did the provider fail or timeout?), buffer_count, watch_duration_seconds, provider_used, content_id, and user_profile_id. '
    'Track these events from the client side (play start, provider load success/fail, periodic buffer count) and from the server '
    'side (provider health checks). Aggregate metrics daily into per-provider scores. Feed aggregated scores into the Layer 6 '
    'dynamic scoring engine. This requires the native player (Layer 10) for accurate buffer count and watch duration data.',
    'High', 'Better long-term provider rankings that reflect real user experience. The system self-improves over time.', '
    'Self-improving system that adapts to changing provider quality. Geographic and content-type-specific optimizations emerge '
    'naturally from usage patterns.'
)

layer_block(13, 'Anime Intelligence',
    'Build a persistent ID mapping layer that stores AniList ID, TMDB ID, and MAL ID for every anime title. This mapping should '
    'support cross-provider resolution, enabling the system to find content regardless of which ID a provider requires. The mapping '
    'layer should include fallback chains: if a provider needs a MAL ID but only a TMDB ID is available, the system should '
    'attempt to resolve the MAL ID through the mapping or through an external lookup.',

    'The current system stores AniList ID as _anilistId and MAL ID as _malId as properties on the MediaItem object. TMDB ID is the '
    'base identifier. There is no persistent mapping table; these IDs are fetched on-demand from AniList and stored only in memory '
    'during the request lifecycle. The ID namespacing system (100M offset) works for routing but does not solve the cross-ID '
    'resolution problem. Anime providers in the replacement pool that use MAL ID-based URLs (Kwik, FileMoon) require a MAL ID '
    'that may not be available for all content. Some anime titles exist on AniList but not on TMDB, and vice versa.',
    'The lack of a persistent ID mapping means that every request for anime content must hit AniList to resolve IDs. If AniList '
    'experiences an outage, anime with no cached TMDB ID becomes unreachable. Cross-provider resolution is particularly '
    'problematic: if a user is watching anime and switches to a provider that requires MAL IDs, the system must resolve the MAL '
    'ID from the AniList metadata, which may not be available. The 100M offset ID namespace creates a barrier to cross-referencing '
    'since the original AniList ID must be extracted before it can be used with anime-specific providers.',
    'Create a content_ids mapping table in Supabase with columns for anilist_id, tmdb_id, and mal_id. During the daily cache warm '
    'cycle, populate this table from AniList data (which includes both MAL and TMDB IDs in its responses). Build a resolution '
    'service that takes any one ID and attempts to find the other two through the mapping table or a quick AniList API call. '
    'This enables fallback chains for provider resolution.',
    'Medium', 'Faster anime resolution with cached ID mappings. Eliminate AniList API calls for content already in the mapping table.', '
    'Survive individual metadata source outages. If AniList is down, anime with pre-cached ID mappings remains accessible.'
)

layer_block(14, 'CDN Strategy',
    'Store and serve posters, images, and subtitle files through Cloudflare R2 with Cloudflare CDN. The CDN should act as an '
    'origin-pull cache for TMDB and AniList images, providing a fast, reliable image delivery layer that is independent of the '
    'source CDNs. The platform should never proxy video streams through its own infrastructure.',

    'TMDB images are served directly from image.tmdb.org using a custom image loader (src/lib/images.ts) that bypasses Vercel Image '
    'Optimization (due to the free tier limit of 1,000 optimizations per month). AniList images come from s4.anilist.co. The custom '
    'loader selects from pre-sized TMDB paths (w92, w185, w342, w500, w780, w1280) based on the use case. No self-hosted image cache '
    'exists. The Cloudflare Cache Proxy (workers/cache-proxy.js) sits in front of the Vercel origin but does NOT cache embed stream '
    'URLs, which is correct behavior. No subtitle files exist anywhere in the system. No Cloudflare R2 integration exists.',
    'If TMDB or AniList image CDNs experience latency or outages in certain geographic regions, image loading degrades for all users '
    'in those regions. The custom loader bypasses Vercel image optimization, meaning no automatic format conversion (WebP/AVIF) or '
    'size optimization occurs. No subtitle storage exists because the iframe-based player cannot access or modify subtitle tracks.',
    'Add Cloudflare R2 as an origin-pull cache for TMDB and AniList images. Configure R2 to fetch images from the source CDNs on '
    'first request and serve from R2 on subsequent requests via Cloudflare CDN. This provides geographic edge caching independent '
    'of TMDB and AniList. When the native player is implemented (Layer 10), store subtitle files (SRT/VTT) in R2 as well. '
    'No code changes are needed for the image loader; only the image base URL needs to point to the R2 custom domain.',
    'Medium', 'Faster image loading in all geographic regions through Cloudflare CDN edge caching. Reduced load on TMDB and '
    'AniList CDNs.', 'Independent image delivery that survives TMDB/AniList CDN issues. Subtitle files cached for instant loading.'
)

layer_block(15, 'Monitoring Dashboard',
    'Create an operational dashboard showing real-time provider health (Green/Yellow/Red), provider speed metrics, failure rates, '
    'most watched content, current active streams, cache hit rates, and average startup times. The dashboard should provide '
    'visibility into system performance and enable proactive provider management before users are affected.',

    'The /stats page displays personal user statistics: total hours watched (calculated from progress times duration), number of '
    'titles watched, day streak, monthly activity bar chart, average rating, and recently watched list. The /api/health endpoint '
    'checks TMDB credentials, Supabase connectivity, Redis connectivity, and embed provider health, returning status "ok" or "degraded" '
    'with per-service details. The /api/embed-health-cron endpoint runs daily and checks all services plus all providers, returning '
    'a structured report. There is no real-time operational dashboard, no historical trend data for provider performance, no cache '
    'hit rate visibility, and no active stream counting.',
    'Without an operational dashboard, the system operators have no visibility into provider degradation trends. A provider that '
    'gradually slows down over days will not trigger the 2-failure swap threshold because it never fully fails. The daily cron '
    'check provides only a once-a-day snapshot, missing intermittent failures. There is no way to see how the system is performing '
    'for users right now, making it impossible to proactively address issues before they impact users.',
    'Build an /admin/dashboard page that displays: (1) real-time provider health status cards with Green/Yellow/Red indicators, '
    '(2) provider response time charts over the last 24 hours and 7 days, (3) provider success rate trends, (4) cache hit rate '
    'from Redis, (5) most watched content list, (6) estimated active streams, (7) average startup time. Expose a metrics API '
    'that feeds the dashboard with data from the health check system, Redis cache stats, and the playbacks table (once created in '
    'Layer 12). This is a read-only observability feature with no risk to the existing system.',
    'Medium', 'No direct performance improvement. This is an operational observability feature.', 'Enables proactive provider '
    'management. Operators can identify degrading providers before they fail. Data-driven decisions for provider pool management.'
)

story.append(PageBreak())

# ── 18. Migration Roadmap ──
story.append(h1('18. Migration Roadmap'))
story.append(p(
    'The migration is organized into four phases, ordered by dependency and risk. Each phase builds on the previous one, ensuring '
    'that foundational infrastructure is in place before more complex features are added. The phases are designed so that each one '
    'delivers standalone value, meaning the platform improves incrementally even if later phases are delayed.'
))

story.append(h2('Phase 1: Foundation (Weeks 1-4)'))
story.append(p(
    'Phase 1 addresses the most critical gaps with the lowest risk. These changes improve the existing system without requiring '
    'architectural changes to the player or provider selection logic. The primary focus is on making health monitoring persistent '
    'and adding the scoring engine that all subsequent phases depend on.'
))
story.append(simple_table(
    ['Task', 'Layer', 'Risk', 'Impact'],
    [
        ['Move health state from memory to Redis', '5', 'Low', 'High'],
        ['Add provider scoring engine', '6', 'Medium', 'High'],
        ['Create providers DB table', '2', 'Low', 'Medium'],
        ['Connect client health reports to server', '5', 'Low', 'Medium'],
        ['Add stream resolver cache', '9', 'Low', 'Medium'],
    ],
    [AVAIL_W * 0.40, AVAIL_W * 0.10, AVAIL_W * 0.12, AVAIL_W * 0.38]
))
story.append(sp(8))

story.append(h2('Phase 2: Intelligence (Weeks 5-8)'))
story.append(p(
    'Phase 2 adds intelligence to the provider selection process. These changes build on the scoring engine from Phase 1 and '
    'introduce content-aware routing. The risk level increases because changes to the embed API contract affect the core '
    'playback flow, but the player itself remains iframe-based, keeping the risk contained.'
))
story.append(simple_table(
    ['Task', 'Layer', 'Risk', 'Impact'],
    [
        ['Smart provider selection', '7', 'Medium', 'High'],
        ['Content type routing', '3', 'Low', 'Medium'],
        ['Anime pool separation', '4', 'Medium', 'High'],
        ['Parallel validation', '8', 'High', 'Very High'],
        ['Improved failover (8s timeout, pre-fetch)', '11', 'Low', 'Medium'],
    ],
    [AVAIL_W * 0.40, AVAIL_W * 0.10, AVAIL_W * 0.12, AVAIL_W * 0.38]
))
story.append(sp(8))

story.append(h2('Phase 3: Player Evolution (Weeks 9-16)'))
story.append(p(
    'Phase 3 is the highest-risk but highest-reward phase. It introduces a hybrid player architecture that replaces or augments '
    'the iframe approach with a native video player. This phase is the enabler for accurate analytics, subtitle support, '
    'and quality selection. The longer timeline accounts for the complexity of player integration and the need for thorough '
    'testing across different browsers and devices.'
))
story.append(simple_table(
    ['Task', 'Layer', 'Risk', 'Impact'],
    [
        ['Hybrid player (HLS.js + Plyr)', '10', 'Very High', 'Very High'],
        ['Playback analytics', '12', 'Medium', 'High'],
        ['Content ID mapping table', '13', 'Medium', 'Medium'],
        ['Skip intro/credits, subtitles, quality', '10', 'High', 'High'],
    ],
    [AVAIL_W * 0.40, AVAIL_W * 0.10, AVAIL_W * 0.12, AVAIL_W * 0.38]
))
story.append(sp(8))

story.append(h2('Phase 4: Scale (Weeks 17-20)'))
story.append(p(
    'Phase 4 focuses on infrastructure improvements and operational tooling. These changes are independent of the player evolution '
    'and can proceed in parallel with Phase 3 if resources allow. The primary goals are improving content delivery performance '
    'and adding operational visibility.'
))
story.append(simple_table(
    ['Task', 'Layer', 'Risk', 'Impact'],
    [
        ['Content DB table with background sync', '1', 'Low', 'Medium'],
        ['CDN/R2 image caching', '14', 'Low', 'Medium'],
        ['Monitoring dashboard', '15', 'Low', 'Medium'],
        ['Learning engine automation', '12', 'Medium', 'High'],
    ],
    [AVAIL_W * 0.40, AVAIL_W * 0.10, AVAIL_W * 0.12, AVAIL_W * 0.38]
))
story.append(sp(8))

story.append(PageBreak())

# ── 19. Risk Analysis ──
story.append(h1('19. Risk Analysis'))
story.append(p(
    'The migration carries several categories of risk that must be managed throughout the implementation. Understanding these risks '
    'enables proactive mitigation strategies and ensures that the platform remains stable during the transition.'
))

story.append(h2('19.1 Provider Ecosystem Volatility'))
story.append(p(
    'The streaming provider ecosystem is inherently unstable. Providers are frequently shut down by anti-piracy coalitions, '
    'legal action, or simply disappear without notice. The current 40-entry replacement pool provides some resilience, but many '
    'of these providers may also be dead or non-functional. The migration must account for the fact that provider availability '
    'can change at any time, and the system must be designed to handle this gracefully. Mitigation includes maintaining a '
    'large, diverse replacement pool, implementing automated health checks that run more frequently than the current daily cron, '
    'and designing the scoring engine to rapidly deprioritize providers that show degradation patterns before they fail completely.'
))

story.append(h2('19.2 Serverless State Loss'))
story.append(p(
    'Vercel serverless functions lose all in-memory state on cold starts. The current health monitoring and provider swap state '
    'is entirely in-memory, meaning that provider detections in one instance are invisible to other instances. With the hobby '
    'tier, cold starts can occur every few minutes for low-traffic applications. The migration to Redis-based state (Phase 1) '
    'is the primary mitigation. However, Redis itself has a free tier limit of 10,000 commands per day, which may be insufficient '
    'for a production deployment with frequent health checks. Upgrading Redis to a paid tier or using Vercel KV as an alternative '
    'should be evaluated.'
))

story.append(h2('19.3 Cross-Origin Iframe Limitations'))
story.append(p(
    'The iframe-based player fundamentally limits what the application can do. Cross-origin restrictions prevent access to the video '
    'element, playback position, buffered ranges, and subtitle tracks. The hybrid player approach (Phase 3) mitigates this for '
    'providers that offer direct stream URLs, but many providers only offer iframe embeds. The postMessage API offers a potential '
    'communication channel, but it requires the provider to implement a message listener, which most do not. The migration must '
    'accept that full player control will only be available for providers that support direct stream access.'
))

story.append(h2('19.4 Rate Limit Constraints'))
story.append(p(
    'The platform operates within several rate limit constraints: TMDB allows approximately 50 requests per second, AniList allows '
    '90 requests per minute, and Upstash Redis free tier allows 10,000 commands per day. The current system is well-designed to '
    'work within these limits, using batched Redis operations and client-side deduplication. However, the migration adds new '
    'Redis operations (health state, scoring, stream cache) that must be carefully budgeted. The scoring engine and health checks '
    'should use Redis MGET/MSET batch operations to minimize command consumption. Cache TTLs should be tuned to balance freshness '
    'against Redis budget consumption.'
))

story.append(h2('19.5 Legal and Compliance Risks'))
story.append(p(
    'The platform streams content from third-party embed providers, which raises legal and compliance concerns. While the platform '
    'itself does not host or serve copyrighted content, it provides links to services that may do so. The addition of more '
    'sophisticated provider management (scoring, health checks, parallel validation) increases the platform\'s technical '
    'capability but does not change its legal posture. The disclaimer page and DMCA page should be reviewed and updated as '
    'part of the migration. Provider diversity (not relying on any single provider ecosystem) is the best legal risk mitigation, '
    'as it prevents the platform from being dependent on any single point of legal liability.'
))

story.append(sp(12))

# ── 20. Expected Improvements ──
story.append(h1('20. Expected Improvements Summary'))
story.append(p(
    'The following table summarizes the expected improvements across key metrics after full implementation of all four migration phases. '
    'These estimates are based on the current system baseline and the architectural improvements described in this document.'
))
story.append(simple_table(
    ['Metric', 'Current', 'Target', 'Key Enabler'],
    [
        ['Cold-start playback', '1-3 seconds', '1-2 seconds', 'Resolver cache + pre-validation'],
        ['First-attempt success rate', '~60%', '85-95%', 'Scoring + parallel validation'],
        ['Worst-case failover', '45 seconds', '6-8 seconds', 'Parallel validation + pre-fetch'],
        ['Provider outage detection', 'Hours (daily cron)', '5 minutes', 'Redis state + frequent checks'],
        ['Progress tracking accuracy', 'Simulated (setInterval)', 'Actual (video API)', 'Native player'],
        ['User-facing failover', '15s timeout, full reload', '3-5s, "Loading backup..."', 'Pre-fetch + overlay'],
        ['Operational visibility', 'None', 'Real-time dashboard', 'Monitoring dashboard'],
        ['Provider ranking', 'Static (manual tier)', 'Dynamic (auto-evolving)', 'Scoring + learning engine'],
        ['Anime first-attempt success', '~40%', '~70%', 'Anime pool separation'],
        ['Image delivery', 'Direct from source CDN', 'Cloudflare CDN edge cache', 'R2 origin-pull'],
    ],
    [AVAIL_W * 0.25, AVAIL_W * 0.18, AVAIL_W * 0.18, AVAIL_W * 0.39]
))

# ── Build PDF ──
OUTPUT = '/home/z/my-project/download/Lumina_Stream_Architecture_Review.pdf'

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title='Lumina Stream Architecture Review',
    author='Z.ai',
    subject='Gap Analysis & Migration Plan'
)

doc.build(story, onFirstPage=no_footer, onLaterPages=footer_body)
print(f'PDF generated: {OUTPUT}')