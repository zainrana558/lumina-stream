/**
 * Real browser render-check for embed providers.
 *
 * Every other health mechanism in this codebase (health-check.ts's
 * pingProvider, provider-intelligence.ts's probeProvider, the client-side
 * useClientHealthCheck hook, embed-health-cron's own ping) is a plain
 * fetch() — HEAD or GET, sometimes checking X-Frame-Options/CSP headers.
 * None of them can see the failure mode that actually took out roughly
 * half of this registry: a provider that returns 200 OK with no blocking
 * header at all, and only refuses to play once real browser JS notices
 * it's running inside a sandboxed <iframe> and shows its own "please
 * disable sandbox" screen instead of a player. A server-side fetch is
 * never inside an iframe, so it can't observe that check running.
 *
 * This module actually renders the provider the same way a real visitor's
 * browser would — same sandbox attribute IntelligentPlayer.tsx uses,
 * launched in a real (headless) Chromium — and reads back what's inside
 * the frame. It's deliberately conservative: only an exact match against
 * known rejection-message patterns counts as "dead". A blank frame with no
 * error is reported 'unknown', not 'dead' — several genuinely-working
 * providers (Vidzy, 2Embed, MoviesAPI) render almost no extractable text
 * on a paused-before-play video element, and calling that "dead" would
 * silently kill working providers instead of catching broken ones.
 */
import { chromium, type Browser } from 'playwright';

// Same three sandbox postures IntelligentPlayer.tsx renders, mirrored
// exactly so this check sees what a real visitor's browser sees.
const SANDBOXED_DIRECT = 'allow-scripts allow-same-origin allow-forms allow-presentation';
const SANDBOXED_PROXIED = 'allow-scripts allow-forms allow-presentation';

// Every exact rejection string observed live during the 2026-09-16 sweep,
// across VidLink, Videasy, VidSrc IO, VidSrc PM, Vidy, and MegaPlay-style
// providers. Deliberately specific phrases, not generic words like "error"
// or "blocked", which would false-positive on a provider's own in-player
// buffering/error-recovery UI.
const REJECTION_PATTERNS: RegExp[] = [
  /disable\s+sandbox/i,
  /sandbox\s+(is\s+)?detected/i,
  /sandbox\s+attribute\s+restrictions/i,
  /cannot\s+be\s+loaded\s+inside\s+a\s+restricted/i,
  /can'?t\s+be\s+embedded\s+in\s+a\s+sandboxed\s+frame/i,
  /embed(ded)?\s+our\s+player\s+in\s+a\s+way\s+that\s+disables/i,
  /remove\s+the\s+sandbox\s+attribute/i,
  /playback\s+blocked/i,
  /embed\s+blocked/i,
];

export type RenderVerdict = 'alive' | 'dead' | 'unknown';

export interface RenderCheckTarget {
  name: string;
  url: string;
  noSandbox?: boolean;
  proxied?: boolean;
}

/**
 * True on Vercel (and most other serverless platforms — they all set this
 * or an equivalent). This module needs a real Chromium binary at a known
 * local path and a browser process that survives between invocations,
 * neither of which serverless functions provide: there's no @sparticuz/
 * chromium-style serverless build in package.json, and the module-level
 * `browserPromise` below is exactly the kind of cross-request state that
 * doesn't persist across cold starts. Without this check, chromium.launch()
 * would just throw "Executable doesn't exist" (or hang into the platform's
 * function timeout) on every single invocation, and the caller's own
 * try/catch would swallow that into an endless stream of 'unknown'
 * verdicts with no indication anything is actually wrong — this makes that
 * failure explicit and cheap instead of silent and repeated.
 */
export function isRenderCheckAvailable(): boolean {
  return !process.env.VERCEL;
}

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).catch((err) => {
      browserPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  const browser = await browserPromise;
  if (!browser.isConnected()) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

/** Close the shared browser — call from a process-exit hook if one exists. */
export async function closeRenderCheckBrowser(): Promise<void> {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch { /* already gone */ }
  browserPromise = null;
}

function sandboxAttrFor(target: RenderCheckTarget): string | undefined {
  if (target.noSandbox) return undefined;
  return target.proxied ? SANDBOXED_PROXIED : SANDBOXED_DIRECT;
}

/**
 * Render one provider in a real sandboxed (or unsandboxed, per noSandbox)
 * iframe and classify the result. Budget: ~7s settle time, matching what
 * the manual sweep found necessary for slower providers to show their
 * real state (rejection text or a player) rather than a loading spinner.
 */
export async function renderCheckProvider(target: RenderCheckTarget): Promise<RenderVerdict> {
  if (!isRenderCheckAvailable()) return 'unknown';

  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch {
    return 'unknown'; // Chromium unavailable — don't let this take down the cron
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    const sandbox = sandboxAttrFor(target);
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:#000">` +
        `<iframe src="${target.url}" ${sandbox ? `sandbox="${sandbox}"` : ''} ` +
        `style="width:1280px;height:720px;border:0" ` +
        `allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe>` +
        `</body></html>`,
    );
    await page.waitForTimeout(7000);

    const iframeHandle = await page.$('iframe');
    const frame = iframeHandle ? await iframeHandle.contentFrame() : null;
    if (!frame) return 'unknown';

    let text = '';
    try {
      text = await frame.evaluate(() => document.body?.innerText ?? '');
    } catch {
      // Cross-origin content Playwright couldn't read — inconclusive either way.
      return 'unknown';
    }

    if (REJECTION_PATTERNS.some((re) => re.test(text))) return 'dead';

    // Real, substantial text with no rejection match reads as a genuine
    // player UI (title, quality/server picker, etc.) — confirmed alive.
    // A short/blank frame is deliberately left 'unknown' rather than
    // guessed at; see the module doc comment for why.
    if (text.trim().length > 20) return 'alive';
    return 'unknown';
  } catch {
    return 'unknown';
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Render-check a small batch of providers in parallel. Kept small — this
 * is meant to run from a 30-minute cron with a real time budget, not check
 * the whole registry every tick.
 */
export async function renderCheckBatch(
  targets: RenderCheckTarget[],
): Promise<Map<string, RenderVerdict>> {
  const results = await Promise.all(
    targets.map(async (t) => [t.name, await renderCheckProvider(t)] as const),
  );
  return new Map(results);
}
