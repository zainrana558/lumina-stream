/**
 * Shared with both the decade page (src/app/(app)/decade/[decade]/page.tsx,
 * for generateStaticParams/validation) and pages.xml (for sitemap coverage)
 * so the two never drift apart.
 */
export const VALID_DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s'] as const;
export type Decade = (typeof VALID_DECADES)[number];
