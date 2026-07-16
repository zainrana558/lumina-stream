/** Escape special XML characters in text content. */
export function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Fallback URL entry for sitemaps when API data is unavailable. */
export function fallbackUrl(base: string, now: string): string {
  return `  <url>\n    <loc>${base}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`;
}