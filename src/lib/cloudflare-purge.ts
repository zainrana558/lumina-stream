/**
 * Cloudflare Edge Cache Purge Utility
 *
 * Purges Cloudflare edge cache by cache tags to keep edge
 * content in sync with origin mutations. This runs as a
 * fire-and-forget side effect alongside revalidateTag().
 *
 * Prerequisites:
 * - CLOUDFLARE_ZONE_ID env var
 * - CLOUDFLARE_API_TOKEN env var (Cache Purge perms)
 * - Responses must set Cache-Tag header (see cache.ts)
 */

interface PurgeResult {
  success: boolean;
  error?: string;
}

const CLOUDFLARE_TAG_LIMIT = 30;

/**
 * Purge one or more cache tags from the Cloudflare edge.
 * Returns success:true even if purge fails (non-critical).
 * Errors are logged but never thrown to avoid crashing
 * the parent Server Action.
 */
export async function purgeEdgeCacheTags(tags: string[]): Promise<PurgeResult> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  // Missing config = feature not enabled, silently skip
  if (!zoneId || !apiToken) {
    console.warn(
      '[cloudflare-purge] Missing CLOUDFLARE_ZONE_ID ' +
      'or CLOUDFLARE_API_TOKEN, skipping edge purge'
    );
    return { success: false, error: 'Missing config' };
  }

  if (tags.length === 0) {
    return { success: true };
  }

  const results: PurgeResult[] = [];

  for (let i = 0; i < tags.length; i += CLOUDFLARE_TAG_LIMIT) {
    const chunk = tags.slice(i, i + CLOUDFLARE_TAG_LIMIT);
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tags: chunk }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error(
          `[cloudflare-purge] API error ${response.status}: ${text.slice(0, 200)}`
        );
        results.push({ success: false, error: `HTTP ${response.status}` });
      } else {
        const result = await response.json();
        if (result.success !== true) {
          console.error(
            '[cloudflare-purge] Unsuccessful purge:',
            JSON.stringify(result.errors)
          );
          results.push({ success: false, error: 'API returned failure' });
        } else {
          console.log(`[cloudflare-purge] Purged tags: ${chunk.join(', ')}`);
          results.push({ success: true });
        }
      }
    } catch (err) {
      console.error(
        '[cloudflare-purge] Exception:',
        err instanceof Error ? err.message : String(err)
      );
      results.push({ success: false, error: 'Network error' });
    }
  }

  // Return overall success if at least one chunk succeeded, or if all fail return false
  return results.some(r => r.success) ? { success: true } : { success: false, error: 'All chunks failed' };
}

/**
 * Convenience wrapper: purge a single cache tag.
 */
export async function purgeEdgeCache(tag: string): Promise<PurgeResult> {
  return purgeEdgeCacheTags([tag]);
}