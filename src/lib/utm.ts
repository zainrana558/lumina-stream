/**
 * Appends UTM params to a URL before it goes out through a share action, so
 * traffic that comes back in through that link is attributable in analytics
 * (Search Console / GA, wherever it's wired up) instead of blending into
 * direct/unknown traffic. Only for outbound share links — never applied to
 * internal navigation, canonical URLs, or anything crawlers see.
 */
export function withUtm(
  url: string,
  params: { source: string; medium: string; campaign: string }
): string {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', params.source);
    u.searchParams.set('utm_medium', params.medium);
    u.searchParams.set('utm_campaign', params.campaign);
    return u.toString();
  } catch {
    return url; // relative/invalid URL — return as-is rather than throw
  }
}
