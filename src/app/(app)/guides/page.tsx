/**
 * Guides Index — Lists all Q&A guides.
 * Server component, statically generated.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE, SITE_NAME } from '@/lib/seo/constants';
import { GUIDES } from '@/content/guides';

export const dynamic = 'force-static';
export const revalidate = 86400;

const pageUrl = `${CANONICAL_BASE}/guides`;

export const metadata: Metadata = {
  title: 'Streaming Guides & Answers — Lumovia',
  description:
    'Expert answers to common questions about movies, TV shows, anime, and streaming. Find what to watch, understand genres, and get personalized recommendations.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Streaming Guides & Answers — Lumovia',
    description: 'Expert answers to common questions about movies, TV shows, anime, and streaming.',
    siteName: SITE_NAME,
    images: [{ url: `${CANONICAL_BASE}/og/og-genres.png`, width: 1344, height: 768, alt: 'Lumovia Guides' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Streaming Guides & Answers — Lumovia',
    description: 'Expert answers to common questions about movies, TV shows, anime, and streaming.',
    images: [`${CANONICAL_BASE}/og/og-genres.png`],
  },
};

/* ─── Color tokens (extracted for Turbopack safety) ─── */
const headingColor = '#FFF5E8';
const mutedColor = 'rgba(255,245,232,.45)';
const badgeBg = 'rgba(255,179,71,.15)';
const badgeColor = '#FFB347';
const cardBg = 'rgba(255,255,255,.03)';
const cardBorder = 'rgba(255,255,255,.06)';

/* ─── Explore links ─── */
const EXPLORE_LINKS = [
  { label: 'Browse All', href: '/browse' },
  { label: 'Movies', href: '/movies' },
  { label: 'TV Shows', href: '/tv-shows' },
  { label: 'Anime', href: '/genre/anime' },
  { label: 'Crime', href: '/genre/crime' },
  { label: 'Horror', href: '/genre/horror' },
  { label: 'Romance', href: '/genre/romance' },
  { label: 'Top Rated', href: '/top-rated' },
  { label: 'New Releases', href: '/new-releases' },
  { label: 'All Genres', href: '/genres' },
];

export default function GuidesIndexPage() {
  /* FAQ JSON-LD — all guides as Q&A */
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GUIDES.map((g) => ({
      '@type': 'Question',
      name: g.question,
      acceptedAnswer: { '@type': 'Answer', text: g.shortAnswer },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: CANONICAL_BASE },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: 'clamp(1rem,5vw,2rem)',
        paddingTop: 80,
        paddingBottom: 120,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{
            fontSize: 'clamp(1.5rem,4vw,2.2rem)',
            color: headingColor,
            fontWeight: 700,
            marginBottom: 12,
          }}>
            Streaming Guides &amp; Answers
          </h1>
          <p style={{
            color: mutedColor,
            fontSize: '.9rem',
            maxWidth: 660,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Expert answers to the most common questions about movies, TV shows, anime, and streaming.
            Each guide provides a concise answer followed by an in-depth explanation.
          </p>
        </div>

        {/* Guide Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guide/${guide.slug}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 12,
                overflow: 'hidden',
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                transition: 'transform .2s, border-color .2s',
                display: 'block',
              }}
            >
              <div style={{ padding: '18px 20px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 4,
                  background: badgeBg,
                  color: badgeColor,
                  fontSize: '.6rem',
                  fontWeight: 600,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}>
                  {guide.category}
                </span>
                <h3 style={{
                  fontSize: '.92rem',
                  color: headingColor,
                  margin: '4px 0',
                  fontWeight: 600,
                  lineHeight: 1.35,
                }}>
                  {guide.question}
                </h3>
                <p style={{
                  fontSize: '.78rem',
                  color: mutedColor,
                  margin: '8px 0 0',
                  lineHeight: 1.55,
                }}>
                  {guide.shortAnswer.length > 130
                    ? `${guide.shortAnswer.slice(0, 130)}...`
                    : guide.shortAnswer}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Explore More */}
        <div style={{
          marginTop: 56,
          borderTop: '1px solid rgba(255,255,255,.06)',
          paddingTop: 40,
        }}>
          <h2 style={{
            fontSize: 'clamp(1rem,1.5vw,1.2rem)',
            color: headingColor,
            marginBottom: 20,
            fontWeight: 600,
          }}>
            Explore Lumovia
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {EXPLORE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '.8rem',
                  color: '#FFB347',
                  textDecoration: 'none',
                  background: 'rgba(255,245,232,.04)',
                  border: '1px solid rgba(255,245,232,.08)',
                  transition: 'background .2s, border-color .2s',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}